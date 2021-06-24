/*
 *  main.js
 */

phina.globalize();
const WEBRTC_API_KEY = "b876a85f-f1b4-4412-bb13-cdac5986f0c1";

const DEBUG_COLLISION = false;

const SCREEN_WIDTH = 1024 / 2;
const SCREEN_HEIGHT = 768 / 2;
const SCREEN_WIDTH_HALF = SCREEN_WIDTH * 0.5;
const SCREEN_HEIGHT_HALF = SCREEN_HEIGHT * 0.5;

const SCREEN_OFFSET_X = 0;
const SCREEN_OFFSET_Y = 0;

const NUM_LAYERS = 9;
const LAYER_FOREGROUND = 8;
const LAYER_DEBUG = 7;
const LAYER_CHECK = 6;
const LAYER_COLLISION = 5;
const LAYER_ENEMY = 4;
const LAYER_PLAYER = 3;
const LAYER_OBJECT = 2;
const LAYER_BACKGROUND = 1;
const LAYER_MAP = 0;

let phina_app;

window.onload = function() {
  phina_app = Application();
  phina_app.replaceScene(FirstSceneFlow({}));
  phina_app.run();
};

//スクロール禁止
// document.addEventListener('touchmove', function(e) {
//  e.preventDefault();
// }, { passive: false });

//Androidブラウザバックボタン制御
// document.addEventListener("backbutton", function(e){
//   e.preventDefault();
// }, false);
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
                "itembox": "assets/textures/itembox.png",
                "back": "assets/textures/back-s03b.png",
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

//アイテムＩＤ
const ITEM_SHORTSWORD = 0;
const ITEM_LONGSWORD = 1;
const ITEM_AX = 2;
const ITEM_SPEAR = 3;
const ITEM_BOW = 4;
const ITEM_ROD = 5;
const ITEM_BOOK = 6;
const ITEM_SHIELD = 7;
const ITEM_ARMOR = 8;
const ITEM_HAT = 9;
const ITEM_BOOTS = 10;
const ITEM_GROVE = 11;
const ITEM_RING = 12;
const ITEM_SCROLL = 13;
const ITEM_LETTER = 14;
const ITEM_CARD = 15;
const ITEM_KEY = 16;
const ITEM_COIN = 17;
const ITEM_BAG = 18;
const ITEM_ORB = 19;
const ITEM_STONE = 20;
const ITEM_JEWEL = 21;
const ITEM_JEWELBOX = 22;
const ITEM_APPLE = 24;
const ITEM_HARB = 25;
const ITEM_MEAT = 26;
const ITEM_POTION = 27;

/*
 *  MainScene.js
 *  2018/10/26
 */

phina.namespace(function() {

  phina.define("BaseScene", {
    superClass: 'DisplayScene',

    //廃棄エレメント
    disposeElements: null,

    init: function(options) {
      options = (options || {}).$safe({
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        backgroundColor: 'transparent',
      });
      this.superInit(options);

      //シーン離脱時canvasメモリ解放
      this.disposeElements = [];
      this.one('destroy', () => {
        this.disposeElements.forEach(e => {
          if (e.destroyCanvas) {
            e.destroyCanvas();
          } else if (e instanceof Canvas) {
            e.setSize(0, 0);
          }
        });
      });

      this.app = phina_app;

      //別シーンへの移行時にキャンバスを破棄
      this.one('exit', () => {
        this.destroy();
        this.canvas.destroy();
        this.flare('destroy');
      });
    },

    destroy: function() {},

    fadeIn: function(options) {
      options = (options || {}).$safe({
        color: "white",
        millisecond: 500,
      });
      return new Promise(resolve => {
        const mask = RectangleShape({
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
          fill: options.color,
          strokeWidth: 0,
        }).setPosition(SCREEN_WIDTH * 0.5, SCREEN_HEIGHT * 0.5).addChildTo(this);
        mask.tweener.clear()
          .fadeOut(options.millisecond)
          .call(() => {
            resolve();
            this.app.one('enterframe', () => mask.destroyCanvas());
          });
      });
    },

    fadeOut: function(options) {
      options = (options || {}).$safe({
        color: "white",
        millisecond: 500,
      });
      return new Promise(resolve => {
        const mask = RectangleShape({
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
          fill: options.color,
          strokeWidth: 0,
        }).setPosition(SCREEN_WIDTH * 0.5, SCREEN_HEIGHT * 0.5).addChildTo(this);
        mask.alpha = 0;
        mask.tweener.clear()
          .fadeIn(options.millisecond)
          .call(() => {
            resolve();
            this.app.one('enterframe', () => mask.destroyCanvas());
          });
      });
    },

    //シーン離脱時に破棄するShapeを登録
    registDispose: function(element) {
      this.disposeElements.push(element);
    },
  });

});
phina.namespace(function() {

  phina.define("Dialog", {
    superClass: "DisplayElement",

    _static: {
      defaultOptions: {
        x:  SCREEN_WIDTH_HALF,
        y:  SCREEN_HEIGHT_HALF,
        width: SCREEN_WIDTH * 0.5,
        height: SCREEN_WIDTH * 0.3,
        isModal: true,

        text: "よろしいですか？",
        buttons: [
          {
            type: "ok",
            text: "OK",
          },
          {
            type: "cancel",
            text: "CANCEL",
          }
        ]
      },
    },

    init: function(options) {
      this.options = (options || {}).$safe(Dialog.defaultOptions);
      this.superInit(this.options);
      this.setScale(0.0);
    },

    open: function() {
      this.base = RectangleShape({
        width: this.width,
        height: this.height,
        fill: "black",
        stroke: "white",
      }).addChildTo(this);
      this.tweener.clear()
        .to({ scaleX: 1.0, scaleY: 1.0 }, 200, "easeInOutQuad")
        .call(() => {
          this.setup();
          this.setupButton();
        });

      this.cursol = Label({ text: ">", fill: "white", fontSize: 20, baseline: "middle", align: "center" })
        .addChildTo(this.base);
      this.cursol.tweener.clear();

      this.selectNum = 0;
      this.beforeKey = {};
      this.isClose = false;

      return this;
    },

    close: function() {
      this.tweener.clear()
        .to({ scaleX: 0.0, scaleY: 0.0 }, 200, "easeInOutQuad")
        .call(() => {
          this.flare('closed')
          this.flare(this.options.buttons[this.selectNum].type);
        });
    },

    setup: function() {
      this.text = Label({ text: this.options.text, fill: "white", fontSize: 24, baseline: "middle", align: "center" })
        .addChildTo(this.base);
    },

    setupButton: function() {
      this.buttons = [];
      this.options.buttons.forEach((e, i)=> {
        const label = Label({ text: e.text, fill: "white", fontSize: 16, baseline: "middle", align: "center" })
          .setPosition(i * 100 - this.options.buttons.length * 25, 50)
          .addChildTo(this.base);
        label.type = e.type;
        this.buttons.push(label);
      });
    },

    update: function(app) {
      if (this.isClose) return;
      const ct = app.controller;
      if (ct.right && !this.beforeKey.right) {
        this.selectNum++;
        if (this.selectNum == this.options.buttons.length) this.selectNum--;
      } else if (ct.left && !this.beforeKey.left) {
        this.selectNum--;
        if (this.selectNum < 0) this.selectNum = 0;
      }
      this.cursol.setPosition(this.selectNum * 100 - this.options.buttons.length * 25 - 50, 50)


      if (ct.ok) {
        this.isClose = true;
        this.close();
      }

      this.beforeKey = ct;
    },

  });

});

/*
 *  FirstSceneFlow.js
 */

phina.namespace(function() {

  phina.define("FirstSceneFlow", {
    superClass: "ManagerScene",

    init: function(options) {
      options = options || {};
      startLabel = options.startLabel || "title";
      this.superInit({
        startLabel: startLabel,
        scenes: [
          {
            label: "title",
            className: "TitleScene",
            nextLabel: "home",
          },
          {
            label: "sync",
            className: "SyncRemoteScene",
          },
          {
            label: "main",
            className: "MainScene",
          },
        ],
      });
    }
  });

});
phina.namespace(function() {

  phina.define("WebRTC", {
    superClass: "phina.util.EventDispatcher",

    key: "",
    id: "",
    peer: null,
    peerList: null,
    dataConnections: null,

    isReady: false,

    init: function(app, key) {
      this.superInit();

      this.app = app;

      this.peerList = [];
      this.peerData = [];
      this.dataConnections = [];

      this.peer = new Peer({ key, debug: 3 });

      const peer = this.peer;
      peer.once('open', id => {
        this.id = id;
        this.refreshPeerList()
          .then(() => this.isReady = true);
        this.app.currentScene.flare('webrtc_open', { id });
      });

      peer.on('connection', dataConnection => {
        this.app.currentScene.flare('webrtc_connection', { dataConnection });
        this.addConnection(dataConnection);
      });
      peer.on('close', () => this.flare('webrtc_close'));
      peer.on('disconnected', () => this.flare('webrtc_disconnected'));
      peer.on('error', err => {
        // alert(err.message)
      });
    },

    createConnection: function(peerID) {
      if (!this.peer) return;
      const dataConnection = this.peer.connect(peerID);
      if (dataConnection) this.addConnection(dataConnection);
      return dataConnection;
    },

    addConnection(dataConnection) {
      if (!dataConnection) return;

      const id = dataConnection.remoteId;
      const dcId = dataConnection.id;

      dataConnection.once('open', () => {
        this.dataConnections.push(dataConnection);
        this.app.currentScene.flare('webrtc_dataconnection_open', { dataConnection });
        console.log(`****** connection open: ${id} dcID: ${dcId}`);
      });

      dataConnection.on('data', data => {
        this.flare('data', { dataConnection, data });
        this.app.currentScene.flare('webrtc_dataconnection_data', { dataConnection, data });

        const parseData = JSON.parse(data);
        if (parseData && parseData.eventName) {
          const eventData = {
            data: parseData.data,
            dataConnection,
          };
          this.app.currentScene.flare(parseData.eventName, eventData);
          this.app.flare(parseData.eventName, eventData);
        }
        // console.log(`from[${id}] data: ${data}`);
      });

      dataConnection.once('close', () => {
        this.flare('close', { dataConnection });
        this.app.currentScene.flare('webrtc_dataconnection_close', { dataConnection });
        console.log(`****** connection close: ${id} dcID: ${dcId}`);
      });
      return this;
    },

    getDataConnection: function(peerID) {
      return this.dataConnections[peerID];
    },

    send: function(data, toPeerID) {
      if (typeof(toPeerID) == "string") {
        this.sendData(toPeerID, data);
      } else if (toPeerID instanceof Array) {
        toPeerID.forEach(id => this.sendData(id, data));
      } else {
        //接続を確立しているpeer全てに送出
        this.dataConnections.forEach(dc => {
          // console.log(`send to ${dc.remoteId} data: ${data}`);
          if (dc.open) dc.send(data)
        });
      }
      return this;
    },

    sendEvent: function(eventName, data, toPeerID) {
      const eventData = JSON.stringify({ eventName, data });
      this.send(eventData, toPeerID);
      return this;
    },

    sendData: function(toPeerID, data) {
      const dc = this.dataConnections.find(e => e.remoteId == toPeerID);
      if (dc) {
        if (dc.open) {
          if (typeof data == "object") {
            dc.send(JSON.stringify(data));
          } else {
            dc.send(data);
          }
        } else {
          console.log(`Data connection not open: ${toPeerID}`);
        }
      } else {
        console.log(`Data send failed: ${toPeerID}`);
      }
      return this;
    },

    close: function(toPeerID) {
      if (typeof(toPeerID) == "string") {
        const dc = this.dataConnections[toPeerID];
        if (dc) {
          dc.close(true);
        }
      } else if (toPeerID instanceof Array) {
        toPeerID.forEach(id => {
          const dc = this.dataConnections[id];
          if (dc && dc.remoteId == id) dc.close(true);
        });
      } else {
        //接続を確立しているpeer全てを閉じる
        this.dataConnections.forEach(dc => {
          if (dc.open) dc.close(true);
        });
      }
      return this;
    },

    destroy: function() {
      if (!this.peer) return this;
      this.dataConnections.forEach(dc => dc.close(true));
      this.peer.destroy();
      return this;
    },

    refreshPeerList: function() {
      return new Promise(resolve => {
        this.peer.listAllPeers(peers => {
          this.peerList = peers;
          resolve(peers);
        });
      });
    },

    getPeerList: function() {
      const result = [];
      this.peerList.forEach(id => {
        if (id != this.id) result.push(id);
      });
      return result;
    },

  });
});

phina.namespace(function() {

  phina.define("ConnectRequestDialog", {
    superClass: "Dialog",

    _static: {
      defaultOptions: {
        x:  SCREEN_WIDTH_HALF,
        y:  SCREEN_HEIGHT_HALF,
        width: SCREEN_WIDTH * 0.8,
        height: SCREEN_WIDTH * 0.3,
        isModal: true,
        text: "対戦相手が見つかりました。\n接続しますか？",
      },
    },

    init: function(options) {
      this.options = (options || {}).$safe(ConnectRequestDialog.defaultOptions);
      this.superInit(this.options);
    },
  });

});

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

      this.base = DisplayElement().setPosition(-50, -250).addChildTo(this);

      //レイヤー準備
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
      this.checkLayer = this.layers[LAYER_CHECK];
      this.debugLayer = this.layers[LAYER_DEBUG];

      //マップ作成
      this.map = WorldMap("map1")
        .setPosition(0, 0)
        .addChildTo(this.layers[LAYER_MAP]);

      //当たり判定
      this.map.getCollisionData().forEach(e => e.addChildTo(this.collisionLayer));

      //オブジェクト
      this.map.getObjectData().forEach(e => {
        switch (e.type) {
          case "itembox":
            ItemBox(this, e).setPosition(e.x, e.y).addChildTo(this.objectLayer);
            break;
        }
      });

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
      const options = {
        width: 200,
        height: 5,
        backgroundColor: 'transparent',
        fill: 'red',
        stroke: 'white',
        strokeWidth: 2,
        gaugeColor: 'lime',
        cornerRadius: 0,
      };
      this.lifeGauge = phina.ui.Gauge(options.$extend({ value: this.player.hp, maxValue: this.player.hpMax })).setPosition(SCREEN_WIDTH * 0.25, 10).addChildTo(this);
      const player = this.player;
      this.lifeGauge.update = function() {
        this.value = player.hp;
        this.maxValue = player.hpMax;
      };
      if(this.remoteId) {
        this.lifeGauge = phina.ui.Gauge(options.$extend({ value: 200, maxValue: 200 })).setRotation(180).setPosition(SCREEN_WIDTH * 0.75, 10).addChildTo(this);
        const player = this.player;
        this.lifeGauge.update = function() {
          if (this.anotherPlayer) {
            this.value = this.anotherPlayer.hp;
            this.maxValue = this.anotherPlayer.hpMax;
          }
        };
      }
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
      this.isReady = false;
      this.isDialogOpen = false;

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

      this.app.state = "title";
      this.dcList = [];
      this.webRTC = this.app.webRTC;
    },

    setup: function() {
      const back = RectangleShape({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, fill: "black" })
        .setPosition(SCREEN_WIDTH_HALF, SCREEN_HEIGHT_HALF)
        .addChildTo(this);
      this.registDispose(back);

      const label = Label({ text: "Slash Battle", fill: "white" })
        .setPosition(SCREEN_WIDTH_HALF, SCREEN_HEIGHT_HALF)
        .addChildTo(this);
      this.registDispose(label);

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

      //ID表示用レイヤー
      this.menuLayer = DisplayElement().addChildTo(this);
      //ダイアログ用レイヤー
      this.dialogLayer = DisplayElement().addChildTo(this);

      //WebRTCメッセージ待ち受け
      setTimeout(this.setupPeerList.bind(this), 10);
      this.on('webrtc_dataconnection_open', e => {
        console.log(`オープンしたよ！ id: ${e.dataConnection.remoteId}`);
        this.isReady = false;
        this.webRTC.refreshPeerList()
          .then(() => this.setupPeerList());
      });
      this.on('webrtc_dataconnection_close', e => {
        console.log(`クローズしたよ！ id: ${e.dataConnection.remoteId}`);
        this.isReady = false;
        this.webRTC.refreshPeerList()
          .then(() => this.setupPeerList());
      });
      this.on('request_battle', e => {
        if (this.isDialogOpen) return;
        const remoteId = e.data.id;
        this.isDialogOpen = true;
        console.log(`Battle request from ${remoteId}`);
        ConnectRequestDialog({ id: remoteId })
          .addChildTo(this.dialogLayer)
          .open()
          .on('ok', () => {
            this.exit("sync", { remoteId, isRequest: false });
            this.isExit = true;
          })
          .on('cancel', () => this.webRTC.sendEvent("request_battle_cancel", { id: this.webRTC.id }, remoteId))
          .on('closed', () => this.isDialogOpen = false);
      });
      this.on('answer_state', e => {
        this.labelList.forEach(l => {
          if (l.peer.text == e.dataConnection.remoteId) {
            l.state.text = e.data.state;
          }
        });
      });

      Label({ text: this.app.webRTC.id, fill: "white", fontSize: 16, baseline: "middle", align: "right" })
        .setPosition(SCREEN_WIDTH * 0.95, SCREEN_HEIGHT * 0.95)
        .addChildTo(this);
      console.log("peer id" + this.app.webRTC.id);
    },

    setupPeerList: function() {
      //一覧ラベルを一旦解放
      if (this.labelList) {
        this.labelList.forEach(e => {
          e.peer.remove();
          e.state.remove();
        });
      }
      this.labelList = [];

      //一覧を作成
      let y = 50;
      this.peerList = ["Single play"].concat(this.app.webRTC.getPeerList());
      this.peerList.forEach(id => {
        const peer = Label({ text: id, fill: "white", fontSize: 20, baseline: "middle", align: "left" })
          .setPosition(30, y)
          .addChildTo(this.menuLayer);
        const state = Label({ text: "unknown", fill: "white", fontSize: 20, baseline: "middle", align: "left" })
          .setPosition(300, y)
          .addChildTo(this.menuLayer);
        this.labelList.push({ peer, state });

        if (id != "Single play") {
          const dc = this.dcList.find(e => e.remoteId == id);
          if (!dc) {
            this.dcList.push(this.app.webRTC.createConnection(id));
          }
        } else {
          state.setVisible(false);
        }
        y += 25;
      });

      if (this.cursol) this.cursol.remove();
      this.cursol = Label({ text: ">", fill: "white", fontSize: 20, baseline: "middle", align: "left" })
        .setPosition(10, 50 - 2)
        .addChildTo(this);
      this.cursol.tweener.clear();

      this.selectNum = 0;
      this.beforeKey = {};
      this.isReady = true;

      //各peerに現在ステートの問い合わせ
      this.webRTC.sendEvent("request_state");
    },

    update: function() {
      if (!TitleScene.isAssetLoaded || this.isExit || !this.isReady || this.isDialogOpen) return;

      const ct = this.app.controller;
      if (ct.down && !this.beforeKey.down) {
        if (this.selectNum < this.peerList.length - 1) this.selectNum++;
      } else if (ct.up && !this.beforeKey.up) {
        if (this.selectNum > 0) this.selectNum--;
      }
      this.cursol.setPosition(10, this.selectNum * 25 + 48)

      if (ct.ok) {
        if (this.selectNum == 0) {
          this.isExit = true;
          this.exit("main");
          this.closeAllPeers();
        } else {
          const state = this.labelList[this.selectNum].state.text;
          if (state == "title") {
            const id = this.labelList[this.selectNum].peer.text;
            this.isExit = true;
            this.exit("sync", { remoteId: id, isRequest: true });
          }
        }
      }

      this.beforeKey = ct;
    },

    closeAllPeers: function() {
      this.dcList.forEach(dc => {
        if (dc.open) dc.close();
      });
    },
  });

});

phina.namespace(function() {
  phina.define("BaseCharacter", {
  superClass: "DisplayElement",

    //マップオブジェクトID
    id: -1,

    //加速度
    vx: 0,
    vy: 0,

    //初期座標
    firstX: 0,
    firstY: 0,

    //重力加速度
    gravity: 0.45,

    //横移動減衰率
    friction: 0.5,

    //床移動減衰率
    floorFriction: 0.5,

    //ジャンプ力
    jumpPower: 6,

    //反発係数
    rebound: 0,

    //床上フラグ
    isOnFloor: false,

    //乗っているオブジェクト
    floorObject: null,

    //死亡フラグ
    isDead: false,

    //落下死亡フラグ
    isDrop: false,

    //気絶フラグ
    isStun: false,

    //操作停止時間
    stopTime: 0,

    //無敵フラグ
    isMuteki: false,

    //無敵時間
    mutekiTime: 0,

    //アニメーションフラグ
    isAnimation: true,

    //現在実行中アクション
    nowAnimation: "stand",

    //前フレーム実行アクション
    beforeAnimation: "",

    //アニメーション進行可能フラグ
    isAdvanceAnimation: true,

    //アニメーション変更検知フラグ
    isChangeAnimation: false,

    //アニメーション間隔
    animationInterval: 6,

    //地形無視
    ignoreCollision: false,

    //スクリーン内フラグ
    isOnScreen: true,

    //活動フラグ
    isActive: true,

    //影表示
    isShadow: false,
    shadowY: 0,

    //識別フラグ
    isPlayer: false,
    isEnemy: false,
    isItemBox: false,
    isItem: false,
    isBlock: false,
    isMapAccessory: false,

    //経過フレーム
    time: 0,

    init: function(parentScene, options) {
      this.superInit(options);
      this.parentScene = parentScene;
      this.boundingType = "rect";
      this.tweener.setUpdateType('fps');

      this.options = options || {};
      this.initCollision(options);
      this.setupAnimation();

      this.id = options.id || -1;

      this.on('enterframe', () => this.defaultUpadate());
    },

    //一回目のenterframeで一度だけ呼ばれる
    firstFrame: function() {},

    defaultUpadate: function() {
      //活動フラグ
      if (!this.isActive) return;

      this.x += this.vx;
      if (this.isOnFloor) {
        this.vx *= this.floorFriction;
      } else {
        this.vx *= this.friction;
      }

      if (this.isCatchLadder) {
        this.y += this.vy;
        this.vy = 0;
      } else {
        this.y += this.vy;
        this.vy += this.gravity;
        //落下速度上限
        if (this.vy > 20) this.vy = 20;
      }
      if (Math.abs(this.vx) < 0.01) this.vx = 0;
      if (Math.abs(this.vy) < 0.01) this.vy = 0;

      this.resetCollisionPosition();
      this.checkMapCollision();

      //アニメーション
      if (this.sprite && this.isAnimation && this.isAdvanceAnimation && this.time % this.animationInterval == 0) {
        this.index = (this.index + 1) % this.frame[this.nowAnimation].length;
        //次フレーム番号が特殊指定の場合
        var next = this.frame[this.nowAnimation][this.index];
        if (next == "stop") {
          //停止
          this.index--;
        } else if (next == "remove") {
          //リムーブ
          this.remove();
        } else if (typeof next === "string") {
          //指定アニメーションへ変更
          this.setAnimation(next);
        } else {
          this.sprite.frameIndex = next;
        }
      }

      this.time++;
      this.beforeAnimation = this.nowAnimation;
    },

    setupAnimation: function() {
      this.spcialAnimation = false;
      this.frame = [];
      this.frame["stand"] = [13, 14];
      this.frame["jump"] = [0, "stop"];
      this.frame["walk"] = [0];
      this.frame["up"] =   [0];
      this.frame["down"] = [0];
      this.frame["attack"] = [0, "stop"];
      this.index = 0;
      return this;
    },

    setAnimation: function(animName) {
      if (!this.frame[animName]) return;
      if (animName == this.nowAnimation) return;
      this.nowAnimation = animName;
      this.index = -1;
      this.isChangeAnimation = true;
      return this;
    },

    //当たり判定情報初期化
    initCollision: function(options) {
      //当り判定用（0:上 1:右 2:下 3:左）
      const w = Math.floor(this.width / 4);
      const h = Math.floor(this.height / 4);
      this._collision = [];
      this._collision[0] = DisplayElement({ width: w, height: 2 });
      this._collision[1] = DisplayElement({ width: 2, height: h });
      this._collision[2] = DisplayElement({ width: w, height: 2 });
      this._collision[3] = DisplayElement({ width: 2, height: h });
      this.collisionResult = null;

      //当たり判定チェック位置オフセット
      this.offsetCollisionX = options.offsetCollisionX || 0;
      this.offsetCollisionY = options.offsetCollisionY || 0;

      //当たり判定情報再設定
      this.setupCollision();

      this._collision[0].addChildTo(this.parentScene.checkLayer);
      this._collision[1].addChildTo(this.parentScene.checkLayer);
      this._collision[2].addChildTo(this.parentScene.checkLayer);
      this._collision[3].addChildTo(this.parentScene.checkLayer);

      //当たり判定デバッグ用
      if (DEBUG_COLLISION) {
        this.one('enterframe', e => {
          this._collision[0].alpha = 0.3;
          this._collision[1].alpha = 0.3;
          this._collision[2].alpha = 0.3;
          this._collision[3].alpha = 0.3;
          //ダメージ当たり判定表示
          var c = RectangleShape({ width: this.width, height: this.height }).addChildTo(this);
          c.alpha = 0.3;
        });
        this.one('removed', e => {
          this._collision[0].remove();
          this._collision[1].remove();
          this._collision[2].remove();
          this._collision[3].remove();
        });
      } else {
        this._collision[0].alpha = 0.0;
        this._collision[1].alpha = 0.0;
        this._collision[2].alpha = 0.0;
        this._collision[3].alpha = 0.0;
    }
      return this;
    },

    //地形当たり判定
    checkMapCollision: function() {
      if (this.ignoreCollision) return this;

      this._collision[0].hit = null;
      this._collision[1].hit = null;
      this._collision[2].hit = null;
      this._collision[3].hit = null;

      this.isOnLadder = false;
      this.isOnStairs = false;

      if (this.isOnScreen && this.shadowSprite) {
        this.shadowY = 99999;
        var p1 = phina.geom.Vector2(this.x, this.y);
        var p2 = phina.geom.Vector2(this.x, this.y + 128);
        this.shadowSprite.visible = false;
      }

      //地形接触判定
      this.parentScene.collisionLayer.children.forEach(e => {
        if (this.isDrop) return;
        if (e.ignore || e == this.throughFloor) return;
        if (e.type == "ladder" || e.type == "stairs") return;

        //上側
        if (this.vy < 0  && e.hitTestElement(this._collision[0])) this._collision[0].hit = e;
        //下側
        if (this.vy >= 0 && e.hitTestElement(this._collision[2])) this._collision[2].hit = e;
        //右側
        if (this.vx > 0  && e.hitTestElement(this._collision[1])) this._collision[1].hit = e;
        //左側
        if (this.vx < 0  && e.hitTestElement(this._collision[3])) this._collision[3].hit = e;

        //影を落とす
        if (this.isOnScreen && this.shadowSprite) {
            //キャラクターの下方向にレイを飛ばして直下の地面座標を取る
            var x = e.x - e.width / 2;
            var y = e.y - e.height / 2;
            var p3 = Vector2(x, y);
            var p4 = Vector2(x + e.width, y);
            if (y < this.shadowY && phina.geom.Collision.testLineLine(p1, p2, p3, p4)) {
              this.shadowSprite.setPosition(this.x, y);
              this.shadowSprite.visible = true;
              this.shadowY = y;
            }
        }
      });

      if (this.shadowSprite && this.isCatchLadder) this.shadowSprite.visible = false;

      //当たり判定結果反映
      this.collisionProcess();

      //はしごのみ判定
      this.parentScene.collisionLayer.children.forEach(e => {
        //梯子判定
        if (e.type == "ladder" || e.type == "stairs") {
          if (this.ladderCollision && e.hitTestElement(this.ladderCollision)) {
            this.isOnLadder = true;
            this.isOnStairs = (e.type == "stairs");
          }
          return;
        }
      });
      return this;
    },

    //地形当たり判定（特定地点チェックのみ）衝突したものを配列で返す
    checkMapCollision2: function(x, y, width, height) {
      x = x || this.x;
      y = y || this.y;
      width = width || 1;
      height = height || 1;
      const c = DisplayElement({ width, height }).setPosition(x, y).addChildTo(this.parentScene.checkLayer);
      let ret = null;
      this.parentScene.collisionLayer.children.forEach(function(e) {
        if (e.type == "ladder" || e.type == "stairs") return;
        if (e.hitTestElement(c)) {
          if (ret == null) ret = [];
          ret.push(e);
        }
      });
      c.remove();
      return ret;
    },

    //当たり判定結果反映処理
    collisionProcess: function() {
      var w = Math.floor(this.width / 2) + 6;
      var h = Math.floor(this.height / 2) + 6;
      this.isOnFloor = false;

      //上側接触
      if (this._collision[0].hit && !this.isCatchLadder) {
        var ret = this._collision[0].hit;
        this.y = ret.y + ret.height * (1 - ret.originY) + h;
        this.vy = 0;
        this.resetCollisionPosition();
        if (ret.collisionScript) {
          ret.collisionScript(this, 0);
        }
      }
      //下側接触
      if (this._collision[2].hit && !this.isCatchLadder) {
        var ret = this._collision[2].hit;
        this.y = ret.y - ret.height * ret.originY - h;
        this.x += ret.vx || 0;
        if (!this.isPlayer && ret.vy > 0) this.y += ret.vy || 0;

        this.isJump = false;
        this.isOnFloor = true;
        this.floorFriction = ret.friction == undefined? 0.5: ret.friction;

        this.throughFloor = null;
        if (this.rebound > 0) {
          this.isJump = true;
          this.vy = -this.vy * this.rebound;
        } else {
          this.vy = 0;
        }
        this.resetCollisionPosition();
        if (ret.collisionScript) {
          ret.collisionScript(this, 2);
        }
      }
      //右側接触
      if (this._collision[1].hit && !this.isCatchLadder) {
        var ret = this._collision[1].hit;
        this.x = ret.x - ret.width * ret.originX - w;
        this.vx = 0;
        this.resetCollisionPosition();
        if (ret.collisionScript) {
          ret.collisionScript(this, 1);
        }
      }
      //左側接触
      if (this._collision[3].hit && !this.isCatchLadder) {
        var ret = this._collision[3].hit;
        this.x = ret.x + ret.width * (1 - ret.originX) + w;
        this.vx = 0;
        this.resetCollisionPosition();
        if (ret.collisionScript) {
          ret.collisionScript(this, 3);
        }
      }
      return this;
    },

    //キャラクタ同士当たり判定（ブロックのみ）
    checkCharacterCollision: function() {
      if (this.ignoreCollision) return;
      if (this.isDrop) return;

      const ret = [];
      this.parentScene.objLayer.children.forEach(e => {
        if (!e.isBlock) return;
        if (e.isDead) return;

        //上側
        if (this.vy < 0 && e.hitTestElement(this._collision[0])) {
          this.y = e.y + e.height * (1 - e.originY) + 16;
          this.vy = 1;
          ret[0] = e;
          this.resetCollisionPosition();
        }
        //下側
        if (this.vy > 0 && e.hitTestElement(this._collision[2])) {
          this.y = e.y - e.height * e.originY - 16;
          this.vx = e.vx;
          this.vy = 0;
          this.isJump = false;
          this.isOnFloor = true;
          this.throughFloor = null;
          ret[2] = e;
          if (this.rebound > 0) {
            this.isJump = true;
            this.vy = -this.vy * this.rebound;
          } else {
            this.vy = 0;
          }
          this.resetCollisionPosition();
        }
        //右側
        if (this.vx > 0 && e.hitTestElement(this._collision[1])) {
            this.x = e.x - e.width * e.originX - 10;
            this.vx = 0;
            ret[1] = e;
            this.resetCollisionPosition();
        }
        //左側
        if (this.vx < 0 && e.hitTestElement(this._collision[3])) {
            this.x = e.x + e.width * (1 - e.originX) + 10;
            this.vx = 0;
            ret[3] = e;
            this.resetCollisionPosition();
        }
      });
      return ret;
    },

    //当たり判定用エレメントの再設定
    setupCollision: function() {
      return this;
    },

    //当たり判定用エレメントの位置再セット
    resetCollisionPosition: function() {
      var w = Math.floor(this.width / 2) + 6 + this.offsetCollisionX;
      var h = Math.floor(this.height / 2)+ 6 + this.offsetCollisionY;
      this._collision[0].setPosition(this.x, this.y - h);
      this._collision[1].setPosition(this.x + w, this.y);
      this._collision[2].setPosition(this.x, this.y + h);
      this._collision[3].setPosition(this.x - w, this.y);
      return this;
    },
  });
});

phina.define("Balloon", {
    superClass: "phina.display.Sprite",

    //寿命フレーム
    lifeSpan: 30,

    //アニメーション間隔
    animationInterval: 6,


    init: function(options) {
        this.superInit("balloon", 24, 32);

        this.pattern = options.pattern || "!";
        this.setAnimation(this.pattern);

        this.lifeSpan = options.lifeSpan || 60;
        this.animationInterval = options.animationInterval || 6;
        this.time = 0;

        //特殊パターン
        if (this.pattern == "anger2") {
            this.tweener.setUpdateType('fps').clear().by({y: -16, alpha: -1}, this.animationInterval, "easeInSine");
        }
    },

    update : function() {
        if (this.time % this.animationInterval == 0) this.frameIndex++;

        this.time++;
        if (this.time > this.lifeSpan) this.remove();
    },

    setAnimation: function(pattern) {
        switch (pattern) {
            case "...":
                this.setFrameTrimming(0, 0, 24, 128);
                break;
            case "?":
                this.setFrameTrimming(96, 32, 24, 32);
                break;
            case "!":
                this.setFrameTrimming(72, 64, 72, 32);
                break;
            case "zzz":
                this.setFrameTrimming(0, 0, 24, 32);
                break;
            case "stun":
                this.setFrameTrimming(144, 32, 48, 32);
                break;
            case "light":
                this.setFrameTrimming(144, 64, 48, 32);
                break;
            case "newtype":
                this.setFrameTrimming(144, 96, 72, 32);
                break;
            case "anger":
            case "anger1":
                this.setFrameTrimming(72, 96, 24, 32);
                break;
            case "anger2":
                this.setFrameTrimming(144, 128, 72, 32);
                break;
        }
    },
});

phina.define("Item", {
    superClass: "BaseCharacter",

    //識別フラグ
    isItem: true,

    //アイテム種別
    kind: 0,

    //アイテムレベル
    level: 0,

    //捨てアイテム
    throwAway: false,

    //大まかな種別フラグ
    isWeapon: false,
    isEquip: false,
    isFood: false,
    isItem: false,
    isKey: false,

    //敵ドロップアイテムフラグ
    isEnemyDrop: false,

    //アイテム情報
    status: null,

    //反発係数
    rebound: 0.3,

    //アニメーション進行可能フラグ   
    isAdvanceAnimation: false,

    //影表示フラグ
    isShadow: false,

    init: function(parentScene, options) {
        this.superInit(parentScene, {width: 16, height: 16});

        //アイテムレベル
        this.level = 0;
        this.kind = null;
        if (options.properties) {
            this.level = options.properties.level || 0;
            this.kind = options.properties.kind;
        }
        if (options.kind !== undefined) this.kind = options.kind;

        //アイテム種別
        if (this.kind == null) {
            if (options.name == "food") {
                this.kind = ITEM_APPLE + this.level;
            } else {
                var name = "ITEM_"+options.name.toUpperCase();
                this.kind = eval(name);
            }
        } else if (typeof this.kind === "string") {
            var name = "ITEM_"+this.kind.toUpperCase();
            this.kind = eval(name);
        }

        //アイテムステータス取得
        this.$extend(ItemInfo.get(this.kind));

        //アイテムスプライト
        if (this.isWeapon) {
            //武器の場合
            var index = this.kind * 10 + Math.min(this.level, this.maxIndex);
            this.sprite = phina.display.Sprite("weapons", 24, 24).addChildTo(this).setFrameIndex(index);

            if (this.level > 0) {
                //強化レベル表示
                var labelParam = {
                    fill: "white",
                    stroke: "black",
                    strokeWidth: 2,

                    fontFamily: "Orbitron",
                    align: "center",
                    baseline: "middle",
                    fontSize: 10,
                    fontWeight: ''
                };
                phina.display.Label({text: "+"+this.level}.$safe(labelParam)).setPosition(6, 6).addChildTo(this);
            }
        } else {
            this.sprite = phina.display.Sprite("item", 24, 24).addChildTo(this).setFrameIndex(this.kind);
        }

        //寿命
        this.lifeSpan = 150;

        //アクティブフラグ
        if (this.options.active === undefined || this.options.active == true) {
            this.isActive = true;
        } else {
            this.isActive = false;
        }

        this.on('enterframe', e => {
            //プレイヤーとの当たり判定
            var pl = this.parentScene.player;
            if (this.hitTestElement(pl)) {
                if (this.time > 10 && !this.throwAway) {
                    pl.getItem(this);
                    this.remove();
                }
            } else if (this.time > 30 && this.throwAway) this.throwAway = false;

            if (this.isEnemyDrop) {
                if (this.lifeSpan == 0) this.remove();
                if (this.lifeSpan < 30) {
                    if (this.time % 2 == 0) this.visible = !this.visible;
                } else if (this.lifeSpan < 60){
                    if (this.time % 5 == 0) this.visible = !this.visible;
                } else if (this.lifeSpan < 90) {
                    if (this.time % 10 == 0) this.visible = !this.visible;
                }
                this.lifeSpan--;
            }
        });
    },
});

/*
 *  itembox.js
 *  2017/01/04
 *  @auther minimo  
 *  This Program is MIT license.
 */

//アイテムボックスクラス
phina.define("ItemBox", {
  superClass: "BaseCharacter",

  //識別フラグ
  isItemBox: true,

  //耐久力
  hp: 1,

  //開いたフラグ
  opened: false,

  //アイテム種別
  kind: 0,

  //アニメーション間隔
  animationInterval: 3,

  //反発係数
  rebound: 0.3,

  init: function(parentScene, options) {
    this.superInit(parentScene, { width: 26, height: 26 }.$safe(options.properties));

    //アイテムボックススプライト
    this.sprite = phina.display.Sprite("itembox", 32, 32)
      .addChildTo(this)
      .setScale(0.8)
      .setFrameIndex(0);

    this.setAnimation("close");

    //内容物
    this.name = options.name;
    this.kind = options.properties? options.properties.kind: undefined;
    this.level = options.properties? options.properties.level: 0;
  },

  update: function() {
    if (!this.opened) {
      //プレイヤー攻撃（固定）との当たり判定
      var pl = this.parentScene.player;
      if (pl.isAttack && this.hitTestElement(pl.attackCollision)) {
      this.damage(pl);
      }
      //プレイヤー攻撃判定との当たり判定
      this.parentScene.playerLayer.children.forEach(function(e) {
      if (e instanceof PlayerAttack && e.isCollision && this.hitTestElement(e)) {
        e.remove();
        this.damage(e);
      }
      }.bind(this));
    }
    this.visible = true;  //点滅キャンセル
  },

  damage: function(target) {
    if (this.opened) return;
    this.hp -= target.power;
    this.mutekiTime = 10;
    if (this.hp <= 0) {
      this.open();
    }
    if (this.x < target.x) {
      this.sprite.tweener.clear().moveBy(-5, 0, 2).moveBy(5, 0, 2);
    } else {
      this.sprite.tweener.clear().moveBy(5, 0, 2).moveBy(-5, 0, 2);
    }
  },

  open: function() {
    this.isAdvanceAnimation = true;
    this.opened = true;
    this.setAnimation("open");
    switch (this.name) {
      case "empty":
      break;
      case "item":
        this.tweener.clear()
          .wait(10)
          .call(function() {
            const options = {
              kind: this.kind,
              properties: {
                level: this.level
              }
            };
            // const i = this.parentScene.spawnItem(this.x, this.y, options);
            // i.vy = -5;
          }.bind(this));
      break;
      default:
        this.tweener.clear()
          .wait(10)
          .call(function() {
            const options = {
              name: this.name,
              properties: {
                level: this.level
              }
            };
            // const i = this.parentScene.spawnItem(this.x, this.y, options);
            // i.vy = -5;
          }.bind(this));
      break;
    }
  },

  setupAnimation: function() {
    this.spcialAnimation = false;
    this.frame = [];
    if (this.options.color == "gold") {
      this.frame["close"] = [2];
      this.frame["open"] = [2, 6, 8, "stop"];
    } else if (this.options.color == "red") {
      this.frame["close"] = [1];
      this.frame["open"] = [1, 4, 7, "stop"];
    } else if (this.options.color == "blue") {
      this.frame["close"] = [0];
      this.frame["open"] = [0, 3, 6, "stop"];
    } else {
      this.frame["close"] = [1];
      this.frame["open"] = [1, 4, 7, "stop"];
    }
    this.index = 0;
  },
});

phina.define("ItemInfo", {
  _static: {
      get: function(kind) {
          switch (kind) {
              case "shortsword":
              case ITEM_SHORTSWORD:
                  return {
                      name: "SHORT SWORD",
                      type: "sword",
                      isWeapon: true,
                      isSlash: true,
                      power: 10,
                      stunPower: 1,
                      maxIndex: 0,
                      collision: {
                          width: 14,
                          height: 30
                      }
                  };
              case "longsword":
              case ITEM_LONGSWORD:
                  return {
                      name: "LONG SWORD",
                      type: "sword",
                      isWeapon: true,
                      isSlash: true,
                      power: 15,
                      stunPower: 5,
                      maxIndex: 7,
                      collision: {
                          width: 24,
                          height: 25
                      }
                  };
              case "ax":
              case ITEM_AX:
                  return {
                      name: "AX",
                      type: "ax",
                      isWeapon: true,
                      isSlash: true,
                      isBrow: true,
                      power: 20,
                      stunPower: 20,
                      maxIndex: 4,
                      collision: {
                          width: 14,
                          height: 26
                      }
                  };
              case "spear":
              case ITEM_SPEAR:
                  return {
                      name: "SPEAR",
                      type: "spear",
                      isWeapon: true,
                      isSting: true,
                      power: 10,
                      stunPower: 1,
                      maxIndex: 4,
                      collision: {
                          width: 39,
                          height: 10
                      }
                  };
              case "bow":
              case ITEM_BOW:
                  return {
                      name: "BOW",
                      type: "bow",
                      isWeapon: true,
                      isBrow: true,
                      power: 5,
                      stunPower: 5,
                      maxIndex: 0,
                      collision: {
                          width: 20,
                          height: 10
                      }
                  };
              case "rod":
              case ITEM_ROD:
                  return {
                      name: "MAGIC ROD",
                      type: "rod",
                      isWeapon: true,
                      isBrow: true,
                      isFire: true,
                      power: 5,
                      stunPower: 10,
                      maxIndex: 7,
                      collision: {
                          width: 20,
                          height: 10
                      }
                  };
              case "book":
              case ITEM_BOOK:
                  return {
                      name: "BOOK",
                      type: "book",
                      isWeapon: true,
                      isBrow: true,
                      isHoly: true,
                      power: 10,
                      stunPower: 40,
                      maxIndex: 0,
                      collision: {
                          width: 20,
                          height: 20
                      }
                  };
              case "shield":
              case ITEM_SHIELD:
                  return {
                      name: "SHIELD",
                      type: "equip",
                      isEquip: true,
                      power: 20,
                      point: 1000,
                  };
              case "armor":
              case ITEM_ARMOR:
                  return {
                      name: "ARMOR",
                      type: "equip",
                      isEquip: true,
                      power: 30,
                      point: 5000,
                  };
              case "hat":
              case ITEM_HAT:
                  return {
                      name: "HAT",
                      type: "equip",
                      isEquip: true,
                      power: 10,
                      point: 300,
                  };
              case "boots":
              case ITEM_BOOTS:
                  return {
                      name: "BOOTS",
                      type: "equip",
                      isEquip: true,
                      power: 10,
                      point: 500,
                  };
              case "grove":
              case ITEM_GROVE:
                  return {
                      name: "GROVE",
                      type: "equip",
                      isEquip: true,
                      power: 10,
                      point: 500,
                  };
              case "ring":
              case ITEM_RING:
                  return {
                      name: "RING",
                      type: "equip",
                      isEquip: true,
                      power: 20,
                      point: 3000,
                  };
              case "scroll":
              case ITEM_SCROLL:
                  return {
                      name: "SCROLL",
                      type: "item",
                      isItem: true,
                      point: 1000,
                  };
              case "letter":
              case ITEM_LETTER:
                  return {
                      name: "LETTER",
                      type: "item",
                      isItem: true,
                      point: 100,
                  };
              case "card":
              case ITEM_CARD:
                  return {
                      name: "CARD",
                      type: "item",
                      isItem: true,
                      point: 1000,
                  };
              case "key":
              case ITEM_KEY:
                  return {
                      name: "KEY",
                      type: "key",
                      isKey: true,
                      point: 2000,
                  };
              case "coin":
              case ITEM_COIN:
                  return {
                      name: "COIN",
                      type: "item",
                      isItem: true,
                      point: 500,
                  };
              case "bag":
              case ITEM_BAG:
                  return {
                      name: "BAG",
                      type: "item",
                      isItem: true,
                      point: 1000,
                  };
              case "orb":
              case ITEM_ORB:
                  return {
                      name: "ORB",
                      type: "item",
                      isItem: true,
                      point: 5000,
                  };
              case "stone":
              case ITEM_STONE:
                  return {
                      name: "STONE",
                      type: "item",
                      isItem: true,
                      point: 2000,
                  };
              case "jewel":
              case ITEM_JEWEL:
                  return {
                      name: "JEWEL",
                      type: "item",
                      isItem: true,
                      point: 5000,
                  };
              case "jewelbox":
              case ITEM_JEWELBOX:
                  return {
                      name: "JEWELBOX",
                      type: "item",
                      isItem: true,
                      point: 10000,
                  };
              case "apple":
              case ITEM_APPLE:
                  return {
                      name: "APPLE",
                      type: "food",
                      isFood: true,
                      power: 20,
                  };
              case "harb":
              case ITEM_HARB:
                  return {
                      name: "HARB",
                      type: "food",
                      isFood: true,
                      power: 40,
                  };
              case "meat":
              case ITEM_MEAT:
                  return {
                      name: "MEAT",
                      type: "food",
                      isFood: true,
                      power: 60,
                  };
              case "potion":
              case ITEM_POTION:
                  return {
                      name: "POTION",
                      type: "food",
                      isFood: true,
                      power: 100,
                  };
              default:
                  return {};
          }
      },
  },
});


phina.define("Player", {
  superClass: "BaseCharacter",

  //識別フラグ
  isPlayer: true,

  //リモート側プレイヤーフラグ
  isRemotePlayer: false,

  //最大ヒットポイント
  hpMax: 100,

  //ヒットポイント
  hp: 100,

  //攻撃力
  power: 10,

  //気絶確率
  stunPower: 1,

  //防御力
  defense: 10,

  //移動速度
  speed: 3,

  //登坂速度
  speedAscend: 4,

  //ジャンプ力
  jumpPower: 8,

  //多段ジャンプ可能回数
  numJump: 0,
  numJumpMax: 2,

  //操作可能フラグ
  isControl: true,

  //攻撃中フラグ
  isAttack: false,

  //前フレームの情報
  before: null,

  init: function(parentScene) {
    this.superInit(parentScene, {width: 16, height: 20});

    //スプライト背後
    this.back = phina.display.DisplayElement().addChildTo(this).setScale(-1, 1);

    //表示用スプライト
    this.sprite = phina.display.Sprite("actor4", 32, 32).addChildTo(this).setFrameIndex(0);
    this.sprite.scaleX = -1;

    //武器用スプライト
    this.weapon = phina.display.Sprite("weapons", 24, 24)
      .addChildTo(this.back)
      .setFrameIndex(0)
      .setOrigin(1, 1)
      .setPosition(3, 3);
    this.weapon.alpha = 0;
    this.weapon.tweener.setUpdateType('fps');
    this.weapon.type = "sword";

    //攻撃判定用
    this.attackCollision = phina.display.RectangleShape({width: 14, height: 26});

    //当たり判定デバッグ用
    if (DEBUG_COLLISION) {
      this.one('enterframe', e => {
        this.attackCollision.addChildTo(this.parentScene.playerLayer);
        this.attackCollision.alpha = 0.3;
      });
      this.on('removed', e => {
        this.attackCollision.remove();
      });
    }

    //初期アニメーション設定
    this.setAnimation("walk");
    this.beforeAnimation = "";

    //死亡時コールバック
    this.on('dead', () => this.parentScene.flare('gameover'));

    //最後に床上にいた場所を保存
    this.lastOnFloorX = 0;
    this.lastOnFloorY = 0;

    this.reset();

    //はしご接触判定用
    this.ladderCollision = DisplayElement({ width: 16, height: 20 }).addChildTo(this.parentScene.checkLayer);
    
    this.before = {
      //操作系
      up: false,
      down: false,
      attack: false,
      jump: false,
      change: false,
      isStun: false,
      isOnFloor: false,
      x: 0,
      y: 0,
    };
  },

  update: function(app) {
    if (this.parentScene.pauseScene) return;

    //プレイヤー操作
    let ct = app.controller;

    if (!this.isControl) ct = {};
    if (this.isRemotePlayer) {
      if (this.controlData) {
        ct = this.controlData;
      } else {
        ct = {};
      }
    }

    if (this.stopTime == 0) {
      //左移動
      if (ct.left && !ct.down) {
        if (!this.isJump && !this.isAttack && !this.isCatchLadder) this.setAnimation("walk");
        //はしご掴み状態で左に壁がある場合は不可
        var c = this._collision[3];
        if (!(this.isCatchLadder && this.checkMapCollision2(c.x + 6, c.y, c.width, c.height))) {
          this.scaleX = -1;
          this.vx = -this.speed;
        }
      }
      //右移動
      if (ct.right && !ct.down) {
        if (!this.isJump && !this.isAttack && !this.isCatchLadder) this.setAnimation("walk");
        //はしご掴み状態で右に壁がある場合は不可
        var c = this._collision[1];
        if (!(this.isCatchLadder && this.checkMapCollision2(c.x - 6, c.y, c.width, c.height))) {
          this.scaleX = 1;
          this.vx = this.speed;
        }
      }

      //頭上足元はしご検知
      const isHeadLadder = this.checkLadder(true);
      const isFootLadder = this.checkLadder(false);

      //はしご掴み状態で操作分岐
      if (this.isCatchLadder) {
        if (ct.up) {
          this.vx = 0;
          this.vy = -this.speedAscend;
          var c = this._collision[0];
          if (!isHeadLadder && this.checkMapCollision2(c.x, c.y - 6, c.width, c.height)) {
            this.vy = 0;
          }
        }
        if (ct.down) {
          this.vx = 0;
          this.vy = this.speedAscend;
        }
      } else {
        //ジャンプボタンのみ
        if (ct.jump && !ct.up) {
          this.jump(false);
        }
        //上キー押下
        if (ct.up) {
          this.jump(true);
          //はしごを昇る（階段は接地時のみ）
          if (this.isOnLadder && !this.isOnStairs || this.isOnFloor && this.isOnStairs) {
            this.setAnimation("up");
            this.vx = 0;
            this.vy = 0;
            this.isCatchLadder = true;
            this.throughFloor = null;
          }
          //扉に入る（接地時＆左右キーオフ時のみ）
          if (!ct.left && !ct.right && this.isOnFloor && this.isOnDoor && !this.isOnDoor.isLock && !this.isOnDoor.already) {
            this.vx = 0;
            this.vy = 0;
            this.isOnDoor.flare('enterdoor');
            this.isOnDoor.already = false;
          }
        }
        //下キー押下
        if (ct.down) {
          //はしごを降りる
          if (isFootLadder) {
            this.setAnimation("up");
            this.vx = 0;
            this.vy = 0;
            this.isCatchLadder = true;
            this.throughFloor = null;
          }
          //床スルー
          if (this.downFrame > 6 && !this.jump && !isFootLadder) {
            if (this.isOnFloor && !this.throughFloor) {
              const floor = this.checkMapCollision2(this.x, this.y + 16, 5, 5);
              if (floor && floor[0].enableThrough) this.throughFloor = floor[0];
            }
          }
        }
      }

      //はしごから外れたら梯子掴み状態キャンセル
      if (this.isCatchLadder) {
        if (!this.isOnLadder && !ct.down || this.isOnLadder && !isFootLadder && !ct.up) {
          this.isCatchLadder = false;
        }
      }
    }


    //攻撃
    if (!this.isAttack) {
      if (this.isOnFloor) {
        if (this.nowAnimation != "damage" && !this.isDefense) this.setAnimation("walk");
      } else if (this.isCatchLadder) {
        if (ct.up) {
            this.setAnimation("up");
        } else if (ct.down) {
            if (this.isOnStairs) {
              this.setAnimation("down");
            } else {
              this.setAnimation("up");
            }
        }
      } else {
        if (!this.isStun && !this.isDead) this.setAnimation("jump");
      }
      if (ct.attack && !this.before.attack && this.stopTime == 0 && !(this.isCatchLadder && this.isOnLadder)) {
        this.isCatchLadder = false;
        this.setAnimation("attack");
        this.weaponAttack();
      }
    }

    //死亡状態
    if (this.isDead) {
      this.setAnimation("dead");
      this.isCatchLadder = false;
    }

    //アニメーション変更を検知
    if (this.nowAnimation != this.beforeAnimation) {
      this.time = 0;
      this.isAdvanceAnimation = true;
      this.animationInterval = 12;
      if (this.nowAnimation == "attack") this.animationInterval = 4;
      if (this.nowAnimation == "defense") this.animationInterval = 2;
    } else {
      //歩行アニメーションの場合は移動している時のみ進める
      if (this.nowAnimation == "walk" && !ct.left && !ct.right) {
        this.isAdvanceAnimation = false;
      } else {
        this.isAdvanceAnimation = true;
      }
      if (this.nowAnimation == "up" || this.nowAnimation == "down") {
        if (ct.up || ct.down || ct.left || ct.right) {
            this.isAdvanceAnimation = true;
        } else {
            this.isAdvanceAnimation = false;
        }
      }
    }

    //攻撃判定追従
    this.attackCollision.x = this.x + this.scaleX * 12;
    this.attackCollision.y = this.y;

    //コントローラ他情報保存
    this.before.up = ct.up;
    this.before.down = ct.down;
    this.before.attack = ct.attack;
    this.before.jump = ct.up || ct.jump;
    this.before.change = ct.change;
    this.before.isStun = this.isStun;
    this.before.inOnFloor = this.isOnFloor;
    this.before.x = this.x;
    this.before.y = this.y;
  },

  jump: function(isUp) {
    //ジャンプ二段目以降
    if (!this.before.jump && this.isJump && this.numJump < this.numJumpMax && this.vy > -(this.jumpPower / 2)) {
      this.vy = -this.jumpPower;
      this.numJump++;
    }
    //ジャンプ
    const chk = this.checkMapCollision2(this.x, this.y - 16, 5, 3);
    const res = isUp ? !this.isJump && this.isOnFloor && !this.isOnLadder && !chk : !this.isJump && this.isOnFloor && !chk;
    if (res) {
      this.setAnimation("jump");
      this.isJump = true;
      this.vy = -this.jumpPower;
      this.numJump = 1;
    }
  },

  //プレイヤー情報リセット
  reset: function() {
    //移動情報
    this.vx = 0;
    this.vy = 0;

    //ステータス
    this.hp = this.hpMax;

    //各種フラグ
    this.isJump = false;
    this.isDead = false;
    this.isCatchLadder = false;
    this.isDrop = false;
    this.isOnFloor = false;
    this.isAdvanceAnimation = true;
    this.ignoreCollision = false;

    //経過時間系
    this.mutekiTime = 0;
    this.stopTime = 0;
    this.downFrame = 0;
    this.time = 0;

    //アニメーション
    this.setAnimation("walk");
    this.beforeAnimation = "";
    this.animationInterval = 12;

    //所持装備
    this.equip = {
      using: 0,       //現在使用中（weaponsのindex）
      weapons: [0],   //所持リスト（最大３）
      level: [0],     //武器レベル
      switchOk: true,   //変更可能フラグ
    };

    //武器セット
    this.setWeapon(this.equip.weapons[this.equip.using]);

    //所持アイテム
    this.items = [];

    //所持クリア条件キー
    this.keys = [];

    //操作可能フラグ
    this.isControl = true;

    //多段ジャンプ最大回数
    this.numJumpMax = 2;

    //ダミースプライト除去
    if (this.dummy) {
      this.dummy.remove();
      this.dummy = null;
    }

    return this;
  },

  //武器変更
  setWeapon: function(kind, level) {
    kind = kind || 0;
    level = level || 0;

    //属性初期化
    this.attackCollision.$extend({
      isSlash: false,
      isSting: false,
      isBlow: false,
      isArrow: false,
      isFire: false,
      isIce: false,
      stunPower: 1,
    });

    //アイテム情報取得
    var spec = ItemInfo.get(kind);
    this.attackCollision.$extend(spec);
    this.attackCollision.power += level * (spec.levelBonus || 2);

    switch (kind) {
      case 0:
        //ショートソード
        level = 0;
        this.frame["attack"] = [ 41, 42, 43, 44, "stop"];
        this.weapon.setPosition(-3, 3);
        break;
      case 1:
        //ロングソード
        this.frame["attack"] = [ 41, 42, 43, 44, "stop"];
        this.weapon.setPosition(-3, 3);
        break;
      case 2:
        //斧
        this.frame["attack"] = [ 44, 44, 44, 43, 43, 43, 42, 42, 42, 41, 41, 41, "stop"];
        this.weapon.setPosition(-3, 3);
        break;
      case 3:
        //槍
        this.frame["attack"] = [ 41, 42, 43, 44, "stop"];
        this.weapon.setPosition(0, 0);
        break;
      case 4:
        //弓
        level = 0;
        this.frame["attack"] = [ 41, 42, 43, 44, "stop"];
        this.weapon.setPosition(0, 0);
        break;
      case 5:
        //魔法の杖
        this.frame["attack"] = [ 41, 42, 43, 44, "stop"];
        this.weapon.setPosition(0, 0);
        break;
      case 6:
        //魔導書
        this.frame["attack"] = [ 44, 44, 44, 43, 43, 43, 42, 42, 42, 41, 41, 41, "stop"];
        this.weapon.setPosition(-3, 3);
        break;
    }

    //武器画像設定
    var index = kind * 10 + Math.min(level, spec.maxIndex);
    this.weapon.setFrameIndex(index);

    return this;
  },

  //装備武器により攻撃モーションを変える
  weaponAttack: function() {
    var kind = this.equip.weapons[this.equip.using];
    var level = this.equip.level[this.equip.using];
    this.isAttack = true;
    var that = this;
    switch (kind) {
      case 0:
        //ショートソード
        SoundManager.play("slash");
        this.weapon.tweener.clear()
            .set({rotation: 200, alpha: 1.0})
            .to({rotation: 360}, 10)
            .fadeOut(1)
            .call(function() {
              that.isAttack = false;
            });
        break;
      case 1:
        //ロングソード
        this.weapon.tweener.clear()
            .set({rotation: 200, alpha: 1.0})
            .to({rotation: 360}, 12)
            .fadeOut(1)
            .call(function() {
              that.isAttack = false;
            });
        break;
      case 2:
        //斧
        this.weapon.tweener.clear()
            .set({rotation: 400, alpha: 1.0})
            .to({rotation: 270}, 16)
            .fadeOut(1)
            .call(function() {
              that.isAttack = false;
            });
        break;
      case 3:
        //槍
        this.weapon.tweener.clear()
            .set({rotation: -45, alpha: 1.0})
            .by({x: -10}, 4)
            .by({x: 10}, 4)
            .fadeOut(1)
            .call(function() {
              that.isAttack = false;
            });
        break;
      case 4:
        //弓
        this.weapon.tweener.clear()
            .set({rotation: -45, alpha: 1.0})
            .by({x: 7}, 6)
            .by({x: -7}, 6)
            .fadeOut(1)
            .call(function() {
              that.isAttack = false;
            });
            var arrowPower = 5 + level * 2;
            var arrow = PlayerAttack(this.parentScene, {width: 15, height: 10, power: arrowPower, type: "arrow"})
              .addChildTo(this.parentScene.playerLayer)
              .setScale(this.scaleX, 1)
              .setPosition(this.x, this.y);
            arrow.tweener.setUpdateType('fps').clear()
              .by({x: (150 + level * 5) * this.scaleX}, 7)
              .call(function() {
                this.remove();
              }.bind(arrow));
        break;
      case 5:
        //魔法の杖
        this.weapon.tweener.clear()
            .set({rotation: 200, alpha: 1.0})
            .to({rotation: 360}, 16)
            .fadeOut(1)
            .call(function() {
              that.isAttack = false;
            });
        var magicPower = 15 + level * 2;
        for (var i = 0; i < 6; i++) {
            var magic = PlayerAttack(this.parentScene, {width: 15, height: 10, index: 30, power: magicPower, type: "flame"})
              .addChildTo(this.parentScene.playerLayer)
              .setScale(this.scaleX, 1);
            magic.rad = (90 - i * 30).toRadian();
            magic.isCollision = false;
            magic.visible = false;
            magic.tweener.setUpdateType('fps').clear()
              .wait(i)
              .call(function() {
                this.isCollision = true;
                this.visible = true;
                var mx = Math.cos(this.rad) * that.scaleX;
                var my = Math.sin(this.rad);
                this.setPosition(that.x + 32 * mx, that.y + 32 * my);
              }.bind(magic))
              .wait(8)
              .call(function() {
                this.remove();
              }.bind(magic));
        }
        break;
      case 6:
        //魔導書
        this.weapon.tweener.clear()
            .set({rotation: 400, alpha: 1.0})
            .to({rotation: 270}, 16)
            .fadeOut(1)
            .call(function() {
              that.isAttack = false;
            });
        break;
    }
    return this;
  },

  setupAnimation: function() {
    this.spcialAnimation = false;
    this.frame = [];
    this.frame["stand"] = [13, 14];
    this.frame["jump"] = [36, "stop"];
    this.frame["walk"] = [ 3,  4,  5,  4];
    this.frame["up"] =   [ 9, 10, 11, 10];
    this.frame["down"] = [ 0,  1,  2,  1];
    this.frame["attack"] = [ 41, 42, 43, 44, "stop"];
    this.frame["defense"] = [ 41, 42, 43, 44, "stop"];
    this.frame["damage"] = [ 18, 19, 20];
    this.frame["drop"] = [18, 19, 20];
    this.frame["dead"] = [18, 19, 20, 33, 34, 35, "stop"];
    this.frame["clear"] = [24, 25, 26];
    this.frame["stun"] = [ 18, 19, 20];
    this.index = 0;
    return this;
  },

  //当たり判定用エレメントの位置再セット
  resetCollisionPosition: function() {
    const w = Math.floor(this.width / 2) + 10;
    const h = Math.floor(this.height / 2) + 10;
    this._collision[0].setPosition(this.x, this.y - h);     //真下
    this._collision[1].setPosition(this.x + w, this.y - 5); //左下
    this._collision[2].setPosition(this.x, this.y + h);     //真上
    this._collision[3].setPosition(this.x - w, this.y - 5); //右下
    this.ladderCollision.setPosition(this.x, this.y);
    return this;
  },

  //頭上/足元はしごチェック
  checkLadder: function(isHead) {
    const c = isHead ? this._collision[2] : this._collision[0];
    let ret = null;
    this.parentScene.collisionLayer.children.forEach(e => {
      if (e.hitTestElement(c)) {
        if (e.type == "ladder" || e.type == "stairs") ret = e;
      }
    });
    return ret;
  },

  setControlData: function(data) {
    this.controlData = data;
  },
});

phina.define("PlayerAttack", {
  superClass: "DisplayElement",

  //攻撃力
  power: 1,

  //当たり判定発生フラグ
  isCollision: true,

  //属性
  isSlash: false,
  isSting: false,
  isBlow: false,
  isArrow: false,
  isFire: false,
  isIce: false,

  init: function(parentScene, options) {
    this.superInit(options);
    this.parentScene = parentScene;

    this.type = options.type || "arrow";
    this.power = options.power || 0;
    this.time = 0;
    this.index = 0;

    //表示スプライト
    switch (this.type) {
      case "arrow":
        this.sprite = Sprite("weapons", 24, 24).addChildTo(this).setFrameIndex(1);
        this.frame = [1];
        this.isArrow = true;
        this.isSting = true;
        this.stunPower = 10;
        break;
      case "fireball":
        this.sprite = Sprite("bullet", 24, 32).addChildTo(this).setFrameIndex(9);
        this.frame = [9, 10, 11, 10];
        this.isFire = true;
        break;
      case "masakari":
        this.sprite = Sprite("weapons", 24, 24).addChildTo(this).setFrameIndex(20);
        this.frame = [20];
        this.isSlash = true;
        this.isBrow = true;
        this.stunPower = 50;
        break;
      case "dagger":
        this.sprite = Sprite("weapons", 24, 24).addChildTo(this).setFrameIndex(20);
        this.sprite.rotation = 135;
        this.frame = [0];
        this.isSting = true;
        this.stunPower = 1;
        break;
      case "flame":
        this.sprite = Sprite("effect", 48, 48)
          .addChildTo(this)
          .setFrameTrimming(0, 192, 192, 96)
          .setScale(0.5);
        this.frame = [0, 1, 2, 3, 4, 5, 6, 7, 8];
        this.isFire = true;
        this.stunPower = 1;
        break;
    }

    if (DEBUG_COLLISION) {
      RectangleShape({width: this.width, height: this.height}).addChildTo(this).setAlpha(0.5);
    }
  },

  update: function(app) {
    if (!this.isCollision || this.type == "explode") return;

    if (this.time % 3 == 0) {
      this.sprite.setFrameIndex(this.frame[this.index]);
      this.index = (this.index + 1) % this.frame.length;
    }
    if (this.type == "flame") return;

    //地形接触判定
    var that = this;
    this.parentScene.collisionLayer.children.forEach(function(e) {
      if (e.type == "ladder" || e.type == "stairs") return;
      if (this.hitTestElement(e)) {
        this.isCollision = false;
        switch (this.type) {
          case "arrow":
            this.stick(e);
            break;
          case "fireball":
            this.explode(e);
            break;
        }
      }
    }.bind(this));

    this.time++;
  },

  //ヒット後処理
  hit: function(target) {
    switch (this.type) {
      case "fireball":
        this.explode(target);
        break;
    }
  },

  //刺さる
  stick: function(e) {
    //効果音
    switch (this.type) {
      case "arrow":
        app.playSE("arrowstick");
        break;
      case "masakari":
        break;
    }

    if (this.scaleX == 1) {
      this.x = e.left;
    } else {
      this.x = e.right;
    }
    this.tweener.clear()
      .wait(30)
      .call(function() {
        this.remove();
      }.bind(this));
  },

  //弾かれる
  snap: function(e) {
    //効果音
    app.playSE("tinkling");
    this.tweener.clear()
      .by({y: -92, rotation: 700}, 15, "easeOutQuad")
      .call(function() {
        this.remove();
      }.bind(this));
  },

  //爆発
  explode: function(e) {
    this.parentScene.spawnEffect(this.x, this.y);
    app.playSE("bomb");
    this.remove();
  },
});

phina.define("PlayerWeapon", {
  superClass: "DisplayElement",

  init: function(player) {
    this.superInit();
    this.player = player;

    var that = this;
    this.base = phina.display.DisplayElement().addChildTo(this);
    this.base.update = function() {
      this.rotation = -that.rotation;
    }
    var param = {
      width: 25,
      height: 25,
      fill: "rgba(0,0,0,0.0)",
      stroke: "yellow",
      strokeWidth: 2,
      backgroundColor: 'transparent',
    };
    //使用中武器
    phina.display.RectangleShape(param).addChildTo(this.base).setPosition(0, -18);
    //捨てちゃう武器
    this.dropFrame = phina.display.RectangleShape({stroke: "red"}.$safe(param))
      .addChildTo(this.base)
      .setPosition(14, 10)
      .setVisible(false);
    this.dropFrame.update = function() {
      if (that.player.equip.weapons.length < 3) {
        this.visible = false;
      } else {
        this.visible = true;
      }
    }

    //武器リスト（３つ）
    this.weapons = [];
    var rad = 0;
    var rad_1 = (Math.PI*2) / 3;
    (3).times((i) => {
      var x =  Math.sin(rad)*18;
      var y = -Math.cos(rad)*18;
      rad -= rad_1;
      this.weapons[i] = phina.display.Sprite("weapons", 24, 24)
        .addChildTo(this)
        .setPosition(x, y);
      this.weapons[i].index = i;
      this.weapons[i].update = function() {
        this.rotation = -that.rotation;
        var weapons = that.player.equip.weapons;
        if (this.index < weapons.length) {
          var kind = that.player.equip.weapons[this.index];
          var level = that.player.equip.level[this.index];
          var spec = ItemInfo.get(kind);
          var index = kind * 10 + Math.min(level, spec.maxIndex);
          this.setFrameIndex(index);
          this.visible = true;
        } else {
          this.visible = false;
        }
      }
      var labelParam = {
        fill: "white",
        stroke: "black",
        strokeWidth: 2,
        fontFamily: "Orbitron",
        align: "center",
        baseline: "middle",
        fontSize: 10,
        fontWeight: ''
      };
      //強化レベル表示
      this.weapons[i].level = phina.display.Label({text: ""}.$safe(labelParam)).setPosition(6, 6).addChildTo(this.weapons[i]);
      this.weapons[i].level.index = i;
      this.weapons[i].level.update = function() {
        var level = that.player.equip.level[this.index];
        if (level != 0) {
          this.text = "+"+level;
        } else {
          this.text = "";
        }
      }
    });
  },

  clear: function() {
  },
});

phina.namespace(function() {

  phina.define('WorldMap', {
    superClass: 'DisplayElement',

    init: function(mapName) {
      this.superInit();
      this.setup(mapName);
    },

    setup: function(mapName) {
      this.data = phina.asset.AssetManager.get('tmx', mapName);

      Sprite(this.data.getImage())
        .setOrigin(0, 0)
        .addChildTo(this);

      this.collision = this.layerToArray("collision");
      this.object = this.layerToArray("object");
      // this.floorData = this.layerToArray("floor");
      // this.event = this.layerToArray("event");
    },

    getCollisionData: function() {
      return this.collision;
    },

    getObjectData: function() {
      return this.object;
    },

    getFloorData: function() {
      return this.floorData;
    },

    layerToArray: function(layerName) {
      const result = [];
      const layerData = this.data.getObjectGroup(layerName);
      layerData.objects.forEach(e => {
        const element = DisplayElement({
          width: e.width,
          height: e.height,
          x: e.x + e.width * 0.5,
          y: e.y + e.height * 0.5,
        });
        if (DEBUG_COLLISION) {
          RectangleShape({ width: e.width, height: e.height }).addChildTo(element);
        }
        element.alpha = DEBUG_COLLISION ? 0.3 : 0;
        element.type = e.type;
        element.id = e.id;
        element.$extend(e.properties);
        result.push(element);
      });
      return result;
    },

  });

});

phina.define("Button", {
  superClass: "Accessory",

  lognpressTime: 500,
  doLongpress: false,

  //長押しで連打モード
  longpressBarrage: false,

  init: function() {
    this.superInit();

    this.on("attached", () => {
      this.target.interactive = true;
      this.target.clickSound = Button.defaults.clickSound;

      //ボタン押し時用
      this.target.scaleTweener = Tweener().attachTo(this.target);

      //長押し用
      this.target.twLongpress = Tweener().attachTo(this.target);

      //長押し中特殊対応用
      this.target.twLongpressing = Tweener().attachTo(this.target);

      this.target.on("pointstart", (e) => {

        //イベント貫通にしておく
        e.pass = true;

        //ボタンの同時押しを制限
        if (Button.actionTarget !== null) return;

        //リストビューの子供だった場合はviewportとのあたり判定をする
        const listView = Button.findListView(e.target);
        if (listView && !listView.viewport.hitTest(e.pointer.x, e.pointer.y)) return;

        if (listView) {
          //ポインタが移動した場合は長押しキャンセル（listView内版）
          listView.inner.$watch('y', (v1, v2) => {
            if (this.target !== Button.actionTarget) return;
            if (Math.abs(v1 - v2) < 10) return;

            Button.actionTarget = null;
            this.target.twLongpress.clear();
            this.target.scaleTweener.clear().to({
              scaleX: 1.0 * this.sx,
              scaleY: 1.0 * this.sy
            }, 50);
          });
        }

        //ボタンの処理を実行しても問題ない場合のみ貫通を停止する
        e.pass = false;
        Button.actionTarget = this.target;

        //反転しているボタン用に保持する
        this.sx = (this.target.scaleX > 0) ? 1 : -1;
        this.sy = (this.target.scaleY > 0) ? 1 : -1;

        this.target.scaleTweener.clear()
          .to({
            scaleX: 0.95 * this.sx,
            scaleY: 0.95 * this.sy
          }, 50);

        this.doLongpress = false;
        this.target.twLongpress.clear()
          .wait(this.lognpressTime)
          .call(() => {
            if (!this.longpressBarrage) {
              Button.actionTarget = null;
              this.target.scaleTweener.clear()
                .to({
                  scaleX: 1.0 * this.sx,
                  scaleY: 1.0 * this.sy
                }, 50)
              this.target.flare("longpress")
            } else {
              this.target.flare("clickSound");
              this.target.twLongpressing.clear()
                .wait(5)
                .call(() => this.target.flare("clicked", {
                  longpress: true
                }))
                .call(() => this.target.flare("longpressing"))
                .setLoop(true);
            }
          });
      });

      this.target.on("pointend", (e) => {
        //イベント貫通にしておく
        e.pass = true;

        //
        this.target.twLongpress.clear();
        this.target.twLongpressing.clear();

        //ターゲットがnullかpointstartで保持したターゲットと違う場合はスルーする
        if (Button.actionTarget === null) return;
        if (Button.actionTarget !== this.target) return;

        //ボタンの処理を実行しても問題ない場合のみ貫通を停止する
        e.pass = false;

        //押した位置からある程度移動している場合はクリックイベントを発生させない
        const isMove = e.pointer.startPosition.sub(e.pointer.position).length() > 50;
        const hitTest = this.target.hitTest(e.pointer.x, e.pointer.y);
        if (hitTest && !isMove) this.target.flare("clickSound");

        this.target.scaleTweener.clear()
          .to({
            scaleX: 1.0 * this.sx,
            scaleY: 1.0 * this.sy
          }, 50)
          .call(() => {
            Button.actionTarget = null;
            if (!hitTest || isMove || this.doLongpress) return;
            this.target.flare("clicked", {
              pointer: e.pointer
            });
          });
      });

      //アニメーションの最中に削除された場合に備えてremovedイベント時にフラグを元に戻しておく
      this.target.one("removed", () => {
        if (Button.actionTarget === this.target) {
          Button.actionTarget = null;
        }
      });

      this.target.on("clickSound", () => {
        if (!this.target.clickSound || this.target.clickSound == "") return;
        phina.asset.SoundManager.play(this.target.clickSound);
      });

    });
  },

  //長押しの強制キャンセル
  longpressCancel: function() {
    this.target.twLongpress.clear();
    this.target.twLongpressing.clear();
  },

  _static: {
    //ボタン同時押しを制御するためにstatusはstaticにする
    status: 0,
    actionTarget: null,
    //基本設定
    defaults: {
      clickSound: "common/sounds/se/button",
    },

    //親をたどってListViewを探す
    findListView: function(element, p) {
      //リストビューを持っている場合
      if (element.ListView != null) return element.ListView;
      //親がなければ終了
      if (element.parent == null) return null;
      //親をたどる
      return this.findListView(element.parent);
    }

  }

});

/**
 * 親スプライトのテクスチャを切り抜いて自分のテクスチャとするスプライト
 * 親スプライトの切り抜かれた部分は、切り抜き範囲の左上のピクセルの色で塗りつぶされる
 * 
 * 親要素の拡縮・回転は考慮しない
 */
phina.define("ClipSprite", {
  superClass: "Accessory",

  init: function() {
    this.superInit();
    this.on("attached", () => {
      this.target.one("added", () => {
        this.setup();
      });
    });
  },

  setup: function() {
    const target = this.target;
    const parent = target.parent;
    if (parent instanceof phina.display.Sprite) {
      const x = parent.width * parent.origin.x + target.x - target.width * target.origin.x;
      const y = parent.height * parent.origin.y + target.y - target.height * target.origin.y;
      const w = target.width;
      const h = target.height;

      const parentTexture = parent.image;
      const canvas = phina.graphics.Canvas().setSize(w, h);
      canvas.context.drawImage(parentTexture.domElement, x, y, w, h, 0, 0, w, h);
      if (parentTexture instanceof phina.graphics.Canvas) {
        // クローンしてそっちを使う
        const parentTextureClone = phina.graphics.Canvas().setSize(parentTexture.width, parentTexture.height);
        parentTextureClone.context.drawImage(parentTexture.domElement, 0, 0);
        parent.image = parentTextureClone;

        const data = parentTextureClone.context.getImageData(x, y, 1, 1).data;
        parentTextureClone.context.clearRect(x, y, w, h);
        if (data[3] > 0) {
          parentTextureClone.context.globalAlpha = 1;
          parentTextureClone.context.fillStyle = `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`;
          parentTextureClone.context.fillRect(x - 1, y - 1, w + 2, h + 2);
        }
      }

      const sprite = phina.display.Sprite(canvas);
      sprite.setOrigin(target.origin.x, target.origin.y);
      target.addChildAt(sprite, 0);
    }
  },
});

phina.define("Gauge", {
  superClass: "RectangleClip",

  _min: 0,
  _max: 1.0,
  _value: 1.0, //min ~ max

  direction: "horizontal", // horizontal or vertical

  init: function() {
    this.superInit();
    this.on("attached", () => {
      this._width = this.width;
      this._height = this.width;

      this.target.accessor("Gauge.min", {
        "get": () => this.min,
        "set": (v) => this.min = v,
      });

      this.target.accessor("Gauge.max", {
        "get": () => this.max,
        "set": (v) => this.max = v,
      });

      this.target.accessor("Gauge.value", {
        "get": () => this.value,
        "set": (v) => this.value = v,
      });

      this.target.accessor("Gauge.progress", {
        "get": () => this.progress,
        "set": (v) => this.progress = v,
      });
    });
  },

  _refresh: function() {
    if (this.direction !== "vertical") {
      this.width = this.target.width * this.progress;
      this.height = this.target.height;
    } else {
      this.width = this.target.width;
      this.height = this.target.height * this.progress;
    }
  },

  _accessor: {
    progress: {
      get: function() {
        const p = (this.value - this.min) / (this.max - this.min);
        return (isNaN(p)) ? 0.0 : p;
      },
      set: function(v) {
        this.value = this.max * v;
      }
    },

    max: {
      get: function() {
        return this._max;
      },
      set: function(v) {
        this._max = v;
        this._refresh();
      }
    },

    min: {
      get: function() {
        return this._min;
      },
      set: function(v) {
        this._min = v;
        this._refresh();
      }
    },

    value: {
      get: function() {
        return this._value;
      },
      set: function(v) {
        this._value = v;
        this._refresh();
      }
    },
  }

});

phina.define("Grayscale", {
  superClass: "Accessory",

  grayTextureName: null,

  init: function(options) {
    this.superInit();
    this.on("attached", () => {
      this.grayTextureName = options.grayTextureName;
      this.normal = this.target.image;
    });
  },

  toGrayscale: function() {
    this.target.image = this.grayTextureName;
  },

  toNormal: function() {
    this.target.image = this.normal;
  },

});

phina.namespace(function() {
  //マウス追従
  phina.define("MouseChaser", {
    superClass: "Accessory",

    init: function() {
      this.superInit();
    },

    onattached: function() {
      let px = 0;
      let py = 0;
      console.log("#MouseChaser", "onattached");
      this.tweener = Tweener().attachTo(this.target);
      this.target.on("enterframe", (e) => {
        const p = e.app.pointer;
        if (py == p.x && py == p.y) return;
        px = p.x;
        py = p.y;
        const x = p.x - SCREEN_WIDTH_HALF;
        const y = p.y - SCREEN_HEIGHT_HALF;
        this.tweener.clear().to({ x, y }, 2000, "easeOutQuad")
      });

    },

    ondetached: function() {
      console.log("#MouseChaser", "ondetached");
      this.tweener.remove();
    }

  });
});

phina.define("MultiRectangleClip", {
  superClass: "Accessory",

  x: 0,
  y: 0,
  width: 0,
  height: 0,

  _enable: true,

  init: function() {
    this.superInit();
    this._init();
  },

  _init: function() {
    this.clipRect = [];

    this.on("attached", () => {
      this.x = 0;
      this.y = 0;
      this.width = this.target.width;
      this.height = this.target.height;

      this.target.clip = (c) => this._clip(c);
    });
  },

  addClipRect: function(rect) {
    const r = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
    this.clipRect.push(r);
    return this;
  },

  clearClipRect: function() {
    this.clipRect = [];
  },

  _clip: function(canvas) {
    canvas.beginPath();
    this.clipRect.forEach(rect => {
      canvas.rect(rect.x, rect.y, rect.width, rect.height)
    });
    canvas.closePath();
  },

  setEnable: function(enable) {
    this._enable = enable;
    if (this._enable) {
      this.target.clip = (c) => this._clip(c);
    } else {
      this.target.clip = null;
    }
  },

  _accessor: {
    enable: {
      set: function(v) {
        this.setEnable(v);
      },
      get: function() {
        return this._enable;
      }
    }
  },

});

phina.namespace(function() {

  phina.define("PieClip", {
    superClass: "Accessory",

    init: function(options) {
      options = ({}).$safe(options, PieClip.defaults)
      this.superInit(options);

      this.pivotX = options.pivotX;
      this.pivotY = options.pivotY;
      this.angleMin = options.angleMin;
      this.angleMax = options.angleMax;
      this.radius = options.radius;
      this.anticlockwise = options.anticlockwise;
    },

    onattached: function() {
      this.target.clip = (canvas) => {
        const angleMin = this.angleMin * Math.DEG_TO_RAD;
        const angleMax = this.angleMax * Math.DEG_TO_RAD;
        const ctx = canvas.context;
        ctx.beginPath();
        ctx.moveTo(this.pivotX, this.pivotY);
        ctx.lineTo(this.pivotX + Math.cos(angleMin) * this.radius, this.pivotY + Math.sin(angleMin) * this.radius);
        ctx.arc(this.pivotX, this.pivotY, this.radius, angleMin, angleMax, this.anticlockwise);
        ctx.closePath();
      };
    },

    _static: {
      defaults: {
        pivotX: 32,
        pivotY: 32,
        angleMin: 0,
        angleMax: 360,
        radius: 64,
        anticlockwise: false,
      },
    },

  });
});

phina.define("RectangleClip", {
  superClass: "Accessory",

  x: 0,
  y: 0,
  width: 0,
  height: 0,

  _enable: true,

  init: function() {
    this.superInit();
    this._init();
  },

  _init: function() {
    this.on("attached", () => {

      this.target.accessor("RectangleClip.width", {
        "get": () => this.width,
        "set": (v) => this.width = v,
      });

      this.target.accessor("RectangleClip.height", {
        "get": () => this.height,
        "set": (v) => this.height = v,
      });

      this.target.accessor("RectangleClip.x", {
        "get": () => this.x,
        "set": (v) => this.x = v,
      });

      this.target.accessor("RectangleClip.y", {
        "get": () => this.y,
        "set": (v) => this.y = v,
      });

      this.x = 0;
      this.y = 0;
      this.width = this.target.width;
      this.height = this.target.height;

      this.target.clip = (c) => this._clip(c);
    });
  },

  _clip: function(canvas) {
    const x = this.x - (this.width * this.target.originX);
    const y = this.y - (this.height * this.target.originY);

    canvas.beginPath();
    canvas.rect(x, y, this.width, this.height);
    canvas.closePath();
  },

  setEnable: function(enable) {
    this._enable = enable;
    if (this._enable) {
      this.target.clip = (c) => this._clip(c);
    } else {
      this.target.clip = null;
    }
  },

  _accessor: {
    enable: {
      set: function(v) {
        this.setEnable(v);
      },
      get: function() {
        return this._enable;
      }
    }
  },

});

phina.define("Toggle", {
  superClass: "Accessory",

  init: function(isOn) {
    this.superInit();
    this._init(isOn);
  },

  _init: function(isOn) {
    this.isOn = isOn || false;
  },

  setStatus: function(status) {
    this.isOn = status;
    this.target.flare((this.isOn) ? "switchOn" : "switchOff");
  },

  switchOn: function() {
    if (this.isOn) return;
    this.setStatus(true);
  },

  switchOff: function() {
    if (!this.isOn) return;
    this.setStatus(false);
  },

  switch: function() {
    this.isOn = !this.isOn;
    this.setStatus(this.isOn);
  },

  _accessor: {
    status: {
      "get": function() {
        return this.isOn;
      },
      "set": function(v) {
        return setStatus(v);
      },
    },
  },

});

phina.define("Buttonize", {
  init: function() {},
  _static: {
    STATUS: {
      NONE: 0,
      START: 1,
      END: 2,
    },
    status: 0,
    rect: function(element) {
      element.boundingType = "rect";
      this._common(element);
      return element;
    },
    circle: function(element) {
      element.radius = Math.max(element.width, element.height) * 0.5;
      element.boundingType = "circle";
      this._common(element);
      return element;
    },
    _common: function(element) {
      //TODO:エディターできるまでの暫定対応
      element.setOrigin(0.5, 0.5, true);

      element.interactive = true;
      element.clickSound = "se/clickButton";

      //TODO:ボタンの同時押下は実機で調整する
      element.on("pointstart", e => {
        if (this.status != this.STATUS.NONE) return;
        this.status = this.STATUS.START;
        element.tweener.clear()
          .to({
            scaleX: 0.9,
            scaleY: 0.9
          }, 100);
      });

      element.on("pointend", (e) => {
        if (this.status != this.STATUS.START) return;
        const hitTest = element.hitTest(e.pointer.x, e.pointer.y);
        this.status = this.STATUS.END;
        if (hitTest) element.flare("clickSound");

        element.tweener.clear()
          .to({
            scaleX: 1.0,
            scaleY: 1.0
          }, 100)
          .call(() => {
            this.status = this.STATUS.NONE;
            if (!hitTest) return;
            element.flare("clicked", {
              pointer: e.pointer
            });
          });
      });

      //アニメーションの最中に削除された場合に備えてremovedイベント時にフラグを元に戻しておく
      element.one("removed", () => {
        this.status = this.STATUS.NONE;
      });

      element.on("clickSound", function() {
        if (!element.clickSound) return;
        //phina.asset.SoundManager.play(element.clickSound);
      });
    },
  },
});

phina.namespace(function() {

  /**
   * テクスチャ関係のユーティリティ
   */
  phina.define("TextureUtil", {

    _static: {

      /**
       * RGB各要素に実数を積算する
       */
      multiplyColor: function(texture, red, green, blue) {
        if (typeof(texture) === "string") {
          texture = AssetManager.get("image", texture);
        }

        const width = texture.domElement.width;
        const height = texture.domElement.height;

        const result = Canvas().setSize(width, height);
        const context = result.context;

        context.drawImage(texture.domElement, 0, 0);
        const imageData = context.getImageData(0, 0, width, height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i + 0] = Math.floor(imageData.data[i + 0] * red);
          imageData.data[i + 1] = Math.floor(imageData.data[i + 1] * green);
          imageData.data[i + 2] = Math.floor(imageData.data[i + 2] * blue);
        }
        context.putImageData(imageData, 0, 0);

        return result;
      },

      /**
       * 色相・彩度・明度を操作する
       */
      editByHsl: function(texture, h, s, l) {
        if (typeof(texture) === "string") {
          texture = AssetManager.get("image", texture);
        }

        const width = texture.domElement.width;
        const height = texture.domElement.height;

        const result = Canvas().setSize(width, height);
        const context = result.context;

        context.drawImage(texture.domElement, 0, 0);
        const imageData = context.getImageData(0, 0, width, height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          const r = imageData.data[i + 0];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];

          const hsl = phina.util.Color.RGBtoHSL(r, g, b);
          const newRgb = phina.util.Color.HSLtoRGB(hsl[0] + h, Math.clamp(hsl[1] + s, 0, 100), Math.clamp(hsl[2] + l, 0, 100));

          imageData.data[i + 0] = newRgb[0];
          imageData.data[i + 1] = newRgb[1];
          imageData.data[i + 2] = newRgb[2];
        }
        context.putImageData(imageData, 0, 0);

        return result;
      },

    },

    init: function() {},
  });

});

/*
 *  phina.tiledmap.js
 *  2016/9/10
 *  @auther minimo  
 *  This Program is MIT license.
 * 
 *  2019/9/18
 *  version 2.0
 */

phina.namespace(function() {

  phina.define("phina.asset.TiledMap", {
    superClass: "phina.asset.XMLLoader",

    image: null,

    tilesets: null,
    layers: null,

    init: function() {
        this.superInit();
    },

    _load: function(resolve) {
      //パス抜き出し
      this.path = "";
      const last = this.src.lastIndexOf("/");
      if (last > 0) {
        this.path = this.src.substring(0, last + 1);
      }

      //終了関数保存
      this._resolve = resolve;

      // load
      const xml = new XMLHttpRequest();
      xml.open('GET', this.src);
      xml.onreadystatechange = () => {
        if (xml.readyState === 4) {
          if ([200, 201, 0].indexOf(xml.status) !== -1) {
            const data = (new DOMParser()).parseFromString(xml.responseText, "text/xml");
            this.dataType = "xml";
            this.data = data;
            this._parse(data)
              .then(() => this._resolve(this));
          }
        }
      };
      xml.send(null);
    },

    //マップイメージ取得
    getImage: function(layerName) {
      if (layerName === undefined) {
        return this.image;
      } else {
        return this._generateImage(layerName);
      }
    },

    //指定マップレイヤーを配列として取得
    getMapData: function(layerName) {
      //レイヤー検索
      for(let i = 0; i < this.layers.length; i++) {
        if (this.layers[i].name == layerName) {
          //コピーを返す
          return this.layers[i].data.concat();
        }
      }
      return null;
    },

    //オブジェクトグループを取得（指定が無い場合、全レイヤーを配列にして返す）
    getObjectGroup: function(groupName) {
      groupName = groupName || null;
      const ls = [];
      const len = this.layers.length;
      for (let i = 0; i < len; i++) {
        if (this.layers[i].type == "objectgroup") {
          if (groupName == null || groupName == this.layers[i].name) {
            //レイヤー情報をクローンする
            const obj = this._cloneObjectLayer(this.layers[i]);
            if (groupName !== null) return obj;
            ls.push(obj);
          }
        }
      }
      return ls;
    },

    //オブジェクトレイヤーをクローンして返す
    _cloneObjectLayer: function(srcLayer) {
      const result = {}.$safe(srcLayer);
      result.objects = [];
      //レイヤー内オブジェクトのコピー
      srcLayer.objects.forEach(obj => {
        const resObj = {
          properties: {}.$safe(obj.properties),
        }.$extend(obj);
        if (obj.ellipse) resObj.ellipse = obj.ellipse;
        if (obj.gid) resObj.gid = obj.gid;
        if (obj.polygon) resObj.polygon = obj.polygon.clone();
        if (obj.polyline) resObj.polyline = obj.polyline.clone();
        result.objects.push(resObj);
      });
      return result;
    },

    _parse: function(data) {
      return new Promise(resolve => {
        //タイル属性情報取得
        const map = data.getElementsByTagName('map')[0];
        const attr = this._attrToJSON(map);
        this.$extend(attr);
        this.properties = this._propertiesToJSON(map);

        //タイルセット取得
        this.tilesets = this._parseTilesets(data);
        this.tilesets.sort((a, b) => a.firstgid - b.firstgid);

        //レイヤー取得
        this.layers = this._parseLayers(data);

        //イメージデータ読み込み
        this._checkImage()
          .then(() => {
            //マップイメージ生成
            this.image = this._generateImage();
            resolve();
          });
      })
    },

    //タイルセットのパース
    _parseTilesets: function(xml) {
      const each = Array.prototype.forEach;
      const data = [];
      const tilesets = xml.getElementsByTagName('tileset');
      each.call(tilesets, async tileset => {
        const t = {};
        const attr = this._attrToJSON(tileset);
        if (attr.source) {
          t.isOldFormat = false;
          t.source = this.path + attr.source;
        } else {
          //旧データ形式（未対応）
          t.isOldFormat = true;
          t.data = tileset;
        }
        t.firstgid = attr.firstgid;
        data.push(t);
      });
      return data;
    },

    //レイヤー情報のパース
    _parseLayers: function(xml) {
      const each = Array.prototype.forEach;
      const data = [];

      const map = xml.getElementsByTagName("map")[0];
      const layers = [];
      each.call(map.childNodes, elm => {
        if (elm.tagName == "layer" || elm.tagName == "objectgroup" || elm.tagName == "imagelayer") {
          layers.push(elm);
        }
      });

      layers.each(layer => {
        switch (layer.tagName) {
          case "layer":
            {
              //通常レイヤー
              const d = layer.getElementsByTagName('data')[0];
              const encoding = d.getAttribute("encoding");
              const l = {
                  type: "layer",
                  name: layer.getAttribute("name"),
              };

              if (encoding == "csv") {
                  l.data = this._parseCSV(d.textContent);
              } else if (encoding == "base64") {
                  l.data = this._parseBase64(d.textContent);
              }

              const attr = this._attrToJSON(layer);
              l.$extend(attr);
              l.properties = this._propertiesToJSON(layer);

              data.push(l);
            }
            break;

          //オブジェクトレイヤー
          case "objectgroup":
            {
              const l = {
                type: "objectgroup",
                objects: [],
                name: layer.getAttribute("name"),
                x: parseFloat(layer.getAttribute("offsetx")) || 0,
                y: parseFloat(layer.getAttribute("offsety")) || 0,
                alpha: layer.getAttribute("opacity") || 1,
                color: layer.getAttribute("color") || null,
                draworder: layer.getAttribute("draworder") || null,
              };
              each.call(layer.childNodes, elm => {
                if (elm.nodeType == 3) return;
                const d = this._attrToJSON(elm);
                d.properties = this._propertiesToJSON(elm);
                //子要素の解析
                if (elm.childNodes.length) {
                  elm.childNodes.forEach(e => {
                    if (e.nodeType == 3) return;
                    //楕円
                    if (e.nodeName == 'ellipse') {
                      d.ellipse = true;
                    }
                    //多角形
                    if (e.nodeName == 'polygon') {
                      d.polygon = [];
                      const attr = this._attrToJSON_str(e);
                      const pl = attr.points.split(" ");
                      pl.forEach(function(str) {
                        const pts = str.split(",");
                        d.polygon.push({x: parseFloat(pts[0]), y: parseFloat(pts[1])});
                      });
                    }
                    //線分
                    if (e.nodeName == 'polyline') {
                      d.polyline = [];
                      const attr = this._attrToJSON_str(e);
                      const pl = attr.points.split(" ");
                      pl.forEach(str => {
                        const pts = str.split(",");
                        d.polyline.push({x: parseFloat(pts[0]), y: parseFloat(pts[1])});
                      });
                    }
                  });
                }
                l.objects.push(d);
              });
              l.properties = this._propertiesToJSON(layer);

              data.push(l);
            }
            break;

          //イメージレイヤー
          case "imagelayer":
            {
              const l = {
                type: "imagelayer",
                name: layer.getAttribute("name"),
                x: parseFloat(layer.getAttribute("offsetx")) || 0,
                y: parseFloat(layer.getAttribute("offsety")) || 0,
                alpha: layer.getAttribute("opacity") || 1,
                visible: (layer.getAttribute("visible") === undefined || layer.getAttribute("visible") != 0),
              };
              const imageElm = layer.getElementsByTagName("image")[0];
              l.image = {source: imageElm.getAttribute("source")};

              data.push(l);
            }
            break;
          //グループ
          case "group":
            break;
        }
      });
      return data;
    },

    //アセットに無いイメージデータを読み込み
    _checkImage: function() {
      const imageSource = [];
      const loadImage = [];

      //一覧作成
      this.tilesets.forEach(tileset => {
        const obj = {
          isTileset: true,
          image: tileset.source,
        };
        imageSource.push(obj);
      });
      this.layers.forEach(layer => {
        if (layer.image) {
          const obj = {
            isTileset: false,
            image: layer.image.source,
          };
          imageSource.push(obj);
        }
      });

      //アセットにあるか確認
      imageSource.forEach(e => {
        if (e.isTileset) {
          const tsx = phina.asset.AssetManager.get('tsx', e.image);
          if (!tsx) {
            //アセットになかったのでロードリストに追加
            loadImage.push(e);
          }
        } else {
          const image = phina.asset.AssetManager.get('image', e.image);
          if (!image) {
            //アセットになかったのでロードリストに追加
            loadImage.push(e);
          }
        }
      });

      //一括ロード
      //ロードリスト作成
      if (loadImage.length) {
        const assets = { image: [], tsx: [] };
        loadImage.forEach(e => {
          if (e.isTileset) {
            assets.tsx[e.image] = e.image;
          } else {
            //アセットのパスをマップと同じにする
            assets.image[e.image] = this.path + e.image;
          }
        });
        return new Promise(resolve => {
          const loader = phina.asset.AssetLoader();
          loader.load(assets);
          loader.on('load', () => {
            this.tilesets.forEach(e => {
              e.tsx = phina.asset.AssetManager.get('tsx', e.source);
            });
            resolve();
          });
        });
      } else {
        return Promise.resolve();
      }
    },

    //マップイメージ作成
    _generateImage: function(layerName) {
      let numLayer = 0;
      for (let i = 0; i < this.layers.length; i++) {
        if (this.layers[i].type == "layer" || this.layers[i].type == "imagelayer") numLayer++;
      }
      if (numLayer == 0) return null;

      const width = this.width * this.tilewidth;
      const height = this.height * this.tileheight;
      const canvas = phina.graphics.Canvas().setSize(width, height);

      for (let i = 0; i < this.layers.length; i++) {
        //マップレイヤー
        if (this.layers[i].type == "layer" && this.layers[i].visible != "0") {
          if (layerName === undefined || layerName === this.layers[i].name) {
            const layer = this.layers[i];
            const mapdata = layer.data;
            const width = layer.width;
            const height = layer.height;
            const opacity = layer.opacity || 1.0;
            let count = 0;
            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                const index = mapdata[count];
                if (index !== 0) {
                  //マップチップを配置
                  this._setMapChip(canvas, index, x * this.tilewidth, y * this.tileheight, opacity);
                }
                count++;
              }
            }
          }
        }
        //オブジェクトグループ
        if (this.layers[i].type == "objectgroup" && this.layers[i].visible != "0") {
          if (layerName === undefined || layerName === this.layers[i].name) {
            const layer = this.layers[i];
            const opacity = layer.opacity || 1.0;
            layer.objects.forEach(function(e) {
              if (e.gid) {
                this._setMapChip(canvas, e.gid, e.x, e.y, opacity);
              }
            }.bind(this));
          }
        }
        //イメージレイヤー
        if (this.layers[i].type == "imagelayer" && this.layers[i].visible != "0") {
          if (layerName === undefined || layerName === this.layers[i].name) {
            const image = phina.asset.AssetManager.get('image', this.layers[i].image.source);
            canvas.context.drawImage(image.domElement, this.layers[i].x, this.layers[i].y);
          }
        }
      }

      const texture = phina.asset.Texture();
      texture.domElement = canvas.domElement;
      return texture;
    },

    //キャンバスの指定した座標にマップチップのイメージをコピーする
    _setMapChip: function(canvas, index, x, y, opacity) {
      //対象タイルセットの判別
      let tileset;
      for (let i = 0; i < this.tilesets.length; i++) {
        const tsx1 = this.tilesets[i];
        const tsx2 = this.tilesets[i + 1];
        if (!tsx2) {
          tileset = tsx1;
          i = this.tilesets.length;
        } else if (tsx1.firstgid <= index && index < tsx2.firstgid) {
          tileset = tsx1;
          i = this.tilesets.length;
        }
      }
      //タイルセットからマップチップを取得
      const tsx = tileset.tsx;
      const chip = tsx.chips[index - tileset.firstgid];
      const image = phina.asset.AssetManager.get('image', chip.image);
      canvas.context.drawImage(
        image.domElement,
        chip.x + tsx.margin, chip.y + tsx.margin,
        tsx.tilewidth, tsx.tileheight,
        x, y,
        tsx.tilewidth, tsx.tileheight);
    },

  });

  //ローダーに追加
  phina.asset.AssetLoader.assetLoadFunctions.tmx = function(key, path) {
    const tmx = phina.asset.TiledMap();
    return tmx.load(path);
  };

});
/*
 *  phina.Tileset.js
 *  2019/9/12
 *  @auther minimo  
 *  This Program is MIT license.
 *
 */

phina.namespace(function() {

  phina.define("phina.asset.TileSet", {
    superClass: "phina.asset.XMLLoader",

    image: null,
    tilewidth: 0,
    tileheight: 0,
    tilecount: 0,
    columns: 0,

    init: function(xml) {
        this.superInit();
        if (xml) {
          this.loadFromXML(xml);
        }
    },

    _load: function(resolve) {
      //パス抜き出し
      this.path = "";
      const last = this.src.lastIndexOf("/");
      if (last > 0) {
        this.path = this.src.substring(0, last + 1);
      }

      //終了関数保存
      this._resolve = resolve;

      // load
      const xml = new XMLHttpRequest();
      xml.open('GET', this.src);
      xml.onreadystatechange = () => {
        if (xml.readyState === 4) {
          if ([200, 201, 0].indexOf(xml.status) !== -1) {
            const data = (new DOMParser()).parseFromString(xml.responseText, "text/xml");
            this.dataType = "xml";
            this.data = data;
            this._parse(data)
              .then(() => this._resolve(this));
          }
        }
      };
      xml.send(null);
    },

    loadFromXML: function(xml) {
      return this._parse(xml);
    },

    _parse: function(data) {
      return new Promise(resolve => {
        //タイルセット取得
        const tileset = data.getElementsByTagName('tileset')[0];
        const props = this._propertiesToJSON(tileset);

        //タイルセット属性情報取得
        const attr = this._attrToJSON(tileset);
        attr.$safe({
          tilewidth: 32,
          tileheight: 32,
          spacing: 0,
          margin: 0,
        });
        this.$extend(attr);
        this.chips = [];

        //ソース画像設定取得
        this.imageName = tileset.getElementsByTagName('image')[0].getAttribute('source');
  
        //透過色設定取得
        const trans = tileset.getElementsByTagName('image')[0].getAttribute('trans');
        if (trans) {
          this.transR = parseInt(trans.substring(0, 2), 16);
          this.transG = parseInt(trans.substring(2, 4), 16);
          this.transB = parseInt(trans.substring(4, 6), 16);
        }
  
        //マップチップリスト作成
        for (let r = 0; r < this.tilecount; r++) {
          const chip = {
            image: this.imageName,
            x: (r  % this.columns) * (this.tilewidth + this.spacing) + this.margin,
            y: Math.floor(r / this.columns) * (this.tileheight + this.spacing) + this.margin,
          };
          this.chips[r] = chip;
        }

        //イメージデータ読み込み
        this._loadImage()
          .then(() => resolve());
      });
    },

    //アセットに無いイメージデータを読み込み
    _loadImage: function() {
      return new Promise(resolve => {
        const imageSource = {
          imageName: this.imageName,
          imageUrl: this.path + this.imageName,
          transR: this.transR,
          transG: this.transG,
          transB: this.transB,
        };
        
        let loadImage = null;
        const image = phina.asset.AssetManager.get('image', imageSource.image);
        if (image) {
          this.image = image;
        } else {
          loadImage = imageSource;
        }

        //ロードリスト作成
        const assets = { image: [] };
        assets.image[imageSource.imageName] = imageSource.imageUrl;

        if (loadImage) {
          const loader = phina.asset.AssetLoader();
          loader.load(assets);
          loader.on('load', e => {
            //透過色設定反映
            this.image = phina.asset.AssetManager.get('image', imageSource.imageUrl);
            if (imageSource.transR !== undefined) {
              const r = imageSource.transR;
              const g = imageSource.transG;
              const b = imageSource.transB;
              this.image.filter((pixel, index, x, y, bitmap) => {
                const data = bitmap.data;
                if (pixel[0] == r && pixel[1] == g && pixel[2] == b) {
                    data[index+3] = 0;
                }
              });
            }
            resolve();
          });
        } else {
          resolve();
        }
      });
    },
  });

  //ローダーに追加
  phina.asset.AssetLoader.assetLoadFunctions.tsx = function(key, path) {
    const tsx = phina.asset.TileSet();
    return tsx.load(path);
  };

});
//
// 汎用関数群
//
phina.define("Util", {
  _static: {

    //指定されたオブジェクトをルートとして目的のidを走査する
    findById: function(id, obj) {
      if (obj.id === id) return obj;
      const children = Object.keys(obj.children || {}).map(key => obj.children[key]);
      for (let i = 0; i < children.length; i++) {
        const hit = this.findById(id, children[i]);
        if (hit) return hit;
      }
      return null;
    },

    //TODO:ここじゃない感があるのですが、一旦実装
    //指定されたAとBのassetsの連想配列を新規のオブジェクトにマージする
    mergeAssets: function(assetsA, assetsB) {
      const result = {};
      assetsA.forIn((typeKey, typeValue) => {
        if (!result.$has(typeKey)) result[typeKey] = {};
        typeValue.forIn((assetKey, assetPath) => {
          result[typeKey][assetKey] = assetPath;
        });
      });
      assetsB.forIn((typeKey, typeValue) => {
        if (!result.$has(typeKey)) result[typeKey] = {};
        typeValue.forIn((assetKey, assetPath) => {
          result[typeKey][assetKey] = assetPath;
        });
      });
      return result;
    },

    //現在時間から指定時間までどのくらいかかるかを返却する
    //
    // output : { 
    //   totalDate:0 , 
    //   totalHour:0 , 
    //   totalMinutes:0 , 
    //   totalSeconds:0 ,
    //   date:0 , 
    //   hour:0 , 
    //   minutes:0 , 
    //   seconds:0 
    // }
    //

    calcRemainingTime: function(finish) {
      const now = new Date();
      const result = {
        "totalDate": 0,
        "totalHour": 0,
        "totalMinutes": 0,
        "totalSeconds": 0,
        "date": 0,
        "hour": 0,
        "minutes": 0,
        "seconds": 0,
      }

      finish = (finish instanceof Date) ? finish : new Date(finish);
      let diff = finish - now;
      if (diff === 0) return result;

      const sign = (diff < 0) ? -1 : 1;

      //TODO:この辺りもう少し綺麗に書けないか検討
      //単位別 1未満は0
      result["totalDate"] = parseInt(diff / 1000 / 60 / 60 / 24);
      result["totalHour"] = parseInt(diff / 1000 / 60 / 60);
      result["totalMinutes"] = parseInt(diff / 1000 / 60);
      result["totalSeconds"] = parseInt(diff / 1000);

      diff -= result["totalDate"] * 86400000;
      result["hour"] = parseInt(diff / 1000 / 60 / 60);

      diff -= result["hour"] * 3600000;
      result["minutes"] = parseInt(diff / 1000 / 60);

      diff -= result["minutes"] * 60000;
      result["seconds"] = parseInt(diff / 1000);

      return result;

    },

    //レイアウトエディターではSprite全てAtalsSpriteになってしまうため、
    //Spriteに差し替えられるようにする

    //AtlasSprite自身に単発のImageをセットできるようにする？
    //あとでなにかしら対策しないとだめだが３月納品では一旦これで
    replaceAtlasSpriteToSprite: function(parent, atlasSprite, sprite) {
      const index = parent.getChildIndex(atlasSprite);
      sprite.setOrigin(atlasSprite.originX, atlasSprite.originY);
      sprite.setPosition(atlasSprite.x, atlasSprite.y);
      parent.addChildAt(sprite, index);
      atlasSprite.remove();
      return sprite;
    },
  }
});

/*
 *  phina.xmlloader.js
 *  2019/9/12
 *  @auther minimo  
 *  This Program is MIT license.
 *
 */

phina.namespace(function() {

  phina.define("phina.asset.XMLLoader", {
    superClass: "phina.asset.Asset",

    init: function() {
        this.superInit();
    },

    _load: function(resolve) {
      resolve();
    },

    //XMLプロパティをJSONに変換
    _propertiesToJSON: function(elm) {
      const properties = elm.getElementsByTagName("properties")[0];
      const obj = {};
      if (properties === undefined) return obj;

      for (let k = 0; k < properties.childNodes.length; k++) {
        const p = properties.childNodes[k];
        if (p.tagName === "property") {
          //propertyにtype指定があったら変換
          const type = p.getAttribute('type');
          const value = p.getAttribute('value');
          if (!value) value = p.textContent;
          if (type == "int") {
            obj[p.getAttribute('name')] = parseInt(value, 10);
          } else if (type == "float") {
            obj[p.getAttribute('name')] = parseFloat(value);
          } else if (type == "bool" ) {
            if (value == "true") obj[p.getAttribute('name')] = true;
            else obj[p.getAttribute('name')] = false;
          } else {
            obj[p.getAttribute('name')] = value;
          }
        }
      }
      return obj;
    },

    //XML属性をJSONに変換
    _attrToJSON: function(source) {
      const obj = {};
      for (let i = 0; i < source.attributes.length; i++) {
        let val = source.attributes[i].value;
        val = isNaN(parseFloat(val))? val: parseFloat(val);
        obj[source.attributes[i].name] = val;
      }
      return obj;
    },

    //XML属性をJSONに変換（Stringで返す）
    _attrToJSON_str: function(source) {
      const obj = {};
      for (let i = 0; i < source.attributes.length; i++) {
        const val = source.attributes[i].value;
        obj[source.attributes[i].name] = val;
      }
      return obj;
    },

    //CSVパース
    _parseCSV: function(data) {
      const dataList = data.split(',');
      const layer = [];

      dataList.each(elm => {
        const num = parseInt(elm, 10);
        layer.push(num);
      });

      return layer;
    },

    /**
     * BASE64パース
     * http://thekannon-server.appspot.com/herpity-derpity.appspot.com/pastebin.com/75Kks0WH
     * @private
     */
    _parseBase64: function(data) {
      const dataList = atob(data.trim());
      const rst = [];

      dataList = dataList.split('').map(e => e.charCodeAt(0));

      for (let i = 0, len = dataList.length / 4; i < len; ++i) {
        const n = dataList[i*4];
        rst[i] = parseInt(n, 10);
      }

      return rst;
    },
  });

});
phina.asset.AssetLoader.prototype.load = function(params) {
  var self = this;
  var loadAssets = [];
  var counter = 0;
  var length = 0;
  var maxConnectionCount = 2;

  params.forIn(function(type, assets) {
    length += Object.keys(assets).length;
  });

  if (length == 0) {
    return phina.util.Flow.resolve().then(function() {
      self.flare('load');
    });
  }

  params.forIn(function(type, assets) {
    assets.forIn(function(key, value) {
      loadAssets.push({
        "func": phina.asset.AssetLoader.assetLoadFunctions[type],
        "key": key,
        "value": value,
        "type": type,
      });
    });
  });

  if (self.cache) {
    self.on('progress', function(e) {
      if (e.progress >= 1.0) {
        params.forIn(function(type, assets) {
          assets.forIn(function(key, value) {
            var asset = phina.asset.AssetManager.get(type, key);
            if (asset.loadError) {
              var dummy = phina.asset.AssetManager.get(type, 'dummy');
              if (dummy) {
                if (dummy.loadError) {
                  dummy.loadDummy();
                  dummy.loadError = false;
                }
                phina.asset.AssetManager.set(type, key, dummy);
              } else {
                asset.loadDummy();
              }
            }
          });
        });
      }
    });
  }

  var loadAssetsArray = [];

  while (loadAssets.length > 0) {
    loadAssetsArray.push(loadAssets.splice(0, maxConnectionCount));
  }

  var flow = phina.util.Flow.resolve();

  loadAssetsArray.forEach(function(loadAssets) {
    flow = flow.then(function() {
      var flows = [];
      loadAssets.forEach(function(loadAsset) {
        var f = loadAsset.func(loadAsset.key, loadAsset.value);
        f.then(function(asset) {
          if (self.cache) {
            phina.asset.AssetManager.set(loadAsset.type, loadAsset.key, asset);
          }
          self.flare('progress', {
            key: loadAsset.key,
            asset: asset,
            progress: (++counter / length),
          });
        });
        flows.push(f);
      });
      return phina.util.Flow.all(flows);
    });
  });

  return flow.then(function(args) {
    self.flare('load');
  });
}

phina.namespace(function() {

  phina.app.BaseApp.prototype.$method("replaceScene", function(scene) {
    this.flare('replace');
    this.flare('changescene');

    while (this._scenes.length > 0) {
      const scene = this._scenes.pop();
      scene.flare("destroy");
    }

    this._sceneIndex = 0;

    if (this.currentScene) {
      this.currentScene.app = null;
    }

    this.currentScene = scene;
    this.currentScene.app = this;
    this.currentScene.flare('enter', {
      app: this,
    });

    return this;
  });

  phina.app.BaseApp.prototype.$method("popScene", function() {
    this.flare('pop');
    this.flare('changescene');

    var scene = this._scenes.pop();
    --this._sceneIndex;

    scene.flare('exit', {
      app: this,
    });
    scene.flare('destroy');
    scene.app = null;

    this.flare('poped');

    // 
    this.currentScene.flare('resume', {
      app: this,
      prevScene: scene,
    });

    return scene;
  });

});

phina.namespace(function() {

  phina.graphics.Canvas.prototype.$method("init", function(canvas) {
    this.isCreateCanvas = false;
    if (typeof canvas === 'string') {
      this.canvas = document.querySelector(canvas);
    } else {
      if (canvas) {
        this.canvas = canvas;
      } else {
        this.canvas = document.createElement('canvas');
        this.isCreateCanvas = true;
        // console.log('#### create canvas ####');
      }
    }

    this.domElement = this.canvas;
    this.context = this.canvas.getContext('2d');
    this.context.lineCap = 'round';
    this.context.lineJoin = 'round';
  });

  phina.graphics.Canvas.prototype.$method('destroy', function(canvas) {
    if (!this.isCreateCanvas) return;
    // console.log(`#### delete canvas ${this.canvas.width} x ${this.canvas.height} ####`);
    this.setSize(0, 0);
    delete this.canvas;
    delete this.domElement;
  });

});

phina.namespace(() => {

  var qualityScale = phina.geom.Matrix33();

  phina.display.CanvasRenderer.prototype.$method("render", function(scene, quality) {
    this.canvas.clear();
    if (scene.backgroundColor) {
      this.canvas.clearColor(scene.backgroundColor);
    }

    this._context.save();
    this.renderChildren(scene, quality);
    this._context.restore();
  });

  phina.display.CanvasRenderer.prototype.$method("renderChildren", function(obj, quality) {
    // 子供たちも実行
    if (obj.children.length > 0) {
      var tempChildren = obj.children.slice();
      for (var i = 0, len = tempChildren.length; i < len; ++i) {
        this.renderObject(tempChildren[i], quality);
      }
    }
  });

  phina.display.CanvasRenderer.prototype.$method("renderObject", function(obj, quality) {
    if (obj.visible === false && !obj.interactive) return;

    obj._calcWorldMatrix && obj._calcWorldMatrix();

    if (obj.visible === false) return;

    obj._calcWorldAlpha && obj._calcWorldAlpha();

    var context = this.canvas.context;

    context.globalAlpha = obj._worldAlpha;
    context.globalCompositeOperation = obj.blendMode;

    if (obj._worldMatrix) {

      qualityScale.identity();

      qualityScale.m00 = quality || 1.0;
      qualityScale.m11 = quality || 1.0;

      var m = qualityScale.multiply(obj._worldMatrix);
      context.setTransform(m.m00, m.m10, m.m01, m.m11, m.m02, m.m12);

    }

    if (obj.clip) {

      context.save();

      obj.clip(this.canvas);
      context.clip();

      if (obj.draw) obj.draw(this.canvas);

      // 子供たちも実行
      if (obj.renderChildBySelf === false && obj.children.length > 0) {
        var tempChildren = obj.children.slice();
        for (var i = 0, len = tempChildren.length; i < len; ++i) {
          this.renderObject(tempChildren[i], quality);
        }
      }

      context.restore();
    } else {
      if (obj.draw) obj.draw(this.canvas);

      // 子供たちも実行
      if (obj.renderChildBySelf === false && obj.children.length > 0) {
        var tempChildren = obj.children.slice();
        for (var i = 0, len = tempChildren.length; i < len; ++i) {
          this.renderObject(tempChildren[i], quality);
        }
      }

    }
  });

});

phina.namespace(() => {
  //ユーザーエージェントからブラウザタイプの判別を行う
  phina.$method('checkBrowser', function() {
    const result = {};
    const agent = window.navigator.userAgent.toLowerCase();;

    result.isChrome = (agent.indexOf('chrome') !== -1) && (agent.indexOf('edge') === -1) && (agent.indexOf('opr') === -1);
    result.isEdge = (agent.indexOf('edge') !== -1);
    result.isIe11 = (agent.indexOf('trident/7') !== -1);
    result.isFirefox = (agent.indexOf('firefox') !== -1);
    result.isSafari = (agent.indexOf('safari') !== -1) && (agent.indexOf('chrome') === -1);
    result.isElectron = (agent.indexOf('electron') !== -1);

    result.isWindows = (agent.indexOf('windows') !== -1);
    result.isMac = (agent.indexOf('mac os x') !== -1);

    result.isiPad = agent.indexOf('ipad') > -1 || ua.indexOf('macintosh') > -1 && 'ontouchend' in document;
    result.isiOS = agent.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1 || ua.indexOf('macintosh') > -1 && 'ontouchend' in document;

    return result;
  });
});

//==================================================
//  Extension phina.display.DisplayElement
//==================================================
phina.namespace(() => {
  phina.display.DisplayElement.prototype.$method("enable", function() {
    this.show().wakeUp();
    return this;
  });

  phina.display.DisplayElement.prototype.$method("disable", function() {
    this.hide().sleep();
    return this;
  });
});

phina.namespace(() => {
  phina.display.DisplayScene.quality = 1.0;
  phina.display.DisplayScene.prototype.$method("init", function(params) {
    this.superInit();
    var quality = phina.display.DisplayScene.quality;

    params = ({}).$safe(params, phina.display.DisplayScene.defaults);
    this.canvas = phina.graphics.Canvas();
    this.canvas.setSize(params.width * quality, params.height * quality);
    this.renderer = phina.display.CanvasRenderer(this.canvas);
    this.backgroundColor = (params.backgroundColor) ? params.backgroundColor : null;

    this.width = params.width;
    this.height = params.height;
    this.gridX = phina.util.Grid(params.width, 16);
    this.gridY = phina.util.Grid(params.height, 16);

    this.interactive = true;
    this.setInteractive = function(flag) {
      this.interactive = flag;
    };
    this._overFlags = {};
    this._touchFlags = {};
  });

});

phina.namespace(function() {

  // audio要素で音声を再生する。主にIE用
  phina.define("phina.asset.DomAudioSound", {
    superClass: "phina.asset.Asset",

    domElement: null,
    emptySound: false,

    init: function() {
      this.superInit();
    },

    _load: function(resolve) {
      this.domElement = document.createElement("audio");
      if (this.domElement.canPlayType("audio/mpeg")) {
        setTimeout(function readystateCheck() {
          if (this.domElement.readyState < 4) {
            setTimeout(readystateCheck.bind(this), 10);
          } else {
            this.emptySound = false;
            console.log("end load ", this.src);
            resolve(this)
          }
        }.bind(this), 10);
        this.domElement.onerror = function(e) {
          console.error("オーディオのロードに失敗", e);
        };
        this.domElement.src = this.src;
        console.log("begin load ", this.src);
        this.domElement.load();
        this.domElement.autoplay = false;
        this.domElement.addEventListener("ended", function() {
          this.flare("ended");
        }.bind(this));
      } else {
        console.log("mp3は再生できません");
        this.emptySound = true;
        resolve(this);
      }
    },

    play: function() {
      if (this.emptySound) return;
      this.domElement.pause();
      this.domElement.currentTime = 0;
      this.domElement.play();
    },

    stop: function() {
      if (this.emptySound) return;
      this.domElement.pause();
      this.domElement.currentTime = 0;
    },

    pause: function() {
      if (this.emptySound) return;
      this.domElement.pause();
    },

    resume: function() {
      if (this.emptySound) return;
      this.domElement.play();
    },

    setLoop: function(v) {
      if (this.emptySound) return;
      this.domElement.loop = v;
    },

    _accessor: {
      volume: {
        get: function() {
          if (this.emptySound) return 0;
          return this.domElement.volume;
        },
        set: function(v) {
          if (this.emptySound) return;
          this.domElement.volume = v;
        },
      },
      loop: {
        get: function() {
          if (this.emptySound) return false;
          return this.domElement.loop;
        },
        set: function(v) {
          if (this.emptySound) return;
          this.setLoop(v);
        },
      },

    },
  });

  // IE11の場合のみ音声アセットはDomAudioSoundで再生する
  var ua = window.navigator.userAgent.toLowerCase();
  if (ua.indexOf('trident/7') !== -1) {
    phina.asset.AssetLoader.register("sound", function(key, path) {
      var asset = phina.asset.DomAudioSound();
      return asset.load(path);
    });
  }

});

phina.namespace(() => {

  phina.app.Element.prototype.$method("findById", function(id) {
    if (this.id === id) {
      return this;
    } else {
      for (let i = 0; i < this.children.length; i++) {
        if (this.children[i].findById(id)) {
          return this.children[i];
        }
      }
      return null;
    }
  });

  //指定された子オブジェクトを最前面に移動する
  phina.app.Element.prototype.$method("moveFront", function(child) {
    for (let i = 0; i < this.children.length; i++) {
      if (this.children[i] == child) {
        this.children.splice(i, 1);
        break;
      }
    }
    this.children.push(child);
    return this;
  });

  phina.app.Element.prototype.$method("destroyChild", function() {
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].flare('destroy');
    }
    return this;
  });

});

phina.namespace(() => {

  phina.input.Input.quality = 1.0;

  phina.input.Input.prototype.$method("_move", function(x, y) {
    this._tempPosition.x = x;
    this._tempPosition.y = y;

    // adjust scale
    var elm = this.domElement;
    var rect = elm.getBoundingClientRect();

    var w = elm.width / phina.input.Input.quality;
    var h = elm.height / phina.input.Input.quality;

    if (rect.width) {
      this._tempPosition.x *= w / rect.width;
    }

    if (rect.height) {
      this._tempPosition.y *= h / rect.height;
    }

  });

});

phina.namespace(() => {
  phina.display.Label.prototype.$method("init", function(options) {
    if (typeof arguments[0] !== 'object') {
      options = { text: arguments[0], };
    } else {
      options = arguments[0];
    }

    options = ({}).$safe(options, phina.display.Label.defaults);
    this.superInit(options);

    this.text = (options.text) ? options.text : "";
    this.fontSize = options.fontSize;
    this.fontWeight = options.fontWeight;
    this.fontFamily = options.fontFamily;
    this.align = options.align;
    this.baseline = options.baseline;
    this.lineHeight = options.lineHeight;
  });

});

phina.namespace(() => {
  phina.input.Mouse.prototype.init = function(domElement) {
    this.superInit(domElement);

    this.id = 0;

    var self = this;
    this.domElement.addEventListener('mousedown', function(e) {
      self._start(e.pointX, e.pointY, 1 << e.button);
      e.preventDefault();
      e.stopPropagation();
    });

    this.domElement.addEventListener('mouseup', function(e) {
      self._end(1 << e.button);
      e.preventDefault();
      e.stopPropagation();
    });
    this.domElement.addEventListener('mousemove', function(e) {
      self._move(e.pointX, e.pointY);
      e.preventDefault();
      e.stopPropagation();
    });

    // マウスがキャンバス要素の外に出た場合の対応
    this.domElement.addEventListener('mouseout', function(e) {
      self._end(1);
    });
  }
});

//==================================================
//  Extension phina.app.Object2D
//==================================================

phina.namespace(() => {
  phina.app.Object2D.prototype.$method("setOrigin", function(x, y, reposition) {
    if (!reposition) {
      this.origin.x = x;
      this.origin.y = y;
      return this;
    }

    //変更された基準点に移動させる
    const _originX = this.originX;
    const _originY = this.originY;
    const _addX = (x - _originX) * this.width;
    const _addY = (y - _originY) * this.height;

    this.x += _addX;
    this.y += _addY;
    this.originX = x;
    this.originY = y;

    this.children.forEach(child => {
      child.x -= _addX;
      child.y -= _addY;
    });
    return this;
  });

  phina.app.Object2D.prototype.$method("hitTestElement", function(elm) {
    const rect0 = this.calcGlobalRect();
    const rect1 = elm.calcGlobalRect();
    return (rect0.left < rect1.right) && (rect0.right > rect1.left) &&
      (rect0.top < rect1.bottom) && (rect0.bottom > rect1.top);
  });

  phina.app.Object2D.prototype.$method("includeElement", function(elm) {
    const rect0 = this.calcGlobalRect();
    const rect1 = elm.calcGlobalRect();
    return (rect0.left <= rect1.left) && (rect0.right >= rect1.right) &&
      (rect0.top <= rect1.top) && (rect0.bottom >= rect1.bottom);
  });

  phina.app.Object2D.prototype.$method("calcGlobalRect", function() {
    const left = this._worldMatrix.m02 - this.originX * this.width;
    const top = this._worldMatrix.m12 - this.originY * this.height;
    return Rect(left, top, this.width, this.height);
  });

  phina.app.Object2D.prototype.$method("calcGlobalRect", function() {
    const left = this._worldMatrix.m02 - this.originX * this.width;
    const top = this._worldMatrix.m12 - this.originY * this.height;
    return Rect(left, top, this.width, this.height);
  });

});

phina.namespace(function() {

  phina.display.PlainElement.prototype.$method("destroyCanvas", function() {
    if (!this.canvas) return;
    this.canvas.destroy();
    delete this.canvas;
  });

});

//==================================================
//  Extension phina.display.Shape
//==================================================
phina.display.Shape.prototype.render = function(canvas) {
  if (!canvas) {
    console.log("canvas null");
    return;
  }
  var context = canvas.context;
  // リサイズ
  var size = this.calcCanvasSize();
  canvas.setSize(size.width, size.height);
  // クリアカラー
  canvas.clearColor(this.backgroundColor);
  // 中心に座標を移動
  canvas.transformCenter();

  // 描画前処理
  this.prerender(this.canvas);

  // ストローク描画
  if (this.isStrokable()) {
    context.strokeStyle = this.stroke;
    context.lineWidth = this.strokeWidth;
    context.lineJoin = "round";
    context.shadowBlur = 0;
    this.renderStroke(canvas);
  }

  // 塗りつぶし描画
  if (this.fill) {
    context.fillStyle = this.fill;
    // shadow の on/off
    if (this.shadow) {
      context.shadowColor = this.shadow;
      context.shadowBlur = this.shadowBlur;
      context.shadowOffsetX = this.shadowOffsetX || 0;
      context.shadowOffsetY = this.shadowOffsetY || 0;
    } else {
      context.shadowBlur = 0;
    }
    this.renderFill(canvas);
  }

  // 描画後処理
  this.postrender(this.canvas);

  return this;
};

phina.namespace(function() {

  phina.asset.Sound.prototype.$method("_load", function(resolve) {
    if (/^data:/.test(this.src)) {
      this._loadFromURIScheme(resolve);
    } else {
      this._loadFromFile(resolve);
    }
  });

  phina.asset.Sound.prototype.$method("_loadFromFile", function(resolve) {
    // console.log(this.src);
    var self = this;
    var xml = new XMLHttpRequest();
    xml.open('GET', this.src);
    xml.onreadystatechange = function() {
      if (xml.readyState === 4) {
        if ([200, 201, 0].indexOf(xml.status) !== -1) {
          // 音楽バイナリーデータ
          var data = xml.response;
          // webaudio 用に変換
          // console.log(data)
          self.context.decodeAudioData(data, function(buffer) {
            self.loadFromBuffer(buffer);
            resolve(self);
          }, function() {
            console.warn("音声ファイルのデコードに失敗しました。(" + self.src + ")");
            resolve(self);
            self.flare('decodeerror');
          });
        } else if (xml.status === 404) {
          // not found
          self.loadError = true;
          self.notFound = true;
          resolve(self);
          self.flare('loaderror');
          self.flare('notfound');
        } else {
          // サーバーエラー
          self.loadError = true;
          self.serverError = true;
          resolve(self);
          self.flare('loaderror');
          self.flare('servererror');
        }
        xml.onreadystatechange = null;
      }
    };

    xml.responseType = 'arraybuffer';

    xml.send(null);
  });

  phina.asset.Sound.prototype.$method("play", function(when, offset, duration) {
    when = when ? when + this.context.currentTime : 0;
    offset = offset || 0;

    var source = this.source = this.context.createBufferSource();
    var buffer = source.buffer = this.buffer;
    source.loop = this._loop;
    source.loopStart = this._loopStart;
    source.loopEnd = this._loopEnd;
    source.playbackRate.value = this._playbackRate;

    // connect
    source.connect(this.gainNode);
    this.gainNode.connect(phina.asset.Sound.getMasterGain());
    // play
    if (duration !== undefined) {
      source.start(when, offset, duration);
    } else {
      source.start(when, offset);
    }

    source.onended = function() {
      if (!source) {
        this.flare('ended');
        return;
      }
      source.onended = null;
      source.disconnect();
      source.buffer = null;
      source = null;
      this.flare('ended');
    }.bind(this);

    return this;
  });

  phina.asset.Sound.prototype.$method("stop", function() {
    // stop
    if (this.source) {
      // stop すると source.endedも発火する
      this.source.stop && this.source.stop(0);
      this.flare('stop');
    }

    return this;
  });

});

//==================================================
//  Extension phina.asset.SoundManager
//==================================================
SoundManager.$method("getVolume", function() {
  return !this.isMute() ? this.volume : 0;
});

SoundManager.$method("getVolumeMusic", function() {
  return !this.isMute() ? this.musicVolume : 0;
});

SoundManager.$method("setVolumeMusic", function(volume) {
  this.musicVolume = volume;
  if (!this.isMute() && this.currentMusic) {
    this.currentMusic.volume = volume;
  }
  return this;
});

SoundManager.$method("playMusic", function(name, fadeTime, loop, when, offset, duration) {
  // const res = phina.checkBrowser();
  // if (res.isIe11) return null;

  loop = (loop !== undefined) ? loop : true;

  if (this.currentMusic) {
    this.stopMusic(fadeTime);
  }

  var music = null;
  if (name instanceof phina.asset.Sound || name instanceof phina.asset.DomAudioSound) {
    music = name;
  } else {
    music = phina.asset.AssetManager.get('sound', name);
  }

  if (!music) {
    console.error("Sound not found: ", name);
    return null;
  }

  music.setLoop(loop);
  music.play(when, offset, duration);

  if (fadeTime > 0) {
    var count = 32;
    var counter = 0;
    var unitTime = fadeTime / count;
    var volume = this.getVolumeMusic();

    music.volume = 0;
    var id = setInterval(function() {
      counter += 1;
      var rate = counter / count;
      music.volume = rate * volume;

      if (rate >= 1) {
        clearInterval(id);
        return false;
      }

      return true;
    }, unitTime);
  } else {
    music.volume = this.getVolumeMusic();
  }

  this.currentMusic = music;

  return this.currentMusic;
});

//==================================================
// ボイス用の音量設定、再生メソッド拡張
SoundManager.$method("getVolumeVoice", function() {
  return !this.isMute() ? this.voiceVolume : 0;
});

SoundManager.$method("setVolumeVoice", function(volume) {
  this.voiceVolume = volume;
  return this;
});

SoundManager.$method("playVoice", function(name) {
  var sound = phina.asset.AssetManager.get('sound', name);
  sound.volume = this.getVolumeVoice();
  sound.play();
  return sound;
});

//スプライト機能拡張
phina.namespace(function() {

  phina.display.Sprite.prototype.setFrameTrimming = function(x, y, width, height) {
    this._frameTrimX = x || 0;
    this._frameTrimY = y || 0;
    this._frameTrimWidth = width || this.image.domElement.width - this._frameTrimX;
    this._frameTrimHeight = height || this.image.domElement.height - this._frameTrimY;
    return this;
  }

  phina.display.Sprite.prototype.setFrameIndex = function(index, width, height) {
    var sx = this._frameTrimX || 0;
    var sy = this._frameTrimY || 0;
    var sw = this._frameTrimWidth  || (this.image.domElement.width-sx);
    var sh = this._frameTrimHeight || (this.image.domElement.height-sy);

    var tw  = width || this.width;      // tw
    var th  = height || this.height;    // th
    var row = ~~(sw / tw);
    var col = ~~(sh / th);
    var maxIndex = row*col;
    index = index%maxIndex;

    var x   = index%row;
    var y   = ~~(index/row);
    this.srcRect.x = sx+x*tw;
    this.srcRect.y = sy+y*th;
    this.srcRect.width  = tw;
    this.srcRect.height = th;

    this._frameIndex = index;

    return this;
  }

});
phina.namespace(function() {
  // 文字列から数値を抽出する
  // レイアウトファイルから作業する場合に利用したくなる
  // hoge_0 hoge_1などから数字だけ抽出
  // 0100_hoge_9999 => ["0100" , "9999"]になる
  // hoge0.0とかはどうすかな？
  // 抽出後にparseIntするかは検討中
  String.prototype.$method("matchInt", function() {
    return this.match(/[0-9]+/g);
  });
});

phina.namespace(function() {

  phina.asset.Texture.prototype.$method("_load", function(resolve) {
    this.domElement = new Image();

    var isLocal = (location.protocol == 'file:');
    if (!(/^data:/.test(this.src))) {
      this.domElement.crossOrigin = 'anonymous'; // クロスオリジン解除
    }

    var self = this;
    this.domElement.onload = function(e) {
      self.loaded = true;
      e.target.onload = null;
      e.target.onerror = null;
      resolve(self);
    };

    this.domElement.onerror = function(e) {
      e.target.onload = null;
      e.target.onerror = null;
      console.error("phina.asset.Texture _load onError ", this.src);
    };

    this.domElement.src = this.src;
  });

});

phina.namespace(function() {

  phina.accessory.Tweener.prototype.$method("_updateTween", function(app) {
    //※これないとpauseがうごかない
    if (!this.playing) return;

    var tween = this._tween;
    var time = this._getUnitTime(app);

    tween.forward(time);
    this.flare('tween');

    if (tween.time >= tween.duration) {
      delete this._tween;
      this._tween = null;
      this._update = this._updateTask;
    }
  });

  phina.accessory.Tweener.prototype.$method("_updateWait", function(app) {
    //※これないとpauseがうごかない
    if (!this.playing) return;

    var wait = this._wait;
    var time = this._getUnitTime(app);
    wait.time += time;

    if (wait.time >= wait.limit) {
      delete this._wait;
      this._wait = null;
      this._update = this._updateTask;
    }
  });

});

//
// シーンエフェクトの基礎クラス
//
phina.define("SceneEffectBase", {
  superClass: "InputIntercept",

  init: function() {
    this.superInit();
    this.enable();
  },

});

//
// シーンエフェクト：複数の円でフェードインアウト
//
phina.define("SceneEffectCircleFade", {
  superClass: "SceneEffectBase",

  init: function(options) {
    this.options = ({}).$safe(options, SceneEffectCircleFade.defaults);

    this.superInit();
  },

  _createCircle: function() {
    const num = 5;
    const width = SCREEN_WIDTH / num;
    return Array.range((SCREEN_HEIGHT / width) + 1).map(y => {
      return Array.range(num + 1).map(x => {
        return this.addChild(CircleShape({
          x: x * width,
          y: y * width,
          fill: this.options.color,
          stroke: null,
          radius: width * 0.5,
        }));
      });
    });
  },

  begin: function() {
    const circles = this._createCircle();
    const tasks = [];
    circles.forEach((xLine, y) => {
      xLine.forEach((circle, x) => {
        circle.scaleX = 0;
        circle.scaleY = 0;
        tasks.push(new Promise(resolve => {
          circle.tweener.clear()
            .to({
              scaleX: 1.5,
              scaleY: 1.5
            }, 500, "easeOutQuad")
            .call(() => {
              circle.remove();
              circle.destroyCanvas();
              this.children.clear();
              this.disable();
              resolve()
            });
        }));
      });
    });
    return Promise.all(tasks);
  },

  finish: function() {
    this.children.clear();

    const circles = this._createCircle();
    const tasks = [];
    circles.forEach(xLine => {
      xLine.forEach(circle => {
        circle.scaleX = 1.5;
        circle.scaleY = 1.5;
        tasks.push(new Promise(resolve => {
          circle.tweener.clear()
            .to({
              scaleX: 0,
              scaleY: 0
            }, 500, "easeOutQuad")
            .call(() => {
              circle.remove();
              circle.destroyCanvas();
              this.children.clear();
              this.disable();
              resolve();
            });
        }));
      });
    });
    return Promise.all(tasks);
  },

  _static: {
    defaults: {
      color: "white",
    }
  }

});

//
// シーンエフェクト：フェードインアウト
//
phina.define("SceneEffectFade", {
  superClass: "SceneEffectBase",

  init: function(options) {
    this.options = ({}).$safe(options, {
      color: "black",
      time: 500,
    });

    this.superInit();
    this.fromJSON({
      children: {
        fade: {
          className: "RectangleShape",
          arguments: {
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT,
            fill: this.options.color,
            stroke: null,
            padding: 0,
          },
          x: SCREEN_WIDTH * 0.5,
          y: SCREEN_HEIGHT * 0.5,
        },
      }
    });
  },

  stay: function() {
    const fade = this.fade;
    fade.alpha = 1.0;
    return Promise.resolve();
  },

  begin: function() {
    return new Promise(resolve => {
      const fade = this.fade;
      fade.alpha = 1.0;
      fade.tweener.clear()
        .fadeOut(this.options.time)
        .call(() => {
          //1Frame描画されてしまってちらつくのでenterframeで削除
          this.one("enterframe", () => {
            this.fade.remove();
            this.fade.destroyCanvas();
            this.remove()
          });
          resolve();
        });
    });
  },

  finish: function() {
    return new Promise(resolve => {
      const fade = this.fade;
      fade.alpha = 0.0;
      fade.tweener.clear()
        .fadeIn(this.options.time)
        .call(() => {
          this.flare("finish");
          //1Frame描画されてしまってちらつくのでenterframeで削除
          this.one("enterframe", () => {
            this.fade.remove();
            this.fade.destroyCanvas();
            this.remove()
          });
          resolve();
        });
    });
  },

  _static: {
    defaults: {
      color: "black",
    }
  }

});

//
// シーンエフェクト：なにもしない
//
phina.define("SceneEffectNone", {
  superClass: "SceneEffectBase",

  init: function() {
    this.superInit();
  },

  begin: function() {
    return new Promise(resolve => {
      this.one("enterframe", () => this.remove());
      resolve();
    });
  },

  finish: function() {
    return new Promise(resolve => {
      this.one("enterframe", () => this.remove());
      resolve();
    });
  }

});

//
// シーンエフェクト：タイルフェード
//
phina.define("SceneEffectTileFade", {
  superClass: "SceneEffectBase",

  tiles: null,
  num: 15,
  speed: 50,

  init: function(options) {
    this.superInit();
    this.options = ({}).$safe(options, {
      color: "black",
      width: 768,
      height: 1024,
    });

    this.tiles = this._createTiles();
  },

  _createTiles: function() {
    const width = Math.floor(this.options.width / this.num);

    return Array.range((this.options.height / width) + 1).map(y => {
      return Array.range(this.num + 1).map(x => {
        return this.addChild(RectangleShape({
          width: width + 2,
          height: width + 2,
          x: x * width,
          y: y * width,
          fill: this.options.color,
          stroke: null,
          strokeWidth: 0,
        }));
      });
    });
  },

  stay: function() {
    this.tiles.forEach((xline, y) => {
      xline.forEach((tile, x) => {
        tile.scaleX = 1.0;
        tile.scaleY = 1.0;
      });
    });
    return Promise.resolve();
  },

  begin: function() {
    const tasks = [];
    this.tiles.forEach((xline, y) => {
      const w = Math.randfloat(0, 1) * this.speed;
      xline.forEach((tile, x) => {
        tile.scaleX = 1.0;
        tile.scaleY = 1.0;
        tasks.push(new Promise(resolve => {
          tile.tweener.clear()
            .wait(x * this.speed + w)
            .to({
              scaleX: 0,
              scaleY: 0
            }, 500, "easeOutQuad")
            .call(() => {
              tile.remove();
              tile.destroyCanvas();
              resolve()
            });
        }));
      });
    });
    return Promise.all(tasks)
  },

  finish: function() {
    const tasks = [];
    this.tiles.forEach((xline, y) => {
      const w = Math.randfloat(0, 1) * this.speed;
      xline.forEach((tile, x) => {
        tile.scaleX = 0.0;
        tile.scaleY = 0.0;
        tasks.push(new Promise(resolve => {
          tile.tweener.clear()
            .wait((xline.length - x) * this.speed + w)
            .to({
              scaleX: 1,
              scaleY: 1
            }, 500, "easeOutQuad")
            .call(() => {
              tile.remove();
              tile.destroyCanvas();
              resolve()
            });
        }));
      });
    });
    return Promise.all(tasks)
  },

  _static: {
    defaults: {
      color: "black",
    }
  }

});

//
// クリックやタッチをインターセプトする
//
phina.define("InputIntercept", {
  superClass: "DisplayElement",

  init: function() {
    this.superInit();

    this.on("added", () => {
      //親に対して覆いかぶせる
      this.width = this.parent.width;
      this.height = this.parent.height;
      this.originX = this.parent.originX || 0;
      this.originY = this.parent.originY || 0;
      this.x = 0;
      this.y = 0;
    });
    this.disable();
  },

  enable: function() {
    this.setInteractive(true);
  },

  disable: function() {
    this.setInteractive(false);
  },

});

phina.namespace(function() {

  let dummyTexture = null;

  phina.define("SpriteLabel", {
    superClass: "DisplayElement",

    _text: null,
    table: null,
    fixWidth: 0,

    sprites: null,

    init: function(options) {
      if (!dummyTexture) {
        dummyTexture = Canvas().setSize(1, 1);
      }

      this.superInit(options);
      this.table = options.table;
      this.fixWidth = options.fixWidth || 0;

      this.sprites = [];

      this.setText("");
    },

    setText: function(text) {
      this._text = text;

      const chars = this.text.split("");

      if (this.sprites.length < chars.length) {
        Array.range(0, this.sprites.length - chars.length).forEach(() => {
          this.sprites.push(Sprite(dummyTexture));
        });
      } else {
        Array.range(0, chars.length - this.sprites.length).forEach(() => {
          this.sprites.last.remove();
          this.sprites.length -= 1;
        });
      }

      this._text.split("").map((c, i) => {
        this.sprites[i]
          .setImage(this.table[c])
          .setOrigin(this.originX, this.originY)
          .addChildTo(this);
      });

      const totalWidth = this.sprites.reduce((w, s) => w + (this.fixWidth || s.width), 0);
      const totalHeight = this.sprites.map(_ => _.height).sort().last;

      let x = totalWidth * -this.originX;
      this.sprites.forEach((s) => {
        const width = this.fixWidth || s.width;
        s.x = x + width * s.originX;
        x += width;
      });

      return this;
    },

    _accessor: {
      text: {
        get: function() {
          return this._text;
        },
        set: function(v) {
          this.setText(v);
        },
      },
    },

  });

});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCIwMTBfYXBwbGljYXRpb24vQXBwbGljYXRpb24uanMiLCIwMTBfYXBwbGljYXRpb24vQXNzZXRMaXN0LmpzIiwiMDEwX2FwcGxpY2F0aW9uL0Jhc2VEYXRhLmpzIiwiMDEwX2FwcGxpY2F0aW9uL0Jhc2VTY2VuZS5qcyIsIjAxMF9hcHBsaWNhdGlvbi9EaWFsb2cuanMiLCIwMTBfYXBwbGljYXRpb24vRmlyc3RTY2VuZUZsb3cuanMiLCIwMTBfYXBwbGljYXRpb24vV2ViUlRDLmpzIiwiMDIwX3NjZW5lL0Nvbm5lY3RSZXF1ZXN0RGlhbG9nLmpzIiwiMDIwX3NjZW5lL01haW5TY2VuZS5qcyIsIjAyMF9zY2VuZS9TeW5jUmVtb3RlU2NlbmUuanMiLCIwMjBfc2NlbmUvVGl0bGVTY2VuZS5qcyIsIjAzMF9iYXNlL0Jhc2VDaGFyYWN0ZXIuanMiLCIwNDBfZWxlbWVudC9CYWxsb29uLmpzIiwiMDQwX2VsZW1lbnQvSXRlbS5qcyIsIjA0MF9lbGVtZW50L0l0ZW1Cb3guanMiLCIwNDBfZWxlbWVudC9JdGVtSW5mby5qcyIsIjA0MF9lbGVtZW50L1BsYXllci5qcyIsIjA0MF9lbGVtZW50L1BsYXllckF0dGFjay5qcyIsIjA0MF9lbGVtZW50L1BsYXllcldlYXBvbi5qcyIsIjA0MF9lbGVtZW50L1dvcmxkTWFwLmpzIiwiMDAwX2NvbW1vbi9hY2Nlc3NvcnkvQnV0dG9uLmpzIiwiMDAwX2NvbW1vbi9hY2Nlc3NvcnkvQ2xpcFNwcml0ZS5qcyIsIjAwMF9jb21tb24vYWNjZXNzb3J5L0dhdWdlLmpzIiwiMDAwX2NvbW1vbi9hY2Nlc3NvcnkvR3JheXNjYWxlLmpzIiwiMDAwX2NvbW1vbi9hY2Nlc3NvcnkvTW91c2VDaGFzZXIuanMiLCIwMDBfY29tbW9uL2FjY2Vzc29yeS9NdWx0aVJlY3RhbmdsZUNsaXAuanMiLCIwMDBfY29tbW9uL2FjY2Vzc29yeS9QaWVDbGlwLmpzIiwiMDAwX2NvbW1vbi9hY2Nlc3NvcnkvUmVjdGFuZ2xlQ2xpcC5qcyIsIjAwMF9jb21tb24vYWNjZXNzb3J5L1RvZ2dsZS5qcyIsIjAwMF9jb21tb24vdXRpbC9CdXR0b25pemUuanMiLCIwMDBfY29tbW9uL3V0aWwvVGV4dHVyZVV0aWwuanMiLCIwMDBfY29tbW9uL3V0aWwvVGlsZWRtYXAuanMiLCIwMDBfY29tbW9uL3V0aWwvVGlsZXNldC5qcyIsIjAwMF9jb21tb24vdXRpbC9VdGlsLmpzIiwiMDAwX2NvbW1vbi91dGlsL3htbGxvYWRlci5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9Bc3NldExvYWRlci5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9CYXNlQXBwLmpzIiwiMDAwX2NvbW1vbi9leHRlbnNpb25zL0NhbnZhcy5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9DYW52YXNSZW5kZXJlci5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9DaGVja0Jyb3dzZXIuanMiLCIwMDBfY29tbW9uL2V4dGVuc2lvbnMvRGlzcGxheUVsZW1lbnQuanMiLCIwMDBfY29tbW9uL2V4dGVuc2lvbnMvRGlzcGxheVNjZW5lLmpzIiwiMDAwX2NvbW1vbi9leHRlbnNpb25zL0RvbUF1ZGlvU291bmQuanMiLCIwMDBfY29tbW9uL2V4dGVuc2lvbnMvRWxlbWVudC5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9JbnB1dC5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9MYWJlbC5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9Nb3VzZS5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9PYmplY3QyRC5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9QbGFpbkVsZW1lbnQuanMiLCIwMDBfY29tbW9uL2V4dGVuc2lvbnMvU2hhcGUuanMiLCIwMDBfY29tbW9uL2V4dGVuc2lvbnMvU291bmQuanMiLCIwMDBfY29tbW9uL2V4dGVuc2lvbnMvU291bmRNYW5hZ2VyLmpzIiwiMDAwX2NvbW1vbi9leHRlbnNpb25zL1Nwcml0ZS5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9TdHJpbmcuanMiLCIwMDBfY29tbW9uL2V4dGVuc2lvbnMvVGV4dHVyZS5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9Ud2VlbmVyLmpzIiwiMDAwX2NvbW1vbi9lbGVtZW50cy9zY2VuZUVmZmVjdHMvU2NlbmVFZmZlY3RCYXNlLmpzIiwiMDAwX2NvbW1vbi9lbGVtZW50cy9zY2VuZUVmZmVjdHMvU2NlbmVFZmZlY3RDaXJjbGVGYWRlLmpzIiwiMDAwX2NvbW1vbi9lbGVtZW50cy9zY2VuZUVmZmVjdHMvU2NlbmVFZmZlY3RGYWRlLmpzIiwiMDAwX2NvbW1vbi9lbGVtZW50cy9zY2VuZUVmZmVjdHMvU2NlbmVFZmZlY3ROb25lLmpzIiwiMDAwX2NvbW1vbi9lbGVtZW50cy9zY2VuZUVmZmVjdHMvU2NlbmVFZmZlY3RUaWxlRmFkZS5qcyIsIjAwMF9jb21tb24vZWxlbWVudHMvdWkvSW5wdXRJbnRlcmNlcHQuanMiLCIwMDBfY29tbW9uL2VsZW1lbnRzL3VpL1Nwcml0ZUxhYmVsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JjQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcmJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImJ1bmRsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiAgbWFpbi5qc1xuICovXG5cbnBoaW5hLmdsb2JhbGl6ZSgpO1xuY29uc3QgV0VCUlRDX0FQSV9LRVkgPSBcImI4NzZhODVmLWYxYjQtNDQxMi1iYjEzLWNkYWM1OTg2ZjBjMVwiO1xuXG5jb25zdCBERUJVR19DT0xMSVNJT04gPSBmYWxzZTtcblxuY29uc3QgU0NSRUVOX1dJRFRIID0gMTAyNCAvIDI7XG5jb25zdCBTQ1JFRU5fSEVJR0hUID0gNzY4IC8gMjtcbmNvbnN0IFNDUkVFTl9XSURUSF9IQUxGID0gU0NSRUVOX1dJRFRIICogMC41O1xuY29uc3QgU0NSRUVOX0hFSUdIVF9IQUxGID0gU0NSRUVOX0hFSUdIVCAqIDAuNTtcblxuY29uc3QgU0NSRUVOX09GRlNFVF9YID0gMDtcbmNvbnN0IFNDUkVFTl9PRkZTRVRfWSA9IDA7XG5cbmNvbnN0IE5VTV9MQVlFUlMgPSA5O1xuY29uc3QgTEFZRVJfRk9SRUdST1VORCA9IDg7XG5jb25zdCBMQVlFUl9ERUJVRyA9IDc7XG5jb25zdCBMQVlFUl9DSEVDSyA9IDY7XG5jb25zdCBMQVlFUl9DT0xMSVNJT04gPSA1O1xuY29uc3QgTEFZRVJfRU5FTVkgPSA0O1xuY29uc3QgTEFZRVJfUExBWUVSID0gMztcbmNvbnN0IExBWUVSX09CSkVDVCA9IDI7XG5jb25zdCBMQVlFUl9CQUNLR1JPVU5EID0gMTtcbmNvbnN0IExBWUVSX01BUCA9IDA7XG5cbmxldCBwaGluYV9hcHA7XG5cbndpbmRvdy5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgcGhpbmFfYXBwID0gQXBwbGljYXRpb24oKTtcbiAgcGhpbmFfYXBwLnJlcGxhY2VTY2VuZShGaXJzdFNjZW5lRmxvdyh7fSkpO1xuICBwaGluYV9hcHAucnVuKCk7XG59O1xuXG4vL+OCueOCr+ODreODvOODq+emgeatolxuLy8gZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgZnVuY3Rpb24oZSkge1xuLy8gIGUucHJldmVudERlZmF1bHQoKTtcbi8vIH0sIHsgcGFzc2l2ZTogZmFsc2UgfSk7XG5cbi8vQW5kcm9pZOODluODqeOCpuOCtuODkOODg+OCr+ODnOOCv+ODs+WItuW+oVxuLy8gZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImJhY2tidXR0b25cIiwgZnVuY3Rpb24oZSl7XG4vLyAgIGUucHJldmVudERlZmF1bHQoKTtcbi8vIH0sIGZhbHNlKTsiLCJwaGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZGVmaW5lKFwiQXBwbGljYXRpb25cIiwge1xuICAgIHN1cGVyQ2xhc3M6IFwicGhpbmEuZGlzcGxheS5DYW52YXNBcHBcIixcblxuICAgIHF1YWxpdHk6IDEuMCxcblxuICAgIHN0YXRlOiBcIlwiLFxuICBcbiAgICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuc3VwZXJJbml0KHtcbiAgICAgICAgZnBzOiA2MCxcbiAgICAgICAgd2lkdGg6IFNDUkVFTl9XSURUSCxcbiAgICAgICAgaGVpZ2h0OiBTQ1JFRU5fSEVJR0hULFxuICAgICAgICBmaXQ6IHRydWUsXG4gICAgICB9KTtcbiAgXG4gICAgICAvL+OCt+ODvOODs+OBruW5heOAgemrmOOBleOBruWfuuacrOOCkuioreWumlxuICAgICAgcGhpbmEuZGlzcGxheS5EaXNwbGF5U2NlbmUuZGVmYXVsdHMuJGV4dGVuZCh7XG4gICAgICAgIHdpZHRoOiBTQ1JFRU5fV0lEVEgsXG4gICAgICAgIGhlaWdodDogU0NSRUVOX0hFSUdIVCxcbiAgICAgIH0pO1xuICBcbiAgICAgIHBoaW5hLmlucHV0LklucHV0LnF1YWxpdHkgPSB0aGlzLnF1YWxpdHk7XG4gICAgICBwaGluYS5kaXNwbGF5LkRpc3BsYXlTY2VuZS5xdWFsaXR5ID0gdGhpcy5xdWFsaXR5O1xuXG4gICAgICAvL+OCsuODvOODoOODkeODg+ODieeuoeeQhlxuICAgICAgdGhpcy5nYW1lcGFkTWFuYWdlciA9IHBoaW5hLmlucHV0LkdhbWVwYWRNYW5hZ2VyKCk7XG4gICAgICB0aGlzLmdhbWVwYWQgPSB0aGlzLmdhbWVwYWRNYW5hZ2VyLmdldCgwKTtcbiAgICAgIHRoaXMuY29udHJvbGxlciA9IHt9O1xuXG4gICAgICB0aGlzLnNldHVwRXZlbnRzKCk7XG4gICAgICB0aGlzLnNldHVwU291bmQoKTtcbiAgICAgIHRoaXMuc2V0dXBNb3VzZVdoZWVsKCk7XG5cbiAgICAgIC8v44K344O844Oz44KS6Zui44KM44KL6Zqb44CB44Oc44K/44Oz5ZCM5pmC5oq844GX44OV44Op44Kw44KS6Kej6Zmk44GZ44KLXG4gICAgICB0aGlzLm9uKFwiY2hhbmdlc2NlbmVcIiwgKCkgPT4gQnV0dG9uLmFjdGlvblRhcmdldCA9IG51bGwpO1xuXG4gICAgICAvL+ODkeODg+ODieaDheWgseOCkuabtOaWsFxuICAgICAgdGhpcy5vbignZW50ZXJmcmFtZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmdhbWVwYWRNYW5hZ2VyLnVwZGF0ZSgpO1xuICAgICAgICB0aGlzLnVwZGF0ZUNvbnRyb2xsZXIoKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLndlYlJUQyA9IG51bGw7XG4gICAgICB0aGlzLnNldHVwV2ViUlRDKCk7XG5cbiAgICAgIHRoaXMub24oJ3JlcXVlc3Rfc3RhdGUnLCBlID0+IHtcbiAgICAgICAgbGV0IHN0YXRlID0gXCJcIjtcbiAgICAgICAgY29uc3QgY3VycmVudFNjZW5lID0gdGhpcy5jdXJyZW50U2NlbmU7XG4gICAgICAgIGlmIChjdXJyZW50U2NlbmUgaW5zdGFuY2VvZiBUaXRsZVNjZW5lKSBzdGF0ZSA9IFwidGl0bGVcIjtcbiAgICAgICAgaWYgKGN1cnJlbnRTY2VuZSBpbnN0YW5jZW9mIE1haW5TY2VuZSkgc3RhdGUgPSBcIm1haW5cIjtcbiAgICAgICAgaWYgKGN1cnJlbnRTY2VuZSBpbnN0YW5jZW9mIFN5bmNSZW1vdGVTY2VuZSkgc3RhdGUgPSBcInN5bmNcIjtcbiAgICAgICAgdGhpcy53ZWJSVEMuc2VuZEV2ZW50KCdhbnN3ZXJfc3RhdGUnLCB7IHN0YXRlIH0sIGUuZGF0YUNvbm5lY3Rpb24ucmVtb3RlSWQpO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuc3RhdGUgPSBcIlwiO1xuXG4gICAgICAvL+ODmuODvOOCuOOCkumWieOBmOOBn+WgtOWQiOOBq+OCpOODmeODs+ODiOeZuueBq1xuICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJiZWZvcmV1bmxvYWRcIiwgKCkgPT4ge1xuICAgICAgICB0aGlzLmN1cnJlbnRTY2VuZS5mbGFyZShcImJlZm9yZXVubG9hZFwiKTtcbiAgICAgICAgaWYgKHRoaXMud2ViUlRDKSB7XG4gICAgICAgICAgdGhpcy53ZWJSVEMuZGVzdHJveSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9LFxuICBcbiAgICAvL+ODnuOCpuOCueOBruODm+ODvOODq+OCpOODmeODs+ODiOmWoumAo1xuICAgIHNldHVwTW91c2VXaGVlbDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLndoZWVsRGVsdGFZID0gMDtcbiAgICAgIHRoaXMuZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2V3aGVlbFwiLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdGhpcy53aGVlbERlbHRhWSA9IGUuZGVsdGFZO1xuICAgICAgfS5iaW5kKHRoaXMpLCBmYWxzZSk7XG4gIFxuICAgICAgdGhpcy5vbihcImVudGVyZnJhbWVcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMucG9pbnRlci53aGVlbERlbHRhWSA9IHRoaXMud2hlZWxEZWx0YVk7XG4gICAgICAgIHRoaXMud2hlZWxEZWx0YVkgPSAwO1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8v44Ki44OX44Oq44Kx44O844K344On44Oz5YWo5L2T44Gu44Kk44OZ44Oz44OI44OV44OD44KvXG4gICAgc2V0dXBFdmVudHM6IGZ1bmN0aW9uKCkge30sXG4gIFxuICAgIHNldHVwU291bmQ6IGZ1bmN0aW9uKCkge30sXG5cbiAgICB1cGRhdGVDb250cm9sbGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBiZWZvcmUgPSB0aGlzLmNvbnRyb2xsZXI7XG4gICAgICBiZWZvcmUuYmVmb3JlID0gbnVsbDtcblxuICAgICAgdmFyIGdwID0gdGhpcy5nYW1lcGFkO1xuICAgICAgdmFyIGtiID0gdGhpcy5rZXlib2FyZDtcbiAgICAgIHZhciBhbmdsZTEgPSBncC5nZXRLZXlBbmdsZSgpO1xuICAgICAgdmFyIGFuZ2xlMiA9IGtiLmdldEtleUFuZ2xlKCk7XG4gICAgICB0aGlzLmNvbnRyb2xsZXIgPSB7XG4gICAgICAgICAgYW5nbGU6IGFuZ2xlMSAhPT0gbnVsbD8gYW5nbGUxOiBhbmdsZTIsXG5cbiAgICAgICAgICB1cDogZ3AuZ2V0S2V5KFwidXBcIikgfHwga2IuZ2V0S2V5KFwidXBcIiksXG4gICAgICAgICAgZG93bjogZ3AuZ2V0S2V5KFwiZG93blwiKSB8fCBrYi5nZXRLZXkoXCJkb3duXCIpLFxuICAgICAgICAgIGxlZnQ6IGdwLmdldEtleShcImxlZnRcIikgfHwga2IuZ2V0S2V5KFwibGVmdFwiKSxcbiAgICAgICAgICByaWdodDogZ3AuZ2V0S2V5KFwicmlnaHRcIikgfHwga2IuZ2V0S2V5KFwicmlnaHRcIiksXG5cbiAgICAgICAgICBhdHRhY2s6IGdwLmdldEtleShcIkFcIikgfHwga2IuZ2V0S2V5KFwiWFwiKSxcbiAgICAgICAgICBqdW1wOiAgIGdwLmdldEtleShcIlhcIikgfHwga2IuZ2V0S2V5KFwiWlwiKSxcbiAgICAgICAgICBtZW51OiAgIGdwLmdldEtleShcInN0YXJ0XCIpIHx8IGtiLmdldEtleShcImVzY2FwZVwiKSxcblxuICAgICAgICAgIGE6IGdwLmdldEtleShcIkFcIikgfHwga2IuZ2V0S2V5KFwiWlwiKSxcbiAgICAgICAgICBiOiBncC5nZXRLZXkoXCJCXCIpIHx8IGtiLmdldEtleShcIlhcIiksXG4gICAgICAgICAgeDogZ3AuZ2V0S2V5KFwiWFwiKSB8fCBrYi5nZXRLZXkoXCJDXCIpLFxuICAgICAgICAgIHk6IGdwLmdldEtleShcIllcIikgfHwga2IuZ2V0S2V5KFwiVlwiKSxcblxuICAgICAgICAgIG9rOiBncC5nZXRLZXkoXCJBXCIpIHx8IGtiLmdldEtleShcIlpcIikgfHwga2IuZ2V0S2V5KFwic3BhY2VcIikgfHwga2IuZ2V0S2V5KFwicmV0dXJuXCIpLFxuICAgICAgICAgIGNhbmNlbDogZ3AuZ2V0S2V5KFwiQlwiKSB8fCBrYi5nZXRLZXkoXCJYXCIpIHx8IGtiLmdldEtleShcImVzY2FwZVwiKSxcblxuICAgICAgICAgIHN0YXJ0OiBncC5nZXRLZXkoXCJzdGFydFwiKSB8fCBrYi5nZXRLZXkoXCJyZXR1cm5cIiksXG4gICAgICAgICAgc2VsZWN0OiBncC5nZXRLZXkoXCJzZWxlY3RcIiksXG5cbiAgICAgICAgICBwYXVzZTogZ3AuZ2V0S2V5KFwic3RhcnRcIikgfHwga2IuZ2V0S2V5KFwiZXNjYXBlXCIpLFxuXG4gICAgICAgICAgYW5hbG9nMTogZ3AuZ2V0U3RpY2tEaXJlY3Rpb24oMCksXG4gICAgICAgICAgYW5hbG9nMjogZ3AuZ2V0U3RpY2tEaXJlY3Rpb24oMSksXG5cbiAgICAgICAgICAvL+WJjeODleODrOODvOODoOaDheWgsVxuICAgICAgICAgIGJlZm9yZTogYmVmb3JlLFxuICAgICAgfTtcbiAgICB9LFxuXG4gICAgc2V0dXBXZWJSVEM6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMud2ViUlRDKSByZXR1cm47XG4gICAgICB0aGlzLndlYlJUQyA9IFdlYlJUQyh0aGlzLCBXRUJSVENfQVBJX0tFWSk7XG4gICAgICB0aGlzLnJlbW90ZUNvbm5lY3Rpb25MaXN0ID0gW107XG4gICAgfSxcblxuICAgIHNldENvbm5lY3Rpb246IGZ1bmN0aW9uKGRhdGFDb25uZWN0aW9uKSB7XG4gICAgICBjb25zdCByZXMgPSB0aGlzLnJlbW90ZUNvbm5lY3Rpb25MaXN0LmZpbmQoZSA9PiBlLnJlbW90ZUlkID09IGRhdGFDb25uZWN0aW9uLnJlbW90ZUlkKTtcbiAgICAgIGlmICghcmVzKSB7XG4gICAgICAgIHRoaXMucmVtb3RlQ29ubmVjdGlvbkxpc3QucHVzaChkYXRhQ29ubmVjdGlvbik7XG4gICAgICB9XG4gICAgfSxcbiAgfSk7XG59KTsiLCIvKlxuICogIEFzc2V0TGlzdC5qc1xuICovXG5cbnBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5kZWZpbmUoXCJBc3NldExpc3RcIiwge1xuICAgIF9zdGF0aWM6IHtcbiAgICAgIGxvYWRlZDogW10sXG4gICAgICBpc0xvYWRlZDogZnVuY3Rpb24oYXNzZXRUeXBlKSB7XG4gICAgICAgIHJldHVybiBBc3NldExpc3QubG9hZGVkW2Fzc2V0VHlwZV0/IHRydWU6IGZhbHNlO1xuICAgICAgfSxcbiAgICAgIGdldDogZnVuY3Rpb24oYXNzZXRUeXBlKSB7XG4gICAgICAgIEFzc2V0TGlzdC5sb2FkZWRbYXNzZXRUeXBlXSA9IHRydWU7XG4gICAgICAgIHN3aXRjaCAoYXNzZXRUeXBlKSB7XG4gICAgICAgICAgY2FzZSBcInByZWxvYWRcIjpcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIGltYWdlOiB7XG4gICAgICAgICAgICAgICAgXCJhY3RvcjRcIjogXCJhc3NldHMvdGV4dHVyZXMvYWN0b3I0LnBuZ1wiLFxuICAgICAgICAgICAgICAgIFwic2hhZG93XCI6IFwiYXNzZXRzL3RleHR1cmVzL3NoYWRvdy5wbmdcIixcbiAgICAgICAgICAgICAgICBcIndlYXBvbnNcIjogXCJhc3NldHMvdGV4dHVyZXMvd2VhcG9ucy5wbmdcIixcbiAgICAgICAgICAgICAgICBcIml0ZW1cIjogXCJhc3NldHMvdGV4dHVyZXMvaXRlbS5wbmdcIixcbiAgICAgICAgICAgICAgICBcIml0ZW1ib3hcIjogXCJhc3NldHMvdGV4dHVyZXMvaXRlbWJveC5wbmdcIixcbiAgICAgICAgICAgICAgICBcImJhY2tcIjogXCJhc3NldHMvdGV4dHVyZXMvYmFjay1zMDNiLnBuZ1wiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBzb3VuZDoge1xuICAgICAgICAgICAgICAgIFwic2xhc2hcIjogXCJhc3NldHMvc291bmRzL3Nlbl9rYV9rYXRhbmFfc2FzaW51a3UwMS5tcDNcIixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdG14OiB7XG4gICAgICAgICAgICAgICAgXCJtYXAxXCI6IFwiYXNzZXRzL21hcC9tYWluLnRteFwiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB0c3g6IHtcbiAgICAgICAgICAgICAgICBcInRpbGVfYVwiOiBcImFzc2V0cy9tYXAvdGlsZUEudHN4XCIsXG4gICAgICAgICAgICAgICAgXCJ0aWxlX2RcIjogXCJhc3NldHMvbWFwL3RpbGVELnRzeFwiLFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY2FzZSBcImNvbW1vblwiOlxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgaW1hZ2U6IHtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgXCJpbnZhbGlkIGFzc2V0VHlwZTogXCIgKyBvcHRpb25zLmFzc2V0VHlwZTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICB9LFxuICB9KTtcblxufSk7XG4iLCIvL+OCouOCpOODhuODoO+8qe+8pFxuY29uc3QgSVRFTV9TSE9SVFNXT1JEID0gMDtcbmNvbnN0IElURU1fTE9OR1NXT1JEID0gMTtcbmNvbnN0IElURU1fQVggPSAyO1xuY29uc3QgSVRFTV9TUEVBUiA9IDM7XG5jb25zdCBJVEVNX0JPVyA9IDQ7XG5jb25zdCBJVEVNX1JPRCA9IDU7XG5jb25zdCBJVEVNX0JPT0sgPSA2O1xuY29uc3QgSVRFTV9TSElFTEQgPSA3O1xuY29uc3QgSVRFTV9BUk1PUiA9IDg7XG5jb25zdCBJVEVNX0hBVCA9IDk7XG5jb25zdCBJVEVNX0JPT1RTID0gMTA7XG5jb25zdCBJVEVNX0dST1ZFID0gMTE7XG5jb25zdCBJVEVNX1JJTkcgPSAxMjtcbmNvbnN0IElURU1fU0NST0xMID0gMTM7XG5jb25zdCBJVEVNX0xFVFRFUiA9IDE0O1xuY29uc3QgSVRFTV9DQVJEID0gMTU7XG5jb25zdCBJVEVNX0tFWSA9IDE2O1xuY29uc3QgSVRFTV9DT0lOID0gMTc7XG5jb25zdCBJVEVNX0JBRyA9IDE4O1xuY29uc3QgSVRFTV9PUkIgPSAxOTtcbmNvbnN0IElURU1fU1RPTkUgPSAyMDtcbmNvbnN0IElURU1fSkVXRUwgPSAyMTtcbmNvbnN0IElURU1fSkVXRUxCT1ggPSAyMjtcbmNvbnN0IElURU1fQVBQTEUgPSAyNDtcbmNvbnN0IElURU1fSEFSQiA9IDI1O1xuY29uc3QgSVRFTV9NRUFUID0gMjY7XG5jb25zdCBJVEVNX1BPVElPTiA9IDI3O1xuIiwiLypcbiAqICBNYWluU2NlbmUuanNcbiAqICAyMDE4LzEwLzI2XG4gKi9cblxucGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuXG4gIHBoaW5hLmRlZmluZShcIkJhc2VTY2VuZVwiLCB7XG4gICAgc3VwZXJDbGFzczogJ0Rpc3BsYXlTY2VuZScsXG5cbiAgICAvL+W7g+ajhOOCqOODrOODoeODs+ODiFxuICAgIGRpc3Bvc2VFbGVtZW50czogbnVsbCxcblxuICAgIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSAob3B0aW9ucyB8fCB7fSkuJHNhZmUoe1xuICAgICAgICB3aWR0aDogU0NSRUVOX1dJRFRILFxuICAgICAgICBoZWlnaHQ6IFNDUkVFTl9IRUlHSFQsXG4gICAgICAgIGJhY2tncm91bmRDb2xvcjogJ3RyYW5zcGFyZW50JyxcbiAgICAgIH0pO1xuICAgICAgdGhpcy5zdXBlckluaXQob3B0aW9ucyk7XG5cbiAgICAgIC8v44K344O844Oz6Zui6ISx5pmCY2FudmFz44Oh44Oi44Oq6Kej5pS+XG4gICAgICB0aGlzLmRpc3Bvc2VFbGVtZW50cyA9IFtdO1xuICAgICAgdGhpcy5vbmUoJ2Rlc3Ryb3knLCAoKSA9PiB7XG4gICAgICAgIHRoaXMuZGlzcG9zZUVsZW1lbnRzLmZvckVhY2goZSA9PiB7XG4gICAgICAgICAgaWYgKGUuZGVzdHJveUNhbnZhcykge1xuICAgICAgICAgICAgZS5kZXN0cm95Q2FudmFzKCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChlIGluc3RhbmNlb2YgQ2FudmFzKSB7XG4gICAgICAgICAgICBlLnNldFNpemUoMCwgMCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmFwcCA9IHBoaW5hX2FwcDtcblxuICAgICAgLy/liKXjgrfjg7zjg7Pjgbjjga7np7vooYzmmYLjgavjgq3jg6Pjg7Pjg5DjgrnjgpLnoLTmo4RcbiAgICAgIHRoaXMub25lKCdleGl0JywgKCkgPT4ge1xuICAgICAgICB0aGlzLmRlc3Ryb3koKTtcbiAgICAgICAgdGhpcy5jYW52YXMuZGVzdHJveSgpO1xuICAgICAgICB0aGlzLmZsYXJlKCdkZXN0cm95Jyk7XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgZGVzdHJveTogZnVuY3Rpb24oKSB7fSxcblxuICAgIGZhZGVJbjogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IChvcHRpb25zIHx8IHt9KS4kc2FmZSh7XG4gICAgICAgIGNvbG9yOiBcIndoaXRlXCIsXG4gICAgICAgIG1pbGxpc2Vjb25kOiA1MDAsXG4gICAgICB9KTtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgY29uc3QgbWFzayA9IFJlY3RhbmdsZVNoYXBlKHtcbiAgICAgICAgICB3aWR0aDogU0NSRUVOX1dJRFRILFxuICAgICAgICAgIGhlaWdodDogU0NSRUVOX0hFSUdIVCxcbiAgICAgICAgICBmaWxsOiBvcHRpb25zLmNvbG9yLFxuICAgICAgICAgIHN0cm9rZVdpZHRoOiAwLFxuICAgICAgICB9KS5zZXRQb3NpdGlvbihTQ1JFRU5fV0lEVEggKiAwLjUsIFNDUkVFTl9IRUlHSFQgKiAwLjUpLmFkZENoaWxkVG8odGhpcyk7XG4gICAgICAgIG1hc2sudHdlZW5lci5jbGVhcigpXG4gICAgICAgICAgLmZhZGVPdXQob3B0aW9ucy5taWxsaXNlY29uZClcbiAgICAgICAgICAuY2FsbCgoKSA9PiB7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB0aGlzLmFwcC5vbmUoJ2VudGVyZnJhbWUnLCAoKSA9PiBtYXNrLmRlc3Ryb3lDYW52YXMoKSk7XG4gICAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgZmFkZU91dDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IChvcHRpb25zIHx8IHt9KS4kc2FmZSh7XG4gICAgICAgIGNvbG9yOiBcIndoaXRlXCIsXG4gICAgICAgIG1pbGxpc2Vjb25kOiA1MDAsXG4gICAgICB9KTtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgY29uc3QgbWFzayA9IFJlY3RhbmdsZVNoYXBlKHtcbiAgICAgICAgICB3aWR0aDogU0NSRUVOX1dJRFRILFxuICAgICAgICAgIGhlaWdodDogU0NSRUVOX0hFSUdIVCxcbiAgICAgICAgICBmaWxsOiBvcHRpb25zLmNvbG9yLFxuICAgICAgICAgIHN0cm9rZVdpZHRoOiAwLFxuICAgICAgICB9KS5zZXRQb3NpdGlvbihTQ1JFRU5fV0lEVEggKiAwLjUsIFNDUkVFTl9IRUlHSFQgKiAwLjUpLmFkZENoaWxkVG8odGhpcyk7XG4gICAgICAgIG1hc2suYWxwaGEgPSAwO1xuICAgICAgICBtYXNrLnR3ZWVuZXIuY2xlYXIoKVxuICAgICAgICAgIC5mYWRlSW4ob3B0aW9ucy5taWxsaXNlY29uZClcbiAgICAgICAgICAuY2FsbCgoKSA9PiB7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB0aGlzLmFwcC5vbmUoJ2VudGVyZnJhbWUnLCAoKSA9PiBtYXNrLmRlc3Ryb3lDYW52YXMoKSk7XG4gICAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgLy/jgrfjg7zjg7Ppm6LohLHmmYLjgavnoLTmo4TjgZnjgotTaGFwZeOCkueZu+mMslxuICAgIHJlZ2lzdERpc3Bvc2U6IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICAgIHRoaXMuZGlzcG9zZUVsZW1lbnRzLnB1c2goZWxlbWVudCk7XG4gICAgfSxcbiAgfSk7XG5cbn0pOyIsInBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5kZWZpbmUoXCJEaWFsb2dcIiwge1xuICAgIHN1cGVyQ2xhc3M6IFwiRGlzcGxheUVsZW1lbnRcIixcblxuICAgIF9zdGF0aWM6IHtcbiAgICAgIGRlZmF1bHRPcHRpb25zOiB7XG4gICAgICAgIHg6ICBTQ1JFRU5fV0lEVEhfSEFMRixcbiAgICAgICAgeTogIFNDUkVFTl9IRUlHSFRfSEFMRixcbiAgICAgICAgd2lkdGg6IFNDUkVFTl9XSURUSCAqIDAuNSxcbiAgICAgICAgaGVpZ2h0OiBTQ1JFRU5fV0lEVEggKiAwLjMsXG4gICAgICAgIGlzTW9kYWw6IHRydWUsXG5cbiAgICAgICAgdGV4dDogXCLjgojjgo3jgZfjgYTjgafjgZnjgYvvvJ9cIixcbiAgICAgICAgYnV0dG9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6IFwib2tcIixcbiAgICAgICAgICAgIHRleHQ6IFwiT0tcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6IFwiY2FuY2VsXCIsXG4gICAgICAgICAgICB0ZXh0OiBcIkNBTkNFTFwiLFxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfSxcbiAgICB9LFxuXG4gICAgaW5pdDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgdGhpcy5vcHRpb25zID0gKG9wdGlvbnMgfHwge30pLiRzYWZlKERpYWxvZy5kZWZhdWx0T3B0aW9ucyk7XG4gICAgICB0aGlzLnN1cGVySW5pdCh0aGlzLm9wdGlvbnMpO1xuICAgICAgdGhpcy5zZXRTY2FsZSgwLjApO1xuICAgIH0sXG5cbiAgICBvcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuYmFzZSA9IFJlY3RhbmdsZVNoYXBlKHtcbiAgICAgICAgd2lkdGg6IHRoaXMud2lkdGgsXG4gICAgICAgIGhlaWdodDogdGhpcy5oZWlnaHQsXG4gICAgICAgIGZpbGw6IFwiYmxhY2tcIixcbiAgICAgICAgc3Ryb2tlOiBcIndoaXRlXCIsXG4gICAgICB9KS5hZGRDaGlsZFRvKHRoaXMpO1xuICAgICAgdGhpcy50d2VlbmVyLmNsZWFyKClcbiAgICAgICAgLnRvKHsgc2NhbGVYOiAxLjAsIHNjYWxlWTogMS4wIH0sIDIwMCwgXCJlYXNlSW5PdXRRdWFkXCIpXG4gICAgICAgIC5jYWxsKCgpID0+IHtcbiAgICAgICAgICB0aGlzLnNldHVwKCk7XG4gICAgICAgICAgdGhpcy5zZXR1cEJ1dHRvbigpO1xuICAgICAgICB9KTtcblxuICAgICAgdGhpcy5jdXJzb2wgPSBMYWJlbCh7IHRleHQ6IFwiPlwiLCBmaWxsOiBcIndoaXRlXCIsIGZvbnRTaXplOiAyMCwgYmFzZWxpbmU6IFwibWlkZGxlXCIsIGFsaWduOiBcImNlbnRlclwiIH0pXG4gICAgICAgIC5hZGRDaGlsZFRvKHRoaXMuYmFzZSk7XG4gICAgICB0aGlzLmN1cnNvbC50d2VlbmVyLmNsZWFyKCk7XG5cbiAgICAgIHRoaXMuc2VsZWN0TnVtID0gMDtcbiAgICAgIHRoaXMuYmVmb3JlS2V5ID0ge307XG4gICAgICB0aGlzLmlzQ2xvc2UgPSBmYWxzZTtcblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMudHdlZW5lci5jbGVhcigpXG4gICAgICAgIC50byh7IHNjYWxlWDogMC4wLCBzY2FsZVk6IDAuMCB9LCAyMDAsIFwiZWFzZUluT3V0UXVhZFwiKVxuICAgICAgICAuY2FsbCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5mbGFyZSgnY2xvc2VkJylcbiAgICAgICAgICB0aGlzLmZsYXJlKHRoaXMub3B0aW9ucy5idXR0b25zW3RoaXMuc2VsZWN0TnVtXS50eXBlKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIHNldHVwOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMudGV4dCA9IExhYmVsKHsgdGV4dDogdGhpcy5vcHRpb25zLnRleHQsIGZpbGw6IFwid2hpdGVcIiwgZm9udFNpemU6IDI0LCBiYXNlbGluZTogXCJtaWRkbGVcIiwgYWxpZ246IFwiY2VudGVyXCIgfSlcbiAgICAgICAgLmFkZENoaWxkVG8odGhpcy5iYXNlKTtcbiAgICB9LFxuXG4gICAgc2V0dXBCdXR0b246IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5idXR0b25zID0gW107XG4gICAgICB0aGlzLm9wdGlvbnMuYnV0dG9ucy5mb3JFYWNoKChlLCBpKT0+IHtcbiAgICAgICAgY29uc3QgbGFiZWwgPSBMYWJlbCh7IHRleHQ6IGUudGV4dCwgZmlsbDogXCJ3aGl0ZVwiLCBmb250U2l6ZTogMTYsIGJhc2VsaW5lOiBcIm1pZGRsZVwiLCBhbGlnbjogXCJjZW50ZXJcIiB9KVxuICAgICAgICAgIC5zZXRQb3NpdGlvbihpICogMTAwIC0gdGhpcy5vcHRpb25zLmJ1dHRvbnMubGVuZ3RoICogMjUsIDUwKVxuICAgICAgICAgIC5hZGRDaGlsZFRvKHRoaXMuYmFzZSk7XG4gICAgICAgIGxhYmVsLnR5cGUgPSBlLnR5cGU7XG4gICAgICAgIHRoaXMuYnV0dG9ucy5wdXNoKGxhYmVsKTtcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICB1cGRhdGU6IGZ1bmN0aW9uKGFwcCkge1xuICAgICAgaWYgKHRoaXMuaXNDbG9zZSkgcmV0dXJuO1xuICAgICAgY29uc3QgY3QgPSBhcHAuY29udHJvbGxlcjtcbiAgICAgIGlmIChjdC5yaWdodCAmJiAhdGhpcy5iZWZvcmVLZXkucmlnaHQpIHtcbiAgICAgICAgdGhpcy5zZWxlY3ROdW0rKztcbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0TnVtID09IHRoaXMub3B0aW9ucy5idXR0b25zLmxlbmd0aCkgdGhpcy5zZWxlY3ROdW0tLTtcbiAgICAgIH0gZWxzZSBpZiAoY3QubGVmdCAmJiAhdGhpcy5iZWZvcmVLZXkubGVmdCkge1xuICAgICAgICB0aGlzLnNlbGVjdE51bS0tO1xuICAgICAgICBpZiAodGhpcy5zZWxlY3ROdW0gPCAwKSB0aGlzLnNlbGVjdE51bSA9IDA7XG4gICAgICB9XG4gICAgICB0aGlzLmN1cnNvbC5zZXRQb3NpdGlvbih0aGlzLnNlbGVjdE51bSAqIDEwMCAtIHRoaXMub3B0aW9ucy5idXR0b25zLmxlbmd0aCAqIDI1IC0gNTAsIDUwKVxuXG5cbiAgICAgIGlmIChjdC5vaykge1xuICAgICAgICB0aGlzLmlzQ2xvc2UgPSB0cnVlO1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuYmVmb3JlS2V5ID0gY3Q7XG4gICAgfSxcblxuICB9KTtcblxufSk7XG4iLCIvKlxuICogIEZpcnN0U2NlbmVGbG93LmpzXG4gKi9cblxucGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuXG4gIHBoaW5hLmRlZmluZShcIkZpcnN0U2NlbmVGbG93XCIsIHtcbiAgICBzdXBlckNsYXNzOiBcIk1hbmFnZXJTY2VuZVwiLFxuXG4gICAgaW5pdDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICBzdGFydExhYmVsID0gb3B0aW9ucy5zdGFydExhYmVsIHx8IFwidGl0bGVcIjtcbiAgICAgIHRoaXMuc3VwZXJJbml0KHtcbiAgICAgICAgc3RhcnRMYWJlbDogc3RhcnRMYWJlbCxcbiAgICAgICAgc2NlbmVzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgbGFiZWw6IFwidGl0bGVcIixcbiAgICAgICAgICAgIGNsYXNzTmFtZTogXCJUaXRsZVNjZW5lXCIsXG4gICAgICAgICAgICBuZXh0TGFiZWw6IFwiaG9tZVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgbGFiZWw6IFwic3luY1wiLFxuICAgICAgICAgICAgY2xhc3NOYW1lOiBcIlN5bmNSZW1vdGVTY2VuZVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgbGFiZWw6IFwibWFpblwiLFxuICAgICAgICAgICAgY2xhc3NOYW1lOiBcIk1haW5TY2VuZVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG59KTsiLCJwaGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZGVmaW5lKFwiV2ViUlRDXCIsIHtcbiAgICBzdXBlckNsYXNzOiBcInBoaW5hLnV0aWwuRXZlbnREaXNwYXRjaGVyXCIsXG5cbiAgICBrZXk6IFwiXCIsXG4gICAgaWQ6IFwiXCIsXG4gICAgcGVlcjogbnVsbCxcbiAgICBwZWVyTGlzdDogbnVsbCxcbiAgICBkYXRhQ29ubmVjdGlvbnM6IG51bGwsXG5cbiAgICBpc1JlYWR5OiBmYWxzZSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uKGFwcCwga2V5KSB7XG4gICAgICB0aGlzLnN1cGVySW5pdCgpO1xuXG4gICAgICB0aGlzLmFwcCA9IGFwcDtcblxuICAgICAgdGhpcy5wZWVyTGlzdCA9IFtdO1xuICAgICAgdGhpcy5wZWVyRGF0YSA9IFtdO1xuICAgICAgdGhpcy5kYXRhQ29ubmVjdGlvbnMgPSBbXTtcblxuICAgICAgdGhpcy5wZWVyID0gbmV3IFBlZXIoeyBrZXksIGRlYnVnOiAzIH0pO1xuXG4gICAgICBjb25zdCBwZWVyID0gdGhpcy5wZWVyO1xuICAgICAgcGVlci5vbmNlKCdvcGVuJywgaWQgPT4ge1xuICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgIHRoaXMucmVmcmVzaFBlZXJMaXN0KClcbiAgICAgICAgICAudGhlbigoKSA9PiB0aGlzLmlzUmVhZHkgPSB0cnVlKTtcbiAgICAgICAgdGhpcy5hcHAuY3VycmVudFNjZW5lLmZsYXJlKCd3ZWJydGNfb3BlbicsIHsgaWQgfSk7XG4gICAgICB9KTtcblxuICAgICAgcGVlci5vbignY29ubmVjdGlvbicsIGRhdGFDb25uZWN0aW9uID0+IHtcbiAgICAgICAgdGhpcy5hcHAuY3VycmVudFNjZW5lLmZsYXJlKCd3ZWJydGNfY29ubmVjdGlvbicsIHsgZGF0YUNvbm5lY3Rpb24gfSk7XG4gICAgICAgIHRoaXMuYWRkQ29ubmVjdGlvbihkYXRhQ29ubmVjdGlvbik7XG4gICAgICB9KTtcbiAgICAgIHBlZXIub24oJ2Nsb3NlJywgKCkgPT4gdGhpcy5mbGFyZSgnd2VicnRjX2Nsb3NlJykpO1xuICAgICAgcGVlci5vbignZGlzY29ubmVjdGVkJywgKCkgPT4gdGhpcy5mbGFyZSgnd2VicnRjX2Rpc2Nvbm5lY3RlZCcpKTtcbiAgICAgIHBlZXIub24oJ2Vycm9yJywgZXJyID0+IHtcbiAgICAgICAgLy8gYWxlcnQoZXJyLm1lc3NhZ2UpXG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgY3JlYXRlQ29ubmVjdGlvbjogZnVuY3Rpb24ocGVlcklEKSB7XG4gICAgICBpZiAoIXRoaXMucGVlcikgcmV0dXJuO1xuICAgICAgY29uc3QgZGF0YUNvbm5lY3Rpb24gPSB0aGlzLnBlZXIuY29ubmVjdChwZWVySUQpO1xuICAgICAgaWYgKGRhdGFDb25uZWN0aW9uKSB0aGlzLmFkZENvbm5lY3Rpb24oZGF0YUNvbm5lY3Rpb24pO1xuICAgICAgcmV0dXJuIGRhdGFDb25uZWN0aW9uO1xuICAgIH0sXG5cbiAgICBhZGRDb25uZWN0aW9uKGRhdGFDb25uZWN0aW9uKSB7XG4gICAgICBpZiAoIWRhdGFDb25uZWN0aW9uKSByZXR1cm47XG5cbiAgICAgIGNvbnN0IGlkID0gZGF0YUNvbm5lY3Rpb24ucmVtb3RlSWQ7XG4gICAgICBjb25zdCBkY0lkID0gZGF0YUNvbm5lY3Rpb24uaWQ7XG5cbiAgICAgIGRhdGFDb25uZWN0aW9uLm9uY2UoJ29wZW4nLCAoKSA9PiB7XG4gICAgICAgIHRoaXMuZGF0YUNvbm5lY3Rpb25zLnB1c2goZGF0YUNvbm5lY3Rpb24pO1xuICAgICAgICB0aGlzLmFwcC5jdXJyZW50U2NlbmUuZmxhcmUoJ3dlYnJ0Y19kYXRhY29ubmVjdGlvbl9vcGVuJywgeyBkYXRhQ29ubmVjdGlvbiB9KTtcbiAgICAgICAgY29uc29sZS5sb2coYCoqKioqKiBjb25uZWN0aW9uIG9wZW46ICR7aWR9IGRjSUQ6ICR7ZGNJZH1gKTtcbiAgICAgIH0pO1xuXG4gICAgICBkYXRhQ29ubmVjdGlvbi5vbignZGF0YScsIGRhdGEgPT4ge1xuICAgICAgICB0aGlzLmZsYXJlKCdkYXRhJywgeyBkYXRhQ29ubmVjdGlvbiwgZGF0YSB9KTtcbiAgICAgICAgdGhpcy5hcHAuY3VycmVudFNjZW5lLmZsYXJlKCd3ZWJydGNfZGF0YWNvbm5lY3Rpb25fZGF0YScsIHsgZGF0YUNvbm5lY3Rpb24sIGRhdGEgfSk7XG5cbiAgICAgICAgY29uc3QgcGFyc2VEYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcbiAgICAgICAgaWYgKHBhcnNlRGF0YSAmJiBwYXJzZURhdGEuZXZlbnROYW1lKSB7XG4gICAgICAgICAgY29uc3QgZXZlbnREYXRhID0ge1xuICAgICAgICAgICAgZGF0YTogcGFyc2VEYXRhLmRhdGEsXG4gICAgICAgICAgICBkYXRhQ29ubmVjdGlvbixcbiAgICAgICAgICB9O1xuICAgICAgICAgIHRoaXMuYXBwLmN1cnJlbnRTY2VuZS5mbGFyZShwYXJzZURhdGEuZXZlbnROYW1lLCBldmVudERhdGEpO1xuICAgICAgICAgIHRoaXMuYXBwLmZsYXJlKHBhcnNlRGF0YS5ldmVudE5hbWUsIGV2ZW50RGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gY29uc29sZS5sb2coYGZyb21bJHtpZH1dIGRhdGE6ICR7ZGF0YX1gKTtcbiAgICAgIH0pO1xuXG4gICAgICBkYXRhQ29ubmVjdGlvbi5vbmNlKCdjbG9zZScsICgpID0+IHtcbiAgICAgICAgdGhpcy5mbGFyZSgnY2xvc2UnLCB7IGRhdGFDb25uZWN0aW9uIH0pO1xuICAgICAgICB0aGlzLmFwcC5jdXJyZW50U2NlbmUuZmxhcmUoJ3dlYnJ0Y19kYXRhY29ubmVjdGlvbl9jbG9zZScsIHsgZGF0YUNvbm5lY3Rpb24gfSk7XG4gICAgICAgIGNvbnNvbGUubG9nKGAqKioqKiogY29ubmVjdGlvbiBjbG9zZTogJHtpZH0gZGNJRDogJHtkY0lkfWApO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgZ2V0RGF0YUNvbm5lY3Rpb246IGZ1bmN0aW9uKHBlZXJJRCkge1xuICAgICAgcmV0dXJuIHRoaXMuZGF0YUNvbm5lY3Rpb25zW3BlZXJJRF07XG4gICAgfSxcblxuICAgIHNlbmQ6IGZ1bmN0aW9uKGRhdGEsIHRvUGVlcklEKSB7XG4gICAgICBpZiAodHlwZW9mKHRvUGVlcklEKSA9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIHRoaXMuc2VuZERhdGEodG9QZWVySUQsIGRhdGEpO1xuICAgICAgfSBlbHNlIGlmICh0b1BlZXJJRCBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIHRvUGVlcklELmZvckVhY2goaWQgPT4gdGhpcy5zZW5kRGF0YShpZCwgZGF0YSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy/mjqXntprjgpLnorrnq4vjgZfjgabjgYTjgotwZWVy5YWo44Gm44Gr6YCB5Ye6XG4gICAgICAgIHRoaXMuZGF0YUNvbm5lY3Rpb25zLmZvckVhY2goZGMgPT4ge1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGBzZW5kIHRvICR7ZGMucmVtb3RlSWR9IGRhdGE6ICR7ZGF0YX1gKTtcbiAgICAgICAgICBpZiAoZGMub3BlbikgZGMuc2VuZChkYXRhKVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBzZW5kRXZlbnQ6IGZ1bmN0aW9uKGV2ZW50TmFtZSwgZGF0YSwgdG9QZWVySUQpIHtcbiAgICAgIGNvbnN0IGV2ZW50RGF0YSA9IEpTT04uc3RyaW5naWZ5KHsgZXZlbnROYW1lLCBkYXRhIH0pO1xuICAgICAgdGhpcy5zZW5kKGV2ZW50RGF0YSwgdG9QZWVySUQpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIHNlbmREYXRhOiBmdW5jdGlvbih0b1BlZXJJRCwgZGF0YSkge1xuICAgICAgY29uc3QgZGMgPSB0aGlzLmRhdGFDb25uZWN0aW9ucy5maW5kKGUgPT4gZS5yZW1vdGVJZCA9PSB0b1BlZXJJRCk7XG4gICAgICBpZiAoZGMpIHtcbiAgICAgICAgaWYgKGRjLm9wZW4pIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGRhdGEgPT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgZGMuc2VuZChKU09OLnN0cmluZ2lmeShkYXRhKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRjLnNlbmQoZGF0YSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBEYXRhIGNvbm5lY3Rpb24gbm90IG9wZW46ICR7dG9QZWVySUR9YCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBEYXRhIHNlbmQgZmFpbGVkOiAke3RvUGVlcklEfWApO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGNsb3NlOiBmdW5jdGlvbih0b1BlZXJJRCkge1xuICAgICAgaWYgKHR5cGVvZih0b1BlZXJJRCkgPT0gXCJzdHJpbmdcIikge1xuICAgICAgICBjb25zdCBkYyA9IHRoaXMuZGF0YUNvbm5lY3Rpb25zW3RvUGVlcklEXTtcbiAgICAgICAgaWYgKGRjKSB7XG4gICAgICAgICAgZGMuY2xvc2UodHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodG9QZWVySUQgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICB0b1BlZXJJRC5mb3JFYWNoKGlkID0+IHtcbiAgICAgICAgICBjb25zdCBkYyA9IHRoaXMuZGF0YUNvbm5lY3Rpb25zW2lkXTtcbiAgICAgICAgICBpZiAoZGMgJiYgZGMucmVtb3RlSWQgPT0gaWQpIGRjLmNsb3NlKHRydWUpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8v5o6l57aa44KS56K656uL44GX44Gm44GE44KLcGVlcuWFqOOBpuOCkumWieOBmOOCi1xuICAgICAgICB0aGlzLmRhdGFDb25uZWN0aW9ucy5mb3JFYWNoKGRjID0+IHtcbiAgICAgICAgICBpZiAoZGMub3BlbikgZGMuY2xvc2UodHJ1ZSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGRlc3Ryb3k6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCF0aGlzLnBlZXIpIHJldHVybiB0aGlzO1xuICAgICAgdGhpcy5kYXRhQ29ubmVjdGlvbnMuZm9yRWFjaChkYyA9PiBkYy5jbG9zZSh0cnVlKSk7XG4gICAgICB0aGlzLnBlZXIuZGVzdHJveSgpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIHJlZnJlc2hQZWVyTGlzdDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIHRoaXMucGVlci5saXN0QWxsUGVlcnMocGVlcnMgPT4ge1xuICAgICAgICAgIHRoaXMucGVlckxpc3QgPSBwZWVycztcbiAgICAgICAgICByZXNvbHZlKHBlZXJzKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgZ2V0UGVlckxpc3Q6IGZ1bmN0aW9uKCkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gW107XG4gICAgICB0aGlzLnBlZXJMaXN0LmZvckVhY2goaWQgPT4ge1xuICAgICAgICBpZiAoaWQgIT0gdGhpcy5pZCkgcmVzdWx0LnB1c2goaWQpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgfSk7XG59KTtcbiIsInBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5kZWZpbmUoXCJDb25uZWN0UmVxdWVzdERpYWxvZ1wiLCB7XG4gICAgc3VwZXJDbGFzczogXCJEaWFsb2dcIixcblxuICAgIF9zdGF0aWM6IHtcbiAgICAgIGRlZmF1bHRPcHRpb25zOiB7XG4gICAgICAgIHg6ICBTQ1JFRU5fV0lEVEhfSEFMRixcbiAgICAgICAgeTogIFNDUkVFTl9IRUlHSFRfSEFMRixcbiAgICAgICAgd2lkdGg6IFNDUkVFTl9XSURUSCAqIDAuOCxcbiAgICAgICAgaGVpZ2h0OiBTQ1JFRU5fV0lEVEggKiAwLjMsXG4gICAgICAgIGlzTW9kYWw6IHRydWUsXG4gICAgICAgIHRleHQ6IFwi5a++5oim55u45omL44GM6KaL44Gk44GL44KK44G+44GX44Gf44CCXFxu5o6l57aa44GX44G+44GZ44GL77yfXCIsXG4gICAgICB9LFxuICAgIH0sXG5cbiAgICBpbml0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICB0aGlzLm9wdGlvbnMgPSAob3B0aW9ucyB8fCB7fSkuJHNhZmUoQ29ubmVjdFJlcXVlc3REaWFsb2cuZGVmYXVsdE9wdGlvbnMpO1xuICAgICAgdGhpcy5zdXBlckluaXQodGhpcy5vcHRpb25zKTtcbiAgICB9LFxuICB9KTtcblxufSk7XG4iLCJwaGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZGVmaW5lKCdNYWluU2NlbmUnLCB7XG4gICAgc3VwZXJDbGFzczogJ0Jhc2VTY2VuZScsXG5cbiAgICBpbml0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICB0aGlzLnN1cGVySW5pdCgpO1xuXG4gICAgICB0aGlzLmFwcC5zdGF0ZSA9IFwibWFpblwiO1xuICAgICAgdGhpcy5hbm90aGVyUGxheWVyID0gbnVsbDtcbiAgICAgIHRoaXMucmVtb3RlSWQgPSBvcHRpb25zLnJlbW90ZUlkO1xuICAgICAgdGhpcy5pc0hvc3QgPSBvcHRpb25zLmlzUmVxdWVzdDtcblxuICAgICAgdGhpcy5zZXR1cCgpO1xuXG4gICAgICB0aGlzLm9uKCdwbGF5ZXJkYXRhJywgZSA9PiB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSBlLmRhdGE7XG4gICAgICAgIGlmICghZGF0YSkgcmV0dXJuO1xuICAgICAgICBpZiAoIXRoaXMuYW5vdGhlclBsYXllcikge1xuICAgICAgICAgIHRoaXMuYW5vdGhlclBsYXllciA9IFBsYXllcih0aGlzKVxuICAgICAgICAgICAgLmFkZENoaWxkVG8odGhpcy5sYXllcnNbTEFZRVJfRU5FTVldKVxuICAgICAgICAgICAgLnNldFBvc2l0aW9uKGRhdGEueCwgZGF0YS55KTtcbiAgICAgICAgICB0aGlzLmFub3RoZXJQbGF5ZXIuaXNSZW1vdGVQbGF5ZXIgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYW5vdGhlclBsYXllci5zZXRDb250cm9sRGF0YShkYXRhKTtcbiAgICAgICAgdGhpcy5hbm90aGVyUGxheWVyLnNldFBvc2l0aW9uKGRhdGEueCwgZGF0YS55KTtcbiAgICAgICAgdGhpcy5hbm90aGVyUGxheWVyLnNwcml0ZS5zY2FsZVggPSBkYXRhLnNjYWxlWDtcbiAgICAgICAgdGhpcy5hbm90aGVyUGxheWVyLmhwID0gdGhpcy5hbm90aGVyUGxheWVyLmhwO1xuICAgICAgICB0aGlzLmFub3RoZXJQbGF5ZXIuaHBNYXggPSB0aGlzLmFub3RoZXJQbGF5ZXIuaHBNYXg7XG4gICAgICB9KTtcblxuICAgICAgLy/jg6rjg6Ljg7zjg4jlgbTjgYvjgonjgq/jg63jg7zjgrrpgJrnn6XjgpLlj5fjgZHjgZ9cbiAgICAgIHRoaXMub24oXCJ3ZWJydGNfZGF0YWNvbm5lY3Rpb25fY2xvc2VcIiwgKCkgPT4ge1xuICAgICAgICBpZiAoIXRoaXMuYW5vdGhlclBsYXllcikgcmV0dXJuO1xuICAgICAgICB0aGlzLmFub3RoZXJQbGF5ZXIucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMuYW5vdGhlclBsYXllciA9IG51bGw7XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgc2V0dXA6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5iYWNrID0gU3ByaXRlKFwiYmFja1wiKVxuICAgICAgICAuc2V0T3JpZ2luKDAsIDApXG4gICAgICAgIC5zZXRTY2FsZSgxLjUpXG4gICAgICAgIC5hZGRDaGlsZFRvKHRoaXMpO1xuXG4gICAgICB0aGlzLmJhc2UgPSBEaXNwbGF5RWxlbWVudCgpLnNldFBvc2l0aW9uKC01MCwgLTI1MCkuYWRkQ2hpbGRUbyh0aGlzKTtcblxuICAgICAgLy/jg6zjgqTjg6Tjg7zmupblgplcbiAgICAgIHRoaXMubGF5ZXJzID0gW107XG4gICAgICAoTlVNX0xBWUVSUykudGltZXMoaSA9PiB7XG4gICAgICAgIGNvbnN0IGxheWVyID0gRGlzcGxheUVsZW1lbnQoKS5hZGRDaGlsZFRvKHRoaXMuYmFzZSlcbiAgICAgICAgdGhpcy5sYXllcnMucHVzaChsYXllcik7XG4gICAgICB9KTtcbiAgICAgIC8v44Os44Kk44Ok44O844K344On44O844OI44Kr44OD44OIXG4gICAgICB0aGlzLnBsYXllckxheWVyID0gdGhpcy5sYXllcnNbTEFZRVJfUExBWUVSXTtcbiAgICAgIHRoaXMuZW5lbXlMYXllciA9IHRoaXMubGF5ZXJzW0xBWUVSX0VORU1ZXTtcbiAgICAgIHRoaXMub2JqZWN0TGF5ZXIgPSB0aGlzLmxheWVyc1tMQVlFUl9PQkpFQ1RdO1xuICAgICAgdGhpcy5jb2xsaXNpb25MYXllciA9IHRoaXMubGF5ZXJzW0xBWUVSX0NPTExJU0lPTl07XG4gICAgICB0aGlzLmNoZWNrTGF5ZXIgPSB0aGlzLmxheWVyc1tMQVlFUl9DSEVDS107XG4gICAgICB0aGlzLmRlYnVnTGF5ZXIgPSB0aGlzLmxheWVyc1tMQVlFUl9ERUJVR107XG5cbiAgICAgIC8v44Oe44OD44OX5L2c5oiQXG4gICAgICB0aGlzLm1hcCA9IFdvcmxkTWFwKFwibWFwMVwiKVxuICAgICAgICAuc2V0UG9zaXRpb24oMCwgMClcbiAgICAgICAgLmFkZENoaWxkVG8odGhpcy5sYXllcnNbTEFZRVJfTUFQXSk7XG5cbiAgICAgIC8v5b2T44Gf44KK5Yik5a6aXG4gICAgICB0aGlzLm1hcC5nZXRDb2xsaXNpb25EYXRhKCkuZm9yRWFjaChlID0+IGUuYWRkQ2hpbGRUbyh0aGlzLmNvbGxpc2lvbkxheWVyKSk7XG5cbiAgICAgIC8v44Kq44OW44K444Kn44Kv44OIXG4gICAgICB0aGlzLm1hcC5nZXRPYmplY3REYXRhKCkuZm9yRWFjaChlID0+IHtcbiAgICAgICAgc3dpdGNoIChlLnR5cGUpIHtcbiAgICAgICAgICBjYXNlIFwiaXRlbWJveFwiOlxuICAgICAgICAgICAgSXRlbUJveCh0aGlzLCBlKS5zZXRQb3NpdGlvbihlLngsIGUueSkuYWRkQ2hpbGRUbyh0aGlzLm9iamVjdExheWVyKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy/jg5fjg6zjgqTjg6Tjg7xcbiAgICAgIHRoaXMucGxheWVyID0gUGxheWVyKHRoaXMpLmFkZENoaWxkVG8odGhpcy5sYXllcnNbTEFZRVJfUExBWUVSXSlcbiAgICAgIGlmICh0aGlzLmlzSG9zdCkge1xuICAgICAgICAgIHRoaXMucGxheWVyLnNldFBvc2l0aW9uKDMwMCwgMTAwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnBsYXllci5zZXRQb3NpdGlvbigxNTAsIDEwMCk7XG4gICAgICAgIH1cbiAgICAgIC8v6K2Y5Yil44K144Kk44OzXG4gICAgICB0aGlzLnBsYXllci5zaWduID0gTGFiZWwoeyB0ZXh0OiBcIuKWvFwiLCBmaWxsOiBcIndoaXRlXCIsIGZvbnRTaXplOiA4IH0pXG4gICAgICAgIC5hZGRDaGlsZFRvKHRoaXMucGxheWVyKVxuICAgICAgICAuc2V0UG9zaXRpb24oMCwgLTI1KTtcbiAgICAgIHRoaXMucGxheWVyLnNpZ24udHdlZW5lci5jbGVhcigpXG4gICAgICAgIC50byh7IHk6IC0yMCB9LCAxMDAwKVxuICAgICAgICAuc2V0KHsgeTogLTI1IH0pXG4gICAgICAgIC5zZXRMb29wKHRydWUpO1xuXG4gICAgICAvL+S9k+WKm+OCsuODvOOCuFxuICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgd2lkdGg6IDIwMCxcbiAgICAgICAgaGVpZ2h0OiA1LFxuICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6ICd0cmFuc3BhcmVudCcsXG4gICAgICAgIGZpbGw6ICdyZWQnLFxuICAgICAgICBzdHJva2U6ICd3aGl0ZScsXG4gICAgICAgIHN0cm9rZVdpZHRoOiAyLFxuICAgICAgICBnYXVnZUNvbG9yOiAnbGltZScsXG4gICAgICAgIGNvcm5lclJhZGl1czogMCxcbiAgICAgIH07XG4gICAgICB0aGlzLmxpZmVHYXVnZSA9IHBoaW5hLnVpLkdhdWdlKG9wdGlvbnMuJGV4dGVuZCh7IHZhbHVlOiB0aGlzLnBsYXllci5ocCwgbWF4VmFsdWU6IHRoaXMucGxheWVyLmhwTWF4IH0pKS5zZXRQb3NpdGlvbihTQ1JFRU5fV0lEVEggKiAwLjI1LCAxMCkuYWRkQ2hpbGRUbyh0aGlzKTtcbiAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMucGxheWVyO1xuICAgICAgdGhpcy5saWZlR2F1Z2UudXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMudmFsdWUgPSBwbGF5ZXIuaHA7XG4gICAgICAgIHRoaXMubWF4VmFsdWUgPSBwbGF5ZXIuaHBNYXg7XG4gICAgICB9O1xuICAgICAgaWYodGhpcy5yZW1vdGVJZCkge1xuICAgICAgICB0aGlzLmxpZmVHYXVnZSA9IHBoaW5hLnVpLkdhdWdlKG9wdGlvbnMuJGV4dGVuZCh7IHZhbHVlOiAyMDAsIG1heFZhbHVlOiAyMDAgfSkpLnNldFJvdGF0aW9uKDE4MCkuc2V0UG9zaXRpb24oU0NSRUVOX1dJRFRIICogMC43NSwgMTApLmFkZENoaWxkVG8odGhpcyk7XG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMucGxheWVyO1xuICAgICAgICB0aGlzLmxpZmVHYXVnZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAodGhpcy5hbm90aGVyUGxheWVyKSB7XG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gdGhpcy5hbm90aGVyUGxheWVyLmhwO1xuICAgICAgICAgICAgdGhpcy5tYXhWYWx1ZSA9IHRoaXMuYW5vdGhlclBsYXllci5ocE1heDtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSxcblxuICAgIHVwZGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmJhc2UueCA9IFNDUkVFTl9XSURUSCAqIDAuNSAtIHRoaXMucGxheWVyLng7XG4gICAgICB0aGlzLmJhc2UueSA9IFNDUkVFTl9IRUlHSFQgKiAwLjUgLSB0aGlzLnBsYXllci55O1xuXG4gICAgICBpZiAodGhpcy5yZW1vdGVJZCkge1xuICAgICAgICBjb25zdCBkYXRhID0gdGhpcy5hcHAuY29udHJvbGxlcjtcbiAgICAgICAgZGF0YS54ID0gdGhpcy5wbGF5ZXIueDtcbiAgICAgICAgZGF0YS55ID0gdGhpcy5wbGF5ZXIueTtcbiAgICAgICAgZGF0YS5zY2FsZVggPSB0aGlzLnBsYXllci5zcHJpdGUuc2NhbGVYO1xuICAgICAgICBkYXRhLmhwID0gdGhpcy5wbGF5ZXIuaHA7XG4gICAgICAgIGRhdGEuaHBNYXggPSB0aGlzLnBsYXllci5ocE1heDtcbiAgICAgICAgdGhpcy5hcHAud2ViUlRDLnNlbmRFdmVudChcInBsYXllcmRhdGFcIiwgZGF0YSwgdGhpcy5yZW1vdGVJZCk7XG4gICAgICB9XG4gICAgfSxcblxuICB9KTtcblxufSk7XG4iLCIvKlxuICogIFJlbW90ZVN5bmNTY2VuZS5qc1xuICovXG5cbnBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5kZWZpbmUoJ1N5bmNSZW1vdGVTY2VuZScsIHtcbiAgICBzdXBlckNsYXNzOiAnQmFzZVNjZW5lJyxcblxuICAgIF9zdGF0aWM6IHtcbiAgICAgIGlzQXNzZXRMb2FkZWQ6IGZhbHNlLFxuICAgIH0sXG5cbiAgICBpbml0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICB0aGlzLnN1cGVySW5pdCgpO1xuICAgICAgdGhpcy5zZXR1cCgpO1xuXG4gICAgICB0aGlzLndlYlJUQyA9IHRoaXMuYXBwLndlYlJUQztcblxuICAgICAgY29uc3QgcmVtb3RlSWQgPSBvcHRpb25zLnJlbW90ZUlkO1xuICAgICAgY29uc3QgaXNSZXF1ZXN0ID0gb3B0aW9ucy5pc1JlcXVlc3Q7XG5cbiAgICAgIGlmIChpc1JlcXVlc3QpIHtcbiAgICAgICAgY29uc29sZS5sb2coYEJhdHRsZSByZXF1ZXN0IGZvciAke3JlbW90ZUlkfWApO1xuICAgICAgICB0aGlzLndlYlJUQy5zZW5kRXZlbnQoXCJyZXF1ZXN0X2JhdHRsZVwiLCB7IGlkOiB0aGlzLndlYlJUQy5pZCB9LCByZW1vdGVJZCk7XG4gICAgICAgIHRoaXMuc3RhdGUgPSBcIndhaXRcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBCYXR0bGUgcmVxdWVzdCBmb3IgJHtyZW1vdGVJZH1gKTtcbiAgICAgICAgdGhpcy53ZWJSVEMuc2VuZEV2ZW50KFwicmVtb3RlX3N5bmNfc3RhcnRcIiwgeyBpZDogdGhpcy53ZWJSVEMuaWQgfSwgcmVtb3RlSWQpO1xuICAgICAgICB0aGlzLnN0YXRlID0gXCJzeW5jXCI7XG4gICAgICAgfVxuXG4gICAgICB0aGlzLndlYlJUQy5zZW5kRXZlbnQoXCJhbnN3ZXJfc3RhdGVcIiwgeyBzdGF0ZTogXCJzeW5jXCIgfSk7XG5cbiAgICAgIHRoaXMub24oJ3JlbW90ZV9zeW5jX3N0YXJ0JywgKCkgPT4ge1xuICAgICAgICAvL+eWjumAmueiuuiqjeOCkuihjOOBhlxuICAgICAgICBpZiAoaXNSZXF1ZXN0KSB7XG4gICAgICAgICAgdGhpcy53ZWJSVEMuc2VuZEV2ZW50KFwicmVtb3RlX3N5bmNfc3RhcnRcIiwgeyBpZDogdGhpcy53ZWJSVEMuaWQgfSwgcmVtb3RlSWQpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMud2ViUlRDLnNlbmRFdmVudChcInJlbW90ZV9zeW5jX29rXCIsIHsgaWQ6IHRoaXMud2ViUlRDLmlkIH0sIHJlbW90ZUlkKTtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IFwic3luY1wiO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMub24oJ3JlbW90ZV9zeW5jX29rJywgKCkgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhcInJlbW90ZSBzeW5jIG9rXCIpO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMuZXhpdChcIm1haW5cIiwgeyByZW1vdGVJZCwgaXNSZXF1ZXN0IH0pLCAxMDApO1xuICAgICAgfSk7XG5cbiAgICAgIC8v5o6l57aa44Kt44Oj44Oz44K744OrXG4gICAgICB0aGlzLm9uKCdyZXF1ZXN0X2JhdHRsZV9jYW5jZWwnLCAoKSA9PiB0aGlzLnN0YXRlID0gXCJjYW5jZWxcIik7XG4gICAgfSxcblxuICAgIHNldHVwOiBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnN0IGJhY2sgPSBSZWN0YW5nbGVTaGFwZSh7IHdpZHRoOiBTQ1JFRU5fV0lEVEgsIGhlaWdodDogU0NSRUVOX0hFSUdIVCwgZmlsbDogXCJibGFja1wiIH0pXG4gICAgICAgIC5zZXRQb3NpdGlvbihTQ1JFRU5fV0lEVEhfSEFMRiwgU0NSRUVOX0hFSUdIVF9IQUxGKVxuICAgICAgICAuYWRkQ2hpbGRUbyh0aGlzKTtcbiAgICAgIHRoaXMucmVnaXN0RGlzcG9zZShiYWNrKTtcblxuICAgICAgdGhpcy5sYWJlbCA9IExhYmVsKHsgdGV4dDogXCJcIiwgZmlsbDogXCJ3aGl0ZVwiLCBmb250U2l6ZTogMjQgfSlcbiAgICAgICAgLnNldFBvc2l0aW9uKFNDUkVFTl9XSURUSF9IQUxGLCBTQ1JFRU5fSEVJR0hUX0hBTEYpXG4gICAgICAgIC5hZGRDaGlsZFRvKHRoaXMpO1xuICAgICAgdGhpcy5yZWdpc3REaXNwb3NlKHRoaXMubGFiZWwpO1xuXG4gICAgICB0aGlzLmVuZW15TGFiZWwgPSBMYWJlbCh7IHRleHQ6IFwiXCIsIGZpbGw6IFwid2hpdGVcIiwgZm9udFNpemU6IDI0IH0pXG4gICAgICAgIC5zZXRQb3NpdGlvbihTQ1JFRU5fV0lEVEhfSEFMRiwgU0NSRUVOX0hFSUdIVF9IQUxGICsgMjUpXG4gICAgICAgIC5hZGRDaGlsZFRvKHRoaXMpO1xuICAgICAgdGhpcy5yZWdpc3REaXNwb3NlKHRoaXMuZW5lbXlMYWJlbCk7XG5cbiAgICAgIHRoaXMuaW5kaWNhdGVyID0gTGFiZWwoeyB0ZXh0OiBcIlwiLCBmaWxsOiBcIndoaXRlXCIsIGZvbnRTaXplOiAyNCB9KVxuICAgICAgICAuc2V0UG9zaXRpb24oU0NSRUVOX1dJRFRIX0hBTEYsIFNDUkVFTl9IRUlHSFRfSEFMRiArIDUwKVxuICAgICAgICAuYWRkQ2hpbGRUbyh0aGlzKTtcbiAgICAgIHRoaXMucmVnaXN0RGlzcG9zZSh0aGlzLmluZGljYXRlcik7XG5cbiAgICAgIHRoaXMudGltZSA9IDA7XG4gICAgfSxcblxuICAgIHVwZGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICBzd2l0Y2ggKHRoaXMuc3RhdGUpIHtcbiAgICAgICAgY2FzZSBcIndhaXRcIjpcbiAgICAgICAgICB0aGlzLmxhYmVsLnRleHQgPSBcIuWvvuaIpuebuOaJi+OCkuW+heOBo+OBpuOBhOOBvuOBmVwiO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwic3luY1wiOlxuICAgICAgICAgIHRoaXMubGFiZWwudGV4dCA9IFwi5ZCM5pyf5LitXCI7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJjYW5jZWxcIjpcbiAgICAgICAgICB0aGlzLmxhYmVsLnRleHQgPSBcIuaOpee2muOBjOOCreODo+ODs+OCu+ODq+OBleOCjOOBvuOBl+OBn1wiO1xuICAgICAgICAgIHRoaXMuc3RhdGUgPSBcInJldHVyblwiO1xuICAgICAgICAgIHRoaXMudGltZSA9IDA7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJyZXR1cm5cIjpcbiAgICAgICAgICBpZiAodGhpcy50aW1lID09IDEyMCkgdGhpcy5leGl0KFwidGl0bGVcIik7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuaW5kaWNhdGVyLnRleHQgPSBcIlwiO1xuICAgICAgaWYgKHRoaXMuc3RhdGUgPT0gXCJ3YWl0XCIpIHtcbiAgICAgICAgY29uc3QgYyA9IE1hdGguZmxvb3IoKHRoaXMudGltZSAvIDYwKSAlIDExKTtcbiAgICAgICAgYy50aW1lcygoKSA9PiB0aGlzLmluZGljYXRlci50ZXh0ICs9IFwiLlwiKTtcbiAgICAgIH1cbiAgICAgIHRoaXMudGltZSsrO1xuICAgIH0sXG5cbiAgfSk7XG5cbn0pO1xuIiwiLypcbiAqICBUaXRsZVNjZW5lLmpzXG4gKi9cblxucGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuXG4gIHBoaW5hLmRlZmluZSgnVGl0bGVTY2VuZScsIHtcbiAgICBzdXBlckNsYXNzOiAnQmFzZVNjZW5lJyxcblxuICAgIF9zdGF0aWM6IHtcbiAgICAgIGlzQXNzZXRMb2FkZWQ6IGZhbHNlLFxuICAgIH0sXG5cbiAgICBpbml0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICB0aGlzLnN1cGVySW5pdCgpO1xuXG4gICAgICB0aGlzLnByb2dyZXNzID0gMDtcbiAgICAgIHRoaXMuaXNFeGl0ID0gZmFsc2U7XG4gICAgICB0aGlzLmlzUmVhZHkgPSBmYWxzZTtcbiAgICAgIHRoaXMuaXNEaWFsb2dPcGVuID0gZmFsc2U7XG5cbiAgICAgIC8v44Ot44O844OJ5riI44G/44Gq44KJ44Ki44K744OD44OI44Ot44O844OJ44KS44GX44Gq44GEXG4gICAgICBpZiAoVGl0bGVTY2VuZS5pc0Fzc2V0TG9hZGVkKSB7XG4gICAgICAgIHRoaXMuc2V0dXAoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vcHJlbG9hZCBhc3NldFxuICAgICAgICBjb25zdCBhc3NldHMgPSBBc3NldExpc3QuZ2V0KFwicHJlbG9hZFwiKVxuICAgICAgICB0aGlzLmxvYWRlciA9IHBoaW5hLmFzc2V0LkFzc2V0TG9hZGVyKCk7XG4gICAgICAgIHRoaXMubG9hZGVyLm9uKCdsb2FkJywgKCkgPT4ge1xuICAgICAgICAgIHRoaXMuc2V0dXAoKVxuICAgICAgICAgIFRpdGxlU2NlbmUuaXNBc3NldExvYWRlZCA9IHRydWU7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmxvYWRlci5sb2FkKGFzc2V0cyk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuYXBwLnN0YXRlID0gXCJ0aXRsZVwiO1xuICAgICAgdGhpcy5kY0xpc3QgPSBbXTtcbiAgICAgIHRoaXMud2ViUlRDID0gdGhpcy5hcHAud2ViUlRDO1xuICAgIH0sXG5cbiAgICBzZXR1cDogZnVuY3Rpb24oKSB7XG4gICAgICBjb25zdCBiYWNrID0gUmVjdGFuZ2xlU2hhcGUoeyB3aWR0aDogU0NSRUVOX1dJRFRILCBoZWlnaHQ6IFNDUkVFTl9IRUlHSFQsIGZpbGw6IFwiYmxhY2tcIiB9KVxuICAgICAgICAuc2V0UG9zaXRpb24oU0NSRUVOX1dJRFRIX0hBTEYsIFNDUkVFTl9IRUlHSFRfSEFMRilcbiAgICAgICAgLmFkZENoaWxkVG8odGhpcyk7XG4gICAgICB0aGlzLnJlZ2lzdERpc3Bvc2UoYmFjayk7XG5cbiAgICAgIGNvbnN0IGxhYmVsID0gTGFiZWwoeyB0ZXh0OiBcIlNsYXNoIEJhdHRsZVwiLCBmaWxsOiBcIndoaXRlXCIgfSlcbiAgICAgICAgLnNldFBvc2l0aW9uKFNDUkVFTl9XSURUSF9IQUxGLCBTQ1JFRU5fSEVJR0hUX0hBTEYpXG4gICAgICAgIC5hZGRDaGlsZFRvKHRoaXMpO1xuICAgICAgdGhpcy5yZWdpc3REaXNwb3NlKGxhYmVsKTtcblxuICAgICAgLy/jgqLjgrvjg4Pjg4jlvozlh6bnkIZcbiAgICAgIGNvbnN0IGFzc2V0cyA9IEFzc2V0TGlzdC5nZXQoXCJwcmVsb2FkXCIpO1xuICAgICAgYXNzZXRzLmltYWdlLmZvckluKGtleSA9PiB7XG4gICAgICAgIGlmIChwaGluYS5hc3NldC5Bc3NldE1hbmFnZXIuZ2V0KFwiaW1hZ2VcIiwga2V5ICsgXCJfbWFza1wiKSkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IHRleCA9IHBoaW5hLmFzc2V0LkFzc2V0TWFuYWdlci5nZXQoXCJpbWFnZVwiLCBrZXkpLmNsb25lKCk7XG4gICAgICAgIHRleC5maWx0ZXIoIGZ1bmN0aW9uKHBpeGVsLCBpbmRleCwgeCwgeSwgYml0bWFwKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gYml0bWFwLmRhdGE7XG4gICAgICAgICAgICBkYXRhW2luZGV4ICsgMF0gPSAwO1xuICAgICAgICAgICAgZGF0YVtpbmRleCArIDFdID0gMDtcbiAgICAgICAgICAgIGRhdGFbaW5kZXggKyAyXSA9IDA7XG4gICAgICAgIH0pO1xuICAgICAgICBwaGluYS5hc3NldC5Bc3NldE1hbmFnZXIuc2V0KFwiaW1hZ2VcIiwga2V5ICsgXCJfbWFza1wiLCB0ZXgpO1xuXG4gICAgICB9KTtcblxuICAgICAgLy9JROihqOekuueUqOODrOOCpOODpOODvFxuICAgICAgdGhpcy5tZW51TGF5ZXIgPSBEaXNwbGF5RWxlbWVudCgpLmFkZENoaWxkVG8odGhpcyk7XG4gICAgICAvL+ODgOOCpOOCouODreOCsOeUqOODrOOCpOODpOODvFxuICAgICAgdGhpcy5kaWFsb2dMYXllciA9IERpc3BsYXlFbGVtZW50KCkuYWRkQ2hpbGRUbyh0aGlzKTtcblxuICAgICAgLy9XZWJSVEPjg6Hjg4Pjgrvjg7zjgrjlvoXjgaHlj5fjgZFcbiAgICAgIHNldFRpbWVvdXQodGhpcy5zZXR1cFBlZXJMaXN0LmJpbmQodGhpcyksIDEwKTtcbiAgICAgIHRoaXMub24oJ3dlYnJ0Y19kYXRhY29ubmVjdGlvbl9vcGVuJywgZSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKGDjgqrjg7zjg5fjg7PjgZfjgZ/jgojvvIEgaWQ6ICR7ZS5kYXRhQ29ubmVjdGlvbi5yZW1vdGVJZH1gKTtcbiAgICAgICAgdGhpcy5pc1JlYWR5ID0gZmFsc2U7XG4gICAgICAgIHRoaXMud2ViUlRDLnJlZnJlc2hQZWVyTGlzdCgpXG4gICAgICAgICAgLnRoZW4oKCkgPT4gdGhpcy5zZXR1cFBlZXJMaXN0KCkpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLm9uKCd3ZWJydGNfZGF0YWNvbm5lY3Rpb25fY2xvc2UnLCBlID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coYOOCr+ODreODvOOCuuOBl+OBn+OCiO+8gSBpZDogJHtlLmRhdGFDb25uZWN0aW9uLnJlbW90ZUlkfWApO1xuICAgICAgICB0aGlzLmlzUmVhZHkgPSBmYWxzZTtcbiAgICAgICAgdGhpcy53ZWJSVEMucmVmcmVzaFBlZXJMaXN0KClcbiAgICAgICAgICAudGhlbigoKSA9PiB0aGlzLnNldHVwUGVlckxpc3QoKSk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMub24oJ3JlcXVlc3RfYmF0dGxlJywgZSA9PiB7XG4gICAgICAgIGlmICh0aGlzLmlzRGlhbG9nT3BlbikgcmV0dXJuO1xuICAgICAgICBjb25zdCByZW1vdGVJZCA9IGUuZGF0YS5pZDtcbiAgICAgICAgdGhpcy5pc0RpYWxvZ09wZW4gPSB0cnVlO1xuICAgICAgICBjb25zb2xlLmxvZyhgQmF0dGxlIHJlcXVlc3QgZnJvbSAke3JlbW90ZUlkfWApO1xuICAgICAgICBDb25uZWN0UmVxdWVzdERpYWxvZyh7IGlkOiByZW1vdGVJZCB9KVxuICAgICAgICAgIC5hZGRDaGlsZFRvKHRoaXMuZGlhbG9nTGF5ZXIpXG4gICAgICAgICAgLm9wZW4oKVxuICAgICAgICAgIC5vbignb2snLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmV4aXQoXCJzeW5jXCIsIHsgcmVtb3RlSWQsIGlzUmVxdWVzdDogZmFsc2UgfSk7XG4gICAgICAgICAgICB0aGlzLmlzRXhpdCA9IHRydWU7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAub24oJ2NhbmNlbCcsICgpID0+IHRoaXMud2ViUlRDLnNlbmRFdmVudChcInJlcXVlc3RfYmF0dGxlX2NhbmNlbFwiLCB7IGlkOiB0aGlzLndlYlJUQy5pZCB9LCByZW1vdGVJZCkpXG4gICAgICAgICAgLm9uKCdjbG9zZWQnLCAoKSA9PiB0aGlzLmlzRGlhbG9nT3BlbiA9IGZhbHNlKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5vbignYW5zd2VyX3N0YXRlJywgZSA9PiB7XG4gICAgICAgIHRoaXMubGFiZWxMaXN0LmZvckVhY2gobCA9PiB7XG4gICAgICAgICAgaWYgKGwucGVlci50ZXh0ID09IGUuZGF0YUNvbm5lY3Rpb24ucmVtb3RlSWQpIHtcbiAgICAgICAgICAgIGwuc3RhdGUudGV4dCA9IGUuZGF0YS5zdGF0ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIExhYmVsKHsgdGV4dDogdGhpcy5hcHAud2ViUlRDLmlkLCBmaWxsOiBcIndoaXRlXCIsIGZvbnRTaXplOiAxNiwgYmFzZWxpbmU6IFwibWlkZGxlXCIsIGFsaWduOiBcInJpZ2h0XCIgfSlcbiAgICAgICAgLnNldFBvc2l0aW9uKFNDUkVFTl9XSURUSCAqIDAuOTUsIFNDUkVFTl9IRUlHSFQgKiAwLjk1KVxuICAgICAgICAuYWRkQ2hpbGRUbyh0aGlzKTtcbiAgICAgIGNvbnNvbGUubG9nKFwicGVlciBpZFwiICsgdGhpcy5hcHAud2ViUlRDLmlkKTtcbiAgICB9LFxuXG4gICAgc2V0dXBQZWVyTGlzdDogZnVuY3Rpb24oKSB7XG4gICAgICAvL+S4gOimp+ODqeODmeODq+OCkuS4gOaXpuino+aUvlxuICAgICAgaWYgKHRoaXMubGFiZWxMaXN0KSB7XG4gICAgICAgIHRoaXMubGFiZWxMaXN0LmZvckVhY2goZSA9PiB7XG4gICAgICAgICAgZS5wZWVyLnJlbW92ZSgpO1xuICAgICAgICAgIGUuc3RhdGUucmVtb3ZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgdGhpcy5sYWJlbExpc3QgPSBbXTtcblxuICAgICAgLy/kuIDopqfjgpLkvZzmiJBcbiAgICAgIGxldCB5ID0gNTA7XG4gICAgICB0aGlzLnBlZXJMaXN0ID0gW1wiU2luZ2xlIHBsYXlcIl0uY29uY2F0KHRoaXMuYXBwLndlYlJUQy5nZXRQZWVyTGlzdCgpKTtcbiAgICAgIHRoaXMucGVlckxpc3QuZm9yRWFjaChpZCA9PiB7XG4gICAgICAgIGNvbnN0IHBlZXIgPSBMYWJlbCh7IHRleHQ6IGlkLCBmaWxsOiBcIndoaXRlXCIsIGZvbnRTaXplOiAyMCwgYmFzZWxpbmU6IFwibWlkZGxlXCIsIGFsaWduOiBcImxlZnRcIiB9KVxuICAgICAgICAgIC5zZXRQb3NpdGlvbigzMCwgeSlcbiAgICAgICAgICAuYWRkQ2hpbGRUbyh0aGlzLm1lbnVMYXllcik7XG4gICAgICAgIGNvbnN0IHN0YXRlID0gTGFiZWwoeyB0ZXh0OiBcInVua25vd25cIiwgZmlsbDogXCJ3aGl0ZVwiLCBmb250U2l6ZTogMjAsIGJhc2VsaW5lOiBcIm1pZGRsZVwiLCBhbGlnbjogXCJsZWZ0XCIgfSlcbiAgICAgICAgICAuc2V0UG9zaXRpb24oMzAwLCB5KVxuICAgICAgICAgIC5hZGRDaGlsZFRvKHRoaXMubWVudUxheWVyKTtcbiAgICAgICAgdGhpcy5sYWJlbExpc3QucHVzaCh7IHBlZXIsIHN0YXRlIH0pO1xuXG4gICAgICAgIGlmIChpZCAhPSBcIlNpbmdsZSBwbGF5XCIpIHtcbiAgICAgICAgICBjb25zdCBkYyA9IHRoaXMuZGNMaXN0LmZpbmQoZSA9PiBlLnJlbW90ZUlkID09IGlkKTtcbiAgICAgICAgICBpZiAoIWRjKSB7XG4gICAgICAgICAgICB0aGlzLmRjTGlzdC5wdXNoKHRoaXMuYXBwLndlYlJUQy5jcmVhdGVDb25uZWN0aW9uKGlkKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0YXRlLnNldFZpc2libGUoZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIHkgKz0gMjU7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHRoaXMuY3Vyc29sKSB0aGlzLmN1cnNvbC5yZW1vdmUoKTtcbiAgICAgIHRoaXMuY3Vyc29sID0gTGFiZWwoeyB0ZXh0OiBcIj5cIiwgZmlsbDogXCJ3aGl0ZVwiLCBmb250U2l6ZTogMjAsIGJhc2VsaW5lOiBcIm1pZGRsZVwiLCBhbGlnbjogXCJsZWZ0XCIgfSlcbiAgICAgICAgLnNldFBvc2l0aW9uKDEwLCA1MCAtIDIpXG4gICAgICAgIC5hZGRDaGlsZFRvKHRoaXMpO1xuICAgICAgdGhpcy5jdXJzb2wudHdlZW5lci5jbGVhcigpO1xuXG4gICAgICB0aGlzLnNlbGVjdE51bSA9IDA7XG4gICAgICB0aGlzLmJlZm9yZUtleSA9IHt9O1xuICAgICAgdGhpcy5pc1JlYWR5ID0gdHJ1ZTtcblxuICAgICAgLy/lkIRwZWVy44Gr54++5Zyo44K544OG44O844OI44Gu5ZWP44GE5ZCI44KP44GbXG4gICAgICB0aGlzLndlYlJUQy5zZW5kRXZlbnQoXCJyZXF1ZXN0X3N0YXRlXCIpO1xuICAgIH0sXG5cbiAgICB1cGRhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCFUaXRsZVNjZW5lLmlzQXNzZXRMb2FkZWQgfHwgdGhpcy5pc0V4aXQgfHwgIXRoaXMuaXNSZWFkeSB8fCB0aGlzLmlzRGlhbG9nT3BlbikgcmV0dXJuO1xuXG4gICAgICBjb25zdCBjdCA9IHRoaXMuYXBwLmNvbnRyb2xsZXI7XG4gICAgICBpZiAoY3QuZG93biAmJiAhdGhpcy5iZWZvcmVLZXkuZG93bikge1xuICAgICAgICBpZiAodGhpcy5zZWxlY3ROdW0gPCB0aGlzLnBlZXJMaXN0Lmxlbmd0aCAtIDEpIHRoaXMuc2VsZWN0TnVtKys7XG4gICAgICB9IGVsc2UgaWYgKGN0LnVwICYmICF0aGlzLmJlZm9yZUtleS51cCkge1xuICAgICAgICBpZiAodGhpcy5zZWxlY3ROdW0gPiAwKSB0aGlzLnNlbGVjdE51bS0tO1xuICAgICAgfVxuICAgICAgdGhpcy5jdXJzb2wuc2V0UG9zaXRpb24oMTAsIHRoaXMuc2VsZWN0TnVtICogMjUgKyA0OClcblxuICAgICAgaWYgKGN0Lm9rKSB7XG4gICAgICAgIGlmICh0aGlzLnNlbGVjdE51bSA9PSAwKSB7XG4gICAgICAgICAgdGhpcy5pc0V4aXQgPSB0cnVlO1xuICAgICAgICAgIHRoaXMuZXhpdChcIm1haW5cIik7XG4gICAgICAgICAgdGhpcy5jbG9zZUFsbFBlZXJzKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3Qgc3RhdGUgPSB0aGlzLmxhYmVsTGlzdFt0aGlzLnNlbGVjdE51bV0uc3RhdGUudGV4dDtcbiAgICAgICAgICBpZiAoc3RhdGUgPT0gXCJ0aXRsZVwiKSB7XG4gICAgICAgICAgICBjb25zdCBpZCA9IHRoaXMubGFiZWxMaXN0W3RoaXMuc2VsZWN0TnVtXS5wZWVyLnRleHQ7XG4gICAgICAgICAgICB0aGlzLmlzRXhpdCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLmV4aXQoXCJzeW5jXCIsIHsgcmVtb3RlSWQ6IGlkLCBpc1JlcXVlc3Q6IHRydWUgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMuYmVmb3JlS2V5ID0gY3Q7XG4gICAgfSxcblxuICAgIGNsb3NlQWxsUGVlcnM6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5kY0xpc3QuZm9yRWFjaChkYyA9PiB7XG4gICAgICAgIGlmIChkYy5vcGVuKSBkYy5jbG9zZSgpO1xuICAgICAgfSk7XG4gICAgfSxcbiAgfSk7XG5cbn0pO1xuIiwicGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuICBwaGluYS5kZWZpbmUoXCJCYXNlQ2hhcmFjdGVyXCIsIHtcbiAgc3VwZXJDbGFzczogXCJEaXNwbGF5RWxlbWVudFwiLFxuXG4gICAgLy/jg57jg4Pjg5fjgqrjg5bjgrjjgqfjgq/jg4hJRFxuICAgIGlkOiAtMSxcblxuICAgIC8v5Yqg6YCf5bqmXG4gICAgdng6IDAsXG4gICAgdnk6IDAsXG5cbiAgICAvL+WIneacn+W6p+aomVxuICAgIGZpcnN0WDogMCxcbiAgICBmaXJzdFk6IDAsXG5cbiAgICAvL+mHjeWKm+WKoOmAn+W6plxuICAgIGdyYXZpdHk6IDAuNDUsXG5cbiAgICAvL+aoquenu+WLlea4m+ihsOeOh1xuICAgIGZyaWN0aW9uOiAwLjUsXG5cbiAgICAvL+W6iuenu+WLlea4m+ihsOeOh1xuICAgIGZsb29yRnJpY3Rpb246IDAuNSxcblxuICAgIC8v44K444Oj44Oz44OX5YqbXG4gICAganVtcFBvd2VyOiA2LFxuXG4gICAgLy/lj43nmbrkv4LmlbBcbiAgICByZWJvdW5kOiAwLFxuXG4gICAgLy/luorkuIrjg5Xjg6njgrBcbiAgICBpc09uRmxvb3I6IGZhbHNlLFxuXG4gICAgLy/kuZfjgaPjgabjgYTjgovjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICBmbG9vck9iamVjdDogbnVsbCxcblxuICAgIC8v5q275Lqh44OV44Op44KwXG4gICAgaXNEZWFkOiBmYWxzZSxcblxuICAgIC8v6JC95LiL5q275Lqh44OV44Op44KwXG4gICAgaXNEcm9wOiBmYWxzZSxcblxuICAgIC8v5rCX57W244OV44Op44KwXG4gICAgaXNTdHVuOiBmYWxzZSxcblxuICAgIC8v5pON5L2c5YGc5q2i5pmC6ZaTXG4gICAgc3RvcFRpbWU6IDAsXG5cbiAgICAvL+eEoeaVteODleODqeOCsFxuICAgIGlzTXV0ZWtpOiBmYWxzZSxcblxuICAgIC8v54Sh5pW15pmC6ZaTXG4gICAgbXV0ZWtpVGltZTogMCxcblxuICAgIC8v44Ki44OL44Oh44O844K344On44Oz44OV44Op44KwXG4gICAgaXNBbmltYXRpb246IHRydWUsXG5cbiAgICAvL+ePvuWcqOWun+ihjOS4reOCouOCr+OCt+ODp+ODs1xuICAgIG5vd0FuaW1hdGlvbjogXCJzdGFuZFwiLFxuXG4gICAgLy/liY3jg5Xjg6zjg7zjg6Dlrp/ooYzjgqLjgq/jgrfjg6fjg7NcbiAgICBiZWZvcmVBbmltYXRpb246IFwiXCIsXG5cbiAgICAvL+OCouODi+ODoeODvOOCt+ODp+ODs+mAsuihjOWPr+iDveODleODqeOCsFxuICAgIGlzQWR2YW5jZUFuaW1hdGlvbjogdHJ1ZSxcblxuICAgIC8v44Ki44OL44Oh44O844K344On44Oz5aSJ5pu05qSc55+l44OV44Op44KwXG4gICAgaXNDaGFuZ2VBbmltYXRpb246IGZhbHNlLFxuXG4gICAgLy/jgqLjg4vjg6Hjg7zjgrfjg6fjg7PplpPpmpRcbiAgICBhbmltYXRpb25JbnRlcnZhbDogNixcblxuICAgIC8v5Zyw5b2i54Sh6KaWXG4gICAgaWdub3JlQ29sbGlzaW9uOiBmYWxzZSxcblxuICAgIC8v44K544Kv44Oq44O844Oz5YaF44OV44Op44KwXG4gICAgaXNPblNjcmVlbjogdHJ1ZSxcblxuICAgIC8v5rS75YuV44OV44Op44KwXG4gICAgaXNBY3RpdmU6IHRydWUsXG5cbiAgICAvL+W9seihqOekulxuICAgIGlzU2hhZG93OiBmYWxzZSxcbiAgICBzaGFkb3dZOiAwLFxuXG4gICAgLy/orZjliKXjg5Xjg6njgrBcbiAgICBpc1BsYXllcjogZmFsc2UsXG4gICAgaXNFbmVteTogZmFsc2UsXG4gICAgaXNJdGVtQm94OiBmYWxzZSxcbiAgICBpc0l0ZW06IGZhbHNlLFxuICAgIGlzQmxvY2s6IGZhbHNlLFxuICAgIGlzTWFwQWNjZXNzb3J5OiBmYWxzZSxcblxuICAgIC8v57WM6YGO44OV44Os44O844OgXG4gICAgdGltZTogMCxcblxuICAgIGluaXQ6IGZ1bmN0aW9uKHBhcmVudFNjZW5lLCBvcHRpb25zKSB7XG4gICAgICB0aGlzLnN1cGVySW5pdChvcHRpb25zKTtcbiAgICAgIHRoaXMucGFyZW50U2NlbmUgPSBwYXJlbnRTY2VuZTtcbiAgICAgIHRoaXMuYm91bmRpbmdUeXBlID0gXCJyZWN0XCI7XG4gICAgICB0aGlzLnR3ZWVuZXIuc2V0VXBkYXRlVHlwZSgnZnBzJyk7XG5cbiAgICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICB0aGlzLmluaXRDb2xsaXNpb24ob3B0aW9ucyk7XG4gICAgICB0aGlzLnNldHVwQW5pbWF0aW9uKCk7XG5cbiAgICAgIHRoaXMuaWQgPSBvcHRpb25zLmlkIHx8IC0xO1xuXG4gICAgICB0aGlzLm9uKCdlbnRlcmZyYW1lJywgKCkgPT4gdGhpcy5kZWZhdWx0VXBhZGF0ZSgpKTtcbiAgICB9LFxuXG4gICAgLy/kuIDlm57nm67jga5lbnRlcmZyYW1l44Gn5LiA5bqm44Gg44GR5ZG844Gw44KM44KLXG4gICAgZmlyc3RGcmFtZTogZnVuY3Rpb24oKSB7fSxcblxuICAgIGRlZmF1bHRVcGFkYXRlOiBmdW5jdGlvbigpIHtcbiAgICAgIC8v5rS75YuV44OV44Op44KwXG4gICAgICBpZiAoIXRoaXMuaXNBY3RpdmUpIHJldHVybjtcblxuICAgICAgdGhpcy54ICs9IHRoaXMudng7XG4gICAgICBpZiAodGhpcy5pc09uRmxvb3IpIHtcbiAgICAgICAgdGhpcy52eCAqPSB0aGlzLmZsb29yRnJpY3Rpb247XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnZ4ICo9IHRoaXMuZnJpY3Rpb247XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmlzQ2F0Y2hMYWRkZXIpIHtcbiAgICAgICAgdGhpcy55ICs9IHRoaXMudnk7XG4gICAgICAgIHRoaXMudnkgPSAwO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy55ICs9IHRoaXMudnk7XG4gICAgICAgIHRoaXMudnkgKz0gdGhpcy5ncmF2aXR5O1xuICAgICAgICAvL+iQveS4i+mAn+W6puS4iumZkFxuICAgICAgICBpZiAodGhpcy52eSA+IDIwKSB0aGlzLnZ5ID0gMjA7XG4gICAgICB9XG4gICAgICBpZiAoTWF0aC5hYnModGhpcy52eCkgPCAwLjAxKSB0aGlzLnZ4ID0gMDtcbiAgICAgIGlmIChNYXRoLmFicyh0aGlzLnZ5KSA8IDAuMDEpIHRoaXMudnkgPSAwO1xuXG4gICAgICB0aGlzLnJlc2V0Q29sbGlzaW9uUG9zaXRpb24oKTtcbiAgICAgIHRoaXMuY2hlY2tNYXBDb2xsaXNpb24oKTtcblxuICAgICAgLy/jgqLjg4vjg6Hjg7zjgrfjg6fjg7NcbiAgICAgIGlmICh0aGlzLnNwcml0ZSAmJiB0aGlzLmlzQW5pbWF0aW9uICYmIHRoaXMuaXNBZHZhbmNlQW5pbWF0aW9uICYmIHRoaXMudGltZSAlIHRoaXMuYW5pbWF0aW9uSW50ZXJ2YWwgPT0gMCkge1xuICAgICAgICB0aGlzLmluZGV4ID0gKHRoaXMuaW5kZXggKyAxKSAlIHRoaXMuZnJhbWVbdGhpcy5ub3dBbmltYXRpb25dLmxlbmd0aDtcbiAgICAgICAgLy/mrKHjg5Xjg6zjg7zjg6Dnlarlj7fjgYznibnmrormjIflrprjga7loLTlkIhcbiAgICAgICAgdmFyIG5leHQgPSB0aGlzLmZyYW1lW3RoaXMubm93QW5pbWF0aW9uXVt0aGlzLmluZGV4XTtcbiAgICAgICAgaWYgKG5leHQgPT0gXCJzdG9wXCIpIHtcbiAgICAgICAgICAvL+WBnOatolxuICAgICAgICAgIHRoaXMuaW5kZXgtLTtcbiAgICAgICAgfSBlbHNlIGlmIChuZXh0ID09IFwicmVtb3ZlXCIpIHtcbiAgICAgICAgICAvL+ODquODoOODvOODllxuICAgICAgICAgIHRoaXMucmVtb3ZlKCk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG5leHQgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAvL+aMh+WumuOCouODi+ODoeODvOOCt+ODp+ODs+OBuOWkieabtFxuICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKG5leHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuc3ByaXRlLmZyYW1lSW5kZXggPSBuZXh0O1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMudGltZSsrO1xuICAgICAgdGhpcy5iZWZvcmVBbmltYXRpb24gPSB0aGlzLm5vd0FuaW1hdGlvbjtcbiAgICB9LFxuXG4gICAgc2V0dXBBbmltYXRpb246IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5zcGNpYWxBbmltYXRpb24gPSBmYWxzZTtcbiAgICAgIHRoaXMuZnJhbWUgPSBbXTtcbiAgICAgIHRoaXMuZnJhbWVbXCJzdGFuZFwiXSA9IFsxMywgMTRdO1xuICAgICAgdGhpcy5mcmFtZVtcImp1bXBcIl0gPSBbMCwgXCJzdG9wXCJdO1xuICAgICAgdGhpcy5mcmFtZVtcIndhbGtcIl0gPSBbMF07XG4gICAgICB0aGlzLmZyYW1lW1widXBcIl0gPSAgIFswXTtcbiAgICAgIHRoaXMuZnJhbWVbXCJkb3duXCJdID0gWzBdO1xuICAgICAgdGhpcy5mcmFtZVtcImF0dGFja1wiXSA9IFswLCBcInN0b3BcIl07XG4gICAgICB0aGlzLmluZGV4ID0gMDtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBzZXRBbmltYXRpb246IGZ1bmN0aW9uKGFuaW1OYW1lKSB7XG4gICAgICBpZiAoIXRoaXMuZnJhbWVbYW5pbU5hbWVdKSByZXR1cm47XG4gICAgICBpZiAoYW5pbU5hbWUgPT0gdGhpcy5ub3dBbmltYXRpb24pIHJldHVybjtcbiAgICAgIHRoaXMubm93QW5pbWF0aW9uID0gYW5pbU5hbWU7XG4gICAgICB0aGlzLmluZGV4ID0gLTE7XG4gICAgICB0aGlzLmlzQ2hhbmdlQW5pbWF0aW9uID0gdHJ1ZTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvL+W9k+OBn+OCiuWIpOWumuaDheWgseWIneacn+WMllxuICAgIGluaXRDb2xsaXNpb246IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgIC8v5b2T44KK5Yik5a6a55So77yIMDrkuIogMTrlj7MgMjrkuIsgMzrlt6bvvIlcbiAgICAgIGNvbnN0IHcgPSBNYXRoLmZsb29yKHRoaXMud2lkdGggLyA0KTtcbiAgICAgIGNvbnN0IGggPSBNYXRoLmZsb29yKHRoaXMuaGVpZ2h0IC8gNCk7XG4gICAgICB0aGlzLl9jb2xsaXNpb24gPSBbXTtcbiAgICAgIHRoaXMuX2NvbGxpc2lvblswXSA9IERpc3BsYXlFbGVtZW50KHsgd2lkdGg6IHcsIGhlaWdodDogMiB9KTtcbiAgICAgIHRoaXMuX2NvbGxpc2lvblsxXSA9IERpc3BsYXlFbGVtZW50KHsgd2lkdGg6IDIsIGhlaWdodDogaCB9KTtcbiAgICAgIHRoaXMuX2NvbGxpc2lvblsyXSA9IERpc3BsYXlFbGVtZW50KHsgd2lkdGg6IHcsIGhlaWdodDogMiB9KTtcbiAgICAgIHRoaXMuX2NvbGxpc2lvblszXSA9IERpc3BsYXlFbGVtZW50KHsgd2lkdGg6IDIsIGhlaWdodDogaCB9KTtcbiAgICAgIHRoaXMuY29sbGlzaW9uUmVzdWx0ID0gbnVsbDtcblxuICAgICAgLy/lvZPjgZ/jgorliKTlrprjg4Hjgqfjg4Pjgq/kvY3nva7jgqrjg5Xjgrvjg4Pjg4hcbiAgICAgIHRoaXMub2Zmc2V0Q29sbGlzaW9uWCA9IG9wdGlvbnMub2Zmc2V0Q29sbGlzaW9uWCB8fCAwO1xuICAgICAgdGhpcy5vZmZzZXRDb2xsaXNpb25ZID0gb3B0aW9ucy5vZmZzZXRDb2xsaXNpb25ZIHx8IDA7XG5cbiAgICAgIC8v5b2T44Gf44KK5Yik5a6a5oOF5aCx5YaN6Kit5a6aXG4gICAgICB0aGlzLnNldHVwQ29sbGlzaW9uKCk7XG5cbiAgICAgIHRoaXMuX2NvbGxpc2lvblswXS5hZGRDaGlsZFRvKHRoaXMucGFyZW50U2NlbmUuY2hlY2tMYXllcik7XG4gICAgICB0aGlzLl9jb2xsaXNpb25bMV0uYWRkQ2hpbGRUbyh0aGlzLnBhcmVudFNjZW5lLmNoZWNrTGF5ZXIpO1xuICAgICAgdGhpcy5fY29sbGlzaW9uWzJdLmFkZENoaWxkVG8odGhpcy5wYXJlbnRTY2VuZS5jaGVja0xheWVyKTtcbiAgICAgIHRoaXMuX2NvbGxpc2lvblszXS5hZGRDaGlsZFRvKHRoaXMucGFyZW50U2NlbmUuY2hlY2tMYXllcik7XG5cbiAgICAgIC8v5b2T44Gf44KK5Yik5a6a44OH44OQ44OD44Kw55SoXG4gICAgICBpZiAoREVCVUdfQ09MTElTSU9OKSB7XG4gICAgICAgIHRoaXMub25lKCdlbnRlcmZyYW1lJywgZSA9PiB7XG4gICAgICAgICAgdGhpcy5fY29sbGlzaW9uWzBdLmFscGhhID0gMC4zO1xuICAgICAgICAgIHRoaXMuX2NvbGxpc2lvblsxXS5hbHBoYSA9IDAuMztcbiAgICAgICAgICB0aGlzLl9jb2xsaXNpb25bMl0uYWxwaGEgPSAwLjM7XG4gICAgICAgICAgdGhpcy5fY29sbGlzaW9uWzNdLmFscGhhID0gMC4zO1xuICAgICAgICAgIC8v44OA44Oh44O844K45b2T44Gf44KK5Yik5a6a6KGo56S6XG4gICAgICAgICAgdmFyIGMgPSBSZWN0YW5nbGVTaGFwZSh7IHdpZHRoOiB0aGlzLndpZHRoLCBoZWlnaHQ6IHRoaXMuaGVpZ2h0IH0pLmFkZENoaWxkVG8odGhpcyk7XG4gICAgICAgICAgYy5hbHBoYSA9IDAuMztcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMub25lKCdyZW1vdmVkJywgZSA9PiB7XG4gICAgICAgICAgdGhpcy5fY29sbGlzaW9uWzBdLnJlbW92ZSgpO1xuICAgICAgICAgIHRoaXMuX2NvbGxpc2lvblsxXS5yZW1vdmUoKTtcbiAgICAgICAgICB0aGlzLl9jb2xsaXNpb25bMl0ucmVtb3ZlKCk7XG4gICAgICAgICAgdGhpcy5fY29sbGlzaW9uWzNdLnJlbW92ZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2NvbGxpc2lvblswXS5hbHBoYSA9IDAuMDtcbiAgICAgICAgdGhpcy5fY29sbGlzaW9uWzFdLmFscGhhID0gMC4wO1xuICAgICAgICB0aGlzLl9jb2xsaXNpb25bMl0uYWxwaGEgPSAwLjA7XG4gICAgICAgIHRoaXMuX2NvbGxpc2lvblszXS5hbHBoYSA9IDAuMDtcbiAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLy/lnLDlvaLlvZPjgZ/jgorliKTlrppcbiAgICBjaGVja01hcENvbGxpc2lvbjogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5pZ25vcmVDb2xsaXNpb24pIHJldHVybiB0aGlzO1xuXG4gICAgICB0aGlzLl9jb2xsaXNpb25bMF0uaGl0ID0gbnVsbDtcbiAgICAgIHRoaXMuX2NvbGxpc2lvblsxXS5oaXQgPSBudWxsO1xuICAgICAgdGhpcy5fY29sbGlzaW9uWzJdLmhpdCA9IG51bGw7XG4gICAgICB0aGlzLl9jb2xsaXNpb25bM10uaGl0ID0gbnVsbDtcblxuICAgICAgdGhpcy5pc09uTGFkZGVyID0gZmFsc2U7XG4gICAgICB0aGlzLmlzT25TdGFpcnMgPSBmYWxzZTtcblxuICAgICAgaWYgKHRoaXMuaXNPblNjcmVlbiAmJiB0aGlzLnNoYWRvd1Nwcml0ZSkge1xuICAgICAgICB0aGlzLnNoYWRvd1kgPSA5OTk5OTtcbiAgICAgICAgdmFyIHAxID0gcGhpbmEuZ2VvbS5WZWN0b3IyKHRoaXMueCwgdGhpcy55KTtcbiAgICAgICAgdmFyIHAyID0gcGhpbmEuZ2VvbS5WZWN0b3IyKHRoaXMueCwgdGhpcy55ICsgMTI4KTtcbiAgICAgICAgdGhpcy5zaGFkb3dTcHJpdGUudmlzaWJsZSA9IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvL+WcsOW9ouaOpeinpuWIpOWumlxuICAgICAgdGhpcy5wYXJlbnRTY2VuZS5jb2xsaXNpb25MYXllci5jaGlsZHJlbi5mb3JFYWNoKGUgPT4ge1xuICAgICAgICBpZiAodGhpcy5pc0Ryb3ApIHJldHVybjtcbiAgICAgICAgaWYgKGUuaWdub3JlIHx8IGUgPT0gdGhpcy50aHJvdWdoRmxvb3IpIHJldHVybjtcbiAgICAgICAgaWYgKGUudHlwZSA9PSBcImxhZGRlclwiIHx8IGUudHlwZSA9PSBcInN0YWlyc1wiKSByZXR1cm47XG5cbiAgICAgICAgLy/kuIrlgbRcbiAgICAgICAgaWYgKHRoaXMudnkgPCAwICAmJiBlLmhpdFRlc3RFbGVtZW50KHRoaXMuX2NvbGxpc2lvblswXSkpIHRoaXMuX2NvbGxpc2lvblswXS5oaXQgPSBlO1xuICAgICAgICAvL+S4i+WBtFxuICAgICAgICBpZiAodGhpcy52eSA+PSAwICYmIGUuaGl0VGVzdEVsZW1lbnQodGhpcy5fY29sbGlzaW9uWzJdKSkgdGhpcy5fY29sbGlzaW9uWzJdLmhpdCA9IGU7XG4gICAgICAgIC8v5Y+z5YG0XG4gICAgICAgIGlmICh0aGlzLnZ4ID4gMCAgJiYgZS5oaXRUZXN0RWxlbWVudCh0aGlzLl9jb2xsaXNpb25bMV0pKSB0aGlzLl9jb2xsaXNpb25bMV0uaGl0ID0gZTtcbiAgICAgICAgLy/lt6blgbRcbiAgICAgICAgaWYgKHRoaXMudnggPCAwICAmJiBlLmhpdFRlc3RFbGVtZW50KHRoaXMuX2NvbGxpc2lvblszXSkpIHRoaXMuX2NvbGxpc2lvblszXS5oaXQgPSBlO1xuXG4gICAgICAgIC8v5b2x44KS6JC944Go44GZXG4gICAgICAgIGlmICh0aGlzLmlzT25TY3JlZW4gJiYgdGhpcy5zaGFkb3dTcHJpdGUpIHtcbiAgICAgICAgICAgIC8v44Kt44Oj44Op44Kv44K/44O844Gu5LiL5pa55ZCR44Gr44Os44Kk44KS6aOb44Gw44GX44Gm55u05LiL44Gu5Zyw6Z2i5bqn5qiZ44KS5Y+W44KLXG4gICAgICAgICAgICB2YXIgeCA9IGUueCAtIGUud2lkdGggLyAyO1xuICAgICAgICAgICAgdmFyIHkgPSBlLnkgLSBlLmhlaWdodCAvIDI7XG4gICAgICAgICAgICB2YXIgcDMgPSBWZWN0b3IyKHgsIHkpO1xuICAgICAgICAgICAgdmFyIHA0ID0gVmVjdG9yMih4ICsgZS53aWR0aCwgeSk7XG4gICAgICAgICAgICBpZiAoeSA8IHRoaXMuc2hhZG93WSAmJiBwaGluYS5nZW9tLkNvbGxpc2lvbi50ZXN0TGluZUxpbmUocDEsIHAyLCBwMywgcDQpKSB7XG4gICAgICAgICAgICAgIHRoaXMuc2hhZG93U3ByaXRlLnNldFBvc2l0aW9uKHRoaXMueCwgeSk7XG4gICAgICAgICAgICAgIHRoaXMuc2hhZG93U3ByaXRlLnZpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgICB0aGlzLnNoYWRvd1kgPSB5O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgaWYgKHRoaXMuc2hhZG93U3ByaXRlICYmIHRoaXMuaXNDYXRjaExhZGRlcikgdGhpcy5zaGFkb3dTcHJpdGUudmlzaWJsZSA9IGZhbHNlO1xuXG4gICAgICAvL+W9k+OBn+OCiuWIpOWumue1kOaenOWPjeaYoFxuICAgICAgdGhpcy5jb2xsaXNpb25Qcm9jZXNzKCk7XG5cbiAgICAgIC8v44Gv44GX44GU44Gu44G/5Yik5a6aXG4gICAgICB0aGlzLnBhcmVudFNjZW5lLmNvbGxpc2lvbkxheWVyLmNoaWxkcmVuLmZvckVhY2goZSA9PiB7XG4gICAgICAgIC8v5qKv5a2Q5Yik5a6aXG4gICAgICAgIGlmIChlLnR5cGUgPT0gXCJsYWRkZXJcIiB8fCBlLnR5cGUgPT0gXCJzdGFpcnNcIikge1xuICAgICAgICAgIGlmICh0aGlzLmxhZGRlckNvbGxpc2lvbiAmJiBlLmhpdFRlc3RFbGVtZW50KHRoaXMubGFkZGVyQ29sbGlzaW9uKSkge1xuICAgICAgICAgICAgdGhpcy5pc09uTGFkZGVyID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuaXNPblN0YWlycyA9IChlLnR5cGUgPT0gXCJzdGFpcnNcIik7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLy/lnLDlvaLlvZPjgZ/jgorliKTlrprvvIjnibnlrprlnLDngrnjg4Hjgqfjg4Pjgq/jga7jgb/vvInooZ3nqoHjgZfjgZ/jgoLjga7jgpLphY3liJfjgafov5TjgZlcbiAgICBjaGVja01hcENvbGxpc2lvbjI6IGZ1bmN0aW9uKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgIHggPSB4IHx8IHRoaXMueDtcbiAgICAgIHkgPSB5IHx8IHRoaXMueTtcbiAgICAgIHdpZHRoID0gd2lkdGggfHwgMTtcbiAgICAgIGhlaWdodCA9IGhlaWdodCB8fCAxO1xuICAgICAgY29uc3QgYyA9IERpc3BsYXlFbGVtZW50KHsgd2lkdGgsIGhlaWdodCB9KS5zZXRQb3NpdGlvbih4LCB5KS5hZGRDaGlsZFRvKHRoaXMucGFyZW50U2NlbmUuY2hlY2tMYXllcik7XG4gICAgICBsZXQgcmV0ID0gbnVsbDtcbiAgICAgIHRoaXMucGFyZW50U2NlbmUuY29sbGlzaW9uTGF5ZXIuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihlKSB7XG4gICAgICAgIGlmIChlLnR5cGUgPT0gXCJsYWRkZXJcIiB8fCBlLnR5cGUgPT0gXCJzdGFpcnNcIikgcmV0dXJuO1xuICAgICAgICBpZiAoZS5oaXRUZXN0RWxlbWVudChjKSkge1xuICAgICAgICAgIGlmIChyZXQgPT0gbnVsbCkgcmV0ID0gW107XG4gICAgICAgICAgcmV0LnB1c2goZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgYy5yZW1vdmUoKTtcbiAgICAgIHJldHVybiByZXQ7XG4gICAgfSxcblxuICAgIC8v5b2T44Gf44KK5Yik5a6a57WQ5p6c5Y+N5pig5Yem55CGXG4gICAgY29sbGlzaW9uUHJvY2VzczogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgdyA9IE1hdGguZmxvb3IodGhpcy53aWR0aCAvIDIpICsgNjtcbiAgICAgIHZhciBoID0gTWF0aC5mbG9vcih0aGlzLmhlaWdodCAvIDIpICsgNjtcbiAgICAgIHRoaXMuaXNPbkZsb29yID0gZmFsc2U7XG5cbiAgICAgIC8v5LiK5YG05o6l6KemXG4gICAgICBpZiAodGhpcy5fY29sbGlzaW9uWzBdLmhpdCAmJiAhdGhpcy5pc0NhdGNoTGFkZGVyKSB7XG4gICAgICAgIHZhciByZXQgPSB0aGlzLl9jb2xsaXNpb25bMF0uaGl0O1xuICAgICAgICB0aGlzLnkgPSByZXQueSArIHJldC5oZWlnaHQgKiAoMSAtIHJldC5vcmlnaW5ZKSArIGg7XG4gICAgICAgIHRoaXMudnkgPSAwO1xuICAgICAgICB0aGlzLnJlc2V0Q29sbGlzaW9uUG9zaXRpb24oKTtcbiAgICAgICAgaWYgKHJldC5jb2xsaXNpb25TY3JpcHQpIHtcbiAgICAgICAgICByZXQuY29sbGlzaW9uU2NyaXB0KHRoaXMsIDApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvL+S4i+WBtOaOpeinplxuICAgICAgaWYgKHRoaXMuX2NvbGxpc2lvblsyXS5oaXQgJiYgIXRoaXMuaXNDYXRjaExhZGRlcikge1xuICAgICAgICB2YXIgcmV0ID0gdGhpcy5fY29sbGlzaW9uWzJdLmhpdDtcbiAgICAgICAgdGhpcy55ID0gcmV0LnkgLSByZXQuaGVpZ2h0ICogcmV0Lm9yaWdpblkgLSBoO1xuICAgICAgICB0aGlzLnggKz0gcmV0LnZ4IHx8IDA7XG4gICAgICAgIGlmICghdGhpcy5pc1BsYXllciAmJiByZXQudnkgPiAwKSB0aGlzLnkgKz0gcmV0LnZ5IHx8IDA7XG5cbiAgICAgICAgdGhpcy5pc0p1bXAgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5pc09uRmxvb3IgPSB0cnVlO1xuICAgICAgICB0aGlzLmZsb29yRnJpY3Rpb24gPSByZXQuZnJpY3Rpb24gPT0gdW5kZWZpbmVkPyAwLjU6IHJldC5mcmljdGlvbjtcblxuICAgICAgICB0aGlzLnRocm91Z2hGbG9vciA9IG51bGw7XG4gICAgICAgIGlmICh0aGlzLnJlYm91bmQgPiAwKSB7XG4gICAgICAgICAgdGhpcy5pc0p1bXAgPSB0cnVlO1xuICAgICAgICAgIHRoaXMudnkgPSAtdGhpcy52eSAqIHRoaXMucmVib3VuZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnZ5ID0gMDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlc2V0Q29sbGlzaW9uUG9zaXRpb24oKTtcbiAgICAgICAgaWYgKHJldC5jb2xsaXNpb25TY3JpcHQpIHtcbiAgICAgICAgICByZXQuY29sbGlzaW9uU2NyaXB0KHRoaXMsIDIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvL+WPs+WBtOaOpeinplxuICAgICAgaWYgKHRoaXMuX2NvbGxpc2lvblsxXS5oaXQgJiYgIXRoaXMuaXNDYXRjaExhZGRlcikge1xuICAgICAgICB2YXIgcmV0ID0gdGhpcy5fY29sbGlzaW9uWzFdLmhpdDtcbiAgICAgICAgdGhpcy54ID0gcmV0LnggLSByZXQud2lkdGggKiByZXQub3JpZ2luWCAtIHc7XG4gICAgICAgIHRoaXMudnggPSAwO1xuICAgICAgICB0aGlzLnJlc2V0Q29sbGlzaW9uUG9zaXRpb24oKTtcbiAgICAgICAgaWYgKHJldC5jb2xsaXNpb25TY3JpcHQpIHtcbiAgICAgICAgICByZXQuY29sbGlzaW9uU2NyaXB0KHRoaXMsIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvL+W3puWBtOaOpeinplxuICAgICAgaWYgKHRoaXMuX2NvbGxpc2lvblszXS5oaXQgJiYgIXRoaXMuaXNDYXRjaExhZGRlcikge1xuICAgICAgICB2YXIgcmV0ID0gdGhpcy5fY29sbGlzaW9uWzNdLmhpdDtcbiAgICAgICAgdGhpcy54ID0gcmV0LnggKyByZXQud2lkdGggKiAoMSAtIHJldC5vcmlnaW5YKSArIHc7XG4gICAgICAgIHRoaXMudnggPSAwO1xuICAgICAgICB0aGlzLnJlc2V0Q29sbGlzaW9uUG9zaXRpb24oKTtcbiAgICAgICAgaWYgKHJldC5jb2xsaXNpb25TY3JpcHQpIHtcbiAgICAgICAgICByZXQuY29sbGlzaW9uU2NyaXB0KHRoaXMsIDMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLy/jgq3jg6Pjg6njgq/jgr/lkIzlo6vlvZPjgZ/jgorliKTlrprvvIjjg5bjg63jg4Pjgq/jga7jgb/vvIlcbiAgICBjaGVja0NoYXJhY3RlckNvbGxpc2lvbjogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5pZ25vcmVDb2xsaXNpb24pIHJldHVybjtcbiAgICAgIGlmICh0aGlzLmlzRHJvcCkgcmV0dXJuO1xuXG4gICAgICBjb25zdCByZXQgPSBbXTtcbiAgICAgIHRoaXMucGFyZW50U2NlbmUub2JqTGF5ZXIuY2hpbGRyZW4uZm9yRWFjaChlID0+IHtcbiAgICAgICAgaWYgKCFlLmlzQmxvY2spIHJldHVybjtcbiAgICAgICAgaWYgKGUuaXNEZWFkKSByZXR1cm47XG5cbiAgICAgICAgLy/kuIrlgbRcbiAgICAgICAgaWYgKHRoaXMudnkgPCAwICYmIGUuaGl0VGVzdEVsZW1lbnQodGhpcy5fY29sbGlzaW9uWzBdKSkge1xuICAgICAgICAgIHRoaXMueSA9IGUueSArIGUuaGVpZ2h0ICogKDEgLSBlLm9yaWdpblkpICsgMTY7XG4gICAgICAgICAgdGhpcy52eSA9IDE7XG4gICAgICAgICAgcmV0WzBdID0gZTtcbiAgICAgICAgICB0aGlzLnJlc2V0Q29sbGlzaW9uUG9zaXRpb24oKTtcbiAgICAgICAgfVxuICAgICAgICAvL+S4i+WBtFxuICAgICAgICBpZiAodGhpcy52eSA+IDAgJiYgZS5oaXRUZXN0RWxlbWVudCh0aGlzLl9jb2xsaXNpb25bMl0pKSB7XG4gICAgICAgICAgdGhpcy55ID0gZS55IC0gZS5oZWlnaHQgKiBlLm9yaWdpblkgLSAxNjtcbiAgICAgICAgICB0aGlzLnZ4ID0gZS52eDtcbiAgICAgICAgICB0aGlzLnZ5ID0gMDtcbiAgICAgICAgICB0aGlzLmlzSnVtcCA9IGZhbHNlO1xuICAgICAgICAgIHRoaXMuaXNPbkZsb29yID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLnRocm91Z2hGbG9vciA9IG51bGw7XG4gICAgICAgICAgcmV0WzJdID0gZTtcbiAgICAgICAgICBpZiAodGhpcy5yZWJvdW5kID4gMCkge1xuICAgICAgICAgICAgdGhpcy5pc0p1bXAgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy52eSA9IC10aGlzLnZ5ICogdGhpcy5yZWJvdW5kO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnZ5ID0gMDtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5yZXNldENvbGxpc2lvblBvc2l0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgICAgLy/lj7PlgbRcbiAgICAgICAgaWYgKHRoaXMudnggPiAwICYmIGUuaGl0VGVzdEVsZW1lbnQodGhpcy5fY29sbGlzaW9uWzFdKSkge1xuICAgICAgICAgICAgdGhpcy54ID0gZS54IC0gZS53aWR0aCAqIGUub3JpZ2luWCAtIDEwO1xuICAgICAgICAgICAgdGhpcy52eCA9IDA7XG4gICAgICAgICAgICByZXRbMV0gPSBlO1xuICAgICAgICAgICAgdGhpcy5yZXNldENvbGxpc2lvblBvc2l0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgICAgLy/lt6blgbRcbiAgICAgICAgaWYgKHRoaXMudnggPCAwICYmIGUuaGl0VGVzdEVsZW1lbnQodGhpcy5fY29sbGlzaW9uWzNdKSkge1xuICAgICAgICAgICAgdGhpcy54ID0gZS54ICsgZS53aWR0aCAqICgxIC0gZS5vcmlnaW5YKSArIDEwO1xuICAgICAgICAgICAgdGhpcy52eCA9IDA7XG4gICAgICAgICAgICByZXRbM10gPSBlO1xuICAgICAgICAgICAgdGhpcy5yZXNldENvbGxpc2lvblBvc2l0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJldDtcbiAgICB9LFxuXG4gICAgLy/lvZPjgZ/jgorliKTlrprnlKjjgqjjg6zjg6Hjg7Pjg4jjga7lho3oqK3lrppcbiAgICBzZXR1cENvbGxpc2lvbjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLy/lvZPjgZ/jgorliKTlrprnlKjjgqjjg6zjg6Hjg7Pjg4jjga7kvY3nva7lho3jgrvjg4Pjg4hcbiAgICByZXNldENvbGxpc2lvblBvc2l0aW9uOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB3ID0gTWF0aC5mbG9vcih0aGlzLndpZHRoIC8gMikgKyA2ICsgdGhpcy5vZmZzZXRDb2xsaXNpb25YO1xuICAgICAgdmFyIGggPSBNYXRoLmZsb29yKHRoaXMuaGVpZ2h0IC8gMikrIDYgKyB0aGlzLm9mZnNldENvbGxpc2lvblk7XG4gICAgICB0aGlzLl9jb2xsaXNpb25bMF0uc2V0UG9zaXRpb24odGhpcy54LCB0aGlzLnkgLSBoKTtcbiAgICAgIHRoaXMuX2NvbGxpc2lvblsxXS5zZXRQb3NpdGlvbih0aGlzLnggKyB3LCB0aGlzLnkpO1xuICAgICAgdGhpcy5fY29sbGlzaW9uWzJdLnNldFBvc2l0aW9uKHRoaXMueCwgdGhpcy55ICsgaCk7XG4gICAgICB0aGlzLl9jb2xsaXNpb25bM10uc2V0UG9zaXRpb24odGhpcy54IC0gdywgdGhpcy55KTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gIH0pO1xufSk7XG4iLCJwaGluYS5kZWZpbmUoXCJCYWxsb29uXCIsIHtcbiAgICBzdXBlckNsYXNzOiBcInBoaW5hLmRpc3BsYXkuU3ByaXRlXCIsXG5cbiAgICAvL+Wvv+WRveODleODrOODvOODoFxuICAgIGxpZmVTcGFuOiAzMCxcblxuICAgIC8v44Ki44OL44Oh44O844K344On44Oz6ZaT6ZqUXG4gICAgYW5pbWF0aW9uSW50ZXJ2YWw6IDYsXG5cblxuICAgIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5zdXBlckluaXQoXCJiYWxsb29uXCIsIDI0LCAzMik7XG5cbiAgICAgICAgdGhpcy5wYXR0ZXJuID0gb3B0aW9ucy5wYXR0ZXJuIHx8IFwiIVwiO1xuICAgICAgICB0aGlzLnNldEFuaW1hdGlvbih0aGlzLnBhdHRlcm4pO1xuXG4gICAgICAgIHRoaXMubGlmZVNwYW4gPSBvcHRpb25zLmxpZmVTcGFuIHx8IDYwO1xuICAgICAgICB0aGlzLmFuaW1hdGlvbkludGVydmFsID0gb3B0aW9ucy5hbmltYXRpb25JbnRlcnZhbCB8fCA2O1xuICAgICAgICB0aGlzLnRpbWUgPSAwO1xuXG4gICAgICAgIC8v54m55q6K44OR44K/44O844OzXG4gICAgICAgIGlmICh0aGlzLnBhdHRlcm4gPT0gXCJhbmdlcjJcIikge1xuICAgICAgICAgICAgdGhpcy50d2VlbmVyLnNldFVwZGF0ZVR5cGUoJ2ZwcycpLmNsZWFyKCkuYnkoe3k6IC0xNiwgYWxwaGE6IC0xfSwgdGhpcy5hbmltYXRpb25JbnRlcnZhbCwgXCJlYXNlSW5TaW5lXCIpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHVwZGF0ZSA6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy50aW1lICUgdGhpcy5hbmltYXRpb25JbnRlcnZhbCA9PSAwKSB0aGlzLmZyYW1lSW5kZXgrKztcblxuICAgICAgICB0aGlzLnRpbWUrKztcbiAgICAgICAgaWYgKHRoaXMudGltZSA+IHRoaXMubGlmZVNwYW4pIHRoaXMucmVtb3ZlKCk7XG4gICAgfSxcblxuICAgIHNldEFuaW1hdGlvbjogZnVuY3Rpb24ocGF0dGVybikge1xuICAgICAgICBzd2l0Y2ggKHBhdHRlcm4pIHtcbiAgICAgICAgICAgIGNhc2UgXCIuLi5cIjpcbiAgICAgICAgICAgICAgICB0aGlzLnNldEZyYW1lVHJpbW1pbmcoMCwgMCwgMjQsIDEyOCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiP1wiOlxuICAgICAgICAgICAgICAgIHRoaXMuc2V0RnJhbWVUcmltbWluZyg5NiwgMzIsIDI0LCAzMik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiIVwiOlxuICAgICAgICAgICAgICAgIHRoaXMuc2V0RnJhbWVUcmltbWluZyg3MiwgNjQsIDcyLCAzMik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwienp6XCI6XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRGcmFtZVRyaW1taW5nKDAsIDAsIDI0LCAzMik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwic3R1blwiOlxuICAgICAgICAgICAgICAgIHRoaXMuc2V0RnJhbWVUcmltbWluZygxNDQsIDMyLCA0OCwgMzIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImxpZ2h0XCI6XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRGcmFtZVRyaW1taW5nKDE0NCwgNjQsIDQ4LCAzMik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwibmV3dHlwZVwiOlxuICAgICAgICAgICAgICAgIHRoaXMuc2V0RnJhbWVUcmltbWluZygxNDQsIDk2LCA3MiwgMzIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImFuZ2VyXCI6XG4gICAgICAgICAgICBjYXNlIFwiYW5nZXIxXCI6XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRGcmFtZVRyaW1taW5nKDcyLCA5NiwgMjQsIDMyKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJhbmdlcjJcIjpcbiAgICAgICAgICAgICAgICB0aGlzLnNldEZyYW1lVHJpbW1pbmcoMTQ0LCAxMjgsIDcyLCAzMik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9LFxufSk7XG4iLCJwaGluYS5kZWZpbmUoXCJJdGVtXCIsIHtcbiAgICBzdXBlckNsYXNzOiBcIkJhc2VDaGFyYWN0ZXJcIixcblxuICAgIC8v6K2Y5Yil44OV44Op44KwXG4gICAgaXNJdGVtOiB0cnVlLFxuXG4gICAgLy/jgqLjgqTjg4bjg6DnqK7liKVcbiAgICBraW5kOiAwLFxuXG4gICAgLy/jgqLjgqTjg4bjg6Djg6zjg5njg6tcbiAgICBsZXZlbDogMCxcblxuICAgIC8v5o2o44Gm44Ki44Kk44OG44OgXG4gICAgdGhyb3dBd2F5OiBmYWxzZSxcblxuICAgIC8v5aSn44G+44GL44Gq56iu5Yil44OV44Op44KwXG4gICAgaXNXZWFwb246IGZhbHNlLFxuICAgIGlzRXF1aXA6IGZhbHNlLFxuICAgIGlzRm9vZDogZmFsc2UsXG4gICAgaXNJdGVtOiBmYWxzZSxcbiAgICBpc0tleTogZmFsc2UsXG5cbiAgICAvL+aVteODieODreODg+ODl+OCouOCpOODhuODoOODleODqeOCsFxuICAgIGlzRW5lbXlEcm9wOiBmYWxzZSxcblxuICAgIC8v44Ki44Kk44OG44Og5oOF5aCxXG4gICAgc3RhdHVzOiBudWxsLFxuXG4gICAgLy/lj43nmbrkv4LmlbBcbiAgICByZWJvdW5kOiAwLjMsXG5cbiAgICAvL+OCouODi+ODoeODvOOCt+ODp+ODs+mAsuihjOWPr+iDveODleODqeOCsCAgIFxuICAgIGlzQWR2YW5jZUFuaW1hdGlvbjogZmFsc2UsXG5cbiAgICAvL+W9seihqOekuuODleODqeOCsFxuICAgIGlzU2hhZG93OiBmYWxzZSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uKHBhcmVudFNjZW5lLCBvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuc3VwZXJJbml0KHBhcmVudFNjZW5lLCB7d2lkdGg6IDE2LCBoZWlnaHQ6IDE2fSk7XG5cbiAgICAgICAgLy/jgqLjgqTjg4bjg6Djg6zjg5njg6tcbiAgICAgICAgdGhpcy5sZXZlbCA9IDA7XG4gICAgICAgIHRoaXMua2luZCA9IG51bGw7XG4gICAgICAgIGlmIChvcHRpb25zLnByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIHRoaXMubGV2ZWwgPSBvcHRpb25zLnByb3BlcnRpZXMubGV2ZWwgfHwgMDtcbiAgICAgICAgICAgIHRoaXMua2luZCA9IG9wdGlvbnMucHJvcGVydGllcy5raW5kO1xuICAgICAgICB9XG4gICAgICAgIGlmIChvcHRpb25zLmtpbmQgIT09IHVuZGVmaW5lZCkgdGhpcy5raW5kID0gb3B0aW9ucy5raW5kO1xuXG4gICAgICAgIC8v44Ki44Kk44OG44Og56iu5YilXG4gICAgICAgIGlmICh0aGlzLmtpbmQgPT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMubmFtZSA9PSBcImZvb2RcIikge1xuICAgICAgICAgICAgICAgIHRoaXMua2luZCA9IElURU1fQVBQTEUgKyB0aGlzLmxldmVsO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IFwiSVRFTV9cIitvcHRpb25zLm5hbWUudG9VcHBlckNhc2UoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmtpbmQgPSBldmFsKG5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aGlzLmtpbmQgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIHZhciBuYW1lID0gXCJJVEVNX1wiK3RoaXMua2luZC50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAgICAgdGhpcy5raW5kID0gZXZhbChuYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8v44Ki44Kk44OG44Og44K544OG44O844K/44K55Y+W5b6XXG4gICAgICAgIHRoaXMuJGV4dGVuZChJdGVtSW5mby5nZXQodGhpcy5raW5kKSk7XG5cbiAgICAgICAgLy/jgqLjgqTjg4bjg6Djgrnjg5fjg6njgqTjg4hcbiAgICAgICAgaWYgKHRoaXMuaXNXZWFwb24pIHtcbiAgICAgICAgICAgIC8v5q2m5Zmo44Gu5aC05ZCIXG4gICAgICAgICAgICB2YXIgaW5kZXggPSB0aGlzLmtpbmQgKiAxMCArIE1hdGgubWluKHRoaXMubGV2ZWwsIHRoaXMubWF4SW5kZXgpO1xuICAgICAgICAgICAgdGhpcy5zcHJpdGUgPSBwaGluYS5kaXNwbGF5LlNwcml0ZShcIndlYXBvbnNcIiwgMjQsIDI0KS5hZGRDaGlsZFRvKHRoaXMpLnNldEZyYW1lSW5kZXgoaW5kZXgpO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5sZXZlbCA+IDApIHtcbiAgICAgICAgICAgICAgICAvL+W8t+WMluODrOODmeODq+ihqOekulxuICAgICAgICAgICAgICAgIHZhciBsYWJlbFBhcmFtID0ge1xuICAgICAgICAgICAgICAgICAgICBmaWxsOiBcIndoaXRlXCIsXG4gICAgICAgICAgICAgICAgICAgIHN0cm9rZTogXCJibGFja1wiLFxuICAgICAgICAgICAgICAgICAgICBzdHJva2VXaWR0aDogMixcblxuICAgICAgICAgICAgICAgICAgICBmb250RmFtaWx5OiBcIk9yYml0cm9uXCIsXG4gICAgICAgICAgICAgICAgICAgIGFsaWduOiBcImNlbnRlclwiLFxuICAgICAgICAgICAgICAgICAgICBiYXNlbGluZTogXCJtaWRkbGVcIixcbiAgICAgICAgICAgICAgICAgICAgZm9udFNpemU6IDEwLFxuICAgICAgICAgICAgICAgICAgICBmb250V2VpZ2h0OiAnJ1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcGhpbmEuZGlzcGxheS5MYWJlbCh7dGV4dDogXCIrXCIrdGhpcy5sZXZlbH0uJHNhZmUobGFiZWxQYXJhbSkpLnNldFBvc2l0aW9uKDYsIDYpLmFkZENoaWxkVG8odGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNwcml0ZSA9IHBoaW5hLmRpc3BsYXkuU3ByaXRlKFwiaXRlbVwiLCAyNCwgMjQpLmFkZENoaWxkVG8odGhpcykuc2V0RnJhbWVJbmRleCh0aGlzLmtpbmQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy/lr7/lkb1cbiAgICAgICAgdGhpcy5saWZlU3BhbiA9IDE1MDtcblxuICAgICAgICAvL+OCouOCr+ODhuOCo+ODluODleODqeOCsFxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmFjdGl2ZSA9PT0gdW5kZWZpbmVkIHx8IHRoaXMub3B0aW9ucy5hY3RpdmUgPT0gdHJ1ZSkge1xuICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm9uKCdlbnRlcmZyYW1lJywgZSA9PiB7XG4gICAgICAgICAgICAvL+ODl+ODrOOCpOODpOODvOOBqOOBruW9k+OBn+OCiuWIpOWumlxuICAgICAgICAgICAgdmFyIHBsID0gdGhpcy5wYXJlbnRTY2VuZS5wbGF5ZXI7XG4gICAgICAgICAgICBpZiAodGhpcy5oaXRUZXN0RWxlbWVudChwbCkpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lID4gMTAgJiYgIXRoaXMudGhyb3dBd2F5KSB7XG4gICAgICAgICAgICAgICAgICAgIHBsLmdldEl0ZW0odGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLnRpbWUgPiAzMCAmJiB0aGlzLnRocm93QXdheSkgdGhpcy50aHJvd0F3YXkgPSBmYWxzZTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNFbmVteURyb3ApIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5saWZlU3BhbiA9PSAwKSB0aGlzLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmxpZmVTcGFuIDwgMzApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGltZSAlIDIgPT0gMCkgdGhpcy52aXNpYmxlID0gIXRoaXMudmlzaWJsZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMubGlmZVNwYW4gPCA2MCl7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRpbWUgJSA1ID09IDApIHRoaXMudmlzaWJsZSA9ICF0aGlzLnZpc2libGU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmxpZmVTcGFuIDwgOTApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGltZSAlIDEwID09IDApIHRoaXMudmlzaWJsZSA9ICF0aGlzLnZpc2libGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMubGlmZVNwYW4tLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbn0pO1xuIiwiLypcbiAqICBpdGVtYm94LmpzXG4gKiAgMjAxNy8wMS8wNFxuICogIEBhdXRoZXIgbWluaW1vICBcbiAqICBUaGlzIFByb2dyYW0gaXMgTUlUIGxpY2Vuc2UuXG4gKi9cblxuLy/jgqLjgqTjg4bjg6Djg5zjg4Pjgq/jgrnjgq/jg6njgrlcbnBoaW5hLmRlZmluZShcIkl0ZW1Cb3hcIiwge1xuICBzdXBlckNsYXNzOiBcIkJhc2VDaGFyYWN0ZXJcIixcblxuICAvL+itmOWIpeODleODqeOCsFxuICBpc0l0ZW1Cb3g6IHRydWUsXG5cbiAgLy/ogJDkuYXliptcbiAgaHA6IDEsXG5cbiAgLy/plovjgYTjgZ/jg5Xjg6njgrBcbiAgb3BlbmVkOiBmYWxzZSxcblxuICAvL+OCouOCpOODhuODoOeoruWIpVxuICBraW5kOiAwLFxuXG4gIC8v44Ki44OL44Oh44O844K344On44Oz6ZaT6ZqUXG4gIGFuaW1hdGlvbkludGVydmFsOiAzLFxuXG4gIC8v5Y+N55m65L+C5pWwXG4gIHJlYm91bmQ6IDAuMyxcblxuICBpbml0OiBmdW5jdGlvbihwYXJlbnRTY2VuZSwgb3B0aW9ucykge1xuICAgIHRoaXMuc3VwZXJJbml0KHBhcmVudFNjZW5lLCB7IHdpZHRoOiAyNiwgaGVpZ2h0OiAyNiB9LiRzYWZlKG9wdGlvbnMucHJvcGVydGllcykpO1xuXG4gICAgLy/jgqLjgqTjg4bjg6Djg5zjg4Pjgq/jgrnjgrnjg5fjg6njgqTjg4hcbiAgICB0aGlzLnNwcml0ZSA9IHBoaW5hLmRpc3BsYXkuU3ByaXRlKFwiaXRlbWJveFwiLCAzMiwgMzIpXG4gICAgICAuYWRkQ2hpbGRUbyh0aGlzKVxuICAgICAgLnNldFNjYWxlKDAuOClcbiAgICAgIC5zZXRGcmFtZUluZGV4KDApO1xuXG4gICAgdGhpcy5zZXRBbmltYXRpb24oXCJjbG9zZVwiKTtcblxuICAgIC8v5YaF5a6554mpXG4gICAgdGhpcy5uYW1lID0gb3B0aW9ucy5uYW1lO1xuICAgIHRoaXMua2luZCA9IG9wdGlvbnMucHJvcGVydGllcz8gb3B0aW9ucy5wcm9wZXJ0aWVzLmtpbmQ6IHVuZGVmaW5lZDtcbiAgICB0aGlzLmxldmVsID0gb3B0aW9ucy5wcm9wZXJ0aWVzPyBvcHRpb25zLnByb3BlcnRpZXMubGV2ZWw6IDA7XG4gIH0sXG5cbiAgdXBkYXRlOiBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMub3BlbmVkKSB7XG4gICAgICAvL+ODl+ODrOOCpOODpOODvOaUu+aSg++8iOWbuuWumu+8ieOBqOOBruW9k+OBn+OCiuWIpOWumlxuICAgICAgdmFyIHBsID0gdGhpcy5wYXJlbnRTY2VuZS5wbGF5ZXI7XG4gICAgICBpZiAocGwuaXNBdHRhY2sgJiYgdGhpcy5oaXRUZXN0RWxlbWVudChwbC5hdHRhY2tDb2xsaXNpb24pKSB7XG4gICAgICB0aGlzLmRhbWFnZShwbCk7XG4gICAgICB9XG4gICAgICAvL+ODl+ODrOOCpOODpOODvOaUu+aSg+WIpOWumuOBqOOBruW9k+OBn+OCiuWIpOWumlxuICAgICAgdGhpcy5wYXJlbnRTY2VuZS5wbGF5ZXJMYXllci5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgUGxheWVyQXR0YWNrICYmIGUuaXNDb2xsaXNpb24gJiYgdGhpcy5oaXRUZXN0RWxlbWVudChlKSkge1xuICAgICAgICBlLnJlbW92ZSgpO1xuICAgICAgICB0aGlzLmRhbWFnZShlKTtcbiAgICAgIH1cbiAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgfVxuICAgIHRoaXMudmlzaWJsZSA9IHRydWU7ICAvL+eCuea7heOCreODo+ODs+OCu+ODq1xuICB9LFxuXG4gIGRhbWFnZTogZnVuY3Rpb24odGFyZ2V0KSB7XG4gICAgaWYgKHRoaXMub3BlbmVkKSByZXR1cm47XG4gICAgdGhpcy5ocCAtPSB0YXJnZXQucG93ZXI7XG4gICAgdGhpcy5tdXRla2lUaW1lID0gMTA7XG4gICAgaWYgKHRoaXMuaHAgPD0gMCkge1xuICAgICAgdGhpcy5vcGVuKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLnggPCB0YXJnZXQueCkge1xuICAgICAgdGhpcy5zcHJpdGUudHdlZW5lci5jbGVhcigpLm1vdmVCeSgtNSwgMCwgMikubW92ZUJ5KDUsIDAsIDIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNwcml0ZS50d2VlbmVyLmNsZWFyKCkubW92ZUJ5KDUsIDAsIDIpLm1vdmVCeSgtNSwgMCwgMik7XG4gICAgfVxuICB9LFxuXG4gIG9wZW46IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaXNBZHZhbmNlQW5pbWF0aW9uID0gdHJ1ZTtcbiAgICB0aGlzLm9wZW5lZCA9IHRydWU7XG4gICAgdGhpcy5zZXRBbmltYXRpb24oXCJvcGVuXCIpO1xuICAgIHN3aXRjaCAodGhpcy5uYW1lKSB7XG4gICAgICBjYXNlIFwiZW1wdHlcIjpcbiAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcIml0ZW1cIjpcbiAgICAgICAgdGhpcy50d2VlbmVyLmNsZWFyKClcbiAgICAgICAgICAud2FpdCgxMClcbiAgICAgICAgICAuY2FsbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgIGtpbmQ6IHRoaXMua2luZCxcbiAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgIGxldmVsOiB0aGlzLmxldmVsXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyBjb25zdCBpID0gdGhpcy5wYXJlbnRTY2VuZS5zcGF3bkl0ZW0odGhpcy54LCB0aGlzLnksIG9wdGlvbnMpO1xuICAgICAgICAgICAgLy8gaS52eSA9IC01O1xuICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRoaXMudHdlZW5lci5jbGVhcigpXG4gICAgICAgICAgLndhaXQoMTApXG4gICAgICAgICAgLmNhbGwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICAgICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICBsZXZlbDogdGhpcy5sZXZlbFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLy8gY29uc3QgaSA9IHRoaXMucGFyZW50U2NlbmUuc3Bhd25JdGVtKHRoaXMueCwgdGhpcy55LCBvcHRpb25zKTtcbiAgICAgICAgICAgIC8vIGkudnkgPSAtNTtcbiAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9LFxuXG4gIHNldHVwQW5pbWF0aW9uOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNwY2lhbEFuaW1hdGlvbiA9IGZhbHNlO1xuICAgIHRoaXMuZnJhbWUgPSBbXTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmNvbG9yID09IFwiZ29sZFwiKSB7XG4gICAgICB0aGlzLmZyYW1lW1wiY2xvc2VcIl0gPSBbMl07XG4gICAgICB0aGlzLmZyYW1lW1wib3BlblwiXSA9IFsyLCA2LCA4LCBcInN0b3BcIl07XG4gICAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMuY29sb3IgPT0gXCJyZWRcIikge1xuICAgICAgdGhpcy5mcmFtZVtcImNsb3NlXCJdID0gWzFdO1xuICAgICAgdGhpcy5mcmFtZVtcIm9wZW5cIl0gPSBbMSwgNCwgNywgXCJzdG9wXCJdO1xuICAgIH0gZWxzZSBpZiAodGhpcy5vcHRpb25zLmNvbG9yID09IFwiYmx1ZVwiKSB7XG4gICAgICB0aGlzLmZyYW1lW1wiY2xvc2VcIl0gPSBbMF07XG4gICAgICB0aGlzLmZyYW1lW1wib3BlblwiXSA9IFswLCAzLCA2LCBcInN0b3BcIl07XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZnJhbWVbXCJjbG9zZVwiXSA9IFsxXTtcbiAgICAgIHRoaXMuZnJhbWVbXCJvcGVuXCJdID0gWzEsIDQsIDcsIFwic3RvcFwiXTtcbiAgICB9XG4gICAgdGhpcy5pbmRleCA9IDA7XG4gIH0sXG59KTtcbiIsInBoaW5hLmRlZmluZShcIkl0ZW1JbmZvXCIsIHtcbiAgX3N0YXRpYzoge1xuICAgICAgZ2V0OiBmdW5jdGlvbihraW5kKSB7XG4gICAgICAgICAgc3dpdGNoIChraW5kKSB7XG4gICAgICAgICAgICAgIGNhc2UgXCJzaG9ydHN3b3JkXCI6XG4gICAgICAgICAgICAgIGNhc2UgSVRFTV9TSE9SVFNXT1JEOlxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIlNIT1JUIFNXT1JEXCIsXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJzd29yZFwiLFxuICAgICAgICAgICAgICAgICAgICAgIGlzV2VhcG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIGlzU2xhc2g6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgcG93ZXI6IDEwLFxuICAgICAgICAgICAgICAgICAgICAgIHN0dW5Qb3dlcjogMSxcbiAgICAgICAgICAgICAgICAgICAgICBtYXhJbmRleDogMCxcbiAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IDE0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IDMwXG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgY2FzZSBcImxvbmdzd29yZFwiOlxuICAgICAgICAgICAgICBjYXNlIElURU1fTE9OR1NXT1JEOlxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIkxPTkcgU1dPUkRcIixcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcInN3b3JkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgaXNXZWFwb246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgaXNTbGFzaDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBwb3dlcjogMTUsXG4gICAgICAgICAgICAgICAgICAgICAgc3R1blBvd2VyOiA1LFxuICAgICAgICAgICAgICAgICAgICAgIG1heEluZGV4OiA3LFxuICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogMjQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogMjVcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjYXNlIFwiYXhcIjpcbiAgICAgICAgICAgICAgY2FzZSBJVEVNX0FYOlxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIkFYXCIsXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJheFwiLFxuICAgICAgICAgICAgICAgICAgICAgIGlzV2VhcG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIGlzU2xhc2g6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgaXNCcm93OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIHBvd2VyOiAyMCxcbiAgICAgICAgICAgICAgICAgICAgICBzdHVuUG93ZXI6IDIwLFxuICAgICAgICAgICAgICAgICAgICAgIG1heEluZGV4OiA0LFxuICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogMTQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogMjZcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjYXNlIFwic3BlYXJcIjpcbiAgICAgICAgICAgICAgY2FzZSBJVEVNX1NQRUFSOlxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIlNQRUFSXCIsXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJzcGVhclwiLFxuICAgICAgICAgICAgICAgICAgICAgIGlzV2VhcG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIGlzU3Rpbmc6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgcG93ZXI6IDEwLFxuICAgICAgICAgICAgICAgICAgICAgIHN0dW5Qb3dlcjogMSxcbiAgICAgICAgICAgICAgICAgICAgICBtYXhJbmRleDogNCxcbiAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IDM5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IDEwXG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgY2FzZSBcImJvd1wiOlxuICAgICAgICAgICAgICBjYXNlIElURU1fQk9XOlxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIkJPV1wiLFxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiYm93XCIsXG4gICAgICAgICAgICAgICAgICAgICAgaXNXZWFwb246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgaXNCcm93OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIHBvd2VyOiA1LFxuICAgICAgICAgICAgICAgICAgICAgIHN0dW5Qb3dlcjogNSxcbiAgICAgICAgICAgICAgICAgICAgICBtYXhJbmRleDogMCxcbiAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IDIwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IDEwXG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgY2FzZSBcInJvZFwiOlxuICAgICAgICAgICAgICBjYXNlIElURU1fUk9EOlxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIk1BR0lDIFJPRFwiLFxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwicm9kXCIsXG4gICAgICAgICAgICAgICAgICAgICAgaXNXZWFwb246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgaXNCcm93OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIGlzRmlyZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBwb3dlcjogNSxcbiAgICAgICAgICAgICAgICAgICAgICBzdHVuUG93ZXI6IDEwLFxuICAgICAgICAgICAgICAgICAgICAgIG1heEluZGV4OiA3LFxuICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogMjAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogMTBcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjYXNlIFwiYm9va1wiOlxuICAgICAgICAgICAgICBjYXNlIElURU1fQk9PSzpcbiAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJCT09LXCIsXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJib29rXCIsXG4gICAgICAgICAgICAgICAgICAgICAgaXNXZWFwb246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgaXNCcm93OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIGlzSG9seTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBwb3dlcjogMTAsXG4gICAgICAgICAgICAgICAgICAgICAgc3R1blBvd2VyOiA0MCxcbiAgICAgICAgICAgICAgICAgICAgICBtYXhJbmRleDogMCxcbiAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IDIwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IDIwXG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgY2FzZSBcInNoaWVsZFwiOlxuICAgICAgICAgICAgICBjYXNlIElURU1fU0hJRUxEOlxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIlNISUVMRFwiLFxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiZXF1aXBcIixcbiAgICAgICAgICAgICAgICAgICAgICBpc0VxdWlwOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIHBvd2VyOiAyMCxcbiAgICAgICAgICAgICAgICAgICAgICBwb2ludDogMTAwMCxcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGNhc2UgXCJhcm1vclwiOlxuICAgICAgICAgICAgICBjYXNlIElURU1fQVJNT1I6XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiQVJNT1JcIixcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImVxdWlwXCIsXG4gICAgICAgICAgICAgICAgICAgICAgaXNFcXVpcDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBwb3dlcjogMzAsXG4gICAgICAgICAgICAgICAgICAgICAgcG9pbnQ6IDUwMDAsXG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjYXNlIFwiaGF0XCI6XG4gICAgICAgICAgICAgIGNhc2UgSVRFTV9IQVQ6XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiSEFUXCIsXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJlcXVpcFwiLFxuICAgICAgICAgICAgICAgICAgICAgIGlzRXF1aXA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgcG93ZXI6IDEwLFxuICAgICAgICAgICAgICAgICAgICAgIHBvaW50OiAzMDAsXG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjYXNlIFwiYm9vdHNcIjpcbiAgICAgICAgICAgICAgY2FzZSBJVEVNX0JPT1RTOlxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIkJPT1RTXCIsXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJlcXVpcFwiLFxuICAgICAgICAgICAgICAgICAgICAgIGlzRXF1aXA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgcG93ZXI6IDEwLFxuICAgICAgICAgICAgICAgICAgICAgIHBvaW50OiA1MDAsXG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjYXNlIFwiZ3JvdmVcIjpcbiAgICAgICAgICAgICAgY2FzZSBJVEVNX0dST1ZFOlxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIkdST1ZFXCIsXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJlcXVpcFwiLFxuICAgICAgICAgICAgICAgICAgICAgIGlzRXF1aXA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgcG93ZXI6IDEwLFxuICAgICAgICAgICAgICAgICAgICAgIHBvaW50OiA1MDAsXG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjYXNlIFwicmluZ1wiOlxuICAgICAgICAgICAgICBjYXNlIElURU1fUklORzpcbiAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJSSU5HXCIsXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJlcXVpcFwiLFxuICAgICAgICAgICAgICAgICAgICAgIGlzRXF1aXA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgcG93ZXI6IDIwLFxuICAgICAgICAgICAgICAgICAgICAgIHBvaW50OiAzMDAwLFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgY2FzZSBcInNjcm9sbFwiOlxuICAgICAgICAgICAgICBjYXNlIElURU1fU0NST0xMOlxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIlNDUk9MTFwiLFxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiaXRlbVwiLFxuICAgICAgICAgICAgICAgICAgICAgIGlzSXRlbTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBwb2ludDogMTAwMCxcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGNhc2UgXCJsZXR0ZXJcIjpcbiAgICAgICAgICAgICAgY2FzZSBJVEVNX0xFVFRFUjpcbiAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJMRVRURVJcIixcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIml0ZW1cIixcbiAgICAgICAgICAgICAgICAgICAgICBpc0l0ZW06IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgcG9pbnQ6IDEwMCxcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGNhc2UgXCJjYXJkXCI6XG4gICAgICAgICAgICAgIGNhc2UgSVRFTV9DQVJEOlxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIkNBUkRcIixcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIml0ZW1cIixcbiAgICAgICAgICAgICAgICAgICAgICBpc0l0ZW06IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgcG9pbnQ6IDEwMDAsXG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjYXNlIFwia2V5XCI6XG4gICAgICAgICAgICAgIGNhc2UgSVRFTV9LRVk6XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiS0VZXCIsXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJrZXlcIixcbiAgICAgICAgICAgICAgICAgICAgICBpc0tleTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBwb2ludDogMjAwMCxcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGNhc2UgXCJjb2luXCI6XG4gICAgICAgICAgICAgIGNhc2UgSVRFTV9DT0lOOlxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIkNPSU5cIixcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIml0ZW1cIixcbiAgICAgICAgICAgICAgICAgICAgICBpc0l0ZW06IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgcG9pbnQ6IDUwMCxcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGNhc2UgXCJiYWdcIjpcbiAgICAgICAgICAgICAgY2FzZSBJVEVNX0JBRzpcbiAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJCQUdcIixcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIml0ZW1cIixcbiAgICAgICAgICAgICAgICAgICAgICBpc0l0ZW06IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgcG9pbnQ6IDEwMDAsXG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjYXNlIFwib3JiXCI6XG4gICAgICAgICAgICAgIGNhc2UgSVRFTV9PUkI6XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiT1JCXCIsXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJpdGVtXCIsXG4gICAgICAgICAgICAgICAgICAgICAgaXNJdGVtOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIHBvaW50OiA1MDAwLFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgY2FzZSBcInN0b25lXCI6XG4gICAgICAgICAgICAgIGNhc2UgSVRFTV9TVE9ORTpcbiAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJTVE9ORVwiLFxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiaXRlbVwiLFxuICAgICAgICAgICAgICAgICAgICAgIGlzSXRlbTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBwb2ludDogMjAwMCxcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGNhc2UgXCJqZXdlbFwiOlxuICAgICAgICAgICAgICBjYXNlIElURU1fSkVXRUw6XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiSkVXRUxcIixcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIml0ZW1cIixcbiAgICAgICAgICAgICAgICAgICAgICBpc0l0ZW06IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgcG9pbnQ6IDUwMDAsXG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjYXNlIFwiamV3ZWxib3hcIjpcbiAgICAgICAgICAgICAgY2FzZSBJVEVNX0pFV0VMQk9YOlxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIkpFV0VMQk9YXCIsXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJpdGVtXCIsXG4gICAgICAgICAgICAgICAgICAgICAgaXNJdGVtOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIHBvaW50OiAxMDAwMCxcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGNhc2UgXCJhcHBsZVwiOlxuICAgICAgICAgICAgICBjYXNlIElURU1fQVBQTEU6XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiQVBQTEVcIixcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImZvb2RcIixcbiAgICAgICAgICAgICAgICAgICAgICBpc0Zvb2Q6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgcG93ZXI6IDIwLFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgY2FzZSBcImhhcmJcIjpcbiAgICAgICAgICAgICAgY2FzZSBJVEVNX0hBUkI6XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiSEFSQlwiLFxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiZm9vZFwiLFxuICAgICAgICAgICAgICAgICAgICAgIGlzRm9vZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBwb3dlcjogNDAsXG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjYXNlIFwibWVhdFwiOlxuICAgICAgICAgICAgICBjYXNlIElURU1fTUVBVDpcbiAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJNRUFUXCIsXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJmb29kXCIsXG4gICAgICAgICAgICAgICAgICAgICAgaXNGb29kOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIHBvd2VyOiA2MCxcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGNhc2UgXCJwb3Rpb25cIjpcbiAgICAgICAgICAgICAgY2FzZSBJVEVNX1BPVElPTjpcbiAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJQT1RJT05cIixcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImZvb2RcIixcbiAgICAgICAgICAgICAgICAgICAgICBpc0Zvb2Q6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgcG93ZXI6IDEwMCxcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgICAgfVxuICAgICAgfSxcbiAgfSxcbn0pO1xuXG4iLCJwaGluYS5kZWZpbmUoXCJQbGF5ZXJcIiwge1xuICBzdXBlckNsYXNzOiBcIkJhc2VDaGFyYWN0ZXJcIixcblxuICAvL+itmOWIpeODleODqeOCsFxuICBpc1BsYXllcjogdHJ1ZSxcblxuICAvL+ODquODouODvOODiOWBtOODl+ODrOOCpOODpOODvOODleODqeOCsFxuICBpc1JlbW90ZVBsYXllcjogZmFsc2UsXG5cbiAgLy/mnIDlpKfjg5Ljg4Pjg4jjg53jgqTjg7Pjg4hcbiAgaHBNYXg6IDEwMCxcblxuICAvL+ODkuODg+ODiOODneOCpOODs+ODiFxuICBocDogMTAwLFxuXG4gIC8v5pS75pKD5YqbXG4gIHBvd2VyOiAxMCxcblxuICAvL+awl+e1tueiuueOh1xuICBzdHVuUG93ZXI6IDEsXG5cbiAgLy/pmLLlvqHliptcbiAgZGVmZW5zZTogMTAsXG5cbiAgLy/np7vli5XpgJ/luqZcbiAgc3BlZWQ6IDMsXG5cbiAgLy/nmbvlnYLpgJ/luqZcbiAgc3BlZWRBc2NlbmQ6IDQsXG5cbiAgLy/jgrjjg6Pjg7Pjg5fliptcbiAganVtcFBvd2VyOiA4LFxuXG4gIC8v5aSa5q6144K444Oj44Oz44OX5Y+v6IO95Zue5pWwXG4gIG51bUp1bXA6IDAsXG4gIG51bUp1bXBNYXg6IDIsXG5cbiAgLy/mk43kvZzlj6/og73jg5Xjg6njgrBcbiAgaXNDb250cm9sOiB0cnVlLFxuXG4gIC8v5pS75pKD5Lit44OV44Op44KwXG4gIGlzQXR0YWNrOiBmYWxzZSxcblxuICAvL+WJjeODleODrOODvOODoOOBruaDheWgsVxuICBiZWZvcmU6IG51bGwsXG5cbiAgaW5pdDogZnVuY3Rpb24ocGFyZW50U2NlbmUpIHtcbiAgICB0aGlzLnN1cGVySW5pdChwYXJlbnRTY2VuZSwge3dpZHRoOiAxNiwgaGVpZ2h0OiAyMH0pO1xuXG4gICAgLy/jgrnjg5fjg6njgqTjg4jog4zlvoxcbiAgICB0aGlzLmJhY2sgPSBwaGluYS5kaXNwbGF5LkRpc3BsYXlFbGVtZW50KCkuYWRkQ2hpbGRUbyh0aGlzKS5zZXRTY2FsZSgtMSwgMSk7XG5cbiAgICAvL+ihqOekuueUqOOCueODl+ODqeOCpOODiFxuICAgIHRoaXMuc3ByaXRlID0gcGhpbmEuZGlzcGxheS5TcHJpdGUoXCJhY3RvcjRcIiwgMzIsIDMyKS5hZGRDaGlsZFRvKHRoaXMpLnNldEZyYW1lSW5kZXgoMCk7XG4gICAgdGhpcy5zcHJpdGUuc2NhbGVYID0gLTE7XG5cbiAgICAvL+atpuWZqOeUqOOCueODl+ODqeOCpOODiFxuICAgIHRoaXMud2VhcG9uID0gcGhpbmEuZGlzcGxheS5TcHJpdGUoXCJ3ZWFwb25zXCIsIDI0LCAyNClcbiAgICAgIC5hZGRDaGlsZFRvKHRoaXMuYmFjaylcbiAgICAgIC5zZXRGcmFtZUluZGV4KDApXG4gICAgICAuc2V0T3JpZ2luKDEsIDEpXG4gICAgICAuc2V0UG9zaXRpb24oMywgMyk7XG4gICAgdGhpcy53ZWFwb24uYWxwaGEgPSAwO1xuICAgIHRoaXMud2VhcG9uLnR3ZWVuZXIuc2V0VXBkYXRlVHlwZSgnZnBzJyk7XG4gICAgdGhpcy53ZWFwb24udHlwZSA9IFwic3dvcmRcIjtcblxuICAgIC8v5pS75pKD5Yik5a6a55SoXG4gICAgdGhpcy5hdHRhY2tDb2xsaXNpb24gPSBwaGluYS5kaXNwbGF5LlJlY3RhbmdsZVNoYXBlKHt3aWR0aDogMTQsIGhlaWdodDogMjZ9KTtcblxuICAgIC8v5b2T44Gf44KK5Yik5a6a44OH44OQ44OD44Kw55SoXG4gICAgaWYgKERFQlVHX0NPTExJU0lPTikge1xuICAgICAgdGhpcy5vbmUoJ2VudGVyZnJhbWUnLCBlID0+IHtcbiAgICAgICAgdGhpcy5hdHRhY2tDb2xsaXNpb24uYWRkQ2hpbGRUbyh0aGlzLnBhcmVudFNjZW5lLnBsYXllckxheWVyKTtcbiAgICAgICAgdGhpcy5hdHRhY2tDb2xsaXNpb24uYWxwaGEgPSAwLjM7XG4gICAgICB9KTtcbiAgICAgIHRoaXMub24oJ3JlbW92ZWQnLCBlID0+IHtcbiAgICAgICAgdGhpcy5hdHRhY2tDb2xsaXNpb24ucmVtb3ZlKCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvL+WIneacn+OCouODi+ODoeODvOOCt+ODp+ODs+ioreWumlxuICAgIHRoaXMuc2V0QW5pbWF0aW9uKFwid2Fsa1wiKTtcbiAgICB0aGlzLmJlZm9yZUFuaW1hdGlvbiA9IFwiXCI7XG5cbiAgICAvL+atu+S6oeaZguOCs+ODvOODq+ODkOODg+OCr1xuICAgIHRoaXMub24oJ2RlYWQnLCAoKSA9PiB0aGlzLnBhcmVudFNjZW5lLmZsYXJlKCdnYW1lb3ZlcicpKTtcblxuICAgIC8v5pyA5b6M44Gr5bqK5LiK44Gr44GE44Gf5aC05omA44KS5L+d5a2YXG4gICAgdGhpcy5sYXN0T25GbG9vclggPSAwO1xuICAgIHRoaXMubGFzdE9uRmxvb3JZID0gMDtcblxuICAgIHRoaXMucmVzZXQoKTtcblxuICAgIC8v44Gv44GX44GU5o6l6Kem5Yik5a6a55SoXG4gICAgdGhpcy5sYWRkZXJDb2xsaXNpb24gPSBEaXNwbGF5RWxlbWVudCh7IHdpZHRoOiAxNiwgaGVpZ2h0OiAyMCB9KS5hZGRDaGlsZFRvKHRoaXMucGFyZW50U2NlbmUuY2hlY2tMYXllcik7XG4gICAgXG4gICAgdGhpcy5iZWZvcmUgPSB7XG4gICAgICAvL+aTjeS9nOezu1xuICAgICAgdXA6IGZhbHNlLFxuICAgICAgZG93bjogZmFsc2UsXG4gICAgICBhdHRhY2s6IGZhbHNlLFxuICAgICAganVtcDogZmFsc2UsXG4gICAgICBjaGFuZ2U6IGZhbHNlLFxuICAgICAgaXNTdHVuOiBmYWxzZSxcbiAgICAgIGlzT25GbG9vcjogZmFsc2UsXG4gICAgICB4OiAwLFxuICAgICAgeTogMCxcbiAgICB9O1xuICB9LFxuXG4gIHVwZGF0ZTogZnVuY3Rpb24oYXBwKSB7XG4gICAgaWYgKHRoaXMucGFyZW50U2NlbmUucGF1c2VTY2VuZSkgcmV0dXJuO1xuXG4gICAgLy/jg5fjg6zjgqTjg6Tjg7zmk43kvZxcbiAgICBsZXQgY3QgPSBhcHAuY29udHJvbGxlcjtcblxuICAgIGlmICghdGhpcy5pc0NvbnRyb2wpIGN0ID0ge307XG4gICAgaWYgKHRoaXMuaXNSZW1vdGVQbGF5ZXIpIHtcbiAgICAgIGlmICh0aGlzLmNvbnRyb2xEYXRhKSB7XG4gICAgICAgIGN0ID0gdGhpcy5jb250cm9sRGF0YTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGN0ID0ge307XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc3RvcFRpbWUgPT0gMCkge1xuICAgICAgLy/lt6bnp7vli5VcbiAgICAgIGlmIChjdC5sZWZ0ICYmICFjdC5kb3duKSB7XG4gICAgICAgIGlmICghdGhpcy5pc0p1bXAgJiYgIXRoaXMuaXNBdHRhY2sgJiYgIXRoaXMuaXNDYXRjaExhZGRlcikgdGhpcy5zZXRBbmltYXRpb24oXCJ3YWxrXCIpO1xuICAgICAgICAvL+OBr+OBl+OBlOaOtOOBv+eKtuaFi+OBp+W3puOBq+WjgeOBjOOBguOCi+WgtOWQiOOBr+S4jeWPr1xuICAgICAgICB2YXIgYyA9IHRoaXMuX2NvbGxpc2lvblszXTtcbiAgICAgICAgaWYgKCEodGhpcy5pc0NhdGNoTGFkZGVyICYmIHRoaXMuY2hlY2tNYXBDb2xsaXNpb24yKGMueCArIDYsIGMueSwgYy53aWR0aCwgYy5oZWlnaHQpKSkge1xuICAgICAgICAgIHRoaXMuc2NhbGVYID0gLTE7XG4gICAgICAgICAgdGhpcy52eCA9IC10aGlzLnNwZWVkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvL+WPs+enu+WLlVxuICAgICAgaWYgKGN0LnJpZ2h0ICYmICFjdC5kb3duKSB7XG4gICAgICAgIGlmICghdGhpcy5pc0p1bXAgJiYgIXRoaXMuaXNBdHRhY2sgJiYgIXRoaXMuaXNDYXRjaExhZGRlcikgdGhpcy5zZXRBbmltYXRpb24oXCJ3YWxrXCIpO1xuICAgICAgICAvL+OBr+OBl+OBlOaOtOOBv+eKtuaFi+OBp+WPs+OBq+WjgeOBjOOBguOCi+WgtOWQiOOBr+S4jeWPr1xuICAgICAgICB2YXIgYyA9IHRoaXMuX2NvbGxpc2lvblsxXTtcbiAgICAgICAgaWYgKCEodGhpcy5pc0NhdGNoTGFkZGVyICYmIHRoaXMuY2hlY2tNYXBDb2xsaXNpb24yKGMueCAtIDYsIGMueSwgYy53aWR0aCwgYy5oZWlnaHQpKSkge1xuICAgICAgICAgIHRoaXMuc2NhbGVYID0gMTtcbiAgICAgICAgICB0aGlzLnZ4ID0gdGhpcy5zcGVlZDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvL+mgreS4iui2s+WFg+OBr+OBl+OBlOaknOefpVxuICAgICAgY29uc3QgaXNIZWFkTGFkZGVyID0gdGhpcy5jaGVja0xhZGRlcih0cnVlKTtcbiAgICAgIGNvbnN0IGlzRm9vdExhZGRlciA9IHRoaXMuY2hlY2tMYWRkZXIoZmFsc2UpO1xuXG4gICAgICAvL+OBr+OBl+OBlOaOtOOBv+eKtuaFi+OBp+aTjeS9nOWIhuWykFxuICAgICAgaWYgKHRoaXMuaXNDYXRjaExhZGRlcikge1xuICAgICAgICBpZiAoY3QudXApIHtcbiAgICAgICAgICB0aGlzLnZ4ID0gMDtcbiAgICAgICAgICB0aGlzLnZ5ID0gLXRoaXMuc3BlZWRBc2NlbmQ7XG4gICAgICAgICAgdmFyIGMgPSB0aGlzLl9jb2xsaXNpb25bMF07XG4gICAgICAgICAgaWYgKCFpc0hlYWRMYWRkZXIgJiYgdGhpcy5jaGVja01hcENvbGxpc2lvbjIoYy54LCBjLnkgLSA2LCBjLndpZHRoLCBjLmhlaWdodCkpIHtcbiAgICAgICAgICAgIHRoaXMudnkgPSAwO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY3QuZG93bikge1xuICAgICAgICAgIHRoaXMudnggPSAwO1xuICAgICAgICAgIHRoaXMudnkgPSB0aGlzLnNwZWVkQXNjZW5kO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvL+OCuOODo+ODs+ODl+ODnOOCv+ODs+OBruOBv1xuICAgICAgICBpZiAoY3QuanVtcCAmJiAhY3QudXApIHtcbiAgICAgICAgICB0aGlzLmp1bXAoZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIC8v5LiK44Kt44O85oq85LiLXG4gICAgICAgIGlmIChjdC51cCkge1xuICAgICAgICAgIHRoaXMuanVtcCh0cnVlKTtcbiAgICAgICAgICAvL+OBr+OBl+OBlOOCkuaYh+OCi++8iOmajuauteOBr+aOpeWcsOaZguOBruOBv++8iVxuICAgICAgICAgIGlmICh0aGlzLmlzT25MYWRkZXIgJiYgIXRoaXMuaXNPblN0YWlycyB8fCB0aGlzLmlzT25GbG9vciAmJiB0aGlzLmlzT25TdGFpcnMpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKFwidXBcIik7XG4gICAgICAgICAgICB0aGlzLnZ4ID0gMDtcbiAgICAgICAgICAgIHRoaXMudnkgPSAwO1xuICAgICAgICAgICAgdGhpcy5pc0NhdGNoTGFkZGVyID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMudGhyb3VnaEZsb29yID0gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy/miYnjgavlhaXjgovvvIjmjqXlnLDmmYLvvIblt6blj7Pjgq3jg7zjgqrjg5XmmYLjga7jgb/vvIlcbiAgICAgICAgICBpZiAoIWN0LmxlZnQgJiYgIWN0LnJpZ2h0ICYmIHRoaXMuaXNPbkZsb29yICYmIHRoaXMuaXNPbkRvb3IgJiYgIXRoaXMuaXNPbkRvb3IuaXNMb2NrICYmICF0aGlzLmlzT25Eb29yLmFscmVhZHkpIHtcbiAgICAgICAgICAgIHRoaXMudnggPSAwO1xuICAgICAgICAgICAgdGhpcy52eSA9IDA7XG4gICAgICAgICAgICB0aGlzLmlzT25Eb29yLmZsYXJlKCdlbnRlcmRvb3InKTtcbiAgICAgICAgICAgIHRoaXMuaXNPbkRvb3IuYWxyZWFkeSA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvL+S4i+OCreODvOaKvOS4i1xuICAgICAgICBpZiAoY3QuZG93bikge1xuICAgICAgICAgIC8v44Gv44GX44GU44KS6ZmN44KK44KLXG4gICAgICAgICAgaWYgKGlzRm9vdExhZGRlcikge1xuICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oXCJ1cFwiKTtcbiAgICAgICAgICAgIHRoaXMudnggPSAwO1xuICAgICAgICAgICAgdGhpcy52eSA9IDA7XG4gICAgICAgICAgICB0aGlzLmlzQ2F0Y2hMYWRkZXIgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy50aHJvdWdoRmxvb3IgPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvL+W6iuOCueODq+ODvFxuICAgICAgICAgIGlmICh0aGlzLmRvd25GcmFtZSA+IDYgJiYgIXRoaXMuanVtcCAmJiAhaXNGb290TGFkZGVyKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc09uRmxvb3IgJiYgIXRoaXMudGhyb3VnaEZsb29yKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGZsb29yID0gdGhpcy5jaGVja01hcENvbGxpc2lvbjIodGhpcy54LCB0aGlzLnkgKyAxNiwgNSwgNSk7XG4gICAgICAgICAgICAgIGlmIChmbG9vciAmJiBmbG9vclswXS5lbmFibGVUaHJvdWdoKSB0aGlzLnRocm91Z2hGbG9vciA9IGZsb29yWzBdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvL+OBr+OBl+OBlOOBi+OCieWkluOCjOOBn+OCieair+WtkOaOtOOBv+eKtuaFi+OCreODo+ODs+OCu+ODq1xuICAgICAgaWYgKHRoaXMuaXNDYXRjaExhZGRlcikge1xuICAgICAgICBpZiAoIXRoaXMuaXNPbkxhZGRlciAmJiAhY3QuZG93biB8fCB0aGlzLmlzT25MYWRkZXIgJiYgIWlzRm9vdExhZGRlciAmJiAhY3QudXApIHtcbiAgICAgICAgICB0aGlzLmlzQ2F0Y2hMYWRkZXIgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuXG4gICAgLy/mlLvmkoNcbiAgICBpZiAoIXRoaXMuaXNBdHRhY2spIHtcbiAgICAgIGlmICh0aGlzLmlzT25GbG9vcikge1xuICAgICAgICBpZiAodGhpcy5ub3dBbmltYXRpb24gIT0gXCJkYW1hZ2VcIiAmJiAhdGhpcy5pc0RlZmVuc2UpIHRoaXMuc2V0QW5pbWF0aW9uKFwid2Fsa1wiKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5pc0NhdGNoTGFkZGVyKSB7XG4gICAgICAgIGlmIChjdC51cCkge1xuICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oXCJ1cFwiKTtcbiAgICAgICAgfSBlbHNlIGlmIChjdC5kb3duKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc09uU3RhaXJzKSB7XG4gICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKFwiZG93blwiKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKFwidXBcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICghdGhpcy5pc1N0dW4gJiYgIXRoaXMuaXNEZWFkKSB0aGlzLnNldEFuaW1hdGlvbihcImp1bXBcIik7XG4gICAgICB9XG4gICAgICBpZiAoY3QuYXR0YWNrICYmICF0aGlzLmJlZm9yZS5hdHRhY2sgJiYgdGhpcy5zdG9wVGltZSA9PSAwICYmICEodGhpcy5pc0NhdGNoTGFkZGVyICYmIHRoaXMuaXNPbkxhZGRlcikpIHtcbiAgICAgICAgdGhpcy5pc0NhdGNoTGFkZGVyID0gZmFsc2U7XG4gICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKFwiYXR0YWNrXCIpO1xuICAgICAgICB0aGlzLndlYXBvbkF0dGFjaygpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8v5q275Lqh54q25oWLXG4gICAgaWYgKHRoaXMuaXNEZWFkKSB7XG4gICAgICB0aGlzLnNldEFuaW1hdGlvbihcImRlYWRcIik7XG4gICAgICB0aGlzLmlzQ2F0Y2hMYWRkZXIgPSBmYWxzZTtcbiAgICB9XG5cbiAgICAvL+OCouODi+ODoeODvOOCt+ODp+ODs+WkieabtOOCkuaknOefpVxuICAgIGlmICh0aGlzLm5vd0FuaW1hdGlvbiAhPSB0aGlzLmJlZm9yZUFuaW1hdGlvbikge1xuICAgICAgdGhpcy50aW1lID0gMDtcbiAgICAgIHRoaXMuaXNBZHZhbmNlQW5pbWF0aW9uID0gdHJ1ZTtcbiAgICAgIHRoaXMuYW5pbWF0aW9uSW50ZXJ2YWwgPSAxMjtcbiAgICAgIGlmICh0aGlzLm5vd0FuaW1hdGlvbiA9PSBcImF0dGFja1wiKSB0aGlzLmFuaW1hdGlvbkludGVydmFsID0gNDtcbiAgICAgIGlmICh0aGlzLm5vd0FuaW1hdGlvbiA9PSBcImRlZmVuc2VcIikgdGhpcy5hbmltYXRpb25JbnRlcnZhbCA9IDI7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8v5q2p6KGM44Ki44OL44Oh44O844K344On44Oz44Gu5aC05ZCI44Gv56e75YuV44GX44Gm44GE44KL5pmC44Gu44G/6YCy44KB44KLXG4gICAgICBpZiAodGhpcy5ub3dBbmltYXRpb24gPT0gXCJ3YWxrXCIgJiYgIWN0LmxlZnQgJiYgIWN0LnJpZ2h0KSB7XG4gICAgICAgIHRoaXMuaXNBZHZhbmNlQW5pbWF0aW9uID0gZmFsc2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmlzQWR2YW5jZUFuaW1hdGlvbiA9IHRydWU7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5ub3dBbmltYXRpb24gPT0gXCJ1cFwiIHx8IHRoaXMubm93QW5pbWF0aW9uID09IFwiZG93blwiKSB7XG4gICAgICAgIGlmIChjdC51cCB8fCBjdC5kb3duIHx8IGN0LmxlZnQgfHwgY3QucmlnaHQpIHtcbiAgICAgICAgICAgIHRoaXMuaXNBZHZhbmNlQW5pbWF0aW9uID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaXNBZHZhbmNlQW5pbWF0aW9uID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvL+aUu+aSg+WIpOWumui/veW+k1xuICAgIHRoaXMuYXR0YWNrQ29sbGlzaW9uLnggPSB0aGlzLnggKyB0aGlzLnNjYWxlWCAqIDEyO1xuICAgIHRoaXMuYXR0YWNrQ29sbGlzaW9uLnkgPSB0aGlzLnk7XG5cbiAgICAvL+OCs+ODs+ODiOODreODvOODqeS7luaDheWgseS/neWtmFxuICAgIHRoaXMuYmVmb3JlLnVwID0gY3QudXA7XG4gICAgdGhpcy5iZWZvcmUuZG93biA9IGN0LmRvd247XG4gICAgdGhpcy5iZWZvcmUuYXR0YWNrID0gY3QuYXR0YWNrO1xuICAgIHRoaXMuYmVmb3JlLmp1bXAgPSBjdC51cCB8fCBjdC5qdW1wO1xuICAgIHRoaXMuYmVmb3JlLmNoYW5nZSA9IGN0LmNoYW5nZTtcbiAgICB0aGlzLmJlZm9yZS5pc1N0dW4gPSB0aGlzLmlzU3R1bjtcbiAgICB0aGlzLmJlZm9yZS5pbk9uRmxvb3IgPSB0aGlzLmlzT25GbG9vcjtcbiAgICB0aGlzLmJlZm9yZS54ID0gdGhpcy54O1xuICAgIHRoaXMuYmVmb3JlLnkgPSB0aGlzLnk7XG4gIH0sXG5cbiAganVtcDogZnVuY3Rpb24oaXNVcCkge1xuICAgIC8v44K444Oj44Oz44OX5LqM5q6155uu5Lul6ZmNXG4gICAgaWYgKCF0aGlzLmJlZm9yZS5qdW1wICYmIHRoaXMuaXNKdW1wICYmIHRoaXMubnVtSnVtcCA8IHRoaXMubnVtSnVtcE1heCAmJiB0aGlzLnZ5ID4gLSh0aGlzLmp1bXBQb3dlciAvIDIpKSB7XG4gICAgICB0aGlzLnZ5ID0gLXRoaXMuanVtcFBvd2VyO1xuICAgICAgdGhpcy5udW1KdW1wKys7XG4gICAgfVxuICAgIC8v44K444Oj44Oz44OXXG4gICAgY29uc3QgY2hrID0gdGhpcy5jaGVja01hcENvbGxpc2lvbjIodGhpcy54LCB0aGlzLnkgLSAxNiwgNSwgMyk7XG4gICAgY29uc3QgcmVzID0gaXNVcCA/ICF0aGlzLmlzSnVtcCAmJiB0aGlzLmlzT25GbG9vciAmJiAhdGhpcy5pc09uTGFkZGVyICYmICFjaGsgOiAhdGhpcy5pc0p1bXAgJiYgdGhpcy5pc09uRmxvb3IgJiYgIWNoaztcbiAgICBpZiAocmVzKSB7XG4gICAgICB0aGlzLnNldEFuaW1hdGlvbihcImp1bXBcIik7XG4gICAgICB0aGlzLmlzSnVtcCA9IHRydWU7XG4gICAgICB0aGlzLnZ5ID0gLXRoaXMuanVtcFBvd2VyO1xuICAgICAgdGhpcy5udW1KdW1wID0gMTtcbiAgICB9XG4gIH0sXG5cbiAgLy/jg5fjg6zjgqTjg6Tjg7zmg4XloLHjg6rjgrvjg4Pjg4hcbiAgcmVzZXQ6IGZ1bmN0aW9uKCkge1xuICAgIC8v56e75YuV5oOF5aCxXG4gICAgdGhpcy52eCA9IDA7XG4gICAgdGhpcy52eSA9IDA7XG5cbiAgICAvL+OCueODhuODvOOCv+OCuVxuICAgIHRoaXMuaHAgPSB0aGlzLmhwTWF4O1xuXG4gICAgLy/lkITnqK7jg5Xjg6njgrBcbiAgICB0aGlzLmlzSnVtcCA9IGZhbHNlO1xuICAgIHRoaXMuaXNEZWFkID0gZmFsc2U7XG4gICAgdGhpcy5pc0NhdGNoTGFkZGVyID0gZmFsc2U7XG4gICAgdGhpcy5pc0Ryb3AgPSBmYWxzZTtcbiAgICB0aGlzLmlzT25GbG9vciA9IGZhbHNlO1xuICAgIHRoaXMuaXNBZHZhbmNlQW5pbWF0aW9uID0gdHJ1ZTtcbiAgICB0aGlzLmlnbm9yZUNvbGxpc2lvbiA9IGZhbHNlO1xuXG4gICAgLy/ntYzpgY7mmYLplpPns7tcbiAgICB0aGlzLm11dGVraVRpbWUgPSAwO1xuICAgIHRoaXMuc3RvcFRpbWUgPSAwO1xuICAgIHRoaXMuZG93bkZyYW1lID0gMDtcbiAgICB0aGlzLnRpbWUgPSAwO1xuXG4gICAgLy/jgqLjg4vjg6Hjg7zjgrfjg6fjg7NcbiAgICB0aGlzLnNldEFuaW1hdGlvbihcIndhbGtcIik7XG4gICAgdGhpcy5iZWZvcmVBbmltYXRpb24gPSBcIlwiO1xuICAgIHRoaXMuYW5pbWF0aW9uSW50ZXJ2YWwgPSAxMjtcblxuICAgIC8v5omA5oyB6KOF5YKZXG4gICAgdGhpcy5lcXVpcCA9IHtcbiAgICAgIHVzaW5nOiAwLCAgICAgICAvL+ePvuWcqOS9v+eUqOS4re+8iHdlYXBvbnPjga5pbmRleO+8iVxuICAgICAgd2VhcG9uczogWzBdLCAgIC8v5omA5oyB44Oq44K544OI77yI5pyA5aSn77yT77yJXG4gICAgICBsZXZlbDogWzBdLCAgICAgLy/mrablmajjg6zjg5njg6tcbiAgICAgIHN3aXRjaE9rOiB0cnVlLCAgIC8v5aSJ5pu05Y+v6IO944OV44Op44KwXG4gICAgfTtcblxuICAgIC8v5q2m5Zmo44K744OD44OIXG4gICAgdGhpcy5zZXRXZWFwb24odGhpcy5lcXVpcC53ZWFwb25zW3RoaXMuZXF1aXAudXNpbmddKTtcblxuICAgIC8v5omA5oyB44Ki44Kk44OG44OgXG4gICAgdGhpcy5pdGVtcyA9IFtdO1xuXG4gICAgLy/miYDmjIHjgq/jg6rjgqLmnaHku7bjgq3jg7xcbiAgICB0aGlzLmtleXMgPSBbXTtcblxuICAgIC8v5pON5L2c5Y+v6IO944OV44Op44KwXG4gICAgdGhpcy5pc0NvbnRyb2wgPSB0cnVlO1xuXG4gICAgLy/lpJrmrrXjgrjjg6Pjg7Pjg5fmnIDlpKflm57mlbBcbiAgICB0aGlzLm51bUp1bXBNYXggPSAyO1xuXG4gICAgLy/jg4Djg5/jg7zjgrnjg5fjg6njgqTjg4jpmaTljrtcbiAgICBpZiAodGhpcy5kdW1teSkge1xuICAgICAgdGhpcy5kdW1teS5yZW1vdmUoKTtcbiAgICAgIHRoaXMuZHVtbXkgPSBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIC8v5q2m5Zmo5aSJ5pu0XG4gIHNldFdlYXBvbjogZnVuY3Rpb24oa2luZCwgbGV2ZWwpIHtcbiAgICBraW5kID0ga2luZCB8fCAwO1xuICAgIGxldmVsID0gbGV2ZWwgfHwgMDtcblxuICAgIC8v5bGe5oCn5Yid5pyf5YyWXG4gICAgdGhpcy5hdHRhY2tDb2xsaXNpb24uJGV4dGVuZCh7XG4gICAgICBpc1NsYXNoOiBmYWxzZSxcbiAgICAgIGlzU3Rpbmc6IGZhbHNlLFxuICAgICAgaXNCbG93OiBmYWxzZSxcbiAgICAgIGlzQXJyb3c6IGZhbHNlLFxuICAgICAgaXNGaXJlOiBmYWxzZSxcbiAgICAgIGlzSWNlOiBmYWxzZSxcbiAgICAgIHN0dW5Qb3dlcjogMSxcbiAgICB9KTtcblxuICAgIC8v44Ki44Kk44OG44Og5oOF5aCx5Y+W5b6XXG4gICAgdmFyIHNwZWMgPSBJdGVtSW5mby5nZXQoa2luZCk7XG4gICAgdGhpcy5hdHRhY2tDb2xsaXNpb24uJGV4dGVuZChzcGVjKTtcbiAgICB0aGlzLmF0dGFja0NvbGxpc2lvbi5wb3dlciArPSBsZXZlbCAqIChzcGVjLmxldmVsQm9udXMgfHwgMik7XG5cbiAgICBzd2l0Y2ggKGtpbmQpIHtcbiAgICAgIGNhc2UgMDpcbiAgICAgICAgLy/jgrfjg6fjg7zjg4jjgr3jg7zjg4lcbiAgICAgICAgbGV2ZWwgPSAwO1xuICAgICAgICB0aGlzLmZyYW1lW1wiYXR0YWNrXCJdID0gWyA0MSwgNDIsIDQzLCA0NCwgXCJzdG9wXCJdO1xuICAgICAgICB0aGlzLndlYXBvbi5zZXRQb3NpdGlvbigtMywgMyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAxOlxuICAgICAgICAvL+ODreODs+OCsOOCveODvOODiVxuICAgICAgICB0aGlzLmZyYW1lW1wiYXR0YWNrXCJdID0gWyA0MSwgNDIsIDQzLCA0NCwgXCJzdG9wXCJdO1xuICAgICAgICB0aGlzLndlYXBvbi5zZXRQb3NpdGlvbigtMywgMyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICAvL+aWp1xuICAgICAgICB0aGlzLmZyYW1lW1wiYXR0YWNrXCJdID0gWyA0NCwgNDQsIDQ0LCA0MywgNDMsIDQzLCA0MiwgNDIsIDQyLCA0MSwgNDEsIDQxLCBcInN0b3BcIl07XG4gICAgICAgIHRoaXMud2VhcG9uLnNldFBvc2l0aW9uKC0zLCAzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIC8v5qeNXG4gICAgICAgIHRoaXMuZnJhbWVbXCJhdHRhY2tcIl0gPSBbIDQxLCA0MiwgNDMsIDQ0LCBcInN0b3BcIl07XG4gICAgICAgIHRoaXMud2VhcG9uLnNldFBvc2l0aW9uKDAsIDApO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgNDpcbiAgICAgICAgLy/lvJNcbiAgICAgICAgbGV2ZWwgPSAwO1xuICAgICAgICB0aGlzLmZyYW1lW1wiYXR0YWNrXCJdID0gWyA0MSwgNDIsIDQzLCA0NCwgXCJzdG9wXCJdO1xuICAgICAgICB0aGlzLndlYXBvbi5zZXRQb3NpdGlvbigwLCAwKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDU6XG4gICAgICAgIC8v6a2U5rOV44Gu5p2WXG4gICAgICAgIHRoaXMuZnJhbWVbXCJhdHRhY2tcIl0gPSBbIDQxLCA0MiwgNDMsIDQ0LCBcInN0b3BcIl07XG4gICAgICAgIHRoaXMud2VhcG9uLnNldFBvc2l0aW9uKDAsIDApO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgNjpcbiAgICAgICAgLy/prZTlsI7mm7hcbiAgICAgICAgdGhpcy5mcmFtZVtcImF0dGFja1wiXSA9IFsgNDQsIDQ0LCA0NCwgNDMsIDQzLCA0MywgNDIsIDQyLCA0MiwgNDEsIDQxLCA0MSwgXCJzdG9wXCJdO1xuICAgICAgICB0aGlzLndlYXBvbi5zZXRQb3NpdGlvbigtMywgMyk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIC8v5q2m5Zmo55S75YOP6Kit5a6aXG4gICAgdmFyIGluZGV4ID0ga2luZCAqIDEwICsgTWF0aC5taW4obGV2ZWwsIHNwZWMubWF4SW5kZXgpO1xuICAgIHRoaXMud2VhcG9uLnNldEZyYW1lSW5kZXgoaW5kZXgpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLy/oo4XlgpnmrablmajjgavjgojjgormlLvmkoPjg6Ljg7zjgrfjg6fjg7PjgpLlpInjgYjjgotcbiAgd2VhcG9uQXR0YWNrOiBmdW5jdGlvbigpIHtcbiAgICB2YXIga2luZCA9IHRoaXMuZXF1aXAud2VhcG9uc1t0aGlzLmVxdWlwLnVzaW5nXTtcbiAgICB2YXIgbGV2ZWwgPSB0aGlzLmVxdWlwLmxldmVsW3RoaXMuZXF1aXAudXNpbmddO1xuICAgIHRoaXMuaXNBdHRhY2sgPSB0cnVlO1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICBzd2l0Y2ggKGtpbmQpIHtcbiAgICAgIGNhc2UgMDpcbiAgICAgICAgLy/jgrfjg6fjg7zjg4jjgr3jg7zjg4lcbiAgICAgICAgU291bmRNYW5hZ2VyLnBsYXkoXCJzbGFzaFwiKTtcbiAgICAgICAgdGhpcy53ZWFwb24udHdlZW5lci5jbGVhcigpXG4gICAgICAgICAgICAuc2V0KHtyb3RhdGlvbjogMjAwLCBhbHBoYTogMS4wfSlcbiAgICAgICAgICAgIC50byh7cm90YXRpb246IDM2MH0sIDEwKVxuICAgICAgICAgICAgLmZhZGVPdXQoMSlcbiAgICAgICAgICAgIC5jYWxsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICB0aGF0LmlzQXR0YWNrID0gZmFsc2U7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIC8v44Ot44Oz44Kw44K944O844OJXG4gICAgICAgIHRoaXMud2VhcG9uLnR3ZWVuZXIuY2xlYXIoKVxuICAgICAgICAgICAgLnNldCh7cm90YXRpb246IDIwMCwgYWxwaGE6IDEuMH0pXG4gICAgICAgICAgICAudG8oe3JvdGF0aW9uOiAzNjB9LCAxMilcbiAgICAgICAgICAgIC5mYWRlT3V0KDEpXG4gICAgICAgICAgICAuY2FsbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgdGhhdC5pc0F0dGFjayA9IGZhbHNlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICAvL+aWp1xuICAgICAgICB0aGlzLndlYXBvbi50d2VlbmVyLmNsZWFyKClcbiAgICAgICAgICAgIC5zZXQoe3JvdGF0aW9uOiA0MDAsIGFscGhhOiAxLjB9KVxuICAgICAgICAgICAgLnRvKHtyb3RhdGlvbjogMjcwfSwgMTYpXG4gICAgICAgICAgICAuZmFkZU91dCgxKVxuICAgICAgICAgICAgLmNhbGwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHRoYXQuaXNBdHRhY2sgPSBmYWxzZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgLy/mp41cbiAgICAgICAgdGhpcy53ZWFwb24udHdlZW5lci5jbGVhcigpXG4gICAgICAgICAgICAuc2V0KHtyb3RhdGlvbjogLTQ1LCBhbHBoYTogMS4wfSlcbiAgICAgICAgICAgIC5ieSh7eDogLTEwfSwgNClcbiAgICAgICAgICAgIC5ieSh7eDogMTB9LCA0KVxuICAgICAgICAgICAgLmZhZGVPdXQoMSlcbiAgICAgICAgICAgIC5jYWxsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICB0aGF0LmlzQXR0YWNrID0gZmFsc2U7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDQ6XG4gICAgICAgIC8v5byTXG4gICAgICAgIHRoaXMud2VhcG9uLnR3ZWVuZXIuY2xlYXIoKVxuICAgICAgICAgICAgLnNldCh7cm90YXRpb246IC00NSwgYWxwaGE6IDEuMH0pXG4gICAgICAgICAgICAuYnkoe3g6IDd9LCA2KVxuICAgICAgICAgICAgLmJ5KHt4OiAtN30sIDYpXG4gICAgICAgICAgICAuZmFkZU91dCgxKVxuICAgICAgICAgICAgLmNhbGwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHRoYXQuaXNBdHRhY2sgPSBmYWxzZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIGFycm93UG93ZXIgPSA1ICsgbGV2ZWwgKiAyO1xuICAgICAgICAgICAgdmFyIGFycm93ID0gUGxheWVyQXR0YWNrKHRoaXMucGFyZW50U2NlbmUsIHt3aWR0aDogMTUsIGhlaWdodDogMTAsIHBvd2VyOiBhcnJvd1Bvd2VyLCB0eXBlOiBcImFycm93XCJ9KVxuICAgICAgICAgICAgICAuYWRkQ2hpbGRUbyh0aGlzLnBhcmVudFNjZW5lLnBsYXllckxheWVyKVxuICAgICAgICAgICAgICAuc2V0U2NhbGUodGhpcy5zY2FsZVgsIDEpXG4gICAgICAgICAgICAgIC5zZXRQb3NpdGlvbih0aGlzLngsIHRoaXMueSk7XG4gICAgICAgICAgICBhcnJvdy50d2VlbmVyLnNldFVwZGF0ZVR5cGUoJ2ZwcycpLmNsZWFyKClcbiAgICAgICAgICAgICAgLmJ5KHt4OiAoMTUwICsgbGV2ZWwgKiA1KSAqIHRoaXMuc2NhbGVYfSwgNylcbiAgICAgICAgICAgICAgLmNhbGwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgfS5iaW5kKGFycm93KSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSA1OlxuICAgICAgICAvL+mtlOazleOBruadllxuICAgICAgICB0aGlzLndlYXBvbi50d2VlbmVyLmNsZWFyKClcbiAgICAgICAgICAgIC5zZXQoe3JvdGF0aW9uOiAyMDAsIGFscGhhOiAxLjB9KVxuICAgICAgICAgICAgLnRvKHtyb3RhdGlvbjogMzYwfSwgMTYpXG4gICAgICAgICAgICAuZmFkZU91dCgxKVxuICAgICAgICAgICAgLmNhbGwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHRoYXQuaXNBdHRhY2sgPSBmYWxzZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB2YXIgbWFnaWNQb3dlciA9IDE1ICsgbGV2ZWwgKiAyO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDY7IGkrKykge1xuICAgICAgICAgICAgdmFyIG1hZ2ljID0gUGxheWVyQXR0YWNrKHRoaXMucGFyZW50U2NlbmUsIHt3aWR0aDogMTUsIGhlaWdodDogMTAsIGluZGV4OiAzMCwgcG93ZXI6IG1hZ2ljUG93ZXIsIHR5cGU6IFwiZmxhbWVcIn0pXG4gICAgICAgICAgICAgIC5hZGRDaGlsZFRvKHRoaXMucGFyZW50U2NlbmUucGxheWVyTGF5ZXIpXG4gICAgICAgICAgICAgIC5zZXRTY2FsZSh0aGlzLnNjYWxlWCwgMSk7XG4gICAgICAgICAgICBtYWdpYy5yYWQgPSAoOTAgLSBpICogMzApLnRvUmFkaWFuKCk7XG4gICAgICAgICAgICBtYWdpYy5pc0NvbGxpc2lvbiA9IGZhbHNlO1xuICAgICAgICAgICAgbWFnaWMudmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgbWFnaWMudHdlZW5lci5zZXRVcGRhdGVUeXBlKCdmcHMnKS5jbGVhcigpXG4gICAgICAgICAgICAgIC53YWl0KGkpXG4gICAgICAgICAgICAgIC5jYWxsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNDb2xsaXNpb24gPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgdmFyIG14ID0gTWF0aC5jb3ModGhpcy5yYWQpICogdGhhdC5zY2FsZVg7XG4gICAgICAgICAgICAgICAgdmFyIG15ID0gTWF0aC5zaW4odGhpcy5yYWQpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0UG9zaXRpb24odGhhdC54ICsgMzIgKiBteCwgdGhhdC55ICsgMzIgKiBteSk7XG4gICAgICAgICAgICAgIH0uYmluZChtYWdpYykpXG4gICAgICAgICAgICAgIC53YWl0KDgpXG4gICAgICAgICAgICAgIC5jYWxsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlKCk7XG4gICAgICAgICAgICAgIH0uYmluZChtYWdpYykpO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSA2OlxuICAgICAgICAvL+mtlOWwjuabuFxuICAgICAgICB0aGlzLndlYXBvbi50d2VlbmVyLmNsZWFyKClcbiAgICAgICAgICAgIC5zZXQoe3JvdGF0aW9uOiA0MDAsIGFscGhhOiAxLjB9KVxuICAgICAgICAgICAgLnRvKHtyb3RhdGlvbjogMjcwfSwgMTYpXG4gICAgICAgICAgICAuZmFkZU91dCgxKVxuICAgICAgICAgICAgLmNhbGwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHRoYXQuaXNBdHRhY2sgPSBmYWxzZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgc2V0dXBBbmltYXRpb246IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3BjaWFsQW5pbWF0aW9uID0gZmFsc2U7XG4gICAgdGhpcy5mcmFtZSA9IFtdO1xuICAgIHRoaXMuZnJhbWVbXCJzdGFuZFwiXSA9IFsxMywgMTRdO1xuICAgIHRoaXMuZnJhbWVbXCJqdW1wXCJdID0gWzM2LCBcInN0b3BcIl07XG4gICAgdGhpcy5mcmFtZVtcIndhbGtcIl0gPSBbIDMsICA0LCAgNSwgIDRdO1xuICAgIHRoaXMuZnJhbWVbXCJ1cFwiXSA9ICAgWyA5LCAxMCwgMTEsIDEwXTtcbiAgICB0aGlzLmZyYW1lW1wiZG93blwiXSA9IFsgMCwgIDEsICAyLCAgMV07XG4gICAgdGhpcy5mcmFtZVtcImF0dGFja1wiXSA9IFsgNDEsIDQyLCA0MywgNDQsIFwic3RvcFwiXTtcbiAgICB0aGlzLmZyYW1lW1wiZGVmZW5zZVwiXSA9IFsgNDEsIDQyLCA0MywgNDQsIFwic3RvcFwiXTtcbiAgICB0aGlzLmZyYW1lW1wiZGFtYWdlXCJdID0gWyAxOCwgMTksIDIwXTtcbiAgICB0aGlzLmZyYW1lW1wiZHJvcFwiXSA9IFsxOCwgMTksIDIwXTtcbiAgICB0aGlzLmZyYW1lW1wiZGVhZFwiXSA9IFsxOCwgMTksIDIwLCAzMywgMzQsIDM1LCBcInN0b3BcIl07XG4gICAgdGhpcy5mcmFtZVtcImNsZWFyXCJdID0gWzI0LCAyNSwgMjZdO1xuICAgIHRoaXMuZnJhbWVbXCJzdHVuXCJdID0gWyAxOCwgMTksIDIwXTtcbiAgICB0aGlzLmluZGV4ID0gMDtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvL+W9k+OBn+OCiuWIpOWumueUqOOCqOODrOODoeODs+ODiOOBruS9jee9ruWGjeOCu+ODg+ODiFxuICByZXNldENvbGxpc2lvblBvc2l0aW9uOiBmdW5jdGlvbigpIHtcbiAgICBjb25zdCB3ID0gTWF0aC5mbG9vcih0aGlzLndpZHRoIC8gMikgKyAxMDtcbiAgICBjb25zdCBoID0gTWF0aC5mbG9vcih0aGlzLmhlaWdodCAvIDIpICsgMTA7XG4gICAgdGhpcy5fY29sbGlzaW9uWzBdLnNldFBvc2l0aW9uKHRoaXMueCwgdGhpcy55IC0gaCk7ICAgICAvL+ecn+S4i1xuICAgIHRoaXMuX2NvbGxpc2lvblsxXS5zZXRQb3NpdGlvbih0aGlzLnggKyB3LCB0aGlzLnkgLSA1KTsgLy/lt6bkuItcbiAgICB0aGlzLl9jb2xsaXNpb25bMl0uc2V0UG9zaXRpb24odGhpcy54LCB0aGlzLnkgKyBoKTsgICAgIC8v55yf5LiKXG4gICAgdGhpcy5fY29sbGlzaW9uWzNdLnNldFBvc2l0aW9uKHRoaXMueCAtIHcsIHRoaXMueSAtIDUpOyAvL+WPs+S4i1xuICAgIHRoaXMubGFkZGVyQ29sbGlzaW9uLnNldFBvc2l0aW9uKHRoaXMueCwgdGhpcy55KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvL+mgreS4ii/otrPlhYPjga/jgZfjgZTjg4Hjgqfjg4Pjgq9cbiAgY2hlY2tMYWRkZXI6IGZ1bmN0aW9uKGlzSGVhZCkge1xuICAgIGNvbnN0IGMgPSBpc0hlYWQgPyB0aGlzLl9jb2xsaXNpb25bMl0gOiB0aGlzLl9jb2xsaXNpb25bMF07XG4gICAgbGV0IHJldCA9IG51bGw7XG4gICAgdGhpcy5wYXJlbnRTY2VuZS5jb2xsaXNpb25MYXllci5jaGlsZHJlbi5mb3JFYWNoKGUgPT4ge1xuICAgICAgaWYgKGUuaGl0VGVzdEVsZW1lbnQoYykpIHtcbiAgICAgICAgaWYgKGUudHlwZSA9PSBcImxhZGRlclwiIHx8IGUudHlwZSA9PSBcInN0YWlyc1wiKSByZXQgPSBlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXQ7XG4gIH0sXG5cbiAgc2V0Q29udHJvbERhdGE6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICB0aGlzLmNvbnRyb2xEYXRhID0gZGF0YTtcbiAgfSxcbn0pO1xuIiwicGhpbmEuZGVmaW5lKFwiUGxheWVyQXR0YWNrXCIsIHtcbiAgc3VwZXJDbGFzczogXCJEaXNwbGF5RWxlbWVudFwiLFxuXG4gIC8v5pS75pKD5YqbXG4gIHBvd2VyOiAxLFxuXG4gIC8v5b2T44Gf44KK5Yik5a6a55m655Sf44OV44Op44KwXG4gIGlzQ29sbGlzaW9uOiB0cnVlLFxuXG4gIC8v5bGe5oCnXG4gIGlzU2xhc2g6IGZhbHNlLFxuICBpc1N0aW5nOiBmYWxzZSxcbiAgaXNCbG93OiBmYWxzZSxcbiAgaXNBcnJvdzogZmFsc2UsXG4gIGlzRmlyZTogZmFsc2UsXG4gIGlzSWNlOiBmYWxzZSxcblxuICBpbml0OiBmdW5jdGlvbihwYXJlbnRTY2VuZSwgb3B0aW9ucykge1xuICAgIHRoaXMuc3VwZXJJbml0KG9wdGlvbnMpO1xuICAgIHRoaXMucGFyZW50U2NlbmUgPSBwYXJlbnRTY2VuZTtcblxuICAgIHRoaXMudHlwZSA9IG9wdGlvbnMudHlwZSB8fCBcImFycm93XCI7XG4gICAgdGhpcy5wb3dlciA9IG9wdGlvbnMucG93ZXIgfHwgMDtcbiAgICB0aGlzLnRpbWUgPSAwO1xuICAgIHRoaXMuaW5kZXggPSAwO1xuXG4gICAgLy/ooajnpLrjgrnjg5fjg6njgqTjg4hcbiAgICBzd2l0Y2ggKHRoaXMudHlwZSkge1xuICAgICAgY2FzZSBcImFycm93XCI6XG4gICAgICAgIHRoaXMuc3ByaXRlID0gU3ByaXRlKFwid2VhcG9uc1wiLCAyNCwgMjQpLmFkZENoaWxkVG8odGhpcykuc2V0RnJhbWVJbmRleCgxKTtcbiAgICAgICAgdGhpcy5mcmFtZSA9IFsxXTtcbiAgICAgICAgdGhpcy5pc0Fycm93ID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5pc1N0aW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zdHVuUG93ZXIgPSAxMDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwiZmlyZWJhbGxcIjpcbiAgICAgICAgdGhpcy5zcHJpdGUgPSBTcHJpdGUoXCJidWxsZXRcIiwgMjQsIDMyKS5hZGRDaGlsZFRvKHRoaXMpLnNldEZyYW1lSW5kZXgoOSk7XG4gICAgICAgIHRoaXMuZnJhbWUgPSBbOSwgMTAsIDExLCAxMF07XG4gICAgICAgIHRoaXMuaXNGaXJlID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwibWFzYWthcmlcIjpcbiAgICAgICAgdGhpcy5zcHJpdGUgPSBTcHJpdGUoXCJ3ZWFwb25zXCIsIDI0LCAyNCkuYWRkQ2hpbGRUbyh0aGlzKS5zZXRGcmFtZUluZGV4KDIwKTtcbiAgICAgICAgdGhpcy5mcmFtZSA9IFsyMF07XG4gICAgICAgIHRoaXMuaXNTbGFzaCA9IHRydWU7XG4gICAgICAgIHRoaXMuaXNCcm93ID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zdHVuUG93ZXIgPSA1MDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwiZGFnZ2VyXCI6XG4gICAgICAgIHRoaXMuc3ByaXRlID0gU3ByaXRlKFwid2VhcG9uc1wiLCAyNCwgMjQpLmFkZENoaWxkVG8odGhpcykuc2V0RnJhbWVJbmRleCgyMCk7XG4gICAgICAgIHRoaXMuc3ByaXRlLnJvdGF0aW9uID0gMTM1O1xuICAgICAgICB0aGlzLmZyYW1lID0gWzBdO1xuICAgICAgICB0aGlzLmlzU3RpbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLnN0dW5Qb3dlciA9IDE7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImZsYW1lXCI6XG4gICAgICAgIHRoaXMuc3ByaXRlID0gU3ByaXRlKFwiZWZmZWN0XCIsIDQ4LCA0OClcbiAgICAgICAgICAuYWRkQ2hpbGRUbyh0aGlzKVxuICAgICAgICAgIC5zZXRGcmFtZVRyaW1taW5nKDAsIDE5MiwgMTkyLCA5NilcbiAgICAgICAgICAuc2V0U2NhbGUoMC41KTtcbiAgICAgICAgdGhpcy5mcmFtZSA9IFswLCAxLCAyLCAzLCA0LCA1LCA2LCA3LCA4XTtcbiAgICAgICAgdGhpcy5pc0ZpcmUgPSB0cnVlO1xuICAgICAgICB0aGlzLnN0dW5Qb3dlciA9IDE7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChERUJVR19DT0xMSVNJT04pIHtcbiAgICAgIFJlY3RhbmdsZVNoYXBlKHt3aWR0aDogdGhpcy53aWR0aCwgaGVpZ2h0OiB0aGlzLmhlaWdodH0pLmFkZENoaWxkVG8odGhpcykuc2V0QWxwaGEoMC41KTtcbiAgICB9XG4gIH0sXG5cbiAgdXBkYXRlOiBmdW5jdGlvbihhcHApIHtcbiAgICBpZiAoIXRoaXMuaXNDb2xsaXNpb24gfHwgdGhpcy50eXBlID09IFwiZXhwbG9kZVwiKSByZXR1cm47XG5cbiAgICBpZiAodGhpcy50aW1lICUgMyA9PSAwKSB7XG4gICAgICB0aGlzLnNwcml0ZS5zZXRGcmFtZUluZGV4KHRoaXMuZnJhbWVbdGhpcy5pbmRleF0pO1xuICAgICAgdGhpcy5pbmRleCA9ICh0aGlzLmluZGV4ICsgMSkgJSB0aGlzLmZyYW1lLmxlbmd0aDtcbiAgICB9XG4gICAgaWYgKHRoaXMudHlwZSA9PSBcImZsYW1lXCIpIHJldHVybjtcblxuICAgIC8v5Zyw5b2i5o6l6Kem5Yik5a6aXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucGFyZW50U2NlbmUuY29sbGlzaW9uTGF5ZXIuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihlKSB7XG4gICAgICBpZiAoZS50eXBlID09IFwibGFkZGVyXCIgfHwgZS50eXBlID09IFwic3RhaXJzXCIpIHJldHVybjtcbiAgICAgIGlmICh0aGlzLmhpdFRlc3RFbGVtZW50KGUpKSB7XG4gICAgICAgIHRoaXMuaXNDb2xsaXNpb24gPSBmYWxzZTtcbiAgICAgICAgc3dpdGNoICh0aGlzLnR5cGUpIHtcbiAgICAgICAgICBjYXNlIFwiYXJyb3dcIjpcbiAgICAgICAgICAgIHRoaXMuc3RpY2soZSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIFwiZmlyZWJhbGxcIjpcbiAgICAgICAgICAgIHRoaXMuZXhwbG9kZShlKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMudGltZSsrO1xuICB9LFxuXG4gIC8v44OS44OD44OI5b6M5Yem55CGXG4gIGhpdDogZnVuY3Rpb24odGFyZ2V0KSB7XG4gICAgc3dpdGNoICh0aGlzLnR5cGUpIHtcbiAgICAgIGNhc2UgXCJmaXJlYmFsbFwiOlxuICAgICAgICB0aGlzLmV4cGxvZGUodGFyZ2V0KTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9LFxuXG4gIC8v5Yi644GV44KLXG4gIHN0aWNrOiBmdW5jdGlvbihlKSB7XG4gICAgLy/lirnmnpzpn7NcbiAgICBzd2l0Y2ggKHRoaXMudHlwZSkge1xuICAgICAgY2FzZSBcImFycm93XCI6XG4gICAgICAgIGFwcC5wbGF5U0UoXCJhcnJvd3N0aWNrXCIpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJtYXNha2FyaVwiOlxuICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zY2FsZVggPT0gMSkge1xuICAgICAgdGhpcy54ID0gZS5sZWZ0O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnggPSBlLnJpZ2h0O1xuICAgIH1cbiAgICB0aGlzLnR3ZWVuZXIuY2xlYXIoKVxuICAgICAgLndhaXQoMzApXG4gICAgICAuY2FsbChmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5yZW1vdmUoKTtcbiAgICAgIH0uYmluZCh0aGlzKSk7XG4gIH0sXG5cbiAgLy/lvL7jgYvjgozjgotcbiAgc25hcDogZnVuY3Rpb24oZSkge1xuICAgIC8v5Yq55p6c6Z+zXG4gICAgYXBwLnBsYXlTRShcInRpbmtsaW5nXCIpO1xuICAgIHRoaXMudHdlZW5lci5jbGVhcigpXG4gICAgICAuYnkoe3k6IC05Miwgcm90YXRpb246IDcwMH0sIDE1LCBcImVhc2VPdXRRdWFkXCIpXG4gICAgICAuY2FsbChmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5yZW1vdmUoKTtcbiAgICAgIH0uYmluZCh0aGlzKSk7XG4gIH0sXG5cbiAgLy/niIbnmbpcbiAgZXhwbG9kZTogZnVuY3Rpb24oZSkge1xuICAgIHRoaXMucGFyZW50U2NlbmUuc3Bhd25FZmZlY3QodGhpcy54LCB0aGlzLnkpO1xuICAgIGFwcC5wbGF5U0UoXCJib21iXCIpO1xuICAgIHRoaXMucmVtb3ZlKCk7XG4gIH0sXG59KTtcbiIsInBoaW5hLmRlZmluZShcIlBsYXllcldlYXBvblwiLCB7XG4gIHN1cGVyQ2xhc3M6IFwiRGlzcGxheUVsZW1lbnRcIixcblxuICBpbml0OiBmdW5jdGlvbihwbGF5ZXIpIHtcbiAgICB0aGlzLnN1cGVySW5pdCgpO1xuICAgIHRoaXMucGxheWVyID0gcGxheWVyO1xuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuYmFzZSA9IHBoaW5hLmRpc3BsYXkuRGlzcGxheUVsZW1lbnQoKS5hZGRDaGlsZFRvKHRoaXMpO1xuICAgIHRoaXMuYmFzZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMucm90YXRpb24gPSAtdGhhdC5yb3RhdGlvbjtcbiAgICB9XG4gICAgdmFyIHBhcmFtID0ge1xuICAgICAgd2lkdGg6IDI1LFxuICAgICAgaGVpZ2h0OiAyNSxcbiAgICAgIGZpbGw6IFwicmdiYSgwLDAsMCwwLjApXCIsXG4gICAgICBzdHJva2U6IFwieWVsbG93XCIsXG4gICAgICBzdHJva2VXaWR0aDogMixcbiAgICAgIGJhY2tncm91bmRDb2xvcjogJ3RyYW5zcGFyZW50JyxcbiAgICB9O1xuICAgIC8v5L2/55So5Lit5q2m5ZmoXG4gICAgcGhpbmEuZGlzcGxheS5SZWN0YW5nbGVTaGFwZShwYXJhbSkuYWRkQ2hpbGRUbyh0aGlzLmJhc2UpLnNldFBvc2l0aW9uKDAsIC0xOCk7XG4gICAgLy/mjajjgabjgaHjgoPjgYbmrablmahcbiAgICB0aGlzLmRyb3BGcmFtZSA9IHBoaW5hLmRpc3BsYXkuUmVjdGFuZ2xlU2hhcGUoe3N0cm9rZTogXCJyZWRcIn0uJHNhZmUocGFyYW0pKVxuICAgICAgLmFkZENoaWxkVG8odGhpcy5iYXNlKVxuICAgICAgLnNldFBvc2l0aW9uKDE0LCAxMClcbiAgICAgIC5zZXRWaXNpYmxlKGZhbHNlKTtcbiAgICB0aGlzLmRyb3BGcmFtZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGF0LnBsYXllci5lcXVpcC53ZWFwb25zLmxlbmd0aCA8IDMpIHtcbiAgICAgICAgdGhpcy52aXNpYmxlID0gZmFsc2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnZpc2libGUgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8v5q2m5Zmo44Oq44K544OI77yI77yT44Gk77yJXG4gICAgdGhpcy53ZWFwb25zID0gW107XG4gICAgdmFyIHJhZCA9IDA7XG4gICAgdmFyIHJhZF8xID0gKE1hdGguUEkqMikgLyAzO1xuICAgICgzKS50aW1lcygoaSkgPT4ge1xuICAgICAgdmFyIHggPSAgTWF0aC5zaW4ocmFkKSoxODtcbiAgICAgIHZhciB5ID0gLU1hdGguY29zKHJhZCkqMTg7XG4gICAgICByYWQgLT0gcmFkXzE7XG4gICAgICB0aGlzLndlYXBvbnNbaV0gPSBwaGluYS5kaXNwbGF5LlNwcml0ZShcIndlYXBvbnNcIiwgMjQsIDI0KVxuICAgICAgICAuYWRkQ2hpbGRUbyh0aGlzKVxuICAgICAgICAuc2V0UG9zaXRpb24oeCwgeSk7XG4gICAgICB0aGlzLndlYXBvbnNbaV0uaW5kZXggPSBpO1xuICAgICAgdGhpcy53ZWFwb25zW2ldLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnJvdGF0aW9uID0gLXRoYXQucm90YXRpb247XG4gICAgICAgIHZhciB3ZWFwb25zID0gdGhhdC5wbGF5ZXIuZXF1aXAud2VhcG9ucztcbiAgICAgICAgaWYgKHRoaXMuaW5kZXggPCB3ZWFwb25zLmxlbmd0aCkge1xuICAgICAgICAgIHZhciBraW5kID0gdGhhdC5wbGF5ZXIuZXF1aXAud2VhcG9uc1t0aGlzLmluZGV4XTtcbiAgICAgICAgICB2YXIgbGV2ZWwgPSB0aGF0LnBsYXllci5lcXVpcC5sZXZlbFt0aGlzLmluZGV4XTtcbiAgICAgICAgICB2YXIgc3BlYyA9IEl0ZW1JbmZvLmdldChraW5kKTtcbiAgICAgICAgICB2YXIgaW5kZXggPSBraW5kICogMTAgKyBNYXRoLm1pbihsZXZlbCwgc3BlYy5tYXhJbmRleCk7XG4gICAgICAgICAgdGhpcy5zZXRGcmFtZUluZGV4KGluZGV4KTtcbiAgICAgICAgICB0aGlzLnZpc2libGUgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMudmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB2YXIgbGFiZWxQYXJhbSA9IHtcbiAgICAgICAgZmlsbDogXCJ3aGl0ZVwiLFxuICAgICAgICBzdHJva2U6IFwiYmxhY2tcIixcbiAgICAgICAgc3Ryb2tlV2lkdGg6IDIsXG4gICAgICAgIGZvbnRGYW1pbHk6IFwiT3JiaXRyb25cIixcbiAgICAgICAgYWxpZ246IFwiY2VudGVyXCIsXG4gICAgICAgIGJhc2VsaW5lOiBcIm1pZGRsZVwiLFxuICAgICAgICBmb250U2l6ZTogMTAsXG4gICAgICAgIGZvbnRXZWlnaHQ6ICcnXG4gICAgICB9O1xuICAgICAgLy/lvLfljJbjg6zjg5njg6vooajnpLpcbiAgICAgIHRoaXMud2VhcG9uc1tpXS5sZXZlbCA9IHBoaW5hLmRpc3BsYXkuTGFiZWwoe3RleHQ6IFwiXCJ9LiRzYWZlKGxhYmVsUGFyYW0pKS5zZXRQb3NpdGlvbig2LCA2KS5hZGRDaGlsZFRvKHRoaXMud2VhcG9uc1tpXSk7XG4gICAgICB0aGlzLndlYXBvbnNbaV0ubGV2ZWwuaW5kZXggPSBpO1xuICAgICAgdGhpcy53ZWFwb25zW2ldLmxldmVsLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbGV2ZWwgPSB0aGF0LnBsYXllci5lcXVpcC5sZXZlbFt0aGlzLmluZGV4XTtcbiAgICAgICAgaWYgKGxldmVsICE9IDApIHtcbiAgICAgICAgICB0aGlzLnRleHQgPSBcIitcIitsZXZlbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnRleHQgPSBcIlwiO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgY2xlYXI6IGZ1bmN0aW9uKCkge1xuICB9LFxufSk7XG4iLCJwaGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZGVmaW5lKCdXb3JsZE1hcCcsIHtcbiAgICBzdXBlckNsYXNzOiAnRGlzcGxheUVsZW1lbnQnLFxuXG4gICAgaW5pdDogZnVuY3Rpb24obWFwTmFtZSkge1xuICAgICAgdGhpcy5zdXBlckluaXQoKTtcbiAgICAgIHRoaXMuc2V0dXAobWFwTmFtZSk7XG4gICAgfSxcblxuICAgIHNldHVwOiBmdW5jdGlvbihtYXBOYW1lKSB7XG4gICAgICB0aGlzLmRhdGEgPSBwaGluYS5hc3NldC5Bc3NldE1hbmFnZXIuZ2V0KCd0bXgnLCBtYXBOYW1lKTtcblxuICAgICAgU3ByaXRlKHRoaXMuZGF0YS5nZXRJbWFnZSgpKVxuICAgICAgICAuc2V0T3JpZ2luKDAsIDApXG4gICAgICAgIC5hZGRDaGlsZFRvKHRoaXMpO1xuXG4gICAgICB0aGlzLmNvbGxpc2lvbiA9IHRoaXMubGF5ZXJUb0FycmF5KFwiY29sbGlzaW9uXCIpO1xuICAgICAgdGhpcy5vYmplY3QgPSB0aGlzLmxheWVyVG9BcnJheShcIm9iamVjdFwiKTtcbiAgICAgIC8vIHRoaXMuZmxvb3JEYXRhID0gdGhpcy5sYXllclRvQXJyYXkoXCJmbG9vclwiKTtcbiAgICAgIC8vIHRoaXMuZXZlbnQgPSB0aGlzLmxheWVyVG9BcnJheShcImV2ZW50XCIpO1xuICAgIH0sXG5cbiAgICBnZXRDb2xsaXNpb25EYXRhOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLmNvbGxpc2lvbjtcbiAgICB9LFxuXG4gICAgZ2V0T2JqZWN0RGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5vYmplY3Q7XG4gICAgfSxcblxuICAgIGdldEZsb29yRGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5mbG9vckRhdGE7XG4gICAgfSxcblxuICAgIGxheWVyVG9BcnJheTogZnVuY3Rpb24obGF5ZXJOYW1lKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBbXTtcbiAgICAgIGNvbnN0IGxheWVyRGF0YSA9IHRoaXMuZGF0YS5nZXRPYmplY3RHcm91cChsYXllck5hbWUpO1xuICAgICAgbGF5ZXJEYXRhLm9iamVjdHMuZm9yRWFjaChlID0+IHtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IERpc3BsYXlFbGVtZW50KHtcbiAgICAgICAgICB3aWR0aDogZS53aWR0aCxcbiAgICAgICAgICBoZWlnaHQ6IGUuaGVpZ2h0LFxuICAgICAgICAgIHg6IGUueCArIGUud2lkdGggKiAwLjUsXG4gICAgICAgICAgeTogZS55ICsgZS5oZWlnaHQgKiAwLjUsXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoREVCVUdfQ09MTElTSU9OKSB7XG4gICAgICAgICAgUmVjdGFuZ2xlU2hhcGUoeyB3aWR0aDogZS53aWR0aCwgaGVpZ2h0OiBlLmhlaWdodCB9KS5hZGRDaGlsZFRvKGVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICAgIGVsZW1lbnQuYWxwaGEgPSBERUJVR19DT0xMSVNJT04gPyAwLjMgOiAwO1xuICAgICAgICBlbGVtZW50LnR5cGUgPSBlLnR5cGU7XG4gICAgICAgIGVsZW1lbnQuaWQgPSBlLmlkO1xuICAgICAgICBlbGVtZW50LiRleHRlbmQoZS5wcm9wZXJ0aWVzKTtcbiAgICAgICAgcmVzdWx0LnB1c2goZWxlbWVudCk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICB9KTtcblxufSk7XG4iLCJwaGluYS5kZWZpbmUoXCJCdXR0b25cIiwge1xuICBzdXBlckNsYXNzOiBcIkFjY2Vzc29yeVwiLFxuXG4gIGxvZ25wcmVzc1RpbWU6IDUwMCxcbiAgZG9Mb25ncHJlc3M6IGZhbHNlLFxuXG4gIC8v6ZW35oq844GX44Gn6YCj5omT44Oi44O844OJXG4gIGxvbmdwcmVzc0JhcnJhZ2U6IGZhbHNlLFxuXG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3VwZXJJbml0KCk7XG5cbiAgICB0aGlzLm9uKFwiYXR0YWNoZWRcIiwgKCkgPT4ge1xuICAgICAgdGhpcy50YXJnZXQuaW50ZXJhY3RpdmUgPSB0cnVlO1xuICAgICAgdGhpcy50YXJnZXQuY2xpY2tTb3VuZCA9IEJ1dHRvbi5kZWZhdWx0cy5jbGlja1NvdW5kO1xuXG4gICAgICAvL+ODnOOCv+ODs+aKvOOBl+aZgueUqFxuICAgICAgdGhpcy50YXJnZXQuc2NhbGVUd2VlbmVyID0gVHdlZW5lcigpLmF0dGFjaFRvKHRoaXMudGFyZ2V0KTtcblxuICAgICAgLy/plbfmirzjgZfnlKhcbiAgICAgIHRoaXMudGFyZ2V0LnR3TG9uZ3ByZXNzID0gVHdlZW5lcigpLmF0dGFjaFRvKHRoaXMudGFyZ2V0KTtcblxuICAgICAgLy/plbfmirzjgZfkuK3nibnmrorlr77lv5znlKhcbiAgICAgIHRoaXMudGFyZ2V0LnR3TG9uZ3ByZXNzaW5nID0gVHdlZW5lcigpLmF0dGFjaFRvKHRoaXMudGFyZ2V0KTtcblxuICAgICAgdGhpcy50YXJnZXQub24oXCJwb2ludHN0YXJ0XCIsIChlKSA9PiB7XG5cbiAgICAgICAgLy/jgqTjg5njg7Pjg4josqvpgJrjgavjgZfjgabjgYrjgY9cbiAgICAgICAgZS5wYXNzID0gdHJ1ZTtcblxuICAgICAgICAvL+ODnOOCv+ODs+OBruWQjOaZguaKvOOBl+OCkuWItumZkFxuICAgICAgICBpZiAoQnV0dG9uLmFjdGlvblRhcmdldCAhPT0gbnVsbCkgcmV0dXJuO1xuXG4gICAgICAgIC8v44Oq44K544OI44OT44Ol44O844Gu5a2Q5L6b44Gg44Gj44Gf5aC05ZCI44Gvdmlld3BvcnTjgajjga7jgYLjgZ/jgorliKTlrprjgpLjgZnjgotcbiAgICAgICAgY29uc3QgbGlzdFZpZXcgPSBCdXR0b24uZmluZExpc3RWaWV3KGUudGFyZ2V0KTtcbiAgICAgICAgaWYgKGxpc3RWaWV3ICYmICFsaXN0Vmlldy52aWV3cG9ydC5oaXRUZXN0KGUucG9pbnRlci54LCBlLnBvaW50ZXIueSkpIHJldHVybjtcblxuICAgICAgICBpZiAobGlzdFZpZXcpIHtcbiAgICAgICAgICAvL+ODneOCpOODs+OCv+OBjOenu+WLleOBl+OBn+WgtOWQiOOBr+mVt+aKvOOBl+OCreODo+ODs+OCu+ODq++8iGxpc3RWaWV35YaF54mI77yJXG4gICAgICAgICAgbGlzdFZpZXcuaW5uZXIuJHdhdGNoKCd5JywgKHYxLCB2MikgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMudGFyZ2V0ICE9PSBCdXR0b24uYWN0aW9uVGFyZ2V0KSByZXR1cm47XG4gICAgICAgICAgICBpZiAoTWF0aC5hYnModjEgLSB2MikgPCAxMCkgcmV0dXJuO1xuXG4gICAgICAgICAgICBCdXR0b24uYWN0aW9uVGFyZ2V0ID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0LnR3TG9uZ3ByZXNzLmNsZWFyKCk7XG4gICAgICAgICAgICB0aGlzLnRhcmdldC5zY2FsZVR3ZWVuZXIuY2xlYXIoKS50byh7XG4gICAgICAgICAgICAgIHNjYWxlWDogMS4wICogdGhpcy5zeCxcbiAgICAgICAgICAgICAgc2NhbGVZOiAxLjAgKiB0aGlzLnN5XG4gICAgICAgICAgICB9LCA1MCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvL+ODnOOCv+ODs+OBruWHpueQhuOCkuWun+ihjOOBl+OBpuOCguWVj+mhjOOBquOBhOWgtOWQiOOBruOBv+iyq+mAmuOCkuWBnOatouOBmeOCi1xuICAgICAgICBlLnBhc3MgPSBmYWxzZTtcbiAgICAgICAgQnV0dG9uLmFjdGlvblRhcmdldCA9IHRoaXMudGFyZ2V0O1xuXG4gICAgICAgIC8v5Y+N6Lui44GX44Gm44GE44KL44Oc44K/44Oz55So44Gr5L+d5oyB44GZ44KLXG4gICAgICAgIHRoaXMuc3ggPSAodGhpcy50YXJnZXQuc2NhbGVYID4gMCkgPyAxIDogLTE7XG4gICAgICAgIHRoaXMuc3kgPSAodGhpcy50YXJnZXQuc2NhbGVZID4gMCkgPyAxIDogLTE7XG5cbiAgICAgICAgdGhpcy50YXJnZXQuc2NhbGVUd2VlbmVyLmNsZWFyKClcbiAgICAgICAgICAudG8oe1xuICAgICAgICAgICAgc2NhbGVYOiAwLjk1ICogdGhpcy5zeCxcbiAgICAgICAgICAgIHNjYWxlWTogMC45NSAqIHRoaXMuc3lcbiAgICAgICAgICB9LCA1MCk7XG5cbiAgICAgICAgdGhpcy5kb0xvbmdwcmVzcyA9IGZhbHNlO1xuICAgICAgICB0aGlzLnRhcmdldC50d0xvbmdwcmVzcy5jbGVhcigpXG4gICAgICAgICAgLndhaXQodGhpcy5sb2ducHJlc3NUaW1lKVxuICAgICAgICAgIC5jYWxsKCgpID0+IHtcbiAgICAgICAgICAgIGlmICghdGhpcy5sb25ncHJlc3NCYXJyYWdlKSB7XG4gICAgICAgICAgICAgIEJ1dHRvbi5hY3Rpb25UYXJnZXQgPSBudWxsO1xuICAgICAgICAgICAgICB0aGlzLnRhcmdldC5zY2FsZVR3ZWVuZXIuY2xlYXIoKVxuICAgICAgICAgICAgICAgIC50byh7XG4gICAgICAgICAgICAgICAgICBzY2FsZVg6IDEuMCAqIHRoaXMuc3gsXG4gICAgICAgICAgICAgICAgICBzY2FsZVk6IDEuMCAqIHRoaXMuc3lcbiAgICAgICAgICAgICAgICB9LCA1MClcbiAgICAgICAgICAgICAgdGhpcy50YXJnZXQuZmxhcmUoXCJsb25ncHJlc3NcIilcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRoaXMudGFyZ2V0LmZsYXJlKFwiY2xpY2tTb3VuZFwiKTtcbiAgICAgICAgICAgICAgdGhpcy50YXJnZXQudHdMb25ncHJlc3NpbmcuY2xlYXIoKVxuICAgICAgICAgICAgICAgIC53YWl0KDUpXG4gICAgICAgICAgICAgICAgLmNhbGwoKCkgPT4gdGhpcy50YXJnZXQuZmxhcmUoXCJjbGlja2VkXCIsIHtcbiAgICAgICAgICAgICAgICAgIGxvbmdwcmVzczogdHJ1ZVxuICAgICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgICAgIC5jYWxsKCgpID0+IHRoaXMudGFyZ2V0LmZsYXJlKFwibG9uZ3ByZXNzaW5nXCIpKVxuICAgICAgICAgICAgICAgIC5zZXRMb29wKHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMudGFyZ2V0Lm9uKFwicG9pbnRlbmRcIiwgKGUpID0+IHtcbiAgICAgICAgLy/jgqTjg5njg7Pjg4josqvpgJrjgavjgZfjgabjgYrjgY9cbiAgICAgICAgZS5wYXNzID0gdHJ1ZTtcblxuICAgICAgICAvL1xuICAgICAgICB0aGlzLnRhcmdldC50d0xvbmdwcmVzcy5jbGVhcigpO1xuICAgICAgICB0aGlzLnRhcmdldC50d0xvbmdwcmVzc2luZy5jbGVhcigpO1xuXG4gICAgICAgIC8v44K/44O844Ky44OD44OI44GMbnVsbOOBi3BvaW50c3RhcnTjgafkv53mjIHjgZfjgZ/jgr/jg7zjgrLjg4Pjg4jjgajpgZXjgYbloLTlkIjjga/jgrnjg6vjg7zjgZnjgotcbiAgICAgICAgaWYgKEJ1dHRvbi5hY3Rpb25UYXJnZXQgPT09IG51bGwpIHJldHVybjtcbiAgICAgICAgaWYgKEJ1dHRvbi5hY3Rpb25UYXJnZXQgIT09IHRoaXMudGFyZ2V0KSByZXR1cm47XG5cbiAgICAgICAgLy/jg5zjgr/jg7Pjga7lh6bnkIbjgpLlrp/ooYzjgZfjgabjgoLllY/poYzjgarjgYTloLTlkIjjga7jgb/osqvpgJrjgpLlgZzmraLjgZnjgotcbiAgICAgICAgZS5wYXNzID0gZmFsc2U7XG5cbiAgICAgICAgLy/mirzjgZfjgZ/kvY3nva7jgYvjgonjgYLjgovnqIvluqbnp7vli5XjgZfjgabjgYTjgovloLTlkIjjga/jgq/jg6rjg4Pjgq/jgqTjg5njg7Pjg4jjgpLnmbrnlJ/jgZXjgZvjgarjgYRcbiAgICAgICAgY29uc3QgaXNNb3ZlID0gZS5wb2ludGVyLnN0YXJ0UG9zaXRpb24uc3ViKGUucG9pbnRlci5wb3NpdGlvbikubGVuZ3RoKCkgPiA1MDtcbiAgICAgICAgY29uc3QgaGl0VGVzdCA9IHRoaXMudGFyZ2V0LmhpdFRlc3QoZS5wb2ludGVyLngsIGUucG9pbnRlci55KTtcbiAgICAgICAgaWYgKGhpdFRlc3QgJiYgIWlzTW92ZSkgdGhpcy50YXJnZXQuZmxhcmUoXCJjbGlja1NvdW5kXCIpO1xuXG4gICAgICAgIHRoaXMudGFyZ2V0LnNjYWxlVHdlZW5lci5jbGVhcigpXG4gICAgICAgICAgLnRvKHtcbiAgICAgICAgICAgIHNjYWxlWDogMS4wICogdGhpcy5zeCxcbiAgICAgICAgICAgIHNjYWxlWTogMS4wICogdGhpcy5zeVxuICAgICAgICAgIH0sIDUwKVxuICAgICAgICAgIC5jYWxsKCgpID0+IHtcbiAgICAgICAgICAgIEJ1dHRvbi5hY3Rpb25UYXJnZXQgPSBudWxsO1xuICAgICAgICAgICAgaWYgKCFoaXRUZXN0IHx8IGlzTW92ZSB8fCB0aGlzLmRvTG9uZ3ByZXNzKSByZXR1cm47XG4gICAgICAgICAgICB0aGlzLnRhcmdldC5mbGFyZShcImNsaWNrZWRcIiwge1xuICAgICAgICAgICAgICBwb2ludGVyOiBlLnBvaW50ZXJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIC8v44Ki44OL44Oh44O844K344On44Oz44Gu5pyA5Lit44Gr5YmK6Zmk44GV44KM44Gf5aC05ZCI44Gr5YKZ44GI44GmcmVtb3ZlZOOCpOODmeODs+ODiOaZguOBq+ODleODqeOCsOOCkuWFg+OBq+aIu+OBl+OBpuOBiuOBj1xuICAgICAgdGhpcy50YXJnZXQub25lKFwicmVtb3ZlZFwiLCAoKSA9PiB7XG4gICAgICAgIGlmIChCdXR0b24uYWN0aW9uVGFyZ2V0ID09PSB0aGlzLnRhcmdldCkge1xuICAgICAgICAgIEJ1dHRvbi5hY3Rpb25UYXJnZXQgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgdGhpcy50YXJnZXQub24oXCJjbGlja1NvdW5kXCIsICgpID0+IHtcbiAgICAgICAgaWYgKCF0aGlzLnRhcmdldC5jbGlja1NvdW5kIHx8IHRoaXMudGFyZ2V0LmNsaWNrU291bmQgPT0gXCJcIikgcmV0dXJuO1xuICAgICAgICBwaGluYS5hc3NldC5Tb3VuZE1hbmFnZXIucGxheSh0aGlzLnRhcmdldC5jbGlja1NvdW5kKTtcbiAgICAgIH0pO1xuXG4gICAgfSk7XG4gIH0sXG5cbiAgLy/plbfmirzjgZfjga7lvLfliLbjgq3jg6Pjg7Pjgrvjg6tcbiAgbG9uZ3ByZXNzQ2FuY2VsOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnRhcmdldC50d0xvbmdwcmVzcy5jbGVhcigpO1xuICAgIHRoaXMudGFyZ2V0LnR3TG9uZ3ByZXNzaW5nLmNsZWFyKCk7XG4gIH0sXG5cbiAgX3N0YXRpYzoge1xuICAgIC8v44Oc44K/44Oz5ZCM5pmC5oq844GX44KS5Yi25b6h44GZ44KL44Gf44KB44Grc3RhdHVz44Gvc3RhdGlj44Gr44GZ44KLXG4gICAgc3RhdHVzOiAwLFxuICAgIGFjdGlvblRhcmdldDogbnVsbCxcbiAgICAvL+WfuuacrOioreWumlxuICAgIGRlZmF1bHRzOiB7XG4gICAgICBjbGlja1NvdW5kOiBcImNvbW1vbi9zb3VuZHMvc2UvYnV0dG9uXCIsXG4gICAgfSxcblxuICAgIC8v6Kaq44KS44Gf44Gp44Gj44GmTGlzdFZpZXfjgpLmjqLjgZlcbiAgICBmaW5kTGlzdFZpZXc6IGZ1bmN0aW9uKGVsZW1lbnQsIHApIHtcbiAgICAgIC8v44Oq44K544OI44OT44Ol44O844KS5oyB44Gj44Gm44GE44KL5aC05ZCIXG4gICAgICBpZiAoZWxlbWVudC5MaXN0VmlldyAhPSBudWxsKSByZXR1cm4gZWxlbWVudC5MaXN0VmlldztcbiAgICAgIC8v6Kaq44GM44Gq44GR44KM44Gw57WC5LqGXG4gICAgICBpZiAoZWxlbWVudC5wYXJlbnQgPT0gbnVsbCkgcmV0dXJuIG51bGw7XG4gICAgICAvL+imquOCkuOBn+OBqeOCi1xuICAgICAgcmV0dXJuIHRoaXMuZmluZExpc3RWaWV3KGVsZW1lbnQucGFyZW50KTtcbiAgICB9XG5cbiAgfVxuXG59KTtcbiIsIi8qKlxyXG4gKiDopqrjgrnjg5fjg6njgqTjg4jjga7jg4bjgq/jgrnjg4Hjg6PjgpLliIfjgormipzjgYTjgaboh6rliIbjga7jg4bjgq/jgrnjg4Hjg6PjgajjgZnjgovjgrnjg5fjg6njgqTjg4hcclxuICog6Kaq44K544OX44Op44Kk44OI44Gu5YiH44KK5oqc44GL44KM44Gf6YOo5YiG44Gv44CB5YiH44KK5oqc44GN56+E5Zuy44Gu5bem5LiK44Gu44OU44Kv44K744Or44Gu6Imy44Gn5aGX44KK44Gk44G244GV44KM44KLXHJcbiAqIFxyXG4gKiDopqropoHntKDjga7mi6HnuK7jg7vlm57ou6Ljga/ogIPmha7jgZfjgarjgYRcclxuICovXHJcbnBoaW5hLmRlZmluZShcIkNsaXBTcHJpdGVcIiwge1xyXG4gIHN1cGVyQ2xhc3M6IFwiQWNjZXNzb3J5XCIsXHJcblxyXG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgdGhpcy5zdXBlckluaXQoKTtcclxuICAgIHRoaXMub24oXCJhdHRhY2hlZFwiLCAoKSA9PiB7XHJcbiAgICAgIHRoaXMudGFyZ2V0Lm9uZShcImFkZGVkXCIsICgpID0+IHtcclxuICAgICAgICB0aGlzLnNldHVwKCk7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfSxcclxuXHJcbiAgc2V0dXA6IGZ1bmN0aW9uKCkge1xyXG4gICAgY29uc3QgdGFyZ2V0ID0gdGhpcy50YXJnZXQ7XHJcbiAgICBjb25zdCBwYXJlbnQgPSB0YXJnZXQucGFyZW50O1xyXG4gICAgaWYgKHBhcmVudCBpbnN0YW5jZW9mIHBoaW5hLmRpc3BsYXkuU3ByaXRlKSB7XHJcbiAgICAgIGNvbnN0IHggPSBwYXJlbnQud2lkdGggKiBwYXJlbnQub3JpZ2luLnggKyB0YXJnZXQueCAtIHRhcmdldC53aWR0aCAqIHRhcmdldC5vcmlnaW4ueDtcclxuICAgICAgY29uc3QgeSA9IHBhcmVudC5oZWlnaHQgKiBwYXJlbnQub3JpZ2luLnkgKyB0YXJnZXQueSAtIHRhcmdldC5oZWlnaHQgKiB0YXJnZXQub3JpZ2luLnk7XHJcbiAgICAgIGNvbnN0IHcgPSB0YXJnZXQud2lkdGg7XHJcbiAgICAgIGNvbnN0IGggPSB0YXJnZXQuaGVpZ2h0O1xyXG5cclxuICAgICAgY29uc3QgcGFyZW50VGV4dHVyZSA9IHBhcmVudC5pbWFnZTtcclxuICAgICAgY29uc3QgY2FudmFzID0gcGhpbmEuZ3JhcGhpY3MuQ2FudmFzKCkuc2V0U2l6ZSh3LCBoKTtcclxuICAgICAgY2FudmFzLmNvbnRleHQuZHJhd0ltYWdlKHBhcmVudFRleHR1cmUuZG9tRWxlbWVudCwgeCwgeSwgdywgaCwgMCwgMCwgdywgaCk7XHJcbiAgICAgIGlmIChwYXJlbnRUZXh0dXJlIGluc3RhbmNlb2YgcGhpbmEuZ3JhcGhpY3MuQ2FudmFzKSB7XHJcbiAgICAgICAgLy8g44Kv44Ot44O844Oz44GX44Gm44Gd44Gj44Gh44KS5L2/44GGXHJcbiAgICAgICAgY29uc3QgcGFyZW50VGV4dHVyZUNsb25lID0gcGhpbmEuZ3JhcGhpY3MuQ2FudmFzKCkuc2V0U2l6ZShwYXJlbnRUZXh0dXJlLndpZHRoLCBwYXJlbnRUZXh0dXJlLmhlaWdodCk7XHJcbiAgICAgICAgcGFyZW50VGV4dHVyZUNsb25lLmNvbnRleHQuZHJhd0ltYWdlKHBhcmVudFRleHR1cmUuZG9tRWxlbWVudCwgMCwgMCk7XHJcbiAgICAgICAgcGFyZW50LmltYWdlID0gcGFyZW50VGV4dHVyZUNsb25lO1xyXG5cclxuICAgICAgICBjb25zdCBkYXRhID0gcGFyZW50VGV4dHVyZUNsb25lLmNvbnRleHQuZ2V0SW1hZ2VEYXRhKHgsIHksIDEsIDEpLmRhdGE7XHJcbiAgICAgICAgcGFyZW50VGV4dHVyZUNsb25lLmNvbnRleHQuY2xlYXJSZWN0KHgsIHksIHcsIGgpO1xyXG4gICAgICAgIGlmIChkYXRhWzNdID4gMCkge1xyXG4gICAgICAgICAgcGFyZW50VGV4dHVyZUNsb25lLmNvbnRleHQuZ2xvYmFsQWxwaGEgPSAxO1xyXG4gICAgICAgICAgcGFyZW50VGV4dHVyZUNsb25lLmNvbnRleHQuZmlsbFN0eWxlID0gYHJnYmEoJHtkYXRhWzBdfSwgJHtkYXRhWzFdfSwgJHtkYXRhWzJdfSwgJHtkYXRhWzNdIC8gMjU1fSlgO1xyXG4gICAgICAgICAgcGFyZW50VGV4dHVyZUNsb25lLmNvbnRleHQuZmlsbFJlY3QoeCAtIDEsIHkgLSAxLCB3ICsgMiwgaCArIDIpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3Qgc3ByaXRlID0gcGhpbmEuZGlzcGxheS5TcHJpdGUoY2FudmFzKTtcclxuICAgICAgc3ByaXRlLnNldE9yaWdpbih0YXJnZXQub3JpZ2luLngsIHRhcmdldC5vcmlnaW4ueSk7XHJcbiAgICAgIHRhcmdldC5hZGRDaGlsZEF0KHNwcml0ZSwgMCk7XHJcbiAgICB9XHJcbiAgfSxcclxufSk7XHJcbiIsInBoaW5hLmRlZmluZShcIkdhdWdlXCIsIHtcbiAgc3VwZXJDbGFzczogXCJSZWN0YW5nbGVDbGlwXCIsXG5cbiAgX21pbjogMCxcbiAgX21heDogMS4wLFxuICBfdmFsdWU6IDEuMCwgLy9taW4gfiBtYXhcblxuICBkaXJlY3Rpb246IFwiaG9yaXpvbnRhbFwiLCAvLyBob3Jpem9udGFsIG9yIHZlcnRpY2FsXG5cbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdXBlckluaXQoKTtcbiAgICB0aGlzLm9uKFwiYXR0YWNoZWRcIiwgKCkgPT4ge1xuICAgICAgdGhpcy5fd2lkdGggPSB0aGlzLndpZHRoO1xuICAgICAgdGhpcy5faGVpZ2h0ID0gdGhpcy53aWR0aDtcblxuICAgICAgdGhpcy50YXJnZXQuYWNjZXNzb3IoXCJHYXVnZS5taW5cIiwge1xuICAgICAgICBcImdldFwiOiAoKSA9PiB0aGlzLm1pbixcbiAgICAgICAgXCJzZXRcIjogKHYpID0+IHRoaXMubWluID0gdixcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnRhcmdldC5hY2Nlc3NvcihcIkdhdWdlLm1heFwiLCB7XG4gICAgICAgIFwiZ2V0XCI6ICgpID0+IHRoaXMubWF4LFxuICAgICAgICBcInNldFwiOiAodikgPT4gdGhpcy5tYXggPSB2LFxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMudGFyZ2V0LmFjY2Vzc29yKFwiR2F1Z2UudmFsdWVcIiwge1xuICAgICAgICBcImdldFwiOiAoKSA9PiB0aGlzLnZhbHVlLFxuICAgICAgICBcInNldFwiOiAodikgPT4gdGhpcy52YWx1ZSA9IHYsXG4gICAgICB9KTtcblxuICAgICAgdGhpcy50YXJnZXQuYWNjZXNzb3IoXCJHYXVnZS5wcm9ncmVzc1wiLCB7XG4gICAgICAgIFwiZ2V0XCI6ICgpID0+IHRoaXMucHJvZ3Jlc3MsXG4gICAgICAgIFwic2V0XCI6ICh2KSA9PiB0aGlzLnByb2dyZXNzID0gdixcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIF9yZWZyZXNoOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5kaXJlY3Rpb24gIT09IFwidmVydGljYWxcIikge1xuICAgICAgdGhpcy53aWR0aCA9IHRoaXMudGFyZ2V0LndpZHRoICogdGhpcy5wcm9ncmVzcztcbiAgICAgIHRoaXMuaGVpZ2h0ID0gdGhpcy50YXJnZXQuaGVpZ2h0O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLndpZHRoID0gdGhpcy50YXJnZXQud2lkdGg7XG4gICAgICB0aGlzLmhlaWdodCA9IHRoaXMudGFyZ2V0LmhlaWdodCAqIHRoaXMucHJvZ3Jlc3M7XG4gICAgfVxuICB9LFxuXG4gIF9hY2Nlc3Nvcjoge1xuICAgIHByb2dyZXNzOiB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zdCBwID0gKHRoaXMudmFsdWUgLSB0aGlzLm1pbikgLyAodGhpcy5tYXggLSB0aGlzLm1pbik7XG4gICAgICAgIHJldHVybiAoaXNOYU4ocCkpID8gMC4wIDogcDtcbiAgICAgIH0sXG4gICAgICBzZXQ6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgdGhpcy52YWx1ZSA9IHRoaXMubWF4ICogdjtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgbWF4OiB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbWF4O1xuICAgICAgfSxcbiAgICAgIHNldDogZnVuY3Rpb24odikge1xuICAgICAgICB0aGlzLl9tYXggPSB2O1xuICAgICAgICB0aGlzLl9yZWZyZXNoKCk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIG1pbjoge1xuICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX21pbjtcbiAgICAgIH0sXG4gICAgICBzZXQ6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgdGhpcy5fbWluID0gdjtcbiAgICAgICAgdGhpcy5fcmVmcmVzaCgpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICB2YWx1ZToge1xuICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlO1xuICAgICAgfSxcbiAgICAgIHNldDogZnVuY3Rpb24odikge1xuICAgICAgICB0aGlzLl92YWx1ZSA9IHY7XG4gICAgICAgIHRoaXMuX3JlZnJlc2goKTtcbiAgICAgIH1cbiAgICB9LFxuICB9XG5cbn0pO1xuIiwicGhpbmEuZGVmaW5lKFwiR3JheXNjYWxlXCIsIHtcbiAgc3VwZXJDbGFzczogXCJBY2Nlc3NvcnlcIixcblxuICBncmF5VGV4dHVyZU5hbWU6IG51bGwsXG5cbiAgaW5pdDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIHRoaXMuc3VwZXJJbml0KCk7XG4gICAgdGhpcy5vbihcImF0dGFjaGVkXCIsICgpID0+IHtcbiAgICAgIHRoaXMuZ3JheVRleHR1cmVOYW1lID0gb3B0aW9ucy5ncmF5VGV4dHVyZU5hbWU7XG4gICAgICB0aGlzLm5vcm1hbCA9IHRoaXMudGFyZ2V0LmltYWdlO1xuICAgIH0pO1xuICB9LFxuXG4gIHRvR3JheXNjYWxlOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnRhcmdldC5pbWFnZSA9IHRoaXMuZ3JheVRleHR1cmVOYW1lO1xuICB9LFxuXG4gIHRvTm9ybWFsOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnRhcmdldC5pbWFnZSA9IHRoaXMubm9ybWFsO1xuICB9LFxuXG59KTtcbiIsInBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcbiAgLy/jg57jgqbjgrnov73lvpNcbiAgcGhpbmEuZGVmaW5lKFwiTW91c2VDaGFzZXJcIiwge1xuICAgIHN1cGVyQ2xhc3M6IFwiQWNjZXNzb3J5XCIsXG5cbiAgICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuc3VwZXJJbml0KCk7XG4gICAgfSxcblxuICAgIG9uYXR0YWNoZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgbGV0IHB4ID0gMDtcbiAgICAgIGxldCBweSA9IDA7XG4gICAgICBjb25zb2xlLmxvZyhcIiNNb3VzZUNoYXNlclwiLCBcIm9uYXR0YWNoZWRcIik7XG4gICAgICB0aGlzLnR3ZWVuZXIgPSBUd2VlbmVyKCkuYXR0YWNoVG8odGhpcy50YXJnZXQpO1xuICAgICAgdGhpcy50YXJnZXQub24oXCJlbnRlcmZyYW1lXCIsIChlKSA9PiB7XG4gICAgICAgIGNvbnN0IHAgPSBlLmFwcC5wb2ludGVyO1xuICAgICAgICBpZiAocHkgPT0gcC54ICYmIHB5ID09IHAueSkgcmV0dXJuO1xuICAgICAgICBweCA9IHAueDtcbiAgICAgICAgcHkgPSBwLnk7XG4gICAgICAgIGNvbnN0IHggPSBwLnggLSBTQ1JFRU5fV0lEVEhfSEFMRjtcbiAgICAgICAgY29uc3QgeSA9IHAueSAtIFNDUkVFTl9IRUlHSFRfSEFMRjtcbiAgICAgICAgdGhpcy50d2VlbmVyLmNsZWFyKCkudG8oeyB4LCB5IH0sIDIwMDAsIFwiZWFzZU91dFF1YWRcIilcbiAgICAgIH0pO1xuXG4gICAgfSxcblxuICAgIG9uZGV0YWNoZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgY29uc29sZS5sb2coXCIjTW91c2VDaGFzZXJcIiwgXCJvbmRldGFjaGVkXCIpO1xuICAgICAgdGhpcy50d2VlbmVyLnJlbW92ZSgpO1xuICAgIH1cblxuICB9KTtcbn0pO1xuIiwicGhpbmEuZGVmaW5lKFwiTXVsdGlSZWN0YW5nbGVDbGlwXCIsIHtcbiAgc3VwZXJDbGFzczogXCJBY2Nlc3NvcnlcIixcblxuICB4OiAwLFxuICB5OiAwLFxuICB3aWR0aDogMCxcbiAgaGVpZ2h0OiAwLFxuXG4gIF9lbmFibGU6IHRydWUsXG5cbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdXBlckluaXQoKTtcbiAgICB0aGlzLl9pbml0KCk7XG4gIH0sXG5cbiAgX2luaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuY2xpcFJlY3QgPSBbXTtcblxuICAgIHRoaXMub24oXCJhdHRhY2hlZFwiLCAoKSA9PiB7XG4gICAgICB0aGlzLnggPSAwO1xuICAgICAgdGhpcy55ID0gMDtcbiAgICAgIHRoaXMud2lkdGggPSB0aGlzLnRhcmdldC53aWR0aDtcbiAgICAgIHRoaXMuaGVpZ2h0ID0gdGhpcy50YXJnZXQuaGVpZ2h0O1xuXG4gICAgICB0aGlzLnRhcmdldC5jbGlwID0gKGMpID0+IHRoaXMuX2NsaXAoYyk7XG4gICAgfSk7XG4gIH0sXG5cbiAgYWRkQ2xpcFJlY3Q6IGZ1bmN0aW9uKHJlY3QpIHtcbiAgICBjb25zdCByID0ge1xuICAgICAgeDogcmVjdC54LFxuICAgICAgeTogcmVjdC55LFxuICAgICAgd2lkdGg6IHJlY3Qud2lkdGgsXG4gICAgICBoZWlnaHQ6IHJlY3QuaGVpZ2h0LFxuICAgIH07XG4gICAgdGhpcy5jbGlwUmVjdC5wdXNoKHIpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIGNsZWFyQ2xpcFJlY3Q6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuY2xpcFJlY3QgPSBbXTtcbiAgfSxcblxuICBfY2xpcDogZnVuY3Rpb24oY2FudmFzKSB7XG4gICAgY2FudmFzLmJlZ2luUGF0aCgpO1xuICAgIHRoaXMuY2xpcFJlY3QuZm9yRWFjaChyZWN0ID0+IHtcbiAgICAgIGNhbnZhcy5yZWN0KHJlY3QueCwgcmVjdC55LCByZWN0LndpZHRoLCByZWN0LmhlaWdodClcbiAgICB9KTtcbiAgICBjYW52YXMuY2xvc2VQYXRoKCk7XG4gIH0sXG5cbiAgc2V0RW5hYmxlOiBmdW5jdGlvbihlbmFibGUpIHtcbiAgICB0aGlzLl9lbmFibGUgPSBlbmFibGU7XG4gICAgaWYgKHRoaXMuX2VuYWJsZSkge1xuICAgICAgdGhpcy50YXJnZXQuY2xpcCA9IChjKSA9PiB0aGlzLl9jbGlwKGMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnRhcmdldC5jbGlwID0gbnVsbDtcbiAgICB9XG4gIH0sXG5cbiAgX2FjY2Vzc29yOiB7XG4gICAgZW5hYmxlOiB7XG4gICAgICBzZXQ6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgdGhpcy5zZXRFbmFibGUodik7XG4gICAgICB9LFxuICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VuYWJsZTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbn0pO1xuIiwicGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuXG4gIHBoaW5hLmRlZmluZShcIlBpZUNsaXBcIiwge1xuICAgIHN1cGVyQ2xhc3M6IFwiQWNjZXNzb3J5XCIsXG5cbiAgICBpbml0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gKHt9KS4kc2FmZShvcHRpb25zLCBQaWVDbGlwLmRlZmF1bHRzKVxuICAgICAgdGhpcy5zdXBlckluaXQob3B0aW9ucyk7XG5cbiAgICAgIHRoaXMucGl2b3RYID0gb3B0aW9ucy5waXZvdFg7XG4gICAgICB0aGlzLnBpdm90WSA9IG9wdGlvbnMucGl2b3RZO1xuICAgICAgdGhpcy5hbmdsZU1pbiA9IG9wdGlvbnMuYW5nbGVNaW47XG4gICAgICB0aGlzLmFuZ2xlTWF4ID0gb3B0aW9ucy5hbmdsZU1heDtcbiAgICAgIHRoaXMucmFkaXVzID0gb3B0aW9ucy5yYWRpdXM7XG4gICAgICB0aGlzLmFudGljbG9ja3dpc2UgPSBvcHRpb25zLmFudGljbG9ja3dpc2U7XG4gICAgfSxcblxuICAgIG9uYXR0YWNoZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy50YXJnZXQuY2xpcCA9IChjYW52YXMpID0+IHtcbiAgICAgICAgY29uc3QgYW5nbGVNaW4gPSB0aGlzLmFuZ2xlTWluICogTWF0aC5ERUdfVE9fUkFEO1xuICAgICAgICBjb25zdCBhbmdsZU1heCA9IHRoaXMuYW5nbGVNYXggKiBNYXRoLkRFR19UT19SQUQ7XG4gICAgICAgIGNvbnN0IGN0eCA9IGNhbnZhcy5jb250ZXh0O1xuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICAgIGN0eC5tb3ZlVG8odGhpcy5waXZvdFgsIHRoaXMucGl2b3RZKTtcbiAgICAgICAgY3R4LmxpbmVUbyh0aGlzLnBpdm90WCArIE1hdGguY29zKGFuZ2xlTWluKSAqIHRoaXMucmFkaXVzLCB0aGlzLnBpdm90WSArIE1hdGguc2luKGFuZ2xlTWluKSAqIHRoaXMucmFkaXVzKTtcbiAgICAgICAgY3R4LmFyYyh0aGlzLnBpdm90WCwgdGhpcy5waXZvdFksIHRoaXMucmFkaXVzLCBhbmdsZU1pbiwgYW5nbGVNYXgsIHRoaXMuYW50aWNsb2Nrd2lzZSk7XG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcbiAgICAgIH07XG4gICAgfSxcblxuICAgIF9zdGF0aWM6IHtcbiAgICAgIGRlZmF1bHRzOiB7XG4gICAgICAgIHBpdm90WDogMzIsXG4gICAgICAgIHBpdm90WTogMzIsXG4gICAgICAgIGFuZ2xlTWluOiAwLFxuICAgICAgICBhbmdsZU1heDogMzYwLFxuICAgICAgICByYWRpdXM6IDY0LFxuICAgICAgICBhbnRpY2xvY2t3aXNlOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgfSxcblxuICB9KTtcbn0pO1xuIiwicGhpbmEuZGVmaW5lKFwiUmVjdGFuZ2xlQ2xpcFwiLCB7XG4gIHN1cGVyQ2xhc3M6IFwiQWNjZXNzb3J5XCIsXG5cbiAgeDogMCxcbiAgeTogMCxcbiAgd2lkdGg6IDAsXG4gIGhlaWdodDogMCxcblxuICBfZW5hYmxlOiB0cnVlLFxuXG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3VwZXJJbml0KCk7XG4gICAgdGhpcy5faW5pdCgpO1xuICB9LFxuXG4gIF9pbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLm9uKFwiYXR0YWNoZWRcIiwgKCkgPT4ge1xuXG4gICAgICB0aGlzLnRhcmdldC5hY2Nlc3NvcihcIlJlY3RhbmdsZUNsaXAud2lkdGhcIiwge1xuICAgICAgICBcImdldFwiOiAoKSA9PiB0aGlzLndpZHRoLFxuICAgICAgICBcInNldFwiOiAodikgPT4gdGhpcy53aWR0aCA9IHYsXG4gICAgICB9KTtcblxuICAgICAgdGhpcy50YXJnZXQuYWNjZXNzb3IoXCJSZWN0YW5nbGVDbGlwLmhlaWdodFwiLCB7XG4gICAgICAgIFwiZ2V0XCI6ICgpID0+IHRoaXMuaGVpZ2h0LFxuICAgICAgICBcInNldFwiOiAodikgPT4gdGhpcy5oZWlnaHQgPSB2LFxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMudGFyZ2V0LmFjY2Vzc29yKFwiUmVjdGFuZ2xlQ2xpcC54XCIsIHtcbiAgICAgICAgXCJnZXRcIjogKCkgPT4gdGhpcy54LFxuICAgICAgICBcInNldFwiOiAodikgPT4gdGhpcy54ID0gdixcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnRhcmdldC5hY2Nlc3NvcihcIlJlY3RhbmdsZUNsaXAueVwiLCB7XG4gICAgICAgIFwiZ2V0XCI6ICgpID0+IHRoaXMueSxcbiAgICAgICAgXCJzZXRcIjogKHYpID0+IHRoaXMueSA9IHYsXG4gICAgICB9KTtcblxuICAgICAgdGhpcy54ID0gMDtcbiAgICAgIHRoaXMueSA9IDA7XG4gICAgICB0aGlzLndpZHRoID0gdGhpcy50YXJnZXQud2lkdGg7XG4gICAgICB0aGlzLmhlaWdodCA9IHRoaXMudGFyZ2V0LmhlaWdodDtcblxuICAgICAgdGhpcy50YXJnZXQuY2xpcCA9IChjKSA9PiB0aGlzLl9jbGlwKGMpO1xuICAgIH0pO1xuICB9LFxuXG4gIF9jbGlwOiBmdW5jdGlvbihjYW52YXMpIHtcbiAgICBjb25zdCB4ID0gdGhpcy54IC0gKHRoaXMud2lkdGggKiB0aGlzLnRhcmdldC5vcmlnaW5YKTtcbiAgICBjb25zdCB5ID0gdGhpcy55IC0gKHRoaXMuaGVpZ2h0ICogdGhpcy50YXJnZXQub3JpZ2luWSk7XG5cbiAgICBjYW52YXMuYmVnaW5QYXRoKCk7XG4gICAgY2FudmFzLnJlY3QoeCwgeSwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuICAgIGNhbnZhcy5jbG9zZVBhdGgoKTtcbiAgfSxcblxuICBzZXRFbmFibGU6IGZ1bmN0aW9uKGVuYWJsZSkge1xuICAgIHRoaXMuX2VuYWJsZSA9IGVuYWJsZTtcbiAgICBpZiAodGhpcy5fZW5hYmxlKSB7XG4gICAgICB0aGlzLnRhcmdldC5jbGlwID0gKGMpID0+IHRoaXMuX2NsaXAoYyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudGFyZ2V0LmNsaXAgPSBudWxsO1xuICAgIH1cbiAgfSxcblxuICBfYWNjZXNzb3I6IHtcbiAgICBlbmFibGU6IHtcbiAgICAgIHNldDogZnVuY3Rpb24odikge1xuICAgICAgICB0aGlzLnNldEVuYWJsZSh2KTtcbiAgICAgIH0sXG4gICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZW5hYmxlO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxufSk7XG4iLCJwaGluYS5kZWZpbmUoXCJUb2dnbGVcIiwge1xuICBzdXBlckNsYXNzOiBcIkFjY2Vzc29yeVwiLFxuXG4gIGluaXQ6IGZ1bmN0aW9uKGlzT24pIHtcbiAgICB0aGlzLnN1cGVySW5pdCgpO1xuICAgIHRoaXMuX2luaXQoaXNPbik7XG4gIH0sXG5cbiAgX2luaXQ6IGZ1bmN0aW9uKGlzT24pIHtcbiAgICB0aGlzLmlzT24gPSBpc09uIHx8IGZhbHNlO1xuICB9LFxuXG4gIHNldFN0YXR1czogZnVuY3Rpb24oc3RhdHVzKSB7XG4gICAgdGhpcy5pc09uID0gc3RhdHVzO1xuICAgIHRoaXMudGFyZ2V0LmZsYXJlKCh0aGlzLmlzT24pID8gXCJzd2l0Y2hPblwiIDogXCJzd2l0Y2hPZmZcIik7XG4gIH0sXG5cbiAgc3dpdGNoT246IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmlzT24pIHJldHVybjtcbiAgICB0aGlzLnNldFN0YXR1cyh0cnVlKTtcbiAgfSxcblxuICBzd2l0Y2hPZmY6IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5pc09uKSByZXR1cm47XG4gICAgdGhpcy5zZXRTdGF0dXMoZmFsc2UpO1xuICB9LFxuXG4gIHN3aXRjaDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5pc09uID0gIXRoaXMuaXNPbjtcbiAgICB0aGlzLnNldFN0YXR1cyh0aGlzLmlzT24pO1xuICB9LFxuXG4gIF9hY2Nlc3Nvcjoge1xuICAgIHN0YXR1czoge1xuICAgICAgXCJnZXRcIjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmlzT247XG4gICAgICB9LFxuICAgICAgXCJzZXRcIjogZnVuY3Rpb24odikge1xuICAgICAgICByZXR1cm4gc2V0U3RhdHVzKHYpO1xuICAgICAgfSxcbiAgICB9LFxuICB9LFxuXG59KTtcbiIsInBoaW5hLmRlZmluZShcIkJ1dHRvbml6ZVwiLCB7XG4gIGluaXQ6IGZ1bmN0aW9uKCkge30sXG4gIF9zdGF0aWM6IHtcbiAgICBTVEFUVVM6IHtcbiAgICAgIE5PTkU6IDAsXG4gICAgICBTVEFSVDogMSxcbiAgICAgIEVORDogMixcbiAgICB9LFxuICAgIHN0YXR1czogMCxcbiAgICByZWN0OiBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgICBlbGVtZW50LmJvdW5kaW5nVHlwZSA9IFwicmVjdFwiO1xuICAgICAgdGhpcy5fY29tbW9uKGVsZW1lbnQpO1xuICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgfSxcbiAgICBjaXJjbGU6IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICAgIGVsZW1lbnQucmFkaXVzID0gTWF0aC5tYXgoZWxlbWVudC53aWR0aCwgZWxlbWVudC5oZWlnaHQpICogMC41O1xuICAgICAgZWxlbWVudC5ib3VuZGluZ1R5cGUgPSBcImNpcmNsZVwiO1xuICAgICAgdGhpcy5fY29tbW9uKGVsZW1lbnQpO1xuICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgfSxcbiAgICBfY29tbW9uOiBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgICAvL1RPRE8644Ko44OH44Kj44K/44O844Gn44GN44KL44G+44Gn44Gu5pqr5a6a5a++5b+cXG4gICAgICBlbGVtZW50LnNldE9yaWdpbigwLjUsIDAuNSwgdHJ1ZSk7XG5cbiAgICAgIGVsZW1lbnQuaW50ZXJhY3RpdmUgPSB0cnVlO1xuICAgICAgZWxlbWVudC5jbGlja1NvdW5kID0gXCJzZS9jbGlja0J1dHRvblwiO1xuXG4gICAgICAvL1RPRE8644Oc44K/44Oz44Gu5ZCM5pmC5oq85LiL44Gv5a6f5qmf44Gn6Kq/5pW044GZ44KLXG4gICAgICBlbGVtZW50Lm9uKFwicG9pbnRzdGFydFwiLCBlID0+IHtcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzICE9IHRoaXMuU1RBVFVTLk5PTkUpIHJldHVybjtcbiAgICAgICAgdGhpcy5zdGF0dXMgPSB0aGlzLlNUQVRVUy5TVEFSVDtcbiAgICAgICAgZWxlbWVudC50d2VlbmVyLmNsZWFyKClcbiAgICAgICAgICAudG8oe1xuICAgICAgICAgICAgc2NhbGVYOiAwLjksXG4gICAgICAgICAgICBzY2FsZVk6IDAuOVxuICAgICAgICAgIH0sIDEwMCk7XG4gICAgICB9KTtcblxuICAgICAgZWxlbWVudC5vbihcInBvaW50ZW5kXCIsIChlKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLnN0YXR1cyAhPSB0aGlzLlNUQVRVUy5TVEFSVCkgcmV0dXJuO1xuICAgICAgICBjb25zdCBoaXRUZXN0ID0gZWxlbWVudC5oaXRUZXN0KGUucG9pbnRlci54LCBlLnBvaW50ZXIueSk7XG4gICAgICAgIHRoaXMuc3RhdHVzID0gdGhpcy5TVEFUVVMuRU5EO1xuICAgICAgICBpZiAoaGl0VGVzdCkgZWxlbWVudC5mbGFyZShcImNsaWNrU291bmRcIik7XG5cbiAgICAgICAgZWxlbWVudC50d2VlbmVyLmNsZWFyKClcbiAgICAgICAgICAudG8oe1xuICAgICAgICAgICAgc2NhbGVYOiAxLjAsXG4gICAgICAgICAgICBzY2FsZVk6IDEuMFxuICAgICAgICAgIH0sIDEwMClcbiAgICAgICAgICAuY2FsbCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnN0YXR1cyA9IHRoaXMuU1RBVFVTLk5PTkU7XG4gICAgICAgICAgICBpZiAoIWhpdFRlc3QpIHJldHVybjtcbiAgICAgICAgICAgIGVsZW1lbnQuZmxhcmUoXCJjbGlja2VkXCIsIHtcbiAgICAgICAgICAgICAgcG9pbnRlcjogZS5wb2ludGVyXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICAvL+OCouODi+ODoeODvOOCt+ODp+ODs+OBruacgOS4reOBq+WJiumZpOOBleOCjOOBn+WgtOWQiOOBq+WCmeOBiOOBpnJlbW92ZWTjgqTjg5njg7Pjg4jmmYLjgavjg5Xjg6njgrDjgpLlhYPjgavmiLvjgZfjgabjgYrjgY9cbiAgICAgIGVsZW1lbnQub25lKFwicmVtb3ZlZFwiLCAoKSA9PiB7XG4gICAgICAgIHRoaXMuc3RhdHVzID0gdGhpcy5TVEFUVVMuTk9ORTtcbiAgICAgIH0pO1xuXG4gICAgICBlbGVtZW50Lm9uKFwiY2xpY2tTb3VuZFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKCFlbGVtZW50LmNsaWNrU291bmQpIHJldHVybjtcbiAgICAgICAgLy9waGluYS5hc3NldC5Tb3VuZE1hbmFnZXIucGxheShlbGVtZW50LmNsaWNrU291bmQpO1xuICAgICAgfSk7XG4gICAgfSxcbiAgfSxcbn0pO1xuIiwicGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuXG4gIC8qKlxuICAgKiDjg4bjgq/jgrnjg4Hjg6PplqLkv4Ljga7jg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAgICovXG4gIHBoaW5hLmRlZmluZShcIlRleHR1cmVVdGlsXCIsIHtcblxuICAgIF9zdGF0aWM6IHtcblxuICAgICAgLyoqXG4gICAgICAgKiBSR0LlkITopoHntKDjgavlrp/mlbDjgpLnqY3nrpfjgZnjgotcbiAgICAgICAqL1xuICAgICAgbXVsdGlwbHlDb2xvcjogZnVuY3Rpb24odGV4dHVyZSwgcmVkLCBncmVlbiwgYmx1ZSkge1xuICAgICAgICBpZiAodHlwZW9mKHRleHR1cmUpID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgdGV4dHVyZSA9IEFzc2V0TWFuYWdlci5nZXQoXCJpbWFnZVwiLCB0ZXh0dXJlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHdpZHRoID0gdGV4dHVyZS5kb21FbGVtZW50LndpZHRoO1xuICAgICAgICBjb25zdCBoZWlnaHQgPSB0ZXh0dXJlLmRvbUVsZW1lbnQuaGVpZ2h0O1xuXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IENhbnZhcygpLnNldFNpemUod2lkdGgsIGhlaWdodCk7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSByZXN1bHQuY29udGV4dDtcblxuICAgICAgICBjb250ZXh0LmRyYXdJbWFnZSh0ZXh0dXJlLmRvbUVsZW1lbnQsIDAsIDApO1xuICAgICAgICBjb25zdCBpbWFnZURhdGEgPSBjb250ZXh0LmdldEltYWdlRGF0YSgwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbWFnZURhdGEuZGF0YS5sZW5ndGg7IGkgKz0gNCkge1xuICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2kgKyAwXSA9IE1hdGguZmxvb3IoaW1hZ2VEYXRhLmRhdGFbaSArIDBdICogcmVkKTtcbiAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpICsgMV0gPSBNYXRoLmZsb29yKGltYWdlRGF0YS5kYXRhW2kgKyAxXSAqIGdyZWVuKTtcbiAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpICsgMl0gPSBNYXRoLmZsb29yKGltYWdlRGF0YS5kYXRhW2kgKyAyXSAqIGJsdWUpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQucHV0SW1hZ2VEYXRhKGltYWdlRGF0YSwgMCwgMCk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAgICog6Imy55u444O75b2p5bqm44O75piO5bqm44KS5pON5L2c44GZ44KLXG4gICAgICAgKi9cbiAgICAgIGVkaXRCeUhzbDogZnVuY3Rpb24odGV4dHVyZSwgaCwgcywgbCkge1xuICAgICAgICBpZiAodHlwZW9mKHRleHR1cmUpID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgdGV4dHVyZSA9IEFzc2V0TWFuYWdlci5nZXQoXCJpbWFnZVwiLCB0ZXh0dXJlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHdpZHRoID0gdGV4dHVyZS5kb21FbGVtZW50LndpZHRoO1xuICAgICAgICBjb25zdCBoZWlnaHQgPSB0ZXh0dXJlLmRvbUVsZW1lbnQuaGVpZ2h0O1xuXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IENhbnZhcygpLnNldFNpemUod2lkdGgsIGhlaWdodCk7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSByZXN1bHQuY29udGV4dDtcblxuICAgICAgICBjb250ZXh0LmRyYXdJbWFnZSh0ZXh0dXJlLmRvbUVsZW1lbnQsIDAsIDApO1xuICAgICAgICBjb25zdCBpbWFnZURhdGEgPSBjb250ZXh0LmdldEltYWdlRGF0YSgwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbWFnZURhdGEuZGF0YS5sZW5ndGg7IGkgKz0gNCkge1xuICAgICAgICAgIGNvbnN0IHIgPSBpbWFnZURhdGEuZGF0YVtpICsgMF07XG4gICAgICAgICAgY29uc3QgZyA9IGltYWdlRGF0YS5kYXRhW2kgKyAxXTtcbiAgICAgICAgICBjb25zdCBiID0gaW1hZ2VEYXRhLmRhdGFbaSArIDJdO1xuXG4gICAgICAgICAgY29uc3QgaHNsID0gcGhpbmEudXRpbC5Db2xvci5SR0J0b0hTTChyLCBnLCBiKTtcbiAgICAgICAgICBjb25zdCBuZXdSZ2IgPSBwaGluYS51dGlsLkNvbG9yLkhTTHRvUkdCKGhzbFswXSArIGgsIE1hdGguY2xhbXAoaHNsWzFdICsgcywgMCwgMTAwKSwgTWF0aC5jbGFtcChoc2xbMl0gKyBsLCAwLCAxMDApKTtcblxuICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2kgKyAwXSA9IG5ld1JnYlswXTtcbiAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpICsgMV0gPSBuZXdSZ2JbMV07XG4gICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaSArIDJdID0gbmV3UmdiWzJdO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQucHV0SW1hZ2VEYXRhKGltYWdlRGF0YSwgMCwgMCk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH0sXG5cbiAgICB9LFxuXG4gICAgaW5pdDogZnVuY3Rpb24oKSB7fSxcbiAgfSk7XG5cbn0pO1xuIiwiLypcbiAqICBwaGluYS50aWxlZG1hcC5qc1xuICogIDIwMTYvOS8xMFxuICogIEBhdXRoZXIgbWluaW1vICBcbiAqICBUaGlzIFByb2dyYW0gaXMgTUlUIGxpY2Vuc2UuXG4gKiBcbiAqICAyMDE5LzkvMThcbiAqICB2ZXJzaW9uIDIuMFxuICovXG5cbnBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5kZWZpbmUoXCJwaGluYS5hc3NldC5UaWxlZE1hcFwiLCB7XG4gICAgc3VwZXJDbGFzczogXCJwaGluYS5hc3NldC5YTUxMb2FkZXJcIixcblxuICAgIGltYWdlOiBudWxsLFxuXG4gICAgdGlsZXNldHM6IG51bGwsXG4gICAgbGF5ZXJzOiBudWxsLFxuXG4gICAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuc3VwZXJJbml0KCk7XG4gICAgfSxcblxuICAgIF9sb2FkOiBmdW5jdGlvbihyZXNvbHZlKSB7XG4gICAgICAvL+ODkeOCueaKnOOBjeWHuuOBl1xuICAgICAgdGhpcy5wYXRoID0gXCJcIjtcbiAgICAgIGNvbnN0IGxhc3QgPSB0aGlzLnNyYy5sYXN0SW5kZXhPZihcIi9cIik7XG4gICAgICBpZiAobGFzdCA+IDApIHtcbiAgICAgICAgdGhpcy5wYXRoID0gdGhpcy5zcmMuc3Vic3RyaW5nKDAsIGxhc3QgKyAxKTtcbiAgICAgIH1cblxuICAgICAgLy/ntYLkuobplqLmlbDkv53lrZhcbiAgICAgIHRoaXMuX3Jlc29sdmUgPSByZXNvbHZlO1xuXG4gICAgICAvLyBsb2FkXG4gICAgICBjb25zdCB4bWwgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgIHhtbC5vcGVuKCdHRVQnLCB0aGlzLnNyYyk7XG4gICAgICB4bWwub25yZWFkeXN0YXRlY2hhbmdlID0gKCkgPT4ge1xuICAgICAgICBpZiAoeG1sLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICBpZiAoWzIwMCwgMjAxLCAwXS5pbmRleE9mKHhtbC5zdGF0dXMpICE9PSAtMSkge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IChuZXcgRE9NUGFyc2VyKCkpLnBhcnNlRnJvbVN0cmluZyh4bWwucmVzcG9uc2VUZXh0LCBcInRleHQveG1sXCIpO1xuICAgICAgICAgICAgdGhpcy5kYXRhVHlwZSA9IFwieG1sXCI7XG4gICAgICAgICAgICB0aGlzLmRhdGEgPSBkYXRhO1xuICAgICAgICAgICAgdGhpcy5fcGFyc2UoZGF0YSlcbiAgICAgICAgICAgICAgLnRoZW4oKCkgPT4gdGhpcy5fcmVzb2x2ZSh0aGlzKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgeG1sLnNlbmQobnVsbCk7XG4gICAgfSxcblxuICAgIC8v44Oe44OD44OX44Kk44Oh44O844K45Y+W5b6XXG4gICAgZ2V0SW1hZ2U6IGZ1bmN0aW9uKGxheWVyTmFtZSkge1xuICAgICAgaWYgKGxheWVyTmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmltYWdlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2dlbmVyYXRlSW1hZ2UobGF5ZXJOYW1lKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLy/mjIflrprjg57jg4Pjg5fjg6zjgqTjg6Tjg7zjgpLphY3liJfjgajjgZfjgablj5blvpdcbiAgICBnZXRNYXBEYXRhOiBmdW5jdGlvbihsYXllck5hbWUpIHtcbiAgICAgIC8v44Os44Kk44Ok44O85qSc57SiXG4gICAgICBmb3IobGV0IGkgPSAwOyBpIDwgdGhpcy5sYXllcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHRoaXMubGF5ZXJzW2ldLm5hbWUgPT0gbGF5ZXJOYW1lKSB7XG4gICAgICAgICAgLy/jgrPjg5Tjg7zjgpLov5TjgZlcbiAgICAgICAgICByZXR1cm4gdGhpcy5sYXllcnNbaV0uZGF0YS5jb25jYXQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSxcblxuICAgIC8v44Kq44OW44K444Kn44Kv44OI44Kw44Or44O844OX44KS5Y+W5b6X77yI5oyH5a6a44GM54Sh44GE5aC05ZCI44CB5YWo44Os44Kk44Ok44O844KS6YWN5YiX44Gr44GX44Gm6L+U44GZ77yJXG4gICAgZ2V0T2JqZWN0R3JvdXA6IGZ1bmN0aW9uKGdyb3VwTmFtZSkge1xuICAgICAgZ3JvdXBOYW1lID0gZ3JvdXBOYW1lIHx8IG51bGw7XG4gICAgICBjb25zdCBscyA9IFtdO1xuICAgICAgY29uc3QgbGVuID0gdGhpcy5sYXllcnMubGVuZ3RoO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAodGhpcy5sYXllcnNbaV0udHlwZSA9PSBcIm9iamVjdGdyb3VwXCIpIHtcbiAgICAgICAgICBpZiAoZ3JvdXBOYW1lID09IG51bGwgfHwgZ3JvdXBOYW1lID09IHRoaXMubGF5ZXJzW2ldLm5hbWUpIHtcbiAgICAgICAgICAgIC8v44Os44Kk44Ok44O85oOF5aCx44KS44Kv44Ot44O844Oz44GZ44KLXG4gICAgICAgICAgICBjb25zdCBvYmogPSB0aGlzLl9jbG9uZU9iamVjdExheWVyKHRoaXMubGF5ZXJzW2ldKTtcbiAgICAgICAgICAgIGlmIChncm91cE5hbWUgIT09IG51bGwpIHJldHVybiBvYmo7XG4gICAgICAgICAgICBscy5wdXNoKG9iaik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbHM7XG4gICAgfSxcblxuICAgIC8v44Kq44OW44K444Kn44Kv44OI44Os44Kk44Ok44O844KS44Kv44Ot44O844Oz44GX44Gm6L+U44GZXG4gICAgX2Nsb25lT2JqZWN0TGF5ZXI6IGZ1bmN0aW9uKHNyY0xheWVyKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSB7fS4kc2FmZShzcmNMYXllcik7XG4gICAgICByZXN1bHQub2JqZWN0cyA9IFtdO1xuICAgICAgLy/jg6zjgqTjg6Tjg7zlhoXjgqrjg5bjgrjjgqfjgq/jg4jjga7jgrPjg5Tjg7xcbiAgICAgIHNyY0xheWVyLm9iamVjdHMuZm9yRWFjaChvYmogPT4ge1xuICAgICAgICBjb25zdCByZXNPYmogPSB7XG4gICAgICAgICAgcHJvcGVydGllczoge30uJHNhZmUob2JqLnByb3BlcnRpZXMpLFxuICAgICAgICB9LiRleHRlbmQob2JqKTtcbiAgICAgICAgaWYgKG9iai5lbGxpcHNlKSByZXNPYmouZWxsaXBzZSA9IG9iai5lbGxpcHNlO1xuICAgICAgICBpZiAob2JqLmdpZCkgcmVzT2JqLmdpZCA9IG9iai5naWQ7XG4gICAgICAgIGlmIChvYmoucG9seWdvbikgcmVzT2JqLnBvbHlnb24gPSBvYmoucG9seWdvbi5jbG9uZSgpO1xuICAgICAgICBpZiAob2JqLnBvbHlsaW5lKSByZXNPYmoucG9seWxpbmUgPSBvYmoucG9seWxpbmUuY2xvbmUoKTtcbiAgICAgICAgcmVzdWx0Lm9iamVjdHMucHVzaChyZXNPYmopO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICBfcGFyc2U6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgLy/jgr/jgqTjg6vlsZ7mgKfmg4XloLHlj5blvpdcbiAgICAgICAgY29uc3QgbWFwID0gZGF0YS5nZXRFbGVtZW50c0J5VGFnTmFtZSgnbWFwJylbMF07XG4gICAgICAgIGNvbnN0IGF0dHIgPSB0aGlzLl9hdHRyVG9KU09OKG1hcCk7XG4gICAgICAgIHRoaXMuJGV4dGVuZChhdHRyKTtcbiAgICAgICAgdGhpcy5wcm9wZXJ0aWVzID0gdGhpcy5fcHJvcGVydGllc1RvSlNPTihtYXApO1xuXG4gICAgICAgIC8v44K/44Kk44Or44K744OD44OI5Y+W5b6XXG4gICAgICAgIHRoaXMudGlsZXNldHMgPSB0aGlzLl9wYXJzZVRpbGVzZXRzKGRhdGEpO1xuICAgICAgICB0aGlzLnRpbGVzZXRzLnNvcnQoKGEsIGIpID0+IGEuZmlyc3RnaWQgLSBiLmZpcnN0Z2lkKTtcblxuICAgICAgICAvL+ODrOOCpOODpOODvOWPluW+l1xuICAgICAgICB0aGlzLmxheWVycyA9IHRoaXMuX3BhcnNlTGF5ZXJzKGRhdGEpO1xuXG4gICAgICAgIC8v44Kk44Oh44O844K444OH44O844K/6Kqt44G/6L6844G/XG4gICAgICAgIHRoaXMuX2NoZWNrSW1hZ2UoKVxuICAgICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICAgIC8v44Oe44OD44OX44Kk44Oh44O844K455Sf5oiQXG4gICAgICAgICAgICB0aGlzLmltYWdlID0gdGhpcy5fZ2VuZXJhdGVJbWFnZSgpO1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgIH0pO1xuICAgICAgfSlcbiAgICB9LFxuXG4gICAgLy/jgr/jgqTjg6vjgrvjg4Pjg4jjga7jg5Hjg7zjgrlcbiAgICBfcGFyc2VUaWxlc2V0czogZnVuY3Rpb24oeG1sKSB7XG4gICAgICBjb25zdCBlYWNoID0gQXJyYXkucHJvdG90eXBlLmZvckVhY2g7XG4gICAgICBjb25zdCBkYXRhID0gW107XG4gICAgICBjb25zdCB0aWxlc2V0cyA9IHhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZSgndGlsZXNldCcpO1xuICAgICAgZWFjaC5jYWxsKHRpbGVzZXRzLCBhc3luYyB0aWxlc2V0ID0+IHtcbiAgICAgICAgY29uc3QgdCA9IHt9O1xuICAgICAgICBjb25zdCBhdHRyID0gdGhpcy5fYXR0clRvSlNPTih0aWxlc2V0KTtcbiAgICAgICAgaWYgKGF0dHIuc291cmNlKSB7XG4gICAgICAgICAgdC5pc09sZEZvcm1hdCA9IGZhbHNlO1xuICAgICAgICAgIHQuc291cmNlID0gdGhpcy5wYXRoICsgYXR0ci5zb3VyY2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy/ml6fjg4fjg7zjgr/lvaLlvI/vvIjmnKrlr77lv5zvvIlcbiAgICAgICAgICB0LmlzT2xkRm9ybWF0ID0gdHJ1ZTtcbiAgICAgICAgICB0LmRhdGEgPSB0aWxlc2V0O1xuICAgICAgICB9XG4gICAgICAgIHQuZmlyc3RnaWQgPSBhdHRyLmZpcnN0Z2lkO1xuICAgICAgICBkYXRhLnB1c2godCk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBkYXRhO1xuICAgIH0sXG5cbiAgICAvL+ODrOOCpOODpOODvOaDheWgseOBruODkeODvOOCuVxuICAgIF9wYXJzZUxheWVyczogZnVuY3Rpb24oeG1sKSB7XG4gICAgICBjb25zdCBlYWNoID0gQXJyYXkucHJvdG90eXBlLmZvckVhY2g7XG4gICAgICBjb25zdCBkYXRhID0gW107XG5cbiAgICAgIGNvbnN0IG1hcCA9IHhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZShcIm1hcFwiKVswXTtcbiAgICAgIGNvbnN0IGxheWVycyA9IFtdO1xuICAgICAgZWFjaC5jYWxsKG1hcC5jaGlsZE5vZGVzLCBlbG0gPT4ge1xuICAgICAgICBpZiAoZWxtLnRhZ05hbWUgPT0gXCJsYXllclwiIHx8IGVsbS50YWdOYW1lID09IFwib2JqZWN0Z3JvdXBcIiB8fCBlbG0udGFnTmFtZSA9PSBcImltYWdlbGF5ZXJcIikge1xuICAgICAgICAgIGxheWVycy5wdXNoKGVsbSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBsYXllcnMuZWFjaChsYXllciA9PiB7XG4gICAgICAgIHN3aXRjaCAobGF5ZXIudGFnTmFtZSkge1xuICAgICAgICAgIGNhc2UgXCJsYXllclwiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAvL+mAmuW4uOODrOOCpOODpOODvFxuICAgICAgICAgICAgICBjb25zdCBkID0gbGF5ZXIuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2RhdGEnKVswXTtcbiAgICAgICAgICAgICAgY29uc3QgZW5jb2RpbmcgPSBkLmdldEF0dHJpYnV0ZShcImVuY29kaW5nXCIpO1xuICAgICAgICAgICAgICBjb25zdCBsID0ge1xuICAgICAgICAgICAgICAgICAgdHlwZTogXCJsYXllclwiLFxuICAgICAgICAgICAgICAgICAgbmFtZTogbGF5ZXIuZ2V0QXR0cmlidXRlKFwibmFtZVwiKSxcbiAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICBpZiAoZW5jb2RpbmcgPT0gXCJjc3ZcIikge1xuICAgICAgICAgICAgICAgICAgbC5kYXRhID0gdGhpcy5fcGFyc2VDU1YoZC50ZXh0Q29udGVudCk7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAoZW5jb2RpbmcgPT0gXCJiYXNlNjRcIikge1xuICAgICAgICAgICAgICAgICAgbC5kYXRhID0gdGhpcy5fcGFyc2VCYXNlNjQoZC50ZXh0Q29udGVudCk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBjb25zdCBhdHRyID0gdGhpcy5fYXR0clRvSlNPTihsYXllcik7XG4gICAgICAgICAgICAgIGwuJGV4dGVuZChhdHRyKTtcbiAgICAgICAgICAgICAgbC5wcm9wZXJ0aWVzID0gdGhpcy5fcHJvcGVydGllc1RvSlNPTihsYXllcik7XG5cbiAgICAgICAgICAgICAgZGF0YS5wdXNoKGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAvL+OCquODluOCuOOCp+OCr+ODiOODrOOCpOODpOODvFxuICAgICAgICAgIGNhc2UgXCJvYmplY3Rncm91cFwiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCBsID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0Z3JvdXBcIixcbiAgICAgICAgICAgICAgICBvYmplY3RzOiBbXSxcbiAgICAgICAgICAgICAgICBuYW1lOiBsYXllci5nZXRBdHRyaWJ1dGUoXCJuYW1lXCIpLFxuICAgICAgICAgICAgICAgIHg6IHBhcnNlRmxvYXQobGF5ZXIuZ2V0QXR0cmlidXRlKFwib2Zmc2V0eFwiKSkgfHwgMCxcbiAgICAgICAgICAgICAgICB5OiBwYXJzZUZsb2F0KGxheWVyLmdldEF0dHJpYnV0ZShcIm9mZnNldHlcIikpIHx8IDAsXG4gICAgICAgICAgICAgICAgYWxwaGE6IGxheWVyLmdldEF0dHJpYnV0ZShcIm9wYWNpdHlcIikgfHwgMSxcbiAgICAgICAgICAgICAgICBjb2xvcjogbGF5ZXIuZ2V0QXR0cmlidXRlKFwiY29sb3JcIikgfHwgbnVsbCxcbiAgICAgICAgICAgICAgICBkcmF3b3JkZXI6IGxheWVyLmdldEF0dHJpYnV0ZShcImRyYXdvcmRlclwiKSB8fCBudWxsLFxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBlYWNoLmNhbGwobGF5ZXIuY2hpbGROb2RlcywgZWxtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZWxtLm5vZGVUeXBlID09IDMpIHJldHVybjtcbiAgICAgICAgICAgICAgICBjb25zdCBkID0gdGhpcy5fYXR0clRvSlNPTihlbG0pO1xuICAgICAgICAgICAgICAgIGQucHJvcGVydGllcyA9IHRoaXMuX3Byb3BlcnRpZXNUb0pTT04oZWxtKTtcbiAgICAgICAgICAgICAgICAvL+WtkOimgee0oOOBruino+aekFxuICAgICAgICAgICAgICAgIGlmIChlbG0uY2hpbGROb2Rlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgIGVsbS5jaGlsZE5vZGVzLmZvckVhY2goZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlLm5vZGVUeXBlID09IDMpIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgLy/mpZXlhoZcbiAgICAgICAgICAgICAgICAgICAgaWYgKGUubm9kZU5hbWUgPT0gJ2VsbGlwc2UnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgZC5lbGxpcHNlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvL+WkmuinkuW9olxuICAgICAgICAgICAgICAgICAgICBpZiAoZS5ub2RlTmFtZSA9PSAncG9seWdvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICBkLnBvbHlnb24gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhdHRyID0gdGhpcy5fYXR0clRvSlNPTl9zdHIoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGwgPSBhdHRyLnBvaW50cy5zcGxpdChcIiBcIik7XG4gICAgICAgICAgICAgICAgICAgICAgcGwuZm9yRWFjaChmdW5jdGlvbihzdHIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHB0cyA9IHN0ci5zcGxpdChcIixcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBkLnBvbHlnb24ucHVzaCh7eDogcGFyc2VGbG9hdChwdHNbMF0pLCB5OiBwYXJzZUZsb2F0KHB0c1sxXSl9KTtcbiAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvL+e3muWIhlxuICAgICAgICAgICAgICAgICAgICBpZiAoZS5ub2RlTmFtZSA9PSAncG9seWxpbmUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgZC5wb2x5bGluZSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGF0dHIgPSB0aGlzLl9hdHRyVG9KU09OX3N0cihlKTtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwbCA9IGF0dHIucG9pbnRzLnNwbGl0KFwiIFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICBwbC5mb3JFYWNoKHN0ciA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwdHMgPSBzdHIuc3BsaXQoXCIsXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZC5wb2x5bGluZS5wdXNoKHt4OiBwYXJzZUZsb2F0KHB0c1swXSksIHk6IHBhcnNlRmxvYXQocHRzWzFdKX0pO1xuICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbC5vYmplY3RzLnB1c2goZCk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBsLnByb3BlcnRpZXMgPSB0aGlzLl9wcm9wZXJ0aWVzVG9KU09OKGxheWVyKTtcblxuICAgICAgICAgICAgICBkYXRhLnB1c2gobCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgIC8v44Kk44Oh44O844K444Os44Kk44Ok44O8XG4gICAgICAgICAgY2FzZSBcImltYWdlbGF5ZXJcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgbCA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBcImltYWdlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICBuYW1lOiBsYXllci5nZXRBdHRyaWJ1dGUoXCJuYW1lXCIpLFxuICAgICAgICAgICAgICAgIHg6IHBhcnNlRmxvYXQobGF5ZXIuZ2V0QXR0cmlidXRlKFwib2Zmc2V0eFwiKSkgfHwgMCxcbiAgICAgICAgICAgICAgICB5OiBwYXJzZUZsb2F0KGxheWVyLmdldEF0dHJpYnV0ZShcIm9mZnNldHlcIikpIHx8IDAsXG4gICAgICAgICAgICAgICAgYWxwaGE6IGxheWVyLmdldEF0dHJpYnV0ZShcIm9wYWNpdHlcIikgfHwgMSxcbiAgICAgICAgICAgICAgICB2aXNpYmxlOiAobGF5ZXIuZ2V0QXR0cmlidXRlKFwidmlzaWJsZVwiKSA9PT0gdW5kZWZpbmVkIHx8IGxheWVyLmdldEF0dHJpYnV0ZShcInZpc2libGVcIikgIT0gMCksXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGNvbnN0IGltYWdlRWxtID0gbGF5ZXIuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJpbWFnZVwiKVswXTtcbiAgICAgICAgICAgICAgbC5pbWFnZSA9IHtzb3VyY2U6IGltYWdlRWxtLmdldEF0dHJpYnV0ZShcInNvdXJjZVwiKX07XG5cbiAgICAgICAgICAgICAgZGF0YS5wdXNoKGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgLy/jgrDjg6vjg7zjg5dcbiAgICAgICAgICBjYXNlIFwiZ3JvdXBcIjpcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBkYXRhO1xuICAgIH0sXG5cbiAgICAvL+OCouOCu+ODg+ODiOOBq+eEoeOBhOOCpOODoeODvOOCuOODh+ODvOOCv+OCkuiqreOBv+i+vOOBv1xuICAgIF9jaGVja0ltYWdlOiBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnN0IGltYWdlU291cmNlID0gW107XG4gICAgICBjb25zdCBsb2FkSW1hZ2UgPSBbXTtcblxuICAgICAgLy/kuIDopqfkvZzmiJBcbiAgICAgIHRoaXMudGlsZXNldHMuZm9yRWFjaCh0aWxlc2V0ID0+IHtcbiAgICAgICAgY29uc3Qgb2JqID0ge1xuICAgICAgICAgIGlzVGlsZXNldDogdHJ1ZSxcbiAgICAgICAgICBpbWFnZTogdGlsZXNldC5zb3VyY2UsXG4gICAgICAgIH07XG4gICAgICAgIGltYWdlU291cmNlLnB1c2gob2JqKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5sYXllcnMuZm9yRWFjaChsYXllciA9PiB7XG4gICAgICAgIGlmIChsYXllci5pbWFnZSkge1xuICAgICAgICAgIGNvbnN0IG9iaiA9IHtcbiAgICAgICAgICAgIGlzVGlsZXNldDogZmFsc2UsXG4gICAgICAgICAgICBpbWFnZTogbGF5ZXIuaW1hZ2Uuc291cmNlLFxuICAgICAgICAgIH07XG4gICAgICAgICAgaW1hZ2VTb3VyY2UucHVzaChvYmopO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy/jgqLjgrvjg4Pjg4jjgavjgYLjgovjgYvnorroqo1cbiAgICAgIGltYWdlU291cmNlLmZvckVhY2goZSA9PiB7XG4gICAgICAgIGlmIChlLmlzVGlsZXNldCkge1xuICAgICAgICAgIGNvbnN0IHRzeCA9IHBoaW5hLmFzc2V0LkFzc2V0TWFuYWdlci5nZXQoJ3RzeCcsIGUuaW1hZ2UpO1xuICAgICAgICAgIGlmICghdHN4KSB7XG4gICAgICAgICAgICAvL+OCouOCu+ODg+ODiOOBq+OBquOBi+OBo+OBn+OBruOBp+ODreODvOODieODquOCueODiOOBq+i/veWKoFxuICAgICAgICAgICAgbG9hZEltYWdlLnB1c2goZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGltYWdlID0gcGhpbmEuYXNzZXQuQXNzZXRNYW5hZ2VyLmdldCgnaW1hZ2UnLCBlLmltYWdlKTtcbiAgICAgICAgICBpZiAoIWltYWdlKSB7XG4gICAgICAgICAgICAvL+OCouOCu+ODg+ODiOOBq+OBquOBi+OBo+OBn+OBruOBp+ODreODvOODieODquOCueODiOOBq+i/veWKoFxuICAgICAgICAgICAgbG9hZEltYWdlLnB1c2goZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy/kuIDmi6zjg63jg7zjg4lcbiAgICAgIC8v44Ot44O844OJ44Oq44K544OI5L2c5oiQXG4gICAgICBpZiAobG9hZEltYWdlLmxlbmd0aCkge1xuICAgICAgICBjb25zdCBhc3NldHMgPSB7IGltYWdlOiBbXSwgdHN4OiBbXSB9O1xuICAgICAgICBsb2FkSW1hZ2UuZm9yRWFjaChlID0+IHtcbiAgICAgICAgICBpZiAoZS5pc1RpbGVzZXQpIHtcbiAgICAgICAgICAgIGFzc2V0cy50c3hbZS5pbWFnZV0gPSBlLmltYWdlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvL+OCouOCu+ODg+ODiOOBruODkeOCueOCkuODnuODg+ODl+OBqOWQjOOBmOOBq+OBmeOCi1xuICAgICAgICAgICAgYXNzZXRzLmltYWdlW2UuaW1hZ2VdID0gdGhpcy5wYXRoICsgZS5pbWFnZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgY29uc3QgbG9hZGVyID0gcGhpbmEuYXNzZXQuQXNzZXRMb2FkZXIoKTtcbiAgICAgICAgICBsb2FkZXIubG9hZChhc3NldHMpO1xuICAgICAgICAgIGxvYWRlci5vbignbG9hZCcsICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMudGlsZXNldHMuZm9yRWFjaChlID0+IHtcbiAgICAgICAgICAgICAgZS50c3ggPSBwaGluYS5hc3NldC5Bc3NldE1hbmFnZXIuZ2V0KCd0c3gnLCBlLnNvdXJjZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIC8v44Oe44OD44OX44Kk44Oh44O844K45L2c5oiQXG4gICAgX2dlbmVyYXRlSW1hZ2U6IGZ1bmN0aW9uKGxheWVyTmFtZSkge1xuICAgICAgbGV0IG51bUxheWVyID0gMDtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5sYXllcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHRoaXMubGF5ZXJzW2ldLnR5cGUgPT0gXCJsYXllclwiIHx8IHRoaXMubGF5ZXJzW2ldLnR5cGUgPT0gXCJpbWFnZWxheWVyXCIpIG51bUxheWVyKys7XG4gICAgICB9XG4gICAgICBpZiAobnVtTGF5ZXIgPT0gMCkgcmV0dXJuIG51bGw7XG5cbiAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy53aWR0aCAqIHRoaXMudGlsZXdpZHRoO1xuICAgICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5oZWlnaHQgKiB0aGlzLnRpbGVoZWlnaHQ7XG4gICAgICBjb25zdCBjYW52YXMgPSBwaGluYS5ncmFwaGljcy5DYW52YXMoKS5zZXRTaXplKHdpZHRoLCBoZWlnaHQpO1xuXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubGF5ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIC8v44Oe44OD44OX44Os44Kk44Ok44O8XG4gICAgICAgIGlmICh0aGlzLmxheWVyc1tpXS50eXBlID09IFwibGF5ZXJcIiAmJiB0aGlzLmxheWVyc1tpXS52aXNpYmxlICE9IFwiMFwiKSB7XG4gICAgICAgICAgaWYgKGxheWVyTmFtZSA9PT0gdW5kZWZpbmVkIHx8IGxheWVyTmFtZSA9PT0gdGhpcy5sYXllcnNbaV0ubmFtZSkge1xuICAgICAgICAgICAgY29uc3QgbGF5ZXIgPSB0aGlzLmxheWVyc1tpXTtcbiAgICAgICAgICAgIGNvbnN0IG1hcGRhdGEgPSBsYXllci5kYXRhO1xuICAgICAgICAgICAgY29uc3Qgd2lkdGggPSBsYXllci53aWR0aDtcbiAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IGxheWVyLmhlaWdodDtcbiAgICAgICAgICAgIGNvbnN0IG9wYWNpdHkgPSBsYXllci5vcGFjaXR5IHx8IDEuMDtcbiAgICAgICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgICAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgeSsrKSB7XG4gICAgICAgICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7IHgrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gbWFwZGF0YVtjb3VudF07XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAvL+ODnuODg+ODl+ODgeODg+ODl+OCkumFjee9rlxuICAgICAgICAgICAgICAgICAgdGhpcy5fc2V0TWFwQ2hpcChjYW52YXMsIGluZGV4LCB4ICogdGhpcy50aWxld2lkdGgsIHkgKiB0aGlzLnRpbGVoZWlnaHQsIG9wYWNpdHkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8v44Kq44OW44K444Kn44Kv44OI44Kw44Or44O844OXXG4gICAgICAgIGlmICh0aGlzLmxheWVyc1tpXS50eXBlID09IFwib2JqZWN0Z3JvdXBcIiAmJiB0aGlzLmxheWVyc1tpXS52aXNpYmxlICE9IFwiMFwiKSB7XG4gICAgICAgICAgaWYgKGxheWVyTmFtZSA9PT0gdW5kZWZpbmVkIHx8IGxheWVyTmFtZSA9PT0gdGhpcy5sYXllcnNbaV0ubmFtZSkge1xuICAgICAgICAgICAgY29uc3QgbGF5ZXIgPSB0aGlzLmxheWVyc1tpXTtcbiAgICAgICAgICAgIGNvbnN0IG9wYWNpdHkgPSBsYXllci5vcGFjaXR5IHx8IDEuMDtcbiAgICAgICAgICAgIGxheWVyLm9iamVjdHMuZm9yRWFjaChmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgIGlmIChlLmdpZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3NldE1hcENoaXAoY2FudmFzLCBlLmdpZCwgZS54LCBlLnksIG9wYWNpdHkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvL+OCpOODoeODvOOCuOODrOOCpOODpOODvFxuICAgICAgICBpZiAodGhpcy5sYXllcnNbaV0udHlwZSA9PSBcImltYWdlbGF5ZXJcIiAmJiB0aGlzLmxheWVyc1tpXS52aXNpYmxlICE9IFwiMFwiKSB7XG4gICAgICAgICAgaWYgKGxheWVyTmFtZSA9PT0gdW5kZWZpbmVkIHx8IGxheWVyTmFtZSA9PT0gdGhpcy5sYXllcnNbaV0ubmFtZSkge1xuICAgICAgICAgICAgY29uc3QgaW1hZ2UgPSBwaGluYS5hc3NldC5Bc3NldE1hbmFnZXIuZ2V0KCdpbWFnZScsIHRoaXMubGF5ZXJzW2ldLmltYWdlLnNvdXJjZSk7XG4gICAgICAgICAgICBjYW52YXMuY29udGV4dC5kcmF3SW1hZ2UoaW1hZ2UuZG9tRWxlbWVudCwgdGhpcy5sYXllcnNbaV0ueCwgdGhpcy5sYXllcnNbaV0ueSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHRleHR1cmUgPSBwaGluYS5hc3NldC5UZXh0dXJlKCk7XG4gICAgICB0ZXh0dXJlLmRvbUVsZW1lbnQgPSBjYW52YXMuZG9tRWxlbWVudDtcbiAgICAgIHJldHVybiB0ZXh0dXJlO1xuICAgIH0sXG5cbiAgICAvL+OCreODo+ODs+ODkOOCueOBruaMh+WumuOBl+OBn+W6p+aomeOBq+ODnuODg+ODl+ODgeODg+ODl+OBruOCpOODoeODvOOCuOOCkuOCs+ODlOODvOOBmeOCi1xuICAgIF9zZXRNYXBDaGlwOiBmdW5jdGlvbihjYW52YXMsIGluZGV4LCB4LCB5LCBvcGFjaXR5KSB7XG4gICAgICAvL+WvvuixoeOCv+OCpOODq+OCu+ODg+ODiOOBruWIpOWIpVxuICAgICAgbGV0IHRpbGVzZXQ7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGlsZXNldHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgdHN4MSA9IHRoaXMudGlsZXNldHNbaV07XG4gICAgICAgIGNvbnN0IHRzeDIgPSB0aGlzLnRpbGVzZXRzW2kgKyAxXTtcbiAgICAgICAgaWYgKCF0c3gyKSB7XG4gICAgICAgICAgdGlsZXNldCA9IHRzeDE7XG4gICAgICAgICAgaSA9IHRoaXMudGlsZXNldHMubGVuZ3RoO1xuICAgICAgICB9IGVsc2UgaWYgKHRzeDEuZmlyc3RnaWQgPD0gaW5kZXggJiYgaW5kZXggPCB0c3gyLmZpcnN0Z2lkKSB7XG4gICAgICAgICAgdGlsZXNldCA9IHRzeDE7XG4gICAgICAgICAgaSA9IHRoaXMudGlsZXNldHMubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvL+OCv+OCpOODq+OCu+ODg+ODiOOBi+OCieODnuODg+ODl+ODgeODg+ODl+OCkuWPluW+l1xuICAgICAgY29uc3QgdHN4ID0gdGlsZXNldC50c3g7XG4gICAgICBjb25zdCBjaGlwID0gdHN4LmNoaXBzW2luZGV4IC0gdGlsZXNldC5maXJzdGdpZF07XG4gICAgICBjb25zdCBpbWFnZSA9IHBoaW5hLmFzc2V0LkFzc2V0TWFuYWdlci5nZXQoJ2ltYWdlJywgY2hpcC5pbWFnZSk7XG4gICAgICBjYW52YXMuY29udGV4dC5kcmF3SW1hZ2UoXG4gICAgICAgIGltYWdlLmRvbUVsZW1lbnQsXG4gICAgICAgIGNoaXAueCArIHRzeC5tYXJnaW4sIGNoaXAueSArIHRzeC5tYXJnaW4sXG4gICAgICAgIHRzeC50aWxld2lkdGgsIHRzeC50aWxlaGVpZ2h0LFxuICAgICAgICB4LCB5LFxuICAgICAgICB0c3gudGlsZXdpZHRoLCB0c3gudGlsZWhlaWdodCk7XG4gICAgfSxcblxuICB9KTtcblxuICAvL+ODreODvOODgOODvOOBq+i/veWKoFxuICBwaGluYS5hc3NldC5Bc3NldExvYWRlci5hc3NldExvYWRGdW5jdGlvbnMudG14ID0gZnVuY3Rpb24oa2V5LCBwYXRoKSB7XG4gICAgY29uc3QgdG14ID0gcGhpbmEuYXNzZXQuVGlsZWRNYXAoKTtcbiAgICByZXR1cm4gdG14LmxvYWQocGF0aCk7XG4gIH07XG5cbn0pOyIsIi8qXG4gKiAgcGhpbmEuVGlsZXNldC5qc1xuICogIDIwMTkvOS8xMlxuICogIEBhdXRoZXIgbWluaW1vICBcbiAqICBUaGlzIFByb2dyYW0gaXMgTUlUIGxpY2Vuc2UuXG4gKlxuICovXG5cbnBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5kZWZpbmUoXCJwaGluYS5hc3NldC5UaWxlU2V0XCIsIHtcbiAgICBzdXBlckNsYXNzOiBcInBoaW5hLmFzc2V0LlhNTExvYWRlclwiLFxuXG4gICAgaW1hZ2U6IG51bGwsXG4gICAgdGlsZXdpZHRoOiAwLFxuICAgIHRpbGVoZWlnaHQ6IDAsXG4gICAgdGlsZWNvdW50OiAwLFxuICAgIGNvbHVtbnM6IDAsXG5cbiAgICBpbml0OiBmdW5jdGlvbih4bWwpIHtcbiAgICAgICAgdGhpcy5zdXBlckluaXQoKTtcbiAgICAgICAgaWYgKHhtbCkge1xuICAgICAgICAgIHRoaXMubG9hZEZyb21YTUwoeG1sKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBfbG9hZDogZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgICAgLy/jg5HjgrnmipzjgY3lh7rjgZdcbiAgICAgIHRoaXMucGF0aCA9IFwiXCI7XG4gICAgICBjb25zdCBsYXN0ID0gdGhpcy5zcmMubGFzdEluZGV4T2YoXCIvXCIpO1xuICAgICAgaWYgKGxhc3QgPiAwKSB7XG4gICAgICAgIHRoaXMucGF0aCA9IHRoaXMuc3JjLnN1YnN0cmluZygwLCBsYXN0ICsgMSk7XG4gICAgICB9XG5cbiAgICAgIC8v57WC5LqG6Zai5pWw5L+d5a2YXG4gICAgICB0aGlzLl9yZXNvbHZlID0gcmVzb2x2ZTtcblxuICAgICAgLy8gbG9hZFxuICAgICAgY29uc3QgeG1sID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICB4bWwub3BlbignR0VUJywgdGhpcy5zcmMpO1xuICAgICAgeG1sLm9ucmVhZHlzdGF0ZWNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgaWYgKHhtbC5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgaWYgKFsyMDAsIDIwMSwgMF0uaW5kZXhPZih4bWwuc3RhdHVzKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSAobmV3IERPTVBhcnNlcigpKS5wYXJzZUZyb21TdHJpbmcoeG1sLnJlc3BvbnNlVGV4dCwgXCJ0ZXh0L3htbFwiKTtcbiAgICAgICAgICAgIHRoaXMuZGF0YVR5cGUgPSBcInhtbFwiO1xuICAgICAgICAgICAgdGhpcy5kYXRhID0gZGF0YTtcbiAgICAgICAgICAgIHRoaXMuX3BhcnNlKGRhdGEpXG4gICAgICAgICAgICAgIC50aGVuKCgpID0+IHRoaXMuX3Jlc29sdmUodGhpcykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIHhtbC5zZW5kKG51bGwpO1xuICAgIH0sXG5cbiAgICBsb2FkRnJvbVhNTDogZnVuY3Rpb24oeG1sKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGFyc2UoeG1sKTtcbiAgICB9LFxuXG4gICAgX3BhcnNlOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIC8v44K/44Kk44Or44K744OD44OI5Y+W5b6XXG4gICAgICAgIGNvbnN0IHRpbGVzZXQgPSBkYXRhLmdldEVsZW1lbnRzQnlUYWdOYW1lKCd0aWxlc2V0JylbMF07XG4gICAgICAgIGNvbnN0IHByb3BzID0gdGhpcy5fcHJvcGVydGllc1RvSlNPTih0aWxlc2V0KTtcblxuICAgICAgICAvL+OCv+OCpOODq+OCu+ODg+ODiOWxnuaAp+aDheWgseWPluW+l1xuICAgICAgICBjb25zdCBhdHRyID0gdGhpcy5fYXR0clRvSlNPTih0aWxlc2V0KTtcbiAgICAgICAgYXR0ci4kc2FmZSh7XG4gICAgICAgICAgdGlsZXdpZHRoOiAzMixcbiAgICAgICAgICB0aWxlaGVpZ2h0OiAzMixcbiAgICAgICAgICBzcGFjaW5nOiAwLFxuICAgICAgICAgIG1hcmdpbjogMCxcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuJGV4dGVuZChhdHRyKTtcbiAgICAgICAgdGhpcy5jaGlwcyA9IFtdO1xuXG4gICAgICAgIC8v44K944O844K555S75YOP6Kit5a6a5Y+W5b6XXG4gICAgICAgIHRoaXMuaW1hZ2VOYW1lID0gdGlsZXNldC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW1hZ2UnKVswXS5nZXRBdHRyaWJ1dGUoJ3NvdXJjZScpO1xuICBcbiAgICAgICAgLy/pgI/pgY7oibLoqK3lrprlj5blvpdcbiAgICAgICAgY29uc3QgdHJhbnMgPSB0aWxlc2V0LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbWFnZScpWzBdLmdldEF0dHJpYnV0ZSgndHJhbnMnKTtcbiAgICAgICAgaWYgKHRyYW5zKSB7XG4gICAgICAgICAgdGhpcy50cmFuc1IgPSBwYXJzZUludCh0cmFucy5zdWJzdHJpbmcoMCwgMiksIDE2KTtcbiAgICAgICAgICB0aGlzLnRyYW5zRyA9IHBhcnNlSW50KHRyYW5zLnN1YnN0cmluZygyLCA0KSwgMTYpO1xuICAgICAgICAgIHRoaXMudHJhbnNCID0gcGFyc2VJbnQodHJhbnMuc3Vic3RyaW5nKDQsIDYpLCAxNik7XG4gICAgICAgIH1cbiAgXG4gICAgICAgIC8v44Oe44OD44OX44OB44OD44OX44Oq44K544OI5L2c5oiQXG4gICAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgdGhpcy50aWxlY291bnQ7IHIrKykge1xuICAgICAgICAgIGNvbnN0IGNoaXAgPSB7XG4gICAgICAgICAgICBpbWFnZTogdGhpcy5pbWFnZU5hbWUsXG4gICAgICAgICAgICB4OiAociAgJSB0aGlzLmNvbHVtbnMpICogKHRoaXMudGlsZXdpZHRoICsgdGhpcy5zcGFjaW5nKSArIHRoaXMubWFyZ2luLFxuICAgICAgICAgICAgeTogTWF0aC5mbG9vcihyIC8gdGhpcy5jb2x1bW5zKSAqICh0aGlzLnRpbGVoZWlnaHQgKyB0aGlzLnNwYWNpbmcpICsgdGhpcy5tYXJnaW4sXG4gICAgICAgICAgfTtcbiAgICAgICAgICB0aGlzLmNoaXBzW3JdID0gY2hpcDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8v44Kk44Oh44O844K444OH44O844K/6Kqt44G/6L6844G/XG4gICAgICAgIHRoaXMuX2xvYWRJbWFnZSgpXG4gICAgICAgICAgLnRoZW4oKCkgPT4gcmVzb2x2ZSgpKTtcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvL+OCouOCu+ODg+ODiOOBq+eEoeOBhOOCpOODoeODvOOCuOODh+ODvOOCv+OCkuiqreOBv+i+vOOBv1xuICAgIF9sb2FkSW1hZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICBjb25zdCBpbWFnZVNvdXJjZSA9IHtcbiAgICAgICAgICBpbWFnZU5hbWU6IHRoaXMuaW1hZ2VOYW1lLFxuICAgICAgICAgIGltYWdlVXJsOiB0aGlzLnBhdGggKyB0aGlzLmltYWdlTmFtZSxcbiAgICAgICAgICB0cmFuc1I6IHRoaXMudHJhbnNSLFxuICAgICAgICAgIHRyYW5zRzogdGhpcy50cmFuc0csXG4gICAgICAgICAgdHJhbnNCOiB0aGlzLnRyYW5zQixcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGxldCBsb2FkSW1hZ2UgPSBudWxsO1xuICAgICAgICBjb25zdCBpbWFnZSA9IHBoaW5hLmFzc2V0LkFzc2V0TWFuYWdlci5nZXQoJ2ltYWdlJywgaW1hZ2VTb3VyY2UuaW1hZ2UpO1xuICAgICAgICBpZiAoaW1hZ2UpIHtcbiAgICAgICAgICB0aGlzLmltYWdlID0gaW1hZ2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG9hZEltYWdlID0gaW1hZ2VTb3VyY2U7XG4gICAgICAgIH1cblxuICAgICAgICAvL+ODreODvOODieODquOCueODiOS9nOaIkFxuICAgICAgICBjb25zdCBhc3NldHMgPSB7IGltYWdlOiBbXSB9O1xuICAgICAgICBhc3NldHMuaW1hZ2VbaW1hZ2VTb3VyY2UuaW1hZ2VOYW1lXSA9IGltYWdlU291cmNlLmltYWdlVXJsO1xuXG4gICAgICAgIGlmIChsb2FkSW1hZ2UpIHtcbiAgICAgICAgICBjb25zdCBsb2FkZXIgPSBwaGluYS5hc3NldC5Bc3NldExvYWRlcigpO1xuICAgICAgICAgIGxvYWRlci5sb2FkKGFzc2V0cyk7XG4gICAgICAgICAgbG9hZGVyLm9uKCdsb2FkJywgZSA9PiB7XG4gICAgICAgICAgICAvL+mAj+mBjuiJsuioreWumuWPjeaYoFxuICAgICAgICAgICAgdGhpcy5pbWFnZSA9IHBoaW5hLmFzc2V0LkFzc2V0TWFuYWdlci5nZXQoJ2ltYWdlJywgaW1hZ2VTb3VyY2UuaW1hZ2VVcmwpO1xuICAgICAgICAgICAgaWYgKGltYWdlU291cmNlLnRyYW5zUiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHIgPSBpbWFnZVNvdXJjZS50cmFuc1I7XG4gICAgICAgICAgICAgIGNvbnN0IGcgPSBpbWFnZVNvdXJjZS50cmFuc0c7XG4gICAgICAgICAgICAgIGNvbnN0IGIgPSBpbWFnZVNvdXJjZS50cmFuc0I7XG4gICAgICAgICAgICAgIHRoaXMuaW1hZ2UuZmlsdGVyKChwaXhlbCwgaW5kZXgsIHgsIHksIGJpdG1hcCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBiaXRtYXAuZGF0YTtcbiAgICAgICAgICAgICAgICBpZiAocGl4ZWxbMF0gPT0gciAmJiBwaXhlbFsxXSA9PSBnICYmIHBpeGVsWzJdID09IGIpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YVtpbmRleCszXSA9IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0sXG4gIH0pO1xuXG4gIC8v44Ot44O844OA44O844Gr6L+95YqgXG4gIHBoaW5hLmFzc2V0LkFzc2V0TG9hZGVyLmFzc2V0TG9hZEZ1bmN0aW9ucy50c3ggPSBmdW5jdGlvbihrZXksIHBhdGgpIHtcbiAgICBjb25zdCB0c3ggPSBwaGluYS5hc3NldC5UaWxlU2V0KCk7XG4gICAgcmV0dXJuIHRzeC5sb2FkKHBhdGgpO1xuICB9O1xuXG59KTsiLCIvL1xuLy8g5rGO55So6Zai5pWw576kXG4vL1xucGhpbmEuZGVmaW5lKFwiVXRpbFwiLCB7XG4gIF9zdGF0aWM6IHtcblxuICAgIC8v5oyH5a6a44GV44KM44Gf44Kq44OW44K444Kn44Kv44OI44KS44Or44O844OI44Go44GX44Gm55uu55qE44GuaWTjgpLotbDmn7vjgZnjgotcbiAgICBmaW5kQnlJZDogZnVuY3Rpb24oaWQsIG9iaikge1xuICAgICAgaWYgKG9iai5pZCA9PT0gaWQpIHJldHVybiBvYmo7XG4gICAgICBjb25zdCBjaGlsZHJlbiA9IE9iamVjdC5rZXlzKG9iai5jaGlsZHJlbiB8fCB7fSkubWFwKGtleSA9PiBvYmouY2hpbGRyZW5ba2V5XSk7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGhpdCA9IHRoaXMuZmluZEJ5SWQoaWQsIGNoaWxkcmVuW2ldKTtcbiAgICAgICAgaWYgKGhpdCkgcmV0dXJuIGhpdDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG5cbiAgICAvL1RPRE8644GT44GT44GY44KD44Gq44GE5oSf44GM44GC44KL44Gu44Gn44GZ44GM44CB5LiA5pem5a6f6KOFXG4gICAgLy/mjIflrprjgZXjgozjgZ9B44GoQuOBrmFzc2V0c+OBrumAo+aDs+mFjeWIl+OCkuaWsOimj+OBruOCquODluOCuOOCp+OCr+ODiOOBq+ODnuODvOOCuOOBmeOCi1xuICAgIG1lcmdlQXNzZXRzOiBmdW5jdGlvbihhc3NldHNBLCBhc3NldHNCKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSB7fTtcbiAgICAgIGFzc2V0c0EuZm9ySW4oKHR5cGVLZXksIHR5cGVWYWx1ZSkgPT4ge1xuICAgICAgICBpZiAoIXJlc3VsdC4kaGFzKHR5cGVLZXkpKSByZXN1bHRbdHlwZUtleV0gPSB7fTtcbiAgICAgICAgdHlwZVZhbHVlLmZvckluKChhc3NldEtleSwgYXNzZXRQYXRoKSA9PiB7XG4gICAgICAgICAgcmVzdWx0W3R5cGVLZXldW2Fzc2V0S2V5XSA9IGFzc2V0UGF0aDtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIGFzc2V0c0IuZm9ySW4oKHR5cGVLZXksIHR5cGVWYWx1ZSkgPT4ge1xuICAgICAgICBpZiAoIXJlc3VsdC4kaGFzKHR5cGVLZXkpKSByZXN1bHRbdHlwZUtleV0gPSB7fTtcbiAgICAgICAgdHlwZVZhbHVlLmZvckluKChhc3NldEtleSwgYXNzZXRQYXRoKSA9PiB7XG4gICAgICAgICAgcmVzdWx0W3R5cGVLZXldW2Fzc2V0S2V5XSA9IGFzc2V0UGF0aDtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8v54++5Zyo5pmC6ZaT44GL44KJ5oyH5a6a5pmC6ZaT44G+44Gn44Gp44Gu44GP44KJ44GE44GL44GL44KL44GL44KS6L+U5Y2044GZ44KLXG4gICAgLy9cbiAgICAvLyBvdXRwdXQgOiB7IFxuICAgIC8vICAgdG90YWxEYXRlOjAgLCBcbiAgICAvLyAgIHRvdGFsSG91cjowICwgXG4gICAgLy8gICB0b3RhbE1pbnV0ZXM6MCAsIFxuICAgIC8vICAgdG90YWxTZWNvbmRzOjAgLFxuICAgIC8vICAgZGF0ZTowICwgXG4gICAgLy8gICBob3VyOjAgLCBcbiAgICAvLyAgIG1pbnV0ZXM6MCAsIFxuICAgIC8vICAgc2Vjb25kczowIFxuICAgIC8vIH1cbiAgICAvL1xuXG4gICAgY2FsY1JlbWFpbmluZ1RpbWU6IGZ1bmN0aW9uKGZpbmlzaCkge1xuICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHtcbiAgICAgICAgXCJ0b3RhbERhdGVcIjogMCxcbiAgICAgICAgXCJ0b3RhbEhvdXJcIjogMCxcbiAgICAgICAgXCJ0b3RhbE1pbnV0ZXNcIjogMCxcbiAgICAgICAgXCJ0b3RhbFNlY29uZHNcIjogMCxcbiAgICAgICAgXCJkYXRlXCI6IDAsXG4gICAgICAgIFwiaG91clwiOiAwLFxuICAgICAgICBcIm1pbnV0ZXNcIjogMCxcbiAgICAgICAgXCJzZWNvbmRzXCI6IDAsXG4gICAgICB9XG5cbiAgICAgIGZpbmlzaCA9IChmaW5pc2ggaW5zdGFuY2VvZiBEYXRlKSA/IGZpbmlzaCA6IG5ldyBEYXRlKGZpbmlzaCk7XG4gICAgICBsZXQgZGlmZiA9IGZpbmlzaCAtIG5vdztcbiAgICAgIGlmIChkaWZmID09PSAwKSByZXR1cm4gcmVzdWx0O1xuXG4gICAgICBjb25zdCBzaWduID0gKGRpZmYgPCAwKSA/IC0xIDogMTtcblxuICAgICAgLy9UT0RPOuOBk+OBrui+uuOCiuOCguOBhuWwkeOBl+e2uum6l+OBq+abuOOBkeOBquOBhOOBi+aknOiojlxuICAgICAgLy/ljZjkvY3liKUgMeacqua6gOOBrzBcbiAgICAgIHJlc3VsdFtcInRvdGFsRGF0ZVwiXSA9IHBhcnNlSW50KGRpZmYgLyAxMDAwIC8gNjAgLyA2MCAvIDI0KTtcbiAgICAgIHJlc3VsdFtcInRvdGFsSG91clwiXSA9IHBhcnNlSW50KGRpZmYgLyAxMDAwIC8gNjAgLyA2MCk7XG4gICAgICByZXN1bHRbXCJ0b3RhbE1pbnV0ZXNcIl0gPSBwYXJzZUludChkaWZmIC8gMTAwMCAvIDYwKTtcbiAgICAgIHJlc3VsdFtcInRvdGFsU2Vjb25kc1wiXSA9IHBhcnNlSW50KGRpZmYgLyAxMDAwKTtcblxuICAgICAgZGlmZiAtPSByZXN1bHRbXCJ0b3RhbERhdGVcIl0gKiA4NjQwMDAwMDtcbiAgICAgIHJlc3VsdFtcImhvdXJcIl0gPSBwYXJzZUludChkaWZmIC8gMTAwMCAvIDYwIC8gNjApO1xuXG4gICAgICBkaWZmIC09IHJlc3VsdFtcImhvdXJcIl0gKiAzNjAwMDAwO1xuICAgICAgcmVzdWx0W1wibWludXRlc1wiXSA9IHBhcnNlSW50KGRpZmYgLyAxMDAwIC8gNjApO1xuXG4gICAgICBkaWZmIC09IHJlc3VsdFtcIm1pbnV0ZXNcIl0gKiA2MDAwMDtcbiAgICAgIHJlc3VsdFtcInNlY29uZHNcIl0gPSBwYXJzZUludChkaWZmIC8gMTAwMCk7XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG5cbiAgICB9LFxuXG4gICAgLy/jg6zjgqTjgqLjgqbjg4jjgqjjg4fjgqPjgr/jg7zjgafjga9TcHJpdGXlhajjgaZBdGFsc1Nwcml0ZeOBq+OBquOBo+OBpuOBl+OBvuOBhuOBn+OCgeOAgVxuICAgIC8vU3ByaXRl44Gr5beu44GX5pu/44GI44KJ44KM44KL44KI44GG44Gr44GZ44KLXG5cbiAgICAvL0F0bGFzU3ByaXRl6Ieq6Lqr44Gr5Y2Y55m644GuSW1hZ2XjgpLjgrvjg4Pjg4jjgafjgY3jgovjgojjgYbjgavjgZnjgovvvJ9cbiAgICAvL+OBguOBqOOBp+OBquOBq+OBi+OBl+OCieWvvuetluOBl+OBquOBhOOBqOOBoOOCgeOBoOOBjO+8k+aciOe0jeWTgeOBp+OBr+S4gOaXpuOBk+OCjOOBp1xuICAgIHJlcGxhY2VBdGxhc1Nwcml0ZVRvU3ByaXRlOiBmdW5jdGlvbihwYXJlbnQsIGF0bGFzU3ByaXRlLCBzcHJpdGUpIHtcbiAgICAgIGNvbnN0IGluZGV4ID0gcGFyZW50LmdldENoaWxkSW5kZXgoYXRsYXNTcHJpdGUpO1xuICAgICAgc3ByaXRlLnNldE9yaWdpbihhdGxhc1Nwcml0ZS5vcmlnaW5YLCBhdGxhc1Nwcml0ZS5vcmlnaW5ZKTtcbiAgICAgIHNwcml0ZS5zZXRQb3NpdGlvbihhdGxhc1Nwcml0ZS54LCBhdGxhc1Nwcml0ZS55KTtcbiAgICAgIHBhcmVudC5hZGRDaGlsZEF0KHNwcml0ZSwgaW5kZXgpO1xuICAgICAgYXRsYXNTcHJpdGUucmVtb3ZlKCk7XG4gICAgICByZXR1cm4gc3ByaXRlO1xuICAgIH0sXG4gIH1cbn0pO1xuIiwiLypcbiAqICBwaGluYS54bWxsb2FkZXIuanNcbiAqICAyMDE5LzkvMTJcbiAqICBAYXV0aGVyIG1pbmltbyAgXG4gKiAgVGhpcyBQcm9ncmFtIGlzIE1JVCBsaWNlbnNlLlxuICpcbiAqL1xuXG5waGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZGVmaW5lKFwicGhpbmEuYXNzZXQuWE1MTG9hZGVyXCIsIHtcbiAgICBzdXBlckNsYXNzOiBcInBoaW5hLmFzc2V0LkFzc2V0XCIsXG5cbiAgICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5zdXBlckluaXQoKTtcbiAgICB9LFxuXG4gICAgX2xvYWQ6IGZ1bmN0aW9uKHJlc29sdmUpIHtcbiAgICAgIHJlc29sdmUoKTtcbiAgICB9LFxuXG4gICAgLy9YTUzjg5fjg63jg5Hjg4bjgqPjgpJKU09O44Gr5aSJ5o+bXG4gICAgX3Byb3BlcnRpZXNUb0pTT046IGZ1bmN0aW9uKGVsbSkge1xuICAgICAgY29uc3QgcHJvcGVydGllcyA9IGVsbS5nZXRFbGVtZW50c0J5VGFnTmFtZShcInByb3BlcnRpZXNcIilbMF07XG4gICAgICBjb25zdCBvYmogPSB7fTtcbiAgICAgIGlmIChwcm9wZXJ0aWVzID09PSB1bmRlZmluZWQpIHJldHVybiBvYmo7XG5cbiAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgcHJvcGVydGllcy5jaGlsZE5vZGVzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgIGNvbnN0IHAgPSBwcm9wZXJ0aWVzLmNoaWxkTm9kZXNba107XG4gICAgICAgIGlmIChwLnRhZ05hbWUgPT09IFwicHJvcGVydHlcIikge1xuICAgICAgICAgIC8vcHJvcGVydHnjgat0eXBl5oyH5a6a44GM44GC44Gj44Gf44KJ5aSJ5o+bXG4gICAgICAgICAgY29uc3QgdHlwZSA9IHAuZ2V0QXR0cmlidXRlKCd0eXBlJyk7XG4gICAgICAgICAgY29uc3QgdmFsdWUgPSBwLmdldEF0dHJpYnV0ZSgndmFsdWUnKTtcbiAgICAgICAgICBpZiAoIXZhbHVlKSB2YWx1ZSA9IHAudGV4dENvbnRlbnQ7XG4gICAgICAgICAgaWYgKHR5cGUgPT0gXCJpbnRcIikge1xuICAgICAgICAgICAgb2JqW3AuZ2V0QXR0cmlidXRlKCduYW1lJyldID0gcGFyc2VJbnQodmFsdWUsIDEwKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT0gXCJmbG9hdFwiKSB7XG4gICAgICAgICAgICBvYmpbcC5nZXRBdHRyaWJ1dGUoJ25hbWUnKV0gPSBwYXJzZUZsb2F0KHZhbHVlKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT0gXCJib29sXCIgKSB7XG4gICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJ0cnVlXCIpIG9ialtwLmdldEF0dHJpYnV0ZSgnbmFtZScpXSA9IHRydWU7XG4gICAgICAgICAgICBlbHNlIG9ialtwLmdldEF0dHJpYnV0ZSgnbmFtZScpXSA9IGZhbHNlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvYmpbcC5nZXRBdHRyaWJ1dGUoJ25hbWUnKV0gPSB2YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBvYmo7XG4gICAgfSxcblxuICAgIC8vWE1M5bGe5oCn44KSSlNPTuOBq+WkieaPm1xuICAgIF9hdHRyVG9KU09OOiBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICAgIGNvbnN0IG9iaiA9IHt9O1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzb3VyY2UuYXR0cmlidXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBsZXQgdmFsID0gc291cmNlLmF0dHJpYnV0ZXNbaV0udmFsdWU7XG4gICAgICAgIHZhbCA9IGlzTmFOKHBhcnNlRmxvYXQodmFsKSk/IHZhbDogcGFyc2VGbG9hdCh2YWwpO1xuICAgICAgICBvYmpbc291cmNlLmF0dHJpYnV0ZXNbaV0ubmFtZV0gPSB2YWw7XG4gICAgICB9XG4gICAgICByZXR1cm4gb2JqO1xuICAgIH0sXG5cbiAgICAvL1hNTOWxnuaAp+OCkkpTT07jgavlpInmj5vvvIhTdHJpbmfjgafov5TjgZnvvIlcbiAgICBfYXR0clRvSlNPTl9zdHI6IGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgICAgY29uc3Qgb2JqID0ge307XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNvdXJjZS5hdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHZhbCA9IHNvdXJjZS5hdHRyaWJ1dGVzW2ldLnZhbHVlO1xuICAgICAgICBvYmpbc291cmNlLmF0dHJpYnV0ZXNbaV0ubmFtZV0gPSB2YWw7XG4gICAgICB9XG4gICAgICByZXR1cm4gb2JqO1xuICAgIH0sXG5cbiAgICAvL0NTVuODkeODvOOCuVxuICAgIF9wYXJzZUNTVjogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgY29uc3QgZGF0YUxpc3QgPSBkYXRhLnNwbGl0KCcsJyk7XG4gICAgICBjb25zdCBsYXllciA9IFtdO1xuXG4gICAgICBkYXRhTGlzdC5lYWNoKGVsbSA9PiB7XG4gICAgICAgIGNvbnN0IG51bSA9IHBhcnNlSW50KGVsbSwgMTApO1xuICAgICAgICBsYXllci5wdXNoKG51bSk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIGxheWVyO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCQVNFNjTjg5Hjg7zjgrlcbiAgICAgKiBodHRwOi8vdGhla2Fubm9uLXNlcnZlci5hcHBzcG90LmNvbS9oZXJwaXR5LWRlcnBpdHkuYXBwc3BvdC5jb20vcGFzdGViaW4uY29tLzc1S2tzMFdIXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcGFyc2VCYXNlNjQ6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIGNvbnN0IGRhdGFMaXN0ID0gYXRvYihkYXRhLnRyaW0oKSk7XG4gICAgICBjb25zdCByc3QgPSBbXTtcblxuICAgICAgZGF0YUxpc3QgPSBkYXRhTGlzdC5zcGxpdCgnJykubWFwKGUgPT4gZS5jaGFyQ29kZUF0KDApKTtcblxuICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IGRhdGFMaXN0Lmxlbmd0aCAvIDQ7IGkgPCBsZW47ICsraSkge1xuICAgICAgICBjb25zdCBuID0gZGF0YUxpc3RbaSo0XTtcbiAgICAgICAgcnN0W2ldID0gcGFyc2VJbnQobiwgMTApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcnN0O1xuICAgIH0sXG4gIH0pO1xuXG59KTsiLCJwaGluYS5hc3NldC5Bc3NldExvYWRlci5wcm90b3R5cGUubG9hZCA9IGZ1bmN0aW9uKHBhcmFtcykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBsb2FkQXNzZXRzID0gW107XG4gIHZhciBjb3VudGVyID0gMDtcbiAgdmFyIGxlbmd0aCA9IDA7XG4gIHZhciBtYXhDb25uZWN0aW9uQ291bnQgPSAyO1xuXG4gIHBhcmFtcy5mb3JJbihmdW5jdGlvbih0eXBlLCBhc3NldHMpIHtcbiAgICBsZW5ndGggKz0gT2JqZWN0LmtleXMoYXNzZXRzKS5sZW5ndGg7XG4gIH0pO1xuXG4gIGlmIChsZW5ndGggPT0gMCkge1xuICAgIHJldHVybiBwaGluYS51dGlsLkZsb3cucmVzb2x2ZSgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICBzZWxmLmZsYXJlKCdsb2FkJyk7XG4gICAgfSk7XG4gIH1cblxuICBwYXJhbXMuZm9ySW4oZnVuY3Rpb24odHlwZSwgYXNzZXRzKSB7XG4gICAgYXNzZXRzLmZvckluKGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgIGxvYWRBc3NldHMucHVzaCh7XG4gICAgICAgIFwiZnVuY1wiOiBwaGluYS5hc3NldC5Bc3NldExvYWRlci5hc3NldExvYWRGdW5jdGlvbnNbdHlwZV0sXG4gICAgICAgIFwia2V5XCI6IGtleSxcbiAgICAgICAgXCJ2YWx1ZVwiOiB2YWx1ZSxcbiAgICAgICAgXCJ0eXBlXCI6IHR5cGUsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgaWYgKHNlbGYuY2FjaGUpIHtcbiAgICBzZWxmLm9uKCdwcm9ncmVzcycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIGlmIChlLnByb2dyZXNzID49IDEuMCkge1xuICAgICAgICBwYXJhbXMuZm9ySW4oZnVuY3Rpb24odHlwZSwgYXNzZXRzKSB7XG4gICAgICAgICAgYXNzZXRzLmZvckluKGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBhc3NldCA9IHBoaW5hLmFzc2V0LkFzc2V0TWFuYWdlci5nZXQodHlwZSwga2V5KTtcbiAgICAgICAgICAgIGlmIChhc3NldC5sb2FkRXJyb3IpIHtcbiAgICAgICAgICAgICAgdmFyIGR1bW15ID0gcGhpbmEuYXNzZXQuQXNzZXRNYW5hZ2VyLmdldCh0eXBlLCAnZHVtbXknKTtcbiAgICAgICAgICAgICAgaWYgKGR1bW15KSB7XG4gICAgICAgICAgICAgICAgaWYgKGR1bW15LmxvYWRFcnJvcikge1xuICAgICAgICAgICAgICAgICAgZHVtbXkubG9hZER1bW15KCk7XG4gICAgICAgICAgICAgICAgICBkdW1teS5sb2FkRXJyb3IgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGhpbmEuYXNzZXQuQXNzZXRNYW5hZ2VyLnNldCh0eXBlLCBrZXksIGR1bW15KTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhc3NldC5sb2FkRHVtbXkoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHZhciBsb2FkQXNzZXRzQXJyYXkgPSBbXTtcblxuICB3aGlsZSAobG9hZEFzc2V0cy5sZW5ndGggPiAwKSB7XG4gICAgbG9hZEFzc2V0c0FycmF5LnB1c2gobG9hZEFzc2V0cy5zcGxpY2UoMCwgbWF4Q29ubmVjdGlvbkNvdW50KSk7XG4gIH1cblxuICB2YXIgZmxvdyA9IHBoaW5hLnV0aWwuRmxvdy5yZXNvbHZlKCk7XG5cbiAgbG9hZEFzc2V0c0FycmF5LmZvckVhY2goZnVuY3Rpb24obG9hZEFzc2V0cykge1xuICAgIGZsb3cgPSBmbG93LnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZmxvd3MgPSBbXTtcbiAgICAgIGxvYWRBc3NldHMuZm9yRWFjaChmdW5jdGlvbihsb2FkQXNzZXQpIHtcbiAgICAgICAgdmFyIGYgPSBsb2FkQXNzZXQuZnVuYyhsb2FkQXNzZXQua2V5LCBsb2FkQXNzZXQudmFsdWUpO1xuICAgICAgICBmLnRoZW4oZnVuY3Rpb24oYXNzZXQpIHtcbiAgICAgICAgICBpZiAoc2VsZi5jYWNoZSkge1xuICAgICAgICAgICAgcGhpbmEuYXNzZXQuQXNzZXRNYW5hZ2VyLnNldChsb2FkQXNzZXQudHlwZSwgbG9hZEFzc2V0LmtleSwgYXNzZXQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzZWxmLmZsYXJlKCdwcm9ncmVzcycsIHtcbiAgICAgICAgICAgIGtleTogbG9hZEFzc2V0LmtleSxcbiAgICAgICAgICAgIGFzc2V0OiBhc3NldCxcbiAgICAgICAgICAgIHByb2dyZXNzOiAoKytjb3VudGVyIC8gbGVuZ3RoKSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIGZsb3dzLnB1c2goZik7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBwaGluYS51dGlsLkZsb3cuYWxsKGZsb3dzKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIGZsb3cudGhlbihmdW5jdGlvbihhcmdzKSB7XG4gICAgc2VsZi5mbGFyZSgnbG9hZCcpO1xuICB9KTtcbn1cbiIsInBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5hcHAuQmFzZUFwcC5wcm90b3R5cGUuJG1ldGhvZChcInJlcGxhY2VTY2VuZVwiLCBmdW5jdGlvbihzY2VuZSkge1xuICAgIHRoaXMuZmxhcmUoJ3JlcGxhY2UnKTtcbiAgICB0aGlzLmZsYXJlKCdjaGFuZ2VzY2VuZScpO1xuXG4gICAgd2hpbGUgKHRoaXMuX3NjZW5lcy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBzY2VuZSA9IHRoaXMuX3NjZW5lcy5wb3AoKTtcbiAgICAgIHNjZW5lLmZsYXJlKFwiZGVzdHJveVwiKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zY2VuZUluZGV4ID0gMDtcblxuICAgIGlmICh0aGlzLmN1cnJlbnRTY2VuZSkge1xuICAgICAgdGhpcy5jdXJyZW50U2NlbmUuYXBwID0gbnVsbDtcbiAgICB9XG5cbiAgICB0aGlzLmN1cnJlbnRTY2VuZSA9IHNjZW5lO1xuICAgIHRoaXMuY3VycmVudFNjZW5lLmFwcCA9IHRoaXM7XG4gICAgdGhpcy5jdXJyZW50U2NlbmUuZmxhcmUoJ2VudGVyJywge1xuICAgICAgYXBwOiB0aGlzLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0pO1xuXG4gIHBoaW5hLmFwcC5CYXNlQXBwLnByb3RvdHlwZS4kbWV0aG9kKFwicG9wU2NlbmVcIiwgZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5mbGFyZSgncG9wJyk7XG4gICAgdGhpcy5mbGFyZSgnY2hhbmdlc2NlbmUnKTtcblxuICAgIHZhciBzY2VuZSA9IHRoaXMuX3NjZW5lcy5wb3AoKTtcbiAgICAtLXRoaXMuX3NjZW5lSW5kZXg7XG5cbiAgICBzY2VuZS5mbGFyZSgnZXhpdCcsIHtcbiAgICAgIGFwcDogdGhpcyxcbiAgICB9KTtcbiAgICBzY2VuZS5mbGFyZSgnZGVzdHJveScpO1xuICAgIHNjZW5lLmFwcCA9IG51bGw7XG5cbiAgICB0aGlzLmZsYXJlKCdwb3BlZCcpO1xuXG4gICAgLy8gXG4gICAgdGhpcy5jdXJyZW50U2NlbmUuZmxhcmUoJ3Jlc3VtZScsIHtcbiAgICAgIGFwcDogdGhpcyxcbiAgICAgIHByZXZTY2VuZTogc2NlbmUsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gc2NlbmU7XG4gIH0pO1xuXG59KTtcbiIsInBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5ncmFwaGljcy5DYW52YXMucHJvdG90eXBlLiRtZXRob2QoXCJpbml0XCIsIGZ1bmN0aW9uKGNhbnZhcykge1xuICAgIHRoaXMuaXNDcmVhdGVDYW52YXMgPSBmYWxzZTtcbiAgICBpZiAodHlwZW9mIGNhbnZhcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMuY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihjYW52YXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoY2FudmFzKSB7XG4gICAgICAgIHRoaXMuY2FudmFzID0gY2FudmFzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgdGhpcy5pc0NyZWF0ZUNhbnZhcyA9IHRydWU7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCcjIyMjIGNyZWF0ZSBjYW52YXMgIyMjIycpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuZG9tRWxlbWVudCA9IHRoaXMuY2FudmFzO1xuICAgIHRoaXMuY29udGV4dCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgdGhpcy5jb250ZXh0LmxpbmVDYXAgPSAncm91bmQnO1xuICAgIHRoaXMuY29udGV4dC5saW5lSm9pbiA9ICdyb3VuZCc7XG4gIH0pO1xuXG4gIHBoaW5hLmdyYXBoaWNzLkNhbnZhcy5wcm90b3R5cGUuJG1ldGhvZCgnZGVzdHJveScsIGZ1bmN0aW9uKGNhbnZhcykge1xuICAgIGlmICghdGhpcy5pc0NyZWF0ZUNhbnZhcykgcmV0dXJuO1xuICAgIC8vIGNvbnNvbGUubG9nKGAjIyMjIGRlbGV0ZSBjYW52YXMgJHt0aGlzLmNhbnZhcy53aWR0aH0geCAke3RoaXMuY2FudmFzLmhlaWdodH0gIyMjI2ApO1xuICAgIHRoaXMuc2V0U2l6ZSgwLCAwKTtcbiAgICBkZWxldGUgdGhpcy5jYW52YXM7XG4gICAgZGVsZXRlIHRoaXMuZG9tRWxlbWVudDtcbiAgfSk7XG5cbn0pO1xuIiwicGhpbmEubmFtZXNwYWNlKCgpID0+IHtcblxuICB2YXIgcXVhbGl0eVNjYWxlID0gcGhpbmEuZ2VvbS5NYXRyaXgzMygpO1xuXG4gIHBoaW5hLmRpc3BsYXkuQ2FudmFzUmVuZGVyZXIucHJvdG90eXBlLiRtZXRob2QoXCJyZW5kZXJcIiwgZnVuY3Rpb24oc2NlbmUsIHF1YWxpdHkpIHtcbiAgICB0aGlzLmNhbnZhcy5jbGVhcigpO1xuICAgIGlmIChzY2VuZS5iYWNrZ3JvdW5kQ29sb3IpIHtcbiAgICAgIHRoaXMuY2FudmFzLmNsZWFyQ29sb3Ioc2NlbmUuYmFja2dyb3VuZENvbG9yKTtcbiAgICB9XG5cbiAgICB0aGlzLl9jb250ZXh0LnNhdmUoKTtcbiAgICB0aGlzLnJlbmRlckNoaWxkcmVuKHNjZW5lLCBxdWFsaXR5KTtcbiAgICB0aGlzLl9jb250ZXh0LnJlc3RvcmUoKTtcbiAgfSk7XG5cbiAgcGhpbmEuZGlzcGxheS5DYW52YXNSZW5kZXJlci5wcm90b3R5cGUuJG1ldGhvZChcInJlbmRlckNoaWxkcmVuXCIsIGZ1bmN0aW9uKG9iaiwgcXVhbGl0eSkge1xuICAgIC8vIOWtkOS+m+OBn+OBoeOCguWun+ihjFxuICAgIGlmIChvYmouY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xuICAgICAgdmFyIHRlbXBDaGlsZHJlbiA9IG9iai5jaGlsZHJlbi5zbGljZSgpO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRlbXBDaGlsZHJlbi5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgICB0aGlzLnJlbmRlck9iamVjdCh0ZW1wQ2hpbGRyZW5baV0sIHF1YWxpdHkpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcGhpbmEuZGlzcGxheS5DYW52YXNSZW5kZXJlci5wcm90b3R5cGUuJG1ldGhvZChcInJlbmRlck9iamVjdFwiLCBmdW5jdGlvbihvYmosIHF1YWxpdHkpIHtcbiAgICBpZiAob2JqLnZpc2libGUgPT09IGZhbHNlICYmICFvYmouaW50ZXJhY3RpdmUpIHJldHVybjtcblxuICAgIG9iai5fY2FsY1dvcmxkTWF0cml4ICYmIG9iai5fY2FsY1dvcmxkTWF0cml4KCk7XG5cbiAgICBpZiAob2JqLnZpc2libGUgPT09IGZhbHNlKSByZXR1cm47XG5cbiAgICBvYmouX2NhbGNXb3JsZEFscGhhICYmIG9iai5fY2FsY1dvcmxkQWxwaGEoKTtcblxuICAgIHZhciBjb250ZXh0ID0gdGhpcy5jYW52YXMuY29udGV4dDtcblxuICAgIGNvbnRleHQuZ2xvYmFsQWxwaGEgPSBvYmouX3dvcmxkQWxwaGE7XG4gICAgY29udGV4dC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBvYmouYmxlbmRNb2RlO1xuXG4gICAgaWYgKG9iai5fd29ybGRNYXRyaXgpIHtcblxuICAgICAgcXVhbGl0eVNjYWxlLmlkZW50aXR5KCk7XG5cbiAgICAgIHF1YWxpdHlTY2FsZS5tMDAgPSBxdWFsaXR5IHx8IDEuMDtcbiAgICAgIHF1YWxpdHlTY2FsZS5tMTEgPSBxdWFsaXR5IHx8IDEuMDtcblxuICAgICAgdmFyIG0gPSBxdWFsaXR5U2NhbGUubXVsdGlwbHkob2JqLl93b3JsZE1hdHJpeCk7XG4gICAgICBjb250ZXh0LnNldFRyYW5zZm9ybShtLm0wMCwgbS5tMTAsIG0ubTAxLCBtLm0xMSwgbS5tMDIsIG0ubTEyKTtcblxuICAgIH1cblxuICAgIGlmIChvYmouY2xpcCkge1xuXG4gICAgICBjb250ZXh0LnNhdmUoKTtcblxuICAgICAgb2JqLmNsaXAodGhpcy5jYW52YXMpO1xuICAgICAgY29udGV4dC5jbGlwKCk7XG5cbiAgICAgIGlmIChvYmouZHJhdykgb2JqLmRyYXcodGhpcy5jYW52YXMpO1xuXG4gICAgICAvLyDlrZDkvpvjgZ/jgaHjgoLlrp/ooYxcbiAgICAgIGlmIChvYmoucmVuZGVyQ2hpbGRCeVNlbGYgPT09IGZhbHNlICYmIG9iai5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciB0ZW1wQ2hpbGRyZW4gPSBvYmouY2hpbGRyZW4uc2xpY2UoKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRlbXBDaGlsZHJlbi5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgIHRoaXMucmVuZGVyT2JqZWN0KHRlbXBDaGlsZHJlbltpXSwgcXVhbGl0eSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29udGV4dC5yZXN0b3JlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChvYmouZHJhdykgb2JqLmRyYXcodGhpcy5jYW52YXMpO1xuXG4gICAgICAvLyDlrZDkvpvjgZ/jgaHjgoLlrp/ooYxcbiAgICAgIGlmIChvYmoucmVuZGVyQ2hpbGRCeVNlbGYgPT09IGZhbHNlICYmIG9iai5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciB0ZW1wQ2hpbGRyZW4gPSBvYmouY2hpbGRyZW4uc2xpY2UoKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRlbXBDaGlsZHJlbi5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgIHRoaXMucmVuZGVyT2JqZWN0KHRlbXBDaGlsZHJlbltpXSwgcXVhbGl0eSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgIH1cbiAgfSk7XG5cbn0pO1xuIiwicGhpbmEubmFtZXNwYWNlKCgpID0+IHtcbiAgLy/jg6bjg7zjgrbjg7zjgqjjg7zjgrjjgqfjg7Pjg4jjgYvjgonjg5bjg6njgqbjgrbjgr/jgqTjg5fjga7liKTliKXjgpLooYzjgYZcbiAgcGhpbmEuJG1ldGhvZCgnY2hlY2tCcm93c2VyJywgZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgcmVzdWx0ID0ge307XG4gICAgY29uc3QgYWdlbnQgPSB3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudC50b0xvd2VyQ2FzZSgpOztcblxuICAgIHJlc3VsdC5pc0Nocm9tZSA9IChhZ2VudC5pbmRleE9mKCdjaHJvbWUnKSAhPT0gLTEpICYmIChhZ2VudC5pbmRleE9mKCdlZGdlJykgPT09IC0xKSAmJiAoYWdlbnQuaW5kZXhPZignb3ByJykgPT09IC0xKTtcbiAgICByZXN1bHQuaXNFZGdlID0gKGFnZW50LmluZGV4T2YoJ2VkZ2UnKSAhPT0gLTEpO1xuICAgIHJlc3VsdC5pc0llMTEgPSAoYWdlbnQuaW5kZXhPZigndHJpZGVudC83JykgIT09IC0xKTtcbiAgICByZXN1bHQuaXNGaXJlZm94ID0gKGFnZW50LmluZGV4T2YoJ2ZpcmVmb3gnKSAhPT0gLTEpO1xuICAgIHJlc3VsdC5pc1NhZmFyaSA9IChhZ2VudC5pbmRleE9mKCdzYWZhcmknKSAhPT0gLTEpICYmIChhZ2VudC5pbmRleE9mKCdjaHJvbWUnKSA9PT0gLTEpO1xuICAgIHJlc3VsdC5pc0VsZWN0cm9uID0gKGFnZW50LmluZGV4T2YoJ2VsZWN0cm9uJykgIT09IC0xKTtcblxuICAgIHJlc3VsdC5pc1dpbmRvd3MgPSAoYWdlbnQuaW5kZXhPZignd2luZG93cycpICE9PSAtMSk7XG4gICAgcmVzdWx0LmlzTWFjID0gKGFnZW50LmluZGV4T2YoJ21hYyBvcyB4JykgIT09IC0xKTtcblxuICAgIHJlc3VsdC5pc2lQYWQgPSBhZ2VudC5pbmRleE9mKCdpcGFkJykgPiAtMSB8fCB1YS5pbmRleE9mKCdtYWNpbnRvc2gnKSA+IC0xICYmICdvbnRvdWNoZW5kJyBpbiBkb2N1bWVudDtcbiAgICByZXN1bHQuaXNpT1MgPSBhZ2VudC5pbmRleE9mKCdpcGhvbmUnKSA+IC0xIHx8IHVhLmluZGV4T2YoJ2lwYWQnKSA+IC0xIHx8IHVhLmluZGV4T2YoJ21hY2ludG9zaCcpID4gLTEgJiYgJ29udG91Y2hlbmQnIGluIGRvY3VtZW50O1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSk7XG59KTtcbiIsIi8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vICBFeHRlbnNpb24gcGhpbmEuZGlzcGxheS5EaXNwbGF5RWxlbWVudFxuLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxucGhpbmEubmFtZXNwYWNlKCgpID0+IHtcbiAgcGhpbmEuZGlzcGxheS5EaXNwbGF5RWxlbWVudC5wcm90b3R5cGUuJG1ldGhvZChcImVuYWJsZVwiLCBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNob3coKS53YWtlVXAoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSk7XG5cbiAgcGhpbmEuZGlzcGxheS5EaXNwbGF5RWxlbWVudC5wcm90b3R5cGUuJG1ldGhvZChcImRpc2FibGVcIiwgZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5oaWRlKCkuc2xlZXAoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSk7XG59KTtcbiIsInBoaW5hLm5hbWVzcGFjZSgoKSA9PiB7XG4gIHBoaW5hLmRpc3BsYXkuRGlzcGxheVNjZW5lLnF1YWxpdHkgPSAxLjA7XG4gIHBoaW5hLmRpc3BsYXkuRGlzcGxheVNjZW5lLnByb3RvdHlwZS4kbWV0aG9kKFwiaW5pdFwiLCBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICB0aGlzLnN1cGVySW5pdCgpO1xuICAgIHZhciBxdWFsaXR5ID0gcGhpbmEuZGlzcGxheS5EaXNwbGF5U2NlbmUucXVhbGl0eTtcblxuICAgIHBhcmFtcyA9ICh7fSkuJHNhZmUocGFyYW1zLCBwaGluYS5kaXNwbGF5LkRpc3BsYXlTY2VuZS5kZWZhdWx0cyk7XG4gICAgdGhpcy5jYW52YXMgPSBwaGluYS5ncmFwaGljcy5DYW52YXMoKTtcbiAgICB0aGlzLmNhbnZhcy5zZXRTaXplKHBhcmFtcy53aWR0aCAqIHF1YWxpdHksIHBhcmFtcy5oZWlnaHQgKiBxdWFsaXR5KTtcbiAgICB0aGlzLnJlbmRlcmVyID0gcGhpbmEuZGlzcGxheS5DYW52YXNSZW5kZXJlcih0aGlzLmNhbnZhcyk7XG4gICAgdGhpcy5iYWNrZ3JvdW5kQ29sb3IgPSAocGFyYW1zLmJhY2tncm91bmRDb2xvcikgPyBwYXJhbXMuYmFja2dyb3VuZENvbG9yIDogbnVsbDtcblxuICAgIHRoaXMud2lkdGggPSBwYXJhbXMud2lkdGg7XG4gICAgdGhpcy5oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0O1xuICAgIHRoaXMuZ3JpZFggPSBwaGluYS51dGlsLkdyaWQocGFyYW1zLndpZHRoLCAxNik7XG4gICAgdGhpcy5ncmlkWSA9IHBoaW5hLnV0aWwuR3JpZChwYXJhbXMuaGVpZ2h0LCAxNik7XG5cbiAgICB0aGlzLmludGVyYWN0aXZlID0gdHJ1ZTtcbiAgICB0aGlzLnNldEludGVyYWN0aXZlID0gZnVuY3Rpb24oZmxhZykge1xuICAgICAgdGhpcy5pbnRlcmFjdGl2ZSA9IGZsYWc7XG4gICAgfTtcbiAgICB0aGlzLl9vdmVyRmxhZ3MgPSB7fTtcbiAgICB0aGlzLl90b3VjaEZsYWdzID0ge307XG4gIH0pO1xuXG59KTtcbiIsInBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcclxuXHJcbiAgLy8gYXVkaW/opoHntKDjgafpn7Plo7DjgpLlho3nlJ/jgZnjgovjgILkuLvjgatJReeUqFxyXG4gIHBoaW5hLmRlZmluZShcInBoaW5hLmFzc2V0LkRvbUF1ZGlvU291bmRcIiwge1xyXG4gICAgc3VwZXJDbGFzczogXCJwaGluYS5hc3NldC5Bc3NldFwiLFxyXG5cclxuICAgIGRvbUVsZW1lbnQ6IG51bGwsXHJcbiAgICBlbXB0eVNvdW5kOiBmYWxzZSxcclxuXHJcbiAgICBpbml0OiBmdW5jdGlvbigpIHtcclxuICAgICAgdGhpcy5zdXBlckluaXQoKTtcclxuICAgIH0sXHJcblxyXG4gICAgX2xvYWQ6IGZ1bmN0aW9uKHJlc29sdmUpIHtcclxuICAgICAgdGhpcy5kb21FbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImF1ZGlvXCIpO1xyXG4gICAgICBpZiAodGhpcy5kb21FbGVtZW50LmNhblBsYXlUeXBlKFwiYXVkaW8vbXBlZ1wiKSkge1xyXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gcmVhZHlzdGF0ZUNoZWNrKCkge1xyXG4gICAgICAgICAgaWYgKHRoaXMuZG9tRWxlbWVudC5yZWFkeVN0YXRlIDwgNCkge1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KHJlYWR5c3RhdGVDaGVjay5iaW5kKHRoaXMpLCAxMCk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmVtcHR5U291bmQgPSBmYWxzZTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJlbmQgbG9hZCBcIiwgdGhpcy5zcmMpO1xyXG4gICAgICAgICAgICByZXNvbHZlKHRoaXMpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfS5iaW5kKHRoaXMpLCAxMCk7XHJcbiAgICAgICAgdGhpcy5kb21FbGVtZW50Lm9uZXJyb3IgPSBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwi44Kq44O844OH44Kj44Kq44Gu44Ot44O844OJ44Gr5aSx5pWXXCIsIGUpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5kb21FbGVtZW50LnNyYyA9IHRoaXMuc3JjO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiYmVnaW4gbG9hZCBcIiwgdGhpcy5zcmMpO1xyXG4gICAgICAgIHRoaXMuZG9tRWxlbWVudC5sb2FkKCk7XHJcbiAgICAgICAgdGhpcy5kb21FbGVtZW50LmF1dG9wbGF5ID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5kb21FbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJlbmRlZFwiLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIHRoaXMuZmxhcmUoXCJlbmRlZFwiKTtcclxuICAgICAgICB9LmJpbmQodGhpcykpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwibXAz44Gv5YaN55Sf44Gn44GN44G+44Gb44KTXCIpO1xyXG4gICAgICAgIHRoaXMuZW1wdHlTb3VuZCA9IHRydWU7XHJcbiAgICAgICAgcmVzb2x2ZSh0aGlzKTtcclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBwbGF5OiBmdW5jdGlvbigpIHtcclxuICAgICAgaWYgKHRoaXMuZW1wdHlTb3VuZCkgcmV0dXJuO1xyXG4gICAgICB0aGlzLmRvbUVsZW1lbnQucGF1c2UoKTtcclxuICAgICAgdGhpcy5kb21FbGVtZW50LmN1cnJlbnRUaW1lID0gMDtcclxuICAgICAgdGhpcy5kb21FbGVtZW50LnBsYXkoKTtcclxuICAgIH0sXHJcblxyXG4gICAgc3RvcDogZnVuY3Rpb24oKSB7XHJcbiAgICAgIGlmICh0aGlzLmVtcHR5U291bmQpIHJldHVybjtcclxuICAgICAgdGhpcy5kb21FbGVtZW50LnBhdXNlKCk7XHJcbiAgICAgIHRoaXMuZG9tRWxlbWVudC5jdXJyZW50VGltZSA9IDA7XHJcbiAgICB9LFxyXG5cclxuICAgIHBhdXNlOiBmdW5jdGlvbigpIHtcclxuICAgICAgaWYgKHRoaXMuZW1wdHlTb3VuZCkgcmV0dXJuO1xyXG4gICAgICB0aGlzLmRvbUVsZW1lbnQucGF1c2UoKTtcclxuICAgIH0sXHJcblxyXG4gICAgcmVzdW1lOiBmdW5jdGlvbigpIHtcclxuICAgICAgaWYgKHRoaXMuZW1wdHlTb3VuZCkgcmV0dXJuO1xyXG4gICAgICB0aGlzLmRvbUVsZW1lbnQucGxheSgpO1xyXG4gICAgfSxcclxuXHJcbiAgICBzZXRMb29wOiBmdW5jdGlvbih2KSB7XHJcbiAgICAgIGlmICh0aGlzLmVtcHR5U291bmQpIHJldHVybjtcclxuICAgICAgdGhpcy5kb21FbGVtZW50Lmxvb3AgPSB2O1xyXG4gICAgfSxcclxuXHJcbiAgICBfYWNjZXNzb3I6IHtcclxuICAgICAgdm9sdW1lOiB7XHJcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIGlmICh0aGlzLmVtcHR5U291bmQpIHJldHVybiAwO1xyXG4gICAgICAgICAgcmV0dXJuIHRoaXMuZG9tRWxlbWVudC52b2x1bWU7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHYpIHtcclxuICAgICAgICAgIGlmICh0aGlzLmVtcHR5U291bmQpIHJldHVybjtcclxuICAgICAgICAgIHRoaXMuZG9tRWxlbWVudC52b2x1bWUgPSB2O1xyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICAgIGxvb3A6IHtcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgaWYgKHRoaXMuZW1wdHlTb3VuZCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgcmV0dXJuIHRoaXMuZG9tRWxlbWVudC5sb29wO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2KSB7XHJcbiAgICAgICAgICBpZiAodGhpcy5lbXB0eVNvdW5kKSByZXR1cm47XHJcbiAgICAgICAgICB0aGlzLnNldExvb3Aodik7XHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuXHJcbiAgICB9LFxyXG4gIH0pO1xyXG5cclxuICAvLyBJRTEx44Gu5aC05ZCI44Gu44G/6Z+z5aOw44Ki44K744OD44OI44GvRG9tQXVkaW9Tb3VuZOOBp+WGjeeUn+OBmeOCi1xyXG4gIHZhciB1YSA9IHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCk7XHJcbiAgaWYgKHVhLmluZGV4T2YoJ3RyaWRlbnQvNycpICE9PSAtMSkge1xyXG4gICAgcGhpbmEuYXNzZXQuQXNzZXRMb2FkZXIucmVnaXN0ZXIoXCJzb3VuZFwiLCBmdW5jdGlvbihrZXksIHBhdGgpIHtcclxuICAgICAgdmFyIGFzc2V0ID0gcGhpbmEuYXNzZXQuRG9tQXVkaW9Tb3VuZCgpO1xyXG4gICAgICByZXR1cm4gYXNzZXQubG9hZChwYXRoKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbn0pO1xyXG4iLCJwaGluYS5uYW1lc3BhY2UoKCkgPT4ge1xuXG4gIHBoaW5hLmFwcC5FbGVtZW50LnByb3RvdHlwZS4kbWV0aG9kKFwiZmluZEJ5SWRcIiwgZnVuY3Rpb24oaWQpIHtcbiAgICBpZiAodGhpcy5pZCA9PT0gaWQpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHRoaXMuY2hpbGRyZW5baV0uZmluZEJ5SWQoaWQpKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuY2hpbGRyZW5baV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfSk7XG5cbiAgLy/mjIflrprjgZXjgozjgZ/lrZDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmnIDliY3pnaLjgavnp7vli5XjgZnjgotcbiAgcGhpbmEuYXBwLkVsZW1lbnQucHJvdG90eXBlLiRtZXRob2QoXCJtb3ZlRnJvbnRcIiwgZnVuY3Rpb24oY2hpbGQpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh0aGlzLmNoaWxkcmVuW2ldID09IGNoaWxkKSB7XG4gICAgICAgIHRoaXMuY2hpbGRyZW4uc3BsaWNlKGksIDEpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5jaGlsZHJlbi5wdXNoKGNoaWxkKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSk7XG5cbiAgcGhpbmEuYXBwLkVsZW1lbnQucHJvdG90eXBlLiRtZXRob2QoXCJkZXN0cm95Q2hpbGRcIiwgZnVuY3Rpb24oKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGlzLmNoaWxkcmVuW2ldLmZsYXJlKCdkZXN0cm95Jyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9KTtcblxufSk7XG4iLCJwaGluYS5uYW1lc3BhY2UoKCkgPT4ge1xuXG4gIHBoaW5hLmlucHV0LklucHV0LnF1YWxpdHkgPSAxLjA7XG5cbiAgcGhpbmEuaW5wdXQuSW5wdXQucHJvdG90eXBlLiRtZXRob2QoXCJfbW92ZVwiLCBmdW5jdGlvbih4LCB5KSB7XG4gICAgdGhpcy5fdGVtcFBvc2l0aW9uLnggPSB4O1xuICAgIHRoaXMuX3RlbXBQb3NpdGlvbi55ID0geTtcblxuICAgIC8vIGFkanVzdCBzY2FsZVxuICAgIHZhciBlbG0gPSB0aGlzLmRvbUVsZW1lbnQ7XG4gICAgdmFyIHJlY3QgPSBlbG0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICB2YXIgdyA9IGVsbS53aWR0aCAvIHBoaW5hLmlucHV0LklucHV0LnF1YWxpdHk7XG4gICAgdmFyIGggPSBlbG0uaGVpZ2h0IC8gcGhpbmEuaW5wdXQuSW5wdXQucXVhbGl0eTtcblxuICAgIGlmIChyZWN0LndpZHRoKSB7XG4gICAgICB0aGlzLl90ZW1wUG9zaXRpb24ueCAqPSB3IC8gcmVjdC53aWR0aDtcbiAgICB9XG5cbiAgICBpZiAocmVjdC5oZWlnaHQpIHtcbiAgICAgIHRoaXMuX3RlbXBQb3NpdGlvbi55ICo9IGggLyByZWN0LmhlaWdodDtcbiAgICB9XG5cbiAgfSk7XG5cbn0pO1xuIiwicGhpbmEubmFtZXNwYWNlKCgpID0+IHtcbiAgcGhpbmEuZGlzcGxheS5MYWJlbC5wcm90b3R5cGUuJG1ldGhvZChcImluaXRcIiwgZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIGlmICh0eXBlb2YgYXJndW1lbnRzWzBdICE9PSAnb2JqZWN0Jykge1xuICAgICAgb3B0aW9ucyA9IHsgdGV4dDogYXJndW1lbnRzWzBdLCB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb25zID0gYXJndW1lbnRzWzBdO1xuICAgIH1cblxuICAgIG9wdGlvbnMgPSAoe30pLiRzYWZlKG9wdGlvbnMsIHBoaW5hLmRpc3BsYXkuTGFiZWwuZGVmYXVsdHMpO1xuICAgIHRoaXMuc3VwZXJJbml0KG9wdGlvbnMpO1xuXG4gICAgdGhpcy50ZXh0ID0gKG9wdGlvbnMudGV4dCkgPyBvcHRpb25zLnRleHQgOiBcIlwiO1xuICAgIHRoaXMuZm9udFNpemUgPSBvcHRpb25zLmZvbnRTaXplO1xuICAgIHRoaXMuZm9udFdlaWdodCA9IG9wdGlvbnMuZm9udFdlaWdodDtcbiAgICB0aGlzLmZvbnRGYW1pbHkgPSBvcHRpb25zLmZvbnRGYW1pbHk7XG4gICAgdGhpcy5hbGlnbiA9IG9wdGlvbnMuYWxpZ247XG4gICAgdGhpcy5iYXNlbGluZSA9IG9wdGlvbnMuYmFzZWxpbmU7XG4gICAgdGhpcy5saW5lSGVpZ2h0ID0gb3B0aW9ucy5saW5lSGVpZ2h0O1xuICB9KTtcblxufSk7XG4iLCJwaGluYS5uYW1lc3BhY2UoKCkgPT4ge1xuICBwaGluYS5pbnB1dC5Nb3VzZS5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKGRvbUVsZW1lbnQpIHtcbiAgICB0aGlzLnN1cGVySW5pdChkb21FbGVtZW50KTtcblxuICAgIHRoaXMuaWQgPSAwO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBmdW5jdGlvbihlKSB7XG4gICAgICBzZWxmLl9zdGFydChlLnBvaW50WCwgZS5wb2ludFksIDEgPDwgZS5idXR0b24pO1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB9KTtcblxuICAgIHRoaXMuZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZnVuY3Rpb24oZSkge1xuICAgICAgc2VsZi5fZW5kKDEgPDwgZS5idXR0b24pO1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB9KTtcbiAgICB0aGlzLmRvbUVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZnVuY3Rpb24oZSkge1xuICAgICAgc2VsZi5fbW92ZShlLnBvaW50WCwgZS5wb2ludFkpO1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB9KTtcblxuICAgIC8vIOODnuOCpuOCueOBjOOCreODo+ODs+ODkOOCueimgee0oOOBruWkluOBq+WHuuOBn+WgtOWQiOOBruWvvuW/nFxuICAgIHRoaXMuZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW91dCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIHNlbGYuX2VuZCgxKTtcbiAgICB9KTtcbiAgfVxufSk7XG4iLCIvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyAgRXh0ZW5zaW9uIHBoaW5hLmFwcC5PYmplY3QyRFxuLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5waGluYS5uYW1lc3BhY2UoKCkgPT4ge1xuICBwaGluYS5hcHAuT2JqZWN0MkQucHJvdG90eXBlLiRtZXRob2QoXCJzZXRPcmlnaW5cIiwgZnVuY3Rpb24oeCwgeSwgcmVwb3NpdGlvbikge1xuICAgIGlmICghcmVwb3NpdGlvbikge1xuICAgICAgdGhpcy5vcmlnaW4ueCA9IHg7XG4gICAgICB0aGlzLm9yaWdpbi55ID0geTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8v5aSJ5pu044GV44KM44Gf5Z+65rqW54K544Gr56e75YuV44GV44Gb44KLXG4gICAgY29uc3QgX29yaWdpblggPSB0aGlzLm9yaWdpblg7XG4gICAgY29uc3QgX29yaWdpblkgPSB0aGlzLm9yaWdpblk7XG4gICAgY29uc3QgX2FkZFggPSAoeCAtIF9vcmlnaW5YKSAqIHRoaXMud2lkdGg7XG4gICAgY29uc3QgX2FkZFkgPSAoeSAtIF9vcmlnaW5ZKSAqIHRoaXMuaGVpZ2h0O1xuXG4gICAgdGhpcy54ICs9IF9hZGRYO1xuICAgIHRoaXMueSArPSBfYWRkWTtcbiAgICB0aGlzLm9yaWdpblggPSB4O1xuICAgIHRoaXMub3JpZ2luWSA9IHk7XG5cbiAgICB0aGlzLmNoaWxkcmVuLmZvckVhY2goY2hpbGQgPT4ge1xuICAgICAgY2hpbGQueCAtPSBfYWRkWDtcbiAgICAgIGNoaWxkLnkgLT0gX2FkZFk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0pO1xuXG4gIHBoaW5hLmFwcC5PYmplY3QyRC5wcm90b3R5cGUuJG1ldGhvZChcImhpdFRlc3RFbGVtZW50XCIsIGZ1bmN0aW9uKGVsbSkge1xuICAgIGNvbnN0IHJlY3QwID0gdGhpcy5jYWxjR2xvYmFsUmVjdCgpO1xuICAgIGNvbnN0IHJlY3QxID0gZWxtLmNhbGNHbG9iYWxSZWN0KCk7XG4gICAgcmV0dXJuIChyZWN0MC5sZWZ0IDwgcmVjdDEucmlnaHQpICYmIChyZWN0MC5yaWdodCA+IHJlY3QxLmxlZnQpICYmXG4gICAgICAocmVjdDAudG9wIDwgcmVjdDEuYm90dG9tKSAmJiAocmVjdDAuYm90dG9tID4gcmVjdDEudG9wKTtcbiAgfSk7XG5cbiAgcGhpbmEuYXBwLk9iamVjdDJELnByb3RvdHlwZS4kbWV0aG9kKFwiaW5jbHVkZUVsZW1lbnRcIiwgZnVuY3Rpb24oZWxtKSB7XG4gICAgY29uc3QgcmVjdDAgPSB0aGlzLmNhbGNHbG9iYWxSZWN0KCk7XG4gICAgY29uc3QgcmVjdDEgPSBlbG0uY2FsY0dsb2JhbFJlY3QoKTtcbiAgICByZXR1cm4gKHJlY3QwLmxlZnQgPD0gcmVjdDEubGVmdCkgJiYgKHJlY3QwLnJpZ2h0ID49IHJlY3QxLnJpZ2h0KSAmJlxuICAgICAgKHJlY3QwLnRvcCA8PSByZWN0MS50b3ApICYmIChyZWN0MC5ib3R0b20gPj0gcmVjdDEuYm90dG9tKTtcbiAgfSk7XG5cbiAgcGhpbmEuYXBwLk9iamVjdDJELnByb3RvdHlwZS4kbWV0aG9kKFwiY2FsY0dsb2JhbFJlY3RcIiwgZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgbGVmdCA9IHRoaXMuX3dvcmxkTWF0cml4Lm0wMiAtIHRoaXMub3JpZ2luWCAqIHRoaXMud2lkdGg7XG4gICAgY29uc3QgdG9wID0gdGhpcy5fd29ybGRNYXRyaXgubTEyIC0gdGhpcy5vcmlnaW5ZICogdGhpcy5oZWlnaHQ7XG4gICAgcmV0dXJuIFJlY3QobGVmdCwgdG9wLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gIH0pO1xuXG4gIHBoaW5hLmFwcC5PYmplY3QyRC5wcm90b3R5cGUuJG1ldGhvZChcImNhbGNHbG9iYWxSZWN0XCIsIGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IGxlZnQgPSB0aGlzLl93b3JsZE1hdHJpeC5tMDIgLSB0aGlzLm9yaWdpblggKiB0aGlzLndpZHRoO1xuICAgIGNvbnN0IHRvcCA9IHRoaXMuX3dvcmxkTWF0cml4Lm0xMiAtIHRoaXMub3JpZ2luWSAqIHRoaXMuaGVpZ2h0O1xuICAgIHJldHVybiBSZWN0KGxlZnQsIHRvcCwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuICB9KTtcblxufSk7XG4iLCJwaGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZGlzcGxheS5QbGFpbkVsZW1lbnQucHJvdG90eXBlLiRtZXRob2QoXCJkZXN0cm95Q2FudmFzXCIsIGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5jYW52YXMpIHJldHVybjtcbiAgICB0aGlzLmNhbnZhcy5kZXN0cm95KCk7XG4gICAgZGVsZXRlIHRoaXMuY2FudmFzO1xuICB9KTtcblxufSk7XG4iLCIvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyAgRXh0ZW5zaW9uIHBoaW5hLmRpc3BsYXkuU2hhcGVcbi8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbnBoaW5hLmRpc3BsYXkuU2hhcGUucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKGNhbnZhcykge1xuICBpZiAoIWNhbnZhcykge1xuICAgIGNvbnNvbGUubG9nKFwiY2FudmFzIG51bGxcIik7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBjb250ZXh0ID0gY2FudmFzLmNvbnRleHQ7XG4gIC8vIOODquOCteOCpOOCulxuICB2YXIgc2l6ZSA9IHRoaXMuY2FsY0NhbnZhc1NpemUoKTtcbiAgY2FudmFzLnNldFNpemUoc2l6ZS53aWR0aCwgc2l6ZS5oZWlnaHQpO1xuICAvLyDjgq/jg6rjgqLjgqvjg6njg7xcbiAgY2FudmFzLmNsZWFyQ29sb3IodGhpcy5iYWNrZ3JvdW5kQ29sb3IpO1xuICAvLyDkuK3lv4PjgavluqfmqJnjgpLnp7vli5VcbiAgY2FudmFzLnRyYW5zZm9ybUNlbnRlcigpO1xuXG4gIC8vIOaPj+eUu+WJjeWHpueQhlxuICB0aGlzLnByZXJlbmRlcih0aGlzLmNhbnZhcyk7XG5cbiAgLy8g44K544OI44Ot44O844Kv5o+P55S7XG4gIGlmICh0aGlzLmlzU3Ryb2thYmxlKCkpIHtcbiAgICBjb250ZXh0LnN0cm9rZVN0eWxlID0gdGhpcy5zdHJva2U7XG4gICAgY29udGV4dC5saW5lV2lkdGggPSB0aGlzLnN0cm9rZVdpZHRoO1xuICAgIGNvbnRleHQubGluZUpvaW4gPSBcInJvdW5kXCI7XG4gICAgY29udGV4dC5zaGFkb3dCbHVyID0gMDtcbiAgICB0aGlzLnJlbmRlclN0cm9rZShjYW52YXMpO1xuICB9XG5cbiAgLy8g5aGX44KK44Gk44G244GX5o+P55S7XG4gIGlmICh0aGlzLmZpbGwpIHtcbiAgICBjb250ZXh0LmZpbGxTdHlsZSA9IHRoaXMuZmlsbDtcbiAgICAvLyBzaGFkb3cg44GuIG9uL29mZlxuICAgIGlmICh0aGlzLnNoYWRvdykge1xuICAgICAgY29udGV4dC5zaGFkb3dDb2xvciA9IHRoaXMuc2hhZG93O1xuICAgICAgY29udGV4dC5zaGFkb3dCbHVyID0gdGhpcy5zaGFkb3dCbHVyO1xuICAgICAgY29udGV4dC5zaGFkb3dPZmZzZXRYID0gdGhpcy5zaGFkb3dPZmZzZXRYIHx8IDA7XG4gICAgICBjb250ZXh0LnNoYWRvd09mZnNldFkgPSB0aGlzLnNoYWRvd09mZnNldFkgfHwgMDtcbiAgICB9IGVsc2Uge1xuICAgICAgY29udGV4dC5zaGFkb3dCbHVyID0gMDtcbiAgICB9XG4gICAgdGhpcy5yZW5kZXJGaWxsKGNhbnZhcyk7XG4gIH1cblxuICAvLyDmj4/nlLvlvozlh6bnkIZcbiAgdGhpcy5wb3N0cmVuZGVyKHRoaXMuY2FudmFzKTtcblxuICByZXR1cm4gdGhpcztcbn07XG4iLCJwaGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuYXNzZXQuU291bmQucHJvdG90eXBlLiRtZXRob2QoXCJfbG9hZFwiLCBmdW5jdGlvbihyZXNvbHZlKSB7XG4gICAgaWYgKC9eZGF0YTovLnRlc3QodGhpcy5zcmMpKSB7XG4gICAgICB0aGlzLl9sb2FkRnJvbVVSSVNjaGVtZShyZXNvbHZlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fbG9hZEZyb21GaWxlKHJlc29sdmUpO1xuICAgIH1cbiAgfSk7XG5cbiAgcGhpbmEuYXNzZXQuU291bmQucHJvdG90eXBlLiRtZXRob2QoXCJfbG9hZEZyb21GaWxlXCIsIGZ1bmN0aW9uKHJlc29sdmUpIHtcbiAgICAvLyBjb25zb2xlLmxvZyh0aGlzLnNyYyk7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB4bWwgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICB4bWwub3BlbignR0VUJywgdGhpcy5zcmMpO1xuICAgIHhtbC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh4bWwucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgICBpZiAoWzIwMCwgMjAxLCAwXS5pbmRleE9mKHhtbC5zdGF0dXMpICE9PSAtMSkge1xuICAgICAgICAgIC8vIOmfs+alveODkOOCpOODiuODquODvOODh+ODvOOCv1xuICAgICAgICAgIHZhciBkYXRhID0geG1sLnJlc3BvbnNlO1xuICAgICAgICAgIC8vIHdlYmF1ZGlvIOeUqOOBq+WkieaPm1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGRhdGEpXG4gICAgICAgICAgc2VsZi5jb250ZXh0LmRlY29kZUF1ZGlvRGF0YShkYXRhLCBmdW5jdGlvbihidWZmZXIpIHtcbiAgICAgICAgICAgIHNlbGYubG9hZEZyb21CdWZmZXIoYnVmZmVyKTtcbiAgICAgICAgICAgIHJlc29sdmUoc2VsZik7XG4gICAgICAgICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXCLpn7Plo7Djg5XjgqHjgqTjg6vjga7jg4fjgrPjg7zjg4njgavlpLHmlZfjgZfjgb7jgZfjgZ/jgIIoXCIgKyBzZWxmLnNyYyArIFwiKVwiKTtcbiAgICAgICAgICAgIHJlc29sdmUoc2VsZik7XG4gICAgICAgICAgICBzZWxmLmZsYXJlKCdkZWNvZGVlcnJvcicpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKHhtbC5zdGF0dXMgPT09IDQwNCkge1xuICAgICAgICAgIC8vIG5vdCBmb3VuZFxuICAgICAgICAgIHNlbGYubG9hZEVycm9yID0gdHJ1ZTtcbiAgICAgICAgICBzZWxmLm5vdEZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICByZXNvbHZlKHNlbGYpO1xuICAgICAgICAgIHNlbGYuZmxhcmUoJ2xvYWRlcnJvcicpO1xuICAgICAgICAgIHNlbGYuZmxhcmUoJ25vdGZvdW5kJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8g44K144O844OQ44O844Ko44Op44O8XG4gICAgICAgICAgc2VsZi5sb2FkRXJyb3IgPSB0cnVlO1xuICAgICAgICAgIHNlbGYuc2VydmVyRXJyb3IgPSB0cnVlO1xuICAgICAgICAgIHJlc29sdmUoc2VsZik7XG4gICAgICAgICAgc2VsZi5mbGFyZSgnbG9hZGVycm9yJyk7XG4gICAgICAgICAgc2VsZi5mbGFyZSgnc2VydmVyZXJyb3InKTtcbiAgICAgICAgfVxuICAgICAgICB4bWwub25yZWFkeXN0YXRlY2hhbmdlID0gbnVsbDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgeG1sLnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG5cbiAgICB4bWwuc2VuZChudWxsKTtcbiAgfSk7XG5cbiAgcGhpbmEuYXNzZXQuU291bmQucHJvdG90eXBlLiRtZXRob2QoXCJwbGF5XCIsIGZ1bmN0aW9uKHdoZW4sIG9mZnNldCwgZHVyYXRpb24pIHtcbiAgICB3aGVuID0gd2hlbiA/IHdoZW4gKyB0aGlzLmNvbnRleHQuY3VycmVudFRpbWUgOiAwO1xuICAgIG9mZnNldCA9IG9mZnNldCB8fCAwO1xuXG4gICAgdmFyIHNvdXJjZSA9IHRoaXMuc291cmNlID0gdGhpcy5jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICAgIHZhciBidWZmZXIgPSBzb3VyY2UuYnVmZmVyID0gdGhpcy5idWZmZXI7XG4gICAgc291cmNlLmxvb3AgPSB0aGlzLl9sb29wO1xuICAgIHNvdXJjZS5sb29wU3RhcnQgPSB0aGlzLl9sb29wU3RhcnQ7XG4gICAgc291cmNlLmxvb3BFbmQgPSB0aGlzLl9sb29wRW5kO1xuICAgIHNvdXJjZS5wbGF5YmFja1JhdGUudmFsdWUgPSB0aGlzLl9wbGF5YmFja1JhdGU7XG5cbiAgICAvLyBjb25uZWN0XG4gICAgc291cmNlLmNvbm5lY3QodGhpcy5nYWluTm9kZSk7XG4gICAgdGhpcy5nYWluTm9kZS5jb25uZWN0KHBoaW5hLmFzc2V0LlNvdW5kLmdldE1hc3RlckdhaW4oKSk7XG4gICAgLy8gcGxheVxuICAgIGlmIChkdXJhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBzb3VyY2Uuc3RhcnQod2hlbiwgb2Zmc2V0LCBkdXJhdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNvdXJjZS5zdGFydCh3aGVuLCBvZmZzZXQpO1xuICAgIH1cblxuICAgIHNvdXJjZS5vbmVuZGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoIXNvdXJjZSkge1xuICAgICAgICB0aGlzLmZsYXJlKCdlbmRlZCcpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBzb3VyY2Uub25lbmRlZCA9IG51bGw7XG4gICAgICBzb3VyY2UuZGlzY29ubmVjdCgpO1xuICAgICAgc291cmNlLmJ1ZmZlciA9IG51bGw7XG4gICAgICBzb3VyY2UgPSBudWxsO1xuICAgICAgdGhpcy5mbGFyZSgnZW5kZWQnKTtcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSk7XG5cbiAgcGhpbmEuYXNzZXQuU291bmQucHJvdG90eXBlLiRtZXRob2QoXCJzdG9wXCIsIGZ1bmN0aW9uKCkge1xuICAgIC8vIHN0b3BcbiAgICBpZiAodGhpcy5zb3VyY2UpIHtcbiAgICAgIC8vIHN0b3Ag44GZ44KL44GoIHNvdXJjZS5lbmRlZOOCgueZuueBq+OBmeOCi1xuICAgICAgdGhpcy5zb3VyY2Uuc3RvcCAmJiB0aGlzLnNvdXJjZS5zdG9wKDApO1xuICAgICAgdGhpcy5mbGFyZSgnc3RvcCcpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9KTtcblxufSk7XG4iLCIvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyAgRXh0ZW5zaW9uIHBoaW5hLmFzc2V0LlNvdW5kTWFuYWdlclxuLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuU291bmRNYW5hZ2VyLiRtZXRob2QoXCJnZXRWb2x1bWVcIiwgZnVuY3Rpb24oKSB7XG4gIHJldHVybiAhdGhpcy5pc011dGUoKSA/IHRoaXMudm9sdW1lIDogMDtcbn0pO1xuXG5Tb3VuZE1hbmFnZXIuJG1ldGhvZChcImdldFZvbHVtZU11c2ljXCIsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4gIXRoaXMuaXNNdXRlKCkgPyB0aGlzLm11c2ljVm9sdW1lIDogMDtcbn0pO1xuXG5Tb3VuZE1hbmFnZXIuJG1ldGhvZChcInNldFZvbHVtZU11c2ljXCIsIGZ1bmN0aW9uKHZvbHVtZSkge1xuICB0aGlzLm11c2ljVm9sdW1lID0gdm9sdW1lO1xuICBpZiAoIXRoaXMuaXNNdXRlKCkgJiYgdGhpcy5jdXJyZW50TXVzaWMpIHtcbiAgICB0aGlzLmN1cnJlbnRNdXNpYy52b2x1bWUgPSB2b2x1bWU7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59KTtcblxuU291bmRNYW5hZ2VyLiRtZXRob2QoXCJwbGF5TXVzaWNcIiwgZnVuY3Rpb24obmFtZSwgZmFkZVRpbWUsIGxvb3AsIHdoZW4sIG9mZnNldCwgZHVyYXRpb24pIHtcbiAgLy8gY29uc3QgcmVzID0gcGhpbmEuY2hlY2tCcm93c2VyKCk7XG4gIC8vIGlmIChyZXMuaXNJZTExKSByZXR1cm4gbnVsbDtcblxuICBsb29wID0gKGxvb3AgIT09IHVuZGVmaW5lZCkgPyBsb29wIDogdHJ1ZTtcblxuICBpZiAodGhpcy5jdXJyZW50TXVzaWMpIHtcbiAgICB0aGlzLnN0b3BNdXNpYyhmYWRlVGltZSk7XG4gIH1cblxuICB2YXIgbXVzaWMgPSBudWxsO1xuICBpZiAobmFtZSBpbnN0YW5jZW9mIHBoaW5hLmFzc2V0LlNvdW5kIHx8IG5hbWUgaW5zdGFuY2VvZiBwaGluYS5hc3NldC5Eb21BdWRpb1NvdW5kKSB7XG4gICAgbXVzaWMgPSBuYW1lO1xuICB9IGVsc2Uge1xuICAgIG11c2ljID0gcGhpbmEuYXNzZXQuQXNzZXRNYW5hZ2VyLmdldCgnc291bmQnLCBuYW1lKTtcbiAgfVxuXG4gIGlmICghbXVzaWMpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiU291bmQgbm90IGZvdW5kOiBcIiwgbmFtZSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBtdXNpYy5zZXRMb29wKGxvb3ApO1xuICBtdXNpYy5wbGF5KHdoZW4sIG9mZnNldCwgZHVyYXRpb24pO1xuXG4gIGlmIChmYWRlVGltZSA+IDApIHtcbiAgICB2YXIgY291bnQgPSAzMjtcbiAgICB2YXIgY291bnRlciA9IDA7XG4gICAgdmFyIHVuaXRUaW1lID0gZmFkZVRpbWUgLyBjb3VudDtcbiAgICB2YXIgdm9sdW1lID0gdGhpcy5nZXRWb2x1bWVNdXNpYygpO1xuXG4gICAgbXVzaWMudm9sdW1lID0gMDtcbiAgICB2YXIgaWQgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgIGNvdW50ZXIgKz0gMTtcbiAgICAgIHZhciByYXRlID0gY291bnRlciAvIGNvdW50O1xuICAgICAgbXVzaWMudm9sdW1lID0gcmF0ZSAqIHZvbHVtZTtcblxuICAgICAgaWYgKHJhdGUgPj0gMSkge1xuICAgICAgICBjbGVhckludGVydmFsKGlkKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LCB1bml0VGltZSk7XG4gIH0gZWxzZSB7XG4gICAgbXVzaWMudm9sdW1lID0gdGhpcy5nZXRWb2x1bWVNdXNpYygpO1xuICB9XG5cbiAgdGhpcy5jdXJyZW50TXVzaWMgPSBtdXNpYztcblxuICByZXR1cm4gdGhpcy5jdXJyZW50TXVzaWM7XG59KTtcblxuLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8g44Oc44Kk44K555So44Gu6Z+z6YeP6Kit5a6a44CB5YaN55Sf44Oh44K944OD44OJ5ouh5by1XG5Tb3VuZE1hbmFnZXIuJG1ldGhvZChcImdldFZvbHVtZVZvaWNlXCIsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4gIXRoaXMuaXNNdXRlKCkgPyB0aGlzLnZvaWNlVm9sdW1lIDogMDtcbn0pO1xuXG5Tb3VuZE1hbmFnZXIuJG1ldGhvZChcInNldFZvbHVtZVZvaWNlXCIsIGZ1bmN0aW9uKHZvbHVtZSkge1xuICB0aGlzLnZvaWNlVm9sdW1lID0gdm9sdW1lO1xuICByZXR1cm4gdGhpcztcbn0pO1xuXG5Tb3VuZE1hbmFnZXIuJG1ldGhvZChcInBsYXlWb2ljZVwiLCBmdW5jdGlvbihuYW1lKSB7XG4gIHZhciBzb3VuZCA9IHBoaW5hLmFzc2V0LkFzc2V0TWFuYWdlci5nZXQoJ3NvdW5kJywgbmFtZSk7XG4gIHNvdW5kLnZvbHVtZSA9IHRoaXMuZ2V0Vm9sdW1lVm9pY2UoKTtcbiAgc291bmQucGxheSgpO1xuICByZXR1cm4gc291bmQ7XG59KTtcbiIsIi8v44K544OX44Op44Kk44OI5qmf6IO95ouh5by1XG5waGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZGlzcGxheS5TcHJpdGUucHJvdG90eXBlLnNldEZyYW1lVHJpbW1pbmcgPSBmdW5jdGlvbih4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgdGhpcy5fZnJhbWVUcmltWCA9IHggfHwgMDtcbiAgICB0aGlzLl9mcmFtZVRyaW1ZID0geSB8fCAwO1xuICAgIHRoaXMuX2ZyYW1lVHJpbVdpZHRoID0gd2lkdGggfHwgdGhpcy5pbWFnZS5kb21FbGVtZW50LndpZHRoIC0gdGhpcy5fZnJhbWVUcmltWDtcbiAgICB0aGlzLl9mcmFtZVRyaW1IZWlnaHQgPSBoZWlnaHQgfHwgdGhpcy5pbWFnZS5kb21FbGVtZW50LmhlaWdodCAtIHRoaXMuX2ZyYW1lVHJpbVk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBwaGluYS5kaXNwbGF5LlNwcml0ZS5wcm90b3R5cGUuc2V0RnJhbWVJbmRleCA9IGZ1bmN0aW9uKGluZGV4LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgdmFyIHN4ID0gdGhpcy5fZnJhbWVUcmltWCB8fCAwO1xuICAgIHZhciBzeSA9IHRoaXMuX2ZyYW1lVHJpbVkgfHwgMDtcbiAgICB2YXIgc3cgPSB0aGlzLl9mcmFtZVRyaW1XaWR0aCAgfHwgKHRoaXMuaW1hZ2UuZG9tRWxlbWVudC53aWR0aC1zeCk7XG4gICAgdmFyIHNoID0gdGhpcy5fZnJhbWVUcmltSGVpZ2h0IHx8ICh0aGlzLmltYWdlLmRvbUVsZW1lbnQuaGVpZ2h0LXN5KTtcblxuICAgIHZhciB0dyAgPSB3aWR0aCB8fCB0aGlzLndpZHRoOyAgICAgIC8vIHR3XG4gICAgdmFyIHRoICA9IGhlaWdodCB8fCB0aGlzLmhlaWdodDsgICAgLy8gdGhcbiAgICB2YXIgcm93ID0gfn4oc3cgLyB0dyk7XG4gICAgdmFyIGNvbCA9IH5+KHNoIC8gdGgpO1xuICAgIHZhciBtYXhJbmRleCA9IHJvdypjb2w7XG4gICAgaW5kZXggPSBpbmRleCVtYXhJbmRleDtcblxuICAgIHZhciB4ICAgPSBpbmRleCVyb3c7XG4gICAgdmFyIHkgICA9IH5+KGluZGV4L3Jvdyk7XG4gICAgdGhpcy5zcmNSZWN0LnggPSBzeCt4KnR3O1xuICAgIHRoaXMuc3JjUmVjdC55ID0gc3kreSp0aDtcbiAgICB0aGlzLnNyY1JlY3Qud2lkdGggID0gdHc7XG4gICAgdGhpcy5zcmNSZWN0LmhlaWdodCA9IHRoO1xuXG4gICAgdGhpcy5fZnJhbWVJbmRleCA9IGluZGV4O1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxufSk7IiwicGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuICAvLyDmloflrZfliJfjgYvjgonmlbDlgKTjgpLmir3lh7rjgZnjgotcbiAgLy8g44Os44Kk44Ki44Km44OI44OV44Kh44Kk44Or44GL44KJ5L2c5qWt44GZ44KL5aC05ZCI44Gr5Yip55So44GX44Gf44GP44Gq44KLXG4gIC8vIGhvZ2VfMCBob2dlXzHjgarjganjgYvjgonmlbDlrZfjgaDjgZHmir3lh7pcbiAgLy8gMDEwMF9ob2dlXzk5OTkgPT4gW1wiMDEwMFwiICwgXCI5OTk5XCJd44Gr44Gq44KLXG4gIC8vIGhvZ2UwLjDjgajjgYvjga/jganjgYbjgZnjgYvjgarvvJ9cbiAgLy8g5oq95Ye65b6M44GrcGFyc2VJbnTjgZnjgovjgYvjga/mpJzoqI7kuK1cbiAgU3RyaW5nLnByb3RvdHlwZS4kbWV0aG9kKFwibWF0Y2hJbnRcIiwgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMubWF0Y2goL1swLTldKy9nKTtcbiAgfSk7XG59KTtcbiIsInBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5hc3NldC5UZXh0dXJlLnByb3RvdHlwZS4kbWV0aG9kKFwiX2xvYWRcIiwgZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgIHRoaXMuZG9tRWxlbWVudCA9IG5ldyBJbWFnZSgpO1xuXG4gICAgdmFyIGlzTG9jYWwgPSAobG9jYXRpb24ucHJvdG9jb2wgPT0gJ2ZpbGU6Jyk7XG4gICAgaWYgKCEoL15kYXRhOi8udGVzdCh0aGlzLnNyYykpKSB7XG4gICAgICB0aGlzLmRvbUVsZW1lbnQuY3Jvc3NPcmlnaW4gPSAnYW5vbnltb3VzJzsgLy8g44Kv44Ot44K544Kq44Oq44K444Oz6Kej6ZmkXG4gICAgfVxuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuZG9tRWxlbWVudC5vbmxvYWQgPSBmdW5jdGlvbihlKSB7XG4gICAgICBzZWxmLmxvYWRlZCA9IHRydWU7XG4gICAgICBlLnRhcmdldC5vbmxvYWQgPSBudWxsO1xuICAgICAgZS50YXJnZXQub25lcnJvciA9IG51bGw7XG4gICAgICByZXNvbHZlKHNlbGYpO1xuICAgIH07XG5cbiAgICB0aGlzLmRvbUVsZW1lbnQub25lcnJvciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgIGUudGFyZ2V0Lm9ubG9hZCA9IG51bGw7XG4gICAgICBlLnRhcmdldC5vbmVycm9yID0gbnVsbDtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJwaGluYS5hc3NldC5UZXh0dXJlIF9sb2FkIG9uRXJyb3IgXCIsIHRoaXMuc3JjKTtcbiAgICB9O1xuXG4gICAgdGhpcy5kb21FbGVtZW50LnNyYyA9IHRoaXMuc3JjO1xuICB9KTtcblxufSk7XG4iLCJwaGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuYWNjZXNzb3J5LlR3ZWVuZXIucHJvdG90eXBlLiRtZXRob2QoXCJfdXBkYXRlVHdlZW5cIiwgZnVuY3Rpb24oYXBwKSB7XG4gICAgLy/igLvjgZPjgozjgarjgYTjgahwYXVzZeOBjOOBhuOBlOOBi+OBquOBhFxuICAgIGlmICghdGhpcy5wbGF5aW5nKSByZXR1cm47XG5cbiAgICB2YXIgdHdlZW4gPSB0aGlzLl90d2VlbjtcbiAgICB2YXIgdGltZSA9IHRoaXMuX2dldFVuaXRUaW1lKGFwcCk7XG5cbiAgICB0d2Vlbi5mb3J3YXJkKHRpbWUpO1xuICAgIHRoaXMuZmxhcmUoJ3R3ZWVuJyk7XG5cbiAgICBpZiAodHdlZW4udGltZSA+PSB0d2Vlbi5kdXJhdGlvbikge1xuICAgICAgZGVsZXRlIHRoaXMuX3R3ZWVuO1xuICAgICAgdGhpcy5fdHdlZW4gPSBudWxsO1xuICAgICAgdGhpcy5fdXBkYXRlID0gdGhpcy5fdXBkYXRlVGFzaztcbiAgICB9XG4gIH0pO1xuXG4gIHBoaW5hLmFjY2Vzc29yeS5Ud2VlbmVyLnByb3RvdHlwZS4kbWV0aG9kKFwiX3VwZGF0ZVdhaXRcIiwgZnVuY3Rpb24oYXBwKSB7XG4gICAgLy/igLvjgZPjgozjgarjgYTjgahwYXVzZeOBjOOBhuOBlOOBi+OBquOBhFxuICAgIGlmICghdGhpcy5wbGF5aW5nKSByZXR1cm47XG5cbiAgICB2YXIgd2FpdCA9IHRoaXMuX3dhaXQ7XG4gICAgdmFyIHRpbWUgPSB0aGlzLl9nZXRVbml0VGltZShhcHApO1xuICAgIHdhaXQudGltZSArPSB0aW1lO1xuXG4gICAgaWYgKHdhaXQudGltZSA+PSB3YWl0LmxpbWl0KSB7XG4gICAgICBkZWxldGUgdGhpcy5fd2FpdDtcbiAgICAgIHRoaXMuX3dhaXQgPSBudWxsO1xuICAgICAgdGhpcy5fdXBkYXRlID0gdGhpcy5fdXBkYXRlVGFzaztcbiAgICB9XG4gIH0pO1xuXG59KTtcbiIsIi8vXG4vLyDjgrfjg7zjg7Pjgqjjg5Xjgqfjgq/jg4jjga7ln7rnpI7jgq/jg6njgrlcbi8vXG5waGluYS5kZWZpbmUoXCJTY2VuZUVmZmVjdEJhc2VcIiwge1xuICBzdXBlckNsYXNzOiBcIklucHV0SW50ZXJjZXB0XCIsXG5cbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdXBlckluaXQoKTtcbiAgICB0aGlzLmVuYWJsZSgpO1xuICB9LFxuXG59KTtcbiIsIi8vXG4vLyDjgrfjg7zjg7Pjgqjjg5Xjgqfjgq/jg4jvvJropIfmlbDjga7lhobjgafjg5Xjgqfjg7zjg4njgqTjg7PjgqLjgqbjg4hcbi8vXG5waGluYS5kZWZpbmUoXCJTY2VuZUVmZmVjdENpcmNsZUZhZGVcIiwge1xuICBzdXBlckNsYXNzOiBcIlNjZW5lRWZmZWN0QmFzZVwiLFxuXG4gIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSAoe30pLiRzYWZlKG9wdGlvbnMsIFNjZW5lRWZmZWN0Q2lyY2xlRmFkZS5kZWZhdWx0cyk7XG5cbiAgICB0aGlzLnN1cGVySW5pdCgpO1xuICB9LFxuXG4gIF9jcmVhdGVDaXJjbGU6IGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IG51bSA9IDU7XG4gICAgY29uc3Qgd2lkdGggPSBTQ1JFRU5fV0lEVEggLyBudW07XG4gICAgcmV0dXJuIEFycmF5LnJhbmdlKChTQ1JFRU5fSEVJR0hUIC8gd2lkdGgpICsgMSkubWFwKHkgPT4ge1xuICAgICAgcmV0dXJuIEFycmF5LnJhbmdlKG51bSArIDEpLm1hcCh4ID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkQ2hpbGQoQ2lyY2xlU2hhcGUoe1xuICAgICAgICAgIHg6IHggKiB3aWR0aCxcbiAgICAgICAgICB5OiB5ICogd2lkdGgsXG4gICAgICAgICAgZmlsbDogdGhpcy5vcHRpb25zLmNvbG9yLFxuICAgICAgICAgIHN0cm9rZTogbnVsbCxcbiAgICAgICAgICByYWRpdXM6IHdpZHRoICogMC41LFxuICAgICAgICB9KSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSxcblxuICBiZWdpbjogZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgY2lyY2xlcyA9IHRoaXMuX2NyZWF0ZUNpcmNsZSgpO1xuICAgIGNvbnN0IHRhc2tzID0gW107XG4gICAgY2lyY2xlcy5mb3JFYWNoKCh4TGluZSwgeSkgPT4ge1xuICAgICAgeExpbmUuZm9yRWFjaCgoY2lyY2xlLCB4KSA9PiB7XG4gICAgICAgIGNpcmNsZS5zY2FsZVggPSAwO1xuICAgICAgICBjaXJjbGUuc2NhbGVZID0gMDtcbiAgICAgICAgdGFza3MucHVzaChuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICBjaXJjbGUudHdlZW5lci5jbGVhcigpXG4gICAgICAgICAgICAudG8oe1xuICAgICAgICAgICAgICBzY2FsZVg6IDEuNSxcbiAgICAgICAgICAgICAgc2NhbGVZOiAxLjVcbiAgICAgICAgICAgIH0sIDUwMCwgXCJlYXNlT3V0UXVhZFwiKVxuICAgICAgICAgICAgLmNhbGwoKCkgPT4ge1xuICAgICAgICAgICAgICBjaXJjbGUucmVtb3ZlKCk7XG4gICAgICAgICAgICAgIGNpcmNsZS5kZXN0cm95Q2FudmFzKCk7XG4gICAgICAgICAgICAgIHRoaXMuY2hpbGRyZW4uY2xlYXIoKTtcbiAgICAgICAgICAgICAgdGhpcy5kaXNhYmxlKCk7XG4gICAgICAgICAgICAgIHJlc29sdmUoKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBQcm9taXNlLmFsbCh0YXNrcyk7XG4gIH0sXG5cbiAgZmluaXNoOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmNoaWxkcmVuLmNsZWFyKCk7XG5cbiAgICBjb25zdCBjaXJjbGVzID0gdGhpcy5fY3JlYXRlQ2lyY2xlKCk7XG4gICAgY29uc3QgdGFza3MgPSBbXTtcbiAgICBjaXJjbGVzLmZvckVhY2goeExpbmUgPT4ge1xuICAgICAgeExpbmUuZm9yRWFjaChjaXJjbGUgPT4ge1xuICAgICAgICBjaXJjbGUuc2NhbGVYID0gMS41O1xuICAgICAgICBjaXJjbGUuc2NhbGVZID0gMS41O1xuICAgICAgICB0YXNrcy5wdXNoKG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgIGNpcmNsZS50d2VlbmVyLmNsZWFyKClcbiAgICAgICAgICAgIC50byh7XG4gICAgICAgICAgICAgIHNjYWxlWDogMCxcbiAgICAgICAgICAgICAgc2NhbGVZOiAwXG4gICAgICAgICAgICB9LCA1MDAsIFwiZWFzZU91dFF1YWRcIilcbiAgICAgICAgICAgIC5jYWxsKCgpID0+IHtcbiAgICAgICAgICAgICAgY2lyY2xlLnJlbW92ZSgpO1xuICAgICAgICAgICAgICBjaXJjbGUuZGVzdHJveUNhbnZhcygpO1xuICAgICAgICAgICAgICB0aGlzLmNoaWxkcmVuLmNsZWFyKCk7XG4gICAgICAgICAgICAgIHRoaXMuZGlzYWJsZSgpO1xuICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSkpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHRhc2tzKTtcbiAgfSxcblxuICBfc3RhdGljOiB7XG4gICAgZGVmYXVsdHM6IHtcbiAgICAgIGNvbG9yOiBcIndoaXRlXCIsXG4gICAgfVxuICB9XG5cbn0pO1xuIiwiLy9cbi8vIOOCt+ODvOODs+OCqOODleOCp+OCr+ODiO+8muODleOCp+ODvOODieOCpOODs+OCouOCpuODiFxuLy9cbnBoaW5hLmRlZmluZShcIlNjZW5lRWZmZWN0RmFkZVwiLCB7XG4gIHN1cGVyQ2xhc3M6IFwiU2NlbmVFZmZlY3RCYXNlXCIsXG5cbiAgaW5pdDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9ICh7fSkuJHNhZmUob3B0aW9ucywge1xuICAgICAgY29sb3I6IFwiYmxhY2tcIixcbiAgICAgIHRpbWU6IDUwMCxcbiAgICB9KTtcblxuICAgIHRoaXMuc3VwZXJJbml0KCk7XG4gICAgdGhpcy5mcm9tSlNPTih7XG4gICAgICBjaGlsZHJlbjoge1xuICAgICAgICBmYWRlOiB7XG4gICAgICAgICAgY2xhc3NOYW1lOiBcIlJlY3RhbmdsZVNoYXBlXCIsXG4gICAgICAgICAgYXJndW1lbnRzOiB7XG4gICAgICAgICAgICB3aWR0aDogU0NSRUVOX1dJRFRILFxuICAgICAgICAgICAgaGVpZ2h0OiBTQ1JFRU5fSEVJR0hULFxuICAgICAgICAgICAgZmlsbDogdGhpcy5vcHRpb25zLmNvbG9yLFxuICAgICAgICAgICAgc3Ryb2tlOiBudWxsLFxuICAgICAgICAgICAgcGFkZGluZzogMCxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHg6IFNDUkVFTl9XSURUSCAqIDAuNSxcbiAgICAgICAgICB5OiBTQ1JFRU5fSEVJR0hUICogMC41LFxuICAgICAgICB9LFxuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIHN0YXk6IGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IGZhZGUgPSB0aGlzLmZhZGU7XG4gICAgZmFkZS5hbHBoYSA9IDEuMDtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIH0sXG5cbiAgYmVnaW46IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgIGNvbnN0IGZhZGUgPSB0aGlzLmZhZGU7XG4gICAgICBmYWRlLmFscGhhID0gMS4wO1xuICAgICAgZmFkZS50d2VlbmVyLmNsZWFyKClcbiAgICAgICAgLmZhZGVPdXQodGhpcy5vcHRpb25zLnRpbWUpXG4gICAgICAgIC5jYWxsKCgpID0+IHtcbiAgICAgICAgICAvLzFGcmFtZeaPj+eUu+OBleOCjOOBpuOBl+OBvuOBo+OBpuOBoeOCieOBpOOBj+OBruOBp2VudGVyZnJhbWXjgafliYrpmaRcbiAgICAgICAgICB0aGlzLm9uZShcImVudGVyZnJhbWVcIiwgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5mYWRlLnJlbW92ZSgpO1xuICAgICAgICAgICAgdGhpcy5mYWRlLmRlc3Ryb3lDYW52YXMoKTtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlKClcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIGZpbmlzaDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgY29uc3QgZmFkZSA9IHRoaXMuZmFkZTtcbiAgICAgIGZhZGUuYWxwaGEgPSAwLjA7XG4gICAgICBmYWRlLnR3ZWVuZXIuY2xlYXIoKVxuICAgICAgICAuZmFkZUluKHRoaXMub3B0aW9ucy50aW1lKVxuICAgICAgICAuY2FsbCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5mbGFyZShcImZpbmlzaFwiKTtcbiAgICAgICAgICAvLzFGcmFtZeaPj+eUu+OBleOCjOOBpuOBl+OBvuOBo+OBpuOBoeOCieOBpOOBj+OBruOBp2VudGVyZnJhbWXjgafliYrpmaRcbiAgICAgICAgICB0aGlzLm9uZShcImVudGVyZnJhbWVcIiwgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5mYWRlLnJlbW92ZSgpO1xuICAgICAgICAgICAgdGhpcy5mYWRlLmRlc3Ryb3lDYW52YXMoKTtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlKClcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIF9zdGF0aWM6IHtcbiAgICBkZWZhdWx0czoge1xuICAgICAgY29sb3I6IFwiYmxhY2tcIixcbiAgICB9XG4gIH1cblxufSk7XG4iLCIvL1xuLy8g44K344O844Oz44Ko44OV44Kn44Kv44OI77ya44Gq44Gr44KC44GX44Gq44GEXG4vL1xucGhpbmEuZGVmaW5lKFwiU2NlbmVFZmZlY3ROb25lXCIsIHtcbiAgc3VwZXJDbGFzczogXCJTY2VuZUVmZmVjdEJhc2VcIixcblxuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN1cGVySW5pdCgpO1xuICB9LFxuXG4gIGJlZ2luOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICB0aGlzLm9uZShcImVudGVyZnJhbWVcIiwgKCkgPT4gdGhpcy5yZW1vdmUoKSk7XG4gICAgICByZXNvbHZlKCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgZmluaXNoOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICB0aGlzLm9uZShcImVudGVyZnJhbWVcIiwgKCkgPT4gdGhpcy5yZW1vdmUoKSk7XG4gICAgICByZXNvbHZlKCk7XG4gICAgfSk7XG4gIH1cblxufSk7XG4iLCIvL1xuLy8g44K344O844Oz44Ko44OV44Kn44Kv44OI77ya44K/44Kk44Or44OV44Kn44O844OJXG4vL1xucGhpbmEuZGVmaW5lKFwiU2NlbmVFZmZlY3RUaWxlRmFkZVwiLCB7XG4gIHN1cGVyQ2xhc3M6IFwiU2NlbmVFZmZlY3RCYXNlXCIsXG5cbiAgdGlsZXM6IG51bGwsXG4gIG51bTogMTUsXG4gIHNwZWVkOiA1MCxcblxuICBpbml0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgdGhpcy5zdXBlckluaXQoKTtcbiAgICB0aGlzLm9wdGlvbnMgPSAoe30pLiRzYWZlKG9wdGlvbnMsIHtcbiAgICAgIGNvbG9yOiBcImJsYWNrXCIsXG4gICAgICB3aWR0aDogNzY4LFxuICAgICAgaGVpZ2h0OiAxMDI0LFxuICAgIH0pO1xuXG4gICAgdGhpcy50aWxlcyA9IHRoaXMuX2NyZWF0ZVRpbGVzKCk7XG4gIH0sXG5cbiAgX2NyZWF0ZVRpbGVzOiBmdW5jdGlvbigpIHtcbiAgICBjb25zdCB3aWR0aCA9IE1hdGguZmxvb3IodGhpcy5vcHRpb25zLndpZHRoIC8gdGhpcy5udW0pO1xuXG4gICAgcmV0dXJuIEFycmF5LnJhbmdlKCh0aGlzLm9wdGlvbnMuaGVpZ2h0IC8gd2lkdGgpICsgMSkubWFwKHkgPT4ge1xuICAgICAgcmV0dXJuIEFycmF5LnJhbmdlKHRoaXMubnVtICsgMSkubWFwKHggPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hZGRDaGlsZChSZWN0YW5nbGVTaGFwZSh7XG4gICAgICAgICAgd2lkdGg6IHdpZHRoICsgMixcbiAgICAgICAgICBoZWlnaHQ6IHdpZHRoICsgMixcbiAgICAgICAgICB4OiB4ICogd2lkdGgsXG4gICAgICAgICAgeTogeSAqIHdpZHRoLFxuICAgICAgICAgIGZpbGw6IHRoaXMub3B0aW9ucy5jb2xvcixcbiAgICAgICAgICBzdHJva2U6IG51bGwsXG4gICAgICAgICAgc3Ryb2tlV2lkdGg6IDAsXG4gICAgICAgIH0pKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIHN0YXk6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudGlsZXMuZm9yRWFjaCgoeGxpbmUsIHkpID0+IHtcbiAgICAgIHhsaW5lLmZvckVhY2goKHRpbGUsIHgpID0+IHtcbiAgICAgICAgdGlsZS5zY2FsZVggPSAxLjA7XG4gICAgICAgIHRpbGUuc2NhbGVZID0gMS4wO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICB9LFxuXG4gIGJlZ2luOiBmdW5jdGlvbigpIHtcbiAgICBjb25zdCB0YXNrcyA9IFtdO1xuICAgIHRoaXMudGlsZXMuZm9yRWFjaCgoeGxpbmUsIHkpID0+IHtcbiAgICAgIGNvbnN0IHcgPSBNYXRoLnJhbmRmbG9hdCgwLCAxKSAqIHRoaXMuc3BlZWQ7XG4gICAgICB4bGluZS5mb3JFYWNoKCh0aWxlLCB4KSA9PiB7XG4gICAgICAgIHRpbGUuc2NhbGVYID0gMS4wO1xuICAgICAgICB0aWxlLnNjYWxlWSA9IDEuMDtcbiAgICAgICAgdGFza3MucHVzaChuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICB0aWxlLnR3ZWVuZXIuY2xlYXIoKVxuICAgICAgICAgICAgLndhaXQoeCAqIHRoaXMuc3BlZWQgKyB3KVxuICAgICAgICAgICAgLnRvKHtcbiAgICAgICAgICAgICAgc2NhbGVYOiAwLFxuICAgICAgICAgICAgICBzY2FsZVk6IDBcbiAgICAgICAgICAgIH0sIDUwMCwgXCJlYXNlT3V0UXVhZFwiKVxuICAgICAgICAgICAgLmNhbGwoKCkgPT4ge1xuICAgICAgICAgICAgICB0aWxlLnJlbW92ZSgpO1xuICAgICAgICAgICAgICB0aWxlLmRlc3Ryb3lDYW52YXMoKTtcbiAgICAgICAgICAgICAgcmVzb2x2ZSgpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSkpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHRhc2tzKVxuICB9LFxuXG4gIGZpbmlzaDogZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgdGFza3MgPSBbXTtcbiAgICB0aGlzLnRpbGVzLmZvckVhY2goKHhsaW5lLCB5KSA9PiB7XG4gICAgICBjb25zdCB3ID0gTWF0aC5yYW5kZmxvYXQoMCwgMSkgKiB0aGlzLnNwZWVkO1xuICAgICAgeGxpbmUuZm9yRWFjaCgodGlsZSwgeCkgPT4ge1xuICAgICAgICB0aWxlLnNjYWxlWCA9IDAuMDtcbiAgICAgICAgdGlsZS5zY2FsZVkgPSAwLjA7XG4gICAgICAgIHRhc2tzLnB1c2gobmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgdGlsZS50d2VlbmVyLmNsZWFyKClcbiAgICAgICAgICAgIC53YWl0KCh4bGluZS5sZW5ndGggLSB4KSAqIHRoaXMuc3BlZWQgKyB3KVxuICAgICAgICAgICAgLnRvKHtcbiAgICAgICAgICAgICAgc2NhbGVYOiAxLFxuICAgICAgICAgICAgICBzY2FsZVk6IDFcbiAgICAgICAgICAgIH0sIDUwMCwgXCJlYXNlT3V0UXVhZFwiKVxuICAgICAgICAgICAgLmNhbGwoKCkgPT4ge1xuICAgICAgICAgICAgICB0aWxlLnJlbW92ZSgpO1xuICAgICAgICAgICAgICB0aWxlLmRlc3Ryb3lDYW52YXMoKTtcbiAgICAgICAgICAgICAgcmVzb2x2ZSgpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSkpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHRhc2tzKVxuICB9LFxuXG4gIF9zdGF0aWM6IHtcbiAgICBkZWZhdWx0czoge1xuICAgICAgY29sb3I6IFwiYmxhY2tcIixcbiAgICB9XG4gIH1cblxufSk7XG4iLCIvL1xuLy8g44Kv44Oq44OD44Kv44KE44K/44OD44OB44KS44Kk44Oz44K/44O844K744OX44OI44GZ44KLXG4vL1xucGhpbmEuZGVmaW5lKFwiSW5wdXRJbnRlcmNlcHRcIiwge1xuICBzdXBlckNsYXNzOiBcIkRpc3BsYXlFbGVtZW50XCIsXG5cbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdXBlckluaXQoKTtcblxuICAgIHRoaXMub24oXCJhZGRlZFwiLCAoKSA9PiB7XG4gICAgICAvL+imquOBq+WvvuOBl+OBpuimhuOBhOOBi+OBtuOBm+OCi1xuICAgICAgdGhpcy53aWR0aCA9IHRoaXMucGFyZW50LndpZHRoO1xuICAgICAgdGhpcy5oZWlnaHQgPSB0aGlzLnBhcmVudC5oZWlnaHQ7XG4gICAgICB0aGlzLm9yaWdpblggPSB0aGlzLnBhcmVudC5vcmlnaW5YIHx8IDA7XG4gICAgICB0aGlzLm9yaWdpblkgPSB0aGlzLnBhcmVudC5vcmlnaW5ZIHx8IDA7XG4gICAgICB0aGlzLnggPSAwO1xuICAgICAgdGhpcy55ID0gMDtcbiAgICB9KTtcbiAgICB0aGlzLmRpc2FibGUoKTtcbiAgfSxcblxuICBlbmFibGU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2V0SW50ZXJhY3RpdmUodHJ1ZSk7XG4gIH0sXG5cbiAgZGlzYWJsZTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zZXRJbnRlcmFjdGl2ZShmYWxzZSk7XG4gIH0sXG5cbn0pO1xuIiwicGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuXG4gIGxldCBkdW1teVRleHR1cmUgPSBudWxsO1xuXG4gIHBoaW5hLmRlZmluZShcIlNwcml0ZUxhYmVsXCIsIHtcbiAgICBzdXBlckNsYXNzOiBcIkRpc3BsYXlFbGVtZW50XCIsXG5cbiAgICBfdGV4dDogbnVsbCxcbiAgICB0YWJsZTogbnVsbCxcbiAgICBmaXhXaWR0aDogMCxcblxuICAgIHNwcml0ZXM6IG51bGwsXG5cbiAgICBpbml0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICBpZiAoIWR1bW15VGV4dHVyZSkge1xuICAgICAgICBkdW1teVRleHR1cmUgPSBDYW52YXMoKS5zZXRTaXplKDEsIDEpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnN1cGVySW5pdChvcHRpb25zKTtcbiAgICAgIHRoaXMudGFibGUgPSBvcHRpb25zLnRhYmxlO1xuICAgICAgdGhpcy5maXhXaWR0aCA9IG9wdGlvbnMuZml4V2lkdGggfHwgMDtcblxuICAgICAgdGhpcy5zcHJpdGVzID0gW107XG5cbiAgICAgIHRoaXMuc2V0VGV4dChcIlwiKTtcbiAgICB9LFxuXG4gICAgc2V0VGV4dDogZnVuY3Rpb24odGV4dCkge1xuICAgICAgdGhpcy5fdGV4dCA9IHRleHQ7XG5cbiAgICAgIGNvbnN0IGNoYXJzID0gdGhpcy50ZXh0LnNwbGl0KFwiXCIpO1xuXG4gICAgICBpZiAodGhpcy5zcHJpdGVzLmxlbmd0aCA8IGNoYXJzLmxlbmd0aCkge1xuICAgICAgICBBcnJheS5yYW5nZSgwLCB0aGlzLnNwcml0ZXMubGVuZ3RoIC0gY2hhcnMubGVuZ3RoKS5mb3JFYWNoKCgpID0+IHtcbiAgICAgICAgICB0aGlzLnNwcml0ZXMucHVzaChTcHJpdGUoZHVtbXlUZXh0dXJlKSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgQXJyYXkucmFuZ2UoMCwgY2hhcnMubGVuZ3RoIC0gdGhpcy5zcHJpdGVzLmxlbmd0aCkuZm9yRWFjaCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5zcHJpdGVzLmxhc3QucmVtb3ZlKCk7XG4gICAgICAgICAgdGhpcy5zcHJpdGVzLmxlbmd0aCAtPSAxO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fdGV4dC5zcGxpdChcIlwiKS5tYXAoKGMsIGkpID0+IHtcbiAgICAgICAgdGhpcy5zcHJpdGVzW2ldXG4gICAgICAgICAgLnNldEltYWdlKHRoaXMudGFibGVbY10pXG4gICAgICAgICAgLnNldE9yaWdpbih0aGlzLm9yaWdpblgsIHRoaXMub3JpZ2luWSlcbiAgICAgICAgICAuYWRkQ2hpbGRUbyh0aGlzKTtcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCB0b3RhbFdpZHRoID0gdGhpcy5zcHJpdGVzLnJlZHVjZSgodywgcykgPT4gdyArICh0aGlzLmZpeFdpZHRoIHx8IHMud2lkdGgpLCAwKTtcbiAgICAgIGNvbnN0IHRvdGFsSGVpZ2h0ID0gdGhpcy5zcHJpdGVzLm1hcChfID0+IF8uaGVpZ2h0KS5zb3J0KCkubGFzdDtcblxuICAgICAgbGV0IHggPSB0b3RhbFdpZHRoICogLXRoaXMub3JpZ2luWDtcbiAgICAgIHRoaXMuc3ByaXRlcy5mb3JFYWNoKChzKSA9PiB7XG4gICAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy5maXhXaWR0aCB8fCBzLndpZHRoO1xuICAgICAgICBzLnggPSB4ICsgd2lkdGggKiBzLm9yaWdpblg7XG4gICAgICAgIHggKz0gd2lkdGg7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIF9hY2Nlc3Nvcjoge1xuICAgICAgdGV4dDoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLl90ZXh0O1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICB0aGlzLnNldFRleHQodik7XG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG5cbiAgfSk7XG5cbn0pO1xuIl19
