exports.setup = function(bot) {
  bot.state.seen =  bot.state.seen || {};

  bot.on('talk',function (from, message) {
    if (Math.random()<0.25) {
      bot.say(from+', wtf?');
    }
  });
}
