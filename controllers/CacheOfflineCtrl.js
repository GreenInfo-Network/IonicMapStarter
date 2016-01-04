/* jshint -W097, unused: true */
/* globals angular */
"use strict";

angular.module('app').controller('CacheOfflineCtrl', function($scope, SiteConfigGlobals, $rootScope) {
    // sync to the global flag immediately upon this panel coming focused, every time
    $scope.viewdata = {
        offline: $rootScope.offlineMode,
    };
    $rootScope.$watch('offlineMode', function (newData) {
        $scope.viewdata.offline = newData;
    });

    // the toggle functions for switching global Offline Mode
    $scope.offlineToggle = function () {
        $rootScope.offlineMode = ! $rootScope.offlineMode;
    };
    $scope.offlineOff = function () {
        $rootScope.offlineMode = false;
    };
    $scope.offlineOn = function () {
        $rootScope.offlineMode = true;
    };
});
