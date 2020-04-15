phina.namespace(function() {

  phina.define('MainScene', {
    superClass: 'BaseScene',

    init: function(options) {
      this.superInit();
      this.setup();
      this.app.state = "main";

      this.anotherPlayer = null;

      this.on('data', e => {
        const data = JSON.parse(e.data);
        if (!data) return;
        if (!this.anotherPlayer) {
          this.anotherPlayer = Player(this)
            .addChildTo(this)
            .setPosition(data.x, data.y);
          this.anotherPlayer.isRemotePlayer = true;
        } else {
          this.anotherPlayer.setControlData(data);
          this.anotherPlayer.setPosition(data.x, data.y);
        }
      })
    },

    setup: function() {
      const back = RectangleShape({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, fill: "black" })
        .setPosition(SCREEN_WIDTH_HALF, SCREEN_HEIGHT_HALF)
        .addChildTo(this);
      this.registDispose(back);

      this.player = Player(this)
        .addChildTo(this)
        .setPosition(500, 100);
      Label({ text: "▼", fill: "white", fontSize: 8 })
        .addChildTo(this.player)
        .setPosition(0, -20);
},

    update: function() {
      const data = this.app.controller;
      data.x = this.player.x;
      data.y = this.player.y;
      this.app.webRTC.send(JSON.stringify(data));
    },

  });

});
