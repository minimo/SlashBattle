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
