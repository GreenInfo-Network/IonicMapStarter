/*
 * The first few sections are where one does the most general configuration
 * declare a controller-URL mapping, define global (static) configurations, define global (non-static) flags and structures
 * then define the library of global generally-useful functions
 * 
 * Additionally see afterthoughts.js for some other code that sets up the app, 
 */

/* jshint -W097, unused: true */
/* globals angular */
/* globals window */
/* globals L */
"use strict";

angular.module('app', ['ionic', 'ngCordova', 'leaflet-directive'])
.config(function($stateProvider, $urlRouterProvider) {
    //
    // part 1: routing and controllers and views
    //

    $urlRouterProvider.otherwise('/app/menu');

    $stateProvider
        .state('about',            { url: '/app/about',          templateUrl: 'templates/about.html',          controller:'AboutCtrl'  })
        .state('menu',             { url: '/app/menu',           templateUrl: 'templates/menu.html',           controller:'MenuCtrl'  })
        .state('map',              { url: '/app/map',            templateUrl: 'templates/map.html',            controller:'MapCtrl'  })
        .state('cache',            { url: '/app/cache',          templateUrl: 'templates/cache.html',          controller:'CacheMenuCtrl'  })
        .state('cache-usage',      { url: '/app/cache/usage',    templateUrl: 'templates/cache-usage.html',    controller:'CacheUsageCtrl'  })
        .state('cache-offline',    { url: '/app/cache/offline',  templateUrl: 'templates/cache-offline.html',  controller:'CacheOfflineCtrl'  })
        .state('cache-passive',    { url: '/app/cache/passive',  templateUrl: 'templates/cache-passive.html',  controller:'CachePassiveCtrl'  })
        .state('cache-nearby',     { url: '/app/cache/nearby',   templateUrl: 'templates/cache-nearby.html',   controller:'CacheNearbyCtrl'  });
})
.constant('SiteConfigGlobals', {
    //
    // part 2
    // configuration variables and settings, e.g. geographic locations, URLs to services, bounding boxes, other strings, ...
    //

    // the bounding box of California, which is also a geocode biasing box
    // and also the starting view of the map
    // and also the "your latlng is outside Calfiornia" bounding box
    bbox_s:  -90,
    bbox_w: -180,
    bbox_n:   90,
    bbox_e:  180,

    // the min & max zoom of the map
    // tip: the caching system has a maximum depth as well, so we don't download level 18 for 100 square miles; it's wise to make this max the same as the cache's max
    //      so we don't get a goofy situation of claiming to have cached an area, but not to the entire depth available
    max_zoom: 16,
    min_zoom: 4,

    // what map layers exist in the map? this will be copied into the leafletData, but is here for reference
    // since we something other than MapCtrl may want to know the names of layers e.g. the offline tile cache components
    // the structure used here is per the angular-leaflet-directive library
    // except for the addition of urlOnlineMode which is the same as the 'url' and is used to inform the system that this basemap can be cached
    mapLayers: {
        baselayers: {
            OSM: {
                name: 'OSM',
                url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                type: 'xyz',
                layerOptions: {
                    urlOnlineMode: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    errorTileUrl:'img/nodata_tile.png',
                    attribution: '&copy; <a href="javascript:void(0);" onClick="window.cordova.InAppBrowser.open(\'http://www.openstreetmap.org/copyright/\', \'_system\');">OpenStreetMap contributors</a>'
                }
            },
            BingAerial: {
                name: 'Bing Aerial',
                type: 'bing',
                key: "YOUR_BING_API_KEY_HERE",
                layerOptions: {
                    type: 'AerialWithLabels'
                }
            },
            BingRoads: {
                name: 'Bing Roads',
                type: 'bing',
                key: "YOUR_BING_API_KEY_HERE",
                layerOptions: {
                    type: 'Road'
                }
            },
            GoogleTerrain: {
                name: 'Google Terrain',
                layerType: 'TERRAIN',
                type: 'google'
            },
            GoogleHybrid: {
	        name: 'Google Hybrid',
	        layerType: 'HYBRID',
	        type: 'google'
	    },
            GoogleRoadmap: {
                name: 'Google Streets',
                layerType: 'ROADMAP',
                type: 'google'
            }
        },
        overlays: {
        }
    }
})
.run(function($rootScope) {
    //
    // part 3
    // globally-available flags which are not constants, e.g. whether we are in Offline Mode, the latest set of Search Results and the Focused Result, etc.
    // the Angular Way would be a service, but injecting a service into every single controller is really the same inconvenience level as injecting $rootScope so what's the big deal?
    //

    // are we in Offline Mode or Online Mode?
    // should we enable passive caching of map tiles as they browse around?
    $rootScope.offlinePassive = false;
    $rootScope.offlineMode = false;

    // our latest/current set of search results
    // and (if any) the specific result that they chose for focus
    $rootScope.searchResults = [];
    $rootScope.focusedResult = null;
})
.run(function($rootScope, SiteConfigGlobals, $ionicHistory, $ionicPopup, $ionicLoading, $http) {
    //
    // part 4
    // global functions available in all controller scopes
    // again the Angular dream is a Service, but they're a repetitive nuisance and don't do well with embedding a service into another service e.g. fetching JSON
    //

    $rootScope.serialize = function (object) {
        var result = [];
        for (var property in object) result.push(encodeURIComponent(property) + "=" + encodeURIComponent(object[property]));
        return result.join("&");
    };

    // backButton() is very handy for Back buttons in the header bar
    $rootScope.backButton = function () {
        $ionicHistory.goBack();
    };

    // showMessageModal() shows a modal dialog, great for showing an error message that doesn't need context
    $rootScope.showMessageModal = function (title,message) {
        $ionicPopup.alert({
            title: title,
            template: message,
            okText: 'Close',
            okType: 'button-positive'
        });
    };

    // a wrapper for closing the on-screen keyboard
    // called a lot when a search is submitted, since auto-focusing a text field makes the keyboard stay present until dismissed (every fix causes a problem, right?)
    $rootScope.closeKeyboard = function () {
        if (window.cordova && window.cordova.plugins.Keyboard) {
            window.cordova.plugins.Keyboard.close();
        }
    };
    $rootScope.openKeyboard = function () {
        if (window.cordova && window.cordova.plugins.Keyboard) {
            window.cordova.plugins.Keyboard.show();
        }
    };
    
    // a wapper for opening a URL in the system browser
    // this checks whether we're running under Cordova or else non-Cordova, so we can use the best browser-opening technique
    $rootScope.openURL = function (url) {
        if (window.cordova) {
            window.cordova.InAppBrowser.open(url, '_system');
        } else {
            window.open(url);
        }
    };

    // a wapper for opening Directions to a given lat-lng location
    // this opens up Google Maps or Apple Maps, which on Android and iOS will be intercepted and used to open native navigation
    // each platform is slightly different, some support opening a route between two places (origin and destination) and some do not
    // the title is optional, and in some cases would be used ot suggest a label for the point location
    $rootScope.openDirectionsToLatLng = function (dest_lat, dest_lng, title, origin_lat, origin_lng) {
        if (! title) title = "";

        var url = '', params = {};

        if (window.cordova && window.device.platform == 'Android') {
            // ANDROID has special handling for geo: URLs to lopen navigation
            // http://developer.android.com/guide/components/intents-common.html#Maps
            url = "geo:0,0?q=" + dest_lat + "," + dest_lng + '(' + title + ')';
        }
        else if (window.cordova && window.device.platform == 'iOS') {
            // IOS has special handling for maps:// URLs to open navigation
            // https://developer.apple.com/library/ios/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html
            if (origin_lat && origin_lng) {
                params.daddr = dest_lat + ',' + dest_lng;
                params.saddr = origin_lat + ',' + origin_lng;
            }
            else {
                params.ll = origin_lat + ',' + origin_lng;
                params.q = title;
            }
            url = 'maps://?' + $rootScope.serialize(params);
        }
        else {
            // OTHER: desktop or not mobile?
            // that's okay, use Google Maps and let them pick their starting place
            params.daddr = 'loc:' + dest_lat + ',' + dest_lng;
            if (origin_lat && origin_lng) {
                params.saddr  = 'loc:' + origin_lat + ',' + origin_lat;
            }

            url = 'http://maps.google.com/?' + $rootScope.serialize(params);
        }

        $rootScope.openURL(url);
    };

    // a wrapper around $http to parse the JSON or else nullify the response
    // cuz AngularJS's own automaic translation, will gladly return a string or a JSON-formatted string without decoding it (sigh)
    $rootScope.getJSON = function (url, params, options, callback) {
        options = angular.extend({
            showSpinner: true
        }, options);

        if (options.showSpinner) $ionicLoading.show({ templateUrl: 'templates/waiting.html' });

        $http({
            method: "GET", url: url, params: params,
            transformResponse: function (data) {
                try {
                    return JSON.parse(data);
                } catch(e) {
                    return null;
                }
            },
        }).then(
            function (request) {
                if (options.showSpinner) $ionicLoading.hide();
                callback(request.data);
            },
            function (error) {
                $ionicLoading.hide();
                $ionicPopup.alert({
                    title: 'Error',
                    template: "Request failed: " + error.statusText,
                    okText: 'Close',
                    okType: 'button-assertive'
                });
            }
        );
    };

    // utility functions regarding Lat-Lng points, what's nearby, their range to other LatLng points...

    // is the given lat & lng within the bounding area defined in SiteConfigGlobals?
    $rootScope.isLatLngWithinMaxBounds = function (lat, lng) {
        var bbox = L.latLngBounds([[ SiteConfigGlobals.bbox_s, SiteConfigGlobals.bbox_w ], [ SiteConfigGlobals.bbox_n, SiteConfigGlobals.bbox_e ]]);
        return bbox.contains( L.latLng([lat,lng]) );
    };

    // return the distance in meters between two lat & lng points
    $rootScope.distanceBetweenLatLng = function (origin_lat, origin_lng, target_lat, target_lng) {
        // distance in meters
        return  L.latLng([ origin_lat, origin_lng ]).distanceTo( L.latLng([ target_lat, target_lng ]) );
    };

    // return the distance between two lat & lng pairs, in miles and with text labeling
    $rootScope.distanceWording = function (meters) {
        var miles = (meters / 1609.34).toFixed(1) + ' ' + 'mi';
        return miles;
    };

    // return the heading compass direction a starting lat-lng to a target lat-lng, e.g. "N" or "SW"
    $rootScope.headingBetweenLatLng = function (origin_lat, origin_lng, target_lat, target_lng) {
        return L.latLng([ origin_lat, origin_lng ]).bearingWordTo( L.latLng([ target_lat, target_lng ]) );
    };
})
.run(function($rootScope, $timeout, $ionicPlatform, $cordovaFile, $cordovaFileTransfer, SiteConfigGlobals) {
    //
    // more global functions, these pertaining specifically to the cache
    // I'm separating these out from the others above, since the idea may be to separate this into a model or otherwise clean it up
    // note that this "service launch" also has code execution:
    //      initializeTileCache() is called now, to create a .nomedia file if necessary
    //

    // keep in mind when you want to change cacheZoomLevelMin and cacheZoomLevelMax, that it adds up very quickly!
    // zmin         1+2+2   = 5 -> 25 tiles
    // zmin + 1     1+4+4   = 9 -> 81 tiles
    // zmin + 2     1+8+8   = 17 -> 289 tiles
    // zmin + 3     1+16+16 = 33 -> 441 tiles
    // zmin + 4     1+32+32 = 65 -> 4225 tiles
    // zmin + 5     1+64+64 = 129 -> 16641 tiles
    // This is PER LAYER, e.g. 2 basemaps plus labels = 3 layers @ 21000 tiles apiece
    // my advice is to limit the map to level 16, unless they need meter-resolution surveying
    // second reason: at level 16 a phone shows a few city blocks, which is more useful than a tight close-up of one single house, so level 18 isn't even really useful for normal usage
    var cacheZoomLevelMin = 12;
    var cacheZoomLevelMax = 16;

    // initializeTileCache() creates the .nomedia file, useful on Android but harmless on iOS
    $ionicPlatform.ready(function() {
        // no Cordova means no caching at all, and no .nomedia file
        if (! window.cordova) return;

        // whether the file is created or not, we can't do anything about it and we don't in fact USE this file... so let it slide
        $cordovaFile.createFile(window.cordova.file.dataDirectory, '.nomedia', false).then(
            function () { // param: fileinfo
            },
            function () { // param: error
            }
        );
    });

    // tile cache: handle a tileload event, save the map tile to the device storage for potential offline use
    $rootScope.saveLoadedTileToCache = function (event, layerName) {
        if (! window.cordova) return; // not using Cordova, so no file API; should never happen in real use, but during development with a browser
        if (event.url.substr(0,4) != 'http') return; // not a HTTP URL, then maybe it's from file which means we loaded it form the cache
        if (! event.url) { window.console.error([ 'saveLoadedTileToCache', 'layer is not a XYZ tile layer', layerName ]); return; }// not a XYZ tile; should never happen
        if (! $rootScope.offlinePassive ) return; // having the global "enable passive" turned off, means no caching at this time
        
        var xyz = event.url.match(/\/(\d+)\/(\d+)\/(\d+)\.(png|jpg)$/);
        $rootScope.saveXYZTileToCache(event.url, layerName, xyz[2], xyz[3], xyz[1], false );
    };
    $rootScope.saveXYZTileToCache = function (url, layername, x, y, z, overwrite) {
        // make up the filename for the tile
        // the .png suffix isn't relevant; the browser/webview will load JPEGs with .png extensions, no sweat
        var targetFileName = [ layername, z, x, y ].join('-') + '.png';
        var targetFilePath = window.cordova.file.dataDirectory + targetFileName;

        function fetchit() {
            //console.log([ 'download', targetFileName, url ]);
            $cordovaFileTransfer.download(url, targetFilePath, {}, true).then(
                function () { // param: success
                    // yay for us, it's on disk; we don't even have to do the stupid iOS metadata hack, cuz config.xml took care of that
                    //console.log([ 'download-ok', targetFileName, url, success ]);
                },
                function () { // param: error
                    // nothing we can really do about this, the tile's already visible just not cached... so yeah
                    //console.log([ 'download-fail', targetFileName, url, error ]);
                }
            );
        }

        if (overwrite) {
            fetchit();
        } else {
            $cordovaFile.checkFile(window.cordova.file.dataDirectory, targetFileName).then(
                function () { // param: exists
                    // we do not overwrite, and the file does exist; nothing to do
                    //console.log([ 'have-skip', targetFileName, url ]);
                },
                function () { // param: error
                    // it does not exist, so we are good to overwrite it
                    //console.log([ 'nothave-need', targetFileName, url ]);
                    fetchit();
                }
            );
        }
    };

    // make a list of what tile downloads would need to happen to accomodate a given lat-lng point
    // at the prescribed set of zoom levels cacheZoomLevelMin through cacheZoomLevelMax
    $rootScope.generateTileListingFromLatLng = function (lat, lng) {
        // compose the list of tiles that would be required to seed all cache:true layers in SiteConfigGlobals.mapLayers
        var downloads = [];

        var layerinfo;
        for (var bname in SiteConfigGlobals.mapLayers.baselayers) {
            layerinfo = SiteConfigGlobals.mapLayers.baselayers[bname];
            if (! layerinfo.layerOptions.urlOnlineMode || layerinfo.type !='xyz') continue;
            downloads = downloads.concat( $rootScope.generateTileListingFromLatLngForLayer(bname, layerinfo, lat, lng) );
        }
        for (var oname in SiteConfigGlobals.mapLayers.overlays) {
            layerinfo = SiteConfigGlobals.mapLayers.overlays[oname];
            if (! layerinfo.layerOptions.urlOnlineMode || layerinfo.type !='xyz') continue;
            downloads = downloads.concat( $rootScope.generateTileListingFromLatLngForLayer(oname, layerinfo, lat, lng) );
        }

        return downloads;
    };
    $rootScope.generateTileListingFromLatLngForLayer = function (layername, layerinfo, lat, lng) {
        var downloads = [];

        // build the list of all tiles that we would download
        // for each Z, find the tile X and Y that would contain it
        // then fan out by a "radius" from there, that specific radius being dependent on the zoom level so as to catch the appropriate slice of the pyramid
        for (var z=cacheZoomLevelMin; z<=cacheZoomLevelMax; z++) {
            var radius = 2 * ( 1 + (z-cacheZoomLevelMin) );
            var tile_x = Math.floor((lng+180)/360*Math.pow(2,z));
            var tile_y = Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,z));

            for (var x=tile_x-radius; x<=tile_x+radius; x++) {
                for (var y=tile_y-radius; y<=tile_y+radius; y++) {
                    // compose an URL given the layer's URL template (may or may not use subdomains)
                    var url = layerinfo.url;
                    url = url.replace('{z}',z);
                    url = url.replace('{x}',x);
                    url = url.replace('{y}',y);
                    if (layerinfo.layerOptions.subdomains) {
                        var idx = Math.floor(Math.random() * layerinfo.layerOptions.subdomains.length);
                        var sub = layerinfo.layerOptions.subdomains[idx];
                        url = url.replace('{s}',sub);
                    }

                    // compose the filename for the downloaded tile
                    // the .png suffix isn't relevant; the browser/webview will load JPEGs with .png extensions, no sweat
                    var filename = [ layername, z, x, y ].join('-') + '.png';
                    var filepath = window.cordova.file.dataDirectory + filename;

                    // add it to the list
                    downloads.push({ layername:layername, x:x, y:y, z:z, url:url, filename:filename, filepath:filepath });
                } // end of this X/Y/tile URL
            } // end of the X column
        } // end of z level

        return downloads;
    };

    // do a series of downloads sequentially, calling various callback functions as things move along
    // progress function -- called after each one
    //      params: integer #done, integer #total
    // completion function -- called after we're done with the last one
    //      params: integer #total
    // error function if a tile cannot be downloaded (which does terminate the series)
    $rootScope.downloadTileListing = function (downloads, callback_progress, callback_done, callback_error) {
        function saveTile (downloadlist,i) {
            // if we're already at the end, then we're done; call the completion callback
            if (i >= downloadlist.length) {
                $timeout(function () { callback_done(downloadlist.length); }, 1);
                return;
            }

            var downloadinfo = downloadlist[i];
            $cordovaFile.checkFile(window.cordova.file.dataDirectory, downloadinfo.filename).then(
                function () { // param: exists
                    // it already exists so we're done
                    // move on to the next tile, and call or progress in a timeout so it run in a separate thread and an error in their progress callback won't terminate this series
                    $timeout(function () { callback_progress(i+1, downloadlist.length); }, 1);
                    saveTile(downloadlist, i+1);
                },
                function () { // param: error
                    // it does not exist, so we should go ahead with the download
                    $cordovaFileTransfer.download(downloadinfo.url, downloadinfo.filepath, {}, true).then(
                        function () { // param: success
                            // download OK, yay for earth!
                            // move on to the next one, and call the progress indicator in a timeout so we won't get exceptionated if it's botched
                            $timeout(function () { callback_progress(i+1, downloadlist.length); }, 1);
                            saveTile(downloadlist, i+1);
                        },
                        function (error) {
                            // download failed, boo!
                            // run the error callback and do not proceed to the next download in the series
                            callback_error(error);
                        }
                    );
                }
            );
        }

        // start at the beginning
        saveTile(downloads, 0);
    };

    // tile cache: get usage stats: count of files, storage used in MB
    $rootScope.getCacheUsage = function (callback) {
        var sums = {
            megabytes: 0,
            filecount: 0,
        };
        $cordovaFile.checkDir(window.cordova.file.dataDirectory, ".").then(function (dir) {
            dir.createReader().readEntries(
                function (entries) {
                    // filter the entries to only .png files
                    // some day we'll want to store other data that won't get purged, e.g. JSON configuration files, a .nomedia file, ...
                    // and Android includes subfolders e.g. Documents even if we don't ask for it
                    entries = entries.filter(function (fileinfo) {
                        if (! fileinfo.isFile) return false;
                        if (fileinfo.name.substr(-4) !== '.png') return false;
                        return true;
                    });

                    // the file count is easy enough...
                    sums.filecount = entries.length;

                    // iterate over the files, tally the total size; convert to MiB
                    // but the filesize itself is an async, so we can't even do THAT without a fight :)
                    // fought for over two hours trying to make this a promise chain, but it just ain't gonna happen; we need it DONE, not need it GOOD
                    function processEntry(entries, i) {
                        if (i >= entries.length) { // done
                            sums.megabytes = sums.megabytes / 1048576.0;
                            callback(sums);
                            return;
                        }

                        entries[i].file(function (fileinfo) {
                            sums.megabytes += fileinfo.size;
                            processEntry(entries, i+1);
                        });
                    }
                    processEntry(entries, 0);
                },
                function () { // params: error
                    sums.filecount = -1;
                    sums.megabytes = -1000;
                    callback(sums);
                }
            );
        });
    };

    // utility function
    // tile cache: empty all contents
    // again, a callback is far simpler/faster than trying to do a promise chain, and we need toget this working sooner than later
    $rootScope.emptyCache = function (callback) {
        $cordovaFile.checkDir(window.cordova.file.dataDirectory, ".").then(function (dir) {
            dir.createReader().readEntries(
                function (entries) {
                    // filter the entries to only .png files
                    // some day we'll want to store other data that won't get purged, e.g. JSON configuration files, a .nomedia file, ...
                    // and Android includes subfolders e.g. Documents even if we don't ask for it
                    entries = entries.filter(function (fileinfo) {
                        if (! fileinfo.isFile) return false;
                        if (fileinfo.name.substr(-4) !== '.png') return false;
                        return true;
                    });

                    // iterate over the files, tally the total size; convert to MiB
                    // but the filesize itself is an async, so we can't even do THAT without a fight :)
                    // fought for over two hours trying to make this a promise chain, but it just ain't gonna happen; we need it DONE, not need it GOOD
                    function processEntry(entries, i) {
                        if (i >= entries.length) { // done
                            callback();
                            return;
                        }

                        entries[i].remove(function () {
                            processEntry(entries, i+1);
                        });
                    }
                    processEntry(entries, 0);

                    // done!
                    callback();
                }
            );
        });
    };
 });


