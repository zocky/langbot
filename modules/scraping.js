

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
        return respond(title + ' | ' + url );
      });
    }
  })

  bot.addCommand('wik', {
    usage: '.wik [search terms]',
    help: 'get a definition from wikipedia',
    args: /^(.+)$/,
    action: function(from,respond,text) {
      var searchlang='en';
      var searchterms='';
      var m = text.match(/^:([a-z][a-z][a-z]?)\s(.*)$/);
      if(m) searchlang=m[1], searchterms=m[2];
      else searchterms=text;
      bot.wget('http://'+searchlang+'.wikipedia.org/w/api.php?action=query&generator=search&prop=extracts|info&inprop=url&exchars=500&format=json',{
        exlimit: 'max',
        exintro: '1',
        gsrsearch:searchterms,
      }, function(error,response,body) {
        if (error) return respond('error: '+ String(error));
        try { var obj = JSON.parse(body); } catch (e) { return respond('error: ' + String(e)); }
        if (!obj.query || !obj.query.pages) return respond('nothing found');
        for (var id in obj.query.pages) {
          var p = obj.query.pages[id];
          respond.print(p.extract.htmlstrip().shorten(450),'<br>');
        };
        respond.flush();
      });
    }
  })
  
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
        .filter(Boolean).map(function(n) {
          return String(n).htmlstrip();
        });
        respond.flushbr(res.length ? res : 'not found');
      });
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
        
        var res = body.clean().split(/<td class='word'[^>]*>/)
        .extract(/^(.*?)<\/td>.*?<div class="definition">(.*?)<\/div>/i, '$1: $2')
        .filter(Boolean).map(function(n) {
          return String(n).htmlstrip();
        });
        respond.flushbr(res.length ? res : 'not found');
      });
    }
  })

  bot.addCommand('c', {
    usage: '.c [expression]',
    help: 'google calculator',
    args: /^(.+)$/,
    action: function(from,respond,text) {
      if (!text) return respond ('You gave me zero length input.');
      bot.wget('http://www.google.com/ig/calculator?ie=utf-8&oe-utf-8', {
        q:text
      }, function(error,response,body,url) {
        if (error) return respond('error: ' +String(error));
        var m = body.match(/".*?"/g);
        if (!m) return respond("error");
        m = m.map(function(n) { return JSON.parse(n); });
        if (m[2]) return respond('error: ' + m[2] + ' -- ' +url);
        return respond(m[1].replace(/<sup>/g,'^(').replace(/<\/sup>/g,')'));
      });
    }
  })

  bot.addCommand('where', {
    usage: '.where [search terms]',
    help: 'lookup geonames database',
    args: /^(.+)$/,
    action: function(from,respond,text) {
      bot.wget('http://ws.geonames.org/searchJSON', {
        q:text,
        maxRows:10,
      }, function(error,response,body,url) {
        if (error) return respond('error: '+ String(error));
        try { var obj = JSON.parse(body); } catch (e) {return respond('error: ' + String(e)); }
        var res = obj.geonames.map(function(n) {
          var desc =[n.name,n.adminName1,n.countryName,n.fcodeName,n.population && ('pop. '+n.population)].filter(Boolean).join(', ');
          var loc = Number(n.lat).toFixed(5)+','+Number(n.lng).toFixed(5);
          return (desc + ' | ' + 'http://maps.google.com/maps?ll='+loc+'&q=loc:'+loc+'&hl=en&t=h&z=9');
        })
        .filter(Boolean);
        
        respond.flushbr(res.length ? res : 'nothing found');
      });
    }
  })

  bot.addCommand('weather', {
    usage: '.weather [search terms]',
    help: 'lookup weather underground',
    args: /^(.+)$/,
    action: function(from,respond,text) {
      function trend(n) {
        switch (n) {
          case '+': return '▴';
          case '-': return '▾';
          case '0': return '▴0';
        }
        if (n>=0) return '▴'+String(n|0);
        return '▾'+String(-n|0);
      }

      bot.wget('http://ws.geonames.org/searchJSON', {
        q:text,
        maxRows:1,
      }, function(error,response,body,url) {

        if (error) return respond('error: '+ String(error));
        try { var obj = JSON.parse(body); } catch (e) {return respond('error: ' + String(e)); }
        if (!obj.geonames.length) return respond('nothing found');
        var n = obj.geonames[0];
        var loc = Number(n.lat).toFixed(5)+','+Number(n.lng).toFixed(5);

        bot.wget('http://api.wunderground.com/api/'+bot.config.key_weather+'/geolookup/conditions/forecast/q/'+loc+'.json', function(error,response,body,url) {
          if (error) return respond('error: '+ String(error));
          try { var obj = JSON.parse(body); } catch (e) {return respond('error: ' + String(e)); }

          if (!obj.current_observation) return respond('nothing found');
          var n = obj.current_observation;
          var f = obj.forecast.txt_forecast.forecastday[0];
          respond (
            n.display_location.full 
          + ' | ' + n.weather 
          + ' | ' + n.temp_c + '°C ('+ n.temp_f + '°F)' 
          + ' | ' + n.pressure_mb + ' mb ' + trend(n.pressure_trend)
          + ' | ' + ( n.wind_kph ? n.wind_kph + ' km/h (' + n.wind_mph+' mph) from ' + n.wind_dir + ' ('+n.wind_degrees+'°)' : 'no wind')
          + ' | ' + f.title + ': ' + f.fcttext_metric
          );
        });
      })
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
        .log('tr')
        .extract(/<a.*?>(.*?)<\/a>.*?<a.*?>U\+(.*?)<\/a><\/td>.*?<td>(.*?)<\/td>/,function($0,$1,$2,$3) {
          var code = 'U+'+$2;
          var name = $3.toLowerCase();
          var C = parseInt($2,16);
          var char = String.fromCharCode(C);
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

  var googleLangs = 
    '(af|ach|ak|am|ar|az|be|bem|bg|bh|bn|br|bs|ca|chr|ckb|co|crs|cs|cy|da|de|ee|el|en|eo|es-419|es|et|eu|fa|fi|fo|fr|fy|ga|gaa|'
  + 'gd|gl|gn|gu|ha|haw|hi|hr|ht|hu|hy|ia|id|ig|is|it|iw|ja|jw|ka|kg|kk|km|kn|ko|kri|ku|ky|la|lg|ln|lo|loz|lt|lua|lv|mfe|mg|mi|'
  + 'mk|ml|mn|mo|mr|ms|mt|ne|nl|nn|no|nso|ny|nyn|oc|om|or|pa|pcm|pl|ps|pt-BR|pt-PT|qu|rm|rn|ro|ru|rw|sd|sh|si|sk|sl|sn|so|sq|sr|'
  + 'sr-ME|st|su|sv|sw|ta|te|tg|th|ti|tk|tl|tn|to|tr|tt|tum|tw|ug|uk|ur|uz|vi|wo|xh|xx-bork|xx-elmer|xx-hacker|xx-klingon|'
  + 'xx-pirate|yi|yo|zh-CN|zh-TW|zu)';

  bot.addCommand('tr', {
    usage: '.tr [source]:[target] [text to translate]',
    help: 'google translate',
    args: new RegExp('^(?:'+googleLangs + '?:'+googleLangs + '?\\s+)?(.*)$'),
    action: function(from,respond,sl,tl,text) {
      if (text=='?') return respond(googleLangs);
      sl = sl || 'auto';
      tl = tl || 'en';
      bot.wget('http://translate.google.com/translate_a/t?client=t&hl=en&otf=1&ssel=0&tsel=0&uptl=en&sc=1&oe=utf-8&ie=utf-8', {
        text:text,
        sl:sl,
        tl:tl,
      }, function(error,response,body,url) {
        if (error) return respond('error: '+ String(error));
        try { var obj = JSON.parse(body.replace(/,(?=,)/g,',null')); } catch (e) {return respond('error: ' + String(e)); }
        if (!obj[0] || !obj[0][0] || !obj[0][0][0]) respond('nothing found');
//        if (sl=='auto') sl = body.clean().extract(/"([^"]*)"/g,'$1').pop();
        return respond('['+sl +':'+tl+ '] ' + obj[0][0][0]) + ' | ' +url;
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

  bot.addCommand('imdb', {
    usage: '.imdb [movie]',
    args: /^(.+)$/,
    help: 'get information about a movie on imdb',
    action: function(from,respond,text) {
      if (!text) {
        return respond('You gave me zero length input.');
      }
      bot.wget('http://www.imdbapi.com/', {
          t:text
        }, function (error, response, body) {
        if (error) return respond('error: '+String(error));
        try { var obj = JSON.parse(body); } catch(e) { return('error: ' + String(e)); }
        if (!obj.Title) return respond('nothing found ');
        return respond( obj.Title + ' (' + obj.Year + ')' + ' | ' + obj.imdbRating + ' | ' + 'http://imdb.com/title/' + obj.imdbID + ' | ' + obj.Plot );
      });
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
