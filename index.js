var irc = require('irc');
var request = require('request');
var qs = require('querystring');

var bot = {
  client: null,
  nick: 'langbot',
  channel: '#zocky',
  master: 'zocky',
  host: 'irc.freenode.net',
  pass: '',
  report: function(a1,a2) {
    console.log(a1+':',a2);
    if (this.present(this.master)) this.say(this.master,a1+': '+a2);
  },
  init: function() {
    var me = this;
    var client = me.client = new irc.Client(me.host, me.nick, {
        channels: [me.channel],
    //    autoRejoin: true,
        autoConnect: true,
        floodProtection: true,
        floodProtectionDelay: 150,
    });

    client.addListener('registered' , function (ch,names) {
//      if (me.pass) me.client.say('NickServ','IDENTIFY '+me.pass);
    });
    
    client.addListener('error', me.report.bind(this,'error'));
    client.addListener('registered', me.report.bind(this,'registered'));
    client.addListener('notice', function(from, to, text,message) {
      me.report('notice','<'+from+'> '+text);
    });

    client.addListener('invite', function (ch) {
      if (ch == me.channel) client.join(me.channel);
    });

    me.client.addListener('message'+me.channel,function (from, message) {
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
            me.say(me.channel,from+': '+reply);
          });
        }
      } else {
        for (var i in me.listeners) me.listeners[i](from,message);
      }
    });
    bot.client.addListener('pm', function (from, message) {
      if (!me.present(from)) return me.say(from,"Join "+channel+" and then we'll talk.");
      me.doMessage(from,message,function(reply) {
        me.say(from,reply);
      });
    });
  },
  say: function(a1,a2) {
    if (arguments.length == 1) {
      this.client.say(this.channel,a1);
    } else if (arguments.length == 2) {
      this.client.say(a1,a2);
    }
  },
  listeners: [],
  listen: function(fn) {
    this.listeners.push(fn);
  },
  doMessage: function(from,msg,respond) {
    var m = msg.match(/^(\w+)(.*)$/);
    if (!m) return;
    var cmd = m[1];
    if (!this.commands[cmd]) return;
    var text = m[2].trim();
    var args = text.split(/\s+/);
    args.unshift(text);
    args.unshift(respond);
    args.unshift(from);
    this.commands[cmd].action.apply(this,args);
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
require('./modules/restart.js').setup(bot);
require('./modules/tell.js').setup(bot);
require('./modules/scraping.js').setup(bot);

bot.addCommand('help', {
  usage: 'help, help [command]',
  help: 'displays a list of commands, or help for a specific command',
  action: function(from,respond,text,cmd) {
    if (!cmd) return respond(
      Object.keys(bot.commands)
      .join(', ')
    );
    if (!bot.commands[cmd]) return respond ('unknown command '+cmd +', try .help');
    return respond ( bot.commands[cmd].usage + ' | ' + bot.commands[cmd].help);
  }
})

/*
  present users
*/


