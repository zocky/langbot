var moment = require('moment');
var fs = require('fs');

var data;

exports.setup = function(bot,conf) {

  readData(bot);

  bot.state.wc = bot.state.wc || {};
  bot.state.wc.results = bot.state.wc.results || {};
  bot.state.wc.predict = bot.state.wc.predict || {};
  bot.state.wc.admins = bot.state.wc.admins || bot.config.modules.wc.admins || [];
  bot.save();
  

  bot.addCommand('next', {
    usage: '.next',
    help: "list forthcoming games",
    action: function(from,respond,text,cmd) {
      respond(
        data.matches
        .filter(function(n) {
          return n.moment.diff(Date.now(),'hours',true) > -2;
        })
        .sort(function(a,b) {
          return a.moment.diff(b.moment);
        })
        .slice(0,5)
        .map(function(n) {
          return n.desc + ' '+n.moment.fromNow();
        })
        .join(' | ')
      );
    }
  })

  bot.addCommand('last', {
    usage: '.predict',
    help: "list recent games",
    action: function(from,respond,text,cmd) {
      respond(
        data.matches
        .filter(function(n) {
          return n.moment.diff(Date.now(),'hours',true) < -2;
        })
        .sort(function(a,b) {
          return -a.moment.diff(b.moment);
        })
        .slice(0,5)
        .map(function(n) {
          return n.desc;
        })
        .join(' | ')
      );
    }
  })


  bot.addCommand('team', {
    usage: '.team CODE',
    help: "identify team",
    action: function(from,respond,text,q) {
      if (typeof q != 'string' || q!='*' && q.length < 2 ) return respond('not enough input.');
      respond(
        data.teams
        .filter(function(n) {
          return q=='*' || (n.code+' '+n.name).toLowerCase().indexOf(String(q).toLowerCase())>-1;
        })
        .map(function(n) {
          return (n.flag||'') + ' ' +n.code+' '+n.name +', group '+String.fromCharCode(64+n.group_id);
        })
        .join(' | ') || 'nothing found.'
      );
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


/*
  bot.addCommand('games', {
    usage: '.games',
    help: "list all games",
    action: function(from,respond,text,cmd) {
      data.matches
      .sort(function(a,b) {
        return a.kickoff.diff(b.kickoff);
      })
      .map(function(n) {
        return '['+n.id+'] '+n.team1.code+'-'+n.team2.code + ', ' + n.venue.city +' '+ n.kickoff.fromNow();
      })
      .forEach(function(n){
        respond.print(n);
      });
      respond.flush();
    }
  })
*/
  bot.addCommand('record', {
    usage: '.record',
    help: "list unrecorded games",
    allow: function() {
      return bot.state.wc.admins;
    },
    action: function(from,respond,text,cmd) {
      respond.print('games without recorded results:');
      data.matches
      .filter(function(n) {
        return n.moment.diff(Date.now(),'hours',true) < 2 && (n.score1 || n.score2) === undefined;
      })
      .sort(function(a,b) {
        return a.moment.diff(b.moment);
      })
      .map(function(n) {
        return n.desc;
      })
      .forEach(function(n) {
        respond.print(n);
      });
      respond.flush();
    }
  })


  bot.addCommand('record', {
    usage: '.record',
    help: "record game result",
    args: /^(\d\d?) (\d\d?)[ :\-](\d\d?)$/,
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
      
      bot.save();
      readData(bot);
      respond.flush('Recorded ' + n.desc);
    }
  })

  bot.addCommand('record', {
    usage: '.record',
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
      
      bot.save();
      readData(bot);
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
      respond.flushAll();
    }
  })

  bot.addCommand('score', {
    usage: '.score gd',
    help: "show prediction game goal differences",
    args: /^gd$/,
    action: function(from,respond) {
      data.playerList
      .filter(function(n){
        return n.gp>2;
      })
      .sort(function(a,b) {
        return a.gd/a.gp - b.gd/b.gp;
      })
      .forEach(function(n,i){
        respond.print( ''+(i+1) +'\u00a0'+n.slug+'\u00a0'+(n.gd/n.gp).toFixed(2)+' |');
      })
      respond.flushAll();
    }
  })


  bot.addCommand('predict', {
    usage: '.predict',
    help: "list your predictions",
    args: /^$/,
    msgonly: true,
    allow: 'loggedin',
    action: function(from,respond) {
      var a = respond.account;
      var st = bot.state.wc.predict[a];
      if (!st) return respond('You have made no predictions yet, '+a);
      
      respond(
        a + ' predicts ' + (
          data.matches
          .filter(function(n) {
            return st[n.id] && (n.score1 && n.score2) === undefined;
          })
          .sort(function(a,b) {
            return a.moment.diff(b.moment);
          })
          .map(function(n) {
            return n.desc + ' ['+ st[n.id].score1+'-'+st[n.id].score2+']';
          })
          .join(' | ') || 'nothing at the moment.'
        )
      );
    }
  })

  bot.addCommand('predict', {
    usage: '.predict [game]',
    help: "show predictions for the game",
    args: /^(\d\d?)$/,
    action: function(from,respond,id) {
      var n = data.matches[id-1];
      if (!n) return respond ('No such game '+id+'.');
      var ret = [];
      var predict = bot.state.wc.predict;
      var res = {};
      
      var future = n.moment.diff() > 0;
      
      var total = 0, total1 = 0, total2 = 0;
                  
      for (var i in predict) {
        var p = predict[i][n.id];
        if(!p) continue;
        total++;
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
      
      respond.print(
        'Predictions for ' + n.desc + ': ' 
        + (total1/total).toFixed(1)+'-'+(total2/total).toFixed(1)+' (total '+total+') | '
      );
      ret
      .sort(function(a,b) {
        return (a.score2-a.score1)-(b.score2-b.score1) || (a.score1 > a.score2 ? b.score1 - a.score1 : a.score1 - b.score1);
      })
      .forEach(function(m) {
        if (future) respond.print(m.score+' '+ m.players.length + '× | ');
        else if (n.partial1 && n.partial2 !== undefined) {
          if (m.score1 < n.partial1 || m.score2 < n.partial2) {
            respond.print('\u000304'+m.score+' '+ m.players.join(', ')+'\u000f | ');
          } else if (m.score1 == n.partial1 && m.score2 == n.partial2) {
            respond.print('\u000303'+m.score+' '+ m.players.join(', ')+'\u000f | ');
          } else {
            respond.print(m.score+' '+ m.players.join(', ')+' | ');
          }
        }
      })
      respond.flushAll();
    }
  })

  bot.addCommand('predict', {
    msgonly: true,
    allow: 'loggedin',
    usage: '.predict [game] [score1] [score2]',
    help: "predict result",
    args: /^(\d\d?) (\d\d?)[\-: ](\d\d?)$/,
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
        respond.flush(a+' changes prediction ' + n.desc + ' ['+old.score1+'-'+old.score2+'] to ['+score1+'-'+score2+']');
      } else {
        respond.flush(a+' predicts ' + n.desc + ' ['+score1+'-'+score2+']');
      }
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
      respond(
        data.matches
        .filter(function(n) {
          return n.stage == 0 && n.team1.group_id == group.id;
        })
        .sort(function(a,b) {
          return a.moment.diff(b.moment);
        })
        .map(function(n) {
          return n.desc + ' '+n.moment.fromNow();
        })
        .join(' | ')
      );
    }
  })
  
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

  var polling = false;
  var currentMatch = null;
  var lastRes = '';
  var homeReported = 0;
  var awayReported = 0;
  
  setInterval(scrapeCurrent,60000);
  bot.client.on('join',scrapeCurrent);
  
  var showEvent = {
    'yellow-card': '\u00030,8  \u000f',
    'red-card': '\u00030,4  \u000f',
    'substitution-in': '\u00033▲\u000f',
    'substitution-out': '\u00034▼\u000f',
    'goal': 'GOAAAAAAL'
  }
  
  function scrapeCurrent(){
    bot.wget('http://worldcup.sfg.io/matches/current',function (err,ret,res) {
      console.log(lastRes,res);
      if (err) { console.log(err); return; }
      if (res == lastRes) return;
      lastRes = res;
      try { res = JSON.parse(res) } catch(e) { console.log(e); return };
      var cur = res[0];

      if (!currentMatch && cur) {
        currentMatch = data.matches[cur.match_number-1];
        currentMatch.partial1 = cur.home_team.goals;
        currentMatch.partial2 = cur.away_team.goals;
        bot.say(currentMatch.desc+' has started');
        homeReported = 0;
        awayReported = 0;
      } else if (currentMatch && cur){
        if(currentMatch.partial1!= cur.home_team.goals || currentMatch.partial2 != cur.away_team.goals) {
          currentMatch.partial1 = cur.home_team.goals;
          currentMatch.partial2 = cur.away_team.goals;
          bot.say(currentMatch.desc+' the score is now: '+cur.home_team.goals+'-'+cur.away_team.goals);
        }
      } else if (currentMatch && !cur) {
        currentMatch.score1 = currentMatch.partial1;
        currentMatch.score2 = currentMatch.partial2;
        delete currentMatch.partial1;
        delete currentMatch.partial2;
        crunchData();
        bot.say(currentMatch.desc+' has ended.');
        currentMatch = null;
      }
      if (cur) {
        while (homeReported < cur.home_team_events.length) {
          var e = cur.home_team_events[homeReported];
          bot.say(e.time+"' "+currentMatch.team1.flag+' '+e.player+' '+(showEvent[e.type_of_event]||e.type_of_event));
          homeReported++;
        }
        while (awayReported < cur.away_team_events.length) {
          var e = cur.away_team_events[awayReported];
          bot.say(e.time+"' "+currentMatch.team2.flag+' '+e.player+' '+(showEvent[e.type_of_event]||e.type_of_event));
          awayReported++;
        }
      }
    })
  }
  
  function scrapeMatches() {
    bot.wget('http://worldcup.sfg.io/matches',function (err,ret,res) {
      if (err) return;
      try { res = JSON.parse(res) } catch(e) { console.log(e); return };
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
          } else if (n.status == 'in progress') {
            m.partial1 = n.home_team.goals;
            m.partial2 = n.away_team.goals;
          }
        } catch(e) {
          console.log(e);
        }
      })
      console.log('data scraped, gonna crunch');
      crunchData(bot);
    })
  }
  setTimeout(scrapeMatches,4000);
}


