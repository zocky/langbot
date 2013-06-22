var data = require('./arabizi.data.js');

exports.setup = function(bot) {

  bot.addCommand('arabizi', {
    usage: '.arabizi [text]',
    help: 'Convert Arabizi text',
    args: /(.+)$/,
    action: function(from,respond,text) {
      arabic2arabizi(from,respond,text)
    }
  })

  function arabic2arabizi(from,respond,text) {
    var newtext = [];
    for(i=0; i<text.length; i++) {
	newtext[i] = data.toarabizi[text[i]] || text[i];
    }
    respond.print(newtext.join(''));
    respond.flush();
  };

}
