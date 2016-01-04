# IonicMapStarter

https://github.com/greeninfo/IonicMapStarter

Jumpstart your Ionic map-based apps with this starter template.

A minimal but functional, standalone mobile app from which to build your own creations.


# Getting Started

Using Ionic CLI, you should be able to "ionic start" using this repo directly:

```
ionic start -i com.example.yourapp -a "Your App Name" -t https://github.com/greeninfo/IonicMapStarter YourAppFolder
```

After initializing your Ionic app, add platforms and plugins as needed for your own development. Typically you will want at least these, in addition to the several that Ionic installs by default:

```
ionic platform add android
ionic platform add ios

ionic plugin add cordova-plugin-geolocation
ionic plugin add cordova-plugin-file
ionic plugin add cordova-plugin-file-transfer
ionic plugin add cordova-plugin-inappbrowser
```


# Next Steps

Now you're on your own, writing your Ionic app your way. But some steps come up a lot, so you may want to just knock them off now so you can focus on your application instead of these details.

Edit _config.xml_ to set your app's name, author attribution, initial version number, etc.

Edit _config.xml_ and add these two lines to enable Internet access.

```
  <allow-navigation href="*" />
  <allow-intent href="*" />
```

If you're building for iOS, enable all orientations by adding this into _config.xml_:

```
  <platform name="ios">
    <preference name="Orientation" value="all"/>
  </platform>
```

Replace _resources/splash.png_ and _resources/icon.png_ with your own images, then run _ionic resources_ to build your new set of icons and splash screens. You may want to follow up by checking the image folders in your file explorer's thumbnail mode; sometimes it misses one.


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
