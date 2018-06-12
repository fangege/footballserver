


let APP_BASE_DIR = "../../../"

const moment = require("moment");
const mysql = require("mysql");
const ENUMS = require(APP_BASE_DIR + "include/enums").ENUM;
const convertFunc = require(APP_BASE_DIR + "include/enums").convertFunc;


async function permissionDeny(req, res) {
    return res.status(403).json({
        'code': ENUMS.ErrCode.PermissionDeny,
        'message': ENUMS.ErrCodeMessage.PermissionDeny
    });
}

async function paramInvalid(req, res) {
    return res.status(200).json({
        code: ENUMS.ErrCode.ParamInvalid,
        message: ENUMS.ErrCodeMessage.ParamInvalid
    });
}

async function IdDup(req, res) {
    return res.json({
        code: ENUMS.ErrCode.ParamInvalid,
        message: "ID已经存在，请换一个帐号"
    });
}

async function IdNotExist(req, res) {
    return res.json({
        code: ENUMS.ErrCode.ParamInvalid,
        message: "ID 不存在"
    });
}


async function serverError(req, res) {
    return res.status(500).json({
        code: ENUMS.ErrCode.Failed,
        message: ENUMS.ErrCodeMessage.Failed
    });
}

async function successResponse(req, res, jsonData) {

    if (jsonData) {
        res.status(200).json(jsonData);
    } else {
        res.status(200).json({
            code: ENUMS.ErrCode.Success,
            message: ENUMS.ErrCodeMessage.Success
        })
    }
}

async function failedResponse(req, res, jsonData) {

    if (jsonData) {
        res.status(200).json(jsonData);
    } else {
        res.status(200).json({
            code: ENUMS.ErrCode.Failed,
            message: ENUMS.ErrCodeMessage.Failed
        })
    }

}




//创建用户帐号
async function createClient(req, res) {

    if (req.authData.type != ENUMS.AccoutType.Admin) {
        return permissionDeny(req, res);
    }

    let form = req.body;

    //check
    if (!form.clientid || !form.password || !form.communication || !form.accountid) {
        return paramInvalid(req, res);
    }

    let item = {
        clientid: form.clientid,
        password: form.password,
        createtime: moment().format('YYYY-MM-DD HH:mm:ss'),
        balance: 0,
        accountid: form.accountid,
        communication: form.communication,
        status: 1
    }

    let conn = null;
    let results = null;

    try {
        conn = await gDataBases["db_business"].getConnection();
        results = await conn.queryAsync("select count(*) as total from t_client where clientid=?", [form.clientid]);
        if (results[0].total != 0) {
            return IdDup(req, res);
        }

        results = await conn.queryAsync("select * from t_account where accountid=? and type=?", [form.accountid, ENUMS.AccoutType.Proxy]);
        if (results.length == 0) {
            return failedResponse(req, res, {
                code: -1,
                message: "代理不存在"
            });
        }
        results = await conn.queryAsync('insert into t_client set ?', item);


        await writeLog({
            accountid: req.authData.accountid,
            remark: "create client: " + results.insertId
        })
    } catch (err) {
        console.error(err);
        return serverError(req, res);
    } finally {
        if (conn != null) {
            conn.release();
        }
    }


    return successResponse(req, res);

}

//更新用户账户
async function updateClient(req, res) {

    if (req.authData.type != ENUMS.AccoutType.Admin) {
        return permissionDeny(req, res);
    }

    let form = req.body;
    let clientid = form.clientid;

    //check
    if (!clientid || (!form.communication && !form.password)) {
        return paramInvalid(req, res);
    }

    let item = {};
    if (form.communication) {
        item['communication'] = form.communication;
    }

    if (form.password) {
        item['password'] = form.password;
    }


    if (form.accountid) {
        item['accountid'] = form.accountid;
    }


    let conn = null;
    let results = null;

    try {
        conn = await gDataBases["db_business"].getConnection();
        results = await conn.queryAsync("select count(*) as total from t_client where clientid=?", [clientid]);
        if (results[0].total == 0) {
            return IdNotExist(req, res);
        }

        results = await conn.queryAsync("select * from t_account where accountid=? and type=?", [form.accountid, ENUMS.AccoutType.Proxy]);
        if (results.length == 0) {
            return failedResponse(req, res, {
                code: -1,
                message: "代理不存在"
            });
        }

        let updateSql = gDataBases["db_business"].makeUpdateSql("t_client", item, mysql.format("where clientid=?", [clientid]));
        await conn.queryAsync(updateSql);


        await writeLog({
            accountid: req.authData.accountid,
            remark: "update client: " + clientid
        })

    } catch (err) {
        console.error(err);
        return serverError(req, res);

    } finally {
        if (conn != null) {
            conn.release();
        }
    }
    return successResponse(req, res);
}

