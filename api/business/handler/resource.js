

let APP_BASE_DIR = "../../../"

const moment = require("moment");
const mysql = require("mysql");
const ENUMS = require(APP_BASE_DIR + "include/enums").ENUM;


async function permissionDeny(req, res) {
    return res.status(403).json({
        'code': ENUMS.ErrCode.PermissionDeny,
        'message': ENUMS.ErrCodeMessage.PermissionDeny
    });
}

async function paramInvalid(req, res) {
    return res.status(400).json({
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


async function getOrderList(req, res) {



    let clientid = req.authData.clientid;

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
    let whereClauses = [" clientid=? "];
    let whereParams = [clientid];

    if (form.no) {
        whereClauses.push(" orderid=? ");
        whereParams.push(form.no);
    }

    if (form.status != undefined) {
        whereClauses.push(" status=? ");
        whereParams.push(form.status);
    }



    if (whereClauses.length > 0) {
        whereSql = "where " + whereClauses.join(" and ");
    }

    try {
        conn = await gDataBases["db_business"].getConnection();
        results = await conn.queryAsync("select count(*) as total from t_order " + whereSql, whereParams);
        total = results[0].total;


        whereParams.push((page - 1) * 10);

        results = await conn.queryAsync("select remark, content,odds / 100 as odds,whitchparty,outcome,makemoney,clientid,orderid,createtime,amount,status from t_order " + whereSql + " order by createtime desc limit ?,10 ", whereParams)

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


    let clientid = req.authData.clientid;
    let form = req.body;

    //check
    if (!form.amount || !form.odds || !form.content || !form.whitchparty) {

        return paramInvalid(req, res);
    }

    let conn = null;
    let results = null;
    try {

        let amount = parseInt(form.amount);
        if (isNaN(amount) || amount <= 0) {
            return paramInvalid(req, res)
        }
        let content = form.content;
        let whitchparty = form.whitchparty;
        let odds = parseInt(form.odds * 100);
        if (isNaN(odds)) {
            return failedResponse(req, res, {
                code: -1,
                message: "赔率非法"
            });
        }

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
        //检查client是否存在，检查待审核订单数是否超过3
        results = await conn.queryAsync("select * from t_order where clientid=? and status=?", [clientid, ENUMS.OrderStatus.Pending]);
        if (results.length > 5) {
            return failedResponse(req, res, {
                code: ENUMS.ErrCode.Failed,
                message: "待审核订单超过三个"
            });
        }

        await conn.queryAsync('insert into t_order set ?', item);
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



async function getPaymentList(req, res) {

    let clientid = req.authData.clientid;

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
    let whereClauses = [" clientid=? "];
    let whereParams = [clientid];

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

async function confirmOrder(req, res) {



    let form = req.body;

    let action = form.action;
    let orderid = form.orderid;



    let clientid = req.authData.clientid;

    //check
    if (!action || !orderid) {

        return paramInvalid(req, res);
    }

    if (action != "confirm" && action != "cancle") {

        return paramInvalid(req, res);
    }

    let conn = null;
    let results = null;
    try {

        conn = await gDataBases["db_business"].getConnection();
        results = await conn.queryAsync("select * from t_order  where clientid=? and orderid=? and status=?", [clientid, orderid, ENUMS.OrderStatus.UserPending]);

        if (results.length == 0) {
            return failedResponse(req, res, {
                code: ENUMS.ErrCode.Failed,
                message: "指定订单不存在"
            });
        }
        //用户确认了订单


        if (action == "confirm") {
            await conn.queryAsync("update t_order set status=? where orderid=?", [ENUMS.OrderStatus.Pending, orderid]);
        } else {
            await conn.queryAsync("update t_order set status=? where orderid=?", [ENUMS.OrderStatus.Canceled, orderid]);
        }



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


module.exports = {

    getOrderList,

    createOrder,


    getPaymentList,
    confirmOrder,



}