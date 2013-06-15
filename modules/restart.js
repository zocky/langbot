var restartTimer = null;
var childProcess = require('child_process');

exports.setup = function(bot) {
  process.on('SIGINT', function () {
    console.log('disconnecting');
    bot.client.disconnect('deadness ensues', function() {
      setTimeout(function() {
        console.log('disconnected, shutting down');
        process.exit(); 
      },3000);
    });
  });

  if(process.argv[2] != 'test') process.on('uncaughtException', function(err) {
    console.log(err.stack);
    bot.report('exception',err);
  });

  function restartBot() {
    bot.client.disconnect('brb, restarting', function() {
      setTimeout(function() {
        console.log('disconnected, restarting');
        var child = childProcess.spawn('node', ['./index.js'], {
         detached: true,
         stdio: 'inherit'
        });
        child.unref();
        process.exit(); 
      },3000);
    });
  }

  setInterval(function(){
    bot.client.send('ping',bot.channel);
  }, 10 * 60 * 1000);

  function setRestartTimer() {
    clearTimeout(restartTimer);
    restartTimer = setTimeout(restartBot,15*60*1000);
  }

  bot.client.addListener('raw' + bot.channel, function (nick) {
    setRestartTimer();
  });
}

