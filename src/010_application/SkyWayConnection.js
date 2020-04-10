phina.namespace(function() {

  phina.define("SkyWayConnection", {

    init: function(peer, peerID) {
      this.peer = peer;
      this.peerID = peerID;

      const dataConnection = peer.connect(peerID);
      dataConnection.once('open', () => {
        console.log(`connection open: ${peerID}`);
      });
      dataConnection.on('data', data => {
        console.log(`from[${peerID}] data: ${data}`);
      });
      dataConnection.once('close', () => {});
    },

  });
});
