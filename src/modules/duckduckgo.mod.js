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
      if (!obj.Type) return respond('nothing found');
      var t = '';
      var u = '';

      if (obj.Type == 'D') t = obj.Definition, u = obj.DefinitionURL;
      else t = obj.AbstractText, u = obj.AbstractURL;
      respond.printrow('',t,u);

      obj.RelatedTopics && obj.RelatedTopics.forEach(function(n) {
        n.Topics
        ? n.Topics.forEach(function(m) {
            respond.printrow(n.Name, m.Text , m.FirstURL);
          })
        : respond.printrow('', n.Text , n.FirstURL);
      })
      respond.flush();
    });
  };

}
