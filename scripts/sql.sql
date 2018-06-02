
--用户表
create table t_client(
   ID int(11) not null AUTO_INCREMENT,
   clientid VARCHAR(10) NOT NULL,
   accountid VARCHAR(10) not null,
   password VARCHAR(32) NOT null default '',
   createtime DATETIME not null default '1970-01-01',
   balance float(11) not null default 0,
   communication VARCHAR(128) default '',
   status int(4) not null default 1,
   PRIMARY KEY ( ID ),
   UNIQUE KEY (clientid)   
)ENGINE=InnoDB  DEFAULT CHARSET=utf8;

--后台管理员表
create table t_account(
   ID int(11) not null AUTO_INCREMENT,
   accountid VARCHAR(10) NOT NULL,
   password VARCHAR(32) NOT null default '',
   createtime DATETIME not null default '1970-01-01',
   communication VARCHAR(128) default '',
   type tinyint(4) not null default 2,
   PRIMARY KEY ( ID ),
   UNIQUE KEY (accountid)   
)ENGINE=InnoDB  DEFAULT CHARSET=utf8;


--订单
create table t_order(
   orderid VARCHAR(16) NOT null,
   clientid VARCHAR(10) NOT NULL,
   amount int(11) not null default 0,
   odds int(11) not null default 0,
   content VARCHAR(256) not null default '',
   whitchparty VARCHAR(256) not null default '',
   outcome TINYINT(4) not null DEFAULT 0,
   makemoney int(11) not null DEFAULT 0,
   status tinyint(4),
   createtime DATETIME not null default '1970-01-01',
   PRIMARY KEY ( orderid ),
   KEY (clientid)
)ENGINE=InnoDB  DEFAULT CHARSET=utf8;

--流水
create table t_payment(
   ID int(11) not null AUTO_INCREMENT,
   clientid VARCHAR(10) NOT NULL,
   amount int(11) not null default 0,
   opt tinyint(4) not null default 0,
   balance float(11) not null default 0,
   remark VARCHAR(256) not null default '',
   createtime DATETIME not null default '1970-01-01',
   PRIMARY KEY ( ID ),
   KEY (clientid)
)ENGINE=InnoDB  DEFAULT CHARSET=utf8;


--操作日志
create table t_log(
   ID int(11) not null AUTO_INCREMENT,
   accountid VARCHAR(10) NOT NULL,
   remark VARCHAR(256) not null default '',
   createtime DATETIME not null default '1970-01-01',
   PRIMARY KEY ( ID ),
   KEY (accountid)
)ENGINE=InnoDB  DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS t_token(
  token VARCHAR(32) NOT NULL,
  domain tinyint(4) NOT NULL,
  userid VARCHAR(50) NOT NULL,
  expire_time DATETIME NOT NULL DEFAULT '1970-01-01',
  PRIMARY KEY(token,domain),
  KEY(userid),
  KEY(expire_time)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;



