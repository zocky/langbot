var userMemos = {};

exports.setup = function(bot) {
  bot.listen(function (from, message) {
    if (userMemos[from] && userMemos[from].length) {
      userMemos[from].forEach(function(n) {
        bot.say(n);
      })
      userMemos[from]=[];
    }
  });
  
  bot.addCommand('tell', {
    usage: '.tell [nick] [message]',
    help: 'Leave a message for a user',
    action: function(from,respond,text,nick) {
      if (!nick) return;
      if (nick == bot.client.nick) return respond ('I hear you.');
      if (nick == from) return respond ('tell yourself yourself.');
    
      userMemos[nick] = userMemos[nick] || [];
      userMemos[nick].push('<'+from+'> ' + text);
      return respond('I will pass it on when '+nick+' is around.');
    }
  })
}
