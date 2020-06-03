phina.define("PlayerAttack", {
  superClass: "DisplayElement",

  //攻撃力
  power: 1,

  //当たり判定発生フラグ
  isCollision: true,

  //属性
  isSlash: false,
  isSting: false,
  isBlow: false,
  isArrow: false,
  isFire: false,
  isIce: false,

  init: function(parentScene, options) {
    this.superInit(options);
    this.parentScene = parentScene;

    this.type = options.type || "arrow";
    this.power = options.power || 0;
    this.time = 0;
    this.index = 0;

    //表示スプライト
    switch (this.type) {
      case "arrow":
        this.sprite = Sprite("weapons", 24, 24).addChildTo(this).setFrameIndex(1);
        this.frame = [1];
        this.isArrow = true;
        this.isSting = true;
        this.stunPower = 10;
        break;
      case "fireball":
        this.sprite = Sprite("bullet", 24, 32).addChildTo(this).setFrameIndex(9);
        this.frame = [9, 10, 11, 10];
        this.isFire = true;
        break;
      case "masakari":
        this.sprite = Sprite("weapons", 24, 24).addChildTo(this).setFrameIndex(20);
        this.frame = [20];
        this.isSlash = true;
        this.isBrow = true;
        this.stunPower = 50;
        break;
      case "dagger":
        this.sprite = Sprite("weapons", 24, 24).addChildTo(this).setFrameIndex(20);
        this.sprite.rotation = 135;
        this.frame = [0];
        this.isSting = true;
        this.stunPower = 1;
        break;
      case "flame":
        this.sprite = Sprite("effect", 48, 48)
          .addChildTo(this)
          .setFrameTrimming(0, 192, 192, 96)
          .setScale(0.5);
        this.frame = [0, 1, 2, 3, 4, 5, 6, 7, 8];
        this.isFire = true;
        this.stunPower = 1;
        break;
    }

    if (DEBUG_COLLISION) {
      RectangleShape({width: this.width, height: this.height}).addChildTo(this).setAlpha(0.5);
    }
  },

  update: function(app) {
    if (!this.isCollision || this.type == "explode") return;

    if (this.time % 3 == 0) {
      this.sprite.setFrameIndex(this.frame[this.index]);
      this.index = (this.index + 1) % this.frame.length;
    }
    if (this.type == "flame") return;

    //地形接触判定
    var that = this;
    this.parentScene.collisionLayer.children.forEach(function(e) {
      if (e.type == "ladder" || e.type == "stairs") return;
      if (this.hitTestElement(e)) {
        this.isCollision = false;
        switch (this.type) {
          case "arrow":
            this.stick(e);
            break;
          case "fireball":
            this.explode(e);
            break;
        }
      }
    }.bind(this));

    this.time++;
  },

  //ヒット後処理
  hit: function(target) {
    switch (this.type) {
      case "fireball":
        this.explode(target);
        break;
    }
  },

  //刺さる
  stick: function(e) {
    //効果音
    switch (this.type) {
      case "arrow":
        app.playSE("arrowstick");
        break;
      case "masakari":
        break;
    }

    if (this.scaleX == 1) {
      this.x = e.left;
    } else {
      this.x = e.right;
    }
    this.tweener.clear()
      .wait(30)
      .call(function() {
        this.remove();
      }.bind(this));
  },

  //弾かれる
  snap: function(e) {
    //効果音
    app.playSE("tinkling");
    this.tweener.clear()
      .by({y: -92, rotation: 700}, 15, "easeOutQuad")
      .call(function() {
        this.remove();
      }.bind(this));
  },

  //爆発
  explode: function(e) {
    this.parentScene.spawnEffect(this.x, this.y);
    app.playSE("bomb");
    this.remove();
  },
});
