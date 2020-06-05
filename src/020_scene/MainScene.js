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
        }
        this.anotherPlayer.setControlData(data);
        this.anotherPlayer.setPosition(data.x, data.y);
        this.anotherPlayer.sprite.scaleX = data.scaleX;
        this.anotherPlayer.hp = this.anotherPlayer.hp;
        this.anotherPlayer.hpMax = this.anotherPlayer.hpMax;
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

      this.base = DisplayElement().addChildTo(this).setPosition(-50, -250);

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
      this.debugLayer = this.layers[LAYER_DEBUG];

      //マップ作成
      this.map = WorldMap("map1")
        .setPosition(0, 0)
        .addChildTo(this.layers[LAYER_MAP]);
      this.map.getCollisionData().forEach(e => e.addChildTo(this.collisionLayer));

      //プレイヤー
      this.player = Player(this).addChildTo(this.layers[LAYER_PLAYER])
      if (this.isHost) {
          this.player.setPosition(300, 100);
        } else {
          this.player.setPosition(150, 100);
        }
      //識別サイン
      this.player.sign = Label({ text: "▼", fill: "white", fontSize: 8 })
        .addChildTo(this.player)
        .setPosition(0, -25);
      this.player.sign.tweener.clear()
        .to({ y: -20 }, 1000)
        .set({ y: -25 })
        .setLoop(true);

      //体力ゲージ
      const labelParam = {
        fill: "white",
        stroke: "black",
        strokeWidth: 1,
        align: "left",
        baseline: "middle",
        fontSize: 20,
        fontWeight: ''
      };
      this.lifeGaugeLabel = Label({ text: "LIFE" }.$safe(labelParam)).addChildTo(this).setPosition(0, 10);
      const options = {
        width:  200,
        height: 5,
        backgroundColor: 'transparent',
        fill: 'red',
        stroke: 'white',
        strokeWidth: 2,
        gaugeColor: 'lime',
        cornerRadius: 0,
        value: this.player.hp,
        maxValue: this.player.hpMax,
      };
      this.lifeGauge = phina.ui.Gauge(options).addChildTo(this).setOrigin(0, 0.5).setPosition(40, 10);
      const player = this.player;
      this.lifeGauge.update = function() {
        this.value = player.hp;
        this.width = player.hpMax * 2;
        this.maxValue = player.hpMax;
      };
    },

    update: function() {
      this.base.x = SCREEN_WIDTH * 0.5 - this.player.x;
      this.base.y = SCREEN_HEIGHT * 0.5 - this.player.y;

      if (this.remoteId) {
        const data = this.app.controller;
        data.x = this.player.x;
        data.y = this.player.y;
        data.scaleX = this.player.sprite.scaleX;
        data.hp = this.player.hp;
        data.hpMax = this.player.hpMax;
        this.app.webRTC.sendEvent("playerdata", data, this.remoteId);
      }
    },

  });

});
