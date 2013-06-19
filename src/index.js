var name = process.argv[2];
process.title ='langbot '+name;
var bot = require('./lib/bot.js').init(name);


