/* jshint -W097, unused: true */
/* globals angular */
"use strict";

angular.module('app').controller('CacheNearbyCtrl', function($scope, $rootScope, $cordovaGeolocation) {
    $scope.viewdata = {
        // the lat/lng/ok status for whether they can be allowed to start a download series
        my_lat: null,
        my_lng: null,
        insideCalifornia: null,
        // the download progress
        // if they are both null then no download is in progress; during a download series they'll at least be 0 which is non-null; thus we can know "in progress" status
        progress_done: null,
        progress_total: null
    };

    // do both a getCurrentPosition() to get a fix right now, then use watchPosition() to watch for changes as we move
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
    $scope.$on('$ionicView.loaded', function() {
        $cordovaGeolocation.getCurrentPosition(positionOptions).then(
            function (position) {
                positionOK(position);
                $cordovaGeolocation.watchPosition(positionOptions).then(null, positionFail, positionOK);
            },
            positionFail
        );
    });
    
    // the function to get moving on that cache seeding and updating our progress as it goes
    // as well as the (after success) a button for resetting so they can cache again; makes sense if their location has changed after the last time they ran a cache
    $scope.reset = function () {
        $scope.viewdata.progress_total = null;
        $scope.viewdata.progress_done  = null;
    };
    $scope.startCaching = function () {
        if (! $scope.viewdata.insideCalifornia || ! $scope.viewdata.my_lat || ! $scope.viewdata.my_lng) return false; // should not happen since UI is hidden

        var downloads = $rootScope.generateTileListingFromLatLng($scope.viewdata.my_lat, $scope.viewdata.my_lng);
        $scope.viewdata.progress_total = downloads.length;
        $scope.viewdata.progress_done  = 0;
        $rootScope.downloadTileListing(
            downloads,
            function (done, total) {
                $scope.viewdata.progress_total = total;
                $scope.viewdata.progress_done  = done + 1; // no clue why, it's clearly being given the proper number but Angular is screwing it up by subtracting 1, so we're never at 100%
            },
            function (done) {
                // no action; let the UI continue showing "1000/1000 Done" so the user (who may have left and come back) doesn't wonder why their download "has vanished"
                $scope.viewdata.progress_total = done;
                $scope.viewdata.progress_done  = done + 1; // no clue why, it's clearly being given the proper number but Angular is screwing it up by subtracting 1, so we're never at 100%
            },
            function () {
                // blank out the progress UI so they can try again, and show a garish warning popup
                $scope.viewdata.progress_total = null;
                $scope.viewdata.progress_done  = null;
                $scope.showMessageModal("Download Error", "Some map tiles could not be downloaded. What was downloaded successfully has been kept, and if you try again it will pick up where it left off.");
            }
        );
    };
});
