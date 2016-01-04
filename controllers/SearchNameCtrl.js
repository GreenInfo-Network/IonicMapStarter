/* jshint -W097, unused: true */
/* globals angular */
/* globals ga */
"use strict";

angular.module('app').controller('SearchNameCtrl', function($scope, SiteConfigGlobals, $rootScope, $cordovaGeolocation, $state) {
    $scope.viewdata = {
        parkname: '',
        // our own lat/lng location if available; supplied to search endpoint so as to find the nearest part of the park
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
    
    // the search function
    // catch Enter keypresses in the input box, have them simply call doSearch() same as the ng-click dooes on the button
    $scope.keypressTextBox = function (event) {
        if (event.charCode == 13) $scope.doSearch();
    };
    $scope.doSearch = function () {
        if (! $scope.viewdata.parkname) return false;

        $rootScope.closeKeyboard();

        var url    = 'https://websites.greeninfo.org/parkinfo/mobile/search_name.php';
        var params = {
            parkname: $scope.viewdata.parkname,
            origin_lat: $scope.viewdata.my_lat ? $scope.viewdata.my_lat : null,
            origin_lng: $scope.viewdata.my_lng ? $scope.viewdata.my_lng : null,
        };
        var options = {};

        $scope.getJSON(url, params, options, function (resultset) {
            if (resultset && resultset.length) {
                $rootScope.searchResults = resultset;
                $state.go('results');
            } else {
                $scope.showMessageModal("No results", "No results were found. Try some variations and check your spelling.");
            }
        });

        // Google Analytics
        ga('send', 'event', 'search', 'parkname');
    };
});
