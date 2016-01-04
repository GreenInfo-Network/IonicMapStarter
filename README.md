# IonicMapStarter

https://github.com/gregallensworth/IonicMapStarter

Jumpstart your Ionic map-based apps with this starter template.

A minimal but functional, standalone mobile app from which to build your own creations.


# Getting Started

Using Ionic CLI, you should be able to "ionic start" directly from one of the releases here:

    https://github.com/gregallensworth/IonicMapStarter/releases

After initializing your Ionic app, add platforms and plugins as needed for your own development. Typically you will want at least these:

```
ionic platform add android
ionic platform add ios

ionic plugin add cordova-plugin-whitelist
ionic plugin add ionic-plugin-keyboard
ionic plugin add cordova-plugin-device
ionic plugin add cordova-plugin-geolocation
ionic plugin add cordova-plugin-file
ionic plugin add cordova-plugin-file-transfer
ionic plugin add cordova-plugin-inappbrowser
```


# Customizing Your App

* Check out _config.xml_ to start personalizing your app: the name and author attribution, etc. You'll also need to do this in iOS via Xcode.

* Customize _index.html_ and _index.js_ to describe the layout of your app.

* Create new controllers under the *controllers* folder and new views under the *templates* folder, to match the layout you described in index.html and index.js

* Check out _library.js_ for a bunch of $rootScope functions that are quite useful, e.g. wrappers to open a directions service, or to open a browser, auto-detecting your platform.

* Swap out splash screens and icons. Replace resources/icon.png and resources/splash.png and run *ionic resources*

And now it's *your* app. Enjoy!


# Ionic's Official Map Temlpate

Ionic does have an official map starter template, which deserves a word.

    https://github.com/driftyco/ionic-starter-maps

This template has only one page, and a sidemenu-based slide-in menu on the left. It has a few shortcomings and inflexibilities, which IonicMapStarter addresses:
* It has only one single panel and a sidemenu. If you want to switch to another panel, no mechanism is provided; sidemenu really does restrict you in that regard.
* IonicMapStarter supports buttons in both the top-right and top-left corners, and these are customized in each view. Sidemenu hogs the top-left corner, and doesn't allow you to place an icon in the top-right.
* It uses Google Maps which has usage restrictions and other potential concerns for your use case. This uses Leaflet so you're without restriction, but also provides working code for Bing Maps and Google Maps.

This isn't to disparage the fabulous work that is Ionic, of course! But it demonstrates that for your use case one or the other may be preferable.


# Phonegap Build

The content of the _www_ folder should be ready-to-run app with Phonegap Build. You should be able to ZIP up just the _www_ content and upload to PGB.

I myself do not use Phonegap Build, and cannot provide support for it.
