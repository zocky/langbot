var cp = require('child_process');
var moment = require('moment');
exports.setup = function(bot) {
  bot.addCommand('help', {
    usage: '.help, .help [command]',
    help: "dumbfuck: n. somebody who can't figure out what .help does",
    action: function(from,respond,text,cmd) {
      if (!cmd) return respond.flush(
          Object.keys(bot.commands)
          .join(', '),
          '<br>','type .help help for more help with help',
          '<br>','you are beyond help',
          '<br>','please desist',
          '<br>','I\'d rather be sailing',
          '<br>',' /ignore'
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
      respond.print("I'm a langbot bot for " + bot.config.channel,' running for '+uptime+' |');
      respond.print(bot.config.master ? 'My master is '+bot.config.master + '.': 'I have no master.', "|");
      respond.print("If you kick me, I won't come back unless you /invite me.",'|');
      respond.print("Source, docs, bug reports and feature requests at: https://github.com/zocky/langbot");
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
  
  bot.addCommand('grep', {
    usage: '.grep [search terms]',
    help: "show more results from your last search",
    args: /^(.+)$/,
    action: function(from,respond,text) {
      var words = text.toLowerCase().split(/ /);
      var cur = bot._pending[from].concat();
      cur = cur.filter(function(m) {
        if ( m == '<br>' || m== '<nobr>') return true;
        return words.every(function(n){ return m.toLowerCase().indexOf(n) >= 0; });
      })
      bot.pending[from] = cur;
      bot.flush(from,respond);
    }
  })
  
  cp.exec("git show-branch ; echo '|'; git log --pretty=format:'%cD (%cr)' -n 1", function(err,stderr,stdout) {
    if (err) bot.version = 'unknown';
    bot.version = stderr.clean();
  })
  
  bot.addCommand('version', {
    usage: '.version',
    help: "show the version of the bot",
    action: function(from,respond) {
      respond(bot.version + ' | modules: ' + Object.keys(bot.loadedModules).join(', '));
    }
  })
}

