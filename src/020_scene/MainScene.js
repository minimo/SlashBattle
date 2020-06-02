phina.namespace(function() {

  phina.define('MainScene', {
    superClass: 'BaseScene',

    init: function(options) {
      this.superInit();
      this.setup();
      this.app.state = "main";

      this.anotherPlayer = null;
      this.remoteId = options.remoteId;

      this.on('playerdata', e => {
        const data = e.data;
        if (!data) return;
        if (!this.anotherPlayer) {
          this.anotherPlayer = Player(this)
            .addChildTo(this.layers[LAYER_ENEMY])
            .setPosition(data.x, data.y);
          this.anotherPlayer.isRemotePlayer = true;
        } else {
          this.anotherPlayer.setControlData(data);
          this.anotherPlayer.setPosition(data.x, data.y);
          this.anotherPlayer.sprite.scaleX = data.scaleX;
        }
      });

      //リモート側からクローズ通知を受けた
      this.on("webrtc_dataconnection_close", () => {
        if (!this.anotherPlayer) return;
        this.anotherPlayer.remove();
        this.anotherPlayer = null;
      });
    },

    setup: function() {
      // const back = RectangleShape({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, fill: "black" })
      //   .setPosition(SCREEN_WIDTH_HALF, SCREEN_HEIGHT_HALF)
      //   .addChildTo(this);
      // this.registDispose(back);
      this.back = Sprite("back")
        .setOrigin(0, 0)
        .setScale(1.5)
        .addChildTo(this);

      this.base = DisplayElement().addChildTo(this);

      this.layers = [];
      (NUM_LAYERS).times(i => {
        const layer = DisplayElement().addChildTo(this.base)
        this.layers.push(layer);
      });
      //レイヤーショートカット
      this.playerLayer = this.layers[LAYER_PLAYER];
      this.enemyLayer = this.layers[LAYER_ENEMY];
      
      this.map = WorldMap("map1")
        .setPosition(0, -250)
        .addChildTo(this.layers[LAYER_MAP]);

      this.player = Player(this)
        .addChildTo(this.layers[LAYER_PLAYER])
        .setPosition(500, 100);

      Label({ text: "▼", fill: "white", fontSize: 8 })
        .addChildTo(this.player)
        .setPosition(0, -20);
    },

    update: function() {
      const data = this.app.controller;
      data.x = this.player.x;
      data.y = this.player.y;
      data.scaleX = this.player.sprite.scaleX;
      this.app.webRTC.sendEvent("playerdata", data, this.remoteId);
    },

  });

});
