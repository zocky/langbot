var lastUrl = [];

exports.setup = function(bot) {
  bot.listen(function(from,msg) {
    var m = msg.match(/\bhttps?:\/\/\S+/);
    if (m) lastUrl = lastUrl.concat(m).slice(-50);
  });
  
  bot.addCommand('title', {
    usage: '.title [url], .title',
    help: 'get title of [url], or title of last mentioned url',
    args: /^(https?:\/\/\S+)?$/,
    action: function(from,respond,url) {
      if (!url) {
        if (!lastUrl.length) return respond ('no url');
        url = lastUrl.pop();
      }
      bot.wget(url, function (error, response, body) {
        if (error) return respond('error: '+String(error));
        if(response.headers['content-type'].substr(0,9)!='text/html') return respond('content-type: '+response.headers['content-type'] + ' | '+url);
        
        
        var title = body.extract(/<title\s*>\s*(.*?)\s*<\/title\s*>/i,'$1').htmldecode() || 'could not find title';
        var description = (body
        .extract(/<meta .*?>/gi)
        .grep(/\b(meta|property)\s*=\s*"[^"]*description"/)
        .extract(/\bcontent\s*=\s*"([^"]+)"/,'$1')
        .shift() || '').htmlstrip();
        respond.printrow(title,description,url );
        respond.flush();
      });
    }
  })

  bot.addCommand('u', {
    usage: '.u [search terms]',
    help: 'lookup unicode table',
    args: /^(.+)$/,
    action: function(from,respond,text) {
      if (!text) return respond ('You gave me zero length input.');
      var re = /<a.*?>(.*?)<\/a>.*?<a.*?>U\+(.*?)<\/a><\/td>.*?<td>(.*?)<\/td>/;
      
      
      bot.wget('http://www.fileformat.info/info/unicode/char/search.htm?preview=none', {
        q:text,
      }, function(error,response,body,url) {
        if (error) return respond('error: '+ String(error));
        
        var res = body.clean()
        .extract(/<tr class="row[01]">(.*?)<\/tr>/g,'$1')
        .extract(/<a.*?>(.*?)<\/a>.*?<a.*?>U\+(.*?)<\/a><\/td>.*?<td>(.*?)<\/td>/,function($0,$1,$2,$3) {
          var code = 'U+'+$2;
          var name = $3.toLowerCase();
          var C = parseInt($2,16);
          var char = String.fromCodePoint(C);
          if (char == text) char = ''+char+'';
          var html = '&#'+C+';';
          return char + ' ('+code + ' '+html+' '+name + ') |';
        })
        .filter(Boolean)
        .unique();
        respond.flush(res.length ? res : 'not found');
      })
    }
  })

  
  bot.addCommand('urban', {
    usage: '.urban [search terms]',
    help: 'search urban dictionary',
    args: /^(.+)$/,
    action: function(from,respond,text) {
      if (!text) return respond ('You gave me zero length input.');
      bot.wget('http://www.urbandictionary.com/define.php', {
        term:text
      }, function(error,response,body,url) {
        if (error) return respond('error',String(error));
        
        var res = body.clean().split(/<div class='word'[^>]*>/)
        .extract(/^(.*?)<\/div>.*?<div class="definition">(.*?)<\/div>/i, '$1: $2')
        .filter(Boolean).map(function(n) {
          return String(n).htmlstrip();
        });
        respond.flushbr(res.length ? res : 'not found');
      });
    }
  })

  var imdb = function(from,respond,text,cb) {
    bot.wgetjson('http://www.imdbapi.org/', {
      q:text,
      limit:10
    }, function (error, response, obj,url) {
      if (error) return respond('error: '+String(error));
      if (!obj.length) return respond('nothing found '+url);
      var obj = obj.filter(Boolean);
      if (!obj.length) return respond('nothing found '+url);
      var hits = cb ? cb(obj) : obj;
      for (var i in hits) {
        var o = hits[i];
        var info = [];
        if (o.language) info.push(o.language.join(', '));
        if (o.runtime)  info.push(o.runtime[0]);
        info = info.join(', ');
        respond.printrow( (o.extra||'') + o.title + ' (' + o.year + ')' + ' | ' + info + ' | ' +o.rating, o.plot_simple || o.plot, o.imdb_url);
      }
      respond.flush();
    })
  }

  bot.addCommand('imdb', {
    usage: '.imdb [movie]',
    args: /^(.+)$/,
    help: 'Find a movie on imdb.com ...',
    action: function(from,respond,text) {
      imdb(from,respond,text);
    }
  });
  bot.addCommand('imdb', {
    usage: '.imdb [movie] [year]',
    help: '... from a particular year',
    args: /^(.*)(?!$) (\d\d\d\d)$/,
    action: function(from,respond,text,year) {
      imdb(from,respond,text, function(obj) {
        var hits = obj.filter(function(n) {return n.year == year});
        if (hits.length) return hits;
        obj[0].extra = '[nothing found in year '+year + '] ';
        return obj;
      })
    }
  });

  bot.addCommand('re', {
    usage: '.re /[regexp]/[opt] [string]',
    help: 'regexp match',
    args: /^\/((?:\\.|.|\[[^\[]*\]).+)\/([gim]{0,3}) (.+)$/,
    action: function(from,respond,re,opt,str) {
      try {
        var re = new RegExp(re,opt);
        respond(JSON.stringify(str.match(re)));
      } catch (e) {
        respond(e);
      }
    }
  });

  bot.addCommand('twit', {
    usage: '.twit [search terms]',
    help: 'show the latest tweet',
    args: /^(.+)$/,
    action: function(from,respond,text) {
      bot.wget('http://twitter.com/search/realtime', {
        q:text
      }, function (error, response, body,url) {
        if (error) return respond('error: '+String(error));
        var res = body.clean()
        .extract(/<div class="tweet\b[^>]*>(.*?)<\/strong>(.*?)<\/b>(.*?)<\/small>(.*?)<div class="stream-item-footer">/g,'$3 ago | $2 ($1): $4 ')
        .filter(Boolean).map(function(n) {
          return n.htmlstrip().replace(/\( /,'(');
        })
        respond.flushbr(res.length ? res : 'not found');
      });
    }
  });
};
