/*
 *  RemoteSyncScene.js
 */

phina.namespace(function() {

  phina.define('SyncRemoteScene', {
    superClass: 'BaseScene',

    _static: {
      isAssetLoaded: false,
    },

    init: function(options) {
      this.superInit();
      this.setup();
    },

    setup: function() {
      const back = RectangleShape({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, fill: "black" })
        .setPosition(SCREEN_WIDTH_HALF, SCREEN_HEIGHT_HALF)
        .addChildTo(this);
      this.registDispose(back);

      const label = Label({ text: "同期中", fill: "white" })
        .setPosition(SCREEN_WIDTH_HALF, SCREEN_HEIGHT_HALF)
        .addChildTo(this);
      this.registDispose(label);
    },

    update: function() {
    },

  });

});
