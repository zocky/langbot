#!/usr/bin/nodejs

/*
  lagbot                                  # enter console
  langbot start                           # start the daemon, load all enabled bots
  langbot stop                            # unload all loaded bots, stop the daemon
  langbot restart                         # stop and start the daemon

  langbot list                            # show a list of all bots

  langbot load                            # load all enabled bots
  langbot load [name]                     # load and run a bot
  
  langbot unload                          # unload all loaded bots
  langbot unload [name]                   # stop and unload a bot
  langbot reload                          # unload and load all loaded bots
  langbot reload [name]                   # unload and load a bot

  langbot enable [name]                   # autoload this bot next time the daemon is started
  langbot disable [name]                  # don't autoload this bot next time the daemon is started

  langbot add [name] [nick] [channel]     # add a new bot config
  langbot remove [name]                   # remove a bot config

  langbot [name] set                      # list settable options

  langbot [name] set [option.path] value  # set an option
  langbot [name] unset [option.path]      # unset an option
  langbot [name] reset [option.path]      # reset an option to default

  langbot _start                          # actually start the daemon, don't call this directly
  
*/


var child_process = require('child_process');
var fs = require('fs');
var bi = require('../src/lib/bi.js');

var pidfile     = '../tmp/dameon.pid';

var main = {
  init: function() {
    var running = fs.existsSync(pidfile);
    this.daemon = running ? fs.readFileSync(pidfile) : null;

    this.bi = bi.create({
      mode: 'master',
      name: 'langbot'
    });
    
  },
  send: function(cmd,args,cb) {
    this.bi.send(cmd,args,cb);
  },
  exec: function(cmd,args,cb) {
    var action = this.commands[cmd];
    if (action) {
      action.call(this,args,cb);
    } else {
      this.send(cmd,args,cb);
    }
  },
  commands: {
    quit: function () {
      process.exit();
    },
    start: function start (cb) {
      var me = this;
      if (this.daemon) return cb('already started');
      child_process.exec("langbot _start <" + this.fifoout , function(err,stderr,stdout) {
        if (err) cb(' err '+err+': ' + stderr , stdout );
        else cb (null,stdout);
      })
    },
    stop: function stop (cb) {
      var me = this;
      if (stop.timer) return cb('already stopping');

      stop.timer = setTimeout(10000,function() {
        console.log('timeout. killing process');
        process.kill( this.daemon , function() {
          console.log('killed');
          cb();
        };
      })
      this.bi.send('stop',function() {
        clearTimeout(stop.timer);
        stop.timer = null;
        cb();
      });
    },
  },
}

var cmd = process.argv[0];
var args = process.args.slice(1);

if (cmd != '_start') {
  if (!cmd) {
    // loop input and call main.command, exit on "quit" or whatever
    /*
    while (1) { //TODO
      var line = main.parse(whatever());
      main.command(line.cmd,line.args);
    }
    */
    process.exit();
  } else {
    main.command(cmd,args);
    process.exit();
  }
}

require('daemon').daemon('../src/lib/daemon.js', [], opt);

