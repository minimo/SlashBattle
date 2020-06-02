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
