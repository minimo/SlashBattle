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
      this.on('request_battle', () => {
        this.dialog = Dialog().addChildTo(this).open();
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
          .addChildTo(this);
        const state = Label({ text: "unknown", fill: "white", fontSize: 20, baseline: "middle", align: "left" })
          .setPosition(300, y)
          .addChildTo(this);
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
      if (!TitleScene.isAssetLoaded || this.isExit || !this.isReady) return;

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
          const id = this.labelList[this.selectNum].peer.text;
          this.isExit = true;
          this.exit("sync", { isSelect: true, remoteId: id });
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
