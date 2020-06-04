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
      // this.floorData = this.layerToArray("floor");
      // this.event = this.layerToArray("event");
    },

    getCollisionData: function() {
      return this.collision;
    },

    getFloorData: function() {
      return this.floorData;
    },

    layerToArray: function(layerName) {
      const result = [];
      const layerData = this.data.getObjectGroup(layerName);
      layerData.objects.forEach(e => {
        const element = RectangleShape({
          width: e.width,
          height: e.height,
          x: e.x + e.width * 0.5,
          y: e.y + e.height * 0.5,
        });
        element.alpha = DEBUG_COLLISION ? 0.3 : 0;
        element.$extend(e.properties);
        result.push(element);
      });
      return result;
    },

  });

});
