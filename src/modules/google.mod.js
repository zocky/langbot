var lastUrl = [];

exports.setup = function(bot) {

/*
    '(af|ach|ak|am|ar|az|be|bem|bg|bh|bn|br|bs|ca|chr|ckb|co|crs|cs|cy|da|de|ee|el|en|eo|es-419|es|et|eu|fa|fi|fo|fr|fy|ga|gaa|'
  + 'gd|gl|gn|gu|ha|haw|hi|hr|ht|hu|hy|ia|id|ig|is|it|iw|ja|jw|ka|kg|kk|km|kn|ko|kri|ku|ky|la|lg|ln|lo|loz|lt|lua|lv|mfe|mg|mi|'
  + 'mk|ml|mn|mo|mr|ms|mt|ne|nl|nn|no|nso|ny|nyn|oc|om|or|pa|pcm|pl|ps|pt-BR|pt-PT|qu|rm|rn|ro|ru|rw|sd|sh|si|sk|sl|sn|so|sq|sr|'
  + 'sr-ME|st|su|sv|sw|ta|te|tg|th|ti|tk|tl|tn|to|tr|tt|tum|tw|ug|uk|ur|uz|vi|wo|xh|xx-bork|xx-elmer|xx-hacker|xx-klingon|'
  + 'xx-pirate|yi|yo|zh-CN|zh-TW|zu)';
*/

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
