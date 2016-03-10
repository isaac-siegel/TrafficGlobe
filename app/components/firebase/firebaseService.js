app.service('firebaseService', function($q, $firebase, $firebaseAuth, $firebaseObject, $location, $rootScope, $timeout) {
    //PRIVATE
    var rootRef = new Firebase("https://trafficglobe.firebaseio.com/");
    var auth = $firebaseAuth(rootRef);
    var username = "";
    var onlyLoadNew = false;
    var user = {};
    var globe;

    function checkAuthState(){
        var authData = auth.$getAuth();

        if (authData) {
            console.log("Logged in as:", authData.uid);
            console.log(authData)
            user = authData;
            //streamDataToGlobe();

        } else {
            console.log("Logged out");
        }
    }

    function streamDataToGlobe(){
        var trafficRef = rootRef.child("users").child(user.uid).child("trafficData");
        var newData = true;
        trafficRef.on("child_added", function(snapshot, prevChildKey) {
            if (newData){
                var stuff = snapshot.val();
                var data = {
                    //color: '#'+Math.floor(Math.random()*16777215).toString(16),
                    color: "#39FF14",
                    lat: parseFloat(stuff.latitude),
                    lon: parseFloat(stuff.longitude),
                    // lat: 52.3747158,
                    // lon: 4.8986231,
                    size: 20
                };

                globe.addDynamicBlock(data);
            }
        });
        if (onlyLoadNew){
            trafficRef.once('value', function(messages) {
                newData = true;
            });
        }
    }

    checkAuthState();

    //PUBLIC
    this.handoffGlobe = function(createdGlobe){
        globe = createdGlobe;
        streamDataToGlobe();
    }

    this.auth = function(){return auth};

    this.username = function() {
        return user.google.displayName;
    }

    this.getTrackingCode = function(){
        var uid = user.uid;

        var code = '<img src="http://globe-ping.herokuapp.com/ping/'
            + uid
            + '" width="1" height="1" style="display:none" />';
        return code;
    }

    this.login = function() {
        // create an instance of the authentication service

        // login with Google
        auth.$authWithOAuthPopup("google").then(function(authData) {
            console.log("Logged in as:", authData.uid);

            rootRef.child("users").child(authData.uid).once("value", function (dataSnapshot) {
                var data = dataSnapshot.val();
                var platformUserName =   getName(authData)
                //If this is a first time user, create firebase user
                if (data === null) {
                    console.log("First time user")
                    rootRef.child("users").child(authData.uid).set({
                        provider: authData.provider,
                        name: platformUserName,
                        profile: "",
                        trafficData: ""
                    });
                }
                else {
                    console.log("Returning User")
                }

                user = authData;


                //Need .apply because firebase async happens outside of angular digest
                $rootScope.$apply(function(){
                    $location.path('/globe');
                });
            });

        }).catch(function(error) {
            console.log("Authentication failed:", error);
        });
    }



    this.getProfile= function () {
        // create a reference to the database where we will store our data
        var profileRef = rootRef.child("users").child(user.uid).child("profile");

        // return it as a synchronized object
        return $firebaseObject(profileRef);
    }

    this.updateGlobeImage = function(globeImageUrl){
        var profileRef = rootRef.child("users").child(user.uid).child("profile");

        profileRef.update({
            "globeImage" :globeImageUrl
        })
    }

})