function readData(bot) {
  data = {
    teams: require('./wc.team.json').data,
    groups: require('./wc.group.json').data,
    matches: require('./wc.match.json').data,
    venues: require('./wc.venue.json').data,
  }
  
  data.codes = {};
  data.teams.forEach(function(n){
    data.codes[n.code] = n;
    n.gp = n.gf = n.ga = n.gd = n.pt = n.w = n.l = n.d = 0;
  })
  
  data.matches.forEach(function(n) {
    var res = bot.state.wc.results[n.id];
    if (res) {
      n.score1 = res.score1 = res.score1|0;
      n.score2 = res.score2 = res.score2|0;
    }
  });
  console.log('data read, gonna crunch');
  crunchData(bot);
}

function crunchData(bot) {

  var score = data.score = {}
  var players = data.players = {};
  var predict = bot.state.wc.predict;

  data.teams.forEach(function(n){
    n.gp = n.gf = n.ga = n.gd = n.pt = n.w = n.l = n.d = 0;
  })

  data.matches.forEach(function(n) {
    n.team1 = data.teams[n.team1_id-1];
    n.team2 = data.teams[n.team2_id-1];
    n.venue = data.venues[n.venue_id-1];
    n.moment = moment(n.kickoff+' '+n.venue.tz_offset);
    if (n.score1 !==undefined && n.score2 !== undefined) {
      n.desc = '('+n.id+') '+ n.team1.code+' ' + n.score1+ '-' +n.score2+' '+n.team2.code;
      if (n.stage == 0) {
        scoreGame(n.team1,n.team2,n.score1,n.score2);
      }
      
      for (var a in predict) {
        var p = predict[a][n.id];
        if (!p) continue;
        score[a]|=0;
        var pl = players[a];
        if (!pl) pl = players[a] = {
          name: a,
          slug: convolute(a),
          pt: 0,
          gp: 0,
          gd: 0
        }
        
        pl.gp ++;
        pl.gd += Math.abs(p.score1-n.score1) + Math.abs(p.score2-n.score2);
        
        if (p.score1 == n.score1 && p.score2 == n.score2) score[a]+= 3, pl.pt+=3;
        else if (
           p.score1 > p.score2 && n.score1 > n.score2
        || p.score1 < p.score2 && n.score1 < n.score2
        || p.score1 == p.score2 && n.score1 == n.score2
        ) score[a] ++, pl.pt++;
      }
    } else {
      n.desc = '('+n.id+') '+ n.team1.code+' - '+n.team2.code;
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


