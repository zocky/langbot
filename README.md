langbot
=======


An IRC bot in node.js
=======
An IRC bot written in node.js.

installation
------------
    git clone https://github.com/zocky/langbot.git;
    cd langbot;
    cp etc/default.config.json.example etc/default.config.json;
    "${EDITOR:-vi}" etc/default.config.json.example;

running the bot
---------------

    ./langbot start [botname]
Start a bot with config in ./var/[botname].config.json. All bots will be started by default.

    ./langbot stop [botname]
Stop a bot. All bots will be stopped by default.

    ./langbot restart [botname]
Restart a bot. All bots will be stopped by default.

    ./langbot status
Display the current status of your bots.

    ./langbot update
Update required npm packages and the bot source.

    ./langbot reinstall
Reinstall required npm packages.

commands
--------

    .help
show a list of commands

    .help [command]
show help for command

    .wik [search terms]
lookup wikipedia

    .w [term]
lookup wiktionary

    .ety [term]
lookup etymonline.com

    .urban [term]
lookup urban dictionary

    .u [search terms]
search unicode table

    .g [search terms]
find on google

    .c [expression]
use google calculator

    .tr [text]
google translate

    .tr [source]-[target] [text]
google translate with specified source and target languages

    .where [search terms]
search geonames database

    .weather [search terms]
weather forecast from weather underground

    .tell [nick] [message]
leave a message for a user

API for modules
---------------
Save your module in ./src/modules/modname.mod.js. Store its options in modules.modname in the config file

    exports.setup = function(bot,opt) {
      bot.listen(function(from,msg) {
        // listen to the channel
      });
      
      bot.addCommand('foo' , {
        usage: '.foo, .foo [args]',
        help: 'Do foo.',
        action: function(from,respond,text,arg1,arg2,...) {
          //do something
        }
      });
    }
