var moment = require('moment');
var fs = require('fs');

var data;

exports.setup = function(bot) {

  readData(bot);
  var accs = {};
  var timeouts = {};

  function acc(nick,respond,cb) {
    if (accs[nick]) return respond('Still validating your last request. Please try later.');
    accs[nick] = cb;
    timeouts[nick] = setTimeout(function() {
      respond('Failed to validate '+nick+'. Please try again in a few moments.')
      delete accs[nick];
      delete timeouts[nick];
    },5000)
    bot.say('NickServ','ACC '+nick+' *');
  }
  
  bot.client.on('notice',function(nick,to,text) {
    if (nick != 'NickServ') return;
    var m = text.match(/^(\S+) -> (\S+) ACC (\d)/);
    if (!m) return;
    var nick = m[1], account = m[2] == '*' ? null : m[2];
    if (timeouts[nick]) {
      clearTimeout(timeouts[nick]);
      delete timeouts[nick];
    }
    if (!accs[nick]) return;
    accs[nick](account);
    delete accs[nick];
  })


  bot.state.wc = bot.state.wc || {};
  bot.state.wc.results = bot.state.wc.results || {};
  bot.state.wc.predict = bot.state.wc.predict || {};
  bot.state.wc.admins = {
    zocky: true,
    felipe: true,
    dmlloyd: true,
    jstraw: true
  };
  if (bot.config.master) bot.state.wc.admins[bot.config.master] = true;

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
          return (n.flag||'') + ' ' +n.code+' '+n.name;
        })
        .join(' | ') || 'nothing found.'
      );
    }
  })

  bot.addCommand('flags', {
    usage: '.flags',
    help: "show all flags",
    action: function(from,respond,text,q) {
      respond(
        data.teams
        .map(function(n) {
          return (n.flag||'') + ' ' +n.code;
        })
        .join(' | ') || 'nothing found.'
      );
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
    usage: '.games',
    help: "record game result",
    args: /^(\d\d?) (\d\d?)[ :\-](\d\d?)$/,
    action: function(from,respond,id,score1,score2) {
      acc(from,respond,function(a) {
        var n = data.matches[id-1];
        if (!a) return respond('Please login with NickServ first.');
        if (!bot.state.wc.admins[a]) return respond('You are not allowed to record scores.');
        
        if (!n) return respond ('no such game '+id);
        
        bot.state.wc.results[id] = {
          score1: score1|0,
          score2: score2|0
        }
        
        bot.save();
        readData(bot);
        respond.flush('Recorded ' + n.desc);
      });
    }
  })

  bot.addCommand('score', {
    usage: '.score',
    help: "show prediction game scores",
    args: /^$/,
    action: function(from,respond) {
      var ret = [];
      for (var i in data.score) ret.push({name:i,score:data.score[i]});
      respond(
        ret
        .filter(function(n){
          return n.score>0;
        })
        .sort(function(a,b) {
          return b.score-a.score;
        })
        .map(function(n,i){
          return '#'+(i+1) +' '+n.name+'_'+n.score+'';
        }).join(' | ')
      );
    }
  })


  bot.addCommand('predict', {
    usage: '.predict',
    help: "list your predictions",
    args: /^$/,
    action: function(from,respond) {
      acc(from,respond,function(a) {
        if (!a) return respond('Please login with NickServ first.');
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
      });
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
      for (var i in predict) {
        if (predict[i][n.id]) ret.push(i+'_'+predict[i][n.id].score1+'-'+predict[i][n.id].score2+'');
      }
      respond('Predictions for ' + n.desc + ': ' + ret.sort().join(' ') || 'none yet.');
    }
  })

  bot.addCommand('predict', {
    usage: '.predict [game] [score1] [score2]',
    help: "predict result",
    args: /^(\d\d?) (\d\d?)[\-: ](\d\d?)$/,
    action: function(from,respond,id,score1,score2) {
      acc(from,respond,function(a) {
        var n = data.matches[id-1];
        if (!a) return respond('Please login with NickServ first.');
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
        readData(bot);
        if (old) {
          respond.flush(a+' changes prediction ' + n.desc + ' ['+old.score1+'-'+old.score2+'] to ['+score1+'-'+score2+']');
        } else {
          respond.flush(a+' predicts ' + n.desc + ' ['+score1+'-'+score2+']');
        }
      });
    }
  })

  bot.addCommand('group', {
    usage: '.group [letter]',
    help: "list unrecorded games",
    args: /^([a-hA-H])$/,
    action: function(from,respond,grp) {
      grp = grp.toUpperCase().charCodeAt(0)-65;
      var group = data.groups[grp];
      
      respond(
        data.teams
        .filter(function(n) {
          return n.group == group;
        })
        .sort(function(a,b) {
          if (a.pt != b.pt) return b.pt-a.pt;
          if (a.gd != b.gd) return b.gd-a.gd;
          if (a.gf != b.gf) return b.gf-a.gf;
          
          return 0;
        })
        .map(function(n) {
          console.log(n);
          return [n.flag, n.code, n.gp, '('+n.gf+'-'+n.ga+')', n.pt].join(' ');
        })
        .join(' | ')
      );
    }
  })
}


