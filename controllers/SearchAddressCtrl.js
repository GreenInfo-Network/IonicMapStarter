/* jshint -W097, unused: true */
/* globals angular */
/* globals ga */
"use strict";

angular.module('app').controller('SearchAddressCtrl', function($scope, SiteConfigGlobals, $rootScope, $state) {
    $scope.viewdata = {
        address: ''
    };

    // the search function
    // catch Enter keypresses in the input box, have them simply call doSearch() same as the ng-click dooes on the button
    $scope.keypressAddressBox = function (event) {
        if (event.charCode == 13) $scope.doSearch();
    };
    $scope.doSearch = function () {
        if (! $scope.viewdata.address) return false;

        $rootScope.closeKeyboard();

        var url    = 'https://websites.greeninfo.org/parkinfo/mobile/search_address.php';
        var params = {
            address: $scope.viewdata.address,
        };
        var options = {};

        $scope.getJSON(url, params, options, function (resultset) {
            if (resultset && resultset.length) {
                $rootScope.searchResults = resultset;
                $state.go('results');
            } else {
                $scope.showMessageModal("No results", "No results were found. Check the address and try again.");
            }
        });

        // Google Analytics
        ga('send', 'event', 'search', 'address');
    };
});
