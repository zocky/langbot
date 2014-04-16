exports.setup = function(bot,opt) {

  if (!opt.username) return console.log(__filename,'- no geonames username provided in .modules.where.username, module will not be loaded');

  bot.addCommand('where', {
    usage: '.where [search terms]',
    help: 'lookup geonames database',
    args: /^(.+)$/,
    action: function(from,respond,text) {
      bot.wget('http://ws.geonames.org/searchJSON', {
        q:text,
        username:opt.username,
        maxRows:10,
      }, function(error,response,body,url) {
        if (error) return respond('error: '+ String(error));
        try { var obj = JSON.parse(body); } catch (e) {return respond('error: ' + String(e)); }
        
        if (obj.status) return respond('error: '+ String(obj.status.message));
        var res = obj.geonames.map(function(n) {
          var desc =[n.name,n.adminName1,n.countryName,n.fcodeName,n.population && ('pop. '+n.population)].filter(Boolean).join(', ');
          var loc = Number(n.lat).toFixed(5)+','+Number(n.lng).toFixed(5);
          return (desc + ' | ' + 'http://maps.google.com/maps?ll='+loc+'&q=loc:'+loc+'&hl=en&t=h&z=9');
        })
        .filter(Boolean);
        
        respond.flushbr(res.length ? res : 'nothing found');
      });
    }
  })
}
