/* jshint -W097, unused: true */
/* globals angular */
"use strict";

angular.module('app').controller('CacheAddressCtrl', function($scope, $rootScope) {
    $scope.viewdata = {
        // the address and our lat/lng/ok status
        address: '',
        my_lat: null,
        my_lng: null,
        insideCalifornia: null,
        // the download progress
        // if they are both null then no download is in progress; during a download series they'll at least be 0 which is non-null; thus we can know "in progress" status
        progress_done: null,
        progress_total: null
    };

    // the search function
    // catch Enter keypresses in the input box, have them simply call doSearch() same as the ng-click dooes on the button
    $scope.keypressAddressBox = function (event) {
        if (event.charCode == 13) $scope.doSearch();
    };
    $scope.doSearch = function () {
        if (! $scope.viewdata.address) return false;

        $rootScope.closeKeyboard();

        var url    = 'https://websites.greeninfo.org/parkinfo/mobile/geocode.php';
        var params = {
            address: $scope.viewdata.address,
        };
        var options = {};

        $scope.getJSON(url, params, options, function (geocode) {
            if (geocode && geocode.length) {
                $scope.viewdata.my_lat  = geocode[0];
                $scope.viewdata.my_lng  = geocode[1];
                $scope.viewdata.address = geocode[2];
                $scope.viewdata.insideCalifornia = $rootScope.isLatLngWithinBounds($scope.viewdata.my_lat,$scope.viewdata.my_lng);
            }
            else {
                $scope.showMessageModal("No results", "Could not find that address. Check the address and try again.");
            }
        });
    };

    // the function to get moving on that cache seeding and updating our progress as it goes
    // as well as the (after success) a button for resetting so they can cache again; makes sense if their location has changed after the last time they ran a cache
    $scope.reset = function () {
        $scope.viewdata.address          = '';
        $scope.viewdata.my_lat           = null;
        $scope.viewdata.my_lng           = null;
        $scope.viewdata.insideCalifornia = null;
        $scope.viewdata.progress_total   = null;
        $scope.viewdata.progress_done    = null;
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
