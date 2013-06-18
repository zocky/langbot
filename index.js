require('./lib/utils.js');
var fs = require('fs');
var irc = require('irc');
var request = require('request');
var qs = require('querystring');
var entities = new (require('html-entities').AllHtmlEntities);

var bot = {
  client: null,
  config: {
    host: 'irc.freenode.net',
    nick: 'langbot',
    channel: 'langbot',
    master: undefined,
    pass: undefined
  },
  report: function(a1,a2) {
    console.log(this.config.master,a1+':',a2);
    if (this.config.master && this.present(this.config.master)) this.say(this.config.master,a1+': '+a2);
  },
  save: function() {
    fs.writeFile('./var/botstate.json',JSON.stringify(this.state,null,2));
  },
  load: function() {
    try {
      var str = fs.readFileSync('./var/botstate.json');
      this.state = JSON.parse(str);
    } catch(e) {
      this.state = {};
    }
    try {
      var str = fs.readFileSync('./etc/config.json');
      var cfg = JSON.parse(str);
      for (var i in cfg) this.config[i] = cfg[i];
    } catch(e) {
    }
      console.log(this.config);
  },
  init: function() {
    var me = this;
    me.load();
    
    var client = me.client = new irc.Client(me.config.host, me.config.nick, {
        channels: [me.config.channel],
    //    autoRejoin: true,
        userName: 'langbot',
        autoConnect: true,
        floodProtection: true,
        floodProtectionDelay: 150,
    });

    client.addListener('registered' , function (ch,names) {
      if (me.config.pass) me.client.say('NickServ','IDENTIFY '+me.config.pass);
    });
    
    client.addListener('error', me.report.bind(this,'error'));
    client.addListener('registered', me.report.bind(this,'registered'));
    client.addListener('notice', function(from, to, text,message) {
      me.report('notice','<'+from+'> '+text);
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
            console.log('respond',reply);
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
    bot.client.addListener('pm', function (from, message) {
      if (!me.present(from)) return me.say(from,"Join "+bot.config.channel+" and then we'll talk.");
      me.doMessage(from,message,function(reply) {
        me.say(from,reply);
      });
    });
  },
  dehtml: function(str) {
    return entities.decode(str);
  },
  say: function(a1,a2) {
    if (arguments.length == 1) {
      this.client.say(this.config.channel,a1);
      console.log('say',a1);
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
    text = String(text).clean().shorten(440);
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
    for (var i = 1; i < arguments.length; i++) this._print(nick,arguments[i]);
  },
  clear: function(nick) {
    this.pending[nick] = [];
  },
  more: function(nick, respond) {
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
      if (out.join(' ').length + pending[0].length + 1 > 450) break;
      out.push(pending.shift());
    }
    var text = out.join(' ');
    while(pending[pending.length-1] == '<nobr>') pending.pop();
    if (pending.length) {
      text+=' ... [.more]';
      pending[0] = '... ' + pending[0];
      console.log(this.pending[nick]);
    }
    respond(text);    
  },
  doMessage: function(from,msg,respond) {
    var m = msg.match(/^(\w+)(.*)$/);
    if (!m) return;
    var cmd = this.commands[m[1]];
    if (!cmd) return;
    if (cmd.args instanceof RegExp) {
//      console.log(cmd.args);
      var m = msg.replace(/^\S*\s*/,'').match(cmd.args);
      if (!m) return respond ('bad args: '+msg);
      var args = Array.prototype.slice.call(m,1);
//      console.log('re',args);
    } else {
      var text = m[2].trim();
      var args = text.split(/\s+/);
      args.unshift(text);
//      console.log('nore',args);
    }
    var me = this;
    var pending = me.pending[from];
    respond.print = me.print.bind(me,from);
    respond.flush = me.more.bind(me,from,respond);
    
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
bot.init();
require('./modules/present.js').setup(bot);
require('./modules/tell.js').setup(bot);
require('./modules/seen.js').setup(bot);
require('./modules/scraping.js').setup(bot);
require('./modules/w.js').setup(bot);


bot.addCommand('help', {
  usage: 'help, help [command]',
  help: "dumbfuck: n. somebody who can't figure out what .help does",
  action: function(from,respond,text,cmd) {
    if (!cmd) return respond(
      Object.keys(bot.commands)
      .join(', ')
    );
    if (!bot.commands[cmd]) return respond ('unknown command '+cmd +', try .help');
    return respond ( bot.commands[cmd].usage + ' | ' + bot.commands[cmd].help);
  }
})

bot.addCommand('more', {
  usage: '.more',
  help: "show more results from your last search",
  action: function(from,respond) {
    bot.pending[from] = bot._pending[from].concat();
    bot.more(from,respond);
  }
})


require('./modules/restart.js').setup(bot);

