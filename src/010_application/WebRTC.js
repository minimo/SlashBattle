phina.namespace(function() {

  phina.define("WebRTC", {
    superClass: "phina.util.EventDispatcher",

    key: '344539c4-13d8-4c29-86b1-ca96a66897f7',
    id: "",
    peer: null,
    peerList: null,
    peerData: null,
    dataConnections: null,

    isReady: false,

    init: function() {
      this.superInit();

      this.peerList = [];
      this.peerData = [];
      this.dataConnections = [];

      this.peer = new Peer({
        key: '344539c4-13d8-4c29-86b1-ca96a66897f7',
        debug: 3,
      });

      const peer = this.peer;
      peer.once('open', id => {
        this.id = id;
        this.refreshPeerList()
          .then(() => this.isReady = true);
      });

      peer.on('connection', dataConnection => {
        this.flare('connection', { dataConnection });
        this.addConnection(dataConnection)
      });
      peer.on('close', () => this.flare('close'));
      peer.on('disconnected', () => this.flare('disconnected'));
      peer.on('error', err => alert(err.message));
    },

    createConnection: function(peerID) {
      if (!this.peer) return;
      const dataConnection = this.peer.connect(peerID);
      if (dataConnection) this.addConnection(dataConnection);
      return dataConnection;
    },

    addConnection(dataConnection) {
      if (!dataConnection) return;

      const id = dataConnection.id;
      dataConnection.once('open', () => {
        console.log(`connection open: ${id}` );
        this.dataConnections[id] = dataConnection;
      });
      dataConnection.on('data', data => {
        this.peerData[id] = data;
        console.log(`from[${id}] data: ${data}`);
      });
      dataConnection.once('close', () => {
        delete this.peerData[id];
      });
      return this;
    },

    send: function(data, toPeerID) {
      if (typeof(toPeerID) == "string") {
        this.sendData(toPeerID, data);
      } else if (toPeerID instanceof Array) {
        toPeerID.forEach(id => this.sendData(id, data));
      } else {
        //接続を確立しているpeer全てに送出
        this.dataConnections.forEach(dc => dc.send(data));
      }
    },

    sendData: function(toPeerID, data) {
      const dc = this.dataConnections[toPeerID];
      if (dc) {
        dc.send(data);
      } else {
        console.log(`Data send failed: ${toPeerID}`);
      }
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
