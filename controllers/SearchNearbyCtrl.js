/* jshint -W097, unused: true */
/* globals angular */
/* globals ga */
"use strict";

angular.module('app').controller('SearchNearbyCtrl', function($scope, SiteConfigGlobals, $rootScope, $cordovaGeolocation, $state) {
    $scope.viewdata = {
        my_lat: null,
        my_lng: null,
        insideCalifornia: true
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
        $scope.viewdata.insideCalifornia = $rootScope.isLatLngWithinBounds($scope.viewdata.my_lat,$scope.viewdata.my_lng);
    };
    var positionFail = function () {
        // didn't get a location
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

    // the search function itself
    $scope.doSearch = function () {
        if (! $scope.viewdata.my_lat || ! $scope.viewdata.my_lng) return false; // impossible to happen through regular use since UI is hidden

        $rootScope.closeKeyboard();

        var url    = 'https://websites.greeninfo.org/parkinfo/mobile/search_latlng.php';
        var params = {
            lat: $scope.viewdata.my_lat,
            lng: $scope.viewdata.my_lng,
        };
        var options = {};

        $scope.getJSON(url, params, options, function (resultset) {
            if (resultset && resultset.length) {
                $rootScope.searchResults = resultset;
                $state.go('results');
            } else {
                $scope.showMessageModal("No results", "No results were found.");
            }
        });

        // Google Analytics
        ga('send', 'event', 'search', 'nearby');
    };
});
