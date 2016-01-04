/* jshint -W097, unused: true */
/* globals angular */
/* globals ga */
/* globals LIST_ZIPCODES */
"use strict";

angular.module('app').controller('SearchZipcodeCtrl', function($scope, SiteConfigGlobals, $rootScope, $cordovaGeolocation, $state) {
    $scope.viewdata = {
        zipcodes_all: LIST_ZIPCODES, // external listing file, cuz it's lengthy and makes navigating this real code a nuisance!
        suggestions: [],
        zipcode: '',
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

    // typing into the text box, triggers this filter
    // which in turn updates the suggestions, which propagates to ther suggestions listing
    // the max of 100 suggestions and requiring 2 characters to keep them relevant, keeps the list from itself freezing the phone, which does happen!
    $scope.updateSuggestions = function () {
        var search = $scope.viewdata.zipcode;
        if (search.toString().length < 2) {
            $scope.viewdata.suggestions = [];
            return;
        }
        $scope.viewdata.suggestions = $scope.viewdata.zipcodes_all.filter(function (thisone) {
            return thisone.indexOf(search) === 0;
        }).slice(0,100);
    };
    $scope.selectZipcode = function (selection) {
        // pro tip: the input is type="number" so the OS will use a numeric keyboard, but ZIP codes are not integers! ZIP codes can start with 0 and are thus are not integers
        // we ignore this for California, but be aware that some day you'll need to use type="text" and the text keyboard, in order to handle ZIP codes that start with 0
        $scope.viewdata.zipcode = parseInt(selection);
        $scope.doSearch();
    };
    $scope.keypressZipcodeBox = function (event) {
        if (event.charCode == 13) $scope.doSearch();
    };

    //
    // function: do the search
    //
    $scope.doSearch = function () {
        // no search? no way!
        if (! $scope.viewdata.zipcode) return;

        // prometheus: clear any suggestions; they obviously know what they want already
        $scope.viewdata.suggestions = [];

        $rootScope.closeKeyboard();

        var url     = 'https://websites.greeninfo.org/parkinfo/mobile/search_zipcode.php';
        var params  = {
            zipcode: $scope.viewdata.zipcode,
            origin_lat: $scope.viewdata.my_lat ? $scope.viewdata.my_lat : null,
            origin_lng: $scope.viewdata.my_lng ? $scope.viewdata.my_lng : null,
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
        ga('send', 'event', 'search', 'zipcode');
    };
});
