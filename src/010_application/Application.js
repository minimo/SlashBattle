phina.namespace(function() {

  phina.define("Application", {
    superClass: "phina.display.CanvasApp",

    quality: 1.0,

    state: "",
  
    init: function() {
      this.superInit({
        fps: 60,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        fit: true,
      });
  
      //シーンの幅、高さの基本を設定
      phina.display.DisplayScene.defaults.$extend({
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
      });
  
      phina.input.Input.quality = this.quality;
      phina.display.DisplayScene.quality = this.quality;

      //ゲームパッド管理
      this.gamepadManager = phina.input.GamepadManager();
      this.gamepad = this.gamepadManager.get(0);
      this.controller = {};

      this.setupEvents();
      this.setupSound();
      this.setupMouseWheel();

      //シーンを離れる際、ボタン同時押しフラグを解除する
      this.on("changescene", () => Button.actionTarget = null);

      //パッド情報を更新
      this.on('enterframe', function() {
        this.gamepadManager.update();
        this.updateController();
      });

      this.webRTC = null;
      this.setupWebRTC();

      this.on('request_state', e => {
        let state = "";
        const currentScene = this.currentScene;
        if (currentScene instanceof TitleScene) state = "title";
        if (currentScene instanceof MainScene) state = "main";
        if (currentScene instanceof SyncRemoteScene) state = "sync";
        this.webRTC.sendEvent('answer_state', { state }, e.dataConnection.remoteId);
      });

      this.state = "";

      //ページを閉じた場合にイベント発火
      window.addEventListener("beforeunload", () => {
        this.currentScene.flare("beforeunload");
        if (this.webRTC) {
          this.webRTC.destroy();
        }
      });
    },
  
    //マウスのホールイベント関連
    setupMouseWheel: function() {
      this.wheelDeltaY = 0;
      this.domElement.addEventListener("mousewheel", function(e) {
        e.stopPropagation();
        e.preventDefault();
        this.wheelDeltaY = e.deltaY;
      }.bind(this), false);
  
      this.on("enterframe", function() {
        this.pointer.wheelDeltaY = this.wheelDeltaY;
        this.wheelDeltaY = 0;
      });
    },

    //アプリケーション全体のイベントフック
    setupEvents: function() {},
  
    setupSound: function() {},

    updateController: function() {
      var before = this.controller;
      before.before = null;

      var gp = this.gamepad;
      var kb = this.keyboard;
      var angle1 = gp.getKeyAngle();
      var angle2 = kb.getKeyAngle();
      this.controller = {
          angle: angle1 !== null? angle1: angle2,

          up: gp.getKey("up") || kb.getKey("up"),
          down: gp.getKey("down") || kb.getKey("down"),
          left: gp.getKey("left") || kb.getKey("left"),
          right: gp.getKey("right") || kb.getKey("right"),

          attack: gp.getKey("A") || kb.getKey("X"),
          jump:   gp.getKey("X") || kb.getKey("Z"),
          menu:   gp.getKey("start") || kb.getKey("escape"),

          a: gp.getKey("A") || kb.getKey("Z"),
          b: gp.getKey("B") || kb.getKey("X"),
          x: gp.getKey("X") || kb.getKey("C"),
          y: gp.getKey("Y") || kb.getKey("V"),

          ok: gp.getKey("A") || kb.getKey("Z") || kb.getKey("space") || kb.getKey("return"),
          cancel: gp.getKey("B") || kb.getKey("X") || kb.getKey("escape"),

          start: gp.getKey("start") || kb.getKey("return"),
          select: gp.getKey("select"),

          pause: gp.getKey("start") || kb.getKey("escape"),

          analog1: gp.getStickDirection(0),
          analog2: gp.getStickDirection(1),

          //前フレーム情報
          before: before,
      };
    },

    setupWebRTC: function() {
      if (this.webRTC) return;
      this.webRTC = WebRTC(this, WEBRTC_API_KEY);
      this.remoteConnectionList = [];
    },

    setConnection: function(dataConnection) {
      const res = this.remoteConnectionList.find(e => e.remoteId == dataConnection.remoteId);
      if (!res) {
        this.remoteConnectionList.push(dataConnection);
      }
    },
  });
});