//拉取用户列表
async function getClientList(req, res) {



    let form = req.query;
    let page = 1;
    let count = 10;

    try {

        page = parseInt(form.currentPage);
        if (isNaN(page)) {
            page = 1;
        }

    } catch (err) {
        page = 1;
    }


    let whereSql = "";
    let whereClauses = [];
    let whereParams = [];

    if (form.no) {
        whereClauses.push(" clientid=? ");
        whereParams.push(form.no);
    }

    if (form.status != undefined) {
        whereClauses.push(" status=? ");
        whereParams.push(form.status);
    }


    //代理只能查询自己代理的客户
    if (req.authData.type == ENUMS.AccoutType.Proxy) {
        whereClauses.push(" accountid=? ");
        whereParams.push(req.authData.accountid);
    }


    if (whereClauses.length > 0) {
        whereSql = "where " + whereClauses.join(" and ");
    }



    let conn = null;
    let results = null;

    let total = 0;
    try {
        conn = await gDataBases["db_business"].getConnection();
        results = await conn.queryAsync("select count(*) as total from t_client " + whereSql, whereParams);
        total = results[0].total;

        whereParams.push((page - 1) * 10);
        results = await conn.queryAsync("select clientid,createtime,balance,communication,status,accountid from t_client  " + whereSql + " order by createtime desc limit ?,10 ", whereParams)

    } catch (err) {
        console.error(err);
        return serverError(req, res);
    } finally {
        if (conn != null) {
            conn.release();
        }
    }

    return successResponse(req, res, {
        list: results,
        pagination: {
            total: total,
            pageSize: 10,
            current: page,
        }
    });
}

//充值
async function rechage(req, res) {

    if (req.authData.type != ENUMS.AccoutType.Admin && req.authData.type != ENUMS.AccoutType.Finance) {
        return permissionDeny(req, res);
    }

    try {
        let form = req.body;
        let clientid = form.clientid;
        let amount = parseInt(form.amount);
        if (isNaN(amount) || amount < 0) {

            return paramInvalid(req, res);
        }
        let paymentId = await changeUserBalance(clientid, amount, "rechage");

        await writeLog({
            accountid: req.authData.accountid,
            remark: "rechage paymentId: " + paymentId
        })
        return successResponse(req, res);
    } catch (err) {
        console.error(err);
        return serverError(req, res);
    }

}


//提款
async function withDraw(req, res) {

    if (req.authData.type != ENUMS.AccoutType.Admin && req.authData.type != ENUMS.AccoutType.Finance) {
        return permissionDeny(req, res);
    }

    try {
        let form = req.body;
        let clientid = form.clientid;
        let amount = parseInt(form.amount);
        if (isNaN(amount) || amount < 0) {

            return paramInvalid(req, res);
        }
        let paymentId = await changeUserBalance(clientid, amount * -1, "withdraw");
        await writeLog({
            accountid: req.authData.accountid,
            remark: "withDraw paymentId: " + paymentId
        })
        return successResponse(req, res);
    } catch (err) {
        console.error(err);
        return serverError(req, res);
    }

}



//回滚订单
async function reqRollBackOrder(req, res) {

    if (req.authData.type != ENUMS.AccoutType.Admin) {
        return permissionDeny(req, res);
    }
    let form = req.body;



    let orderid = form.orderid;

    if (!orderid) {

        return paramInvalid(req, res);
    }

    let conn = null;
    let results = null;

    try {

        await rollBackOrder(orderid);

        await writeLog({
            accountid: req.authData.accountid,
            remark: "rollback order: " + orderid
        })

    } catch (err) {
        console.error(err);

        if (err && err.message) {
            return failedResponse(req, res, err)
        } else {
            return serverError(req, res);
        }
    } finally {
        if (conn != null) {
            conn.release();
        }
    }
    return successResponse(req, res);

}




async function createAccount(req, res) {


    if (req.authData.type != ENUMS.AccoutType.Admin) {

        return permissionDeny(req, res);
    }

    let form = req.body;

    //check
    if (!form.accountid || !form.password || !form.communication) {
        return paramInvalid(req, res);
    }


    if (!convertFunc.getAccoutTypeName(parseInt(form.type))) {
        return paramInvalid(req, res);
    }

    let item = {
        accountid: form.accountid,
        password: form.password,
        createtime: moment().format('YYYY-MM-DD HH:mm:ss'),
        communication: form.communication,
        type: form.type != undefined ? form.type : 2
    }

    let conn = null;
    let results = null;

    try {
        conn = await gDataBases["db_business"].getConnection();
        results = await conn.queryAsync("select count(*) as total from t_account where accountid=?", [form.accountid]);
        if (results[0].total != 0) {
            return IdDup(req, res);
        }
        results = await conn.queryAsync('insert into t_account set ?', item);

        await writeLog({
            accountid: req.authData.accountid,
            remark: "create account: " + results.insertId
        })
    } catch (err) {
        console.error(err);

        return serverError(req, res);
    } finally {
        if (conn != null) {
            conn.release();
        }
    }

    return successResponse(req, res);
}

