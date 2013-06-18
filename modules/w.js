var data = require('./w.data.js');

exports.setup = function(bot) {
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

  bot.addCommand('lang', {
    usage: '.lang [search_term]',
    help: 'search language data',
    action: function(from,respond,text) {
      var q = text.clean().toLowerCase();
      var ret = [];
      
      function format(a) {
        return '[' + a[0] + '] ' + a[2].names.join (', ') + ' (' + a[1] + ')';
      }
      
      if (data.languages[q]) {
        ret.push([q,'language',data.languages[q]]);
      } 
      if (!ret.length && data.families[q]) {
        ret.push([q,'family',data.families[q]]);
      } 
      if (!ret.length) {
        for (var i in data.languages) {
          if (data.languages[i].names.join().toLowerCase().indexOf(q) > -1) ret.push([i,'language',data.languages[i]]);
        }
        for (var i in data.families) {
          if (data.families[i].names.join().toLowerCase().indexOf(q) > -1) ret.push([i,'family',data.families[i]]);
        }
      }

      if (!ret.length) return respond('nothing found');
      
      if (ret.length > 1) {
        
        ret.sort(function(a,b) {
          return a[0].length - b[0].length;
        });
      
        return respond (
          ret.slice(0,10).map(format).join(' | ')
        + (ret.length > 10 ? ' (+' + (ret.length-10) + ' more)' : '')
        );
      } 
      
      var found = ret[0][2];
      var txt = format(ret[0]);
      var cnt = 0;
      while (f = found.family) {
        if (f=='qfa-und') break;
        if (cnt++ > 10) break;
        found = data.families[f];
        txt += ' < [' + f + '] '+found.names.join(', ');
      }
      respond(txt);
    }
  })


};
