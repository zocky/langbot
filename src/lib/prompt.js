var readline = require('readline');

var deepen = function (o) {
  var oo = {}, t, parts, part;
  for (var k in o) {
    t = oo;
    parts = k.split('.');
    var key = parts.pop();
    while (parts.length) {
      part = parts.shift();
      t = t[part] = t[part] || {};
    }
    t[key] = o[k]
  }
  return oo;
}


var undeepen = function(from,to,path) {
  to = to || {};
  path = !path ? '' : path + '.';
  for (var i in from) {
    if (from[i] && from[i].constructor == Object) {
      undeepen(from[i],to,path+i);
    } else {
      to[path+i] = from[i];
    }
  }
  return to;
}

var prompt = module.exports.ask = module.exports = function(p,def,cb) {
  var rl = readline.createInterface(process.stdin, process.stdout);
  if (arguments.length == 2) cb = def, def = null;
  if (def !== null) p = p + ' ('+def+')';
  p+=$P1;
  rl.setPrompt(p);
  rl.prompt();
  var value = def;

  rl.on('line', function(line) {
    line = line.trim();
    if (line !=='') value = line;
    else rl.write(String.fromCharCode(8)+def);
    rl.close();
  }).on('close', function() {
    cb && cb(value);
  });
};



var $P1 = ': ';
var $P2 = '> ';
var me = module.exports = function(q,cb) {
  var rl = readline.createInterface(process.stdin, process.stdout);
};

me.ask = me;

me.p1 = function(p) { if(!arguments.length) return $P1; $P1=String(p); return prompt; }
me.p2 = function(p) { if(!arguments.length) return $P2; $P2=String(p); return prompt; }

me.object = function(obj,cb) {
  var shallow = undeepen(obj);
  var keys = Object.keys(shallow);
  
  function reprompt(val) {
    var k = keys.shift();
    if (k) {
      prompt(k,shallow[k],function(val) {
        if (val === null) {
          keys.unshift(k);    
        } else {
          shallow[k]=val;
        }
        reprompt();
      })
    } else {
      var obj = undeepen(shallow);
      cb && cb(obj);
    }
  }
  reprompt();
}
