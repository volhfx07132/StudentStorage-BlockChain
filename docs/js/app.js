App = {
  web3Provider: null,
  contracts: {},
  account: 0x0,
  loading:false,

  init: function() {
    return App.initWeb3();
  },

  initWeb3: function() {
    // initialize web3
    if(typeof web3 !== 'undefined') {
      //reuse the provider of the Web3 object injected by Metamask
      App.web3Provider = web3.currentProvider;
    } else {
      //create a new provider and plug it directly into our local node
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }
    web3 = new Web3(App.web3Provider);

    App.displayAccountInfo();

    return App.initContract();
  },

  displayAccountInfo: function() {
    web3.eth.getCoinbase(function(err, account) {
      if(err === null) {
        App.account = account;
        $('#account').text(account);
        web3.eth.getBalance(account, function(err, balance) {
          if(err === null) {
            $('#accountBalance').text(web3.fromWei(balance, "ether") + " ETH");
          }
        })
      }
    });
  },

  initContract: function() {
    $.getJSON('ChangeName.json', function(ChangeNameArtifact) {
      // get the contract artifact file and use it to instantiate a truffle contract abstraction
      App.contracts.ChangeName = TruffleContract(ChangeNameArtifact);
      // set the provider for our contracts
      App.contracts.ChangeName.setProvider(App.web3Provider);
      // retrieve the article from the contract
      return App.reloadArticles();
    });
  },

  reloadArticles: function() {
    if(App.loading) {
      return;
    }
    App.loading = true;
    // refresh account information because the balance might have changed
    App.displayAccountInfo();
    var changeListInstance;
    App.contracts.ChangeName.deployed().then(function(instance){
      changeListInstance = instance;
        changeListInstance.admin().then(function(adminAccount){
        return changeListInstance.getTotalAccountOfStudent().then(function(result){
          // retrieve the article placeholder and clear it
          $('#articlesRow').empty();
          //Set Data for article
          for(var i = 0; i < result.length; i++){
            var studentAddress= result[i];
            changeListInstance.students(studentAddress).then(function(student){
               App.displayStudent(student[0], student[1], student[2], student[3], adminAccount, student[4]);
               App.loading = false;
            })
          }
        });
      })
    }).catch(function(err) {
      console.error(err);
      App.loading = false;
    });
  },
  displayStudent: function(_fullName, _desription, _age, _university, _adminAccount, _studentAddress){
    var articlesRow = $('#articlesRow');
    var articleTemplate = $("#articleTemplate");
    articleTemplate.find('.panel-fullName').text(_fullName);
    articleTemplate.find('.article-description').text(_desription);
    articleTemplate.find('.article-age').text(_age);
    articleTemplate.find('.article-university').text(_university);
    articleTemplate.find('.btn-delete').attr('data-id', _studentAddress);
    articleTemplate.find('.btn-update').attr('data-id', _studentAddress);
    //

    if($('#account').text().toString() == _adminAccount.toString()){
      articleTemplate.find(".btn-update").show();
      articleTemplate.find(".btn-delete").show();
      $(".buttonStudent").hide();
      $(".buttonAdmin").show();
    }else{
      articleTemplate.find(".btn-update").hide();
      articleTemplate.find(".btn-delete").hide();
      $(".buttonStudent").show();
      $(".buttonAdmin").hide();
    }
    if($('#account').text().toString() == _studentAddress.toString()){
      articleTemplate.find('.article-address').text("You");
    }else{
      articleTemplate.find('.article-address').text(_studentAddress);
    }
    
    if((articleTemplate.find(".article-address").text() == "You")){
      articleTemplate.find(".btn-update").show();
      articleTemplate.find(".btn-delete").show();
    }


    if(_studentAddress.toString() != "0x0000000000000000000000000000000000000000"){
      articlesRow.append(articleTemplate.html());
    }
  },
  adminAddNewItem: function(){
    var _article_address = $("#article_address_admin").val();
    var _article_fullName = $("#article_fullName_admin").val();
    var _article_description = $("#article_description_admin").val();
    var _article_age = $("#article_age_admin").val();
    var _article_university = $("#article_university_admin").val();
    if(_article_address.trim() != "" && _article_fullName.trim() != "" && _article_description.trim() != "" && _article_age.trim() != "" && _article_university.trim() != ""){
      App.contracts.ChangeName.deployed().then(function(instance){
        instance.admin().then(function(adminAccount){
          return instance.getTotalAccountOfStudent().then(function(data){
            var checkStatusAddress = false;
            for(var i=0; i< data.length; i++){
              if(data[i].toString() == _article_address.toString()){
                checkStatusAddress = true;
                break;
              }
            }
            if(!checkStatusAddress){
                return instance.adminAddData(_article_address, _article_fullName, _article_description, _article_age, _article_university, {from: adminAccount}).then(function(){
                   App.reloadArticles();
               })
            }else{
              alert("This address areally existed");
            }
          })
        })
      })
    }else{
      alert("Don't empty the box input\nPlease!Check the box input")
    }
  },

  studentAddNewItem: function(){
    var _article_fullName = $("#article_fullName_student").val();
    var _article_description = $("#article_description_student").val();
    var _article_age = $("#article_age_student").val();
    var _article_university = $("#article_university_student").val();
    var _addressOfStudent = $('#account').text();
    if(_article_fullName.trim() != "" && _article_description.trim() != "" && _article_age.trim() != "" && _article_university.trim() != ""){
      App.contracts.ChangeName.deployed().then(function(instance){
        instance.admin().then(function(adminAccount){
          return instance.getTotalAccountOfStudent().then(function(data){
            var checkStatusAddress = false;
            for(var i=0; i< data.length; i++){
              if(data[i].toString() == _addressOfStudent.toString()){
                checkStatusAddress = true;
                break;
              }
            }
            if(!checkStatusAddress){
                return instance.studentAddData(_article_fullName, _article_description, _article_age, _article_university, {from: _addressOfStudent}).then(function(){
                   App.reloadArticles();
                })
            }else{
              alert("This address areally existed");
            }
          })
        })
      })
    }else{
      alert("Don't empty the box input\nPlease!Check the box input")
    }
  },
  deleteStudent: function(){
    event.preventDefault();
    var _articleAddress = $(event.target).data('id');
    App.contracts.ChangeName.deployed().then(function(instance){
      return instance.deleteInformationOfStudent(_articleAddress).then(function(){
        App.reloadArticles();
      })
    })
  },
  openPanelUpdates: function(){
    event.preventDefault();
    var _articleAddress = $(event.target).data('id');
    App.contracts.ChangeName.deployed().then(function(instance){
      instance.students(_articleAddress).then(function(student){
        //alert(student[0] +" " +student[1]+ " "+student[3]+" "+student[4])
        $("#article_address_update").val(_articleAddress);
        $("#article_fullName_update").val(student[0]);
        $("#article_description_update").val(student[1]);
        $("#article_age_update").val(student[2]);
        $("#article_university_update").val(student[3]);
      })
    })
    $("#updataAccounts").modal();
  },
  updateInformation: function(){
    var article_address_update = $("#article_address_update").val();
    var article_fullName_update = $("#article_fullName_update").val();
    var article_description_update = $("#article_description_update").val();
    var article_age_update = $("#article_age_update").val();
    var article_university_update = $("#article_university_update").val();
    if(article_fullName_update.trim() != "" && article_description_update.trim() != "" && article_age_update.trim() != "" && article_university_update.trim() != ""){
      App.contracts.ChangeName.deployed().then(function(instance){
        instance.updateInformation(article_address_update, article_fullName_update, article_description_update, article_age_update, article_university_update).then(function(){
          App.reloadArticles();
        })
      })
    }else{
      alert("Don't empty the box input\nPlease!Check the box input")
    }
  }

};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
