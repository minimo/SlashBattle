phina.define("PlayerDummy", {
  superClass: "phina.display.Sprite",

  init: function(assetName) {
      this.superInit(assetName, 32, 32);
      this.frame = [];
      this.frame["stand"] = [13, 14];
      this.frame["walk"] = [ 3,  4,  5,  4];
      this.frame["walk_stop"] = [ 3,  4,  5,  4, "stop"];
      this.frame["up"] =   [ 9, 10, 11, 10];
      this.frame["up_stop"] =   [10, "stop"];
      this.frame["down"] = [ 0,  1,  2,  1];
      this.frame["clear"] = [24, "stop"];
      this.frame["damage"] = [ 18, 19, 20];
      this.frame["dead"] = [18, 19, 20, 33, 34, 35, "stop"];
      this.index = 0;

      this.nowAnimation = "stand";
      this.animation = true;

      this.bx = 0;
      this.by = 0;
      this.time = 0;

      //影の追加
      var that = this;
      var sc = 16 / 24;
      if (sc < 1) sc += 0.2;
      this.shadowSprite = phina.display.Sprite("shadow", 24, 8)
          .addChildTo(this)
          .setAlpha(0.5)
          .setScale(sc, 1.0)
          .setPosition(0, 16);
  },

  update: function() {
      if (this.animation && this.time % 6 == 0) {
          this.index = (this.index+1) % this.frame[this.nowAnimation].length;
          if (this.frame[this.nowAnimation][this.index] == "stop") this.index--;
          this.frameIndex = this.frame[this.nowAnimation][this.index];
      }

      if (this.x < this.bx) this.scaleX = 1;
      if (this.x > this.bx) this.scaleX = -1;
      this.bx = this.x;
      this.by = this.y;

      this.time++;
  },

  setAnimation: function(animName) {
      if (!this.frame[animName]) return;
      if (animName == this.nowAnimation) return;
      this.nowAnimation = animName;
      this.index = -1;
      return this;
  },
});