async function updateAccount(req, res) {



    if (req.authData.type != ENUMS.AccoutType.Admin) {
        return permissionDeny(req, res);

    }
    let form = req.body;
    let accountid = form.accountid;



    //check
    if (!accountid || (form.type == undefined && !form.communication && !form.password)) {

        return paramInvalid(req, res);
    }

    let item = {};
    if (form.communication) {
        item['communication'] = form.communication;
    }

    if (form.password) {
        item['password'] = form.password;
    }

    if (form.type != undefined) {
        item['type'] = form.type;
    }


    let conn = null;
    let results = null;

    try {
        conn = await gDataBases["db_business"].getConnection();
        results = await conn.queryAsync("select count(*) as total from t_account where accountid=?", [accountid]);
        if (results[0].total == 0) {

            return IdNotExist(req, res);
        }

        let updateSql = gDataBases["db_business"].makeUpdateSql("t_account", item, mysql.format("where accountid=?", [accountid]));
        await conn.queryAsync(updateSql);

        await writeLog({
            accountid: req.authData.accountid,
            remark: "update account: " + accountid
        })
    } catch (err) {
        console.error(err);
        return serverError(req, res);
    } finally {
        if (conn != null) {
            conn.release();
        }
    }

    return successResponse(req, res);
}


async function getAccountList(req, res) {



    if (req.authData.type != ENUMS.AccoutType.Admin) {

        return permissionDeny(req, res);
    }


    let form = req.query;

    let page = 1;
    let count = 10;

    try {
        page = parseInt(form.currentPage);
        if (isNaN(page)) {
            page = 1;
        }

    } catch (err) {
        page = 1;
    }


    let whereSql = "";
    let whereClauses = [];
    let whereParams = [];

    if (form.no) {
        whereClauses.push(" accountid=? ");
        whereParams.push(form.no);
    }

    if (whereClauses.length > 0) {
        whereSql = "where " + whereClauses.join(" and ");
    }


    let conn = null;
    let results = null;

    let total = 0;
    try {
        conn = await gDataBases["db_business"].getConnection();
        results = await conn.queryAsync("select count(*) as total from t_account " + whereSql, whereParams);
        total = results[0].total;
        whereParams.push((page - 1) * 10);
        results = await conn.queryAsync("select accountid,createtime,type,communication,status from t_account " + whereSql + " order by createtime desc limit ?,10 ", whereParams)

    } catch (err) {
        console.error(err);

        return serverError(req, res);

    } finally {
        if (conn != null) {
            conn.release();
        }
    }

    return successResponse(req, res, {
        list: results,
        pagination: {
            total: total,
            pageSize: 10,
            current: page,
        }
    });
}



async function getOrderList(req, res) {


    if (req.authData.type != ENUMS.AccoutType.Admin && req.authData.type != ENUMS.AccoutType.Staff && req.authData.type != ENUMS.AccoutType.Proxy) {
        return permissionDeny(req, res);
    }


    let form = req.query;


    let page = 1;
    let count = 10;

    let no = form.no;

    if (!form.no) {
        form.no = '';
    }


    if (form.currentPage != undefined) {
        try {
            page = parseInt(form.currentPage);
            if (isNaN(page)) {
                page = 1;
            }

        } catch (err) {
            page = 1;
        }
    }



    if (form.page != undefined) {
        try {
            page = parseInt(form.page);
            if (isNaN(page)) {
                page = 1;
            }

        } catch (err) {
            page = 1;
        }

    }




    if (!form.query) {
        form.query = "";
    }


    let conn = null;
    let results = null;
    let total = 0;


    let whereSql = "";
    let whereClauses = [];
    let whereParams = [];

    if (form.no) {
        whereClauses.push(" a.orderid=? ");
        whereParams.push(form.no);
    }

    if (form.content) {
        whereClauses.push(" a.content=? ");
        whereParams.push(form.content);
    }

    if (form.whitchparty) {
        whereClauses.push(" a.whitchparty=? ");
        whereParams.push(form.whitchparty);
    }

    if (form.status != undefined) {
        whereClauses.push(" a.status=? ");
        whereParams.push(form.status);
    }

    //代理只能查询自己代理的客户
    if (req.authData.type == ENUMS.AccoutType.Proxy) {
        whereClauses.push(" b.accountid=? ");
        whereParams.push(req.authData.accountid);
    }


    if (whereClauses.length > 0) {
        whereSql = "where " + whereClauses.join(" and ");
    }

    try {
        conn = await gDataBases["db_business"].getConnection();
        results = await conn.queryAsync("select count(*) as total from t_order a left join t_client b on a.clientid=b.clientid " + whereSql, whereParams);
        total = results[0].total;


        whereParams.push((page - 1) * 10);

        results = await conn.queryAsync("select a.remark,a.makemoney,a.outcome,b.accountid,a.clientid,a.orderid,a.createtime,a.amount,a.odds / 100 as odds ,a.content,a.whitchparty,a.status from t_order a left join t_client b on a.clientid=b.clientid  " + whereSql + " order by a.createtime desc limit ?,10 ", whereParams)


    } catch (err) {
        console.error(err);

        return serverError(req, res);

    } finally {
        if (conn != null) {
            conn.release();
        }
    }

    successResponse(req, res, {

        list: results,
        pagination: {
            total: total,
            pageSize: 10,
            current: page,

        }
    });

}


