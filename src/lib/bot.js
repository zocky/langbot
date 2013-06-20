require('./utils.js');
var fs = require('fs');
var irc = require('irc');
var http = require('http');
var request = require('request');
var qs = require('querystring');

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
    console.error(this.config.master,a1+':',a2);
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
    console.log('Loading module',name+'.');
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
        for (var i in me.listeners) me.listeners[i](from,message);
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
  listeners: [],
  listen: function(fn) {
    this.listeners.push(fn);
  },
  pending: {},
  _pending: {},
  _print: function(nick,text) {

    text = String(text).clean().leftBytes(430);
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
    left = left ? left + ' | ' : '';
    right = right ? ' | ' + right : '';
    mid = mid.shortenBytes(maxlen-left.lengthBytes - right.lengthBytes);
    me.print(nick,left+mid+right,'<br>');
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
    while(pending[pending.length-1] == '<nobr>') pending.pop();
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
    var cmd = this.commands[m[1]];
    if (!cmd) return;
    if (cmd.args instanceof RegExp) {
      var m = msg.replace(/^\w+/,'').trim().match(cmd.args);
      if (!m) return respond ('bad args, usage: '+cmd.usage);
      var args = Array.make(m).slice(1);
    } else {
      var text = m[2].trim();
      var args = text.split(/\s+/);
      args.unshift(text);
    }
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
    cmd.action.apply(this,args);
  },
  present: function() { return false }, //overriden in modules/users.js
  commands: {},
  addCommand: function (name,opt) {
    this.commands[name] = opt;
  },
  wget: function(options,params,cb) {
    var addParams = function(url,params) {
      return url + (url.indexOf('?')>-1 ? '&' : '?') + qs.stringify(params);
    }
    if (typeof options == 'string' && typeof params == 'object') {
      var U = options = addParams(options,params);
    } else {
      if (options.params) {
        var U = options.url = addParams(options.url,options.params);
      } else {
        var U = options.url || options;
      }
      cb = params;
    }
    return request(options,function(error,response,body) {
      cb(error,response,body,U);
    });
  }
}
