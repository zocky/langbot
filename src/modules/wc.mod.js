var moment = require('moment');
var fs = require('fs');

function sizeof(s) {
  return encodeURI(s).split(/%..|./).length - 1;
}

var data;

exports.setup = function(bot,conf) {
  if (!bot.state.wc) throw('failed to load state, wtf');
  bot.state.wc = bot.state.wc || {};
  bot.state.wc.results = bot.state.wc.results || {};
  bot.state.wc.tbd = bot.state.wc.tbd || {};
  bot.state.wc.predict = bot.state.wc.predict || {};
  bot.state.wc.warn = bot.state.wc.warn || {};
  bot.state.wc.admins = bot.state.wc.admins || bot.config.modules.wc.admins || [];
  bot.save();

  function dhm (m) {
    var d = moment(m).diff();
    d = 0 | (d/60/1000); // minutes
    var t = d % 60 + 'm';
    if (d >= 60) {
      d = 0 | (d/60) // hours
      t = d % 24 + 'h ' + t;
      if (d >= 24) {
        d = 0 | (d/24) // hours
        t = d + 'd ' + t;
      }
    }
    return t;
  }

  var listOpt = {
    when: {
      future: function(n)      { return moment().diff(n.moment) < 0 },
      unfinished: function(n)  { return moment().diff(n.moment,'hours',true) < 2 },
      past: function(n)        { return moment().diff(n.moment,'hours',true) > 2 },
      today: function(n)       { return moment().zone('-03:00').isSame(n.moment,'day') },
    },
    filter: {
      current: function(n)     { return currentMatches[n.id] },
      scored: function(n)      { return n.score1 !== undefined && n.score2 !== undefined },
      unscored: function(n)    { return n.score1 === undefined || n.score2 === undefined },
    },
    sort: {
      time_asc: function(a,b)  { return a.moment.diff(b.moment) || a.id - b.id  },
      time_desc: function(a,b) { return b.moment.diff(a.moment) || b.id - a.id  }
    },
    map: {
      announce: function (n)   {
      
        if ((n.score1 && n.score2) !== undefined) {
          if (moment().zone('-03:00').isSame(n.moment,'day')) return n.descf + ' FT';
          return n.descf;
        } 
        var cur = currentMatches[n.id];
        if (cur) {
          return '\u0002'+n.id+'\u0002 \u000f'+n.team1.flag +' '+n.team1.code + ' \u0002'+cur.score1+'-'+cur.score2+'\u0002 '+n.team2.code+' '+n.team2.flag+'\u000f in progress';
        }
        return n.descf + ' in ' + dhm(n.moment);
      },
      current: function (n)   {
        var cur = currentMatches[n.id];
        if (cur) {
          return '\u0002'+n.id+'\u0002 \u000f'+n.team1.flag +' '+n.team1.code + ' \u0002'+cur.score1+'-'+cur.score2+'\u0002 '+n.team2.code+' '+n.team2.flag+'\u000f';
        }
        return '';
      },
    }
  }

  function listMatches(respond,opt) {
    console.log("List Matches");
    var ret = data.matches.concat();
    if (opt.when) ret = ret.filter(typeof opt.when == 'function' ? opt.when : listOpt.when[opt.when]);
    if (opt.filter) ret = ret.filter(typeof opt.filter == 'function' ? opt.filter : listOpt.filter[opt.filter]);
    if (ret.length == 0) return respond((opt.label || '') + ' ' + (opt.emtpy||'none'));
    
    if (opt.sort) ret = ret.sort(typeof opt.sort == 'function' ? opt.sort : listOpt.sort[opt.sort]);
    if (opt.map) ret = ret.map(typeof opt.map == 'function' ? opt.map : listOpt.map[opt.map]);
    else ret = ret.map(function(n) {
      return n.descf;
    });
    
    if (opt.single) return respond((opt.label || '') + ' '+ ret.join(' \u000315|\u000f '));
  
    if (opt.label) respond.print(opt.label);
    
    ret.forEach(function(n,i,a){
      respond.print(n);
      if(i<a.length-1) respond.print ('<nobr>',' \u000315|\u000f ');
    })
    respond.flush();
  }

  
  bot.addCommand('today', {
    usage: '.today',
    help: "list today's matches",
    args: /^$/,
    action: function(from,respond) {
      listMatches(respond,{
        when: 'today',
        sort: 'time_asc',
        map: 'announce',
        single:true
      })
    }
  })

  bot.addCommand('now', {
    usage: '.now',
    help: "list current matches",
    args: /^$/,
    action: function(from,respond) {
      listMatches(respond,{
        filter: 'current',
        sort: 'time_asc',
        map: 'current',
        single:true
      })
    }
  })


  bot.addCommand('next', {
    usage: '.next',
    help: "list forthcoming matches",
    action: function(from,respond,text,cmd) {
      listMatches(respond,{
        when: 'future',
        sort: 'time_asc',
        map: 'announce',
      })
    }
  })

  bot.addCommand('last', {
    usage: '.last',
    help: "list recent games",
    action: function(from,respond,text,cmd) {
      listMatches(respond,{
        filter: 'scored',
        sort: 'time_desc',
        map: 'announce',
      })
    }
  })

  bot.addCommand('team', {
    usage: '.team [code|name]',
    help: "identify team",
    action: function(from,respond,q) {
      if (q!='*' && q.length < 3 ) return respond('not enough input.');
      if (q.length==3) {
        var t = data.codes[q.toUpperCase()];
        if(!t) return respond('no such team '+q.toUpperCase())
        var ret = [t];
      } else {
        var ret = data.teams
        .filter(function(n) {
          return q=='*' || (n.code+' '+n.name).toLowerCase().indexOf(String(q).toLowerCase())>-1;
        })
      }
      if (!ret.length) return respond ('nothing found');
      console.log("Printing Team Flags: " + q.toUpperCase());
      ret.forEach(function(n,i,a) {
        respond.print(n.flag + ' ' +n.code+' '+n.name +', group '+String.fromCharCode(64+n.group_id));
        
        if (a.length>1) return;

        stat = n.stat;
          
        var r = [];
        var sep = '\u000315|\u000f ';
        r.push(sep+(stat.gf|0)+' goals scored');
        if (stat.pk1 || stat.og_a) {
          r.push('(');
          if (stat.pk1) r.push(stat.pk1+' from PK');
          if (stat.og_a) r.push(stat.og_a+' from OG');
          r.push(')');
        }
        if (stat.pk0) r.push(sep+stat.pk0+' PK missed');
        
        r.push(sep+(stat.yc1|0)+'× \u00038▉\u000f');
        r.push(sep+(stat.yc2|0)+'× \u00038▉\u000f\u00034▉\u000f');
        r.push(sep+(stat.rc1|0)+'× \u00034▉\u000f');

        r.push(sep+(stat.ga|0)+' goals allowed');
        if (stat.pk1_a || stat.og) {
          r.push('(');
          if (stat.pk1_a) r.push(stat.pk1_a+' from PK');
          if (stat.og) r.push(stat.og+' from OG');
          r.push(')');
        }
        if (stat.pk0_a) r.push(sep+stat.pk0_a+' PK saved');

        r.forEach(function(rr) {
          respond.print('<nobr>',rr);
        })
      });
      respond.flush();
    }
  })
  
  bot.addCommand('player', {
    usage: '.player [name]',
    help: "show player stats",
    action: function(from,respond,q) {
      q=q.trim();
      if (q.length < 3 ) return respond('not enough input.');

      var ret = data.footballers
      .filter(function(n) {
        return (n.team.code+' '+n.name).toLowerCase().indexOf(String(q).toLowerCase())>-1;
      })

      var sep = '\u000315|\u000f ';
      if (!ret.length) return respond ('nothing found');
      console.log("Player Stats: "+q);
      ret.forEach(function(n,i,a) {
        respond.print(n.team.flag + ' ' +n.team.code+' '+n.name);
        if (a.length==1) {
          
          var stat = n.stat;

          var r = [];
          r.push(sep+(stat.gf|0)+' goals');
          if (stat.pk1) r.push(sep+'('+stat.pk1+' from PK)');
          if (stat.og) r.push(sep+stat.og+' own goals');
          if (stat.yc) r.push(sep+stat.yc+'× \u00038▉\u000f');
          if (stat.yc2) r.push(sep+stat.yc2+' ×\u00038▉\u000f\u00034▉\u000f');
          if (stat.rc1) r.push(sep+stat.rc1+'× \u00034▉\u000f');
          r.forEach(function(rr) {
            respond.print('<nobr>',rr);
          })
        }
        respond.print('<nobr>',sep)
      });
      respond.flush();
    }
  })
  
  var showStat = {
    gf: 'goals for',
    ga: 'goals against',
    pt: 'points',
    w: 'wins',
    d: 'draws',
    l: 'losses',
    og: 'own goals',
    pk: 'penalties taken',
    pk1: 'penalties converted',
    pk0: 'penalties missed',
    yc: 'yellow cards',
    yc1: 'first yellow cards',
    yc2: 'second yellow cards',
    rc: 'red cards',
    rc1: 'straight red cards',
  }

  bot.addCommand('players', {
    usage: '.players [gf|og|pk|pk1|pk0|yc|yc1|yc2|rc|rc1]',
    help: "list players by stat",
    args: /^(gf|og|pk|pk1|pk0|yc|yc1|yc2|rc|rc1)$/,
    action: function(from,respond,s) {
      respond.print ('players by: '+showStat[s] + ' \u000315|\u000f');
      data.footballers
      .sort(function(a,b) {
        return (b.stat[s]|0)-(a.stat[s]|0);
      })
      .filter(function(n){
        return !!n.stat[s];
      })
      .forEach(function(n,i){
        respond.print (n.name + ' ('+data.teams[n.team_id-1].code+') '+n.stat[s] + ' \u000315|\u000f')
      })
      respond.flush();
    }
  })

  bot.addCommand('teams', {
    usage: '.teams [pt|w|d|l|gf|ga|og|pk|pk1|pk0|yc|yc1|yc2|rc|rc1] [vs]',
    help: "list teams by stat",
    args: /^(pt|w|d|l|gf|ga|og|pk|pk1|pk0|yc|yc1|yc2|rc|rc1)(\s+vs?)?$/,
    action: function(from,respond,s,a) {
      var show=showStat[s];
      var post='';
      if (a) {
        if (s=='ga') s='gf',show='goals for';
        else if (s=='gf') s='ga',show='goals against';
        else {
          s=s+'_a';
          post=' (vs)';
        }
      } 
      respond.print ('teams by: '+show+post + ' \u000315|\u000f');
      
      data.teams.concat()
      .sort(function(a,b) {
        return (b.stat[s]|0)-(a.stat[s]|0);
      })
      .filter(function(n){
        return !!n.stat[s];
      })
      .forEach(function(n,i){
        respond.print (n.flag + ' '+n.code+' '+n.stat[s] + ' \u000315|\u000f')
      })
      respond.flush();
    }
  })

  

  bot.addCommand('ping', {
    usage: '.ping [on|off]',
    help: "configure whether you want to be pinged before unpredicted matches",
    allow:'loggedin',
    args:/^(on|off)$/,
    action: function(from,respond,arg) {
      bot.state.wc.warn[respond.account] = arg;
      respond('Ping '+arg+' for '+respond.account+'.');
    },
  })


  bot.addCommand('colors', {
    usage: '.colors',
    help: "show available colors",
    args: /^$/,
    hidden:true,
    msgonly: !conf.draw_in_channel,
    action: function(from,respond,text,q) {
      var colors = 'wkngrmpoyltcbfis';
      return respond(
        colors
        .split('')
        .map(function(n,i){
          return '\u000301,'+i+' '+n+'\u000300,'+i+n+' \u000f';
        })
        .join(' ')
      );
    }
  });
  
  bot.addCommand('draw', {
    usage: '.draw [bg] | [bg][fg][char] ...',
    help: "draw a flag",
    hidden:true,
    msgonly: !conf.draw_in_channel,
    action: function(from,respond,text,q) {
      var colors = 'wkngrmpoyltcbfis';
      var ret = text.trim().split(/\s/).map(function(n) {
        switch (n.length) {
        case 3:
          var f = colors.indexOf(n[1]);
        case 1:
          var f = f||0;
          var b = colors.indexOf(n[0]);
          var c = n[2] || ' ';
          break;
        default: 
          return '#';
        }
        if (b<0 || f<0) return '#';
        if (b<10) b='0'+String(b);
        if (f<10) f='0'+String(f);
        return '\u0003'+f+','+b+c;
      })
      .join('') + '\u000f';
      respond(ret+' '+ret.replace(/\u0003/g,'\\u0003').replace(/\u000f/g,'\\u000f'));
    }
  })

  bot.addCommand('flags', {
    usage: '.flags',
    help: "show all flags",
    action: function(from,respond,text,q) {
      data.teams
      .forEach(function(n,i,a) {
        respond.print( (n.flag||'') + ' ' +n.code);
        if (i==15) respond.print('<br>');
      })
      respond.flushAll();
    }
  })

  bot.addCommand('admins', {
    usage: '.admins',
    help: "list all admins",
    args: /^$/,
    action: function(from,respond,text,q) {
      var admins = bot.state.wc.admins;
      switch(admins.length) {
      case 0:
        respond.print('I have no admins');
        break;
      case 1:
        respond.print('My admin is ' + convolute(admins[0]) +'.');
        break;
      default:
        respond.print('My admins are '+admins.slice(0,-1).map(convolute).join(', ')+' and '+convolute(admins.slice(-1)[0]) +'.');
      }
      respond.flush('My master is '+convolute(bot.config.master)+'.');
    }
  })

  bot.addCommand('admins', {
    usage: '.admins add [nick]',
    help: "add an admin",
    args: /^add (\S+)$/,
    allow: function() {
      return bot.state.wc.admins;
    },
    action: function(from,respond,nick) {
      var admins = bot.state.wc.admins;
      if (nick==bot.client.nick) return respond('I\'m already my own boss.');
      if (!bot.present(nick)) return respond(nick+' must be present in the channel for this to work.');
      
      bot.account(function(a) {
        if (admins.indexOf(a)>-1) return respond (a+' is already an admin.');
        if (a==bot.config.master) return respond(a+' is my master.');
        admins.push(a);
        bot.save();
        respond(a +' is now an admin.');
      })
      
    }
  })

  bot.addCommand('admins', {
    usage: '.admins remove [account name]',
    help: "remove an admin",
    args: /^remove (\S+)$/,
    allow: function() {
      return bot.state.wc.admins;
    },
    action: function(from,respond,a) {
      var admins = bot.state.wc.admins;
      var cfg = bot.config.modules.wc.admins;
      if (admins.indexOf(a)<0) return respond (a+' is not an admin.');
      if (cfg.indexOf(a)>-1 && respond.account != bot.config.master) return respond (a+' can only be removed by the master.');
      
      admins.splice(admins.indexOf(a),1);
      bot.save();
      respond(a +' is not an admin anymore.');
    }
  })

  bot.addCommand('record', {
    usage: '.record',
    help: "list unrecorded games",
    allow: function() {
      return bot.state.wc.admins;
    },
    action: function(from,respond,text,cmd) {
      listMatches(respond,{
        label: 'Games without recorded results:',
        sort:'time_asc',
        when: 'past',
        filter: 'unscored'
      })
    }
  })

  bot.addCommand('record', {
    usage: '.record [game] [score1] [score2]',
    help: "record game result",
    args: /^(\d\d?)\W+(\d\d?)\W+(\d\d?)$/,
    allow: function() {
      return bot.state.wc.admins;
    },
    action: function(from,respond,id,score1,score2) {
      var n = data.matches[id-1];
      
      if (!n) return respond ('no such game '+id);
      
      bot.state.wc.results[id] = {
        score1: score1|0,
        score2: score2|0
      }
  
      n.score1 = score1|0;
      n.score2 = score2|0;
      
      bot.save();
      crunchData(bot);
      respond.flush('Recorded ' + n.desc);
    }
  })

  bot.addCommand('record', {
    usage: '.record [game] [score1] [score2] [penalties1] [penalties2]',
    help: "record game result",
    args: /^(\d\d?)\W+(\d\d?)\W+(\d\d?)\W+(\d\d?)\W+(\d\d?)$/,
    allow: function() {
      return bot.state.wc.admins;
    },
    action: function(from,respond,id,score1,score2,penalties1,penalties2) {
      var n = data.matches[id-1];
      
      if (!n) return respond ('no such game '+id);
      
      bot.state.wc.results[id] = {
        score1: score1|0,
        score2: score2|0,
        penalties1: penalties1|0,
        penalties2: penalties2|0,
      }
      n.score1 = score1|0;
      n.score2 = score2|0;
      n.penalties1 = penalties1|0;
      n.penalties2 = penalties1|0;
      
      bot.save();
      crunchData(bot);
      respond.flush('Recorded ' + n.desc);
    }
  })


  bot.addCommand('tbd', {
    usage: '.tbd',
    help: "list of games with undeclared teams",
    action: function(from,respond,text,cmd) {
      respond.print('games with undeclared teams:');
      data.matches
      .filter(function(n) {
        return n.tbd1 || n.tbd2; 
      })
      .sort(function(a,b) {
        return a.moment.diff(b.moment) || a.id-b.id;
      })
      .map(function(n) {
        return n.descf;
      })
      .forEach(function(n) {
        respond.print(n + ' \u000315|\u000f');
      });
      respond.flush();
    }
  })

  bot.addCommand('tbd', {
    usage: '.tbd [tbd_label] [team_code]',
    help: "declare tbd teams",
    args: /^(\w\w\w?)\W+(\w\w\w)$/,
    allow: function() {
      return bot.state.wc.admins;
    },
    action: function(from,respond,label,code) {
      label = label.toUpperCase();
      var l = data.labels[label];
      if (!l) return respond ('no such tbd label '+label);
      
      code = code.toUpperCase()
      var team = data.codes[code];
      if (!team) return respond ('no such team '+code);
      bot.state.wc.tbd[label] = team.id;
      respond('Declared ' +label+ ' = ' + team.code);
      
      bot.save();
      crunchData(bot);
    }
  })

  bot.addCommand('tbd', {
    usage: '.tbd [tbd_label] remove',
    help: "declare tbd teams",
    args: /^(\w\w\w?)\sremove$/,
    allow: function() {
      return bot.state.wc.admins;
    },
    action: function(from,respond,label,code) {
      label = label.toUpperCase();
      var l = data.labels[label];
      if (!l) return respond ('no such tbd label '+label);
      delete bot.state.wc.tbd[label];
      respond('Undeclared ' +label);
      
      bot.save();
      crunchData(bot);
    }
  })


  bot.addCommand('record', {
    usage: '.record remove',
    help: "remove game result",
    args: /^(\d\d?)\s+remove$/,
    allow: function() {
      return bot.state.wc.admins;
    },
    action: function(from,respond,id,score1,score2) {
      var n = data.matches[id-1];
      
      if (!n) return respond ('no such game '+id);
      delete bot.state.wc.results[id].score1;
      delete bot.state.wc.results[id].score2;
      delete n.score1;
      delete n.score2;
      
      bot.save();
      crunchData(bot);
      respond.flush('Recorded ' + n.desc);
    }
  })


  bot.addCommand('score', {
    usage: '.score',
    help: "show prediction game scores",
    args: /^$/,
    action: function(from,respond) {
      data.playerList
      .filter(function(n){
        return n.pt>0;
      })
      .sort(function(a,b) {
        return b.pt-a.pt || a.gd/a.gp - b.gd/b.gp; 
      })
      .forEach(function(n,i){
        respond.print( '#'+(i+1) +'\u00a0'+n.slug+'\u00a0'+(n.pt)+' |');
      });
      respond.flush();
    }
  })


  bot.addCommand('score', {
    usage: '.score [account_name], .score me',
    help: "show player's score",
    args: /^(\S+)$/,
    allow: 'all',
    action: function(from,respond,p) {
      if (p=='me') {
        if (!respond.account) return respond('You are not logged in with NickServ');
        p = respond.account;
      }
      var player = data.players[p];
      if (!player) return respond('no such player '+p);

      var pos = data.playerList
      .concat()
      .sort(function(a,b) {
        return b.pt-a.pt || a.gd/a.gp - b.gd/b.gp; 
      })
      .indexOf(player)+1;
      respond( 
        '#'+pos
      + ' '+player.slug
      + ' '+player.pt+'pt in '+player.gp+' games'
      + ' ('+player.w3+'× 3pt, '+player.w1+'× 1pt, '+(player.pt/player.gp).toFixed(2)+'pt per game)'
      + ' gd '+player.gd
      + ' (avg '+(player.gd/player.gp).toFixed(2)+')'
      );
    }
  })
  
  
  bot.addCommand('score', {
    usage: '.score gd',
    help: "show average goal difference for players",
    args: /^gd$/,
    action: function(from,respond) {
      data.playerList
      .filter(function(n){
        return n.gp>9;
      })
      .sort(function(a,b) {
        return a.gd/a.gp - b.gd/b.gp;
      })
      .forEach(function(n,i){
        respond.print( ''+(i+1) +'\u00a0'+n.slug+'\u00a0'+(n.gd/n.gp).toFixed(2)+' |');
      })
      respond.flush();
    }
  })

  bot.addCommand('score', {
    usage: '.score pg',
    help: "show points per game for players",
    args: /^pg$/,
    action: function(from,respond) {
      data.playerList
      .filter(function(n){
        return n.gp>9;
      })
      .sort(function(a,b) {
        return b.pt/b.gp - a.pt/a.gp;
      })
      .forEach(function(n,i){
        respond.print( ''+(i+1) +'\u00a0'+n.slug+'\u00a0'+(n.pt/n.gp).toFixed(2)+' |');
      })
      respond.flush();
    }
  })

  bot.addCommand('score', {
    usage: '.score gp',
    help: "show number of games predicted per player",
    args: /^gp$/,
    action: function(from,respond) {
      data.playerList
      .sort(function(a,b) {
        return b.gp - a.gp;
      })
      .forEach(function(n,i){
        respond.print( ''+(i+1) +'\u00a0'+n.slug+'\u00a0'+n.gp +' |');
      })
      respond.flush();
    }
  })

  bot.addCommand('predict', {
    usage: '/msg '+bot.config.nick+' predict',
    help: "list your predictions",
    args: /^$/,
    msgonly: true,
    allow: 'loggedin',
    action: function(from,respond) {
      var a = respond.account;
      var st = bot.state.wc.predict[a];
      if (!st) return respond('You have made no predictions yet, '+a);
      
      respond.print(a + ' predicts ');
      listMatches(respond,{
        when: 'future',
        sort: 'time_asc',
        map: function(n) {
          if (st[n.id]) return n.idf + n.team1.descl + ' \u000303\u0002'+ st[n.id].score1+'-'+st[n.id].score2+'\u000f '+n.team2.descr + ' in '+dhm(n.moment);
          return '\u00034,0\u0002 '+n.id + ' \u000f '+ n.team1.descl + ' \u000304\u0002'+'?-?'+'\u000f '+n.team2.descr + ' in '+dhm(n.moment);
        }
      })
    }
  })
  
  bot.addCommand('predicted', {
    usage: '/msg '+bot.config.nick+' predicted',
    help: "list your old predictions",
    args: /^$/,
    msgonly: true,
    allow: 'loggedin',
    action: function(from,respond) {
      var a = respond.account;
      var st = bot.state.wc.predict[a];
      if (!st) return respond('You have made no predictions yet, '+a);
      
      respond.print(a + ' predicted ');
      data.matches
      .filter(function(n) {
        return st[n.id] && (n.score1 && n.score2) !== undefined;
      })
      .sort(function(a,b) {
        return -a.moment.diff(b.moment) || b.id-a.id;
      })
      .map(function(n) {
        var ret = n.descf + ' ['+ st[n.id].score1+'-'+st[n.id].score2+'] ';
        var pt = scorePoints(st[n.id],n);
        if (pt) ret+="\u0002\u000304"+pt+'pt \u000f'
        ret+='\u000315|\u000f';
        return ret;
      })
      .forEach(function(n) {
        respond.print(n);
      })
      respond.flush();
    }
  })

  function groupPredicts(n) {
    var ret = [];
    var predict = bot.state.wc.predict;
    var res = {};
    var total = 0, total1 = 0, total2 = 0;
    for (var i in predict) {
      var p = predict[i][n.id];
      if(!p) continue;
      total++;
      p.score1|=0;
      p.score2|=0;
      total1+=0|p.score1;
      total2+=0|p.score2;
      
      var sc = p.score1+'-'+p.score2;
      res[sc] = res[sc] || {
        score: sc,
        score1: p.score1,
        score2: p.score2,
        players: []
      };
      res[sc].players.push(convolute(i));
    }
    for (var i in res) ret.push(res[i]);
    //console.log(ret);
    return {
      grouped:ret,
      avg1: total1/total,
      avg2: total2/total,
      total: total,
    }
  }

  bot.addCommand('predict', {
    msgonly: true,
    allow: 'loggedin',
    usage: '/msg '+bot.config.nick+' predict [game] [score1] [score2]',
    help: "predict result",
    args: /^(\d\d?)\W+(\d)\W+(\d?)$/,
    action: function(from,respond,id,score1,score2) {
      var a = respond.account;
      var n = data.matches[id-1];
      if (!n) return respond ('No such game '+id+'.');
      if(n.moment.diff(Date.now())<0) return respond ('Too late for '+n.desc );
      
      if (!bot.state.wc.predict[a]) {
        bot.state.wc.predict[a] = {};
        respond('Welcome to the game, '+a+'!');
      }
      
      var old = bot.state.wc.predict[a][id];
      bot.state.wc.predict[a][id] = {
        score1: score1,
        score2: score2
      }
      
      bot.save();
      crunchData(bot);
      if (old) {
        respond.flush(a+' changes prediction ' + n.descf + ' ['+old.score1+'-'+old.score2+'] to ['+score1+'-'+score2+']');
      } else {
        respond.flush(a+' predicts ' + n.descf + ' ['+score1+'-'+score2+']');
      }
    }
  })

  bot.addCommand('predict', {
    usage: '.predict [game]',
    help: "show predictions for the game, use .next for a list of following games",
    args: /^(\d\d?)$/,
    action: function(from,respond,id) {
      var n = data.matches[id-1];
      if (!n) return respond ('No such game '+id+'.');
      var ret=groupPredicts(n);      
      respond.print(
        'Predictions for ' + n.descf + ': avg \u0002' 
        + ret.avg1.toFixed(1)+'-'+ret.avg2.toFixed(1)+'\u000f (total '+ret.total+') | '
      );
      
      var cur = currentMatches[n.id]; 
      var future = n.moment.diff() > 0;
      ret.grouped
      .sort(function(a,b) {
        return (a.score2-a.score1)-(b.score2-b.score1) || (a.score1 > a.score2 ? b.score1 - a.score1 : a.score1 - b.score1);
      })
      .forEach(function(p) {
        if (future) respond.print('\u0002'+p.score+'\u000f ('+ p.players.length + '×) | ');
        else if (cur) {
          if (p.score1 < cur.score1 || p.score2 < cur.score2) {
            respond.print('\u000315\u0002'+p.score+'\u0002 '+ p.players.join(', ')+'\u000f | ');
          } else if (p.score1 == cur.score1 && p.score2 == cur.score2) {
            respond.print('\u000303\u0002'+p.score+' '+ p.players.join(', ')+'\u000f | ');
          } else {
            respond.print('\u000303\u0002'+p.score+'\u0002 '+ p.players.join(', ')+'\u000f | ');
          }
        } else {
          respond.print('\u0002'+p.score+'\u000f '+ p.players.join(', ')+' | ');
        }
      })
      respond.flushAll();
    }
  })



  bot.addCommand('group', {
    usage: '.group [letter]',
    help: "show group standings",
    args: /^([a-hA-H])$/,
    action: function(from,respond,grp) {
      grp = grp.toUpperCase().charCodeAt(0)-65;
      var group = data.groups[grp];
      
      respond(
        data.teams
        .filter(function(n) {
          return n.group_id == group.id;
        })
        .sort(function(a,b) {
          if (a.pt != b.pt) return b.pt-a.pt;
          if (a.gd != b.gd) return b.gd-a.gd;
          if (a.gf != b.gf) return b.gf-a.gf;
          
          return 0;
        })
        .map(function(n) {
          return [n.flag, n.code, n.gp, '('+n.gf+'-'+n.ga+')', n.pt].join(' ');
        })
        .join(' | ')
      );
    }
  })

  bot.addCommand('group', {
    usage: '.group [letter] games',
    help: "show group games",
    args: /^([a-hA-H])\s+games$/,
    action: function(from,respond,grp) {
      grp = grp.toUpperCase().charCodeAt(0)-65;
      var group = data.groups[grp];
      listMatches(respond,{
        filter: function(n) {
          return n.stage == 0 && n.team1.group_id == group.id;
        },
        sort: 'time_desc',
        map: 'announce'
      });
    }
  })

  bot.addCommand('team', {
    usage: '.team [code] games',
    help: "show team games",
    args: /^(\w\w\w)\s+games$/,
    action: function(from,respond,code) {
      var team = data.codes[code.toUpperCase()];
      if(!team) return respond('no such team',code.toUpperCase());
      listMatches(respond,{
        filter: function(n) {
          return n.team1==team || n.team2 == team;
        },
        sort: 'time_desc',
        map: 'announce'
      });
    }
  });

  
   bot.addCommand('group', {
    usage: '.group [letter] if [gamenum score1 score2]...',
    help: "show group standings if...",
    args: /^([a-hA-H])(?:\s+if)?((?:\s+\d\d?\W+\d\d?\W+\d\d?)+)$/,
    action: function(from,respond,grp,games) {
      grp = grp.toUpperCase().charCodeAt(0)-65;
      var group = data.groups[grp];
      
      var teams = JSON.parse(JSON.stringify(data.teams));
      
      games = games.trim().split(/\D+/);
      var rejected = [];
      
      while(games.length) {
        var g = games.shift(),score1=games.shift(),score2=games.shift();
        var n = data.matches[g-1];
        if (!n) {
          rejected.push(n.id+' (no such game)');
        } else if (n.stage!=0 || n.team1.group_id != group.id) {
          rejected.push(n.id+' (not in group '+group.id+')');
        } else if (n.score1 && n.score2 !== undefined) {
          rejected.push(n.id+' (already recorded)');
        } else {
          scoreGame(teams[n.team1_id-1],teams[n.team2_id-1],score1,score2);
        }
      }
      respond(
        teams
        .filter(function(n) {
          return n.group_id == group.id;
        })
        .sort(function(a,b) {
          if (a.pt != b.pt) return b.pt-a.pt;
          if (a.gd != b.gd) return b.gd-a.gd;
          if (a.gf != b.gf) return b.gf-a.gf;
          
          return 0;
        })
        .map(function(n) {
          return [n.flag, n.code, n.gp, '('+n.gf+'-'+n.ga+')', n.pt].join(' ');
        })
        .join(' | ') + (rejected.length ? ' | rejected: '+rejected.join(', ') : '')
      );
    }
  })

   bot.addCommand('group', {
    usage: '.group [letter] now',
    help: "show group standings with current scores",
    args: /^([a-hA-H])\s+now$/,
    action: function(from,respond,grp,games) {
      grp = grp.toUpperCase().charCodeAt(0)-65;
      var group = data.groups[grp];
      
      var teams = JSON.parse(JSON.stringify(data.teams));
      
      for (var i in currentMatches) {
        var cur = currentMatches[i];
        var n = data.matches[cur.id-1];
        var team1 = teams[n.team1.id-1];
        var team2 = teams[n.team2.id-1]
        if (n.stage == 0) {
          scoreGame(team1,team2,cur.score1,cur.score2);
          console.log(team1.code,cur.score1,team2.code,cur.score2);
        }
      }
      
      respond(
        teams
        .filter(function(n) {
          return n.group_id == group.id;
        })
        .sort(function(a,b) {
          if (a.pt != b.pt) return b.pt-a.pt;
          if (a.gd != b.gd) return b.gd-a.gd;
          if (a.gf != b.gf) return b.gf-a.gf;
          
          return 0;
        })
        .map(function(n) {
          return [n.flag, n.code, n.gp, '('+n.gf+'-'+n.ga+')', n.pt].join(' ');
        })
        .join(' | ')
      );
    }
  })


  var polling = false;
  var currentMatch = null;
  var lastRes = '';
  var homeReported = 0;
  var awayReported = 0;
  
  if (conf.scrapeCurrent) setInterval(scrapeCurrent,60000);
  bot.client.on('join',scrapeCurrent);
  
  var showEvent = {
    'yellow-card': '\u00038▉\u000f',
    'yellow-card-second': '\u00038▉\u000f\u00034▉\u000f',
    'red-card': '\u00034▉\u000f',
    'substitution-in': '\u00033▲\u000f',
    'substitution-in halftime': '\u00033▲\u000f HT',
    'substitution-out': '\u00034▼\u000f',
    'substitution-out halftime': '\u00034▼\u000f HT',
    'goal': 'GOAAAAAAL!!!',
    'goal-penalty': 'PENALTY CONVERTED!',
    'penalty-wrong': 'PENALTY FORFEITED!',
    'goal-own': 'OWN GOAL! Awww...',
  }
  
  var currentMatches = {};
  
  function beginCurrentMatch(obj) {
    var cur = currentMatches[obj.match_number] = {
      id: obj.match_number,
      team1: data.codes[obj.home_team.code],
      team2: data.codes[obj.away_team.code],
      score1: 0,
      score2: 0,
      reported1: obj.home_team_events.length,
      reported2: obj.home_team_events.length,
    }
    bot.say(data.matches[obj.match_number-1].descf+' has started');
  }
  
  function progressCurrentMatch(cur,obj) {
    var events = [];
    while (cur.reported1 < obj.home_team_events.length) {
      var e = obj.home_team_events[cur.reported1];
      bot.say(e.time.replace(/^(45|90)(\d)/,'$1+$2')+"' "+cur.team1.flag+' '+e.player+' '+(showEvent[e.type_of_event]||e.type_of_event));
      cur.reported1++;
    }
    while (cur.reported2 < obj.away_team_events.length) {
      var e = obj.away_team_events[cur.reported2];
      bot.say(e.time.replace(/^(45|90)(\d)/,'$1+$2')+"' "+cur.team2.flag+' '+e.player+' '+(showEvent[e.type_of_event]||e.type_of_event));
      cur.reported2++;
    }
    if(cur.score1!= obj.home_team.goals || cur.score2 != obj.away_team.goals || cur.penalties1!= obj.home_team.penalties || cur.penalties2 != obj.away_team.penalties ) {
      cur.score1 = obj.home_team.goals;
      cur.score2 = obj.away_team.goals;
      
      if ('penalties' in obj.home_team) {
        cur.penalties1 = obj.home_team.penalties|0;
        cur.penalties2 = obj.away_team.penalties|0;
        bot.say(cur.team1.flag +' ' + cur.team1.code + ' ' + cur.score1 + ' ('+cur.penalties1+'-' +cur.penalties2+') ' +cur.score2 + ' ' + cur.team2.code+' '+cur.team2.flag);
        
      } else {
        bot.say(cur.team1.flag +' ' + cur.team1.code + ' ' + cur.score1 + '-' +cur.score2 + ' ' + cur.team2.code+' '+cur.team2.flag);
      }    
      var g = groupPredicts(cur).grouped.filter(function(n) {
        return n.score1>=cur.score1 && n.score2>=cur.score2;
      })
      if (g.length == 0) {
        bot.say('You all suck.');
      } else {
        var ret = 'Still not wrong: ';
        g.forEach(function(n) {
          var t = n.score1+'-'+n.score2+' '+n.players.join(', ')+' |';
          if (sizeof(ret+t)>430) bot.say(ret), ret='';
          else ret+=' '+t;
        })
        bot.say(ret);
      }
    }
  }
  
  function endCurrentMatch(cur) {
    scrapeMatches(function() {
      delete currentMatches[cur.id];
      var m = data.matches[cur.id-1];
      bot.say(m.descf+' FT');
      var p1 = [];
      var p3 = [];
      
      var g = groupPredicts(m).grouped;
      for (var i in g) {
        var p = g[i];
        switch(scorePoints(m,p)) {
        case 3:
          p3 = p3.concat(p.players);
          break;
        case 1:
          p1 = p1.concat(p.players);
        }
      }
      
      bot.say ('3 points for '+(p3.join(', ')||'nobody') + ', 1 point for '+(p1.join(', ')||'nobody'));
    })
  }

  function processCurrentMatch(arr) {
    var obj = {};
    arr.forEach(function(n){ obj[n.match_number]=n;});
    for (var i in currentMatches) {
      if (!obj[i]) endCurrentMatch(currentMatches[i]);
    }
    for (var i in obj) {
      if (!currentMatches[i]) beginCurrentMatch(obj[i]);
      progressCurrentMatch(currentMatches[i],obj[i]);
    }
  }
  
  function scrapeCurrent(){
    bot.wget('http://worldcup.sfg.io/matches/current',function (err,ret,res) {
      //console.log(lastRes,res);
      if (err) { console.log(err); return; }
      if (res == lastRes) return;
      lastRes = res;
      try { 
        var arr = JSON.parse(res);
        processCurrentMatch(arr);
        scrapeMatches();
       } catch(e) { console.log(e); return };
      return;
    });
  }
  
  function incStat(obj,s,n) {
    obj.stat[s]|=0;
    obj.stat[s]+=(n===undefined ? 1 : n);
  }
  
  function scrapeMatches(cb) {
    bot.wget('http://worldcup.sfg.io/matches',function (err,ret,res) {
      if (err) return;
      try { res = JSON.parse(res) } catch(e) { console.log(e); return };
      var footballers = {};
      data.teams.forEach(function(n){
        n.stat={};
      })
      res.forEach(function(n) {
        try {
          var team1 = data.codes[n.home_team.code];
          var team2 = data.codes[n.away_team.code];
          if (!team1 || !team2) return;
          var m = data.matches[n.match_number-1];
          if (!m) return;
          //console.log(n.home_team.code,n.away_team.code,moment(n.datetime).fromNow());
          
          var set = {
            id: n.match_number,
            team1: team1,
            team1_id: team1.id,
            team2: team2,
            team2_id: team2.id,
          }
          //for (var i in set) m[i] = set[i];
          
          delete m.partial1;
          delete m.partial2;
          delete m.score1;
          delete m.score2;
          if (n.status == 'completed') {
            m.score1 = n.home_team.goals;
            m.score2 = n.away_team.goals;
            if ('penalties' in n.home_team) {
              m.penalties1 = n.home_team.penalties;
              m.penalties2 = n.away_team.penalties;
            }
          } else if (n.status == 'in progress') {
            //m.partial1 = n.home_team.goals;
            //m.partial2 = n.away_team.goals;
          }
          if (n.status!='future') {
            var playerEventMap = {
              'yellow-card': 'yc yc1',
              'yellow-card-second': 'yc yc2 rc',
              'red-card': 'rc rc1',
              'goal': 'gf',
              'goal-own': 'og',
              'goal-penalty': 'pk pk1 gf',
              'penalty-wrong': 'pk pk0',
            }
            
            function playerEvent(e,team1,team2) {
              var m = playerEventMap[e.type_of_event];
              if (m) {
                var name = e.player.toLowerCase().replace(/((^|\s).)/g, function(m,m1) {
                  return m1.toUpperCase();
                })
                var pid = team1.id +'|'+name;
                if (!footballers[pid]) {
                  footballers[pid] = {
                    team:team1,
                    team_id:team1.id,
                    name: name,
                    stat: {
                    },
                  }
                }
                m.split(/\s+/).forEach(function(s){
                  incStat(footballers[pid],s);
                  if (s=='gf') return;
                  incStat(team1,s);
                  incStat(team2,s+'_a');
                })
              }
            }
            n.home_team_events.forEach(function(e){
              playerEvent(e,m.team1,m.team2)
            })
            n.away_team_events.forEach(function(e){
              playerEvent(e,m.team2,m.team1)
            })
            incStat(m.team1,'gp');
            incStat(m.team2,'gp');
            incStat(m.team1,'gf',m.score1);
            incStat(m.team2,'gf',m.score2);
            incStat(m.team1,'ga',m.score2);
            incStat(m.team2,'ga',m.score1);
            if (m.score1 > m.score2) {
              incStat(m.team1,'w');
              incStat(m.team2,'l');
              incStat(m.team1,'pt',3);
            } else if (m.score2 > m.score1) {
              incStat(m.team1,'l');
              incStat(m.team2,'w');
              incStat(m.team2,'pt',3);
            } else {
              incStat(m.team1,'d');
              incStat(m.team2,'d');
              incStat(m.team1,'pt',1);
              incStat(m.team2,'pt',1);
            }
          }
        } catch(e) {
          console.log(e);
        }
      })
      data.footballers = [];
      for(var i in footballers) data.footballers.push(footballers[i]);

      console.log(res.length,'mathes scraped, gonna crunch');
      crunchData(bot);
      cb && cb();
    })
  }
  
  predictWarning = function (m) {
    console.log('timeout',m.desc);
    bot.say(m.desc + ' is starting '+m.moment.fromNow());
    var missing = Object.keys(data.players).filter(function (n) {
      return !bot.state.wc.predict[n][m.id]
    })
    .map(function(n) {
      if (bot.state.wc.warn[n]=='off') return convolute(n);
      return n;
    })
    .join(', ')
    bot.say('Players without predictions for the match: '+missing);
  }
  readData(bot);
  
  setTimeout(scrapeMatches,4000);
}