async function createOrder(req, res) {



    if (req.authData.type != ENUMS.AccoutType.Admin) {

        return permissionDeny(req, res);
    }


    let form = req.body;

    //check
    if (!form.amount || !form.clientid || !form.odds || !form.content || !form.whitchparty) {

        return paramInvalid(req, res);
    }

    let conn = null;
    let results = null;
    try {


        let amount = parseInt(form.amount);
        if (isNaN(amount) || amount <= 0) {
            return paramInvalid(req, res)
        }


        let odds = parseInt(form.odds * 100);

        if (isNaN(odds)) {
            return failedResponse(req, res, {
                code: -1,
                message: "赔率非法"
            });
        }

        if (odds > ENUMS.MaxOdds * 100 || odds <= 0) {
            return paramInvalid(req, res)
        }


        let clientid = form.clientid;

        let content = form.content;
        let whitchparty = form.whitchparty;

        let item = {
            amount,
            content,
            whitchparty,
            odds,
            clientid,
            createtime: moment().format('YYYY-MM-DD HH:mm:ss'),
            status: ENUMS.OrderStatus.Pending,
            orderid: `${moment().format('YYYYMMDDHHmmss')}${Math.ceil(Math.random() * 100)}${clientid}`
        }

        item.orderid = item.orderid.substring(0, 16);

        conn = await gDataBases["db_business"].getConnection();


        //检查client是否存在，检查待审核订单数是否超过3


        results = await conn.queryAsync("select * from t_client where clientid=?", [item.clientid]);

        if (results.length == 0) {
            return failedResponse(req, res, {
                code: ENUMS.ErrCode.Failed,
                message: "用户不存在"
            });
        }

        if (results[0].balance < item.amount) {

            return failedResponse(req, res, {
                code: ENUMS.ErrCode.Failed,
                message: "余额不足"
            });
        }


        results = await conn.queryAsync("select * from t_order where clientid=? and status=?", [clientid, ENUMS.OrderStatus.Pending]);

        if (results.length > 5) {
            return failedResponse(req, res, {
                code: ENUMS.ErrCode.Failed,
                message: "待审核订单超过三个"
            });

        }

        results = await conn.queryAsync('insert into t_order set ?', item);
        await writeLog({
            accountid: req.authData.accountid,
            remark: "create order: " + results.insertId
        })
    } catch (err) {
        console.error(err);

        return serverError(req, res);

    } finally {
        if (conn != null) {
            conn.release();
        }
    }

    return successResponse(req, res);


}


async function updateOrder(req, res) {


    if (req.authData.type != ENUMS.AccoutType.Staff && req.authData.type != ENUMS.AccoutType.Admin) {
        return permissionDeny(req, res);
    }

    let form = req.body;
    let orderid = form.orderid;

    //check
    if (!orderid || (!form.odds)) {
        return paramInvalid(req, res);
    }


    try {
        form.odds = parseFloat(form.odds);
        if (isNaN(form.odds)) {
            throw { message: "非法" };
        }
    } catch (err) {
        return paramInvalid(req, res);
    }


    let item = {};
    if (form.odds) {
        item['odds'] = form.odds * 100;
        item['status'] = ENUMS.OrderStatus.UserPending
    }


    let conn = null;
    let results = null;

    try {
        conn = await gDataBases["db_business"].getConnection();

        if (item.odds < 0 || item.odds > ENUMS.MaxOdds * 100) {
            return failedResponse(req, res, {
                code: -1,
                message: "赔率不合法"
            });
        }

        results = await conn.queryAsync("select count(*) as total from t_order where orderid=?", [orderid]);
        if (results[0].total == 0) {
            return IdNotExist(req, res);
        }

        let updateSql = gDataBases["db_business"].makeUpdateSql("t_order", item, mysql.format("where orderid=?", [orderid]));
        await conn.queryAsync(updateSql);


        await writeLog({
            accountid: req.authData.accountid,
            remark: "update order: " + orderid
        })
    } catch (err) {
        console.error(err);
        return serverError(req, res);

    } finally {
        if (conn != null) {
            conn.release();
        }
    }
    return successResponse(req, res);

}


