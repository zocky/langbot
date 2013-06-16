
Object.defineProperty(Array.prototype,'unique', {
  enumerable: false,
  value :function() {
    var u = {}, a = [];
    for(var i = 0, l = this.length; i < l; ++i){
      if(u.hasOwnProperty(this[i])) {
         continue;
      }
      a.push(this[i]);
      u[this[i]] = 1;
    }
    return a;
  }
});

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
        var m = body.match(/<title\s*>\s*(.*?)\s*<\/title\s*>/i);
        if(!m) return respond('could not find title at '+ url);
        return respond(bot.dehtml(m[1]).trim() + ' | ' + url );
      });
    }
  })

  bot.addCommand('wik', {
    usage: '.wik [search terms]',
    help: 'get a definition from wikipedia',
    action: function(from,respond,text) {
      bot.wget('http://en.wikipedia.org/w/api.php?action=query&generator=search&prop=extracts|info&inprop=url&exchars=300|&gsrlimit=1&format=json',{
        gsrsearch:text,
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
      if (!text) return respond ('You gave me zero input');
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
      if (!text) return respond ('You gave me zero input');
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
      if (!text) return respond ('You gave me zero input');
      bot.wget('http://www.google.com/ig/calculator', {
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

        bot.wget('http://api.wunderground.com/api/0134cfe74d723b0e/geolookup/conditions/forecast/q/'+loc+'.json', function(error,response,body,url) {
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
      if (!text) return respond ('You gave me zero input');
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
      bot.wget('http://translate.google.com/translate_a/t?client=t&hl=en&otf=1&ssel=0&tsel=0&uptl=en&sc=1', {
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
        return respond(n.unescapedUrl + ' | ' + n.titleNoFormatting + ' | ' + n.content.replace(/\s+/g,' ').replace(/<b>(.*?)<\/b>/g,'$1'));
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
            ret.push(lang);
            return;
          }
          if (n.toclevel >= 2) {
            var wc = wordClasses[n.line.toLowerCase()];
            if (!wc) return;
            ret.push(
              wc 
            + ' '
            + bot.dehtml(n.text
              .replace(/\s+/g,' ')
              .replace(/<span style="color: #777777;">.*?<\/span>/g,'')
              .replace(/<dl\b[^>]*>.*?<\/dl\b[^>]*>/g,'')
              .replace(/<dd\b[^>]*>.*?<\/dd\b[^>]*>/g,'')
              .replace(/<dt\b[^>]*>.*?<\/dt\b[^>]*>/g,'')
              .replace(/<h3\b[^>]*>.*?<\/h3\b[^>]*>/g,'')
              .replace(/<table\b[^>]*>.*?<\/table\b[^>]*>/g,'')
  //            .replace(/<strong\b[^>]*>(.*?)<\/strong\b[^>]*>/g,'$1')
  //            .replace(/<b>(.*?)<\/b>/g,'$1')
              .replace(/<.*?>/g,'')
              .replace(/\s+/g,' ')
              .trim())
            );
          }
        })
        return respond (ret.join (' | ').substr(0,500));
      });
    }
  })


};