var predictWarning;

var dataIsRead = false;

var TBD = {
  code : 'TBD',
  id: -1,
  name: 'To be declared',
  flag: '\u00032,0\u0002 ? \u000f',
}
TBD.descl = TBD.flag + ' '+TBD.code;
TBD.descr = TBD.code + ' '+TBD.flag;

function readData(bot) {
  if (dataIsRead) throw 'multiple data read';
  dataIsRead = true;
  data = {
    teams: require('./wc.team.json').data,
    groups: require('./wc.group.json').data,
    matches: require('./wc.match.json').data,
    venues: require('./wc.venue.json').data,
    bracket: require('./wc.team_bracket.json').data,
  }
  
  data.codes = {};
  data.teams.forEach(function(n){
    data.codes[n.code] = n;
    n.stat = {};
    n.gp = n.gf = n.ga = n.gd = n.pt = n.w = n.l = n.d = 0;
    n.flag = n.flag.replace(/ /g,'\u00a0');
    n.descl = n.flag + ' '+n.code;
    n.descr = n.code + ' '+n.flag;
  })

  data.labels = {};
  data.bracket.forEach(function(n){
    data.labels[n.label] = n.label;
  })
  
  data.matches.forEach(function(n) {
    if (n.stage==0) {
      n.team1 = data.teams[n.team1_id-1];
      n.team2 = data.teams[n.team2_id-1];
      n.label1 = n.team1.code;
      n.label2 = n.team2.code;
    } else {
      n.team1 = TBD;
      n.team2 = TBD;
      n.tbd1 = n.label1 = data.bracket[n.team1_id-1].label;
      n.tbd2 = n.label2 = data.bracket[n.team2_id-1].label;
      n.team1_id = -1;
      n.team2_id = -1;
    }
    
    n.venue = data.venues[n.venue_id-1];
    n.moment = moment(n.kickoff+' '+n.venue.tz_offset);
    
    
    var ms = n.moment.diff(Date.now(),'ms') - 15 * 60 * 1000;
    if (ms > 0) {
      n.timeout = setTimeout(predictWarning.bind(this,n),ms);
      console.log('setting timeout',n.team1.code,n.team2.code,ms)
    }
  });
  console.log('data read, gonna crunch');
  crunchData(bot);
}

