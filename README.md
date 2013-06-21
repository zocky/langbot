# langbot

An IRC bot in node.js

## installation

    git clone https://github.com/zocky/langbot.git;
    cd langbot;
    cp etc/default.config.json.example etc/default.config.json;
    "${EDITOR:-vi}" etc/default.config.json.example;

## running your bots

You control your bots with the `langbot` script. The first time you run it, it will install all the required npm packages, so it may take some time.
The script knows the following commands:

##### `./langbot status`
Display the current status of your bots.

##### `./langbot start [botname]`
Start a bot with config in ./var/[botname].config.json. All bots will be started by default.

##### `./langbot stop [botname]`
Stop a bot. All running bots will be stopped by default.

##### `./langbot restart [botname]`
Restart a bot. All running bots will be restarted by default.
    
##### `./langbot update`
Update required npm packages and the bot source.

##### `./langbot reinstall`
Reinstall required npm packages.

## using your bot in IRC
The bot reacts to _commands_. To issue a command, you can say `.cmd` or `botname, cmd` or `botname: cmd` 
or `botname> cmd` in the channel, or `cmd` in a private message to the bot.  You can issue the following 
commands to the bot:

### basic commands
##### `.help [command]`
Show help for a particular command, or a list of commands.

##### `.about`
Show information about the bot.

##### `.version`
Show more technical information about the bot.

##### `.more`
If the reply to your last command ends in [...], you can use `.more` to get further results.

### other commands
Other commands are provided by modules and include the following:
- `.tell [nick] [message]` - leave a message for a user
- `.seen [nick]` - check when the user last spoke on the channel
- `.u [search terms]` - search unicode data
- `.lang [search terms]` - search language data
- `.where [search terms]` - search geonames data
- `.wik [lang:] [search terms]` - lookup Wikipedia (English by default)
- `.w [lang:] [term]` - lookup Wiktionary (show results in all languages by default)
- `.ety [term]` - lookup etymonline.com
- `.urban [term]` - lookup urban dictionary
- `.g [search terms]` - find on Google
- `.tr [from:to] [text]` - use Google translate (auto:en by default)
- `.weather [search terms]` - weather forecast from weather underground
- `.c [expression]` - use Google Calculator
- `.re /regexp/opt text` - regular expression matching

## API for modules

Save your module in `./src/modules/[modname].mod.js.` 
If your module has configuration options, add them to your bot's config file under `modules.[modname]`.
Be sure to also add them to `./etc/default.config.json.example`.

All modules follow this pattern:

    exports.setup = function(bot,opt) {
        // 
    }

### set up your module
##### `exports.setup = function(bot,options) {...}`
This will be called when the module is loaded. This is where you put your module code. `bot` is the bot object, 
and `options` are your module's options loaded from the bot's config file.`bot.client` is the bot's client object 
as provided by the [node-irc library](https://github.com/martynsmith/node-irc).

### add a command
Your module can add commands to the bot:
##### `bot.command(name,options)`
`name` is the name of the command, i.e. what you type in IRC, without the dot. `options` is an object
with the following properties:
- `usage:` - A string with example usage of the command, e.g. `".foo [bar]"`. This will be used in `.help`.
- `help:` - A string with an explanation of the comamnd, e.g. `"Do foo to bar."` This will be used in `.help`.
- `args:` - Optional regexp for matching arguments. See below for details.
- `action:` - The function that will be called when the command is issued. See below for details.

#### extract arguments
If you provide a regexp for the `args:` option, the text after the command will be tested against it. If it matches, 
`action:` will be called with arguments extracted from `( )` groups in the regexp. Use `(?: )` in your regexp
to avoid adding a group to the arguments.

Typical patterns include:
- `/^(.*)$/` - match everything
- `/^(.+)$/` - match everything, but require at least one character
- `/^(\S+)$/` - match a single "word" argument (i.e. a sequence of non-whitespace characters)
- `/^(\S+) (.+)$/` - match a "word" argument followed by some text
- `/^(\S+) (\S+)$/` - match two "word" arguments
- `/^(\S+)(?: (\S+))?$/` - match one or two "word" arguments, using `(?: )` to avoid capturing the optional space;
  optional parameters might be easier to handle by overloading the command (see below)

If you don't provide the `args:` option, `action` will be called with the whole text as the first argument, followed
by individual "words" (i.e. the text split by whitespace). 

#### handle the command
When a command is issued and arguments are matched, the `action:` function is called.

##### `action: function(from,respond,args...) { ... }`
`from` is the user who issued the command. `respond` is the object you use to reply to the user, and 
`args...` are the arguments as parsed by `args:`. Typically your `action:` will look like:
- `function (from,respond) { ... }` - no arguments
- `function (from,respond,arg) { ... }` - a single argument
- `function (from,respond,arg1,arg2) { ... }` - two arguments
- `function (from,respond,text,arg1,arg2) { ... }` - no `args:` option provided

User the `respond` object to provide feedback. Its exact behavior depends on how the command was issued. 
You can use it in several different ways:
- `respond(args...)` - send text to the user immediately
- `respond.print(args...)`- add text to the user's queue; you can use special tokens `<br>` and `<nobr>`
- `respond.printbr(args...)` - as above, but add `<br>` at the end
- `respond.printrow(l,m,r)` - print as a single line, shortening `m` to fit into a single line
- `respond.flush(str,...)` - print the head of the user's queue; the rest can be accessed with .more

#### overload a command
You can register the same command several times. In this case, the bot will try to match the provided arguments 
against each version of the command in reverse order, and the first version that matches will be called. This can
be used to simplify your code and to overload commands provided by other modules.

### handle events
You can handle both IRC events as provided by the [node-irc library](https://github.com/martynsmith/node-irc) and 
custom events provided by langbot.
##### `bot.client.on(event, handler)`
Handle IRC events. See [docs](https://node-irc.readthedocs.org/en/latest/API.html#events).
##### `bot.on(event, handler)`
Handle custom events. For now this is only:
- `bot.on('say',function(from,text) {...} )` - listen to the channel, ignoring commands issued to the bot.
