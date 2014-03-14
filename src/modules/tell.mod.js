
exports.setup = function(bot) {
  bot.state.tell =  bot.state.tell || {};

  bot.listen(function (from, message) {
    var n = from.toLowerCase();
    if (bot.state.tell[n] && bot.state.tell[n].length) {
      bot.state.tell[n].forEach(function(n) {
        bot.say(n);
      })
      bot.state.tell[n]=[];
      bot.save();
    }
  });
  
  bot.addCommand('tell', {
    usage: '.tell [nick] [message]',
    help: 'Leave a message for a user',
    args: /^([a-zA-Z_\\\[\]{}\^`\|][a-zA-Z0-9_\-\\\[\]{}\^`\|]{0,20}) (.+)$/,
    action: function(from,respond,nick,msg) {
      if (!nick) return respond ('tell whom?');
      var n = nick.toLowerCase();
      if (n == bot.client.nick.toLowerCase()) return respond ('I hear you.');
      if (n == from.toLowerCase()) return respond ('tell yourself yourself.');
      if (bot.state.seen && !bot.state.seen[n]) return respond ("I don't know " +nick + '.');
      
      bot.state.tell[n] = bot.state.tell[n] || [];
      bot.state.tell[n].push('<'+from+'> tell ' + nick + ' ' + msg.clean());
      bot.save();
      return respond('I will pass that on when '+nick+' is around.');
    }
  })
}
