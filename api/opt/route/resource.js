



var express = require('express');
var router = express.Router();
var handler = require("../handler/resource");
var autho = require('../middleWare').autho;


router.all("/",function(req,res,next){
    res.json({"msg":"welcome to opt"});
})


router.use(autho);

router.route('/client').get(function(req,res){
    handler.getClientList(req,res);
});

router.route('/client').post(function(req,res){
    handler.createClient(req,res);
});

router.route('/client').put(function(req,res){
    handler.updateClient(req,res);
});

router.route('/account').get(function(req,res){
    handler.getAccountList(req,res);
});

router.route('/account').post(function(req,res){
    handler.createAccount(req,res);
});


router.route('/account').put(function(req,res){
    handler.updateAccount(req,res);
});


router.route('/order').get(function(req,res){
    handler.getOrderList(req,res);
});

router.route('/order').post(function(req,res){
    handler.createOrder(req,res);
});

router.route('/order').put(function(req,res){
    handler.updateOrder(req,res);
});

router.route('/payment').get(function(req,res){
    handler.getPaymentList(req,res);
});


router.route('/log').get(function(req,res){
    handler.getLogList(req,res);
});


router.route('/rechage').put(function(req,res){
    handler.rechage(req,res);
});


router.route('/withDraw').put(function(req,res){
    handler.withDraw(req,res);
});

router.route('/auditorder').put(function(req,res){
    handler.auditOrder(req,res);
})


router.route('/enableaccount').put(function(req,res){
    handler.enableAccount(req,res);
})

router.route('/enableclient').put(function(req,res){
    handler.enableClient(req,res);
})


router.route('/finishorder').put(function(req,res){
    handler.finishOrder(req,res);
})


router.route('/rollbackorder').put(function(req,res){
    handler.reqRollBackOrder(req,res);
})


module.exports = router;