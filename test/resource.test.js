

const request = require("request");

const ServerUrl = "http://127.0.0.1:3000";



let client = {
    clientid:"001",
    password:"003",
    communication:"005",
}


// request.post(ServerUrl+"/api/opt/resource/client", {form:client},function(error,response,body){
//     console.log({
//         error,body
//     })
// })


// request.put(ServerUrl+"/api/opt/resource/client/001", {form:client},function(error,response,body){
//     console.log({
//         error,body
//     })
// })


let account = {
    accountid:"001",
    password:"003",
    communication:"005",
    type:2,
}


// request.post(ServerUrl+"/api/opt/resource/account", {form:account},function(error,response,body){
//     console.log({
//         error,body
//     })
// })


// request.put(ServerUrl+"/api/opt/resource/account/001", {form:account},function(error,response,body){
//     console.log({
//         error,body
//     })
// })


// let login = {
//     accountid:"001",
//     password:"003"
// }

// request.post(ServerUrl+"/api/opt/autho/login",{form:login},function(error,res,body){
//         console.log({
//         error,body
//     })
// });


let order = {
    clientid:"001",
    amount:30,
}


request.post(ServerUrl+"/api/opt/resource/order", {form:order},function(error,response,body){
    console.log({
        error,body
    })
})


let auditOrder = {
    orderid:"2018051001425978",
    action:1
}


request.post(ServerUrl+"/api/opt/resource/auditorder", {form:auditOrder},function(error,response,body){
    console.log({
        error,body
    })
})



let payment = {
    clientid:"001",
    amount:100
}
// request.post(ServerUrl+"/api/opt/resource/rechage",{form:payment},function(error,res,body){
//         console.log({
//         error,body
//     })
// });