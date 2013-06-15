var bot = {
  client: null,
  nick: 'langbot',
  channel: '#zocky',
  master = 'zocky',
  pass = '',
  report: function(a1,a2) {
    console.log(a1+':',a2);
    if (userPresent(this.master)) client.say(this.master,a1+': '+a2);
  },
  init: function() {
    var me = this;
    var irc = require('irc');
    var client = me.client = new irc.client('irc.freenode.net', 'langbot', {
        channels: [me.channel],
    //    autoRejoin: true,
        autoConnect: true,
        floodProtection: true,
        floodProtectionDelay: 150,
    });

    client.addListener('error', me.report.bind(this,'error');
    client.addListener('registered', me.report.bind(this,'registered');
    client.addListener('notice', me.report.bind(this,'notice');

    client.addListener('invite', function (ch) {
      if (ch == me.channel) client.join(me.channel);
    });

    me.listen(function (from, message) {
      var re = new RegExp('^('+ me.client.nick + '[,:>]\s*|[.])(.*)$','i');
      var m = message.match(re);
      
      if (!m) return;
      me.doMessage(from,m[2],function(reply) {
        me.say(channel,from+': '+reply);
      });
    });
    bot.client.addListener('pm', function (from, message) {
      if (!userPresent(from)) {
        this.say(from,"Join "+channel+" and then we'll talk.");
        return;
      }
      me.doMessage(from,message,function(reply) {
        bot.client.say(from,reply);
      });
    });
  },
  say: function(a1,a2) {
    if (arguments.length == 1) {
      this.client.say(this.channel,a1);
    } else if (arguments.length == 2) {
      this.client.say(a1,a2);
    }
  }
  listen: function(fn) {
    this.client.addListener('message'+this.channel,fn);
  },
  doMessage: function(from,msg,respond) {
    var m = msg.match(/^(\w+)(.*)$/);
    if (!m) return;
    var cmd = m[0];
    if (!this.commands[cmd]) return;
    var text = m[1].trim();
    var args = text.split(/\s+/);
    args.shift(text);
    args.shift(respond);
    args.shift(from);
    this.commands[cmd].action.apply(this,args);
  },
  commands: {},
  addCommand: function (name,opt) {
    this.commands[name] = opt;
  }
}

require('./modules/tell.js').setup(bot);






/*
  present users
*/

var presentUsers = {};
var userPresent = function(nick) {
  return !!presentUsers[nick];
}
var userJoin = function(nick) {
  if (nick==bot.client.nick) {
    console.log('joined '+channel)
  } else {
    presentUsers[nick] = true;
  }
}
var userPart = function(nick) {
  delete presentUsers[nick];
}
var userRename = function(o,n) {
  presentUsers[n] = presentUsers[o];
  delete presentUsers[o];
}

bot.client.addListener('join' + channel, function (nick) {
  userJoin(nick);
});

bot.client.addListener('part' + channel, userPart);
bot.client.addListener('kick' + channel, userPart);
bot.client.addListener('quit', userPart);
bot.client.addListener('nick', userRename);

bot.client.addListener('names' , function (ch,names) {
  if (ch!=channel) return;
  console.log('names for '+ch);
  presentUsers = {};
  Object.keys(names).forEach(userJoin);
  bot.client.say('NickServ','IDENTIFY '+pass);
});

/*
  R E S T A R T
*/

var restartTimer = null;
var childProcess = require('child_process');
process.on('SIGINT', function () {
  console.log('disconnecting');
  bot.client.disconnect('deadness ensues', function() {
    setTimeout(function() {
      console.log('disconnected, shutting down');
      process.exit(); 
    },3000);
  });
});

if(process.argv[2] != 'test') process.on('uncaughtException', function(err) {
  console.dir(err);
  console.log(err.stack);
  if (userPresent(master)) bot.client.say(master,err);
});

function restartBot() {
  bot.client.disconnect('brb, restarting', function() {
    setTimeout(function() {
      console.log('disconnected, restarting');
      var child = childProcess.spawn('node', ['./index.js'], {
       detached: true,
       stdio: 'inherit'
      });
      child.unref();
      process.exit(); 
    },3000);
  });
}

setInterval(function(){
  bot.client.send('ping',channel);
}, 10 * 60 * 1000);

function setRestartTimer() {
  clearTimeout(restartTimer);
  restartTimer = setTimeout(restartBot,15*60*1000);
}

bot.client.addListener('raw' + channel, function (nick) {
  setRestartTimer();
});


