exports.setup = function(bot) {
  var userJoin = function(nick) {
    if (nick==bot.client.nick) {
      console.log('joined '+bot.channel)
    } else {
      bot.presentUsers[nick] = true;
    }
  }
  var userPart = function(nick) {
    delete bot.presentUsers[nick];
  }
  var userRename = function(o,n) {
    bot.presentUsers[n] = bot.presentUsers[o];
    delete bot.presentUsers[o];
  }

  bot.presentUsers = {};
  bot.present = function(nick) {
    return !!bot.presentUsers[nick];
  },


  bot.client.addListener('join' + bot.channel, function (nick) {
    userJoin(nick);
  });

  bot.client.addListener('part' + bot.channel, userPart);
  bot.client.addListener('kick' + bot.channel, userPart);
  bot.client.addListener('quit', userPart);
  bot.client.addListener('nick', userRename);

  bot.client.addListener('names' , function (ch,names) {
    if (ch!=bot.channel) return;
    bot.presentUsers = {};
    Object.keys(names).forEach(userJoin);
  });
}


