exports.setup = function(bot) {

  bot.addCommand('ety', {
    usage: '.ety [search terms]',
    help: 'search etymology online',
    args: /^(.+)$/,
    action: function(from,respond,text) {
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
  });

  bot.addCommand('pron', {
    usage: '.pron [word]',
    help: 'display pronunciation of a word',
    args: /^(.+)$/,
    action: function(from,respond,text) {
      bot.wget('http://oxforddictionaries.com/search/english/?direct=1&multi=1', {
        q:text
      }, function(error,response,body,url) {
        if (error) return respond('error',String(error));
        console.log('body',body);
        var ipa = body.extract(/<a href="http:..oxforddictionaries.com.words.key-to-pronunciation">\s*(\/.+?\/)\s*<\/a>/i,'$1');

        if (!ipa) return respond('not found');
        
        ipa = ipa.replace(/a(?![ɪʊ])/g,'æ');
        var chars = ipa.split("");
        var out = [];
        
        function add (n) { out.push(n); }
        function replace (n) { out.pop(); out.push(n); }
        
        var last = null;
        for (var i in chars) {
          var c = chars[i];
          switch(c) {
          case 'ð': add('dh'); break;
          case 'θ': add('th'); break;

          case 'j': out.push('y'); break;
          case 'ʒ': last == 'd' ? replace('j') : add ('zh'); break;
          case 'ʃ': last == 't' ? replace('ch') : add ('sh'); break;

          case 'ŋ': out.push('ng'); break;
          case 'g': last == 'n' ? add('·g') : (last == 'ng' ? null : add('g')); break;

  
          case 'h': 'tdcsz'.indexOf(last)>=0 ? add('·h') : add('h'); break;

          case 'j': add('y'); break;
          case 'ʍ': add('hw'); break;

          case 'a': add('ae'); break;
          case 'ɑ': add('a'); break;
          case 'ʌ': add('a'); break;
          case 'æ': add('ae'); break;

          case 'ɛ': add('e'); break;

          case 'i': add('i'); break;
          case 'ɪ': add('i'); break;
          
          case 'ɔ': add('o'); break;
          case 'ɒ': add('o'); break;

          case 'ʊ': add('u'); break;

          case 'ɜ': add('@'); break;
          case 'ə': add('@'); break;
          case 'ː': add(':'); break;
          default:
            add(c);
          }
          last = out[out.length-1];
        }
        var simple = out.join('');

        out=[];
        for (var i in chars) {
          var c = chars[i];
          switch(c) {
          case 'ð': add('D'); break;
          case 'θ': add('T'); break;
          case 'ʒ': add('Z'); break;
          case 'ʃ': add('S'); break;

          case 'ŋ': out.push('N'); break;
          case 'ʍ': add('W'); break;

          case 'ɑ': add('A'); break;
          case 'ʌ': add('V'); break;
          case 'æ': add('{'); break;

          case 'ɛ': add('E'); break;

          case 'i': add('i'); break;
          case 'ɪ': add('I'); break;
          
          case 'ɔ': add('O'); break;
          case 'ɒ': add('Q'); break;

          case 'ʊ': add('U'); break;

          case 'ɜ': add('3'); break;
          case 'ə': add('@'); break;
          case 'ː': add(':'); break;
          default:
            add(c);
          }
        }

        var sampa = out.join('');
        respond.flush('ipa:',ipa,'sampa:',sampa,'approx:',simple);
      });
    }
  })
}