function crunchData(bot) {

  var players = data.players = {};
  var predict = bot.state.wc.predict;

  data.teams.forEach(function(n){
    n.gp = n.gf = n.ga = n.gd = n.pt = n.w = n.l = n.d = 0;
  })

  data.matches.forEach(function(n) {
    var res = bot.state.wc.results[n.id];
    if (res) {
      n.score1 = res.score1 = res.score1|0;
      n.score2 = res.score2 = res.score2|0;
      if ('penalties1' in res) {
        n.penalties1 = res.penalties1 = res.penalties1|0;
        n.penalties2 = res.penalties2 = res.penalties2|0;
      }
    }

    if (n.tbd1) {
      var tbd1 = bot.state.wc.tbd[n.tbd1];
      if (tbd1) {
        n.team1_id = tbd1;
        n.team1 = data.teams[n.team1_id-1];
        n.label1 = n.team1.code;
        delete n.tbd1;
      }
    }

    if (n.tbd2) {
      var tbd2 = bot.state.wc.tbd[n.tbd2];
      if (tbd2) {
        n.team2_id = tbd2;
        n.team2 = data.teams[n.team2_id-1];
        n.label2 = n.team2.code;
        delete n.tbd2;
      }
    }
  
    n.idf = '\u0002'+n.id+' \u0002';
  
    if (n.score1 !==undefined && n.score2 !== undefined) {
      if ('penalties1' in n) {
        n.descs = n.team1.code+' ' + n.score1+ '-' +n.score2+' '+n.team2.code;
        n.desc = '('+n.id+') '+ n.descs;
        n.descf = n.idf + n.team1.descl+' \u0002'+n.score1+' ('+n.penalties1+'-'+n.penalties2+') '+n.score2+'\u0002 '+n.team2.descr;
      } else {
        n.descs = n.team1.code+' ' + n.score1+ '-' +n.score2+' '+n.team2.code;
        n.desc = '('+n.id+') '+ n.descs;
        n.descf = n.idf + n.team1.descl+' \u0002'+n.score1+'-'+n.score2+'\u0002 '+n.team2.descr;
      }
      if (n.stage == 0) {
        scoreGame(n.team1,n.team2,n.score1,n.score2);
      }
      
      for (var a in predict) {
        var p = predict[a][n.id];
        if (!p) continue;
        var pl = players[a];
        if (!pl) pl = players[a] = {
          name: a,
          slug: convolute(a),
          pt: 0,
          gp: 0,
          gd: 0,
          w3: 0,
          w1: 0,
          w0: 0
        }
        
        pl.gp ++;
        pl.gd += Math.abs(p.score1-n.score1) + Math.abs(p.score2-n.score2);
        
        if (p.score1 == n.score1 && p.score2 == n.score2) {
          pl.pt+=3;
          pl.w3++;
        } else if (
           p.score1 > p.score2 && n.score1 > n.score2
        || p.score1 < p.score2 && n.score1 < n.score2
        || p.score1 == p.score2 && n.score1 == n.score2
        ) {
          pl.pt++;
          pl.w1++;
        } else {
          pl.w0++;
        }
      }
    } else {
      n.descs = n.team1.code+'-'+n.team2.code;
      n.desc = '('+n.id+') '+ n.descs;
      n.descf = n.idf + n.team1.flag + ' '+n.label1+'-'+n.label2+' '+n.team2.flag;
    }
  })
  //console.log(data.teams);
  data.playerList = Object.keys(players).map(function(n){return players[n]});
  
  }

