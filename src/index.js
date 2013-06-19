var bot = require('./lib/bot.js').init(process.argv[2]);

require('./modules/present.js').setup(bot);
require('./modules/tell.js').setup(bot);
require('./modules/seen.js').setup(bot);

require('./modules/scraping.js').setup(bot);
require('./modules/w.js').setup(bot);
require('./modules/basics.js').setup(bot);

require('./modules/restart.js').setup(bot);

