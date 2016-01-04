/* jshint -W097, unused: true */
/* globals angular */
"use strict";

angular.module('app').controller('CacheMenuCtrl', function($scope, SiteConfigGlobals, $rootScope) {
    // yes, this assignment happens every time the panel comes up
    // that's intentional; we don't want these flags to be out of date for even a second
    $scope.viewdata = {
        offline: $rootScope.offlineMode,
        passive: $rootScope.offlinePassive,
    };

    $rootScope.$watch('offlinePassive', function (newData) {
        $scope.viewdata.passive = newData;
    });
    $rootScope.$watch('offlineMode', function (newData) {
        $scope.viewdata.offline = newData;
    });
});