//结算订单
async function finishOrder(req, res) {
    if (req.authData.type != ENUMS.AccoutType.Admin) {
        return permissionDeny(req, res);
    }
    let form = req.body;


    let outcome = form.outcome;
    let orderid = form.orderid;

    if (!outcome || !orderid) {

        return paramInvalid(req, res);
    }

    let conn = null;
    let results = null;
    let total = 0;
    try {

        await finishUserOrder(orderid, outcome);

        await writeLog({
            accountid: req.authData.accountid,
            remark: "finish order: " + orderid
        })

    } catch (err) {
        console.error(err);

        if (err && err.message) {
            return failedResponse(req, res, err)
        } else {
            return serverError(req, res);
        }
    } finally {
        if (conn != null) {
            conn.release();
        }
    }
    return successResponse(req, res);
}



//审核订单
async function auditOrder(req, res) {


    if (req.authData.type != ENUMS.AccoutType.Staff && req.authData.type != ENUMS.AccoutType.Admin) {

        return permissionDeny(req, res);
    }

    let form = req.body;


    let orderid = form.orderid;
    let action = form.action;


    if (!orderid || !action) {

        return paramInvalid(req, res);
    }

    //1 驳回  2 提交成功


    let conn = null;
    let results = null;



    if (action != "reject" && action != 'pass') {
        return paramInvalid(req, res);
    }

    let total = 0;
    try {


        conn = await gDataBases["db_business"].getConnection();

        if (action === "reject" || action === "pass") {
            results = await conn.queryAsync("select * from t_order where orderid=? and status=?", [orderid, ENUMS.OrderStatus.Pending]);
        }

        if (results.length == 0) {
            return IdNotExist(req, res);
        }

        if (action === "reject") {

            if (!form.remark) {
                form.remark = "";
            }
            await conn.queryAsync("update t_order set status=?,remark=? where orderid=? and status=?", [ENUMS.OrderStatus.Rejected, form.remark, orderid, ENUMS.OrderStatus.Pending])
        }

        if (action === "pass") {
            await passUserOrder(orderid);
        }


        await writeLog({
            accountid: req.authData.accountid,
            remark: action + " order: " + orderid
        })

    } catch (err) {
        console.error(err);

        if (err && err.message) {
            return failedResponse(req, res, err)
        } else {
            return serverError(req, res);
        }



    } finally {
        if (conn != null) {
            conn.release();
        }
    }

    return successResponse(req, res);
}





async function getPaymentList(req, res) {


    if (req.authData.type != ENUMS.AccoutType.Admin) {

        return permissionDeny(req, res);
    }


    let form = req.query;


    let page = 1;
    let count = 10;

    try {
        page = parseInt(form.currentPage);
        if (isNaN(page)) {
            page = 1;
        }

    } catch (err) {
        page = 1;
    }

    if (!form.query) {
        form.query = "";
    }


    let whereSql = "";
    let whereClauses = [];
    let whereParams = [];

    if (form.no) {
        whereClauses.push(" clientid=? ");
        whereParams.push(form.no);
    }

    if (whereClauses.length > 0) {
        whereSql = "where " + whereClauses.join(" and ");
    }


    let conn = null;
    let results = null;

    let total = 0;
    try {
        conn = await gDataBases["db_business"].getConnection();
        results = await conn.queryAsync("select count(*) as total from t_payment " + whereSql, whereParams);
        total = results[0].total;
        whereParams.push((page - 1) * 10);
        results = await conn.queryAsync("select opt,clientid,amount,balance,remark,createtime from t_payment " + whereSql + " order by createtime desc limit ?,10 ", whereParams)

    } catch (err) {
        console.error(err);

        return serverError(req, res);

    } finally {
        if (conn != null) {
            conn.release();
        }
    }

    successResponse(req, res, {

        list: results,
        pagination: {
            total: total,
            pageSize: 10,
            current: page,
        }

    });

}


async function getLogList(req, res) {



    if (req.authData.type != ENUMS.AccoutType.Admin) {

        return permissionDeny(req, res);
    }


    let form = req.query;
    let page = 1;
    let count = 10;
    try {
        page = parseInt(form.currentPage);
        if (isNaN(page)) {
            page = 1;
        }

    } catch (err) {
        page = 1;
    }

    if (!form.query) {
        form.query = "";
    }

    let conn = null;
    let results = null;

    let total = 0;
    try {
        conn = await gDataBases["db_business"].getConnection();
        results = await conn.queryAsync("select count(*) as total from t_log where concat(accountid,remark) like ?", [`%${form.query}%`]);
        total = results[0].total;
        results = await conn.queryAsync("select id,accountid,remark,createtime from t_log where concat(remark,accountid) like ? order by createtime desc limit ?,10 ", [`%${form.query}%`, (page - 1) * 10])

    } catch (err) {
        console.error(err);

        return serverError(req, res);

    } finally {
        if (conn != null) {
            conn.release();
        }
    }

    return successResponse(req, res, {

        list: results,
        pagination: {
            total: total,
            pageSize: 10,
            current: page,
        }

    });
}


