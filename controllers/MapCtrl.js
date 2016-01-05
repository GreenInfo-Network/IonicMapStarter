/* jshint -W097, unused: true */
/* globals angular */
/* globals ga */
/* globals window */
"use strict";

angular.module('app').controller('MapCtrl', function($scope, SiteConfigGlobals, $rootScope, $cordovaGeolocation, leafletData) {
    // default map view
    // a location watch will pan the map
    $scope.viewdata = {
        title: '',
        layers: SiteConfigGlobals.mapLayers,
        options: {
            maxZoom: SiteConfigGlobals.max_zoom,
            minZoom: SiteConfigGlobals.min_zoom,
        },
        controls: {
            scale: {
                updateWhenIdle: true
            }
        },
        bounds: { // the starting bounds of the map view, could be overridden by later activity of course
            southWest: {
                lat: SiteConfigGlobals.bbox_s,
                lng: SiteConfigGlobals.bbox_w
            },
            northEast: {
                lat: SiteConfigGlobals.bbox_n,
                lng: SiteConfigGlobals.bbox_e
            }
        },
        maxbounds: { //  the constrained bounds of the map, so we don't let them pan to Taiwain and try to generate map tiles that can't exist
            southWest: {
                lat: SiteConfigGlobals.bbox_s,
                lng: SiteConfigGlobals.bbox_w
            },
            northEast: {
                lat: SiteConfigGlobals.bbox_n,
                lng: SiteConfigGlobals.bbox_e
            }
        },
        markers: {
            youarehere: { // a marker for the user's own location
                lat: 0,
                lng: 0,
                icon: {
                    iconUrl: 'img/marker-gps.png',
                    iconSize: [ 25, 41 ],
                    iconAnchor: [ 13, 41 ],
                    popupAnchor:[ 13, 10 ]
                },
                insideCalifornia: true // not a Leaflet thing
            },
            destination: { // a marker for some unspecified point of interest, for you to program
                lat: 0,
                lng: 0,
                icon: {
                    iconUrl: 'img/marker-target.png',
                    iconSize: [ 32, 32 ],
                    iconAnchor: [ 16,  16 ],
                    popupAnchor:[ 8,  8 ]
                }
            },
        },
        popup: {
            lat: 0,
            lng: 0,
            html: '',
            visible: false
        },
    };

    // watch for the global flag to toggle offline mode
    // when we do, we need to adjust all of our cache-enabled layers to use their url_offline instead of their url_online, or vice versa
    $rootScope.$watch('offlineMode', function (isNowOffline) {
        leafletData.getLayers().then(function(allLeafletLayers) {
            var layerobj, url;

            for (var bname in allLeafletLayers.baselayers) {
                layerobj = allLeafletLayers.baselayers[bname];
                if (! layerobj.options.urlOnlineMode) continue;

                url = isNowOffline ? window.cordova.file.dataDirectory + bname + "-{z}-{x}-{y}.png" : layerobj.options.urlOnlineMode;
                layerobj.setUrl(url);
            }

            for (var oname in allLeafletLayers.overlays) {
                layerobj = allLeafletLayers.overlays[oname];
                if (! layerobj.options.urlOnlineMode) continue;

                url = isNowOffline ? window.cordova.file.dataDirectory + oname + "-{z}-{x}-{y}.png" : layerobj.options.urlOnlineMode;
                layerobj.setUrl(url);
            }        
        });
    });

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
        $scope.viewdata.markers.youarehere.lat = position.coords.latitude;
        $scope.viewdata.markers.youarehere.lng = position.coords.longitude;
    };
    var positionFail = function () {
        // didn't get a location
        // unlike other controllers, it's important to know our location in order to search near by
        $scope.viewdata.my_lat = null;
        $scope.viewdata.my_lng = null;
    };
    $scope.$on('$ionicView.loaded', function(){
        $cordovaGeolocation.getCurrentPosition(positionOptions).then(
            function (position) {
                positionOK(position);
                $scope.zoomToMyLocation();
                $cordovaGeolocation.watchPosition(positionOptions).then(null, positionFail, positionOK);
            },
            positionFail
        );
    });

    // when this view comes visible, trigger the map to re-check the size of the container
    // Leaflet throws a fit when the container DIV changes visibility or perceived size
    $scope.$on('$ionicView.afterEnter', function() {
        leafletData.getMap().then(function (map) {
            map.invalidateSize();
        }); 
    });

    // click the map for an infobubble
    // doesn't need to zoom the map or anything; the popup bubble will have a zoom link if they really do want to disrupt their map view
    $scope.$on('leafletDirectiveMap.click', function (leafletDirectiveEvent, eventTarget) {
        var latlng = eventTarget.leafletEvent.latlng;
        $scope.getInfoAtLatLng(latlng.lat, latlng.lng);
    });
    $scope.getInfoAtLatLng = function (lat, lng) {
        console.log(['clicked the map', lat, lng ]);
    };

    // the button for zooming the map to your location
    $scope.zoomToMyLocation = function () {
        if ($scope.viewdata.markers.youarehere.lat && $scope.viewdata.markers.youarehere.lng) {
            var buffer = 0.01; // 1.0 = 55ish miles   0.1 = 5.5 miles   0.01 = .5  miles
            $scope.viewdata.bounds.southWest.lat = $scope.viewdata.markers.youarehere.lat - buffer;
            $scope.viewdata.bounds.southWest.lng = $scope.viewdata.markers.youarehere.lng - buffer;
            $scope.viewdata.bounds.northEast.lat = $scope.viewdata.markers.youarehere.lat + buffer;
            $scope.viewdata.bounds.northEast.lng = $scope.viewdata.markers.youarehere.lng + buffer;
        } else {
            $scope.showMessageModal("No Location", "Still trying to find your location. Make sure that you have location services turned on.");
        }
    };

    // passive map caching
    // as they browse the map, save the tiles on disk so they can switch to offline mode
    leafletData.getLayers().then(function(allLeafletLayers) {
        function saveTileLoadEventToCache(event) { $rootScope.saveLoadedTileToCache(event,'ParkInfo'); }
        allLeafletLayers.baselayers.ParkInfo.on('tileload', saveTileLoadEventToCache);
    });
});
