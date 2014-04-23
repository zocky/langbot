var lastUrl = [];

exports.setup = function(bot) {


  var googleLangs = 
    '(af|ar|az|be|bg|bn|bs|ca|ceb|cs|cy|da|de|el|en|eo|es|et|eu|fa|fi|fil|fr|ga|gl|guj|he|hi|hmn|hr|ht|hu|hy|id|is|it|ja|'
  + 'jv|ka|kan|khm|ko|la|lao|lt|lv|mar|mk|ms|mt|nb|nl|pl|pt|ro|ru|sk|sl|sq|sr|sv|sw|tam|tel|tha|tr|uk|ur|vi|yi|zh|'
  + 'zh-CN|zh-TW)';

/*
    '(af|ach|ak|am|ar|az|be|bem|bg|bh|bn|br|bs|ca|chr|ckb|co|crs|cs|cy|da|de|ee|el|en|eo|es-419|es|et|eu|fa|fi|fo|fr|fy|ga|gaa|'
  + 'gd|gl|gn|gu|ha|haw|hi|hr|ht|hu|hy|ia|id|ig|is|it|iw|ja|jw|ka|kg|kk|km|kn|ko|kri|ku|ky|la|lg|ln|lo|loz|lt|lua|lv|mfe|mg|mi|'
  + 'mk|ml|mn|mo|mr|ms|mt|ne|nl|nn|no|nso|ny|nyn|oc|om|or|pa|pcm|pl|ps|pt-BR|pt-PT|qu|rm|rn|ro|ru|rw|sd|sh|si|sk|sl|sn|so|sq|sr|'
  + 'sr-ME|st|su|sv|sw|ta|te|tg|th|ti|tk|tl|tn|to|tr|tt|tum|tw|ug|uk|ur|uz|vi|wo|xh|xx-bork|xx-elmer|xx-hacker|xx-klingon|'
  + 'xx-pirate|yi|yo|zh-CN|zh-TW|zu)';
*/

  bot.addCommand('tr', {
    usage: '.tr [source]:[target] [text to translate]',
    help: 'google translate',
    args: new RegExp('^(?:'+googleLangs + '?:'+googleLangs + '?\\s+)?(.*)$'),
    action: function(from,respond,sl,tl,text) {
      if (text=='?') return respond(googleLangs);
      sl = sl || 'auto';
      tl = tl || 'en';
      bot.wget('http://translate.google.com/translate_a/t?client=p&hl=en&otf=1&ssel=0&tsel=0&uptl=en&sc=1&oe=utf-8&ie=utf-8', {
        text:text,
        sl:sl,
        tl:tl,
      }, function(error,response,body,url) {
        if (error) return respond('error: '+ String(error));
        //body = body.replace(/,(?=,)/g,',null')
        try { var obj = JSON.parse(body); } catch (e) {return respond('error: ' + String(e)); }
        var trans = obj.sentences && obj.sentences[0] && obj.sentences[0].trans;
        if (!trans) respond('nothing found');
//        if (sl=='auto') sl = body.clean().extract(/"([^"]*)"/g,'$1').pop();
        return respond('['+sl +':'+tl+ '] ' + trans) + ' | ' +url;
      });
    }
  })

  bot.addCommand('g', {
    usage: '.g [search terms]',
    help: 'search google',
    args: /^(.+)$/,
    action: function(from,respond,text) {
      bot.wget('http://ajax.googleapis.com/ajax/services/search/web', {
        v: '1.0',
        safe: 'off',
        q: text
      }, function(error,response,body,url) {
        if (error) return respond('error: '+ String(error));
        try { var obj = JSON.parse(body); } catch (e) {return respond('error: ' + String(e)); }
        var data = undot(obj,'responseData.results');
        if (!data || !data.length) return respond('nothing found '+url );
        data.forEach(function(n) {
          respond.print(n.unescapedUrl + ' | ' + n.titleNoFormatting.htmlstrip() + ' | ' + n.content.htmlstrip(),'<br>');
        });
        respond.flush();
      });
    }
  })

  bot.addCommand('rae', {
    usage: '.rae [word]',
    help: 'search Real Academia Española dictionary. SLOOOOOOW.',
    args: /^(.+)$/,
    action: function(from,respond,text) {
      bot.wget('http://lema.rae.es/drae/srv/search', {
        val:text
      }, function (error, response, body,url) {
        if (error) return respond('error: '+String(error));
        var def = body.htmlfind('div').join(' ').htmlstrip();
        if (def) return respond(def);
        return respond ('homonymia, see '+url);
      });
    }
  })
};
