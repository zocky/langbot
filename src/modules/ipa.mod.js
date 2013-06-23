var data = require('./ipa.data.js');

  var _trans = {};
  for (var name in data.trans) {
    var t = data.trans[name];
    var _t = _trans[name] = {};
    var ipa = Object.keys(t);
    ipa.sort(function(a,b){return b.length-a.length});
    _t.ipa2x_re = new RegExp('(' + ipa.filter(Boolean).map(RegExp.escape).join('|') + ')');
    _t.ipa2x = {}; for(var i in t) _t.ipa2x[i] = t[i].join ? t[i][0] : t[i];
    var x = []; for(var i in ipa) x=x.concat(t[ipa[i]]);
    _t.x2ipa_re = new RegExp('(' + x.sort(function(a,b){return b.length-a.length}).map(RegExp.escape).join('|') + ')');
    _t.x2ipa = {}; for(var i in t) t[i].join ? t[i].filter(Boolean).forEach(function(n){_t.x2ipa[n] = i}) : _t.x2ipa[t[i]] = i;
 }
 
 var ipa2x = function fn (name,str) {
    var t = _trans[name];
    return ('/'+str+'/')
    .replace(/[/]+/g,'/')
    .split(t.ipa2x_re)
    .filter(Boolean)
    .map(function(n){return n in t.ipa2x ? t.ipa2x[n] : n})
    .join('');
  }
  
  var x2ipa = function fn (name,str) {
    var t = _trans[name];
    return ('/'+str+'/')
    .replace(/[/]+/g,'/')
    .split(t.x2ipa_re)
    .filter(Boolean)
    .map(function(n){return n in t.x2ipa ? t.x2ipa[n] : n})
    .join('');
  }

exports.setup = function(bot) {
  bot.addCommand('x', {
    usage: '.x [text]',
    help: 'Convert X-SAMPA to IPA and locaphone',
    args: /(.+)$/,
    action: function(from,respond,text) {
      var ipa = x2ipa('xsampa',text);
      var lcp = ipa2x('locaphone',ipa);
      respond.flush('ipa:'+ipa, 'lcp:'+lcp);
    }
  })

  bot.addCommand('l', {
    usage: '.l [text]',
    help: 'Convert locaphone to IPA and X-SAMPA',
    args: /(.+)$/,
    action: function(from,respond,text) {
    
      text = text
      .replace(/@r(?=[aeiou@])/g, 'ər')
      .replace(/or(?=[aeiou@])/g, 'ɒr')
      .replace(/ar/g, 'ɑr')
      .replace(/@r/g, 'ɜr')
      .replace(/or/g, 'ɔr');
    
      var ipa = x2ipa('locaphone',text);
      var xsampa = ipa2x('xsampa',ipa);
      respond.flush('ipa:'+ipa,'x-sampa:'+xsampa);
    }
  })

  bot.addCommand('i', {
    usage: '.i [text]',
    help: 'Convert IPA locaphone and X-SAMPA',
    args: /(.+)$/,
    action: function(from,respond,ipa) {
      var lcp = ipa2x('locaphone',ipa);
      var xsampa = ipa2x('xsampa',ipa);
      respond.flush('x-sampa:'+xsampa,'lcp:'+lcp);
    }
  })

  bot.addCommand('pron', {
    usage: '.pron [word]',
    help: 'display pronunciation of a word',
    args: /^(.+)$/,
    action: function(from,respond,text) {
      bot.wget('http://oxforddictionaries.com/search/english/?direct=1&multi=1', {
        q:text
      }, function(error,response,body,url) {
        if (error) return respond('error',String(error));
        var oed = body.extract(/<a href="http:..oxforddictionaries.com.words.key-to-pronunciation">\s*(\/.+?\/)\s*<\/a>/i,'$1');
        if (!oed) return respond('nothing found');
        var ipa = x2ipa('oed',oed);
        var lcp = ipa2x('locaphone',ipa);
        var xsampa = ipa2x('xsampa',ipa);
        respond.flush('ipa:'+ipa,' x-sampa:'+xsampa,'lcp:'+lcp);
      });
    }
  })

  bot.addCommand('pronus', {
    usage: '.pronus [word]',
    help: 'display GA pronunciation of a word',
    args: /^(.+)$/,
    action: function(from,respond,text) {
      bot.wget('http://oxforddictionaries.com/search/american_english/?direct=1&multi=1', {
        q:text
      }, function(error,response,body,url) {
        if (error) return respond('error',String(error));
        var oed = body.extract(/<a href="http:..oxforddictionaries.com.words.key-to-pronunciation-us">\s*(\/.+?\/)\s*<\/a>/i,'$1');
        if (!oed) return respond('nothing found');
        var ipa = x2ipa('oed',oed);
        var lcp = ipa2x('locaphone',ipa);
        var xsampa = ipa2x('xsampa',ipa);
        respond.flush('ipa:'+ipa,' x-sampa:'+xsampa,'lcp:'+lcp);
      });
    }
  })

}

