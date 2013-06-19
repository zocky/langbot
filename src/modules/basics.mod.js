
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
      respond.flush(bot.commands[cmd].usage + ' | ' + bot.commands[cmd].help,'<br>','for more help, see a psychiatrist');
    }
  })

  bot.addCommand('about', {
    usage: '.about',
    help: "what about .about?",
    action: function(from,respond,text,cmd) {
      respond.print("I'm a langbot bot for " + bot.config.channel,'|');
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
}

