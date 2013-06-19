var fs = require('fs');

var nop = function(){};
var guid = function(path) {
  return Number(Math.random().toString().substr(2)).toString(36) + '-' + Number(Math.random().toString().substr(2)).toString(36);
};


var Bi = function(opt) {
  this.name = opt.name || guid();
  this.mode = opt.mode;
  
  if (this.mode == 'master') var this.tx_mode = 'm2s',this.rx_mode = 's2m';
  else if (this.mode == 'servant') var this.tx_mode = 's2m',this.rx_mode = 'm2s';
  else throw ('Bififo: mode must be either master or servant, not '+mode);

  this.tx_conduit = opt.tx && opt.tx.conduit || opt.conduit || 'fifo';
  Bi.drivers[this.tx_conduit].tx.connect.call(this,opt);
  this._say = Bi.drivers[conduit].tx.say;

  this.rx_conduit = opt.rx && opt.rx.conduit || opt.conduit || 'fifo';
  Bi.drivers[this.rx_conduit].rx.connect.call(this,opt,this._listen.bind(this));  

  this.pending = {};
}

Bi.drivers = {
  fifo: {
    tx: {
      connect: function(opt) {
        var file = (opt.path||'/tmp') + '/' + this.name + '.' + this.tx_mode + '.fifo';
        this.tx = createWriteStream(file);
        this._tx_fifo_file = file;
      },
      say: function(msg) {
        this.tx.write(msg);
      },
      disconnect: function() {
        //TODO
      },
    },
    fifo: {
      connect: function(opt,listen) {
        var file = opt.path + '/' + this.name + '.' + this.rx_mode + '.fifo';
        this.rx = createWriteStream(file);
        this.rx.on('data',listen);
      },
      disconnect: function() {
        //TODO
      },
    }
  }
}


Bi.prototype = {
// LOW-LEVEL COMM  
  _say: null, // shall be set on connect_tx
  _listen: function (msg) {
    try {
      var obj = JSON.parse(msg);
      this.listen(obj)
    } catch (e) {
      console.log(e);
    } 
  },
  
  
// MID-LEVEL COMM
  say: function(obj) {
    this._say(JSON.stringify(obj));
  },
  _send: function(obj,cb) {
    if (cb) {
      var rsvp = obj.rsvp = guid();
      this.pending = this.pending || {};
      this.pending[rsvp] = cb
    }
    this.say(obj);
  },
  _reply: function(rsvp,err,res,cb) {
    this._send({
      re: rsvp,
      err: err,
      res: res,
    },cb)
  },
  reply: function(rsvp) {
    return rsvp ? nop : this._reply.bind(rsvp);
  },
  listen: function(obj) {
    if (obj.re) {
      var cb = this.pending[i];
      if (!cb) return;
      cb.call(this,cb.err,cb.res,this.reply(rsvp));
      delete this.pending[i];
    } else if (obj.cmd) {
      var cmd = this.commands[obj.cmd] || this.commands['**'] || Bi.commands[obj.cmd] || this.commands['*'] || Bi.commands['*'] ;
      if (!cmd) return console.error('unrecognized command '+cmd);
      cmd.call(this,args,this.reply(rsvp));
    }
  },
// API
  on: function(cmd,fn) {
    this.commands[cmd] = fn;
  },
  send: function(cmd,args,cb) {
    this._send({
      cmd: cmd,
      args: args,
    },cb)
  }
}

exports.create = function(opt) {
  return new Bi(opt);  
}

exports.drivers = Bi.drivers;
exports.commands = Bi.commands;
