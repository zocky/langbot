exports.setup = function(bot,opt) {
  var api_key = opt.apikey;
  
  if (bot.config.key_weather) {
    if (!api_key) api_key = opt.api_key, console.log('.key_weather is deprecated. Move your weather underground API key to .modules.weather.apikey ASAP.');
    else console.log('You have an old setting under .key_weather. You can delete it.');
  }
  
  
  if (!api_key) {
    console.log(__filename,'- no api key provided under .modules.weather.apikey, module will not be loaded');
    return;
  }
  if (!api_key.match(/^\w+$/)) {
    console.log(__filename,'- bad api key provided .modules.weather.apikey, module will not be loaded');
    return;
  }
  bot.addCommand('weather', {
    usage: '.weather [search terms]',
    help: 'lookup weather underground',
    args: /^(.+)$/,
    action: function(from,respond,text) {
      function trend(n) {
        switch (n) {
          case '+': return '▴';
          case '-': return '▾';
          case '0': return '▴0';
        }
        if (n>=0) return '▴'+String(n|0);
        return '▾'+String(-n|0);
      }

      bot.wget('http://ws.geonames.org/searchJSON', {
        q:text,
        maxRows:1,
      }, function(error,response,body,url) {

        if (error) return respond('error: '+ String(error));
        try { var obj = JSON.parse(body); } catch (e) {return respond('error: ' + String(e)); }
        if (!obj.geonames.length) return respond('nothing found');
        var n = obj.geonames[0];
        var loc = Number(n.lat).toFixed(5)+','+Number(n.lng).toFixed(5);
        bot.wget('http://api.wunderground.com/api/'+api_key+'/geolookup/conditions/forecast/q/'+loc+'.json', function(error,response,body,url) {
          if (error) return respond('error: '+ String(error));
          try { var obj = JSON.parse(body); } catch (e) {return respond('error: ' + String(e)); }

          if (!obj.current_observation) return respond('nothing found');
          var n = obj.current_observation;
          var f = obj.forecast.txt_forecast.forecastday[0];
          respond (
            n.display_location.full 
          + ' | ' + n.weather 
          + ' | ' + n.temp_c + '°C ('+ n.temp_f + '°F)' 
          + ' | ' + n.pressure_mb + ' mb ' + trend(n.pressure_trend)
          + ' | ' + ( n.wind_kph ? n.wind_kph + ' km/h (' + n.wind_mph+' mph) from ' + n.wind_dir + ' ('+n.wind_degrees+'°)' : 'no wind')
          + ' | ' + f.title + ': ' + f.fcttext_metric
          );
        });
      })
    }
  })
}