function convolute(s) {
  if (s.length==1) return '_'+s+'_'
  return s.slice(0,-1) + '\u200d' + s.slice(-1);
}

function scoreGame(team1,team2,score1,score2) {
  score1|=0;
  score2|=0;
  team1.gp = (0|team1.gp) + 1;
  team2.gp = (0|team2.gp) + 1;

  team1.gf = (0|team1.gf) + score1;
  team1.ga = (0|team1.ga) + score2;
  team1.gd = team1.gf - team1.ga;

  team2.gf = (0|team2.gf) + score2;
  team2.ga = (0|team2.ga) + score1;
  team2.gd = team2.gf - team2.ga;
  
  team1.pt |= 0;
  team2.pt |= 0;
  
  if (score1 > score2) {
    team1.pt +=3;
    team1.w++;
    team2.l++;
  } else if (score1 < score2 ) {
    team2.pt +=3;
    team1.l++;
    team2.w++;
  } else {
    team1.d++;
    team2.d++;
    team1.pt +=1;
    team2.pt +=1;
  }
}

function scorePoints(m,p) {
  if (m.score1 == p.score1 && m.score2 == p.score2) return 3
  if (
      m.score1 == m.score2 && p.score1 == p.score2 
  ||  m.score1 < m.score2 && p.score1 < p.score2 
  ||  m.score1 > m.score2 && p.score1 > p.score2 
  ) return 1;
  return 0;
}
