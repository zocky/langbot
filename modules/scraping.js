

var lastUrl = [];

exports.setup = function(bot) {
  bot.listen(function(from,msg) {
    var m = msg.match(/\bhttps?:\/\/\S+/);
    if (m) lastUrl = lastUrl.concat(m).slice(-50);
  });
  
  bot.addCommand('title', {
    usage: '.title [url], .title',
    help: 'get title of [url], or title of last mentioned url',
    action: function(from,respond,text,url) {
      if (!url) {
        if (!lastUrl.length) return respond ('no url');
        url = lastUrl.pop();
      }
      bot.wget(url, function (error, response, body) {
        if (error) return respond('error: '+String(error));
        if(response.headers['content-type'].substr(0,9)!='text/html') return respond('content-type: '+response.headers['content-type']);
        
        var title = body.extract(/<title\s*>\s*(.*?)\s*<\/title\s*>/i,'$1').htmldecode() || 'could not find title';
        return respond(title + ' | ' + url );
      });
    }
  })

  bot.addCommand('wik', {
    usage: '.wik [search terms]',
    help: 'get a definition from wikipedia',
    action: function(from,respond,text) {
      var searchlang='en';
      var searchterms='';
      var m = text.match(/^:([a-z][a-z][a-z]?)\s(.*)$/);
      if(m) searchlang=m[1], searchterms=m[2];
      else searchterms=text;
      bot.wget('http://'+searchlang+'.wikipedia.org/w/api.php?action=query&generator=search&prop=extracts|info&inprop=url&exchars=300|&gsrlimit=1&format=json',{
        gsrsearch:searchterms,
      }, function(error,response,body) {
        if (error) return respond('error: '+ String(error));
        try { var obj = JSON.parse(body); } catch (e) { return respond('error: ' + String(e)); }
        if (!obj.query || !obj.query.pages) return respond('nothing found');
        var id = Object.keys(obj.query.pages)[0];
        var str = obj.query.pages[id].extract.replace(/<.*?>/g,' ').replace(/\s+/g,' ').trim();
        respond(bot.dehtml(str) + ' | ' + obj.query.pages[id].fullurl);
      });
    }
  })
  
  bot.addCommand('ety', {
    usage: '.ety [search terms]',
    help: 'search etymology online',
    action: function(from,respond,text) {
      if (!text) return respond ('You gave me zero length input.');
      bot.wget('http://www.etymonline.com/index.php', {
        term:text
      }, function(error,response,body,url) {
        if (error) return respond('error',String(error));
        var m = body.match(/<div id="dictionary">[\s\S]*?(<dt[\s\S]+?<\/dd>)/im);
        if (!m) return respond('not found '+url);
        respond(bot.dehtml(m[1].replace(/<.*?>/g,' ').replace(/\s+/g,' ')).trim().substr(0,300) + ' | '+ url);
      });
    }
  })

  bot.addCommand('urban', {
    usage: '.urban [search terms]',
    help: 'search urban dictionary',
    action: function(from,respond,text) {
      if (!text) return respond ('You gave me zero length input.');
      bot.wget('http://www.urbandictionary.com/define.php', {
        term:text
      }, function(error,response,body,url) {
        if (error) return respond('error',String(error));
        
        var m = body.match(/<td class='word'[^>]*>\s*<span>([\s\S]*?)<\/span>[\s\S]*?<div class="definition">([\s\S]*?)<\/div>/im);
        if (!m) return respond('not found '+url);
        respond((bot.dehtml(m[1].trim() + ': ' + m[2]).replace(/<.*?>/g,' ').replace(/\s+/g,' ')).trim().substr(0,300) + ' | '+ url);
      });
    }
  })

  bot.addCommand('c', {
    usage: '.c [expression]',
    help: 'google calculator',
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
    action: function(from,respond,text) {
      bot.wget('http://ws.geonames.org/searchJSON', {
        q:text,
        maxRows:1,
      }, function(error,response,body,url) {
        if (error) return respond('error: '+ String(error));
        try { var obj = JSON.parse(body); } catch (e) {return respond('error: ' + String(e)); }
        if (!obj.geonames.length) return respond('nothing found');
        var n = obj.geonames[0];
        var desc = [n.name,n.adminName1,n.countryName,n.fcodeName,n.population && ('pop. '+n.population)].filter(Boolean).join(', ');
        
        var loc = Number(n.lat).toFixed(5)+','+Number(n.lng).toFixed(5);
        
        return respond(desc + ' | ' + 'http://maps.google.com/maps?ll='+loc+'&q=loc:'+loc+'&hl=en&t=h&z=9');
      });
    }
  })

  bot.addCommand('weather', {
    usage: '.weather [search terms]',
    help: 'lookup weather underground',
    
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
    action: function(from,respond,text) {
      if (!text) return respond ('You gave me zero length input.');
      var re = /<a.*?>(.*?)<\/a>.*?<a.*?>U\+(.*?)<\/a><\/td>.*?<td>(.*?)<\/td>/;
      
      
      bot.wget('http://www.fileformat.info/info/unicode/char/search.htm?preview=none', {
        q:text,
      }, function(error,response,body,url) {
        if (error) return respond('error: '+ String(error));
        
        var m = body
        .replace(/&amp;/g,'&')
        .replace(/\s+/g,' ')
        .match(/<tr class="row[01]">.*?<\/tr>/g)
        .map(function(n) {
          var o = n.match(re);
          if (!o) return false;
          var code = 'U+'+o[2];
          var name = o[3].toLowerCase();
          var C = parseInt(o[2],16);
          var char = String.fromCharCode(C);
          if (char == text) char = ''+char+'';
          var html = '&#'+C+';';
          return char + ' ('+code + ' '+html+' '+name + ')';
        })
        .filter(Boolean)
        .unique();
        
        if (!m) return respond('not found');
        respond (
          m.slice(0,6)
          .join (' | ')
          + (m.length > 6 ? ' | + ' + (m.length-1) + ' more': '')
          + ' | ' + url
        );
      })
    }
  })

  bot.addCommand('tr', {
    usage: '.tr [text to translate]',
    help: 'google translate',
    action: function(from,respond,text,langs) {
      var sl = 'auto',tl='en';
      var m = langs.match(/^(\w+)-(\w+)$/);
      if (m) sl = m[1], tl=m[2], text = text.replace(/^\S+\s+/,'');
      bot.wget('http://translate.google.com/translate_a/t?client=t&hl=en&otf=1&ssel=0&tsel=0&uptl=en&sc=1&oe=utf-8&ie=utf-8', {
        text:text,
        sl:sl,
        tl:tl,
      }, function(error,response,body,url) {
        if (error) return respond('error: '+ String(error));
        try { var obj = JSON.parse(body.replace(/,(?=,)/g,',null')); } catch (e) {return respond('error: ' + String(e)); }
        if (!obj[0] || !obj[0][0] || !obj[0][0][0]) respond('nothing found');
        return respond(sl +'-'+tl+ ': ' + obj[0][0][0]) + ' | ' +url;
      });
    }
  })

  bot.addCommand('g', {
    usage: '.g [search terms]',
    help: 'search google',
    action: function(from,respond,text,langs) {
      var sl = 'auto',tl='en';
      var m = langs.match(/^(\w+)-(\w+)$/);
      if (m) sl = m[1], tl=m[2], text = text.replace(/^\S+\s+/,'');
      bot.wget('http://ajax.googleapis.com/ajax/services/search/web?v=1.0&safe=off', {
        q:text,
      }, function(error,response,body,url) {
        if (error) return respond('error: '+ String(error));
        try { var obj = JSON.parse(body); } catch (e) {return respond('error: ' + String(e)); }
        if (!obj.responseData || !obj.responseData.results || !obj.responseData.results[0]) return respond('nothing found');
        var n = obj.responseData.results[0];
        return respond(n.unescapedUrl + ' | ' + bot.dehtml(n.titleNoFormatting) + ' | ' + bot.dehtml(n.content.replace(/\s+/g,' ').replace(/<b>(.*?)<\/b>/g,'$1')));
      });
    }
  })

  bot.addCommand('w', {
    usage: '.w [word]',
    help: 'get a definition from wiktionary',
    action: function(from,respond,text) {
      bot.wget('http://en.wiktionary.org/w/api.php?action=mobileview&sections=all&format=json',{
        page:text,
      }, function(error,response,body) {
      
        if (error) return respond('error: '+ String(error));
        try { var obj = JSON.parse(body); } catch (e) { return respond('error: ' + String(e)); }
        if (!obj.mobileview || !obj.mobileview.sections) return respond('nothing found');

        var wordClasses = {
          'noun': 'n.', 'verb': 'v.', 'adjective':'adj.', 'adverb' : 'adv.' ,'pronoun': 'pron.',
          'preposition' : 'prep.','conjunction' : 'conj.','particle':'part.','interjection':'intj.',
          'proper noun': 'prop. n.','article':'art.','prefix':'pref.','suffix':'suf.','idiom':'idiom',
          'acronym':'acr.','abbreviation':'abbr.','initialism':'init.','symbol':'symbol','letter':'letter',
          'romanization':'rom.','proverb':'proverb'
        };
        var ret = [];
        var lang = '';
        var s = obj.mobileview.sections;
        s.forEach(function(n) {
          if (n.toclevel == 1) {
            lang = n.line;
            ret.push(ret.length ? '| '+lang : lang);
            return;
          }
          if (n.toclevel >= 2) {
            var wc = wordClasses[n.line.toLowerCase()];
            if (!wc) return;
            var meanings = n.text.htmlfind('li').map(function(n,i) {
              return (i+1) + '. '+ n.htmlremove('dl').htmlremove('ul').htmlstrip();
            });
            ret.push (wc + ' ' + meanings.join(' ')+';');
          }
        })
        return respond (ret.join (' ').substr(0,500));
      });
    }
  })

  bot.addCommand('imdb', {
    usage: '.imdb [movie]',
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
  
  bot.addCommand('rae', {
    usage: '.rae [word]',
    help: 'search Real Academia Española dictionary. SLOOOOOOW.',
    action: function(from,respond,text,url) {
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
