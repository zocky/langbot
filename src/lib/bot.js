require('./utils.js');
var fs = require('fs');
var irc = require('irc');
var http = require('http');
var request = require('request');
var qs = require('querystring');
var util = require('util');


function sizeof(s) {
  return encodeURI(s).split(/%..|./).length - 1;
}

module.exports = {
  client: null,
  config: {
    host: 'irc.freenode.net',
    nick: 'wcbot',
    channel: 'wcbot',
    master: undefined,
    pass: undefined,
    identify_trigger: "You are now identified",
  },
  report: function(a1,a2) {
    //console.error(this.config.master,a1+':',a2);
    if (this.config.master && this.present(this.config.master)) this.say(this.config.master,a1+': '+a2);
  },
  save: function() {
    fs.writeFile('./var/'+this.confname+'.state.json',JSON.stringify(this.state,null,2));
  },
  load: function() {
    try {
      var str = fs.readFileSync('./var/'+this.confname+'.state.json');
      this.state = JSON.parse(str);
    } catch(e) {
      this.state = {};
    }
    try {
      var str = fs.readFileSync('./etc/'+this.confname+'.config.json');
      var cfg = JSON.parse(str);
      if (typeof cfg.enabled_modules=='string') cfg.enabled_modules = cfg.enabled_modules.trim().split(/\s+/);
      if (typeof cfg.disabled_modules=='string') cfg.disabled_modules = cfg.disabled_modules.trim().split(/\s+/);
      for (var i in cfg) this.config[i] = cfg[i];
    } catch(e) {
    }
  },
  loadedModules: {},
  loadModules: function() {
    var me = this;
    fs.readdirSync('./src/modules/').forEach(function(n){
      var m = n.match(/^(\w+)\.mod\.js$/);
      if (!m) return;
      me.loadModule(m[1]);
    })
  },
  loadModule: function(name) {
//    console.log('Loading module',name+'.');
    if (this.config.enabled_modules && this.config.enabled_modules.indexOf(name)<0) return;
    if (this.config.disabled_modules && this.config.disabled_modules.indexOf(name)>1) return;
    var opt = this.config.modules && this.config.modules[name] || {};
    if (opt.disabled) return;
    require('../modules/'+name+'.mod.js').setup(this,opt);
    this.loadedModules[name] = true;
  },
  init: function(confname) {
    this.confname = confname || 'default';
    var me = this;
    me.load();
    console.log('Starting '+ this.confname + ' @' + this.config.nick + ' ' + this.config.channel);

    var pidfile = './var/'+this.confname+'.pid'
    fs.writeFileSync(pidfile,process.pid);
    process.on('exit', function() {
      fs.unlinkSync(pidfile)
    })    
    var client = me.client = new irc.Client(me.config.host, me.config.nick, {
        channels: [],
        autoRejoin: false,
        userName: 'langbot',
        autoConnect: true,
        floodProtection: true,
        floodProtectionDelay: 150,
    });

    client.addListener('registered' , function (ch,names) {
      if (me.config.pass)
        me.client.say('NickServ','IDENTIFY '+me.config.pass);
      else
        me.client.join(me.config.channel);
    });
    
    client.addListener('error', me.report.bind(this,'error'));
    client.addListener('notice', function(from, to, text, message) {
      me.report('notice','<'+(from||me.config.host)+'> '+text);
      if(me.config.pass && from == 'NickServ' && text.indexOf(me.config.identify_trigger) >= 0)
          me.client.join(me.config.channel);
    });

    client.addListener('invite', function (ch) {
      if (ch == me.config.channel) client.join(me.config.channel);
    });

    me.client.addListener('message'+me.config.channel,function (from, message, raw) {
      if (from == me.client.nick) return;
      var re = new RegExp('^('+ me.client.nick + '[,:>]\s*|[.])(.*)$','i');
      var m = message.match(re);
      if (m) {
        if(m[1] == '.') {
          me.doMessage(from,m[2].trim(),function(reply) {
            me.say(reply);
          },raw);
        } else {
          me.doMessage(from,m[2].trim(),function(reply) {
            me.say(from+': '+reply);
          },raw) || me.emit('talk',from,m[2].trim());
        }
      } else {
        me.emit('say',from,message);
      }
    });
    me.client.addListener('pm', function (from, message,raw) {
      if (!me.present(from)) return me.say(from,"Join "+me.config.channel+" and then we'll talk.");
      if(message[0]=='.') message=message.substr(1);
      me.doMessage(from,message,function(reply) {
        me.say(from,reply);
      },raw);
    });

    me.loadModules();
    
    process.on('SIGINT', function () {
      console.log('disconnecting');
      me.client.disconnect('deadness ensues', function() {
        setTimeout(function() {
          console.log('disconnected, shutting down');
          process.exit(); 
        },3000);
      });
    });

    process.on('uncaughtException', function(err) {
      console.log(err.stack);
      me.report('exception',err);
    });
    
    me.client.on('notice',function(nick,to,text) {
      if (nick != 'NickServ') return;
      var m = text.match(/^(\S+) -> (\S+) ACC (\d)/);
      if (!m) return;
      var nick = m[1], account = m[2] == '*' ? null : m[2];
      if (timeouts[nick]) {
        clearTimeout(timeouts[nick]);
        delete timeouts[nick];
      }
      if (pending_cloaks[nick]) cloaks[pending_cloaks[nick]] = account;
      if (!accs[nick]) return;
      accs[nick](account);
      delete accs[nick];
    })
    
  
    return me;

  },
  say: function(a1,a2) {
    if (arguments.length == 1) {
      this.client.say(this.config.channel,a1);
    } else if (arguments.length == 2) {
      this.client.say(a1,a2);
    }
  },
  listeners: {
    say: [],
    talk: [],
    action: [],
    command: [],
    all: [],
    pm: []
  },
  emit: function(type) {
    var args = Array.make(arguments).slice(1);
//    console.log('args',args);
    for (var i in this.listeners[type]) this.listeners[type][i].apply(this,args);
  },
  on: function(type,fn) {
    this.listeners[type].push(fn);
  },
  listen: function(fn) {
    this.on('say',fn);
  },
  pending: {},
  _pending: {},
  _print: function(nick,text) {

    text = String(text).clean().leftBytes(480);
    var pending = this.pending[nick] || [];
    switch(pending[pending.length-1]) {
    case '':
      break;
    case '<nobr>':
      pending.pop();
      pending.push(pending.pop() + ' ' + text);
      break;
    default:
      pending.push(text);
    }
  },
  print: function(nick) {
    var me = this;
    Array.make(arguments).slice(1).flatten().filter(Boolean).forEach(function(n) {
      me._print(nick,n);
    })
  },
  printbr: function(nick) {
    var me = this;
    Array.make(arguments).slice(1).flatten().filter(Boolean).forEach(function(n) {
      me.print(nick,n,'<br>');
    })
  },
  printrow: function(nick,left,mid,right) {
    var me = this;
    var maxlen = 430;
    var out = [];
    if (left) out.push(left);
    if (mid) out.push(mid.shortenBytes(maxlen-(left||'').lengthBytes - (right||'').lengthBytes));
    if (right) out.push(right);
    me.print(nick,out.join(' | '),'<br>');
  },
  clear: function(nick) {
    this.pending[nick] = [];
  },
  flush: function(nick, respond) {
    var me = this;
    Array.make(arguments).slice(2).flatten().filter(Boolean).forEach(function(n) {
      me._print(nick,n);
    })
    this._flush(nick,respond);
  },
  flushAll: function(nick,respond) {
    var pending = this.pending[nick];
    while(pending && pending.length) this._flush(nick,respond);
  },
  flushbr: function(nick, respond) {
    var me = this;
    var args = Array.make(arguments).slice(2).flatten().filter(Boolean).forEach(function(n) {
      me.print(nick,n,'<br>');
    })
    this._flush(nick,respond);
  },
  _flush: function(nick, respond) {
    var pending = this.pending[nick];
    if (!pending) return respond ('nothing in your queueueue');

    if (!pending.length) return respond('EOF');
    var i = 1;
    while (pending[0] == '<br>') pending.shift();
    var out = [pending.shift()];
    while (pending.length) {
      if (pending[0]=='<br>') {
        pending.shift();
        break;
      }
      if (sizeof(out.join(' ') + pending[0]) + 1 > 400) break;
      out.push(pending.shift());
    }
    var text = out.join(' ');
    while (pending[0] == '<br>') pending.shift();
    while(pending.length && pending[pending.length-1].match(/^<(no)?br>$/)) pending.pop();
    if (pending.length) {
      text+=' [...]';
      pending[0] = '[...] ' + pending[0];
    }
    respond(text);    
  },
  doMessage: function(from,msg,respond,raw) {
    msg = msg.clean();
    var m = msg.match(/^(\w+)(.*)$/);
    if (!m) return false;
    var cmd = m[1];
    var text = m[2].clean();
    var commands = this.commands[cmd];
    if (!commands) return false;
    for (var i in commands) {
      var c = commands[i];
      if (c.args instanceof RegExp) {
        var m = text.match(c.args);
        if (!m) continue;
        var args = m.slice(1);
        var command = c;
        break;
      } else {
        var command = c;
        var args = [text].concat(text.split(/ /));
        break;
      }
    }
    if (!command) {
      respond ('bad args, usage: '+this.usage(cmd));
      return true;
    }

    if (command.msgonly && raw.args[0]!=this.client.nick) {
      respond ('Only available through /msg');
      return true;
    }
    
    
    var me = this;
    var pending = me.pending[from];
    respond.print = me.print.bind(me,from);
    respond.flush = me.flush.bind(me,from,respond);
    respond.printbr = me.printbr.bind(me,from);
    respond.flushbr = me.flushbr.bind(me,from,respond);
    respond.flushAll = me.flushAll.bind(me,from,respond);
    respond.printrow = me.printrow.bind(me,from);
    respond.raw = raw;

    
    args.unshift(respond);
    args.unshift(from);


    me._pending[from] = (me.pending[from]||[]).concat();
    me.pending[from] = [];

    var doCmd = function() {
      command.action.apply(this,args);
    }
    
    var allow = command.allow;
    if (command.allow) {
      if (typeof command.allow == 'function') allow = command.allow.apply(this,args);
      this.account(from,respond,function(a) {
        if (!a && command.allow!='all') return respond(from+', please login with NickServ first.');
        respond.account = a;
        if (allow == 'master' && a != me.config.master) return respond('Only my master can do that. You are not my master.');
        if (Array.isArray(allow) && a != me.config.master && allow.indexOf(a)<0) return respond('You are not allowed to do that.');
        doCmd();
      })
    } else {
      doCmd();
    }

    return true;
  },
  usage:function(cmd) {
    var command = this.commands[cmd];
    return command 
    ? command.reverse().map(function(n){
       return n.usage + ' - ' + n.help
      })
      .join(' | ')
    : 'unknown command '+cmd;
  },
  present: function() { return false }, //overriden in modules/users.js
  commands: {},
  command: function(name,opt) {
    this.addCommand(name,opt);
  },
  addCommand: function (name,opt) {
    this.commands[name] = [opt].concat(this.commands[name] || []);
  },
  _wget: function(url,params,cb,extra) {

    if (typeof url == 'string' && typeof params == 'object') {
      var options = {
        url: url,
        params: params
      }
    } else if (typeof url == 'string') {
      var options = url;
      cb = params;
    } else throw('bad params for wget');
  
    for (var i in extra) options[i]=extra[i];
  
    if (options.params) {
      var p = qs.stringify(params);
      if (p) options.url += (options.url.indexOf('?')>-1 ? '&' : '?') + p;
    } 
    var U = options.url;
    return request(options,function(error,response,body) {
      cb(error,response,body,U);
    });
  },
  wpost: function(url,params,cb) {
    this._wget(url,{},cb,{method:'POST',form:params});
  },
  wget: function(url,params,cb) {
    this._wget(url,params,cb,{});
  },
  wgetjson: function(url,params,cb) {
    this._wget(url,params,cb,{json:true});
  },
  account: function (nick,respond,cb) {
    if (cloaks[respond.raw.host]) return cb(cloaks[respond.raw.host]);
    
    if (accs[nick]) return respond('Still verifying your nick for the last command,' + nick + '. Please try again in a few moments.');
    accs[nick] = cb;
    if (respond.raw.host && respond.raw.host.indexOf('/')+1) pending_cloaks[nick] = respond.raw.host;
    
    timeouts[nick] = setTimeout(function() {
      respond('Timed out while trying to verify your account with NickServ, '+nick+'. Please try again in a few moments.')
      delete pending_cloaks[nick];
      delete accs[nick];
      delete timeouts[nick];
    },10000)
    this.say('NickServ','ACC '+nick+' *');
  }
}

  
var accs = {};
var timeouts = {};
var cloaks = {};
var pending_cloaks = {};

