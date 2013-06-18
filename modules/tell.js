
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
    args: /^([a-zA-Z_\\\[\]{}\^`\|][a-zA-Z0-9_\-\\\[\]{}\^`\|]{0,20}) (.+)$/,
    action: function(from,respond,nick,msg) {
      if (nick == bot.client.nick) return respond ('I hear you.');
      if (nick == from) return respond ('tell yourself yourself.');
      if (bot.state.seen && !bot.state.seen[nick]) return respond ("I don't know " +nick + '.');
      
      bot.state.tell[nick] = bot.state.tell[nick] || [];
      bot.state.tell[nick].push('<'+from+'> tell ' + nick + ' ' + msg.clean());
      bot.save();
      return respond('I will pass that on when '+nick+' is around.');
    }
  })
}
