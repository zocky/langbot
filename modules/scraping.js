var lastUrl = [];

exports.setup = function(bot) {
  bot.listen(function(from,msg) {
    var m = msg.match(/\bhttps?:\/\/\S+/);
    if (m) lastUrl = lastUrl.concat(m).slice(-50);
  });
  
  bot.addCommand('title', {
    usage: '.title, .title url',
    help: 'get title of url',
    action: function(from,respond,text,url) {
      if (!url) {
        if (!lastUrl.length) return respond ('no url');
        url = lastUrl.pop();
      }
      bot.wget(url, function (error, response, body) {
        if (error) return respond('error: '+String(error));
        if(response.headers['content-type'].substr(0,9)!='text/html') return respond('content-type: '+response.headers['content-type']);
        var m = body.match(/<title\s*>\s*(.*?)\s*<\/title\s*>/i);
        if(!m) return respond('could not find title at '+ url);
        return respond(m[1].trim() + ' -- ' + url );
      });
    }
  })

  bot.addCommand('wik', {
    usage: '.wik search_terms',
    help: 'get a definition from wikipedia',
    action: function(from,respond,text) {
      bot.wget('http://en.wikipedia.org/w/api.php?action=query&generator=search&prop=extracts|info&inprop=url&exchars=300|&gsrlimit=1&format=json',{
        gsrsearch:text,
      }, function(error,response,body) {
        if (error) return respond('error: '+ String(error));
        try {
          var obj = JSON.parse(body);
        } catch (e) {
          return respond('error: ' + String(e));
        }
        var id = Object.keys(obj.query.pages)[0];
        var str = obj.query.pages[id].extract.replace(/<.*?>/g,' ').replace(/\s+/g,' ');
        respond(str + ' ' + obj.query.pages[id].fullurl);
      });
    }
  })
  
  bot.addCommand('ety', {
    usage: '.ety search_terms',
    help: 'search etymology online',
    action: function(from,respond,text) {
      bot.wget('http://www.etymonline.com/index.php', {
        term:text
      }, function(error,response,body,url) {
        if (error) return respond('error',String(error));
        var m = body.match(/<div id="dictionary">[\s\S]*?(<dt[\s\S]+?<\/dd>)/im);
        if (!m) return respond('not found '+url);
        respond(m[1].replace(/<.*?>/g,' ').replace(/\s+/g,' ').trim().substr(0,300) + ' '+ url);
      });
    }
  })
};
