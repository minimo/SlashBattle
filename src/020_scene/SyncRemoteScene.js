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

      this.webRTC = this.app.webRTC;

      const remoteId = options.remoteId;
      const isRequest = options.isRequest;

      if (isRequest) {
        console.log(`Battle request for ${remoteId}`);
        this.webRTC.sendEvent("request_battle", { id: this.webRTC.id }, remoteId);
        this.state = "wait";
      } else {
        console.log(`Battle request for ${remoteId}`);
        this.webRTC.sendEvent("remote_sync_start", { id: this.webRTC.id }, remoteId);
        this.state = "sync";
       }

      this.webRTC.sendEvent("answer_state", { state: "sync" });

      this.on('remote_sync_start', () => {
        //疎通確認を行う
        if (isRequest) {
          this.webRTC.sendEvent("remote_sync_start", { id: this.webRTC.id }, remoteId);
        }
        this.webRTC.sendEvent("remote_sync_ok", { id: this.webRTC.id }, remoteId);
        this.state = "sync";
      });

      this.on('remote_sync_ok', () => {
        console.log("remote sync ok");
        setTimeout(() => this.exit("main", { remoteId, isRequest }), 100);
      });

      //接続キャンセル
      this.on('request_battle_cancel', () => this.state = "cancel");
    },

    setup: function() {
      const back = RectangleShape({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, fill: "black" })
        .setPosition(SCREEN_WIDTH_HALF, SCREEN_HEIGHT_HALF)
        .addChildTo(this);
      this.registDispose(back);

      this.label = Label({ text: "", fill: "white", fontSize: 24 })
        .setPosition(SCREEN_WIDTH_HALF, SCREEN_HEIGHT_HALF)
        .addChildTo(this);
      this.registDispose(this.label);

      this.enemyLabel = Label({ text: "", fill: "white", fontSize: 24 })
        .setPosition(SCREEN_WIDTH_HALF, SCREEN_HEIGHT_HALF + 25)
        .addChildTo(this);
      this.registDispose(this.enemyLabel);

      this.indicater = Label({ text: "", fill: "white", fontSize: 24 })
        .setPosition(SCREEN_WIDTH_HALF, SCREEN_HEIGHT_HALF + 50)
        .addChildTo(this);
      this.registDispose(this.indicater);

      this.time = 0;
    },

    update: function() {
      switch (this.state) {
        case "wait":
          this.label.text = "対戦相手を待っています";
          break;
        case "sync":
          this.label.text = "同期中";
          break;
        case "cancel":
          this.label.text = "接続がキャンセルされました";
          this.state = "return";
          this.time = 0;
          break;
        case "return":
          if (this.time == 120) this.exit("title");
      }

      this.indicater.text = "";
      if (this.state == "wait") {
        const c = Math.floor((this.time / 60) % 11);
        c.times(() => this.indicater.text += ".");
      }
      this.time++;
    },

  });

});
