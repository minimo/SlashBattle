phina.namespace(function() {

  phina.define('MainScene', {
    superClass: 'BaseScene',

    init: function(options) {
      this.superInit();

      this.app.state = "main";
      this.anotherPlayer = null;
      this.remoteId = options.remoteId;
      this.isHost = options.isRequest;

      this.setup();

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
      this.objectLayer = this.layers[LAYER_OBJECT];
      this.collisionLayer = this.layers[LAYER_COLLISION];
      
      this.map = WorldMap("map1")
        .setPosition(0, -250)
        .addChildTo(this.layers[LAYER_MAP]);

      this.player = Player(this).addChildTo(this.layers[LAYER_PLAYER])
      if (this.isHost) {
          this.player.setPosition(100, 100);
        } else {
          this.player.setPosition(400, 100);
        }

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
