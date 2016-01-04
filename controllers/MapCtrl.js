/* jshint -W097, unused: true */
/* globals angular */
/* globals ga */
/* globals window */
"use strict";

angular.module('app').controller('MapCtrl', function($scope, SiteConfigGlobals, $rootScope, $cordovaGeolocation, leafletData) {
    // default map view
    // a location watch will pan the map as well, and focusing a park via focusedResult will center the map as well
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
            destination: { // a marker for the park of interest
                lat: 0,
                lng: 0,
                icon: {
                    iconUrl: 'img/marker-target.png',
                    iconSize: [ 32, 32 ],
                    iconAnchor: [ 16,  16 ],
                    popupAnchor:[ 8,  8 ]
                }
            },
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

                url = isNowOffline ? window.cordova.file.dataDirectory + "ParkInfo-{z}-{x}-{y}.png" : layerobj.options.urlOnlineMode;
                layerobj.setUrl(url);
            }

            for (var oname in allLeafletLayers.overlays) {
                layerobj = allLeafletLayers.overlays[oname];
                if (! layerobj.options.urlOnlineMode) continue;

                url = isNowOffline ? window.cordova.file.dataDirectory + "ParkInfo-{z}-{x}-{y}.png" : layerobj.options.urlOnlineMode;
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
        $scope.viewdata.markers.youarehere.insideCalifornia = $rootScope.isLatLngWithinBounds(position.coords.latitude, position.coords.longitude);
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

    // if our park of interest changes, zoom the map
    // this would typically happen only if someone clicked a search result, and thus wanted to go to the map
    // but could happen from other reasons they'd want to zoom to a park, e.g. a popup bubble on the map
    // tip: the usual race condition hack, that if we just came into this view the map DIV may not in fact be visible on screen and will malfunction if you change its state, see issue #43
    $scope.viewdata.park = null;
    $rootScope.$watch('focusedResult', function (newData) {
        $scope.viewdata.park = newData;

        if (newData) {
            $scope.viewdata.bounds.southWest.lat = $scope.viewdata.park.s;
            $scope.viewdata.bounds.southWest.lng = $scope.viewdata.park.w;
            $scope.viewdata.bounds.northEast.lat = $scope.viewdata.park.n;
            $scope.viewdata.bounds.northEast.lng = $scope.viewdata.park.e;
        }

        if (newData) {
            $scope.viewdata.title = $scope.viewdata.park.name;
        } else {
            $scope.viewdata.title = "Map";
        }

        if (newData) {
            $scope.viewdata.markers.destination.lat = $scope.viewdata.park.lat;
            $scope.viewdata.markers.destination.lng = $scope.viewdata.park.lng;
        } else {
            $scope.viewdata.markers.destination.lat = 0;
            $scope.viewdata.markers.destination.lng = 0;
        }
    });

    // click the map for an infobubble
    // doesn't need to zoom the map or anything; the popup bubble will have a zoom link if they really do want to disrupt their map view
    $scope.$on('leafletDirectiveMap.click', function (leafletDirectiveEvent, eventTarget) {
        var latlng = eventTarget.leafletEvent.latlng;
        $scope.getInfoAtLatLng(latlng.lat, latlng.lng);
    });
    $scope.getInfoAtLatLng = function (lat, lng) {
        var url    = 'https://websites.greeninfo.org/parkinfo/mobile/query_latlng.php';
        var params = {
            lat: lat,
            lng: lng,
        };
        var options = {
            showSpinner: false
        };

        $scope.getJSON(url, params, options, function (info) {
            if (! info) return; // nothing here, that's no crime

            // set this park to be the Focused Park
            // this will propagate back down to this controller, updating the markers and the map title, etc.
            // yay for a consistent format for what is a Park, right?
            $rootScope.focusedResult = info;

            // put the marker anchor wherever they clicked; for this use case we know it's contained within a park, and this actually allows them to "move" the popup if it's obscuring the page
            // compose HTML for the popup

            var html = '';
            html +='<span>';
                html += '<h4>{{ viewdata.park.name }}</h4>';
                html += '<div>{{ viewdata.park.acres|number }} acres</div>';
                html += '<div>{{ viewdata.park.manager }}</div>';
                if (info.url) {
                    html += '<br/>';
                    html += '<div><a href="javascript:void(0);" ng-click="openWebsiteForFocusedPark();">Website</a></div>';
                }
                html += '<br/>';
                html += '<div><a href="javascript:void(0);" ng-click="getDirectionsToFocusedPark()">Directions</a></div>';
                html += '<br/>';
            html +='</span>';

            $scope.viewdata.popup.html = html;
            $scope.viewdata.popup.lat = info.lat;
            $scope.viewdata.popup.lng = info.lng;
            $scope.viewdata.popup.visible = true;
        });
    };

    // for the park-info popup bubbles, handlers for clicking the Website, Directions, etc.
    $scope.getDirectionsToFocusedPark = function () {
        // Google Analytics
        ga('send', 'event', 'parkinfo', 'directions');

        if ($scope.viewdata.park && $scope.viewdata.park.closest_lat && $scope.viewdata.park.closest_lng) {
            $rootScope.openDirectionsToLatLng($scope.viewdata.park.closest_lat, $scope.viewdata.park.closest_lng, $scope.viewdata.park.name, $scope.viewdata.my_lat, $scope.viewdata.my_lng);
        }
        else if ($scope.viewdata.park && $scope.viewdata.park.lat && $scope.viewdata.park.lng) {
            $rootScope.openDirectionsToLatLng($scope.viewdata.park.lat, $scope.viewdata.park.lng, $scope.viewdata.park.name, $scope.viewdata.my_lat, $scope.viewdata.my_lng);
        }
        else {
            // this should never happen but handle it anyway
            $scope.showMessageModal("No Park Selected", "Please select a park, by clicking the map or running a search.");
        }
    };
    $scope.openWebsiteForFocusedPark = function () {
        // Google Analytics
        ga('send', 'event', 'parkinfo', 'website');

        if ($scope.viewdata.park && $scope.viewdata.park.url) {
            $rootScope.openURL($scope.viewdata.park.url);
        } else {
            // this should never happen but handle it anyway
            $scope.showMessageModal("No Park Selected", "Please select a park, by clicking the map or running a search.");
        }
    };

    // the buttons for zooming the map to your location or to the Focused Park
    $scope.zoomToDestination = function () {
        $scope.viewdata.bounds.southWest.lat = $scope.viewdata.park.s;
        $scope.viewdata.bounds.southWest.lng = $scope.viewdata.park.w;
        $scope.viewdata.bounds.northEast.lat = $scope.viewdata.park.n;
        $scope.viewdata.bounds.northEast.lng = $scope.viewdata.park.e;
    };
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
