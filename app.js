var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
const  request = require("request");
const ENUMS = require("./include/enums").ENUM;


var app = express();


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());



app.use('/opt.html', function (req, res) {
  
  res.send(global.optHtml);

});

app.use('/business.html', function (req, res) {
  res.send(global.businessHtml);
});


app.use('/opt', function (req, res) {
  res.send(global.optHtml);
});

app.use('/business', function (req, res) {
  res.send(global.businessHtml);
});


app.use('/api/opt', require("./api/opt/entry"));
app.use('/api/business', require("./api/business/entry"));


app.use('/tool/refresh',async function(req,res){


  let sign = req.query.sign;
  if(sign != "businessrefreshsign"){
    return res.json({code:-1,message:"refresh error"});
  }

  async function loadGlobalHtmlTask() {
    global.optHtml = await loadHtml(ENUMS.OptPath);
    global.businessHtml = await loadHtml(ENUMS.BusinessPath);
  }

  function loadHtml(url) {
    return new Promise(function (resolve, reject) {
      request({ url, timeOut: 10000 }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          return resolve(body);
        }
        return rejct();
      })
    });
  }

  try{
    await loadGlobalHtmlTask();
  }
  catch(err){
    console.error(err);
    return res.json({code:-1,message:"refresh error"});
  }
 
  res.json({code:0,message:"ok"});

})


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  console.error(req.method + " " + req.url);

  // render the error page
  res.status(err.status || 500);
  res.json({ message: 'error' });
});

module.exports = app;
