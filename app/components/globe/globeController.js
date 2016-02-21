app.controller('GlobeController', function(firebaseService,$scope, $location) {
    var globeCtrl = this;
    var globe;

    //Image URL
    globeCtrl.urlDictionary = {
       color:"img/globeImages/worldColor.jpg",
       blue:"img/globeImages/worldBlue.jpg",
       black:"img/globeImages/worldBlack.jpg",
       nightLights:"img/globeImages/worldNightLights.jpg",
    }

    globeCtrl.username = firebaseService.username;

    globeCtrl.getTrackingCode = firebaseService.getTrackingCode;



    initializeGlobe()

    function initializeGlobe() {
        var div = document.getElementById('globe');
        var urls = {
            earth: 'img/globeImages/worldBlue.jpg',
            bump: 'img/bump.jpg',
            specular: 'img/specular.jpg',
        }

        var profile = firebaseService.getProfile()

        profile.$loaded().then(function() {

            var globeImage = profile.globeImage;
            var imageToUse;

            if (globeImage == null || globeImage == ""){
                imageToUse =  globeCtrl.urlDictionary.blue;
            }
            else {
                imageToUse = profile.globeImage
            }

            var urls = {
                earth: imageToUse,
                bump: 'img/bump.jpg',
                specular: 'img/specular.jpg',
            }

            // create a globe
            globe = new Globe(div, urls);

            // start it
            globe.init();

            firebaseService.handoffGlobe(globe);

            firebaseService.getProfile().$bindTo($scope, "profile");
        });

    };

    globeCtrl.changeGlobeImage = function(imageToUse){
        var urls = {
            earth: imageToUse,
            bump: 'img/bump.jpg',
            specular: 'img/specular.jpg',
        }

        globe.changeGlobeImage(urls)

        firebaseService.updateGlobeImage(imageToUse)
    }

    globeCtrl.displayTrackingCode = function() {
        alert("Copy and paste this code to your site: \n" + globeCtrl.getTrackingCode())

    }

    var interval = 1;

    setInterval(function(){
        if(interval == 5){
            /* if intervall reaches 5 the user is inactive hide element/s */
            $('.hide-timeout').fadeOut();
            $('body').css('cursor', 'none');

            interval = 1;
        }
        interval = interval+1;
        //console.log(interval);
    },1000);

    $(document).bind('mousemove keypress', function() {
        /* on mousemove or keypressed show the hidden input (user active) */
        $('.hide-timeout').fadeIn();
        $('body').css('cursor', 'auto');

        interval = 1;
    });





});