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
        let result = await conn.queryAsync("delete from t_token where expire_time < now() and domain=1");
    } catch (err) {
        console.error(err);
    } finally { }
    if (conn != null) {
        conn.release();
    }


}, 60 * 1000)



async function login(req, res) {

    let param = req.body;
    let userid = param.accountid;
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

        let accountSql = "select * from t_account where accountid=? and status=1";
        let result = await conn.queryAsync(accountSql, [userid]);
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


        result = await conn.queryAsync("select * from t_token where userid=? and expire_time>now() and domain=1 order by expire_time", [userid]);
        let tokenSql = "";

        if (result.length > 0) {
            tokenSql = `update t_token set token =?,expire_time=?,userid = ? where domain=1 and token='${result[0].token}'`

        } else {
            tokenSql = "insert into t_token(token,expire_time,userid,domain) values(?,?,?,1)"

        }
        await conn.queryAsync(tokenSql, [token, expire_time, userid]);

    } catch (err) {
        console.error(err);
        return res.status(404).json({
            'code': ENUMS.ErrCode.Failed,
            'message': ENUMS.ErrCodeMessage.Failed
        });
    } finally {
        if (conn != null) {
            conn.release();
        }
    }


    res.cookie('accountid', userid, { expires: new Date(Date.now() + EXPIRE_TIME), httpOnly: true });
    res.cookie('token', token, { expires: new Date(Date.now() + EXPIRE_TIME), httpOnly: true });
    return res.json({
        "code": ENUMS.ErrCode.Success,   //621,密码错误; 620,用户不存在; 500,服务器错误(数据库查询失败)
        "message": ENUMS.ErrCodeMessage.Success,
        "currentAuthority": 'admin',

    })
}


async function logout(req, res) {

    let param = req.cookies;
    let token = param.token;

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
        result = await conn.queryAsync("delete from t_token where token=? and domain=1", [token]);

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
    res.cookie('accountid', "", { expires: new Date(Date.now() + EXPIRE_TIME), httpOnly: true });
    res.cookie('token', "", { expires: new Date(Date.now() + 900000), httpOnly: true });
    return res.json({
        "code": 200,   //621,密码错误; 620,用户不存在; 500,服务器错误(数据库查询失败)
        "message": "OK",
    })

}

async function getCurrentAccount(req, res) {

    let param = req.cookies;
    let token = param.token;

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
        result = await conn.queryAsync("select a.accountid,a.type from t_account a left join t_token b on a.accountid=b.userid where b.token=? and b.domain=1", [token]);
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
        accountid: result[0].accountid,
        notifyCount: 10,
        name: convertFunc.getAccoutTypeName(result[0].type),
    })
}


module.exports = {
    login,
    logout,
    getCurrentAccount
}