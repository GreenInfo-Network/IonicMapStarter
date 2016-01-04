/* jshint -W097, unused: true */
/* globals angular */
"use strict";

angular.module('app').controller('CacheUsageCtrl', function($scope, $rootScope, $ionicLoading) {
    // refresh the readout of our cache count, as they turn to this panel every time (skip the usual .loaded event; these are not defaults, we do want them reloaded every hit)
    // do so right now, and keep the function for later e.g. after purging it
    $scope.viewdata = {
        cachetiles: 0,
        cachemegs: 0,
    };
    $scope.$on('$ionicView.enter', function() {
        $scope.updateCacheStats();
    });

    $scope.updateCacheStats = function () {
        $scope.viewdata.cachetiles = 'Counting';
        $scope.viewdata.cachemegs = 'Counting';

        $ionicLoading.show({ templateUrl: 'templates/waiting.html' });
        $rootScope.getCacheUsage(function (usage) {
            $ionicLoading.hide();
            $scope.viewdata.cachetiles = usage.filecount;
            $scope.viewdata.cachemegs = usage.megabytes.toFixed(1);
        });
    };

    $scope.emptyCache = function () {
        $ionicLoading.show({ templateUrl: 'templates/waiting.html' });
        $rootScope.emptyCache(function () {
            $scope.updateCacheStats();
            $ionicLoading.hide();
        });
    };
});
