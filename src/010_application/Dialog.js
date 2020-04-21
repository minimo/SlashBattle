phina.namespace(function() {

  phina.define("Dialog", {
    superClass: "DisplayElement",

    _static: {
      defaultOptions: {
        x:  SCREEN_WIDTH_HALF,
        y:  SCREEN_HEIGHT_HALF,
        width: SCREEN_WIDTH * 0.5,
        height: SCREEN_WIDTH * 0.5,
        isModal: true,
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
      }).addChildTo(this);
      this.tweener.clear().to({ scaleX: 1.0, scaleY: 1.0 }, 200, "easeInOutQuad");
      return this;
    },

  });

});
