


const ENUM = {


    MaxOdds: 100,

    BusinessPath:"https://static-1255551836.cos.ap-chengdu.myqcloud.com/business.html",
    OptPath:"https://s3-ap-southeast-1.amazonaws.com/aws-business-static/resource/opt.html",
    
    ErrCode: {
        Success: 200,
        Failed: -1000,
        ParamInvalid: -1001,
        PermissionDeny: -1002
    },
    ErrCodeMessage: {
        Success: "ok",
        Failed: "服务器内部错误",
        ParamInvalid: "输入参数错误",
        PermissionDeny: "权限错误"
    },

    AccoutType: {
        SuperAdmin: 0,
        Admin: 1,
        Staff: 2,
        Finance: 3,
        Proxy: 4
    },

    AccoutTypeAutho: {
        SuperAdmin: "SuperAdmin",
        Admin: "Admin",
        Staff: "Staff",
        Finance: "Finance",
        Proxy: 4
    },

    ClientStatus: {
        ACTIVE: 0,
        FORBIDEN: -1
    },

    OutComeStatus: {
        Win: 1,
        Lose: 2,
        Draw: 3,
        HalfWin: 4,
        HalfLose: 5
    },

    OrderStatus: {
        Pending: 0,
        Canceled: 1,
        Rejected: 2,
        Pass: 3,
        Finished: 4,
        UserPending: 5
    },

    PaymentOptType:{

        Rechage:1,
        Consume:2,
        MakeMoney:3,
        WithDraw:4,
        RollBack:5
    }
}

const convertFunc = {


    getOutComeStatusName: function (outcome) {
        switch (outcome) {
            case ENUM.OutComeStatus.Win:
                return "赢";
            case ENUM.OutComeStatus.Lose:
                return "输";
            case ENUM.OutComeStatus.Draw:
                return "平";
            case ENUM.OutComeStatus.HalfWin:
                return "半赢";
            case ENUM.OutComeStatus.HalfLose:
                return "半输";

            default:
                return ""
        }
    },

    getAccoutTypeName: function (type) {
        switch (type) {
            case ENUM.AccoutType.SuperAdmin:
                return "superadmin";

            case ENUM.AccoutType.Admin:
                return "admin";

            case ENUM.AccoutType.Staff:
                return "staff";

            case ENUM.AccoutType.Proxy:
                return "proxy";

            case ENUM.AccoutType.Finance:
                return "finance";

            default:
                return ""
        }
    },
    getOrderStatusName: function (status) {
        switch (status) {
            case ENUM.OrderStatus.Pending:
                return "待审核";

            case ENUM.OrderStatus.Canceled:
                return "已取消";

            case ENUM.OrderStatus.Rejected:
                return "已驳回";

            case ENUM.OrderStatus.Pass:
                return "通过";

            case ENUM.OrderStatus.Finished:
                return "已结算";

            case ENUM.OrderStatus.UserPending:
                return "对待用户确定";


            default:
                return ""
        }
    }
}



module.exports = {
    ENUM,
    convertFunc
}