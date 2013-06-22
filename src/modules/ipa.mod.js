var data = require('./ipa.data.js');

exports.setup = function(bot) {

  bot.addCommand('xsampa', {
    usage: '.xsampa [text]',
    help: 'Convert IPA to X-SAMPA',
    args: /(.+)$/,
    action: function(from,respond,text) {
      ipa2xsampa(from,respond,text)
    }
  })

  function ipa2xsampa(from,respond,text) {
    var newtext = [];
    for(i=0; i<text.length; i++) {
	newtext[i] = data.ipa2xsampa[text[i]] || text[i];
    }
    respond.print(newtext.join(''));
    respond.flush();
  };

}
