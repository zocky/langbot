var entities = new (require('html-entities').AllHtmlEntities);

function OBJ() {
  var ret = {};
  for (var i = 0; i<arguments.length; i+=2) {
    ret[arguments[i]] = arguments[i+1];
  }
  return ret;
}

undot = function(obj,path) {
  var p = String(path).split('.');
  while(obj && p.length) obj = obj[p.shift()]; 
  return obj;
}

deepen = function (o) {
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


undeepen = function(from,to,path) {
  to = to || {};
  path = !path ? '' : path + '.';
  for (var i in from) {
    if (typeof from[i] == 'object') {
      undeepen(from[i],to,path+i);
    } else {
      to[path+i] = from[i];
    }
  }
  return to;
}

String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.substring(1).toLowerCase();
}


Object.defineProperty(String.prototype, 'extract', {
  enumerable:false,
  value:function(re,rpl) {
    var replace = typeof(rpl) == 'function'
    ? rpl
    : rpl && function() {
      args = Array.prototype.slice.call(arguments,0); 
      return rpl.replace(/\$(\d|&)/g,function(m,$1) { var a = args[0|$1]; return a || !isNaN(a) ? a : '' });
    } || function(m) {return m||''};
    var m;
    
    if (re.global) {
      var ret = [];
      re.lastIndex = 0;
      while (m = re.exec(this)) {
        var res = replace.apply(this,m);
        if (res) ret.push(res);
      }
      return ret;
    }
    
    m = re.exec(this);
    if (!m) return '';
    return replace.apply(this,m);
  }
});

Object.defineProperty(Array.prototype, 'extract', {
  enumerable:false,
  value: function(re,rpl) {
    return this.map(function(n) {
      return n.extract(re,rpl);
    }).filter(function(n) {
      return !!n;
    });
  }
});

Object.defineProperty(Array.prototype, 'pluck', {
  enumerable:false,
  value: function(n) {
    return this.map(function(m) {
      return m[n];
    });
  }
});


Object.defineProperty(Number.prototype, 'roundTo', {
  enumerable:false,
  value: function(to) {
    var to = to || 1;
    var n = this / to;
    n = Math.floor(n+0.5);
    n = n / (1 / to);
    return n;
  }
});



Object.defineProperties(String.prototype, {
  'camel': {
    enumerable: false,
    value: function() {
      return this.replace(/[\W_]+(.)/g, function (x, $1) {
        return $1.toUpperCase();
      });
    }
  },
  'dashes': {
    enumerable: false,
    value: function() {
      return this
      .replace(/([a-z\d])([A-Z])/g,  function (x, $1, $2) {
        return $1 + '-' + $2.toLowerCase();
      })
      .replace(/[\W_]+/g, '-');
    }
  },
  'underscores': {
    enumerable: false,
    value: function() {
      return this
      .replace(/([a-z\d])([A-Z])/g,  function (x, $1, $2) {
        return $1 + '_' + $2.toLowerCase();
      })
      .replace(/[\W_]+/g, '_');
    }
  },
  'upper': {
    enumerable: false,
    value: function() {
      return this.toUpperCase();
    }
  },
  'lower': {
    enumerable: false,
    value: function() {
      return this.toLowerCase();
    }
  },
  'htmlencode': {
    enumerable: false,
    value: function() {
      return entities.encode(this);
    }
  },
  'htmldecode': {
    enumerable: false,
    value: function() {
      return entities.decode(this);
    }
  },
  'urlencode': {
    enumerable: false,
    value: function() {
      return encodeURIComponent(this);
    }
  },
  'urldecode': {
    enumerable: false,
    value: function() {
      return decodeURIComponent(this);
    }
  },
});


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
