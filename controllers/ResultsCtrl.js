/* jshint -W097, unused: true */
/* globals angular */
"use strict";

angular.module('app').controller('ResultsCtrl', function($scope, SiteConfigGlobals, $rootScope, $cordovaGeolocation, $state) {
    $scope.viewdata = {
        // the global resultset from our last search
        // stinks to use a global but that's how it's gotta be
        resultset: [],
        // a geolocation watch will update these, and thus our results-distance readouts
        // it's not quite realtime but it's super convenient, huh?
        my_lat: null,
        my_lng: null
    };

        // on first load, do both a getCurrentPosition() to get a fix right now, then use watchPosition() to watch for changes as we move
    //   these techniques individually are too stupid to do the job
    //   watchPosition() will simply never happen until we move enough to trigger the phone
    //   getCurrentPosition() inside an $interval consumes too much battery updating something that has not changed
    // and incidentally why in the world do watchPosition() and getCurrentPosition() have completely different params anyway?
    var positionOptions = {
        maximumAge : 60 * 1000,
        enableHighAccuracy: true
    };
    var positionOK = function (position) {
        $scope.viewdata.my_lat = position.coords.latitude;
        $scope.viewdata.my_lng = position.coords.longitude;
        $scope.refreshResultsListing();
    };
    var positionFail = function () {
        // didn't get a location
        // unlike other controllers, it's important to know our location in order to search near by
        $scope.viewdata.my_lat = null;
        $scope.viewdata.my_lng = null;
    };
    $scope.$on('$ionicView.loaded', function(){
        $cordovaGeolocation.getCurrentPosition(positionOptions).then(
            function (position) {
                positionOK(position);
                $cordovaGeolocation.watchPosition(positionOptions).then(null, positionFail, positionOK);
            },
            positionFail
        );
    });

    // watch the searchResults and update our listing when appropriate
    $rootScope.$watch('searchResults', function (newData) {
        $scope.viewdata.resultset = newData;
        $scope.refreshResultsListing();
    });

    $scope.refreshResultsListing = function () {
        // populate the records with a distance and heading, if they gave us nearest-point information AND if we even know our origin location
        // the view will figure out whether there exists a distance readout per record, and will show/hide the aside text as necessary
        // this will also SORT THEM by distance
        if ($scope.viewdata.my_lat && $scope.viewdata.my_lng) {
            for (var i=0, l=$scope.viewdata.resultset.length; i<l; i++) {
                var result = $scope.viewdata.resultset[i];
                if (result.closest_lat && result.closest_lng) {
                    result.meters   = $rootScope.distanceBetweenLatLng($scope.viewdata.my_lat, $scope.viewdata.my_lng, result.closest_lat, result.closest_lng);
                    result.distance = $rootScope.distanceWording(result.meters);
                    result.heading  = $rootScope.headingBetweenLatLng($scope.viewdata.my_lat, $scope.viewdata.my_lng, result.closest_lat, result.closest_lng);
                }
            }

            $scope.viewdata.resultset.sort(function (p,q) {
                return p.meters - q.meters;
            });
        }
    };

    // clicking on a park result, should go to the map panel, and focus on the park
    $scope.showParkOnMap = function (park) {
        $rootScope.focusedResult = park;
        $state.go('map');
    };
});
