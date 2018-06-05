let APP_BASE_DIR = "../../";
const ENUMS = require(APP_BASE_DIR + "include/enums").ENUM;
const convertFunc = require(APP_BASE_DIR + "include/enums").convertFunc;
const moment = require("moment");



function notValidLogin(req, res) {

    return res.status(401).json({
        "code": ENUMS.ErrCode.PermissionDeny,
        "message": ENUMS.ErrCodeMessage.PermissionDeny,
    });
}




async function autho(req, res, next) {

    let param = req.cookies;
    let token = param.btoken;
    if (!token || token.length > 255) {
        return notValidLogin(req, res);
    }

    //查询帐号密码
    let conn = null;
    let result = null;

    try {
        conn = await gDataBases["db_business"].getConnection();
        result = await conn.queryAsync("select b.clientid,b.status from t_token a left join t_client b on a.userid=b.clientid where a.token=? and a.domain=2 and b.status=1", [token]);
      
        if (result.length == 0) {

      
            return notValidLogin(req, res);
        }
     
        req.authData = result[0];

    } catch (err) {

        return res.status(500).json({
            'code': ENUMS.ErrCode.Failed,
            'message': ENUMS.ErrCodeMessage.Failed
        });
    } finally {
        if (conn != null) {
            conn.release();
        }
    }

    next();

}


module.exports = {
    autho
}