function readData(bot) {
  data = {
    teams: require('./wc.team.json').data,
    groups: require('./wc.group.json').data,
    matches: require('./wc.match.json').data,
    venues: require('./wc.venue.json').data,
  }
  
  var score = data.score = {}
  var predict = bot.state.wc.predict;

  data.codes = {};
  data.teams.forEach(function(n){
    data.codes[n.code] = n;
    n.gp = n.gf = n.ga = n.gd = n.pt = n.w = n.l = n.d = 0;
    n.group = data.groups[n.group_id-1];
  })

  data.matches.forEach(function(n) {
    n.team1 = data.teams[n.team1_id-1];
    n.team2 = data.teams[n.team2_id-1];
    n.venue = data.venues[n.venue_id-1];
    n.moment = moment(n.kickoff+' '+n.venue.tz_offset);
    var res = bot.state.wc.results[n.id];
    
    
    if (res) {
      n.score1 = res.score1 = res.score1|0;
      n.score2 = res.score2 = res.score2|0;
      n.desc = '('+n.id+') '+ n.team1.code+' ' + n.score1+ '-' +n.score2+' '+n.team2.code;
      
      if (n.stage == 0) {
        n.team1.gp = (0|n.team1.gp) + 1;
        n.team2.gp = (0|n.team2.gp) + 1;

        n.team1.gf = (0|n.team1.gf) + n.score1;
        n.team1.ga = (0|n.team1.ga) + n.score2;
        n.team1.gd = n.team1.gf - n.team1.ga;

        n.team2.gf = (0|n.team2.gf) + n.score2;
        n.team2.ga = (0|n.team2.ga) + n.score1;
        n.team2.gd = n.team2.gf - n.team2.ga;
        
        n.team1.pt |= 0;
        n.team2.pt |= 0;
        
        if (n.score1 > n.score2) {
          n.team1.pt +=3;
          n.w++;
        } else if (n.score1 < n.score2 ) {
          n.team2.pt +=3;
          n.l++;
        } else {
          n.d++;
          n.team1.pt +=1;
          n.team2.pt +=1;
        }
      }
      
      for (var a in predict) {
        var p = predict[a][n.id];
        if (!p) continue;
        score[a]|=0;
        if (p.score1 == n.score1 && p.score2 == n.score2) score[a] += 3;
        else if (
           p.score1 > p.score2 && n.score1 > n.score2
        || p.score1 < p.score2 && n.score1 < n.score2
        || p.score1 == p.score2 && n.score1 == n.score2
        ) score[a] ++;
      }
    } else {
      n.desc = '('+n.id+') '+ n.team1.code+' - '+n.team2.code;
    }
  })
  console.log(data.teams);
}


