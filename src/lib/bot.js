require('./utils.js');
var fs = require('fs');
var irc = require('irc');
var http = require('http');
var request = require('request');
var qs = require('querystring');
var util = require('util');

module.exports = {
  client: null,
  config: {
    host: 'irc.freenode.net',
    nick: 'langbot',
    channel: 'langbot',
    master: undefined,
    pass: undefined
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
      for (var i in cfg) this.config[i] = cfg[i];
    } catch(e) {
    }
  },
  loadedModules: {},
  loadModules: function() {
    var me = this;
    fs.readdirSync('src/modules/').forEach(function(n){
      var m = n.match(/^(\w+)\.mod\.js$/);
      if (!m) return;
      me.loadModule(m[1]);
    })
  },
  loadModule: function(name) {
//    console.log('Loading module',name+'.');
    var opt = this.config.modules && this.config.modules[name] || {};
    if (!opt.disabled) {
      require('../modules/'+name+'.mod.js').setup(this,opt);
      this.loadedModules[name] = true;
    }
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
        channels: [me.config.channel],
        autoRejoin: false,
        userName: 'langbot',
        autoConnect: true,
        floodProtection: true,
        floodProtectionDelay: 150,
    });

    client.addListener('registered' , function (ch,names) {
      if (me.config.pass) me.client.say('NickServ','IDENTIFY '+me.config.pass);
    });
    
    client.addListener('error', me.report.bind(this,'error'));
//    client.addListener('registered', me.report.bind(this,'registered'));
    client.addListener('notice', function(from, to, text,message) {
      me.report('notice','<'+(from||me.config.host)+'> '+text);
    });

    client.addListener('invite', function (ch) {
      if (ch == me.config.channel) client.join(me.config.channel);
    });

    me.client.addListener('message'+me.config.channel,function (from, message) {
      if (from == me.client.nick) return;
      var re = new RegExp('^('+ me.client.nick + '[,:>]\s*|[.])(.*)$','i');
      var m = message.match(re);
      if (m) {
        if(m[1] == '.') {
          me.doMessage(from,m[2].trim(),function(reply) {
            me.say(reply);
          });
        } else {
          me.doMessage(from,m[2].trim(),function(reply) {
            me.say(from+': '+reply);
          });
        }
      } else {
        me.emit('say',from,message);
      }
    });
    me.client.addListener('pm', function (from, message) {
      if (!me.present(from)) return me.say(from,"Join "+bot.config.channel+" and then we'll talk.");
      me.doMessage(from,message,function(reply) {
        me.say(from,reply);
      });
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
    var pending = this.pending[nick];
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
      if (out.join(' ').length + pending[0].length + 1 > 430) break;
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
  doMessage: function(from,msg,respond) {
    msg = msg.clean();
    var m = msg.match(/^(\w+)(.*)$/);
    if (!m) return;
    var cmd = m[1];
    var text = m[2].clean();
    var commands = this.commands[cmd];
    if (!commands) return;
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
    if (!command) return respond ('bad args, usage: '+bot.usage(cmd));
    
    var me = this;
    var pending = me.pending[from];
    respond.print = me.print.bind(me,from);
    respond.flush = me.flush.bind(me,from,respond);
    respond.printbr = me.printbr.bind(me,from);
    respond.flushbr = me.flushbr.bind(me,from,respond);
    respond.printrow = me.printrow.bind(me,from);

    
    args.unshift(respond);
    args.unshift(from);

    me._pending[from] = (me.pending[from]||[]).concat();
    me.pending[from] = [];
    command.action.apply(this,args);
  },
  usage:function(cmd) {
    var command = this.commands[cmd];
    return command 
    ? command.reverse().map(function(n){
       return n.usage + ' ' + n.help
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
    console.log(options);
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
}
