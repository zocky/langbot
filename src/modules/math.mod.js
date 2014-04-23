var math = require('mathjs')();

exports.setup = function(bot) {
  bot.addCommand('c', {
    usage: '.c [expression]',
    help: 'mathjs calculator',
    args: /^(.+)$/,
    action: function(from,respond,text) {
      if (!text) return respond ('You gave me zero length input.');
      try {
        respond (math.eval(text));
      } catch (e) {
        respond (String(e));
      }
    }
  })
}
