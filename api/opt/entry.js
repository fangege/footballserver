
var express = require('express');
var router = express.Router();




router.all("/", function (req, res, next) {
    res.json({
        code: 0,
        message: "opt"
    });
})

router.use("/autho", require('./route/autho'))
router.use("/resource", require('./route/resource'))



module.exports = router;