async function rollBackOrder(orderid) {

    let conn = null;
    let result = null;
    try {
        conn = await gDataBases["db_business"].getConnection();
        await conn.beginTransaction();

        results = await conn.queryAsync("select * from t_order where orderid=? and status=?", [orderid, ENUMS.OrderStatus.Finished]);

        if (results.length == 0) {
            throw { message: "订单不存在或者未结算" }
        }

        let order = results[0];
        let clientid = order.clientid;

        let makeMoney = order.makemoney;


        results = await conn.queryAsync("select balance from t_client where clientid=?", [clientid]);
        if (results.length == 0) {
            throw { code: -1, message: "no such clientid:" + clientid }
        }
        let balance = results[0].balance;
        let remark = "rollback order:" + orderid;
        let amount = makeMoney * (-1);

        if (makeMoney > 0) {
            await conn.queryAsync("update t_client set balance=balance+(?) where clientid=?", [amount, clientid])
            let payment = {
                clientid,
                amount,
                balance: balance + amount,
                remark,
                opt: ENUMS.PaymentOptType.RollBack,
                createtime: moment().format('YYYY-MM-DD HH:mm:ss')
            }


            await conn.queryAsync("insert into t_payment set ? ", [payment])

        }
        await conn.queryAsync("update t_order set outcome=? , makemoney=? , status=? where orderid=?", [0, 0, ENUMS.OrderStatus.Pass, orderid]);
        await conn.commit();

    } catch (err) {
        console.error(err);
        if (conn) {
            await conn.rollback();
        }
        throw err;
    } finally {
        if (conn != null) {
            conn.release();
        }
    }


}



async function finishUserOrder(orderid, outcome) {

    let conn = null;
    let result = null;
    try {
        conn = await gDataBases["db_business"].getConnection();
        await conn.beginTransaction();

        results = await conn.queryAsync("select * from t_order where orderid=? and status=?", [orderid, ENUMS.OrderStatus.Pass]);

        if (results.length == 0) {
            throw { message: "订单不存在或者已经审核" }
        }

        let order = results[0];
        let clientid = order.clientid;
        let makeMoney = 0;

        if (outcome == ENUMS.OutComeStatus.Win) {
            makeMoney = order.amount + (order.amount * order.odds) * 0.01;
        }

        if (outcome == ENUMS.OutComeStatus.Draw) {
            makeMoney = order.amount;
        }

        if (outcome == ENUMS.OutComeStatus.Lose) {
            makeMoney = 0;
        }

        if (outcome == ENUMS.OutComeStatus.HalfWin) {
            makeMoney = order.amount * 0.5 + order.amount * 0.5 * (1 + order.odds * 0.01)
        }

        if (outcome == ENUMS.OutComeStatus.HalfLose) {
            makeMoney = order.amount * 0.5;
        }

        results = await conn.queryAsync("select balance from t_client where clientid=?", [clientid]);
        if (results.length == 0) {
            throw { code: -1, message: "no such clientid:" + clientid }
        }
        let balance = results[0].balance;
        let remark = "makemoney:" + orderid;
        let amount = order.amount;

        if (makeMoney > 0) {
            await conn.queryAsync("update t_client set balance=balance+(?) where clientid=?", [makeMoney, clientid])
            let payment = {
                clientid,
                amount: makeMoney,
                balance: balance + makeMoney,
                remark,
                opt: ENUMS.PaymentOptType.MakeMoney,
                createtime: moment().format('YYYY-MM-DD HH:mm:ss')
            }
            await conn.queryAsync("insert into t_payment set ? ", [payment])

        }
        await conn.queryAsync("update t_order set outcome=? , makemoney=? , status=? where orderid=?", [outcome, makeMoney, ENUMS.OrderStatus.Finished, orderid]);
        await conn.commit();

    } catch (err) {
        console.error(err);
        if (conn) {
            await conn.rollback();
        }
        throw err;
    } finally {
        if (conn != null) {
            conn.release();
        }
    }
}


async function passUserOrder(orderid) {
    //更新账户
    let conn = null;
    let result = null;
    try {
        conn = await gDataBases["db_business"].getConnection();
        await conn.beginTransaction();
        let results = await conn.queryAsync("select * from t_order where orderid=? and status=?", [orderid, ENUMS.OrderStatus.Pending]);
        if (results.length == 0) {
            throw { code: -1, message: "no such orderid:" + orderid }
        }

        let clientid = results[0].clientid;
        let amount = results[0].amount * (-1);
        let remark = "consume:" + orderid;
        result = await conn.queryAsync("select balance from t_client where clientid=?", [clientid]);
        if (result.length == 0) {

            throw { code: -1, message: "no such clientid:" + clientid }
        }

        balance = result[0].balance;

        if (balance + amount < 0) {
            throw { code: -1, message: "no such enougth money:" }
        }

        await conn.queryAsync("update t_client set balance=balance+(?) where clientid=?", [amount, clientid])
        let payment = {
            clientid,
            amount,
            opt: ENUMS.PaymentOptType.Consume,
            balance: balance + amount,
            remark,
            createtime: moment().format('YYYY-MM-DD HH:mm:ss')
        }
        await conn.queryAsync("update t_order set status=? where orderid=?", [ENUMS.OrderStatus.Pass, orderid])
        await conn.queryAsync("insert into t_payment set ? ", [payment])
        await conn.commit();

    } catch (err) {
        console.error(err);
        if (conn) {
            await conn.rollback();
        }
        throw err;
    } finally {
        if (conn != null) {
            conn.release();
        }
    }

}


