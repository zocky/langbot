var math = require('mathjs');

exports.setup = function(bot) {
  bot.addCommand('c', {
    usage: '.c [expression]',
    help: 'mathjs calculator',
    args: /^(.+)$/,
    action: function(from,respond,text) {
      if (!text) return respond ('You gave me zero length input.');
      try {
        respond (math.format(math.eval(text), {precision: 14}));
      } catch (e) {
        respond (String(e));
      }
    }
  })
}
