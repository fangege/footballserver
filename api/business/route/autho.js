



var express = require('express');
var router = express.Router();
var handler = require("../handler/autho");
var autho = require('../middleWare').autho;



router.all("/",function(req,res,next){
    res.json({"msg":"welcome to opt"});
})

router.route('/login').post(function(req,res){
    handler.login(req,res);
});


router.route('/logout').get(function(req,res){

        handler.logout(req,res);

  
});

router.use(autho);



router.route('/currentaccount').get(function(req,res){

    handler.getCurrentAccount(req,res);
})


router.route('/updatepassword').put(function(req,res){

    handler.updatePassword(req,res);
})



module.exports = router;