/*
 * Afterthoughts and general stuff that will likely apply to all Angular/Ionic apps and not need any modification
 * e.g. keyboard fixes and caching fixes, custom directives you can take for granted
 */

angular.module('app')
.config(function($ionicConfigProvider) {
    // Ionic's own caching isn't aggressive enough: when a page is un-cached the typed search text is lost, map state forgotten, etc.
    // this should make it nice and aggressive so it forgets less often
    $ionicConfigProvider.views.forwardCache(true);
    $ionicConfigProvider.views.maxCache(1000);
})
.directive('focusMe', function($timeout) {
    // a custom directive to cause a text input to become focused when the panel is switched
    // place this onto the label wrapper around an input, not on the input itself
    //     <label focus-me><input type="text" /></label>
    // https://forum.ionicframework.com/t/auto-focus-textbox-while-template-loads/6851/12
    return {
        link: function(scope, element) {
            $timeout(function() {
                element[0].focus(); 

                // Android won't open the keyboard on input focus, do so explicitly
                // on iOS the keyboard is displayed on input focus, and though this fails with a "Showing keyboard not supported in iOS due to platform limitations" message it is harmless
                if (window.cordova && window.cordova.plugins.Keyboard) {
                    window.cordova.plugins.Keyboard.show();
                }
            }, 150);
        }
    };
})
.run(function($ionicPlatform) {
    // workarounds for the on-screen keyboard; I don't really know what this does in depth, though have been advised to leave it alone
    $ionicPlatform.ready(function() {
        if (window.cordova && window.cordova.plugins.Keyboard) {
            window.cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
            window.cordova.plugins.Keyboard.disableScroll(true);
        }
        if (window.StatusBar) {
            window.StatusBar.styleDefault();
        }
    });
});
