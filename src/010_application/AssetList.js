/*
 *  AssetList.js
 */

phina.namespace(function() {

  phina.define("AssetList", {
    _static: {
      loaded: [],
      isLoaded: function(assetType) {
        return AssetList.loaded[assetType]? true: false;
      },
      get: function(assetType) {
        AssetList.loaded[assetType] = true;
        switch (assetType) {
          case "preload":
            return {
              image: {
                "actor4": "assets/textures/actor4.png",
                "shadow": "assets/textures/shadow.png",
                "weapons": "assets/textures/weapons.png",
                "item": "assets/textures/item.png",
              },
              sound: {
                "slash": "assets/sounds/sen_ka_katana_sasinuku01.mp3",
              },
              tmx: {
                "map1": "assets/map/main.tmx",
              },
              tsx: {
                "tile_a": "assets/map/tileA.tsx",
                "tile_d": "assets/map/tileD.tsx",
              }
            };
            case "common":
            return {
              image: {
              },
            };

          default:
            throw "invalid assetType: " + options.assetType;
        }
      },
    },
  });

});
