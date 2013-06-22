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
    if (from[i] && from[i].constructor == Object) {
      undeepen(from[i],to,path+i);
    } else {
      to[path+i] = from[i];
    }
  }
  return to;
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
      if (!Array.isArray(n)) n = String(n);
      return n.extract(re,rpl);
    }).filter(Boolean);
  }
});

Object.defineProperty(Array.prototype, 'grep', {
  enumerable:false,
  value: function(re) {
    return this.filter(function(n) {
      return String(n).match(re);
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

Object.defineProperty(Array.prototype, 'flatten', {
  enumerable:false,
  value: function flatten(){
    return this.reduce(function _flatten(res, a) { 
        Array.isArray(a) ? a.reduce(_flatten, res) : res.push(a);
        return res;
    }, []);
  }
});

Object.defineProperty(Array.prototype, 'log', {
  enumerable:false,
  value: function log(label){
    console.log(label,this);
    return this;
  }
});


Object.defineProperties(String.prototype, {
  'lengthBytes': {
    enumerable: false,
    get: function() {
      return encodeURI(this).split(/%..|./).length - 1;
    }
  },
  'leftBytes': {
    enumerable: false,
    value: function(n) {
      var short = encodeURI(this).split(/(%..|.)/,2*n).join('');
      var ret = false;
      while (!ret) {
        try {
          ret = decodeURI(short);
          break;
        } catch (e) {
          short = short.replace(/%..$|.$/,'');
        }
      }
      return ret;
    }
  },
  'shortenBytes': {
    enumerable: false,
    value: function(n) {
      var words = this.clean().split(/ /);
      var ret = words.shift();
      var len = ret.lengthBytes;
      while (words.length) {
        var w = words.shift();
        var l = w.lengthBytes + 1;
        if (len+l>n) break;
        ret += ' ' + w;
        len += l;
      }
      return ret;
    }
  },
});
Object.defineProperties(String, {
  'fromCodePoint': {
    enumerable: false,
    value: function(codePt) {
      if (codePt > 0xFFFF) {
        codePt -= 0x10000;
        return String.fromCharCode(0xD800 + (codePt >> 10), 0xDC00 + (codePt & 0x3FF));
      } else {
        return String.fromCharCode(codePt);
      }
    },
  }
})
Object.defineProperties(String.prototype, {
  'capitalize': {
    enumerable: false,
    value: function() {
      return this.charAt(0).toUpperCase() + this.substring(1).toLowerCase();
    }
  },
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
  'shorten': {
    enumerable: false,
    value: function(max) {
      return this.clean().replace(new RegExp('^(.{1,'+(max|0)+'}\\S)(\\s+.*)?$'),'$1');
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
  'clean': {
    enumerable: false,
    value: function() {
      return this.replace(/\s+/g,' ').trim()
    }
  },
  'htmlremove': {
    enumerable: false,
    value: function(tag) {
      var re = new RegExp('<(\\/?)'+tag+'\\b[^>]*>');
      var parts = this.clean().split(re);
      var ret = parts.shift();
      var depth = 0;
      while (parts.length) {
        if (!parts.shift()) depth++;
        else depth = Math.max(depth-1,0);
        var next = parts.shift();
        if (!depth) ret += next;
      }
      return ret.clean();
    }
  },
  'htmlfind': {
    enumerable: false,
    value: function(tag) {
      var re = new RegExp('(<(\\/?)'+tag+'\\b[^>]*>)');
      var parts = this.clean().split(re);
      parts.shift();
      var out = [];
      var ret = '';
      var depth = 0;
      while (parts.length) {
        var el = parts.shift();
        var close = parts.shift();
        if (!close) depth++;
        else depth = Math.max(depth-1,0);
        var next = parts.shift();
        if (depth || close) ret += el;
        if (depth) ret += next;
        if (close && !depth) out.push(ret.clean()),ret='';
      }
      return out;
    }
  },
  'htmlstrip': {
    enumerable: false,
    value: function() {
      return entities.decode(this.clean().replace(/<[^>]*>/g,'')).clean();
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
  'transcode': {
    enumerable: false,
    value: function(min,max,start) {
      var ret = '';
      if (typeof min == 'string') min = min.charCodeAt(0);
      if (typeof max == 'string') max = max.charCodeAt(0);
      if (typeof start == 'string') start = start.charCodeAt(0);
      var dif = start-min;
      for (var i = 0; i<this.length;i++) {
        var c = this.charCodeAt(i);
        var d = c >= min && c <= max ? dif + c : c;
        ret += String.fromCodePoint(d);
      }
      return ret;
    }
  },
  'unibold': {
    enumerable: false,
    value: function() {
      return this.transcode('A','Z','𝗔').transcode('a','z','𝗮');
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

Object.defineProperty(Array,'make', {
  enumerable: true,
  value :function(arr) {
    return Array.prototype.slice.call(arr,0);
  }
});

RegExp.escape = function(str) {
  return str.replace(/([\\^$+*?.()|{}[\]])/g,'\\$1');
}

RegExp.fromGlob = function fromGlob (glob) {
  return new RegExp(
    '^' 
  + glob
    .split(/([*?])/)
    .map(function(n) {
      if (n=='*') return '(.*)';
      if (n=='?') return '(.)';
      return RegExp.escape(n)
    })
    .join('') 
  + '$'
  );
}
