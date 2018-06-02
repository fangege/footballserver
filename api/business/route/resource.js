



var express = require('express');
var router = express.Router();
var handler = require("../handler/resource");
var autho = require('../middleWare').autho;


router.all("/",function(req,res,next){
    res.json({"msg":"welcome to business"});
})

router.use(autho);

router.route('/order').get(function(req,res){
    handler.getOrderList(req,res);
});

router.route('/order').post(function(req,res){
    handler.createOrder(req,res);
});


router.route('/payment').get(function(req,res){
    handler.getPaymentList(req,res);
});


router.route('/confirmorder').put(function(req,res){
    handler.confirmOrder(req,res);
});



module.exports = router;