/* jshint -W097, unused: true */
/* globals angular */
"use strict";

angular.module('app').controller('CachePassiveCtrl', function($scope, SiteConfigGlobals, $rootScope) {
    // sync to the global flag immediately upon this panel coming focused, every time
    $scope.viewdata = {
        passive: $rootScope.offlinePassive,
    };
    $rootScope.$watch('offlinePassive', function (newData) {
        $scope.viewdata.passive = newData;
    });

    // the toggle functions for switching global Passive Caching mode
    $scope.passiveToggle = function () {
        $rootScope.offlinePassive = ! $rootScope.offlinePassive;
    };
    $scope.passiveOn = function () {
        $rootScope.offlinePassive = true;
    };
    $scope.passiveOff = function () {
        $rootScope.offlinePassive = false;
    };
});
