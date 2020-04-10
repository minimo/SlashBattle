phina.namespace(function() {

  phina.define("Application", {
    superClass: "phina.display.CanvasApp",

    quality: 1.0,
  
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

      this.webRTC = {
        peer: null,
        id: "",
        peers: [],
      };
      this.setupWebRTC();
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
      if (this.webRTC.peer) return;
      this.webRTC.peer = new Peer({
        key: '344539c4-13d8-4c29-86b1-ca96a66897f7',
        debug: 3,
      });

      const peer = this.webRTC.peer;
      peer.once('open', id => {
        this.webRTC.id = id;
        this.webRTC.peer.listAllPeers(peers => this.webRTC.peers = peers);
      });
      peer.on('error', err => alert(err.message));
      peer.on('close', () => {});
      peer.on('disconnected', () => {});
      peer.on('connection', dataConnection => {
        dataConnection.once('open', () => {});
        dataConnection.on('data', data => {});
        dataConnection.once('close', () => {});
      });
    },

    refreshPeerList: function() {
      return new Promise(resolve => {
        this.webRTC.peer.listAllPeers(peers => resolve(peers));
      });
    },

    getPeerList: function() {
      const result = [];
      this.webRTC.peers.forEach(id => {
        if (id != this.webRTC.id) result.push(id);
      });
      return result;
    },

    connectWebRTC: function(peerID) {
      if (this.webRTC.peer == null)return;
      if (!this.webRTC.peer.open) return;

      const dataConnection = peer.connect(peerID);
      dataConnection.once('open', () => {
        console.log(`connection open: ${peerID}`);
      });
      dataConnection.on('data', data => {});
      dataConnection.once('close', () => {});
    }
  });
});