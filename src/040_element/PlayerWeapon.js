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
