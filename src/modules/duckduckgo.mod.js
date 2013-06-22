exports.setup = function(bot) {

  bot.addCommand('d', {
    usage: '.d [search terms]',
    help: 'DuckDuckGo Instant Search ...',
    args: /(.+)$/,
    action: function(from,respond,text) {
      duckduckgo(from,respond,text)
    }
  })

  function duckduckgo(from,respond,text) {
    bot.wgetjson('http://api.duckduckgo.com/?format=json&no_redirect=1&no_html=1', {
      q:text,
    }, function(error,response,obj) {
      if (error) return respond('error: '+ String(error));
      if (!obj.AbstractText) return respond('nothing found');
        var at = obj.AbstractText;
        var au = obj.AbstractURL;
        respond.printrow('',at,au);
      respond.flush();
    });
  };

}
