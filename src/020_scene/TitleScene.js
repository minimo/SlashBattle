/*
 *  TitleScene.js
 */

phina.namespace(function() {

  phina.define('TitleScene', {
    superClass: 'BaseScene',

    _static: {
      isAssetLoaded: false,
    },

    init: function(options) {
      this.superInit();

      this.progress = 0;
      this.isExit = false;

      //ロード済みならアセットロードをしない
      if (TitleScene.isAssetLoaded) {
        this.setup();
      } else {
        //preload asset
        const assets = AssetList.get("preload")
        this.loader = phina.asset.AssetLoader();
        this.loader.on('load', () => {
          this.setup()
          TitleScene.isAssetLoaded = true;
        });
        this.loader.load(assets);
      }
    },

    setup: function() {
      const back = RectangleShape({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, fill: "black" })
        .setPosition(SCREEN_WIDTH_HALF, SCREEN_HEIGHT_HALF)
        .addChildTo(this);
      this.registDispose(back);

      const label = Label({ text: "TitleScene", fill: "white" })
        .setPosition(SCREEN_WIDTH_HALF, SCREEN_HEIGHT_HALF)
        .addChildTo(this);
      this.registDispose(label);

      back.setInteractive(true);
      back.on('pointend', () => this.exit("main"));

      //アセット後処理
      const assets = AssetList.get("preload");
      assets.image.forIn(key => {
        if (phina.asset.AssetManager.get("image", key + "_mask")) return;

        const tex = phina.asset.AssetManager.get("image", key).clone();
        tex.filter( function(pixel, index, x, y, bitmap) {
            const data = bitmap.data;
            data[index + 0] = 0;
            data[index + 1] = 0;
            data[index + 2] = 0;
        });
        phina.asset.AssetManager.set("image", key + "_mask", tex);
      });
    },

    update: function() {
      if (!TitleScene.isAssetLoaded || this.isExit) return;
      var kb = phina_app.keyboard;
      if (kb.getKey("space") || kb.getKey("z")) {
        this.isExit = true;
        this.exit("main");
      }
    },

  });

});
