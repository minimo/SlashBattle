phina.namespace(function() {
  phina.define("BaseCharacter", {
  superClass: "DisplayElement",

    //マップオブジェクトID
    id: -1,

    //加速度
    vx: 0,
    vy: 0,

    //初期座標
    firstX: 0,
    firstY: 0,

    //重力加速度
    gravity: 0.45,

    //横移動減衰率
    friction: 0.5,

    //床移動減衰率
    floorFriction: 0.5,

    //ジャンプ力
    jumpPower: 6,

    //反発係数
    rebound: 0,

    //床上フラグ
    isOnFloor: false,

    //乗っているオブジェクト
    floorObject: null,

    //死亡フラグ
    isDead: false,

    //落下死亡フラグ
    isDrop: false,

    //気絶フラグ
    isStun: false,

    //操作停止時間
    stopTime: 0,

    //無敵フラグ
    isMuteki: false,

    //無敵時間
    mutekiTime: 0,

    //アニメーションフラグ
    isAnimation: true,

    //現在実行中アクション
    nowAnimation: "stand",

    //前フレーム実行アクション
    beforeAnimation: "",

    //アニメーション進行可能フラグ
    isAdvanceAnimation: true,

    //アニメーション変更検知フラグ
    isChangeAnimation: false,

    //アニメーション間隔
    animationInterval: 6,

    //地形無視
    ignoreCollision: false,

    //スクリーン内フラグ
    isOnScreen: true,

    //活動フラグ
    isActive: true,

    //影表示
    isShadow: false,
    shadowY: 0,

    //識別フラグ
    isPlayer: false,
    isEnemy: false,
    isItemBox: false,
    isItem: false,
    isBlock: false,
    isMapAccessory: false,

    //経過フレーム
    time: 0,

    init: function(parentScene, options) {
      this.superInit(options);
      this.parentScene = parentScene;
      this.boundingType = "rect";
      this.tweener.setUpdateType('fps');

      this.options = options || {};
      this.initCollision(options);
      this.setupAnimation();

      this.id = options.id || -1;

      this.on('enterframe', () => this.defaultUpadate());
    },

    //一回目のenterframeで一度だけ呼ばれる
    firstFrame: function() {},

    defaultUpadate: function() {
      //活動フラグ
      if (!this.isActive) return;

      this.x += this.vx;
      if (this.isOnFloor) {
        this.vx *= this.floorFriction;
      } else {
        this.vx *= this.friction;
      }

      if (this.isCatchLadder) {
        this.y += this.vy;
        this.vy = 0;
      } else {
          this.y += this.vy;
          this.vy += this.gravity;
          //落下速度上限
          if (this.vy > 20) this.vy = 20;
      }
      if (Math.abs(this.vx) < 0.01) this.vx = 0;
      if (Math.abs(this.vy) < 0.01) this.vy = 0;

      this.resetCollisionPosition();
      this.checkMapCollision();

      //アニメーション
      if (this.sprite && this.isAnimation && this.isAdvanceAnimation && this.time % this.animationInterval == 0) {
        this.index = (this.index + 1) % this.frame[this.nowAnimation].length;
        //次フレーム番号が特殊指定の場合
        var next = this.frame[this.nowAnimation][this.index];
        if (next == "stop") {
          //停止
          this.index--;
        } else if (next == "remove") {
          //リムーブ
          this.remove();
        } else if (typeof next === "string") {
          //指定アニメーションへ変更
          this.setAnimation(next);
        } else {
          this.sprite.frameIndex = next;
        }
      }

      this.time++;
      this.beforeAnimation = this.nowAnimation;
    },

    setupAnimation: function() {
      this.spcialAnimation = false;
      this.frame = [];
      this.frame["stand"] = [13, 14];
      this.frame["jump"] = [0, "stop"];
      this.frame["walk"] = [0];
      this.frame["up"] =   [0];
      this.frame["down"] = [0];
      this.frame["attack"] = [0, "stop"];
      this.index = 0;
      return this;
    },

    setAnimation: function(animName) {
      if (!this.frame[animName]) return;
      if (animName == this.nowAnimation) return;
      this.nowAnimation = animName;
      this.index = -1;
      this.isChangeAnimation = true;
      return this;
    },

    //当たり判定情報初期化
    initCollision: function(options) {
      //当り判定用（0:上 1:右 2:下 3:左）
      const w = Math.floor(this.width / 4);
      const h = Math.floor(this.height / 4);
      this._collision = [];
      this._collision[0] = DisplayElement({ width: w, height: 2 });
      this._collision[1] = DisplayElement({ width: 2, height: h });
      this._collision[2] = DisplayElement({ width: w, height: 2 });
      this._collision[3] = DisplayElement({ width: 2, height: h });
      this.collisionResult = null;

      //当たり判定チェック位置オフセット
      this.offsetCollisionX = options.offsetCollisionX || 0;
      this.offsetCollisionY = options.offsetCollisionY || 0;

      //当たり判定情報再設定
      this.setupCollision();

      this._collision[0].addChildTo(this.parentScene.debugLayer);
      this._collision[1].addChildTo(this.parentScene.debugLayer);
      this._collision[2].addChildTo(this.parentScene.debugLayer);
      this._collision[3].addChildTo(this.parentScene.debugLayer);

      //当たり判定デバッグ用
      if (DEBUG_COLLISION) {
        this.one('enterframe', e => {
          this._collision[0].alpha = 0.3;
          this._collision[1].alpha = 0.3;
          this._collision[2].alpha = 0.3;
          this._collision[3].alpha = 0.3;
          //ダメージ当たり判定表示
          var c = RectangleShape({ width: this.width, height: this.height }).addChildTo(this);
          c.alpha = 0.3;
        });
        // this.one('removed', e => {
        //   this._collision[0].remove();
        //   this._collision[1].remove();
        //   this._collision[2].remove();
        //   this._collision[3].remove();
        // });
      } else {
        this._collision[0].alpha = 0.0;
        this._collision[1].alpha = 0.0;
        this._collision[2].alpha = 0.0;
        this._collision[3].alpha = 0.0;
    }
      return this;
    },
    //地形当たり判定
    checkMapCollision: function() {
      if (this.ignoreCollision) return this;

      this._collision[0].hit = null;
      this._collision[1].hit = null;
      this._collision[2].hit = null;
      this._collision[3].hit = null;

      this.isOnLadder = false;
      this.isOnStairs = false;

      if (this.isOnScreen && this.shadowSprite) {
        this.shadowY = 99999;
        var p1 = phina.geom.Vector2(this.x, this.y);
        var p2 = phina.geom.Vector2(this.x, this.y + 128);
        this.shadowSprite.visible = false;
      }

      //地形接触判定
      this.parentScene.collisionLayer.children.forEach(e => {
        if (this.isDrop) return;
        if (e.ignore || e == this.throughFloor) return;
        if (e.type == "ladder" || e.type == "stairs") return;

        //上側
        if (this.vy < 0  && e.hitTestElement(this._collision[0])) this._collision[0].hit = e;
        //下側
        if (this.vy >= 0 && e.hitTestElement(this._collision[2])) this._collision[2].hit = e;
        //右側
        if (this.vx > 0  && e.hitTestElement(this._collision[1])) this._collision[1].hit = e;
        //左側
        if (this.vx < 0  && e.hitTestElement(this._collision[3])) this._collision[3].hit = e;

        //影を落とす
        if (this.isOnScreen && this.shadowSprite) {
            //キャラクターの下方向にレイを飛ばして直下の地面座標を取る
            var x = e.x - e.width / 2;
            var y = e.y - e.height / 2;
            var p3 = Vector2(x, y);
            var p4 = Vector2(x + e.width, y);
            if (y < this.shadowY && phina.geom.Collision.testLineLine(p1, p2, p3, p4)) {
              this.shadowSprite.setPosition(this.x, y);
              this.shadowSprite.visible = true;
              this.shadowY = y;
            }
        }
      });

      if (this.shadowSprite && this.isCatchLadder) this.shadowSprite.visible = false;

      //当たり判定結果反映
      this.collisionProcess();

      //はしごのみ判定
      this.parentScene.collisionLayer.children.forEach(e => {
        //梯子判定
        if (e.type == "ladder" || e.type == "stairs") {
          if (this.ladderCollision && e.hitTestElement(this.ladderCollision)) {
            this.isOnLadder = true;
            this.isOnStairs = (e.type == "stairs");
          }
          return;
        }
      });
      return this;
    },

    //当たり判定結果反映処理
    collisionProcess: function() {
      var w = Math.floor(this.width / 2) + 6;
      var h = Math.floor(this.height / 2) + 6;
      this.isOnFloor = false;

      //上側接触
      if (this._collision[0].hit && !this.isCatchLadder) {
        var ret = this._collision[0].hit;
        this.y = ret.y + ret.height * (1 - ret.originY) + h;
        this.vy = 0;
        this.resetCollisionPosition();
        if (ret.collisionScript) {
          ret.collisionScript(this, 0);
        }
      }
      //下側接触
      if (this._collision[2].hit && !this.isCatchLadder) {
        var ret = this._collision[2].hit;
        this.y = ret.y - ret.height * ret.originY - h;
        this.x += ret.vx || 0;
        if (!this.isPlayer && ret.vy > 0) this.y += ret.vy || 0;

        this.isJump = false;
        this.isOnFloor = true;
        this.floorFriction = ret.friction == undefined? 0.5: ret.friction;

        this.throughFloor = null;
        if (this.rebound > 0) {
          this.isJump = true;
          this.vy = -this.vy * this.rebound;
        } else {
          this.vy = 0;
        }
        this.resetCollisionPosition();
        if (ret.collisionScript) {
          ret.collisionScript(this, 2);
        }
      }
      //右側接触
      if (this._collision[1].hit && !this.isCatchLadder) {
        var ret = this._collision[1].hit;
        this.x = ret.x - ret.width * ret.originX - w;
        this.vx = 0;
        this.resetCollisionPosition();
        if (ret.collisionScript) {
          ret.collisionScript(this, 1);
        }
      }
      //左側接触
      if (this._collision[3].hit && !this.isCatchLadder) {
        var ret = this._collision[3].hit;
        this.x = ret.x + ret.width * (1 - ret.originX) + w;
        this.vx = 0;
        this.resetCollisionPosition();
        if (ret.collisionScript) {
          ret.collisionScript(this, 3);
        }
      }
      return this;
    },

    //地形当たり判定（特定地点チェックのみ）衝突したものを配列で返す
    checkMapCollision2: function(x, y, width, height) {
      x = x || this.x;
      y = y || this.y;
      width = width || 1;
      height = height || 1;
      const c = DisplayElement({ width, height }).setPosition(x, y).addChildTo(this.parentScene.debugLayer);
      let ret = null;
      this.parentScene.collisionLayer.children.forEach(function(e) {
        if (e.type == "ladder" || e.type == "stairs") return;
        if (e.hitTestElement(c)) {
          if (ret == null) ret = [];
          ret.push(e);
        }
      });
      c.remove();
      return ret;
    },

    //キャラクタ同士当たり判定（ブロックのみ）
    checkCharacterCollision: function() {
      if (this.ignoreCollision) return;
      if (this.isDrop) return;

      const ret = [];
      this.parentScene.objLayer.children.forEach(e => {
        if (!e.isBlock) return;
        if (e.isDead) return;

        //上側
        if (this.vy < 0 && e.hitTestElement(this._collision[0])) {
          this.y = e.y + e.height * (1 - e.originY) + 16;
          this.vy = 1;
          ret[0] = e;
          this.resetCollisionPosition();
        }
        //下側
        if (this.vy > 0 && e.hitTestElement(this._collision[2])) {
          this.y = e.y - e.height * e.originY - 16;
          this.vx = e.vx;
          this.vy = 0;
          this.isJump = false;
          this.isOnFloor = true;
          this.throughFloor = null;
          ret[2] = e;
          if (this.rebound > 0) {
            this.isJump = true;
            this.vy = -this.vy * this.rebound;
          } else {
            this.vy = 0;
          }
          this.resetCollisionPosition();
        }
        //右側
        if (this.vx > 0 && e.hitTestElement(this._collision[1])) {
            this.x = e.x - e.width * e.originX - 10;
            this.vx = 0;
            ret[1] = e;
            this.resetCollisionPosition();
        }
        //左側
        if (this.vx < 0 && e.hitTestElement(this._collision[3])) {
            this.x = e.x + e.width * (1 - e.originX) + 10;
            this.vx = 0;
            ret[3] = e;
            this.resetCollisionPosition();
        }
      });
      return ret;
    },

    //当たり判定用エレメントの再設定
    setupCollision: function() {
      return this;
    },

    //当たり判定用エレメントの位置再セット
    resetCollisionPosition: function() {
      var w = Math.floor(this.width / 2) + 6 + this.offsetCollisionX;
      var h = Math.floor(this.height / 2)+ 6 + this.offsetCollisionY;
      this._collision[0].setPosition(this.x, this.y - h);
      this._collision[1].setPosition(this.x + w, this.y);
      this._collision[2].setPosition(this.x, this.y + h);
      this._collision[3].setPosition(this.x - w, this.y);
      return this;
    },
  });
});
