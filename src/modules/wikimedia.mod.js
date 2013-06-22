var data = require('./wikimedia.data.js');

exports.setup = function(bot) {


  bot.addCommand('wik', {
    usage: '.wik [search terms]',
    help: 'Lookup the English Wikipedia ...',
    args: /(.+)$/,
    action: function(from,respond,text) {
      wikipedia(from,respond,'en',text)
    }
  })

  bot.addCommand('wik', {
    usage: '.wik [lang]:[search terms]',
    help: '... or a Wikipedia in another language. ',
    args: /^([\w\-]+): ?(.+)$/,
    action: function(from,respond,lang,text) {
      wikipedia(from,respond,lang,text)
    }
  })

  bot.addCommand('w', {
    usage: '.w [word]',
    help: 'Get definitions from Wiktionary ...',
    args: /^(.+)$/,
    action: function(from,respond,text) {
      wiktionary(from,respond,null,text);
    }
  })
  bot.addCommand('w', {
    usage: '.w [lang]:[word]',
    help: ' ... for a particular language.',
    args: /^([\w\-]+): ?(.+)$/,
    action: function(from,respond,lang,text) {
      wiktionary(from,respond,lang,text);
    }
  })

  bot.addCommand('lang', {
    usage: '.lang [search_term]',
    help: 'Search language data.',
    args: /^(.+)$/,
    action: function(from,respond,text) {
      languages(from,respond,text);  
    }
  });

  function wikipedia(from,respond,lang,text) {
    if (!data.languages[lang]) return respond ('Unknown language ' + lang + ', try .lang');
  
    bot.wgetjson('http://'+lang+'.wikipedia.org/w/api.php?action=query&generator=search&prop=extracts|info&inprop=url&exchars=500&format=json', {
      exlimit: 'max',
      exintro: '1',
      gsrsearch:text,
    }, function(error,response,obj) {
      if (error) return respond('error: '+ String(error));
      //try { var obj = JSON.parse(body); } catch (e) { return respond('error: ' + String(e)); }
      if (!obj.query || !obj.query.pages) return respond('nothing found');
      var ret = [];
      for (var id in obj.query.pages) {
        var p = obj.query.pages[id];
        if (p.title.toLowerCase() == text.toLowerCase()) ret.shift(['',p.extract.htmlstrip(),p.fullurl]);
        ret.push(['',p.extract.htmlstrip(),p.fullurl]);
      };
      for (var i in ret) respond.printrow(ret[i][0],ret[i][1],ret[i][2]);
      respond.flush();
    });
  };
  
  function wiktionary (from,respond,lang,text) {
    if (lang && !data.languages[lang]) return respond ('Unknown language ' + lang + ', try .lang');
    
    bot.wgetjson('http://en.wiktionary.org/w/api.php?action=mobileview&sections=all&format=json',{
      page:text,
    }, function(error,response,obj) {
      if (error) return respond('error: '+ String(error));
      if (!obj.mobileview || !obj.mobileview.sections) return respond('nothing found');
      var wordClasses = {
        'noun': 'n.', 'verb': 'v.', 'adjective':'adj.', 'adverb' : 'adv.' ,'pronoun': 'pron.',
        'preposition' : 'prep.','conjunction' : 'conj.','particle':'part.','interjection':'intj.',
        'proper noun': 'prop. n.','article':'art.','prefix':'pref.','suffix':'suf.','idiom':'idiom',
        'acronym':'acr.','abbreviation':'abbr.','initialism':'init.','symbol':'symbol','letter':'letter',
        'romanization':'rom.','proverb':'proverb','numeral':'num.'
      };
      var found = false;
      var curlang = false;
      var lastlang = false;
      var s = obj.mobileview.sections;
      s.forEach(function(n) {
        if (n.toclevel == 1) {
          if (!lang || data.languages[lang] && data.languages[lang].names.indexOf(n.line)>-1) curlang = n.line;
          else curlang = false;
          return;
        }
        if (!curlang) return;
        found = true;
        var wc = wordClasses[n.line.toLowerCase()];
        if (!wc) return;
        if (lastlang != curlang) {
          respond.print (curlang+':','<nobr>');
          lastlang = curlang;
        }
        respond.print (wc,'<nobr>');
        n.text.htmlfind('li').forEach(function(n,i) {
          respond.print((i+1) + '. ' + n.htmlremove('dl').htmlremove('ul').htmlstrip().clean().replace(/,$/,'.').replace(/([^\.\?\!;"])$/,'$1.'));
        });
        respond.print('|');
      })
      if (!found) return respond('nothing found');
      respond.flush();
    });
  }

  function languages (from,respond,text) {
    var q = text.clean().toLowerCase();
    var ret = [];
    
    function format(a) {  return '[' + a[0] + '] ' + a[2].names.join (', ') + ' ' + a[1] + '';  }
    if (data.languages[q]) ret.push([q,'L',data.languages[q]]);
    if (!ret.length && data.families[q]) ret.push([q,'F',data.families[q]]);
    if (!ret.length) {
      for (var i in data.languages) if (data.languages[i].names.join().toLowerCase().indexOf(q) > -1) ret.push([i,'L',data.languages[i]]);
      for (var i in data.families)  if (data.families[i].names.join().toLowerCase().indexOf(q) > -1) ret.push([i,'F',data.families[i]]);
    }
    if (!ret.length) return respond('nothing found');
    
    if (ret.length > 1) {
      ret.sort(function(a,b) {
        return a[0].length - b[0].length;
      });
      ret.forEach(function(n) {
        respond.print(format(n));
      });
    } else {
      respond.print(format(ret[0]));
      var found = ret[0][2];
      var cnt = 0;
      while (f = found.family) {
        if (f=='qfa-und') break;
        if (f=='qfa-not') break;
        if (cnt++ > 10) break;
        found = data.families[f];
        respond.print(' < [' + f + '] '+found.names.join(', '));
      }
    }
    respond.flush();
  }
};


