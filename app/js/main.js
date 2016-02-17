
var rootRef = new Firebase("https://trafficglobe.firebaseio.com/");

function login(){
    rootRef.authWithOAuthPopup("google", function(error, authData) {
        if (error) {
            console.log("Login Failed!", error);
        } else {
            console.log("Authenticated successfully with payload:", authData);
            rootRef.child("users").child(authData.uid).once("value", function (dataSnapshot) {
                var data = dataSnapshot.val();

                //If this is a first time user, create firebase user
                if (data === null) {
                    console.log("First time user")
                    rootRef.child("users").child(authData.uid).set({
                        provider: authData.provider,
                        name: getName(authData),
                        profile: ""

                    });
                }
                else {
                    console.log("Returning User")

                }
            });
        }
    });
}

// find a suitable name based on the meta info given by each provider
function getName(authData) {
    switch(authData.provider) {
        case 'password':
            return authData.password.email.replace(/@.*/, '');
        case 'twitter':
            return authData.twitter.displayName;
        case 'facebook':
            return authData.facebook.displayName;
        case 'google':
            return authData.google.displayName;
    }
}
//checkAuth();

function checkAuth(){
    var authData = rootRef.getAuth();
    if (authData) {
        console.log("User " + authData.uid + " is logged in with " + authData.provider);
    } else {
        console.log("User is logged out");
    }
}
