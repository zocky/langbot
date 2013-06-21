exports.setup = function(bot) {
  bot.addCommand('ety', {
    usage: '.ety [search terms]',
    help: 'search etymology online',
    args: /^(.+)$/,
    action: function(from,respond,text) {
      if (!text) return respond ('You gave me zero length input.');
      bot.wget('http://www.etymonline.com/index.php', {
        term:text
      }, function(error,response,body,url) {
        if (error) return respond('error',String(error));
        var res = body.clean().extract(/<dt[^>]*>.*?<\/dd>/gi,'$&')
        .filter(Boolean);
        if (!res.length) return respond('not found');;
        res.forEach(function(n) {
          respond.printrow('', String(n).htmlstrip(),url);
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
}