/**
 * 修改用户余额
 * @param {用户ID} clientid 
 * @param {金额} amount 
 * @param {备注} remark 
 */
async function changeUserBalance(clientid, amount, remark) {


    //更新账户
    let conn = null;
    let results = null;

    let total = 0;
    try {
        conn = await gDataBases["db_business"].getConnection();

        await conn.beginTransaction();


        results = await conn.queryAsync("select balance from t_client where clientid=?", [clientid]);

        if (results.length == 0) {

            throw { code: -1, message: "no such clientid:" + clientid }
        }

        balance = results[0].balance;

        let payment = null;

        if (amount >= 0) {
            await conn.queryAsync("update t_client set balance=balance+(?) where clientid=?", [amount, clientid])
            payment = {
                clientid,
                amount,
                opt: ENUMS.PaymentOptType.Rechage,
                balance: balance + amount,
                remark,
                createtime: moment().format('YYYY-MM-DD HH:mm:ss')
            }
        } else {
            await conn.queryAsync("update t_client set balance=balance+(?) where clientid=?", [amount, clientid])
            payment = {
                clientid,
                amount,
                opt: ENUMS.PaymentOptType.WithDraw,
                balance: balance + amount,
                remark,
                createtime: moment().format('YYYY-MM-DD HH:mm:ss')
            }
        }


        results = await conn.queryAsync("insert into t_payment set ? ", [payment])
        await conn.commit();
        return results.insertId

    } catch (err) {
        console.error(err);
        if (conn) {
            await conn.rollback();
        }
        throw err;
    } finally {
        if (conn != null) {
            conn.release();
        }
    }

}



async function enableAccount(req, res) {


    if (req.authData.type != ENUMS.AccoutType.Admin) {

        return permissionDeny(req, res);
    }

    let form = req.body;


    let accountid = form.accountid;

    let status = form.status;

    if (!accountid | status == undefined) {

        return paramInvalid(req, res);
    }

    //1 驳回  2 提交成功


    let conn = null;
    let results = null;


    let total = 0;
    try {


        conn = await gDataBases["db_business"].getConnection();


        results = await conn.queryAsync("select * from t_account where accountid=?", [accountid]);
        if (results.length == 0) {
            throw { code: -1, message: "no such accountid:" + accountid }
        }

        if (accountid == req.authData.accountid) {
            throw { code: -1, message: "无法操作管理员" }
        }

        if (status == 0) {

            await conn.queryAsync("update t_account set status=1 where accountid=?", [accountid])
        } else {
            await conn.queryAsync("update t_account set status=0 where accountid=?", [accountid])
        }

        await writeLog({
            accountid: req.authData.accountid,
            remark: `enable accountid + ${status ? "disble" : "enable"} + : + ${accountid}`
        });

    } catch (err) {
        console.error(err);
        if (err && err.message) {
            return failedResponse(req, res, err)
        } else {
            return serverError(req, res);
        }

    } finally {
        if (conn != null) {
            conn.release();
        }
    }
    return successResponse(req, res);
}



async function enableClient(req, res) {


    if (req.authData.type != ENUMS.AccoutType.Admin) {

        return permissionDeny(req, res);
    }

    let form = req.body;


    let clientid = form.clientid;

    let status = form.status;

    if (!clientid | status == undefined) {

        return paramInvalid(req, res);
    }

    //1 驳回  2 提交成功


    let conn = null;
    let results = null;


    let total = 0;
    try {


        conn = await gDataBases["db_business"].getConnection();


        results = await conn.queryAsync("select * from t_client where clientid=?", [clientid]);
        if (results.length == 0) {
            throw { code: -1, message: "no such clientid:" + clientid }
        }

        if (status == 0) {

            await conn.queryAsync("update t_client set status=1 where clientid=?", [clientid])
        } else {
            await conn.queryAsync("update t_client set status=0 where clientid=?", [clientid])
        }

        await writeLog({
            accountid: req.authData.accountid,
            remark: `enable clientid + ${status ? "disble" : "enable"} + : + ${clientid}`
        });

    } catch (err) {
        console.error(err);
        if (err && err.message) {
            return failedResponse(req, res, err)
        } else {
            return serverError(req, res);
        }

    } finally {
        if (conn != null) {
            conn.release();
        }
    }
    return successResponse(req, res);
}




