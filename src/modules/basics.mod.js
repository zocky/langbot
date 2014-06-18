var cp = require('child_process');
var moment = require('moment');
exports.setup = function(bot) {
  bot.addCommand('help', {
    usage: '.help, .help [command]',
    help: "HELP! I need somebody",
    action: function(from,respond,text,cmd) {
      if (!cmd) return respond.flush(
          'I know ' + Object.keys(bot.commands).join(', ')
        );
      if (!bot.commands[cmd]) return respond ('unknown command '+cmd +', try .help');
      respond.flush(bot.usage(cmd));
    }
  })

  bot.addCommand('about', {
    usage: '.about',
    help: "what about .about?",
    action: function(from,respond,text,cmd) {
      var uptime = moment(Date.now() - process.uptime()*1000).fromNow(true);
      respond.print("I'm a wcbot for " + bot.config.channel,' running for '+uptime+' |');
      respond.print(bot.config.master ? 'My master is '+bot.config.master + '.': 'I have no master.', "|");
      respond.print("If you kick me, I won't come back unless you /invite me.",'|');
      respond.flush();
    }
  })
  
  bot.addCommand('more', {
    usage: '.more',
    help: "show more results from your last search",
    action: function(from,respond) {
      bot.pending[from] = bot._pending[from].concat();
      bot.flush(from,respond);
    }
  })
}

