var moment = require('moment');

exports.setup = function(bot) {
  bot.state.seen =  bot.state.seen || {};

  bot.listen(function (from, message) {
    bot.state.seen[from]=Date.now();
    bot.save();
  });
  
  bot.addCommand('seen', {
    usage: '.seen [nick]',
    help: 'Check when the user last spoke in the channel',
    action: function(from,respond,text,nick) {
      if (!nick) return;
      if (nick == bot.client.nick) return respond ("I'm right here.");
      if (nick == from) return respond ("check a mirror.");
      if (!bot.state.seen[nick]) return respond ("I've never seen "+nick+'.');
      return respond (nick+' last spoke '+moment(bot.state.seen[nick]).fromNow());
    }
  })
}