async function writeLog(param) {
    let conn = null;
    let results = null;
    if (!param.accountid || !param.remark) {
        console.error("写入数据参数错误");
        return;
    }
    let item = {
        accountid: param.accountid,
        remark: param.remark,
        createtime: moment().format('YYYY-MM-DD HH:mm:ss')
    }

    try {
        conn = await gDataBases["db_business"].getConnection();
        results = await conn.queryAsync("select * from t_account where accountid=? and status=1", [param.accountid]);

        if (results.length == 0) {
            console.error("用户名查询不到");
            return;
        }

        await conn.queryAsync('insert into t_log set ?', item);

    } catch (err) {
        console.error(err);
        console.error("日志写入失败");

    } finally {
        if (conn != null) {
            conn.release();
        }
    }

}



async function getRunTimeStatList(req, res) {
    if (req.authData.type != ENUMS.AccoutType.Admin) {
        return permissionDeny(req, res);
    }
    let form = req.query;
    let conn = null;
    let results = null;
    let whereSql = "";
    let whereClauses = [];
    let whereParams = [];
    try {
        let sql = "";
        if (form.content) {
            whereClauses.push(" content=? ");
            whereParams.push(form.content);
        }

        if (form.whitchparty) {
            whereClauses.push(" whitchparty=? ");
            whereParams.push(form.whitchparty);
        }

        whereClauses.push(" status=? ");
        whereParams.push(3);

        if (whereClauses.length > 0) {
            whereSql = "where " + whereClauses.join(" and ");
        }

        conn = await gDataBases["db_business"].getConnection();
        results = await conn.queryAsync("select content,whitchparty ,count(*) as total,sum(amount) as totalmoney from t_order " + whereSql + " group by content,whitchparty  ", whereParams)


    } catch (err) {
        console.error(err);
        return serverError(req, res);

    } finally {
        if (conn != null) {
            conn.release();
        }
    }
    successResponse(req, res, {
        list: results
    });



}


//获取结算订单统计
async function getOrderStatList(req, res) {
    if (req.authData.type != ENUMS.AccoutType.Admin && req.authData.type != ENUMS.AccoutType.Proxy) {
        return permissionDeny(req, res);
    }
    let form = req.query;
    let conn = null;
    let results = null;
    let action = 0;
    try {
        let sql = "";
        try {
            action = parseInt(form.action);
            if (isNaN(action)) {
                action = 0;
            }

            if (action > 3 || action < 0) {
                action = 0;
            }
        } catch (err) {

        }

        let sqls = [];
        if (req.authData.type == ENUMS.AccoutType.Proxy) {

            sqls = [
                `select count(*) as total,'' as date ,sum(a.makemoney-a.amount) as clientmakemoney from t_order a left join t_client b on a.clientid=b.clientid where a.status=4 and b.accountid='${req.authData.accountid}'`,
                `select count(DATE(a.createtime)) as total,DATE(a.createtime) as date,sum(a.makemoney-a.amount) as clientmakemoney from t_order a left join t_client b on a.clientid=b.clientid where a.status=4 and b.accountid='${req.authData.accountid}' group by DATE(a.createtime)`,
                `select count(*) as total,'' as date,sum(abs(a.makemoney-a.amount)) as clientmakemoney from t_order a left join t_client b on a.clientid=b.clientid where a.status=4 and b.accountid='${req.authData.accountid}'`,
                `select count(DATE(a.createtime)) as total,DATE(a.createtime) as date,sum(abs(a.makemoney-a.amount)) as clientmakemoney from t_order a left join t_client b on a.clientid=b.clientid where a.status=4 and b.accountid='${req.authData.accountid}' group by DATE(a.createtime)`,
            ]
        } else {

            sqls = [
                "select count(*) as total,'' as date,sum(makemoney-amount) as clientmakemoney from t_order where status=4",
                "select count(DATE(createtime)) as total,DATE(createtime) as date,sum(makemoney-amount) as clientmakemoney from t_order where status = 4 group by DATE(createtime)",
                "select count(*) as total,'' as date,sum(abs(makemoney-amount)) as clientmakemoney from t_order where status=4",
                "select count(DATE(createtime)) as total,DATE(createtime) as date,sum(abs(makemoney-amount)) as clientmakemoney from t_order where status = 4 group by DATE(createtime)"
            ]

        }
        conn = await gDataBases["db_business"].getConnection();
        results = await conn.queryAsync(sqls[action]);
    } catch (err) {
        console.error(err);
        return serverError(req, res);

    } finally {
        if (conn != null) {
            conn.release();
        }
    }
    successResponse(req, res, {
        list: results,
        action,
    });
}


module.exports = {



    getClientList,

    createClient,

    updateClient,

    getAccountList,

    createAccount,

    updateAccount,

    getPaymentList,

    getLogList,

    rechage,

    withDraw,

    auditOrder,

    getOrderList,

    getOrderStatList,

    createOrder,

    updateOrder,

    finishOrder,

    enableAccount,
    enableClient,
    reqRollBackOrder,
    getRunTimeStatList

}