app.config(function($routeProvider) {
    var requireAuthentication = function () {
        return {
            // controller will not be loaded until $requireAuth resolves
            // Auth refers to our $firebaseAuth wrapper in the example above
            "currentAuth": ["firebaseService","$location", function(firebaseService,$location) {
                // $requireAuth returns a promise so the resolve waits for it to complete
                // If the promise is rejected, it will throw a $stateChangeError (see above)
                return firebaseService.auth().$requireAuth().then(function(){},function(){$location.path('/')});
            }]
        }
    };


    $routeProvider
        .when('/', {
            controller:'HomeController as home',
            templateUrl:'components/home/homeView.html'
        })
        .when('/globe', {
            controller:'GlobeController as globe',
            templateUrl:'components/globe/globeView.html',
            resolve:   requireAuthentication()
        })
        .otherwise({
            redirectTo:'/'
        });





})