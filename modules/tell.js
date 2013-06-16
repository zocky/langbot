
exports.setup = function(bot) {
  bot.state.tell =  bot.state.tell || {};

  bot.listen(function (from, message) {
    if (bot.state.tell[from] && bot.state.tell[from].length) {
      bot.state.tell[from].forEach(function(n) {
        bot.say(n);
      })
      bot.state.tell[from]=[];
      bot.save();
    }
  });
  
  bot.addCommand('tell', {
    usage: '.tell [nick] [message]',
    help: 'Leave a message for a user',
    action: function(from,respond,text,nick) {
      if (!nick) return;
      if (nick == bot.client.nick) return respond ('I hear you.');
      if (nick == from) return respond ('tell yourself yourself.');
    
      bot.state.tell[nick] = bot.state.tell[nick] || [];
      bot.state.tell[nick].push('<'+from+'> ' + text.replace(/\s/,': '));
      bot.save();
      return respond('I will pass that on when '+nick+' is around.');
    }
  })
}
