
var express = require('express'),
	request = require('request'),
	isbot = require('is-bot');


var Firebase = require("firebase");

app = express();

var rootRef = new Firebase("https://TrafficGlobe.firebaseio.com/");


app.use(express.static(__dirname+"/app"));

var users = {};

// This setting is needed on heroku so that we have access to
// the visitor's ip addresses. Remove it if you don't use heroku:

app.enable('trust proxy');


// This is the special tracking url, which you should embed in an img on your site:

app.get('/ping/:uid', function (req, res) {
  	var uid = req.params.uid;

    // The /ping url has been requested by a web scanning bot.
    // We don't want to count it as a visitor so we will ignore it

    // if(isbot(req.headers['user-agent'])){
    //     return res.send('Bad robot!');
    // }

    var ip = req.ip;
    console.log(ip)

    // FreeGeoIP has a very simple api

	request('http://www.geoplugin.net/json.gp?ip=' + ip, function (e, r, body) {

		try {
			var data = JSON.parse(body);
		}
		catch(e){
			return;
		}

		if (!e && r.statusCode == 200) {
      console.log(data)

			if(data.geoplugin_countryName){


				// Store the users in an object with their ip as a unique key
        var stuff = {
          timestamp : new Date(),
          latitude : data.geoplugin_latitude,
          longitude: data.geoplugin_longitude,
          country: data.geoplugin_countryName
        };
				users[ip]=stuff;

        var userSiteRef = rootRef.child("users").child(uid).child("trafficData");
        userSiteRef.push().set(stuff)

        console.log(stuff)



			}
		}
		if(e){
			console.error(e);
		}
	});

	res.send('Done');

});



app.listen(process.env.PORT || 8888, function(){
	console.log('server is up');
});
