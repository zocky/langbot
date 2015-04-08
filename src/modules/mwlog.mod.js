var moment = require('moment');

exports.setup = function(bot) {
  bot.state.seen =  bot.state.seen || {};

  bot.listen(function (from, message) {
    bot.state.seen[from.toLowerCase()]=Date.now();
    bot.save();
  });
  
  bot.addCommand('seen', {
    usage: '.seen [nick]',
    help: 'Check when the user last spoke in the channel',
    action: function(from,respond,text,nick) {
      if (!nick) return respond('seen whoom?');
      var n = nick.toLowerCase();
      if (n == bot.client.nick.toLowerCase()) return respond ("I'm right here.");
      if (n == from.toLowerCase()) return respond ("check a mirror.");
      if (!bot.state.seen[n]) return respond ("I've never seen "+nick+'.');
      return respond (nick+' last spoke '+moment(bot.state.seen[n]).fromNow());
    }
  })
}
