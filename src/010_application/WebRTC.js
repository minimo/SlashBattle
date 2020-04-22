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
