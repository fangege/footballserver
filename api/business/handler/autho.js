let APP_BASE_DIR = "../../../";
const ENUMS = require(APP_BASE_DIR + "include/enums").ENUM;
const convertFunc = require(APP_BASE_DIR + "include/enums").convertFunc;
const crypto = require("crypto");
const moment = require("moment");
const EXPIRE_TIME = 24 * 60 * 60 * 1000;




setInterval(async function () {
    let conn = null;
    try {
        conn = await gDataBases["db_business"].getConnection();
        let result = await conn.queryAsync("delete from t_token where expire_time < now() and domain=2");
    } catch (err) {
        console.error(err);
    } finally { }
    if (conn != null) {
        conn.release();
    }


}, 60 * 1000)



async function login(req, res) {


    let param = req.body;
    let userid = param.clientid;
    let password = param.password;

    if (!userid || userid.length > 50) {
        return res.json({
            "code": ENUMS.ErrCode.ParamInvalid,
            "message": ENUMS.ErrCodeMessage.ParamInvalid,
        });

    }

    if (!password || password.length > 255) {
        return res.json({
            "code": ENUMS.ErrCode.ParamInvalid,
            "message": ENUMS.ErrCodeMessage.ParamInvalid,
        });
    }


    //查询帐号密码
    let conn = null;
    let token = "";
    let expires_time = "";

    try {
        conn = await gDataBases["db_business"].getConnection();

        let clientSql = "select * from t_client where clientid=?";
        let result = await conn.queryAsync(clientSql, [userid]);
        if (result.length == 0) {
            return res.json({
                "code": ENUMS.ErrCode.ParamInvalid,
                "message": ENUMS.ErrCodeMessage.ParamInvalid,
            });
        }

        if (result[0].password != password) {
            return res.json({
                "code": ENUMS.ErrCode.PermissionDeny,
                "message": ENUMS.ErrCodeMessage.PermissionDeny,
            });
        }

        token = crypto.createHash("md5").update(userid + "" + new Date().getTime() + "" + Math.random() + "token").digest("hex");

        expire_time = moment().add(EXPIRE_TIME / 1000, 'seconds').format('YYYY-MM-DD HH:mm:ss');


        result = await conn.queryAsync("select * from t_token where userid=? and expire_time>now() and domain=2 order by expire_time", [userid]);
        let tokenSql = "";

        if (result.length > 0) {
            tokenSql = `update t_token set token =?,expire_time=?,userid = ? where domain=2 and token='${result[0].token}'`

        } else {
            tokenSql = "insert into t_token(token,expire_time,userid,domain) values(?,?,?,2)"

        }


        await conn.queryAsync(tokenSql, [token, expire_time, userid]);

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            'code': ENUMS.ErrCode.Failed,
            'message': ENUMS.ErrCodeMessage.Failed
        });
    } finally {
        if (conn != null) {
            conn.release();
        }
    }


    res.cookie('clientid', userid, { expires: new Date(Date.now() + EXPIRE_TIME), httpOnly: true });
    res.cookie('btoken', token, { expires: new Date(Date.now() + EXPIRE_TIME), httpOnly: true });
    return res.json({
        "code": ENUMS.ErrCode.Success,   //621,密码错误; 620,用户不存在; 500,服务器错误(数据库查询失败)
        "message": ENUMS.ErrCodeMessage.Success,
        "currentAuthority": 'admin',

    })
}


async function logout(req, res) {

    let param = req.cookies;
    let token = param.btoken;

    if (!token || token.length > 255) {
        return res.json({
            "code": 611,
            "message": "",
        });
    }


    //查询帐号密码
    let conn = null;
    let result = null;

    try {
        conn = await gDataBases["db_business"].getConnection();
        result = await conn.queryAsync("delete from t_token where token=? and domain=2", [token]);

    } catch (err) {

        return res.json({
            'code': ENUMS.ErrCode.EC_DATABASE_ERROR,
            'message': '服务器错误'
        });
    } finally {
        if (conn != null) {
            conn.release();
        }
    }
    res.cookie('clientid', "", { expires: new Date(Date.now() + EXPIRE_TIME), httpOnly: true });
    res.cookie('btoken', "", { expires: new Date(Date.now() + 900000), httpOnly: true });
    return res.json({
        "code": 200,   //621,密码错误; 620,用户不存在; 500,服务器错误(数据库查询失败)
        "message": "OK",
    })

}

async function getCurrentAccount(req, res) {

    let param = req.cookies;
    let token = param.btoken;

    if (!token || token.length > 255) {
        return res.json({
            "code": 611,
            "message": "",
        });
    }

    //查询帐号密码
    let conn = null;
    let expires_time = "";

    let result = null;
    try {
        conn = await gDataBases["db_business"].getConnection();
        result = await conn.queryAsync("select a.clientid,a.status from t_client a left join t_token b on a.clientid=b.userid where b.token=? and b.domain=2", [token]);
        if (result.length == 0) {
            return res.json({
                "code": 611,
                "message": "",
            });
        }
    } catch (err) {
        console.error(err);
        return res.status(404).json({
            'code': ENUMS.ErrCode.EC_DATABASE_ERROR,
            'message': '服务器错误'
        });
    } finally {
        if (conn != null) {
            conn.release();
        }
    }

    return res.json({
        type: convertFunc.getAccoutTypeName(result[0].type),
        avatar: 'https://gw.alipayobjects.com/zos/rmsportal/BiazfanxmamNRoxxVxka.png',
        clientid: result[0].clientid,
        notifyCount: 10,
        name:"管理员"
    })
}

async function updatePassword(req,res){

    let form = req.body;

    let conn = null;
    let expires_time = "";

    let result = null;
    try {
        conn = await gDataBases["db_business"].getConnection();
        result = await conn.queryAsync("select * from t_client where clientid=? and password=?", [req.authData.clientid,form.oldpassword]);

        if (result.length == 0) {
            return res.json({
                "code": 611,
                "message": "旧密码错误",
            });
        }

        await conn.queryAsync("update t_client set password=? where clientid=? and password=?", [form.newpassword,req.authData.clientid,form.oldpassword]);
    } catch (err) {
        console.error(err);
        return res.status(404).json({
            'code': ENUMS.ErrCode.EC_DATABASE_ERROR,
            'message': '服务器错误'
        });
    } finally {
        if (conn != null) {
            conn.release();
        }
    }

    res.status(200).json({
        code: ENUMS.ErrCode.Success,
        message: ENUMS.ErrCodeMessage.Success
    })



}


module.exports = {
    login,
    logout,
    getCurrentAccount,
    updatePassword
}