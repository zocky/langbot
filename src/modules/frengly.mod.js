exports.setup = function(bot,opt) {

  var googleLangs = 
    '(af|ar|az|be|bg|bn|bs|ca|ceb|cs|cy|da|de|el|en|eo|es|et|eu|fa|fi|fil|fr|ga|gl|guj|he|hi|hmn|hr|ht|hu|hy|id|is|it|ja|'
  + 'jv|ka|kan|khm|ko|la|lao|lt|lv|mar|mk|ms|mt|nb|nl|pl|pt|ro|ru|sk|sl|sq|sr|sv|sw|tam|tel|tha|tr|uk|ur|vi|yi|zh|'
  + 'zh-CN|zh-TW)';

  bot.addCommand('tr', {
    usage: '.tr [source]:[target] [text to translate]',
    help: 'frengly translate',
    args: new RegExp('^(?:'+googleLangs + '?:'+googleLangs + '?\\s+)?(.*)$'),
    action: function(from,respond,sl,tl,text) {
      if (text=='?') return respond(googleLangs);
      if (!opt.email || !opt.password) return respond('Error: Incorrect frengly configuration.');
      sl = sl || 'auto';
      tl = tl || 'en';
      bot.wget('http://frengly.com', {
        text:text,
        src:sl,
        dest:tl,
        email: opt.email,
        password: opt.password,
        outformat: "json"
      }, function(error,response,body,url) {
        if (error) return respond('error: '+ String(error));
        //body = body.replace(/,(?=,)/g,',null')
        console.log(body);
        try { var obj = JSON.parse(body); } catch (e) {return respond('error: ' + String(e)); }
        return respond('['+obj.src +':'+obj.dest+ '] ' + obj.translation);
      });
    }
  })
  
}
