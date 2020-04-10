/*
 *  main.js
 */

phina.globalize();

const DEBUG_COLLISION = false;

const SCREEN_WIDTH = 1024 / 2;
const SCREEN_HEIGHT = 768 / 2;
const SCREEN_WIDTH_HALF = SCREEN_WIDTH * 0.5;
const SCREEN_HEIGHT_HALF = SCREEN_HEIGHT * 0.5;

const SCREEN_OFFSET_X = 0;
const SCREEN_OFFSET_Y = 0;

const NUM_LAYERS = 4;
const LATER_FOREGROUND = 3;
const LAYER_ACTOR = 2;
const LAYER_BACKGROUND = 1;
const LAYER_MAP = 0;

let phina_app;

window.onload = function() {
  phina_app = Application();
  phina_app.replaceScene(FirstSceneFlow({}));
  phina_app.run();
};

//スクロール禁止
// document.addEventListener('touchmove', function(e) {
//  e.preventDefault();
// }, { passive: false });

//Androidブラウザバックボタン制御
// document.addEventListener("backbutton", function(e){
//   e.preventDefault();
// }, false);
phina.namespace(function() {

  phina.define("Application", {
    superClass: "phina.display.CanvasApp",

    quality: 1.0,
  
    init: function() {
      this.superInit({
        fps: 60,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        fit: true,
      });
  
      //シーンの幅、高さの基本を設定
      phina.display.DisplayScene.defaults.$extend({
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
      });
  
      phina.input.Input.quality = this.quality;
      phina.display.DisplayScene.quality = this.quality;

      //ゲームパッド管理
      this.gamepadManager = phina.input.GamepadManager();
      this.gamepad = this.gamepadManager.get(0);
      this.controller = {};

      this.setupEvents();
      this.setupSound();
      this.setupMouseWheel();

      //シーンを離れる際、ボタン同時押しフラグを解除する
      this.on("changescene", () => Button.actionTarget = null);

      //パッド情報を更新
      this.on('enterframe', function() {
        this.gamepadManager.update();
        this.updateController();
      });
    },
  
    //マウスのホールイベント関連
    setupMouseWheel: function() {
      this.wheelDeltaY = 0;
      this.domElement.addEventListener("mousewheel", function(e) {
        e.stopPropagation();
        e.preventDefault();
        this.wheelDeltaY = e.deltaY;
      }.bind(this), false);
  
      this.on("enterframe", function() {
        this.pointer.wheelDeltaY = this.wheelDeltaY;
        this.wheelDeltaY = 0;
      });
    },

    //アプリケーション全体のイベントフック
    setupEvents: function() {},
  
    setupSound: function() {},

    updateController: function() {
      var before = this.controller;
      before.before = null;

      var gp = this.gamepad;
      var kb = this.keyboard;
      var angle1 = gp.getKeyAngle();
      var angle2 = kb.getKeyAngle();
      this.controller = {
          angle: angle1 !== null? angle1: angle2,

          up: gp.getKey("up") || kb.getKey("up"),
          down: gp.getKey("down") || kb.getKey("down"),
          left: gp.getKey("left") || kb.getKey("left"),
          right: gp.getKey("right") || kb.getKey("right"),

          attack: gp.getKey("A") || kb.getKey("X"),
          jump:   gp.getKey("X") || kb.getKey("Z"),
          menu:   gp.getKey("start") || kb.getKey("escape"),

          a: gp.getKey("A") || kb.getKey("Z"),
          b: gp.getKey("B") || kb.getKey("X"),
          x: gp.getKey("X") || kb.getKey("C"),
          y: gp.getKey("Y") || kb.getKey("V"),

          ok: gp.getKey("A") || kb.getKey("Z") || kb.getKey("space") || kb.getKey("return"),
          cancel: gp.getKey("B") || kb.getKey("X") || kb.getKey("escape"),

          start: gp.getKey("start") || kb.getKey("return"),
          select: gp.getKey("select"),

          pause: gp.getKey("start") || kb.getKey("escape"),

          analog1: gp.getStickDirection(0),
          analog2: gp.getStickDirection(1),

          //前フレーム情報
          before: before,
      };
    },
  });
});
/*
 *  AssetList.js
 */

phina.namespace(function() {

  phina.define("AssetList", {
    _static: {
      loaded: [],
      isLoaded: function(assetType) {
        return AssetList.loaded[assetType]? true: false;
      },
      get: function(assetType) {
        AssetList.loaded[assetType] = true;
        switch (assetType) {
          case "preload":
            return {
              image: {
                "actor4": "assets/textures/actor4.png",
                "shadow": "assets/textures/shadow.png",
                "weapons": "assets/textures/weapons.png",
                "item": "assets/textures/item.png",
              },
              // tmx: {
              //   "map1": "assets/map/map2.tmx",
              // },
              // tsx: {
              //   "tile_a": "assets/map/tile_a.tsx",
              // }
            };
            case "common":
            return {
              image: {
              },
            };

          default:
            throw "invalid assetType: " + options.assetType;
        }
      },
    },
  });

});

//アイテムＩＤ
const ITEM_SHORTSWORD = 0;
const ITEM_LONGSWORD = 1;
const ITEM_AX = 2;
const ITEM_SPEAR = 3;
const ITEM_BOW = 4;
const ITEM_ROD = 5;
const ITEM_BOOK = 6;
const ITEM_SHIELD = 7;
const ITEM_ARMOR = 8;
const ITEM_HAT = 9;
const ITEM_BOOTS = 10;
const ITEM_GROVE = 11;
const ITEM_RING = 12;
const ITEM_SCROLL = 13;
const ITEM_LETTER = 14;
const ITEM_CARD = 15;
const ITEM_KEY = 16;
const ITEM_COIN = 17;
const ITEM_BAG = 18;
const ITEM_ORB = 19;
const ITEM_STONE = 20;
const ITEM_JEWEL = 21;
const ITEM_JEWELBOX = 22;
const ITEM_APPLE = 24;
const ITEM_HARB = 25;
const ITEM_MEAT = 26;
const ITEM_POTION = 27;

/*
 *  MainScene.js
 *  2018/10/26
 */

phina.namespace(function() {

  phina.define("BaseScene", {
    superClass: 'DisplayScene',

    //廃棄エレメント
    disposeElements: null,

    init: function(options) {
      options = (options || {}).$safe({
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        backgroundColor: 'transparent',
      });
      this.superInit(options);

      //シーン離脱時canvasメモリ解放
      this.disposeElements = [];
      this.one('destroy', () => {
        this.disposeElements.forEach(e => {
          if (e.destroyCanvas) {
            e.destroyCanvas();
          } else if (e instanceof Canvas) {
            e.setSize(0, 0);
          }
        });
      });

      this.app = phina_app;

      //別シーンへの移行時にキャンバスを破棄
      this.one('exit', () => {
        this.destroy();
        this.canvas.destroy();
        this.flare('destroy');
        console.log("Exit scene.");
      });
    },

    destroy: function() {},

    fadeIn: function(options) {
      options = (options || {}).$safe({
        color: "white",
        millisecond: 500,
      });
      return new Promise(resolve => {
        const mask = RectangleShape({
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
          fill: options.color,
          strokeWidth: 0,
        }).setPosition(SCREEN_WIDTH * 0.5, SCREEN_HEIGHT * 0.5).addChildTo(this);
        mask.tweener.clear()
          .fadeOut(options.millisecond)
          .call(() => {
            resolve();
            this.app.one('enterframe', () => mask.destroyCanvas());
          });
      });
    },

    fadeOut: function(options) {
      options = (options || {}).$safe({
        color: "white",
        millisecond: 500,
      });
      return new Promise(resolve => {
        const mask = RectangleShape({
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
          fill: options.color,
          strokeWidth: 0,
        }).setPosition(SCREEN_WIDTH * 0.5, SCREEN_HEIGHT * 0.5).addChildTo(this);
        mask.alpha = 0;
        mask.tweener.clear()
          .fadeIn(options.millisecond)
          .call(() => {
            resolve();
            this.app.one('enterframe', () => mask.destroyCanvas());
          });
      });
    },

    //シーン離脱時に破棄するShapeを登録
    registDispose: function(element) {
      this.disposeElements.push(element);
    },
  });

});
/*
 *  FirstSceneFlow.js
 */

phina.namespace(function() {

  phina.define("FirstSceneFlow", {
    superClass: "ManagerScene",

    init: function(options) {
      options = options || {};
      startLabel = options.startLabel || "title";
      this.superInit({
        startLabel: startLabel,
        scenes: [
          {
            label: "title",
            className: "TitleScene",
            nextLabel: "home",
          },
          {
            label: "main",
            className: "MainScene",
          },
        ],
      });
    }
  });

});
phina.namespace(function() {

  phina.define('MainScene', {
    superClass: 'BaseScene',

    init: function(options) {
      this.superInit();
      this.setup();
    },

    setup: function() {
      const back = RectangleShape({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, fill: "black" })
        .setPosition(SCREEN_WIDTH_HALF, SCREEN_HEIGHT_HALF)
        .addChildTo(this);
      this.registDispose(back);

      this.player = Player(this)
        .addChildTo(this)
        .setPosition(500, 100);
    },

    update: function() {
    },

  });

});

/*
 *  TitleScene.js
 */

phina.namespace(function() {

  phina.define('TitleScene', {
    superClass: 'BaseScene',

    _static: {
      isAssetLoaded: false,
    },

    init: function(options) {
      this.superInit();

      this.progress = 0;
      this.isExit = false;

      //ロード済みならアセットロードをしない
      if (TitleScene.isAssetLoaded) {
        this.setup();
      } else {
        //preload asset
        const assets = AssetList.get("preload")
        this.loader = phina.asset.AssetLoader();
        this.loader.on('load', () => {
          this.setup()
          TitleScene.isAssetLoaded = true;
        });
        this.loader.load(assets);
      }
    },

    setup: function() {
      const back = RectangleShape({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, fill: "black" })
        .setPosition(SCREEN_WIDTH_HALF, SCREEN_HEIGHT_HALF)
        .addChildTo(this);
      this.registDispose(back);

      const label = Label({ text: "TitleScene", fill: "white" })
        .setPosition(SCREEN_WIDTH_HALF, SCREEN_HEIGHT_HALF)
        .addChildTo(this);
      this.registDispose(label);

      back.setInteractive(true);
      back.on('pointend', () => this.exit("main"));

      //アセット後処理
      const assets = AssetList.get("preload");
      assets.image.forIn(key => {
        if (phina.asset.AssetManager.get("image", key + "_mask")) return;

        const tex = phina.asset.AssetManager.get("image", key).clone();
        tex.filter( function(pixel, index, x, y, bitmap) {
            const data = bitmap.data;
            data[index + 0] = 0;
            data[index + 1] = 0;
            data[index + 2] = 0;
        });
        phina.asset.AssetManager.set("image", key + "_mask", tex);
      });
    },

    update: function() {
      if (!TitleScene.isAssetLoaded || this.isExit) return;
      var kb = phina_app.keyboard;
      if (kb.getKey("space") || kb.getKey("z")) {
        this.isExit = true;
        this.exit("main");
      }
    },

  });

});

phina.define("BaseCharacter", {
    superClass: "phina.display.DisplayElement",

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
    onScreen: false,

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

        this.y += this.vy;
        this.vy += this.gravity;
        //落下速度上限
        if (this.vy > 20) this.vy = 20;

        if (Math.abs(this.vx) < 0.01) this.vx = 0;
        if (Math.abs(this.vy) < 0.01) this.vy = 0;

        if (this.y > 300) {
            this.isOnFloor = true;
            this.isJump = false;
            this.vy = 0;
        }

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

});

phina.define("Balloon", {
    superClass: "phina.display.Sprite",

    //寿命フレーム
    lifeSpan: 30,

    //アニメーション間隔
    animationInterval: 6,


    init: function(options) {
        this.superInit("balloon", 24, 32);

        this.pattern = options.pattern || "!";
        this.setAnimation(this.pattern);

        this.lifeSpan = options.lifeSpan || 60;
        this.animationInterval = options.animationInterval || 6;
        this.time = 0;

        //特殊パターン
        if (this.pattern == "anger2") {
            this.tweener.setUpdateType('fps').clear().by({y: -16, alpha: -1}, this.animationInterval, "easeInSine");
        }
    },

    update : function() {
        if (this.time % this.animationInterval == 0) this.frameIndex++;

        this.time++;
        if (this.time > this.lifeSpan) this.remove();
    },

    setAnimation: function(pattern) {
        switch (pattern) {
            case "...":
                this.setFrameTrimming(0, 0, 24, 128);
                break;
            case "?":
                this.setFrameTrimming(96, 32, 24, 32);
                break;
            case "!":
                this.setFrameTrimming(72, 64, 72, 32);
                break;
            case "zzz":
                this.setFrameTrimming(0, 0, 24, 32);
                break;
            case "stun":
                this.setFrameTrimming(144, 32, 48, 32);
                break;
            case "light":
                this.setFrameTrimming(144, 64, 48, 32);
                break;
            case "newtype":
                this.setFrameTrimming(144, 96, 72, 32);
                break;
            case "anger":
            case "anger1":
                this.setFrameTrimming(72, 96, 24, 32);
                break;
            case "anger2":
                this.setFrameTrimming(144, 128, 72, 32);
                break;
        }
    },
});

phina.define("Item", {
    superClass: "BaseCharacter",

    //識別フラグ
    isItem: true,

    //アイテム種別
    kind: 0,

    //アイテムレベル
    level: 0,

    //捨てアイテム
    throwAway: false,

    //大まかな種別フラグ
    isWeapon: false,
    isEquip: false,
    isFood: false,
    isItem: false,
    isKey: false,

    //敵ドロップアイテムフラグ
    isEnemyDrop: false,

    //アイテム情報
    status: null,

    //反発係数
    rebound: 0.3,

    //アニメーション進行可能フラグ   
    isAdvanceAnimation: false,

    //影表示フラグ
    isShadow: false,

    init: function(parentScene, options) {
        this.superInit(parentScene, {width: 16, height: 16});

        //アイテムレベル
        this.level = 0;
        this.kind = null;
        if (options.properties) {
            this.level = options.properties.level || 0;
            this.kind = options.properties.kind;
        }
        if (options.kind !== undefined) this.kind = options.kind;

        //アイテム種別
        if (this.kind == null) {
            if (options.name == "food") {
                this.kind = ITEM_APPLE + this.level;
            } else {
                var name = "ITEM_"+options.name.toUpperCase();
                this.kind = eval(name);
            }
        } else if (typeof this.kind === "string") {
            var name = "ITEM_"+this.kind.toUpperCase();
            this.kind = eval(name);
        }

        //アイテムステータス取得
        this.$extend(ItemInfo.get(this.kind));

        //アイテムスプライト
        if (this.isWeapon) {
            //武器の場合
            var index = this.kind * 10 + Math.min(this.level, this.maxIndex);
            this.sprite = phina.display.Sprite("weapons", 24, 24).addChildTo(this).setFrameIndex(index);

            if (this.level > 0) {
                //強化レベル表示
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
                phina.display.Label({text: "+"+this.level}.$safe(labelParam)).setPosition(6, 6).addChildTo(this);
            }
        } else {
            this.sprite = phina.display.Sprite("item", 24, 24).addChildTo(this).setFrameIndex(this.kind);
        }

        //寿命
        this.lifeSpan = 150;

        //アクティブフラグ
        if (this.options.active === undefined || this.options.active == true) {
            this.isActive = true;
        } else {
            this.isActive = false;
        }

        this.on('enterframe', e => {
            //プレイヤーとの当たり判定
            var pl = this.parentScene.player;
            if (this.hitTestElement(pl)) {
                if (this.time > 10 && !this.throwAway) {
                    pl.getItem(this);
                    this.remove();
                }
            } else if (this.time > 30 && this.throwAway) this.throwAway = false;

            if (this.isEnemyDrop) {
                if (this.lifeSpan == 0) this.remove();
                if (this.lifeSpan < 30) {
                    if (this.time % 2 == 0) this.visible = !this.visible;
                } else if (this.lifeSpan < 60){
                    if (this.time % 5 == 0) this.visible = !this.visible;
                } else if (this.lifeSpan < 90) {
                    if (this.time % 10 == 0) this.visible = !this.visible;
                }
                this.lifeSpan--;
            }
        });
    },
});

phina.define("ItemInfo", {
  _static: {
      get: function(kind) {
          switch (kind) {
              case "shortsword":
              case ITEM_SHORTSWORD:
                  return {
                      name: "SHORT SWORD",
                      type: "sword",
                      isWeapon: true,
                      isSlash: true,
                      power: 10,
                      stunPower: 1,
                      maxIndex: 0,
                      collision: {
                          width: 14,
                          height: 30
                      }
                  };
              case "longsword":
              case ITEM_LONGSWORD:
                  return {
                      name: "LONG SWORD",
                      type: "sword",
                      isWeapon: true,
                      isSlash: true,
                      power: 15,
                      stunPower: 5,
                      maxIndex: 7,
                      collision: {
                          width: 24,
                          height: 25
                      }
                  };
              case "ax":
              case ITEM_AX:
                  return {
                      name: "AX",
                      type: "ax",
                      isWeapon: true,
                      isSlash: true,
                      isBrow: true,
                      power: 20,
                      stunPower: 20,
                      maxIndex: 4,
                      collision: {
                          width: 14,
                          height: 26
                      }
                  };
              case "spear":
              case ITEM_SPEAR:
                  return {
                      name: "SPEAR",
                      type: "spear",
                      isWeapon: true,
                      isSting: true,
                      power: 10,
                      stunPower: 1,
                      maxIndex: 4,
                      collision: {
                          width: 39,
                          height: 10
                      }
                  };
              case "bow":
              case ITEM_BOW:
                  return {
                      name: "BOW",
                      type: "bow",
                      isWeapon: true,
                      isBrow: true,
                      power: 5,
                      stunPower: 5,
                      maxIndex: 0,
                      collision: {
                          width: 20,
                          height: 10
                      }
                  };
              case "rod":
              case ITEM_ROD:
                  return {
                      name: "MAGIC ROD",
                      type: "rod",
                      isWeapon: true,
                      isBrow: true,
                      isFire: true,
                      power: 5,
                      stunPower: 10,
                      maxIndex: 7,
                      collision: {
                          width: 20,
                          height: 10
                      }
                  };
              case "book":
              case ITEM_BOOK:
                  return {
                      name: "BOOK",
                      type: "book",
                      isWeapon: true,
                      isBrow: true,
                      isHoly: true,
                      power: 10,
                      stunPower: 40,
                      maxIndex: 0,
                      collision: {
                          width: 20,
                          height: 20
                      }
                  };
              case "shield":
              case ITEM_SHIELD:
                  return {
                      name: "SHIELD",
                      type: "equip",
                      isEquip: true,
                      power: 20,
                      point: 1000,
                  };
              case "armor":
              case ITEM_ARMOR:
                  return {
                      name: "ARMOR",
                      type: "equip",
                      isEquip: true,
                      power: 30,
                      point: 5000,
                  };
              case "hat":
              case ITEM_HAT:
                  return {
                      name: "HAT",
                      type: "equip",
                      isEquip: true,
                      power: 10,
                      point: 300,
                  };
              case "boots":
              case ITEM_BOOTS:
                  return {
                      name: "BOOTS",
                      type: "equip",
                      isEquip: true,
                      power: 10,
                      point: 500,
                  };
              case "grove":
              case ITEM_GROVE:
                  return {
                      name: "GROVE",
                      type: "equip",
                      isEquip: true,
                      power: 10,
                      point: 500,
                  };
              case "ring":
              case ITEM_RING:
                  return {
                      name: "RING",
                      type: "equip",
                      isEquip: true,
                      power: 20,
                      point: 3000,
                  };
              case "scroll":
              case ITEM_SCROLL:
                  return {
                      name: "SCROLL",
                      type: "item",
                      isItem: true,
                      point: 1000,
                  };
              case "letter":
              case ITEM_LETTER:
                  return {
                      name: "LETTER",
                      type: "item",
                      isItem: true,
                      point: 100,
                  };
              case "card":
              case ITEM_CARD:
                  return {
                      name: "CARD",
                      type: "item",
                      isItem: true,
                      point: 1000,
                  };
              case "key":
              case ITEM_KEY:
                  return {
                      name: "KEY",
                      type: "key",
                      isKey: true,
                      point: 2000,
                  };
              case "coin":
              case ITEM_COIN:
                  return {
                      name: "COIN",
                      type: "item",
                      isItem: true,
                      point: 500,
                  };
              case "bag":
              case ITEM_BAG:
                  return {
                      name: "BAG",
                      type: "item",
                      isItem: true,
                      point: 1000,
                  };
              case "orb":
              case ITEM_ORB:
                  return {
                      name: "ORB",
                      type: "item",
                      isItem: true,
                      point: 5000,
                  };
              case "stone":
              case ITEM_STONE:
                  return {
                      name: "STONE",
                      type: "item",
                      isItem: true,
                      point: 2000,
                  };
              case "jewel":
              case ITEM_JEWEL:
                  return {
                      name: "JEWEL",
                      type: "item",
                      isItem: true,
                      point: 5000,
                  };
              case "jewelbox":
              case ITEM_JEWELBOX:
                  return {
                      name: "JEWELBOX",
                      type: "item",
                      isItem: true,
                      point: 10000,
                  };
              case "apple":
              case ITEM_APPLE:
                  return {
                      name: "APPLE",
                      type: "food",
                      isFood: true,
                      power: 20,
                  };
              case "harb":
              case ITEM_HARB:
                  return {
                      name: "HARB",
                      type: "food",
                      isFood: true,
                      power: 40,
                  };
              case "meat":
              case ITEM_MEAT:
                  return {
                      name: "MEAT",
                      type: "food",
                      isFood: true,
                      power: 60,
                  };
              case "potion":
              case ITEM_POTION:
                  return {
                      name: "POTION",
                      type: "food",
                      isFood: true,
                      power: 100,
                  };
              default:
                  return {};
          }
      },
  },
});


phina.define("Player", {
    superClass: "BaseCharacter",

    //識別フラグ
    isPlayer: true,

    //リモート側プレイヤーフラグ
    isRemotePlayer: false,

    //最大ヒットポイント
    hpMax: 100,

    //ヒットポイント
    hp: 100,

    //攻撃力
    power: 10,

    //気絶確率
    stunPower: 1,

    //防御力
    defense: 10,

    //移動速度
    speed: 3,

    //登坂速度
    speedAscend: 4,

    //ジャンプ力
    jumpPower: 8,

    //多段ジャンプ可能回数
    numJump: 0,
    numJumpMax: 2,

    //操作可能フラグ
    isControl: true,

    //攻撃中フラグ
    isAttack: false,

    //前フレームの情報
    before: {
        //操作系
        up: false,
        down: false,
        attack: false,
        jump: false,
        change: false,
        isStun: false,
        isOnFloor: false,
        x: 0,
        y: 0,
    },

    init: function(parentScene) {
        this.superInit(parentScene, {width: 16, height: 20});

        //スプライト背後
        this.back = phina.display.DisplayElement().addChildTo(this).setScale(-1, 1);

        //表示用スプライト
        this.sprite = phina.display.Sprite("actor4", 32, 32).addChildTo(this).setFrameIndex(0);
        this.sprite.scaleX = -1;

        //武器用スプライト
        this.weapon = phina.display.Sprite("weapons", 24, 24)
            .addChildTo(this.back)
            .setFrameIndex(0)
            .setOrigin(1, 1)
            .setPosition(3, 3);
        this.weapon.alpha = 0;
        this.weapon.tweener.setUpdateType('fps');
        this.weapon.type = "sword";

        //攻撃判定用
        this.attackCollision = phina.display.RectangleShape({width: 14, height: 26});

        //当たり判定デバッグ用
        if (DEBUG_COLLISION) {
            this.one('enterframe', e => {
                this.attackCollision.addChildTo(this.parentScene.playerLayer);
                this.attackCollision.alpha = 0.3;
            });
            this.on('removed', e => {
                this.attackCollision.remove();
            });
        }

        //初期アニメーション設定
        this.setAnimation("walk");
        this.beforeAnimation = "";

        //死亡時コールバック
        this.on('dead', () => this.parentScene.flare('gameover'));

        //最後に床上にいた場所を保存
        this.lastOnFloorX = 0;
        this.lastOnFloorY = 0;

        this.reset();
    },

    update: function(app) {
        if (this.parentScene.pauseScene) return;

        //プレイヤー操作
        let ct = app.controller;

        if (!this.isControl) ct = {};
        if (this.stopTime == 0) {
            //左移動
            if (ct.left && !ct.down) {
                if (!this.isJump && !this.isAttack && !this.isCatchLadder) this.setAnimation("walk");
                this.scaleX = -1;
                this.vx = -this.speed;
            }
            //右移動
            if (ct.right && !ct.down) {
                if (!this.isJump && !this.isAttack && !this.isCatchLadder) this.setAnimation("walk");
                this.scaleX = 1;
                this.vx = this.speed;
            }

            //ジャンプボタンのみ
            if (ct.jump && !ct.up) {
                //ジャンプ二段目以降
                if (this.isJump && this.numJump < this.numJumpMax && this.vy > -5) {
                    this.vy = -this.jumpPower;
                    this.numJump++;
                }
                //ジャンプ
                if (!this.isJump && this.isOnFloor) {
                    this.setAnimation("jump");
                    this.isJump = true;
                    this.vy = -this.jumpPower;
                    this.numJump = 1;
                }
            }
            //上キー押下
            if (ct.up) {
                //ジャンプ二段目以降
                if (this.isJump && this.numJump < this.numJumpMax && this.vy > -(this.jumpPower / 2)) {
                    this.vy = -this.jumpPower;
                    this.numJump++;
                }
                //ジャンプ
                if (!this.isJump && this.isOnFloor && !this.isOnLadder) {
                    this.setAnimation("jump");
                    this.isJump = true;
                    this.vy = -this.jumpPower;
                    this.numJump = 1;
                }
            }
        }

        //攻撃
        if (!this.isAttack) {
            if (this.isOnFloor) {
                if (this.nowAnimation != "damage" && !this.isDefense) this.setAnimation("walk");
            } else if (this.isCatchLadder) {
                if (ct.up) {
                    this.setAnimation("up");
                } else if (ct.down) {
                    if (this.isOnStairs) {
                        this.setAnimation("down");
                    } else {
                        this.setAnimation("up");
                    }
                }
            } else {
                if (!this.isStun && !this.isDead) this.setAnimation("jump");
            }
            if (ct.attack && !this.before.attack && this.stopTime == 0 && !(this.isCatchLadder && this.isOnLadder)) {
                this.isCatchLadder = false;
                this.setAnimation("attack");
                this.weaponAttack();
            }
        }

        //死亡状態
        if (this.isDead) {
            this.setAnimation("dead");
            this.isCatchLadder = false;
        }

        //アニメーション変更を検知
        if (this.nowAnimation != this.beforeAnimation) {
            this.time = 0;
            this.isAdvanceAnimation = true;
            this.animationInterval = 12;
            if (this.nowAnimation == "attack") this.animationInterval = 4;
            if (this.nowAnimation == "defense") this.animationInterval = 2;
        } else {
            //歩行アニメーションの場合は移動している時のみ進める
            if (this.nowAnimation == "walk" && !ct.left && !ct.right) {
                this.isAdvanceAnimation = false;
            } else {
                this.isAdvanceAnimation = true;
            }
            if (this.nowAnimation == "up" || this.nowAnimation == "down") {
                if (ct.up || ct.down || ct.left || ct.right) {
                    this.isAdvanceAnimation = true;
                } else {
                    this.isAdvanceAnimation = false;
                }
            }
        }

        //攻撃判定追従
        this.attackCollision.x = this.x + this.scaleX * 12;
        this.attackCollision.y = this.y;

        //コントローラ他情報保存
        this.before.up = ct.up;
        this.before.down = ct.down;
        this.before.attack = ct.attack;
        this.before.jump = ct.up || ct.jump;
        this.before.change = ct.change;
        this.before.isStun = this.isStun;
        this.before.inOnFloor = this.isOnFloor;
        this.before.x = this.x;
        this.before.y = this.y;
    },

    //プレイヤー情報リセット
    reset: function() {
        //移動情報
        this.vx = 0;
        this.vy = 0;

        //ステータス
        this.hp = this.hpMax;

        //各種フラグ
        this.isJump = false;
        this.isDead = false;
        this.isCatchLadder = false;
        this.isDrop = false;
        this.isOnFloor = false;
        this.isAdvanceAnimation = true;
        this.ignoreCollision = false;

        //経過時間系
        this.mutekiTime = 0;
        this.stopTime = 0;
        this.downFrame = 0;
        this.time = 0;

        //アニメーション
        this.setAnimation("walk");
        this.beforeAnimation = "";
        this.animationInterval = 12;

        //所持装備
        this.equip = {
            using: 0,         //現在使用中（weaponsのindex）
            weapons: [0],     //所持リスト（最大３）
            level: [0],       //武器レベル
            switchOk: true,   //変更可能フラグ
        };

        //武器セット
        this.setWeapon(this.equip.weapons[this.equip.using]);

        //所持アイテム
        this.items = [];

        //所持クリア条件キー
        this.keys = [];

        //操作可能フラグ
        this.isControl = true;

        //多段ジャンプ最大回数
        this.numJumpMax = 0;

        //ダミースプライト除去
        if (this.dummy) {
            this.dummy.remove();
            this.dummy = null;
        }

        return this;
    },

    //武器変更
    setWeapon: function(kind, level) {
        kind = kind || 0;
        level = level || 0;

        //属性初期化
        this.attackCollision.$extend({
            isSlash: false,
            isSting: false,
            isBlow: false,
            isArrow: false,
            isFire: false,
            isIce: false,
            stunPower: 1,
        });

        //アイテム情報取得
        var spec = ItemInfo.get(kind);
        this.attackCollision.$extend(spec);
        this.attackCollision.power += level * (spec.levelBonus || 2);

        switch (kind) {
            case 0:
                //ショートソード
                level = 0;
                this.frame["attack"] = [ 41, 42, 43, 44, "stop"];
                this.weapon.setPosition(-3, 3);
                break;
            case 1:
                //ロングソード
                this.frame["attack"] = [ 41, 42, 43, 44, "stop"];
                this.weapon.setPosition(-3, 3);
                break;
            case 2:
                //斧
                this.frame["attack"] = [ 44, 44, 44, 43, 43, 43, 42, 42, 42, 41, 41, 41, "stop"];
                this.weapon.setPosition(-3, 3);
                break;
            case 3:
                //槍
                this.frame["attack"] = [ 41, 42, 43, 44, "stop"];
                this.weapon.setPosition(0, 0);
                break;
            case 4:
                //弓
                level = 0;
                this.frame["attack"] = [ 41, 42, 43, 44, "stop"];
                this.weapon.setPosition(0, 0);
                break;
            case 5:
                //魔法の杖
                this.frame["attack"] = [ 41, 42, 43, 44, "stop"];
                this.weapon.setPosition(0, 0);
                break;
            case 6:
                //魔導書
                this.frame["attack"] = [ 44, 44, 44, 43, 43, 43, 42, 42, 42, 41, 41, 41, "stop"];
                this.weapon.setPosition(-3, 3);
                break;
        }

        //武器画像設定
        var index = kind * 10 + Math.min(level, spec.maxIndex);
        this.weapon.setFrameIndex(index);

        return this;
    },

    //装備武器により攻撃モーションを変える
    weaponAttack: function() {
        var kind = this.equip.weapons[this.equip.using];
        var level = this.equip.level[this.equip.using];
        this.isAttack = true;
        var that = this;
        switch (kind) {
            case 0:
                //ショートソード
                this.weapon.tweener.clear()
                    .set({rotation: 200, alpha: 1.0})
                    .to({rotation: 360}, 10)
                    .fadeOut(1)
                    .call(function() {
                        that.isAttack = false;
                    });
                break;
            case 1:
                //ロングソード
                this.weapon.tweener.clear()
                    .set({rotation: 200, alpha: 1.0})
                    .to({rotation: 360}, 12)
                    .fadeOut(1)
                    .call(function() {
                        that.isAttack = false;
                    });
                break;
            case 2:
                //斧
                this.weapon.tweener.clear()
                    .set({rotation: 400, alpha: 1.0})
                    .to({rotation: 270}, 16)
                    .fadeOut(1)
                    .call(function() {
                        that.isAttack = false;
                    });
                break;
            case 3:
                //槍
                this.weapon.tweener.clear()
                    .set({rotation: -45, alpha: 1.0})
                    .by({x: -10}, 4)
                    .by({x: 10}, 4)
                    .fadeOut(1)
                    .call(function() {
                        that.isAttack = false;
                    });
                break;
            case 4:
                //弓
                this.weapon.tweener.clear()
                    .set({rotation: -45, alpha: 1.0})
                    .by({x: 7}, 6)
                    .by({x: -7}, 6)
                    .fadeOut(1)
                    .call(function() {
                        that.isAttack = false;
                    });
                    var arrowPower = 5 + level * 2;
                    var arrow = PlayerAttack(this.parentScene, {width: 15, height: 10, power: arrowPower, type: "arrow"})
                        .addChildTo(this.parentScene.playerLayer)
                        .setScale(this.scaleX, 1)
                        .setPosition(this.x, this.y);
                    arrow.tweener.setUpdateType('fps').clear()
                        .by({x: (150 + level * 5) * this.scaleX}, 7)
                        .call(function() {
                            this.remove();
                        }.bind(arrow));
                break;
            case 5:
                //魔法の杖
                this.weapon.tweener.clear()
                    .set({rotation: 200, alpha: 1.0})
                    .to({rotation: 360}, 16)
                    .fadeOut(1)
                    .call(function() {
                        that.isAttack = false;
                    });
                var magicPower = 15 + level * 2;
                for (var i = 0; i < 6; i++) {
                    var magic = PlayerAttack(this.parentScene, {width: 15, height: 10, index: 30, power: magicPower, type: "flame"})
                        .addChildTo(this.parentScene.playerLayer)
                        .setScale(this.scaleX, 1);
                    magic.rad = (90 - i * 30).toRadian();
                    magic.isCollision = false;
                    magic.visible = false;
                    magic.tweener.setUpdateType('fps').clear()
                        .wait(i)
                        .call(function() {
                            this.isCollision = true;
                            this.visible = true;
                            var mx = Math.cos(this.rad) * that.scaleX;
                            var my = Math.sin(this.rad);
                            this.setPosition(that.x + 32 * mx, that.y + 32 * my);
                        }.bind(magic))
                        .wait(8)
                        .call(function() {
                            this.remove();
                        }.bind(magic));
                }
                break;
            case 6:
                //魔導書
                this.weapon.tweener.clear()
                    .set({rotation: 400, alpha: 1.0})
                    .to({rotation: 270}, 16)
                    .fadeOut(1)
                    .call(function() {
                        that.isAttack = false;
                    });
                break;
        }
        return this;
    },

    setupAnimation: function() {
        this.spcialAnimation = false;
        this.frame = [];
        this.frame["stand"] = [13, 14];
        this.frame["jump"] = [36, "stop"];
        this.frame["walk"] = [ 3,  4,  5,  4];
        this.frame["up"] =   [ 9, 10, 11, 10];
        this.frame["down"] = [ 0,  1,  2,  1];
        this.frame["attack"] = [ 41, 42, 43, 44, "stop"];
        this.frame["defense"] = [ 41, 42, 43, 44, "stop"];
        this.frame["damage"] = [ 18, 19, 20];
        this.frame["drop"] = [18, 19, 20];
        this.frame["dead"] = [18, 19, 20, 33, 34, 35, "stop"];
        this.frame["clear"] = [24, 25, 26];
        this.frame["stun"] = [ 18, 19, 20];
        this.index = 0;
        return this;
    },

    //当たり判定用エレメントの位置再セット
    resetCollisionPosition: function() {
        var w = Math.floor(this.width/2)+6;
        var h = Math.floor(this.height/2)+6;
        this._collision[0].setPosition(this.x, this.y - h);
        this._collision[1].setPosition(this.x + w, this.y - 5);
        this._collision[2].setPosition(this.x, this.y + h);
        this._collision[3].setPosition(this.x - w, this.y - 5);
        this.ladderCollision.setPosition(this.x, this.y);
        return this;
    },
});

phina.define("PlayerAttack", {
  superClass: "phina.display.DisplayElement",

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
              this.sprite = phina.display.Sprite("weapons", 24, 24).addChildTo(this).setFrameIndex(1);
              this.frame = [1];
              this.isArrow = true;
              this.isSting = true;
              this.stunPower = 10;
              break;
          case "fireball":
              this.sprite = phina.display.Sprite("bullet", 24, 32).addChildTo(this).setFrameIndex(9);
              this.frame = [9, 10, 11, 10];
              this.isFire = true;
              break;
          case "masakari":
              this.sprite = phina.display.Sprite("weapons", 24, 24).addChildTo(this).setFrameIndex(20);
              this.frame = [20];
              this.isSlash = true;
              this.isBrow = true;
              this.stunPower = 50;
              break;
          case "dagger":
              this.sprite = phina.display.Sprite("weapons", 24, 24).addChildTo(this).setFrameIndex(20);
              this.sprite.rotation = 135;
              this.frame = [0];
              this.isSting = true;
              this.stunPower = 1;
              break;
          case "flame":
              this.sprite = phina.display.Sprite("effect", 48, 48)
                  .addChildTo(this)
                  .setFrameTrimming(0, 192, 192, 96)
                  .setScale(0.5);
              this.frame = [0, 1, 2, 3, 4, 5, 6, 7, 8];
              this.isFire = true;
              this.stunPower = 1;
              break;
      }

      if (DEBUG_COLLISION) {
          phina.display.RectangleShape({width: this.width, height: this.height}).addChildTo(this).setAlpha(0.5);
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

phina.define("PlayerWeapon", {
  superClass: "phina.display.DisplayElement",

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
      (3).times(function(i) {
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
      }.bind(this));
  },

  clear: function() {
  },
});

phina.define("Button", {
  superClass: "Accessory",

  lognpressTime: 500,
  doLongpress: false,

  //長押しで連打モード
  longpressBarrage: false,

  init: function() {
    this.superInit();

    this.on("attached", () => {
      this.target.interactive = true;
      this.target.clickSound = Button.defaults.clickSound;

      //ボタン押し時用
      this.target.scaleTweener = Tweener().attachTo(this.target);

      //長押し用
      this.target.twLongpress = Tweener().attachTo(this.target);

      //長押し中特殊対応用
      this.target.twLongpressing = Tweener().attachTo(this.target);

      this.target.on("pointstart", (e) => {

        //イベント貫通にしておく
        e.pass = true;

        //ボタンの同時押しを制限
        if (Button.actionTarget !== null) return;

        //リストビューの子供だった場合はviewportとのあたり判定をする
        const listView = Button.findListView(e.target);
        if (listView && !listView.viewport.hitTest(e.pointer.x, e.pointer.y)) return;

        if (listView) {
          //ポインタが移動した場合は長押しキャンセル（listView内版）
          listView.inner.$watch('y', (v1, v2) => {
            if (this.target !== Button.actionTarget) return;
            if (Math.abs(v1 - v2) < 10) return;

            Button.actionTarget = null;
            this.target.twLongpress.clear();
            this.target.scaleTweener.clear().to({
              scaleX: 1.0 * this.sx,
              scaleY: 1.0 * this.sy
            }, 50);
          });
        }

        //ボタンの処理を実行しても問題ない場合のみ貫通を停止する
        e.pass = false;
        Button.actionTarget = this.target;

        //反転しているボタン用に保持する
        this.sx = (this.target.scaleX > 0) ? 1 : -1;
        this.sy = (this.target.scaleY > 0) ? 1 : -1;

        this.target.scaleTweener.clear()
          .to({
            scaleX: 0.95 * this.sx,
            scaleY: 0.95 * this.sy
          }, 50);

        this.doLongpress = false;
        this.target.twLongpress.clear()
          .wait(this.lognpressTime)
          .call(() => {
            if (!this.longpressBarrage) {
              Button.actionTarget = null;
              this.target.scaleTweener.clear()
                .to({
                  scaleX: 1.0 * this.sx,
                  scaleY: 1.0 * this.sy
                }, 50)
              this.target.flare("longpress")
            } else {
              this.target.flare("clickSound");
              this.target.twLongpressing.clear()
                .wait(5)
                .call(() => this.target.flare("clicked", {
                  longpress: true
                }))
                .call(() => this.target.flare("longpressing"))
                .setLoop(true);
            }
          });
      });

      this.target.on("pointend", (e) => {
        //イベント貫通にしておく
        e.pass = true;

        //
        this.target.twLongpress.clear();
        this.target.twLongpressing.clear();

        //ターゲットがnullかpointstartで保持したターゲットと違う場合はスルーする
        if (Button.actionTarget === null) return;
        if (Button.actionTarget !== this.target) return;

        //ボタンの処理を実行しても問題ない場合のみ貫通を停止する
        e.pass = false;

        //押した位置からある程度移動している場合はクリックイベントを発生させない
        const isMove = e.pointer.startPosition.sub(e.pointer.position).length() > 50;
        const hitTest = this.target.hitTest(e.pointer.x, e.pointer.y);
        if (hitTest && !isMove) this.target.flare("clickSound");

        this.target.scaleTweener.clear()
          .to({
            scaleX: 1.0 * this.sx,
            scaleY: 1.0 * this.sy
          }, 50)
          .call(() => {
            Button.actionTarget = null;
            if (!hitTest || isMove || this.doLongpress) return;
            this.target.flare("clicked", {
              pointer: e.pointer
            });
          });
      });

      //アニメーションの最中に削除された場合に備えてremovedイベント時にフラグを元に戻しておく
      this.target.one("removed", () => {
        if (Button.actionTarget === this.target) {
          Button.actionTarget = null;
        }
      });

      this.target.on("clickSound", () => {
        if (!this.target.clickSound || this.target.clickSound == "") return;
        phina.asset.SoundManager.play(this.target.clickSound);
      });

    });
  },

  //長押しの強制キャンセル
  longpressCancel: function() {
    this.target.twLongpress.clear();
    this.target.twLongpressing.clear();
  },

  _static: {
    //ボタン同時押しを制御するためにstatusはstaticにする
    status: 0,
    actionTarget: null,
    //基本設定
    defaults: {
      clickSound: "common/sounds/se/button",
    },

    //親をたどってListViewを探す
    findListView: function(element, p) {
      //リストビューを持っている場合
      if (element.ListView != null) return element.ListView;
      //親がなければ終了
      if (element.parent == null) return null;
      //親をたどる
      return this.findListView(element.parent);
    }

  }

});

/**
 * 親スプライトのテクスチャを切り抜いて自分のテクスチャとするスプライト
 * 親スプライトの切り抜かれた部分は、切り抜き範囲の左上のピクセルの色で塗りつぶされる
 * 
 * 親要素の拡縮・回転は考慮しない
 */
phina.define("ClipSprite", {
  superClass: "Accessory",

  init: function() {
    this.superInit();
    this.on("attached", () => {
      this.target.one("added", () => {
        this.setup();
      });
    });
  },

  setup: function() {
    const target = this.target;
    const parent = target.parent;
    if (parent instanceof phina.display.Sprite) {
      const x = parent.width * parent.origin.x + target.x - target.width * target.origin.x;
      const y = parent.height * parent.origin.y + target.y - target.height * target.origin.y;
      const w = target.width;
      const h = target.height;

      const parentTexture = parent.image;
      const canvas = phina.graphics.Canvas().setSize(w, h);
      canvas.context.drawImage(parentTexture.domElement, x, y, w, h, 0, 0, w, h);
      if (parentTexture instanceof phina.graphics.Canvas) {
        // クローンしてそっちを使う
        const parentTextureClone = phina.graphics.Canvas().setSize(parentTexture.width, parentTexture.height);
        parentTextureClone.context.drawImage(parentTexture.domElement, 0, 0);
        parent.image = parentTextureClone;

        const data = parentTextureClone.context.getImageData(x, y, 1, 1).data;
        parentTextureClone.context.clearRect(x, y, w, h);
        if (data[3] > 0) {
          parentTextureClone.context.globalAlpha = 1;
          parentTextureClone.context.fillStyle = `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`;
          parentTextureClone.context.fillRect(x - 1, y - 1, w + 2, h + 2);
        }
      }

      const sprite = phina.display.Sprite(canvas);
      sprite.setOrigin(target.origin.x, target.origin.y);
      target.addChildAt(sprite, 0);
    }
  },
});

phina.define("Gauge", {
  superClass: "RectangleClip",

  _min: 0,
  _max: 1.0,
  _value: 1.0, //min ~ max

  direction: "horizontal", // horizontal or vertical

  init: function() {
    this.superInit();
    this.on("attached", () => {
      this._width = this.width;
      this._height = this.width;

      this.target.accessor("Gauge.min", {
        "get": () => this.min,
        "set": (v) => this.min = v,
      });

      this.target.accessor("Gauge.max", {
        "get": () => this.max,
        "set": (v) => this.max = v,
      });

      this.target.accessor("Gauge.value", {
        "get": () => this.value,
        "set": (v) => this.value = v,
      });

      this.target.accessor("Gauge.progress", {
        "get": () => this.progress,
        "set": (v) => this.progress = v,
      });
    });
  },

  _refresh: function() {
    if (this.direction !== "vertical") {
      this.width = this.target.width * this.progress;
      this.height = this.target.height;
    } else {
      this.width = this.target.width;
      this.height = this.target.height * this.progress;
    }
  },

  _accessor: {
    progress: {
      get: function() {
        const p = (this.value - this.min) / (this.max - this.min);
        return (isNaN(p)) ? 0.0 : p;
      },
      set: function(v) {
        this.value = this.max * v;
      }
    },

    max: {
      get: function() {
        return this._max;
      },
      set: function(v) {
        this._max = v;
        this._refresh();
      }
    },

    min: {
      get: function() {
        return this._min;
      },
      set: function(v) {
        this._min = v;
        this._refresh();
      }
    },

    value: {
      get: function() {
        return this._value;
      },
      set: function(v) {
        this._value = v;
        this._refresh();
      }
    },
  }

});

phina.define("Grayscale", {
  superClass: "Accessory",

  grayTextureName: null,

  init: function(options) {
    this.superInit();
    this.on("attached", () => {
      this.grayTextureName = options.grayTextureName;
      this.normal = this.target.image;
    });
  },

  toGrayscale: function() {
    this.target.image = this.grayTextureName;
  },

  toNormal: function() {
    this.target.image = this.normal;
  },

});

phina.namespace(function() {
  //マウス追従
  phina.define("MouseChaser", {
    superClass: "Accessory",

    init: function() {
      this.superInit();
    },

    onattached: function() {
      let px = 0;
      let py = 0;
      console.log("#MouseChaser", "onattached");
      this.tweener = Tweener().attachTo(this.target);
      this.target.on("enterframe", (e) => {
        const p = e.app.pointer;
        if (py == p.x && py == p.y) return;
        px = p.x;
        py = p.y;
        const x = p.x - SCREEN_WIDTH_HALF;
        const y = p.y - SCREEN_HEIGHT_HALF;
        this.tweener.clear().to({ x, y }, 2000, "easeOutQuad")
      });

    },

    ondetached: function() {
      console.log("#MouseChaser", "ondetached");
      this.tweener.remove();
    }

  });
});

phina.define("MultiRectangleClip", {
  superClass: "Accessory",

  x: 0,
  y: 0,
  width: 0,
  height: 0,

  _enable: true,

  init: function() {
    this.superInit();
    this._init();
  },

  _init: function() {
    this.clipRect = [];

    this.on("attached", () => {
      this.x = 0;
      this.y = 0;
      this.width = this.target.width;
      this.height = this.target.height;

      this.target.clip = (c) => this._clip(c);
    });
  },

  addClipRect: function(rect) {
    const r = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
    this.clipRect.push(r);
    return this;
  },

  clearClipRect: function() {
    this.clipRect = [];
  },

  _clip: function(canvas) {
    canvas.beginPath();
    this.clipRect.forEach(rect => {
      canvas.rect(rect.x, rect.y, rect.width, rect.height)
    });
    canvas.closePath();
  },

  setEnable: function(enable) {
    this._enable = enable;
    if (this._enable) {
      this.target.clip = (c) => this._clip(c);
    } else {
      this.target.clip = null;
    }
  },

  _accessor: {
    enable: {
      set: function(v) {
        this.setEnable(v);
      },
      get: function() {
        return this._enable;
      }
    }
  },

});

phina.namespace(function() {

  phina.define("PieClip", {
    superClass: "Accessory",

    init: function(options) {
      options = ({}).$safe(options, PieClip.defaults)
      this.superInit(options);

      this.pivotX = options.pivotX;
      this.pivotY = options.pivotY;
      this.angleMin = options.angleMin;
      this.angleMax = options.angleMax;
      this.radius = options.radius;
      this.anticlockwise = options.anticlockwise;
    },

    onattached: function() {
      this.target.clip = (canvas) => {
        const angleMin = this.angleMin * Math.DEG_TO_RAD;
        const angleMax = this.angleMax * Math.DEG_TO_RAD;
        const ctx = canvas.context;
        ctx.beginPath();
        ctx.moveTo(this.pivotX, this.pivotY);
        ctx.lineTo(this.pivotX + Math.cos(angleMin) * this.radius, this.pivotY + Math.sin(angleMin) * this.radius);
        ctx.arc(this.pivotX, this.pivotY, this.radius, angleMin, angleMax, this.anticlockwise);
        ctx.closePath();
      };
    },

    _static: {
      defaults: {
        pivotX: 32,
        pivotY: 32,
        angleMin: 0,
        angleMax: 360,
        radius: 64,
        anticlockwise: false,
      },
    },

  });
});

phina.define("RectangleClip", {
  superClass: "Accessory",

  x: 0,
  y: 0,
  width: 0,
  height: 0,

  _enable: true,

  init: function() {
    this.superInit();
    this._init();
  },

  _init: function() {
    this.on("attached", () => {

      this.target.accessor("RectangleClip.width", {
        "get": () => this.width,
        "set": (v) => this.width = v,
      });

      this.target.accessor("RectangleClip.height", {
        "get": () => this.height,
        "set": (v) => this.height = v,
      });

      this.target.accessor("RectangleClip.x", {
        "get": () => this.x,
        "set": (v) => this.x = v,
      });

      this.target.accessor("RectangleClip.y", {
        "get": () => this.y,
        "set": (v) => this.y = v,
      });

      this.x = 0;
      this.y = 0;
      this.width = this.target.width;
      this.height = this.target.height;

      this.target.clip = (c) => this._clip(c);
    });
  },

  _clip: function(canvas) {
    const x = this.x - (this.width * this.target.originX);
    const y = this.y - (this.height * this.target.originY);

    canvas.beginPath();
    canvas.rect(x, y, this.width, this.height);
    canvas.closePath();
  },

  setEnable: function(enable) {
    this._enable = enable;
    if (this._enable) {
      this.target.clip = (c) => this._clip(c);
    } else {
      this.target.clip = null;
    }
  },

  _accessor: {
    enable: {
      set: function(v) {
        this.setEnable(v);
      },
      get: function() {
        return this._enable;
      }
    }
  },

});

phina.define("Toggle", {
  superClass: "Accessory",

  init: function(isOn) {
    this.superInit();
    this._init(isOn);
  },

  _init: function(isOn) {
    this.isOn = isOn || false;
  },

  setStatus: function(status) {
    this.isOn = status;
    this.target.flare((this.isOn) ? "switchOn" : "switchOff");
  },

  switchOn: function() {
    if (this.isOn) return;
    this.setStatus(true);
  },

  switchOff: function() {
    if (!this.isOn) return;
    this.setStatus(false);
  },

  switch: function() {
    this.isOn = !this.isOn;
    this.setStatus(this.isOn);
  },

  _accessor: {
    status: {
      "get": function() {
        return this.isOn;
      },
      "set": function(v) {
        return setStatus(v);
      },
    },
  },

});

phina.asset.AssetLoader.prototype.load = function(params) {
  var self = this;
  var loadAssets = [];
  var counter = 0;
  var length = 0;
  var maxConnectionCount = 2;

  params.forIn(function(type, assets) {
    length += Object.keys(assets).length;
  });

  if (length == 0) {
    return phina.util.Flow.resolve().then(function() {
      self.flare('load');
    });
  }

  params.forIn(function(type, assets) {
    assets.forIn(function(key, value) {
      loadAssets.push({
        "func": phina.asset.AssetLoader.assetLoadFunctions[type],
        "key": key,
        "value": value,
        "type": type,
      });
    });
  });

  if (self.cache) {
    self.on('progress', function(e) {
      if (e.progress >= 1.0) {
        params.forIn(function(type, assets) {
          assets.forIn(function(key, value) {
            var asset = phina.asset.AssetManager.get(type, key);
            if (asset.loadError) {
              var dummy = phina.asset.AssetManager.get(type, 'dummy');
              if (dummy) {
                if (dummy.loadError) {
                  dummy.loadDummy();
                  dummy.loadError = false;
                }
                phina.asset.AssetManager.set(type, key, dummy);
              } else {
                asset.loadDummy();
              }
            }
          });
        });
      }
    });
  }

  var loadAssetsArray = [];

  while (loadAssets.length > 0) {
    loadAssetsArray.push(loadAssets.splice(0, maxConnectionCount));
  }

  var flow = phina.util.Flow.resolve();

  loadAssetsArray.forEach(function(loadAssets) {
    flow = flow.then(function() {
      var flows = [];
      loadAssets.forEach(function(loadAsset) {
        var f = loadAsset.func(loadAsset.key, loadAsset.value);
        f.then(function(asset) {
          if (self.cache) {
            phina.asset.AssetManager.set(loadAsset.type, loadAsset.key, asset);
          }
          self.flare('progress', {
            key: loadAsset.key,
            asset: asset,
            progress: (++counter / length),
          });
        });
        flows.push(f);
      });
      return phina.util.Flow.all(flows);
    });
  });

  return flow.then(function(args) {
    self.flare('load');
  });
}

phina.namespace(function() {

  phina.app.BaseApp.prototype.$method("replaceScene", function(scene) {
    this.flare('replace');
    this.flare('changescene');

    while (this._scenes.length > 0) {
      const scene = this._scenes.pop();
      scene.flare("destroy");
    }

    this._sceneIndex = 0;

    if (this.currentScene) {
      this.currentScene.app = null;
    }

    this.currentScene = scene;
    this.currentScene.app = this;
    this.currentScene.flare('enter', {
      app: this,
    });

    return this;
  });

  phina.app.BaseApp.prototype.$method("popScene", function() {
    this.flare('pop');
    this.flare('changescene');

    var scene = this._scenes.pop();
    --this._sceneIndex;

    scene.flare('exit', {
      app: this,
    });
    scene.flare('destroy');
    scene.app = null;

    this.flare('poped');

    // 
    this.currentScene.flare('resume', {
      app: this,
      prevScene: scene,
    });

    return scene;
  });

});

phina.namespace(function() {

  phina.graphics.Canvas.prototype.$method("init", function(canvas) {
    this.isCreateCanvas = false;
    if (typeof canvas === 'string') {
      this.canvas = document.querySelector(canvas);
    } else {
      if (canvas) {
        this.canvas = canvas;
      } else {
        this.canvas = document.createElement('canvas');
        this.isCreateCanvas = true;
        // console.log('#### create canvas ####');
      }
    }

    this.domElement = this.canvas;
    this.context = this.canvas.getContext('2d');
    this.context.lineCap = 'round';
    this.context.lineJoin = 'round';
  });

  phina.graphics.Canvas.prototype.$method('destroy', function(canvas) {
    if (!this.isCreateCanvas) return;
    // console.log(`#### delete canvas ${this.canvas.width} x ${this.canvas.height} ####`);
    this.setSize(0, 0);
    delete this.canvas;
    delete this.domElement;
  });

});

phina.namespace(() => {

  var qualityScale = phina.geom.Matrix33();

  phina.display.CanvasRenderer.prototype.$method("render", function(scene, quality) {
    this.canvas.clear();
    if (scene.backgroundColor) {
      this.canvas.clearColor(scene.backgroundColor);
    }

    this._context.save();
    this.renderChildren(scene, quality);
    this._context.restore();
  });

  phina.display.CanvasRenderer.prototype.$method("renderChildren", function(obj, quality) {
    // 子供たちも実行
    if (obj.children.length > 0) {
      var tempChildren = obj.children.slice();
      for (var i = 0, len = tempChildren.length; i < len; ++i) {
        this.renderObject(tempChildren[i], quality);
      }
    }
  });

  phina.display.CanvasRenderer.prototype.$method("renderObject", function(obj, quality) {
    if (obj.visible === false && !obj.interactive) return;

    obj._calcWorldMatrix && obj._calcWorldMatrix();

    if (obj.visible === false) return;

    obj._calcWorldAlpha && obj._calcWorldAlpha();

    var context = this.canvas.context;

    context.globalAlpha = obj._worldAlpha;
    context.globalCompositeOperation = obj.blendMode;

    if (obj._worldMatrix) {

      qualityScale.identity();

      qualityScale.m00 = quality || 1.0;
      qualityScale.m11 = quality || 1.0;

      var m = qualityScale.multiply(obj._worldMatrix);
      context.setTransform(m.m00, m.m10, m.m01, m.m11, m.m02, m.m12);

    }

    if (obj.clip) {

      context.save();

      obj.clip(this.canvas);
      context.clip();

      if (obj.draw) obj.draw(this.canvas);

      // 子供たちも実行
      if (obj.renderChildBySelf === false && obj.children.length > 0) {
        var tempChildren = obj.children.slice();
        for (var i = 0, len = tempChildren.length; i < len; ++i) {
          this.renderObject(tempChildren[i], quality);
        }
      }

      context.restore();
    } else {
      if (obj.draw) obj.draw(this.canvas);

      // 子供たちも実行
      if (obj.renderChildBySelf === false && obj.children.length > 0) {
        var tempChildren = obj.children.slice();
        for (var i = 0, len = tempChildren.length; i < len; ++i) {
          this.renderObject(tempChildren[i], quality);
        }
      }

    }
  });

});

phina.namespace(() => {
  //ユーザーエージェントからブラウザタイプの判別を行う
  phina.$method('checkBrowser', function() {
    const result = {};
    const agent = window.navigator.userAgent.toLowerCase();;

    result.isChrome = (agent.indexOf('chrome') !== -1) && (agent.indexOf('edge') === -1) && (agent.indexOf('opr') === -1);
    result.isEdge = (agent.indexOf('edge') !== -1);
    result.isIe11 = (agent.indexOf('trident/7') !== -1);
    result.isFirefox = (agent.indexOf('firefox') !== -1);
    result.isSafari = (agent.indexOf('safari') !== -1) && (agent.indexOf('chrome') === -1);
    result.isElectron = (agent.indexOf('electron') !== -1);

    result.isWindows = (agent.indexOf('windows') !== -1);
    result.isMac = (agent.indexOf('mac os x') !== -1);

    result.isiPad = agent.indexOf('ipad') > -1 || ua.indexOf('macintosh') > -1 && 'ontouchend' in document;
    result.isiOS = agent.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1 || ua.indexOf('macintosh') > -1 && 'ontouchend' in document;

    return result;
  });
});

//==================================================
//  Extension phina.display.DisplayElement
//==================================================
phina.namespace(() => {
  phina.display.DisplayElement.prototype.$method("enable", function() {
    this.show().wakeUp();
    return this;
  });

  phina.display.DisplayElement.prototype.$method("disable", function() {
    this.hide().sleep();
    return this;
  });
});

phina.namespace(() => {
  phina.display.DisplayScene.quality = 1.0;
  phina.display.DisplayScene.prototype.$method("init", function(params) {
    this.superInit();
    var quality = phina.display.DisplayScene.quality;

    params = ({}).$safe(params, phina.display.DisplayScene.defaults);
    this.canvas = phina.graphics.Canvas();
    this.canvas.setSize(params.width * quality, params.height * quality);
    this.renderer = phina.display.CanvasRenderer(this.canvas);
    this.backgroundColor = (params.backgroundColor) ? params.backgroundColor : null;

    this.width = params.width;
    this.height = params.height;
    this.gridX = phina.util.Grid(params.width, 16);
    this.gridY = phina.util.Grid(params.height, 16);

    this.interactive = true;
    this.setInteractive = function(flag) {
      this.interactive = flag;
    };
    this._overFlags = {};
    this._touchFlags = {};
  });

});

phina.namespace(function() {

  // audio要素で音声を再生する。主にIE用
  phina.define("phina.asset.DomAudioSound", {
    superClass: "phina.asset.Asset",

    domElement: null,
    emptySound: false,

    init: function() {
      this.superInit();
    },

    _load: function(resolve) {
      this.domElement = document.createElement("audio");
      if (this.domElement.canPlayType("audio/mpeg")) {
        setTimeout(function readystateCheck() {
          if (this.domElement.readyState < 4) {
            setTimeout(readystateCheck.bind(this), 10);
          } else {
            this.emptySound = false;
            console.log("end load ", this.src);
            resolve(this)
          }
        }.bind(this), 10);
        this.domElement.onerror = function(e) {
          console.error("オーディオのロードに失敗", e);
        };
        this.domElement.src = this.src;
        console.log("begin load ", this.src);
        this.domElement.load();
        this.domElement.autoplay = false;
        this.domElement.addEventListener("ended", function() {
          this.flare("ended");
        }.bind(this));
      } else {
        console.log("mp3は再生できません");
        this.emptySound = true;
        resolve(this);
      }
    },

    play: function() {
      if (this.emptySound) return;
      this.domElement.pause();
      this.domElement.currentTime = 0;
      this.domElement.play();
    },

    stop: function() {
      if (this.emptySound) return;
      this.domElement.pause();
      this.domElement.currentTime = 0;
    },

    pause: function() {
      if (this.emptySound) return;
      this.domElement.pause();
    },

    resume: function() {
      if (this.emptySound) return;
      this.domElement.play();
    },

    setLoop: function(v) {
      if (this.emptySound) return;
      this.domElement.loop = v;
    },

    _accessor: {
      volume: {
        get: function() {
          if (this.emptySound) return 0;
          return this.domElement.volume;
        },
        set: function(v) {
          if (this.emptySound) return;
          this.domElement.volume = v;
        },
      },
      loop: {
        get: function() {
          if (this.emptySound) return false;
          return this.domElement.loop;
        },
        set: function(v) {
          if (this.emptySound) return;
          this.setLoop(v);
        },
      },

    },
  });

  // IE11の場合のみ音声アセットはDomAudioSoundで再生する
  var ua = window.navigator.userAgent.toLowerCase();
  if (ua.indexOf('trident/7') !== -1) {
    phina.asset.AssetLoader.register("sound", function(key, path) {
      var asset = phina.asset.DomAudioSound();
      return asset.load(path);
    });
  }

});

phina.namespace(() => {

  phina.app.Element.prototype.$method("findById", function(id) {
    if (this.id === id) {
      return this;
    } else {
      for (let i = 0; i < this.children.length; i++) {
        if (this.children[i].findById(id)) {
          return this.children[i];
        }
      }
      return null;
    }
  });

  //指定された子オブジェクトを最前面に移動する
  phina.app.Element.prototype.$method("moveFront", function(child) {
    for (let i = 0; i < this.children.length; i++) {
      if (this.children[i] == child) {
        this.children.splice(i, 1);
        break;
      }
    }
    this.children.push(child);
    return this;
  });

  phina.app.Element.prototype.$method("destroyChild", function() {
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].flare('destroy');
    }
    return this;
  });

});

phina.namespace(() => {

  phina.input.Input.quality = 1.0;

  phina.input.Input.prototype.$method("_move", function(x, y) {
    this._tempPosition.x = x;
    this._tempPosition.y = y;

    // adjust scale
    var elm = this.domElement;
    var rect = elm.getBoundingClientRect();

    var w = elm.width / phina.input.Input.quality;
    var h = elm.height / phina.input.Input.quality;

    if (rect.width) {
      this._tempPosition.x *= w / rect.width;
    }

    if (rect.height) {
      this._tempPosition.y *= h / rect.height;
    }

  });

});

phina.namespace(() => {
  phina.display.Label.prototype.$method("init", function(options) {
    if (typeof arguments[0] !== 'object') {
      options = { text: arguments[0], };
    } else {
      options = arguments[0];
    }

    options = ({}).$safe(options, phina.display.Label.defaults);
    this.superInit(options);

    this.text = (options.text) ? options.text : "";
    this.fontSize = options.fontSize;
    this.fontWeight = options.fontWeight;
    this.fontFamily = options.fontFamily;
    this.align = options.align;
    this.baseline = options.baseline;
    this.lineHeight = options.lineHeight;
  });

});

phina.namespace(() => {
  phina.input.Mouse.prototype.init = function(domElement) {
    this.superInit(domElement);

    this.id = 0;

    var self = this;
    this.domElement.addEventListener('mousedown', function(e) {
      self._start(e.pointX, e.pointY, 1 << e.button);
      e.preventDefault();
      e.stopPropagation();
    });

    this.domElement.addEventListener('mouseup', function(e) {
      self._end(1 << e.button);
      e.preventDefault();
      e.stopPropagation();
    });
    this.domElement.addEventListener('mousemove', function(e) {
      self._move(e.pointX, e.pointY);
      e.preventDefault();
      e.stopPropagation();
    });

    // マウスがキャンバス要素の外に出た場合の対応
    this.domElement.addEventListener('mouseout', function(e) {
      self._end(1);
    });
  }
});

//==================================================
//  Extension phina.app.Object2D
//==================================================

phina.namespace(() => {
  phina.app.Object2D.prototype.$method("setOrigin", function(x, y, reposition) {
    if (!reposition) {
      this.origin.x = x;
      this.origin.y = y;
      return this;
    }

    //変更された基準点に移動させる
    const _originX = this.originX;
    const _originY = this.originY;
    const _addX = (x - _originX) * this.width;
    const _addY = (y - _originY) * this.height;

    this.x += _addX;
    this.y += _addY;
    this.originX = x;
    this.originY = y;

    this.children.forEach(child => {
      child.x -= _addX;
      child.y -= _addY;
    });
    return this;
  });

  phina.app.Object2D.prototype.$method("hitTestElement", function(elm) {
    const rect0 = this.calcGlobalRect();
    const rect1 = elm.calcGlobalRect();
    return (rect0.left < rect1.right) && (rect0.right > rect1.left) &&
      (rect0.top < rect1.bottom) && (rect0.bottom > rect1.top);
  });

  phina.app.Object2D.prototype.$method("includeElement", function(elm) {
    const rect0 = this.calcGlobalRect();
    const rect1 = elm.calcGlobalRect();
    return (rect0.left <= rect1.left) && (rect0.right >= rect1.right) &&
      (rect0.top <= rect1.top) && (rect0.bottom >= rect1.bottom);
  });

  phina.app.Object2D.prototype.$method("calcGlobalRect", function() {
    const left = this._worldMatrix.m02 - this.originX * this.width;
    const top = this._worldMatrix.m12 - this.originY * this.height;
    return Rect(left, top, this.width, this.height);
  });

  phina.app.Object2D.prototype.$method("calcGlobalRect", function() {
    const left = this._worldMatrix.m02 - this.originX * this.width;
    const top = this._worldMatrix.m12 - this.originY * this.height;
    return Rect(left, top, this.width, this.height);
  });

});

phina.namespace(function() {

  phina.display.PlainElement.prototype.$method("destroyCanvas", function() {
    if (!this.canvas) return;
    this.canvas.destroy();
    delete this.canvas;
  });

});

//==================================================
//  Extension phina.display.Shape
//==================================================
phina.display.Shape.prototype.render = function(canvas) {
  if (!canvas) {
    console.log("canvas null");
    return;
  }
  var context = canvas.context;
  // リサイズ
  var size = this.calcCanvasSize();
  canvas.setSize(size.width, size.height);
  // クリアカラー
  canvas.clearColor(this.backgroundColor);
  // 中心に座標を移動
  canvas.transformCenter();

  // 描画前処理
  this.prerender(this.canvas);

  // ストローク描画
  if (this.isStrokable()) {
    context.strokeStyle = this.stroke;
    context.lineWidth = this.strokeWidth;
    context.lineJoin = "round";
    context.shadowBlur = 0;
    this.renderStroke(canvas);
  }

  // 塗りつぶし描画
  if (this.fill) {
    context.fillStyle = this.fill;
    // shadow の on/off
    if (this.shadow) {
      context.shadowColor = this.shadow;
      context.shadowBlur = this.shadowBlur;
      context.shadowOffsetX = this.shadowOffsetX || 0;
      context.shadowOffsetY = this.shadowOffsetY || 0;
    } else {
      context.shadowBlur = 0;
    }
    this.renderFill(canvas);
  }

  // 描画後処理
  this.postrender(this.canvas);

  return this;
};

phina.namespace(function() {

  phina.asset.Sound.prototype.$method("_load", function(resolve) {
    if (/^data:/.test(this.src)) {
      this._loadFromURIScheme(resolve);
    } else {
      this._loadFromFile(resolve);
    }
  });

  phina.asset.Sound.prototype.$method("_loadFromFile", function(resolve) {
    // console.log(this.src);
    var self = this;
    var xml = new XMLHttpRequest();
    xml.open('GET', this.src);
    xml.onreadystatechange = function() {
      if (xml.readyState === 4) {
        if ([200, 201, 0].indexOf(xml.status) !== -1) {
          // 音楽バイナリーデータ
          var data = xml.response;
          // webaudio 用に変換
          // console.log(data)
          self.context.decodeAudioData(data, function(buffer) {
            self.loadFromBuffer(buffer);
            resolve(self);
          }, function() {
            console.warn("音声ファイルのデコードに失敗しました。(" + self.src + ")");
            resolve(self);
            self.flare('decodeerror');
          });
        } else if (xml.status === 404) {
          // not found
          self.loadError = true;
          self.notFound = true;
          resolve(self);
          self.flare('loaderror');
          self.flare('notfound');
        } else {
          // サーバーエラー
          self.loadError = true;
          self.serverError = true;
          resolve(self);
          self.flare('loaderror');
          self.flare('servererror');
        }
        xml.onreadystatechange = null;
      }
    };

    xml.responseType = 'arraybuffer';

    xml.send(null);
  });

  phina.asset.Sound.prototype.$method("play", function(when, offset, duration) {
    when = when ? when + this.context.currentTime : 0;
    offset = offset || 0;

    var source = this.source = this.context.createBufferSource();
    var buffer = source.buffer = this.buffer;
    source.loop = this._loop;
    source.loopStart = this._loopStart;
    source.loopEnd = this._loopEnd;
    source.playbackRate.value = this._playbackRate;

    // connect
    source.connect(this.gainNode);
    this.gainNode.connect(phina.asset.Sound.getMasterGain());
    // play
    if (duration !== undefined) {
      source.start(when, offset, duration);
    } else {
      source.start(when, offset);
    }

    source.onended = function() {
      if (!source) {
        this.flare('ended');
        return;
      }
      source.onended = null;
      source.disconnect();
      source.buffer = null;
      source = null;
      this.flare('ended');
    }.bind(this);

    return this;
  });

  phina.asset.Sound.prototype.$method("stop", function() {
    // stop
    if (this.source) {
      // stop すると source.endedも発火する
      this.source.stop && this.source.stop(0);
      this.flare('stop');
    }

    return this;
  });

});

//==================================================
//  Extension phina.asset.SoundManager
//==================================================
SoundManager.$method("getVolume", function() {
  return !this.isMute() ? this.volume : 0;
});

SoundManager.$method("getVolumeMusic", function() {
  return !this.isMute() ? this.musicVolume : 0;
});

SoundManager.$method("setVolumeMusic", function(volume) {
  this.musicVolume = volume;
  if (!this.isMute() && this.currentMusic) {
    this.currentMusic.volume = volume;
  }
  return this;
});

SoundManager.$method("playMusic", function(name, fadeTime, loop, when, offset, duration) {
  // const res = phina.checkBrowser();
  // if (res.isIe11) return null;

  loop = (loop !== undefined) ? loop : true;

  if (this.currentMusic) {
    this.stopMusic(fadeTime);
  }

  var music = null;
  if (name instanceof phina.asset.Sound || name instanceof phina.asset.DomAudioSound) {
    music = name;
  } else {
    music = phina.asset.AssetManager.get('sound', name);
  }

  if (!music) {
    console.error("Sound not found: ", name);
    return null;
  }

  music.setLoop(loop);
  music.play(when, offset, duration);

  if (fadeTime > 0) {
    var count = 32;
    var counter = 0;
    var unitTime = fadeTime / count;
    var volume = this.getVolumeMusic();

    music.volume = 0;
    var id = setInterval(function() {
      counter += 1;
      var rate = counter / count;
      music.volume = rate * volume;

      if (rate >= 1) {
        clearInterval(id);
        return false;
      }

      return true;
    }, unitTime);
  } else {
    music.volume = this.getVolumeMusic();
  }

  this.currentMusic = music;

  return this.currentMusic;
});

//==================================================
// ボイス用の音量設定、再生メソッド拡張
SoundManager.$method("getVolumeVoice", function() {
  return !this.isMute() ? this.voiceVolume : 0;
});

SoundManager.$method("setVolumeVoice", function(volume) {
  this.voiceVolume = volume;
  return this;
});

SoundManager.$method("playVoice", function(name) {
  var sound = phina.asset.AssetManager.get('sound', name);
  sound.volume = this.getVolumeVoice();
  sound.play();
  return sound;
});

//スプライト機能拡張
phina.namespace(function() {

  phina.display.Sprite.prototype.setFrameTrimming = function(x, y, width, height) {
    this._frameTrimX = x || 0;
    this._frameTrimY = y || 0;
    this._frameTrimWidth = width || this.image.domElement.width - this._frameTrimX;
    this._frameTrimHeight = height || this.image.domElement.height - this._frameTrimY;
    return this;
  }

  phina.display.Sprite.prototype.setFrameIndex = function(index, width, height) {
    var sx = this._frameTrimX || 0;
    var sy = this._frameTrimY || 0;
    var sw = this._frameTrimWidth  || (this.image.domElement.width-sx);
    var sh = this._frameTrimHeight || (this.image.domElement.height-sy);

    var tw  = width || this.width;      // tw
    var th  = height || this.height;    // th
    var row = ~~(sw / tw);
    var col = ~~(sh / th);
    var maxIndex = row*col;
    index = index%maxIndex;

    var x   = index%row;
    var y   = ~~(index/row);
    this.srcRect.x = sx+x*tw;
    this.srcRect.y = sy+y*th;
    this.srcRect.width  = tw;
    this.srcRect.height = th;

    this._frameIndex = index;

    return this;
  }

});
phina.namespace(function() {
  // 文字列から数値を抽出する
  // レイアウトファイルから作業する場合に利用したくなる
  // hoge_0 hoge_1などから数字だけ抽出
  // 0100_hoge_9999 => ["0100" , "9999"]になる
  // hoge0.0とかはどうすかな？
  // 抽出後にparseIntするかは検討中
  String.prototype.$method("matchInt", function() {
    return this.match(/[0-9]+/g);
  });
});

phina.namespace(function() {

  phina.asset.Texture.prototype.$method("_load", function(resolve) {
    this.domElement = new Image();

    var isLocal = (location.protocol == 'file:');
    if (!(/^data:/.test(this.src))) {
      this.domElement.crossOrigin = 'anonymous'; // クロスオリジン解除
    }

    var self = this;
    this.domElement.onload = function(e) {
      self.loaded = true;
      e.target.onload = null;
      e.target.onerror = null;
      resolve(self);
    };

    this.domElement.onerror = function(e) {
      e.target.onload = null;
      e.target.onerror = null;
      console.error("phina.asset.Texture _load onError ", this.src);
    };

    this.domElement.src = this.src;
  });

});

phina.namespace(function() {

  phina.accessory.Tweener.prototype.$method("_updateTween", function(app) {
    //※これないとpauseがうごかない
    if (!this.playing) return;

    var tween = this._tween;
    var time = this._getUnitTime(app);

    tween.forward(time);
    this.flare('tween');

    if (tween.time >= tween.duration) {
      delete this._tween;
      this._tween = null;
      this._update = this._updateTask;
    }
  });

  phina.accessory.Tweener.prototype.$method("_updateWait", function(app) {
    //※これないとpauseがうごかない
    if (!this.playing) return;

    var wait = this._wait;
    var time = this._getUnitTime(app);
    wait.time += time;

    if (wait.time >= wait.limit) {
      delete this._wait;
      this._wait = null;
      this._update = this._updateTask;
    }
  });

});

phina.define("Buttonize", {
  init: function() {},
  _static: {
    STATUS: {
      NONE: 0,
      START: 1,
      END: 2,
    },
    status: 0,
    rect: function(element) {
      element.boundingType = "rect";
      this._common(element);
      return element;
    },
    circle: function(element) {
      element.radius = Math.max(element.width, element.height) * 0.5;
      element.boundingType = "circle";
      this._common(element);
      return element;
    },
    _common: function(element) {
      //TODO:エディターできるまでの暫定対応
      element.setOrigin(0.5, 0.5, true);

      element.interactive = true;
      element.clickSound = "se/clickButton";

      //TODO:ボタンの同時押下は実機で調整する
      element.on("pointstart", e => {
        if (this.status != this.STATUS.NONE) return;
        this.status = this.STATUS.START;
        element.tweener.clear()
          .to({
            scaleX: 0.9,
            scaleY: 0.9
          }, 100);
      });

      element.on("pointend", (e) => {
        if (this.status != this.STATUS.START) return;
        const hitTest = element.hitTest(e.pointer.x, e.pointer.y);
        this.status = this.STATUS.END;
        if (hitTest) element.flare("clickSound");

        element.tweener.clear()
          .to({
            scaleX: 1.0,
            scaleY: 1.0
          }, 100)
          .call(() => {
            this.status = this.STATUS.NONE;
            if (!hitTest) return;
            element.flare("clicked", {
              pointer: e.pointer
            });
          });
      });

      //アニメーションの最中に削除された場合に備えてremovedイベント時にフラグを元に戻しておく
      element.one("removed", () => {
        this.status = this.STATUS.NONE;
      });

      element.on("clickSound", function() {
        if (!element.clickSound) return;
        //phina.asset.SoundManager.play(element.clickSound);
      });
    },
  },
});

phina.namespace(function() {

  /**
   * テクスチャ関係のユーティリティ
   */
  phina.define("TextureUtil", {

    _static: {

      /**
       * RGB各要素に実数を積算する
       */
      multiplyColor: function(texture, red, green, blue) {
        if (typeof(texture) === "string") {
          texture = AssetManager.get("image", texture);
        }

        const width = texture.domElement.width;
        const height = texture.domElement.height;

        const result = Canvas().setSize(width, height);
        const context = result.context;

        context.drawImage(texture.domElement, 0, 0);
        const imageData = context.getImageData(0, 0, width, height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i + 0] = Math.floor(imageData.data[i + 0] * red);
          imageData.data[i + 1] = Math.floor(imageData.data[i + 1] * green);
          imageData.data[i + 2] = Math.floor(imageData.data[i + 2] * blue);
        }
        context.putImageData(imageData, 0, 0);

        return result;
      },

      /**
       * 色相・彩度・明度を操作する
       */
      editByHsl: function(texture, h, s, l) {
        if (typeof(texture) === "string") {
          texture = AssetManager.get("image", texture);
        }

        const width = texture.domElement.width;
        const height = texture.domElement.height;

        const result = Canvas().setSize(width, height);
        const context = result.context;

        context.drawImage(texture.domElement, 0, 0);
        const imageData = context.getImageData(0, 0, width, height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          const r = imageData.data[i + 0];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];

          const hsl = phina.util.Color.RGBtoHSL(r, g, b);
          const newRgb = phina.util.Color.HSLtoRGB(hsl[0] + h, Math.clamp(hsl[1] + s, 0, 100), Math.clamp(hsl[2] + l, 0, 100));

          imageData.data[i + 0] = newRgb[0];
          imageData.data[i + 1] = newRgb[1];
          imageData.data[i + 2] = newRgb[2];
        }
        context.putImageData(imageData, 0, 0);

        return result;
      },

    },

    init: function() {},
  });

});

/*
 *  phina.tiledmap.js
 *  2016/9/10
 *  @auther minimo  
 *  This Program is MIT license.
 * 
 *  2019/9/18
 *  version 2.0
 */

phina.namespace(function() {

  phina.define("phina.asset.TiledMap", {
    superClass: "phina.asset.XMLLoader",

    image: null,

    tilesets: null,
    layers: null,

    init: function() {
        this.superInit();
    },

    _load: function(resolve) {
      //パス抜き出し
      this.path = "";
      const last = this.src.lastIndexOf("/");
      if (last > 0) {
        this.path = this.src.substring(0, last + 1);
      }

      //終了関数保存
      this._resolve = resolve;

      // load
      const xml = new XMLHttpRequest();
      xml.open('GET', this.src);
      xml.onreadystatechange = () => {
        if (xml.readyState === 4) {
          if ([200, 201, 0].indexOf(xml.status) !== -1) {
            const data = (new DOMParser()).parseFromString(xml.responseText, "text/xml");
            this.dataType = "xml";
            this.data = data;
            this._parse(data)
              .then(() => this._resolve(this));
          }
        }
      };
      xml.send(null);
    },

    //マップイメージ取得
    getImage: function(layerName) {
      if (layerName === undefined) {
        return this.image;
      } else {
        return this._generateImage(layerName);
      }
    },

    //指定マップレイヤーを配列として取得
    getMapData: function(layerName) {
      //レイヤー検索
      for(let i = 0; i < this.layers.length; i++) {
        if (this.layers[i].name == layerName) {
          //コピーを返す
          return this.layers[i].data.concat();
        }
      }
      return null;
    },

    //オブジェクトグループを取得（指定が無い場合、全レイヤーを配列にして返す）
    getObjectGroup: function(groupName) {
      groupName = groupName || null;
      const ls = [];
      const len = this.layers.length;
      for (let i = 0; i < len; i++) {
        if (this.layers[i].type == "objectgroup") {
          if (groupName == null || groupName == this.layers[i].name) {
            //レイヤー情報をクローンする
            const obj = this._cloneObjectLayer(this.layers[i]);
            if (groupName !== null) return obj;
            ls.push(obj);
          }
        }
      }
      return ls;
    },

    //オブジェクトレイヤーをクローンして返す
    _cloneObjectLayer: function(srcLayer) {
      const result = {}.$safe(srcLayer);
      result.objects = [];
      //レイヤー内オブジェクトのコピー
      srcLayer.objects.forEach(obj => {
        const resObj = {
          properties: {}.$safe(obj.properties),
        }.$extend(obj);
        if (obj.ellipse) resObj.ellipse = obj.ellipse;
        if (obj.gid) resObj.gid = obj.gid;
        if (obj.polygon) resObj.polygon = obj.polygon.clone();
        if (obj.polyline) resObj.polyline = obj.polyline.clone();
        result.objects.push(resObj);
      });
      return result;
    },

    _parse: function(data) {
      return new Promise(resolve => {
        //タイル属性情報取得
        const map = data.getElementsByTagName('map')[0];
        const attr = this._attrToJSON(map);
        this.$extend(attr);
        this.properties = this._propertiesToJSON(map);

        //タイルセット取得
        this.tilesets = this._parseTilesets(data);
        this.tilesets.sort((a, b) => a.firstgid - b.firstgid);

        //レイヤー取得
        this.layers = this._parseLayers(data);

        //イメージデータ読み込み
        this._checkImage()
          .then(() => {
            //マップイメージ生成
            this.image = this._generateImage();
            resolve();
          });
      })
    },

    //タイルセットのパース
    _parseTilesets: function(xml) {
      const each = Array.prototype.forEach;
      const data = [];
      const tilesets = xml.getElementsByTagName('tileset');
      each.call(tilesets, async tileset => {
        const t = {};
        const attr = this._attrToJSON(tileset);
        if (attr.source) {
          t.isOldFormat = false;
          t.source = this.path + attr.source;
        } else {
          //旧データ形式（未対応）
          t.isOldFormat = true;
          t.data = tileset;
        }
        t.firstgid = attr.firstgid;
        data.push(t);
      });
      return data;
    },

    //レイヤー情報のパース
    _parseLayers: function(xml) {
      const each = Array.prototype.forEach;
      const data = [];

      const map = xml.getElementsByTagName("map")[0];
      const layers = [];
      each.call(map.childNodes, elm => {
        if (elm.tagName == "layer" || elm.tagName == "objectgroup" || elm.tagName == "imagelayer") {
          layers.push(elm);
        }
      });

      layers.each(layer => {
        switch (layer.tagName) {
          case "layer":
            {
              //通常レイヤー
              const d = layer.getElementsByTagName('data')[0];
              const encoding = d.getAttribute("encoding");
              const l = {
                  type: "layer",
                  name: layer.getAttribute("name"),
              };

              if (encoding == "csv") {
                  l.data = this._parseCSV(d.textContent);
              } else if (encoding == "base64") {
                  l.data = this._parseBase64(d.textContent);
              }

              const attr = this._attrToJSON(layer);
              l.$extend(attr);
              l.properties = this._propertiesToJSON(layer);

              data.push(l);
            }
            break;

          //オブジェクトレイヤー
          case "objectgroup":
            {
              const l = {
                type: "objectgroup",
                objects: [],
                name: layer.getAttribute("name"),
                x: parseFloat(layer.getAttribute("offsetx")) || 0,
                y: parseFloat(layer.getAttribute("offsety")) || 0,
                alpha: layer.getAttribute("opacity") || 1,
                color: layer.getAttribute("color") || null,
                draworder: layer.getAttribute("draworder") || null,
              };
              each.call(layer.childNodes, elm => {
                if (elm.nodeType == 3) return;
                const d = this._attrToJSON(elm);
                d.properties = this._propertiesToJSON(elm);
                //子要素の解析
                if (elm.childNodes.length) {
                  elm.childNodes.forEach(e => {
                    if (e.nodeType == 3) return;
                    //楕円
                    if (e.nodeName == 'ellipse') {
                      d.ellipse = true;
                    }
                    //多角形
                    if (e.nodeName == 'polygon') {
                      d.polygon = [];
                      const attr = this._attrToJSON_str(e);
                      const pl = attr.points.split(" ");
                      pl.forEach(function(str) {
                        const pts = str.split(",");
                        d.polygon.push({x: parseFloat(pts[0]), y: parseFloat(pts[1])});
                      });
                    }
                    //線分
                    if (e.nodeName == 'polyline') {
                      d.polyline = [];
                      const attr = this._attrToJSON_str(e);
                      const pl = attr.points.split(" ");
                      pl.forEach(str => {
                        const pts = str.split(",");
                        d.polyline.push({x: parseFloat(pts[0]), y: parseFloat(pts[1])});
                      });
                    }
                  });
                }
                l.objects.push(d);
              });
              l.properties = this._propertiesToJSON(layer);

              data.push(l);
            }
            break;

          //イメージレイヤー
          case "imagelayer":
            {
              const l = {
                type: "imagelayer",
                name: layer.getAttribute("name"),
                x: parseFloat(layer.getAttribute("offsetx")) || 0,
                y: parseFloat(layer.getAttribute("offsety")) || 0,
                alpha: layer.getAttribute("opacity") || 1,
                visible: (layer.getAttribute("visible") === undefined || layer.getAttribute("visible") != 0),
              };
              const imageElm = layer.getElementsByTagName("image")[0];
              l.image = {source: imageElm.getAttribute("source")};

              data.push(l);
            }
            break;
          //グループ
          case "group":
            break;
        }
      });
      return data;
    },

    //アセットに無いイメージデータを読み込み
    _checkImage: function() {
      const imageSource = [];
      const loadImage = [];

      //一覧作成
      this.tilesets.forEach(tileset => {
        const obj = {
          isTileset: true,
          image: tileset.source,
        };
        imageSource.push(obj);
      });
      this.layers.forEach(layer => {
        if (layer.image) {
          const obj = {
            isTileset: false,
            image: layer.image.source,
          };
          imageSource.push(obj);
        }
      });

      //アセットにあるか確認
      imageSource.forEach(e => {
        if (e.isTileset) {
          const tsx = phina.asset.AssetManager.get('tsx', e.image);
          if (!tsx) {
            //アセットになかったのでロードリストに追加
            loadImage.push(e);
          }
        } else {
          const image = phina.asset.AssetManager.get('image', e.image);
          if (!image) {
            //アセットになかったのでロードリストに追加
            loadImage.push(e);
          }
        }
      });

      //一括ロード
      //ロードリスト作成
      if (loadImage.length) {
        const assets = { image: [], tsx: [] };
        loadImage.forEach(e => {
          if (e.isTileset) {
            assets.tsx[e.image] = e.image;
          } else {
            //アセットのパスをマップと同じにする
            assets.image[e.image] = this.path + e.image;
          }
        });
        return new Promise(resolve => {
          const loader = phina.asset.AssetLoader();
          loader.load(assets);
          loader.on('load', () => {
            this.tilesets.forEach(e => {
              e.tsx = phina.asset.AssetManager.get('tsx', e.source);
            });
            resolve();
          });
        });
      } else {
        return Promise.resolve();
      }
    },

    //マップイメージ作成
    _generateImage: function(layerName) {
      let numLayer = 0;
      for (let i = 0; i < this.layers.length; i++) {
        if (this.layers[i].type == "layer" || this.layers[i].type == "imagelayer") numLayer++;
      }
      if (numLayer == 0) return null;

      const width = this.width * this.tilewidth;
      const height = this.height * this.tileheight;
      const canvas = phina.graphics.Canvas().setSize(width, height);

      for (let i = 0; i < this.layers.length; i++) {
        //マップレイヤー
        if (this.layers[i].type == "layer" && this.layers[i].visible != "0") {
          if (layerName === undefined || layerName === this.layers[i].name) {
            const layer = this.layers[i];
            const mapdata = layer.data;
            const width = layer.width;
            const height = layer.height;
            const opacity = layer.opacity || 1.0;
            let count = 0;
            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                const index = mapdata[count];
                if (index !== 0) {
                  //マップチップを配置
                  this._setMapChip(canvas, index, x * this.tilewidth, y * this.tileheight, opacity);
                }
                count++;
              }
            }
          }
        }
        //オブジェクトグループ
        if (this.layers[i].type == "objectgroup" && this.layers[i].visible != "0") {
          if (layerName === undefined || layerName === this.layers[i].name) {
            const layer = this.layers[i];
            const opacity = layer.opacity || 1.0;
            layer.objects.forEach(function(e) {
              if (e.gid) {
                this._setMapChip(canvas, e.gid, e.x, e.y, opacity);
              }
            }.bind(this));
          }
        }
        //イメージレイヤー
        if (this.layers[i].type == "imagelayer" && this.layers[i].visible != "0") {
          if (layerName === undefined || layerName === this.layers[i].name) {
            const image = phina.asset.AssetManager.get('image', this.layers[i].image.source);
            canvas.context.drawImage(image.domElement, this.layers[i].x, this.layers[i].y);
          }
        }
      }

      const texture = phina.asset.Texture();
      texture.domElement = canvas.domElement;
      return texture;
    },

    //キャンバスの指定した座標にマップチップのイメージをコピーする
    _setMapChip: function(canvas, index, x, y, opacity) {
      //対象タイルセットの判別
      let tileset;
      for (let i = 0; i < this.tilesets.length; i++) {
        const tsx1 = this.tilesets[i];
        const tsx2 = this.tilesets[i + 1];
        if (!tsx2) {
          tileset = tsx1;
          i = this.tilesets.length;
        } else if (tsx1.firstgid <= index && index < tsx2.firstgid) {
          tileset = tsx1;
          i = this.tilesets.length;
        }
      }
      //タイルセットからマップチップを取得
      const tsx = tileset.tsx;
      const chip = tsx.chips[index - tileset.firstgid];
      const image = phina.asset.AssetManager.get('image', chip.image);
      canvas.context.drawImage(
        image.domElement,
        chip.x + tsx.margin, chip.y + tsx.margin,
        tsx.tilewidth, tsx.tileheight,
        x, y,
        tsx.tilewidth, tsx.tileheight);
    },

  });

  //ローダーに追加
  phina.asset.AssetLoader.assetLoadFunctions.tmx = function(key, path) {
    const tmx = phina.asset.TiledMap();
    return tmx.load(path);
  };

});
/*
 *  phina.Tileset.js
 *  2019/9/12
 *  @auther minimo  
 *  This Program is MIT license.
 *
 */

phina.namespace(function() {

  phina.define("phina.asset.TileSet", {
    superClass: "phina.asset.XMLLoader",

    image: null,
    tilewidth: 0,
    tileheight: 0,
    tilecount: 0,
    columns: 0,

    init: function(xml) {
        this.superInit();
        if (xml) {
          this.loadFromXML(xml);
        }
    },

    _load: function(resolve) {
      //パス抜き出し
      this.path = "";
      const last = this.src.lastIndexOf("/");
      if (last > 0) {
        this.path = this.src.substring(0, last + 1);
      }

      //終了関数保存
      this._resolve = resolve;

      // load
      const xml = new XMLHttpRequest();
      xml.open('GET', this.src);
      xml.onreadystatechange = () => {
        if (xml.readyState === 4) {
          if ([200, 201, 0].indexOf(xml.status) !== -1) {
            const data = (new DOMParser()).parseFromString(xml.responseText, "text/xml");
            this.dataType = "xml";
            this.data = data;
            this._parse(data)
              .then(() => this._resolve(this));
          }
        }
      };
      xml.send(null);
    },

    loadFromXML: function(xml) {
      return this._parse(xml);
    },

    _parse: function(data) {
      return new Promise(resolve => {
        //タイルセット取得
        const tileset = data.getElementsByTagName('tileset')[0];
        const props = this._propertiesToJSON(tileset);

        //タイルセット属性情報取得
        const attr = this._attrToJSON(tileset);
        attr.$safe({
          tilewidth: 32,
          tileheight: 32,
          spacing: 0,
          margin: 0,
        });
        this.$extend(attr);
        this.chips = [];

        //ソース画像設定取得
        this.imageName = tileset.getElementsByTagName('image')[0].getAttribute('source');
  
        //透過色設定取得
        const trans = tileset.getElementsByTagName('image')[0].getAttribute('trans');
        if (trans) {
          this.transR = parseInt(trans.substring(0, 2), 16);
          this.transG = parseInt(trans.substring(2, 4), 16);
          this.transB = parseInt(trans.substring(4, 6), 16);
        }
  
        //マップチップリスト作成
        for (let r = 0; r < this.tilecount; r++) {
          const chip = {
            image: this.imageName,
            x: (r  % this.columns) * (this.tilewidth + this.spacing) + this.margin,
            y: Math.floor(r / this.columns) * (this.tileheight + this.spacing) + this.margin,
          };
          this.chips[r] = chip;
        }

        //イメージデータ読み込み
        this._loadImage()
          .then(() => resolve());
      });
    },

    //アセットに無いイメージデータを読み込み
    _loadImage: function() {
      return new Promise(resolve => {
        const imageSource = {
          imageName: this.imageName,
          imageUrl: this.path + this.imageName,
          transR: this.transR,
          transG: this.transG,
          transB: this.transB,
        };
        
        let loadImage = null;
        const image = phina.asset.AssetManager.get('image', imageSource.image);
        if (image) {
          this.image = image;
        } else {
          loadImage = imageSource;
        }

        //ロードリスト作成
        const assets = { image: [] };
        assets.image[imageSource.imageName] = imageSource.imageUrl;

        if (loadImage) {
          const loader = phina.asset.AssetLoader();
          loader.load(assets);
          loader.on('load', e => {
            //透過色設定反映
            this.image = phina.asset.AssetManager.get('image', imageSource.imageUrl);
            if (imageSource.transR !== undefined) {
              const r = imageSource.transR;
              const g = imageSource.transG;
              const b = imageSource.transB;
              this.image.filter((pixel, index, x, y, bitmap) => {
                const data = bitmap.data;
                if (pixel[0] == r && pixel[1] == g && pixel[2] == b) {
                    data[index+3] = 0;
                }
              });
            }
            resolve();
          });
        } else {
          resolve();
        }
      });
    },
  });

  //ローダーに追加
  phina.asset.AssetLoader.assetLoadFunctions.tsx = function(key, path) {
    const tsx = phina.asset.TileSet();
    return tsx.load(path);
  };

});
//
// 汎用関数群
//
phina.define("Util", {
  _static: {

    //指定されたオブジェクトをルートとして目的のidを走査する
    findById: function(id, obj) {
      if (obj.id === id) return obj;
      const children = Object.keys(obj.children || {}).map(key => obj.children[key]);
      for (let i = 0; i < children.length; i++) {
        const hit = this.findById(id, children[i]);
        if (hit) return hit;
      }
      return null;
    },

    //TODO:ここじゃない感があるのですが、一旦実装
    //指定されたAとBのassetsの連想配列を新規のオブジェクトにマージする
    mergeAssets: function(assetsA, assetsB) {
      const result = {};
      assetsA.forIn((typeKey, typeValue) => {
        if (!result.$has(typeKey)) result[typeKey] = {};
        typeValue.forIn((assetKey, assetPath) => {
          result[typeKey][assetKey] = assetPath;
        });
      });
      assetsB.forIn((typeKey, typeValue) => {
        if (!result.$has(typeKey)) result[typeKey] = {};
        typeValue.forIn((assetKey, assetPath) => {
          result[typeKey][assetKey] = assetPath;
        });
      });
      return result;
    },

    //現在時間から指定時間までどのくらいかかるかを返却する
    //
    // output : { 
    //   totalDate:0 , 
    //   totalHour:0 , 
    //   totalMinutes:0 , 
    //   totalSeconds:0 ,
    //   date:0 , 
    //   hour:0 , 
    //   minutes:0 , 
    //   seconds:0 
    // }
    //

    calcRemainingTime: function(finish) {
      const now = new Date();
      const result = {
        "totalDate": 0,
        "totalHour": 0,
        "totalMinutes": 0,
        "totalSeconds": 0,
        "date": 0,
        "hour": 0,
        "minutes": 0,
        "seconds": 0,
      }

      finish = (finish instanceof Date) ? finish : new Date(finish);
      let diff = finish - now;
      if (diff === 0) return result;

      const sign = (diff < 0) ? -1 : 1;

      //TODO:この辺りもう少し綺麗に書けないか検討
      //単位別 1未満は0
      result["totalDate"] = parseInt(diff / 1000 / 60 / 60 / 24);
      result["totalHour"] = parseInt(diff / 1000 / 60 / 60);
      result["totalMinutes"] = parseInt(diff / 1000 / 60);
      result["totalSeconds"] = parseInt(diff / 1000);

      diff -= result["totalDate"] * 86400000;
      result["hour"] = parseInt(diff / 1000 / 60 / 60);

      diff -= result["hour"] * 3600000;
      result["minutes"] = parseInt(diff / 1000 / 60);

      diff -= result["minutes"] * 60000;
      result["seconds"] = parseInt(diff / 1000);

      return result;

    },

    //レイアウトエディターではSprite全てAtalsSpriteになってしまうため、
    //Spriteに差し替えられるようにする

    //AtlasSprite自身に単発のImageをセットできるようにする？
    //あとでなにかしら対策しないとだめだが３月納品では一旦これで
    replaceAtlasSpriteToSprite: function(parent, atlasSprite, sprite) {
      const index = parent.getChildIndex(atlasSprite);
      sprite.setOrigin(atlasSprite.originX, atlasSprite.originY);
      sprite.setPosition(atlasSprite.x, atlasSprite.y);
      parent.addChildAt(sprite, index);
      atlasSprite.remove();
      return sprite;
    },
  }
});

/*
 *  phina.xmlloader.js
 *  2019/9/12
 *  @auther minimo  
 *  This Program is MIT license.
 *
 */

phina.namespace(function() {

  phina.define("phina.asset.XMLLoader", {
    superClass: "phina.asset.Asset",

    init: function() {
        this.superInit();
    },

    _load: function(resolve) {
      resolve();
    },

    //XMLプロパティをJSONに変換
    _propertiesToJSON: function(elm) {
      const properties = elm.getElementsByTagName("properties")[0];
      const obj = {};
      if (properties === undefined) return obj;

      for (let k = 0; k < properties.childNodes.length; k++) {
        const p = properties.childNodes[k];
        if (p.tagName === "property") {
          //propertyにtype指定があったら変換
          const type = p.getAttribute('type');
          const value = p.getAttribute('value');
          if (!value) value = p.textContent;
          if (type == "int") {
            obj[p.getAttribute('name')] = parseInt(value, 10);
          } else if (type == "float") {
            obj[p.getAttribute('name')] = parseFloat(value);
          } else if (type == "bool" ) {
            if (value == "true") obj[p.getAttribute('name')] = true;
            else obj[p.getAttribute('name')] = false;
          } else {
            obj[p.getAttribute('name')] = value;
          }
        }
      }
      return obj;
    },

    //XML属性をJSONに変換
    _attrToJSON: function(source) {
      const obj = {};
      for (let i = 0; i < source.attributes.length; i++) {
        let val = source.attributes[i].value;
        val = isNaN(parseFloat(val))? val: parseFloat(val);
        obj[source.attributes[i].name] = val;
      }
      return obj;
    },

    //XML属性をJSONに変換（Stringで返す）
    _attrToJSON_str: function(source) {
      const obj = {};
      for (let i = 0; i < source.attributes.length; i++) {
        const val = source.attributes[i].value;
        obj[source.attributes[i].name] = val;
      }
      return obj;
    },

    //CSVパース
    _parseCSV: function(data) {
      const dataList = data.split(',');
      const layer = [];

      dataList.each(elm => {
        const num = parseInt(elm, 10);
        layer.push(num);
      });

      return layer;
    },

    /**
     * BASE64パース
     * http://thekannon-server.appspot.com/herpity-derpity.appspot.com/pastebin.com/75Kks0WH
     * @private
     */
    _parseBase64: function(data) {
      const dataList = atob(data.trim());
      const rst = [];

      dataList = dataList.split('').map(e => e.charCodeAt(0));

      for (let i = 0, len = dataList.length / 4; i < len; ++i) {
        const n = dataList[i*4];
        rst[i] = parseInt(n, 10);
      }

      return rst;
    },
  });

});
//
// シーンエフェクトの基礎クラス
//
phina.define("SceneEffectBase", {
  superClass: "InputIntercept",

  init: function() {
    this.superInit();
    this.enable();
  },

});

//
// シーンエフェクト：複数の円でフェードインアウト
//
phina.define("SceneEffectCircleFade", {
  superClass: "SceneEffectBase",

  init: function(options) {
    this.options = ({}).$safe(options, SceneEffectCircleFade.defaults);

    this.superInit();
  },

  _createCircle: function() {
    const num = 5;
    const width = SCREEN_WIDTH / num;
    return Array.range((SCREEN_HEIGHT / width) + 1).map(y => {
      return Array.range(num + 1).map(x => {
        return this.addChild(CircleShape({
          x: x * width,
          y: y * width,
          fill: this.options.color,
          stroke: null,
          radius: width * 0.5,
        }));
      });
    });
  },

  begin: function() {
    const circles = this._createCircle();
    const tasks = [];
    circles.forEach((xLine, y) => {
      xLine.forEach((circle, x) => {
        circle.scaleX = 0;
        circle.scaleY = 0;
        tasks.push(new Promise(resolve => {
          circle.tweener.clear()
            .to({
              scaleX: 1.5,
              scaleY: 1.5
            }, 500, "easeOutQuad")
            .call(() => {
              circle.remove();
              circle.destroyCanvas();
              this.children.clear();
              this.disable();
              resolve()
            });
        }));
      });
    });
    return Promise.all(tasks);
  },

  finish: function() {
    this.children.clear();

    const circles = this._createCircle();
    const tasks = [];
    circles.forEach(xLine => {
      xLine.forEach(circle => {
        circle.scaleX = 1.5;
        circle.scaleY = 1.5;
        tasks.push(new Promise(resolve => {
          circle.tweener.clear()
            .to({
              scaleX: 0,
              scaleY: 0
            }, 500, "easeOutQuad")
            .call(() => {
              circle.remove();
              circle.destroyCanvas();
              this.children.clear();
              this.disable();
              resolve();
            });
        }));
      });
    });
    return Promise.all(tasks);
  },

  _static: {
    defaults: {
      color: "white",
    }
  }

});

//
// シーンエフェクト：フェードインアウト
//
phina.define("SceneEffectFade", {
  superClass: "SceneEffectBase",

  init: function(options) {
    this.options = ({}).$safe(options, {
      color: "black",
      time: 500,
    });

    this.superInit();
    this.fromJSON({
      children: {
        fade: {
          className: "RectangleShape",
          arguments: {
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT,
            fill: this.options.color,
            stroke: null,
            padding: 0,
          },
          x: SCREEN_WIDTH * 0.5,
          y: SCREEN_HEIGHT * 0.5,
        },
      }
    });
  },

  stay: function() {
    const fade = this.fade;
    fade.alpha = 1.0;
    return Promise.resolve();
  },

  begin: function() {
    return new Promise(resolve => {
      const fade = this.fade;
      fade.alpha = 1.0;
      fade.tweener.clear()
        .fadeOut(this.options.time)
        .call(() => {
          //1Frame描画されてしまってちらつくのでenterframeで削除
          this.one("enterframe", () => {
            this.fade.remove();
            this.fade.destroyCanvas();
            this.remove()
          });
          resolve();
        });
    });
  },

  finish: function() {
    return new Promise(resolve => {
      const fade = this.fade;
      fade.alpha = 0.0;
      fade.tweener.clear()
        .fadeIn(this.options.time)
        .call(() => {
          this.flare("finish");
          //1Frame描画されてしまってちらつくのでenterframeで削除
          this.one("enterframe", () => {
            this.fade.remove();
            this.fade.destroyCanvas();
            this.remove()
          });
          resolve();
        });
    });
  },

  _static: {
    defaults: {
      color: "black",
    }
  }

});

//
// シーンエフェクト：なにもしない
//
phina.define("SceneEffectNone", {
  superClass: "SceneEffectBase",

  init: function() {
    this.superInit();
  },

  begin: function() {
    return new Promise(resolve => {
      this.one("enterframe", () => this.remove());
      resolve();
    });
  },

  finish: function() {
    return new Promise(resolve => {
      this.one("enterframe", () => this.remove());
      resolve();
    });
  }

});

//
// シーンエフェクト：タイルフェード
//
phina.define("SceneEffectTileFade", {
  superClass: "SceneEffectBase",

  tiles: null,
  num: 15,
  speed: 50,

  init: function(options) {
    this.superInit();
    this.options = ({}).$safe(options, {
      color: "black",
      width: 768,
      height: 1024,
    });

    this.tiles = this._createTiles();
  },

  _createTiles: function() {
    const width = Math.floor(this.options.width / this.num);

    return Array.range((this.options.height / width) + 1).map(y => {
      return Array.range(this.num + 1).map(x => {
        return this.addChild(RectangleShape({
          width: width + 2,
          height: width + 2,
          x: x * width,
          y: y * width,
          fill: this.options.color,
          stroke: null,
          strokeWidth: 0,
        }));
      });
    });
  },

  stay: function() {
    this.tiles.forEach((xline, y) => {
      xline.forEach((tile, x) => {
        tile.scaleX = 1.0;
        tile.scaleY = 1.0;
      });
    });
    return Promise.resolve();
  },

  begin: function() {
    const tasks = [];
    this.tiles.forEach((xline, y) => {
      const w = Math.randfloat(0, 1) * this.speed;
      xline.forEach((tile, x) => {
        tile.scaleX = 1.0;
        tile.scaleY = 1.0;
        tasks.push(new Promise(resolve => {
          tile.tweener.clear()
            .wait(x * this.speed + w)
            .to({
              scaleX: 0,
              scaleY: 0
            }, 500, "easeOutQuad")
            .call(() => {
              tile.remove();
              tile.destroyCanvas();
              resolve()
            });
        }));
      });
    });
    return Promise.all(tasks)
  },

  finish: function() {
    const tasks = [];
    this.tiles.forEach((xline, y) => {
      const w = Math.randfloat(0, 1) * this.speed;
      xline.forEach((tile, x) => {
        tile.scaleX = 0.0;
        tile.scaleY = 0.0;
        tasks.push(new Promise(resolve => {
          tile.tweener.clear()
            .wait((xline.length - x) * this.speed + w)
            .to({
              scaleX: 1,
              scaleY: 1
            }, 500, "easeOutQuad")
            .call(() => {
              tile.remove();
              tile.destroyCanvas();
              resolve()
            });
        }));
      });
    });
    return Promise.all(tasks)
  },

  _static: {
    defaults: {
      color: "black",
    }
  }

});

//
// クリックやタッチをインターセプトする
//
phina.define("InputIntercept", {
  superClass: "DisplayElement",

  init: function() {
    this.superInit();

    this.on("added", () => {
      //親に対して覆いかぶせる
      this.width = this.parent.width;
      this.height = this.parent.height;
      this.originX = this.parent.originX || 0;
      this.originY = this.parent.originY || 0;
      this.x = 0;
      this.y = 0;
    });
    this.disable();
  },

  enable: function() {
    this.setInteractive(true);
  },

  disable: function() {
    this.setInteractive(false);
  },

});

phina.namespace(function() {

  let dummyTexture = null;

  phina.define("SpriteLabel", {
    superClass: "DisplayElement",

    _text: null,
    table: null,
    fixWidth: 0,

    sprites: null,

    init: function(options) {
      if (!dummyTexture) {
        dummyTexture = Canvas().setSize(1, 1);
      }

      this.superInit(options);
      this.table = options.table;
      this.fixWidth = options.fixWidth || 0;

      this.sprites = [];

      this.setText("");
    },

    setText: function(text) {
      this._text = text;

      const chars = this.text.split("");

      if (this.sprites.length < chars.length) {
        Array.range(0, this.sprites.length - chars.length).forEach(() => {
          this.sprites.push(Sprite(dummyTexture));
        });
      } else {
        Array.range(0, chars.length - this.sprites.length).forEach(() => {
          this.sprites.last.remove();
          this.sprites.length -= 1;
        });
      }

      this._text.split("").map((c, i) => {
        this.sprites[i]
          .setImage(this.table[c])
          .setOrigin(this.originX, this.originY)
          .addChildTo(this);
      });

      const totalWidth = this.sprites.reduce((w, s) => w + (this.fixWidth || s.width), 0);
      const totalHeight = this.sprites.map(_ => _.height).sort().last;

      let x = totalWidth * -this.originX;
      this.sprites.forEach((s) => {
        const width = this.fixWidth || s.width;
        s.x = x + width * s.originX;
        x += width;
      });

      return this;
    },

    _accessor: {
      text: {
        get: function() {
          return this._text;
        },
        set: function(v) {
          this.setText(v);
        },
      },
    },

  });

});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCIwMTBfYXBwbGljYXRpb24vQXBwbGljYXRpb24uanMiLCIwMTBfYXBwbGljYXRpb24vQXNzZXRMaXN0LmpzIiwiMDEwX2FwcGxpY2F0aW9uL0Jhc2VEYXRhLmpzIiwiMDEwX2FwcGxpY2F0aW9uL0Jhc2VTY2VuZS5qcyIsIjAxMF9hcHBsaWNhdGlvbi9GaXJzdFNjZW5lRmxvdy5qcyIsIjAyMF9zY2VuZS9NYWluU2NlbmUuanMiLCIwMjBfc2NlbmUvVGl0bGVTY2VuZS5qcyIsIjAzMF9iYXNlL0Jhc2VDaGFyYWN0ZXIuanMiLCIwNDBfZWxlbWVudC9CYWxsb29uLmpzIiwiMDQwX2VsZW1lbnQvSXRlbS5qcyIsIjA0MF9lbGVtZW50L0l0ZW1JbmZvLmpzIiwiMDQwX2VsZW1lbnQvUGxheWVyLmpzIiwiMDQwX2VsZW1lbnQvUGxheWVyQXR0YWNrLmpzIiwiMDQwX2VsZW1lbnQvUGxheWVyRHVtbXkuanMiLCIwNDBfZWxlbWVudC9QbGF5ZXJXZWFwb24uanMiLCIwMDBfY29tbW9uL2FjY2Vzc29yeS9CdXR0b24uanMiLCIwMDBfY29tbW9uL2FjY2Vzc29yeS9DbGlwU3ByaXRlLmpzIiwiMDAwX2NvbW1vbi9hY2Nlc3NvcnkvR2F1Z2UuanMiLCIwMDBfY29tbW9uL2FjY2Vzc29yeS9HcmF5c2NhbGUuanMiLCIwMDBfY29tbW9uL2FjY2Vzc29yeS9Nb3VzZUNoYXNlci5qcyIsIjAwMF9jb21tb24vYWNjZXNzb3J5L011bHRpUmVjdGFuZ2xlQ2xpcC5qcyIsIjAwMF9jb21tb24vYWNjZXNzb3J5L1BpZUNsaXAuanMiLCIwMDBfY29tbW9uL2FjY2Vzc29yeS9SZWN0YW5nbGVDbGlwLmpzIiwiMDAwX2NvbW1vbi9hY2Nlc3NvcnkvVG9nZ2xlLmpzIiwiMDAwX2NvbW1vbi9leHRlbnNpb25zL0Fzc2V0TG9hZGVyLmpzIiwiMDAwX2NvbW1vbi9leHRlbnNpb25zL0Jhc2VBcHAuanMiLCIwMDBfY29tbW9uL2V4dGVuc2lvbnMvQ2FudmFzLmpzIiwiMDAwX2NvbW1vbi9leHRlbnNpb25zL0NhbnZhc1JlbmRlcmVyLmpzIiwiMDAwX2NvbW1vbi9leHRlbnNpb25zL0NoZWNrQnJvd3Nlci5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9EaXNwbGF5RWxlbWVudC5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9EaXNwbGF5U2NlbmUuanMiLCIwMDBfY29tbW9uL2V4dGVuc2lvbnMvRG9tQXVkaW9Tb3VuZC5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9FbGVtZW50LmpzIiwiMDAwX2NvbW1vbi9leHRlbnNpb25zL0lucHV0LmpzIiwiMDAwX2NvbW1vbi9leHRlbnNpb25zL0xhYmVsLmpzIiwiMDAwX2NvbW1vbi9leHRlbnNpb25zL01vdXNlLmpzIiwiMDAwX2NvbW1vbi9leHRlbnNpb25zL09iamVjdDJELmpzIiwiMDAwX2NvbW1vbi9leHRlbnNpb25zL1BsYWluRWxlbWVudC5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9TaGFwZS5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9Tb3VuZC5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9Tb3VuZE1hbmFnZXIuanMiLCIwMDBfY29tbW9uL2V4dGVuc2lvbnMvU3ByaXRlLmpzIiwiMDAwX2NvbW1vbi9leHRlbnNpb25zL1N0cmluZy5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9UZXh0dXJlLmpzIiwiMDAwX2NvbW1vbi9leHRlbnNpb25zL1R3ZWVuZXIuanMiLCIwMDBfY29tbW9uL3V0aWwvQnV0dG9uaXplLmpzIiwiMDAwX2NvbW1vbi91dGlsL1RleHR1cmVVdGlsLmpzIiwiMDAwX2NvbW1vbi91dGlsL1RpbGVkbWFwLmpzIiwiMDAwX2NvbW1vbi91dGlsL1RpbGVzZXQuanMiLCIwMDBfY29tbW9uL3V0aWwvVXRpbC5qcyIsIjAwMF9jb21tb24vdXRpbC94bWxsb2FkZXIuanMiLCIwMDBfY29tbW9uL2VsZW1lbnRzL3NjZW5lRWZmZWN0cy9TY2VuZUVmZmVjdEJhc2UuanMiLCIwMDBfY29tbW9uL2VsZW1lbnRzL3NjZW5lRWZmZWN0cy9TY2VuZUVmZmVjdENpcmNsZUZhZGUuanMiLCIwMDBfY29tbW9uL2VsZW1lbnRzL3NjZW5lRWZmZWN0cy9TY2VuZUVmZmVjdEZhZGUuanMiLCIwMDBfY29tbW9uL2VsZW1lbnRzL3NjZW5lRWZmZWN0cy9TY2VuZUVmZmVjdE5vbmUuanMiLCIwMDBfY29tbW9uL2VsZW1lbnRzL3NjZW5lRWZmZWN0cy9TY2VuZUVmZmVjdFRpbGVGYWRlLmpzIiwiMDAwX2NvbW1vbi9lbGVtZW50cy91aS9JbnB1dEludGVyY2VwdC5qcyIsIjAwMF9jb21tb24vZWxlbWVudHMvdWkvU3ByaXRlTGFiZWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdGZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqICBtYWluLmpzXG4gKi9cblxucGhpbmEuZ2xvYmFsaXplKCk7XG5cbmNvbnN0IERFQlVHX0NPTExJU0lPTiA9IGZhbHNlO1xuXG5jb25zdCBTQ1JFRU5fV0lEVEggPSAxMDI0IC8gMjtcbmNvbnN0IFNDUkVFTl9IRUlHSFQgPSA3NjggLyAyO1xuY29uc3QgU0NSRUVOX1dJRFRIX0hBTEYgPSBTQ1JFRU5fV0lEVEggKiAwLjU7XG5jb25zdCBTQ1JFRU5fSEVJR0hUX0hBTEYgPSBTQ1JFRU5fSEVJR0hUICogMC41O1xuXG5jb25zdCBTQ1JFRU5fT0ZGU0VUX1ggPSAwO1xuY29uc3QgU0NSRUVOX09GRlNFVF9ZID0gMDtcblxuY29uc3QgTlVNX0xBWUVSUyA9IDQ7XG5jb25zdCBMQVRFUl9GT1JFR1JPVU5EID0gMztcbmNvbnN0IExBWUVSX0FDVE9SID0gMjtcbmNvbnN0IExBWUVSX0JBQ0tHUk9VTkQgPSAxO1xuY29uc3QgTEFZRVJfTUFQID0gMDtcblxubGV0IHBoaW5hX2FwcDtcblxud2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICBwaGluYV9hcHAgPSBBcHBsaWNhdGlvbigpO1xuICBwaGluYV9hcHAucmVwbGFjZVNjZW5lKEZpcnN0U2NlbmVGbG93KHt9KSk7XG4gIHBoaW5hX2FwcC5ydW4oKTtcbn07XG5cbi8v44K544Kv44Ot44O844Or56aB5q2iXG4vLyBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBmdW5jdGlvbihlKSB7XG4vLyAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuLy8gfSwgeyBwYXNzaXZlOiBmYWxzZSB9KTtcblxuLy9BbmRyb2lk44OW44Op44Km44K244OQ44OD44Kv44Oc44K/44Oz5Yi25b6hXG4vLyBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiYmFja2J1dHRvblwiLCBmdW5jdGlvbihlKXtcbi8vICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuLy8gfSwgZmFsc2UpOyIsInBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5kZWZpbmUoXCJBcHBsaWNhdGlvblwiLCB7XG4gICAgc3VwZXJDbGFzczogXCJwaGluYS5kaXNwbGF5LkNhbnZhc0FwcFwiLFxuXG4gICAgcXVhbGl0eTogMS4wLFxuICBcbiAgICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuc3VwZXJJbml0KHtcbiAgICAgICAgZnBzOiA2MCxcbiAgICAgICAgd2lkdGg6IFNDUkVFTl9XSURUSCxcbiAgICAgICAgaGVpZ2h0OiBTQ1JFRU5fSEVJR0hULFxuICAgICAgICBmaXQ6IHRydWUsXG4gICAgICB9KTtcbiAgXG4gICAgICAvL+OCt+ODvOODs+OBruW5heOAgemrmOOBleOBruWfuuacrOOCkuioreWumlxuICAgICAgcGhpbmEuZGlzcGxheS5EaXNwbGF5U2NlbmUuZGVmYXVsdHMuJGV4dGVuZCh7XG4gICAgICAgIHdpZHRoOiBTQ1JFRU5fV0lEVEgsXG4gICAgICAgIGhlaWdodDogU0NSRUVOX0hFSUdIVCxcbiAgICAgIH0pO1xuICBcbiAgICAgIHBoaW5hLmlucHV0LklucHV0LnF1YWxpdHkgPSB0aGlzLnF1YWxpdHk7XG4gICAgICBwaGluYS5kaXNwbGF5LkRpc3BsYXlTY2VuZS5xdWFsaXR5ID0gdGhpcy5xdWFsaXR5O1xuXG4gICAgICAvL+OCsuODvOODoOODkeODg+ODieeuoeeQhlxuICAgICAgdGhpcy5nYW1lcGFkTWFuYWdlciA9IHBoaW5hLmlucHV0LkdhbWVwYWRNYW5hZ2VyKCk7XG4gICAgICB0aGlzLmdhbWVwYWQgPSB0aGlzLmdhbWVwYWRNYW5hZ2VyLmdldCgwKTtcbiAgICAgIHRoaXMuY29udHJvbGxlciA9IHt9O1xuXG4gICAgICB0aGlzLnNldHVwRXZlbnRzKCk7XG4gICAgICB0aGlzLnNldHVwU291bmQoKTtcbiAgICAgIHRoaXMuc2V0dXBNb3VzZVdoZWVsKCk7XG5cbiAgICAgIC8v44K344O844Oz44KS6Zui44KM44KL6Zqb44CB44Oc44K/44Oz5ZCM5pmC5oq844GX44OV44Op44Kw44KS6Kej6Zmk44GZ44KLXG4gICAgICB0aGlzLm9uKFwiY2hhbmdlc2NlbmVcIiwgKCkgPT4gQnV0dG9uLmFjdGlvblRhcmdldCA9IG51bGwpO1xuXG4gICAgICAvL+ODkeODg+ODieaDheWgseOCkuabtOaWsFxuICAgICAgdGhpcy5vbignZW50ZXJmcmFtZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmdhbWVwYWRNYW5hZ2VyLnVwZGF0ZSgpO1xuICAgICAgICB0aGlzLnVwZGF0ZUNvbnRyb2xsZXIoKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gIFxuICAgIC8v44Oe44Km44K544Gu44Ob44O844Or44Kk44OZ44Oz44OI6Zai6YCjXG4gICAgc2V0dXBNb3VzZVdoZWVsOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMud2hlZWxEZWx0YVkgPSAwO1xuICAgICAgdGhpcy5kb21FbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXdoZWVsXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB0aGlzLndoZWVsRGVsdGFZID0gZS5kZWx0YVk7XG4gICAgICB9LmJpbmQodGhpcyksIGZhbHNlKTtcbiAgXG4gICAgICB0aGlzLm9uKFwiZW50ZXJmcmFtZVwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5wb2ludGVyLndoZWVsRGVsdGFZID0gdGhpcy53aGVlbERlbHRhWTtcbiAgICAgICAgdGhpcy53aGVlbERlbHRhWSA9IDA7XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgLy/jgqLjg5fjg6rjgrHjg7zjgrfjg6fjg7PlhajkvZPjga7jgqTjg5njg7Pjg4jjg5Xjg4Pjgq9cbiAgICBzZXR1cEV2ZW50czogZnVuY3Rpb24oKSB7fSxcbiAgXG4gICAgc2V0dXBTb3VuZDogZnVuY3Rpb24oKSB7fSxcblxuICAgIHVwZGF0ZUNvbnRyb2xsZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGJlZm9yZSA9IHRoaXMuY29udHJvbGxlcjtcbiAgICAgIGJlZm9yZS5iZWZvcmUgPSBudWxsO1xuXG4gICAgICB2YXIgZ3AgPSB0aGlzLmdhbWVwYWQ7XG4gICAgICB2YXIga2IgPSB0aGlzLmtleWJvYXJkO1xuICAgICAgdmFyIGFuZ2xlMSA9IGdwLmdldEtleUFuZ2xlKCk7XG4gICAgICB2YXIgYW5nbGUyID0ga2IuZ2V0S2V5QW5nbGUoKTtcbiAgICAgIHRoaXMuY29udHJvbGxlciA9IHtcbiAgICAgICAgICBhbmdsZTogYW5nbGUxICE9PSBudWxsPyBhbmdsZTE6IGFuZ2xlMixcblxuICAgICAgICAgIHVwOiBncC5nZXRLZXkoXCJ1cFwiKSB8fCBrYi5nZXRLZXkoXCJ1cFwiKSxcbiAgICAgICAgICBkb3duOiBncC5nZXRLZXkoXCJkb3duXCIpIHx8IGtiLmdldEtleShcImRvd25cIiksXG4gICAgICAgICAgbGVmdDogZ3AuZ2V0S2V5KFwibGVmdFwiKSB8fCBrYi5nZXRLZXkoXCJsZWZ0XCIpLFxuICAgICAgICAgIHJpZ2h0OiBncC5nZXRLZXkoXCJyaWdodFwiKSB8fCBrYi5nZXRLZXkoXCJyaWdodFwiKSxcblxuICAgICAgICAgIGF0dGFjazogZ3AuZ2V0S2V5KFwiQVwiKSB8fCBrYi5nZXRLZXkoXCJYXCIpLFxuICAgICAgICAgIGp1bXA6ICAgZ3AuZ2V0S2V5KFwiWFwiKSB8fCBrYi5nZXRLZXkoXCJaXCIpLFxuICAgICAgICAgIG1lbnU6ICAgZ3AuZ2V0S2V5KFwic3RhcnRcIikgfHwga2IuZ2V0S2V5KFwiZXNjYXBlXCIpLFxuXG4gICAgICAgICAgYTogZ3AuZ2V0S2V5KFwiQVwiKSB8fCBrYi5nZXRLZXkoXCJaXCIpLFxuICAgICAgICAgIGI6IGdwLmdldEtleShcIkJcIikgfHwga2IuZ2V0S2V5KFwiWFwiKSxcbiAgICAgICAgICB4OiBncC5nZXRLZXkoXCJYXCIpIHx8IGtiLmdldEtleShcIkNcIiksXG4gICAgICAgICAgeTogZ3AuZ2V0S2V5KFwiWVwiKSB8fCBrYi5nZXRLZXkoXCJWXCIpLFxuXG4gICAgICAgICAgb2s6IGdwLmdldEtleShcIkFcIikgfHwga2IuZ2V0S2V5KFwiWlwiKSB8fCBrYi5nZXRLZXkoXCJzcGFjZVwiKSB8fCBrYi5nZXRLZXkoXCJyZXR1cm5cIiksXG4gICAgICAgICAgY2FuY2VsOiBncC5nZXRLZXkoXCJCXCIpIHx8IGtiLmdldEtleShcIlhcIikgfHwga2IuZ2V0S2V5KFwiZXNjYXBlXCIpLFxuXG4gICAgICAgICAgc3RhcnQ6IGdwLmdldEtleShcInN0YXJ0XCIpIHx8IGtiLmdldEtleShcInJldHVyblwiKSxcbiAgICAgICAgICBzZWxlY3Q6IGdwLmdldEtleShcInNlbGVjdFwiKSxcblxuICAgICAgICAgIHBhdXNlOiBncC5nZXRLZXkoXCJzdGFydFwiKSB8fCBrYi5nZXRLZXkoXCJlc2NhcGVcIiksXG5cbiAgICAgICAgICBhbmFsb2cxOiBncC5nZXRTdGlja0RpcmVjdGlvbigwKSxcbiAgICAgICAgICBhbmFsb2cyOiBncC5nZXRTdGlja0RpcmVjdGlvbigxKSxcblxuICAgICAgICAgIC8v5YmN44OV44Os44O844Og5oOF5aCxXG4gICAgICAgICAgYmVmb3JlOiBiZWZvcmUsXG4gICAgICB9O1xuICAgIH0sXG4gIH0pO1xufSk7IiwiLypcbiAqICBBc3NldExpc3QuanNcbiAqL1xuXG5waGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZGVmaW5lKFwiQXNzZXRMaXN0XCIsIHtcbiAgICBfc3RhdGljOiB7XG4gICAgICBsb2FkZWQ6IFtdLFxuICAgICAgaXNMb2FkZWQ6IGZ1bmN0aW9uKGFzc2V0VHlwZSkge1xuICAgICAgICByZXR1cm4gQXNzZXRMaXN0LmxvYWRlZFthc3NldFR5cGVdPyB0cnVlOiBmYWxzZTtcbiAgICAgIH0sXG4gICAgICBnZXQ6IGZ1bmN0aW9uKGFzc2V0VHlwZSkge1xuICAgICAgICBBc3NldExpc3QubG9hZGVkW2Fzc2V0VHlwZV0gPSB0cnVlO1xuICAgICAgICBzd2l0Y2ggKGFzc2V0VHlwZSkge1xuICAgICAgICAgIGNhc2UgXCJwcmVsb2FkXCI6XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBpbWFnZToge1xuICAgICAgICAgICAgICAgIFwiYWN0b3I0XCI6IFwiYXNzZXRzL3RleHR1cmVzL2FjdG9yNC5wbmdcIixcbiAgICAgICAgICAgICAgICBcInNoYWRvd1wiOiBcImFzc2V0cy90ZXh0dXJlcy9zaGFkb3cucG5nXCIsXG4gICAgICAgICAgICAgICAgXCJ3ZWFwb25zXCI6IFwiYXNzZXRzL3RleHR1cmVzL3dlYXBvbnMucG5nXCIsXG4gICAgICAgICAgICAgICAgXCJpdGVtXCI6IFwiYXNzZXRzL3RleHR1cmVzL2l0ZW0ucG5nXCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIC8vIHRteDoge1xuICAgICAgICAgICAgICAvLyAgIFwibWFwMVwiOiBcImFzc2V0cy9tYXAvbWFwMi50bXhcIixcbiAgICAgICAgICAgICAgLy8gfSxcbiAgICAgICAgICAgICAgLy8gdHN4OiB7XG4gICAgICAgICAgICAgIC8vICAgXCJ0aWxlX2FcIjogXCJhc3NldHMvbWFwL3RpbGVfYS50c3hcIixcbiAgICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNhc2UgXCJjb21tb25cIjpcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIGltYWdlOiB7XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IFwiaW52YWxpZCBhc3NldFR5cGU6IFwiICsgb3B0aW9ucy5hc3NldFR5cGU7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgfSxcbiAgfSk7XG5cbn0pO1xuIiwiLy/jgqLjgqTjg4bjg6DvvKnvvKRcbmNvbnN0IElURU1fU0hPUlRTV09SRCA9IDA7XG5jb25zdCBJVEVNX0xPTkdTV09SRCA9IDE7XG5jb25zdCBJVEVNX0FYID0gMjtcbmNvbnN0IElURU1fU1BFQVIgPSAzO1xuY29uc3QgSVRFTV9CT1cgPSA0O1xuY29uc3QgSVRFTV9ST0QgPSA1O1xuY29uc3QgSVRFTV9CT09LID0gNjtcbmNvbnN0IElURU1fU0hJRUxEID0gNztcbmNvbnN0IElURU1fQVJNT1IgPSA4O1xuY29uc3QgSVRFTV9IQVQgPSA5O1xuY29uc3QgSVRFTV9CT09UUyA9IDEwO1xuY29uc3QgSVRFTV9HUk9WRSA9IDExO1xuY29uc3QgSVRFTV9SSU5HID0gMTI7XG5jb25zdCBJVEVNX1NDUk9MTCA9IDEzO1xuY29uc3QgSVRFTV9MRVRURVIgPSAxNDtcbmNvbnN0IElURU1fQ0FSRCA9IDE1O1xuY29uc3QgSVRFTV9LRVkgPSAxNjtcbmNvbnN0IElURU1fQ09JTiA9IDE3O1xuY29uc3QgSVRFTV9CQUcgPSAxODtcbmNvbnN0IElURU1fT1JCID0gMTk7XG5jb25zdCBJVEVNX1NUT05FID0gMjA7XG5jb25zdCBJVEVNX0pFV0VMID0gMjE7XG5jb25zdCBJVEVNX0pFV0VMQk9YID0gMjI7XG5jb25zdCBJVEVNX0FQUExFID0gMjQ7XG5jb25zdCBJVEVNX0hBUkIgPSAyNTtcbmNvbnN0IElURU1fTUVBVCA9IDI2O1xuY29uc3QgSVRFTV9QT1RJT04gPSAyNztcbiIsIi8qXG4gKiAgTWFpblNjZW5lLmpzXG4gKiAgMjAxOC8xMC8yNlxuICovXG5cbnBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5kZWZpbmUoXCJCYXNlU2NlbmVcIiwge1xuICAgIHN1cGVyQ2xhc3M6ICdEaXNwbGF5U2NlbmUnLFxuXG4gICAgLy/lu4Pmo4Tjgqjjg6zjg6Hjg7Pjg4hcbiAgICBkaXNwb3NlRWxlbWVudHM6IG51bGwsXG5cbiAgICBpbml0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gKG9wdGlvbnMgfHwge30pLiRzYWZlKHtcbiAgICAgICAgd2lkdGg6IFNDUkVFTl9XSURUSCxcbiAgICAgICAgaGVpZ2h0OiBTQ1JFRU5fSEVJR0hULFxuICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6ICd0cmFuc3BhcmVudCcsXG4gICAgICB9KTtcbiAgICAgIHRoaXMuc3VwZXJJbml0KG9wdGlvbnMpO1xuXG4gICAgICAvL+OCt+ODvOODs+mbouiEseaZgmNhbnZhc+ODoeODouODquino+aUvlxuICAgICAgdGhpcy5kaXNwb3NlRWxlbWVudHMgPSBbXTtcbiAgICAgIHRoaXMub25lKCdkZXN0cm95JywgKCkgPT4ge1xuICAgICAgICB0aGlzLmRpc3Bvc2VFbGVtZW50cy5mb3JFYWNoKGUgPT4ge1xuICAgICAgICAgIGlmIChlLmRlc3Ryb3lDYW52YXMpIHtcbiAgICAgICAgICAgIGUuZGVzdHJveUNhbnZhcygpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZSBpbnN0YW5jZW9mIENhbnZhcykge1xuICAgICAgICAgICAgZS5zZXRTaXplKDAsIDApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5hcHAgPSBwaGluYV9hcHA7XG5cbiAgICAgIC8v5Yil44K344O844Oz44G444Gu56e76KGM5pmC44Gr44Kt44Oj44Oz44OQ44K544KS56C05qOEXG4gICAgICB0aGlzLm9uZSgnZXhpdCcsICgpID0+IHtcbiAgICAgICAgdGhpcy5kZXN0cm95KCk7XG4gICAgICAgIHRoaXMuY2FudmFzLmRlc3Ryb3koKTtcbiAgICAgICAgdGhpcy5mbGFyZSgnZGVzdHJveScpO1xuICAgICAgICBjb25zb2xlLmxvZyhcIkV4aXQgc2NlbmUuXCIpO1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIGRlc3Ryb3k6IGZ1bmN0aW9uKCkge30sXG5cbiAgICBmYWRlSW46IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSAob3B0aW9ucyB8fCB7fSkuJHNhZmUoe1xuICAgICAgICBjb2xvcjogXCJ3aGl0ZVwiLFxuICAgICAgICBtaWxsaXNlY29uZDogNTAwLFxuICAgICAgfSk7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIGNvbnN0IG1hc2sgPSBSZWN0YW5nbGVTaGFwZSh7XG4gICAgICAgICAgd2lkdGg6IFNDUkVFTl9XSURUSCxcbiAgICAgICAgICBoZWlnaHQ6IFNDUkVFTl9IRUlHSFQsXG4gICAgICAgICAgZmlsbDogb3B0aW9ucy5jb2xvcixcbiAgICAgICAgICBzdHJva2VXaWR0aDogMCxcbiAgICAgICAgfSkuc2V0UG9zaXRpb24oU0NSRUVOX1dJRFRIICogMC41LCBTQ1JFRU5fSEVJR0hUICogMC41KS5hZGRDaGlsZFRvKHRoaXMpO1xuICAgICAgICBtYXNrLnR3ZWVuZXIuY2xlYXIoKVxuICAgICAgICAgIC5mYWRlT3V0KG9wdGlvbnMubWlsbGlzZWNvbmQpXG4gICAgICAgICAgLmNhbGwoKCkgPT4ge1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgdGhpcy5hcHAub25lKCdlbnRlcmZyYW1lJywgKCkgPT4gbWFzay5kZXN0cm95Q2FudmFzKCkpO1xuICAgICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIGZhZGVPdXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSAob3B0aW9ucyB8fCB7fSkuJHNhZmUoe1xuICAgICAgICBjb2xvcjogXCJ3aGl0ZVwiLFxuICAgICAgICBtaWxsaXNlY29uZDogNTAwLFxuICAgICAgfSk7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIGNvbnN0IG1hc2sgPSBSZWN0YW5nbGVTaGFwZSh7XG4gICAgICAgICAgd2lkdGg6IFNDUkVFTl9XSURUSCxcbiAgICAgICAgICBoZWlnaHQ6IFNDUkVFTl9IRUlHSFQsXG4gICAgICAgICAgZmlsbDogb3B0aW9ucy5jb2xvcixcbiAgICAgICAgICBzdHJva2VXaWR0aDogMCxcbiAgICAgICAgfSkuc2V0UG9zaXRpb24oU0NSRUVOX1dJRFRIICogMC41LCBTQ1JFRU5fSEVJR0hUICogMC41KS5hZGRDaGlsZFRvKHRoaXMpO1xuICAgICAgICBtYXNrLmFscGhhID0gMDtcbiAgICAgICAgbWFzay50d2VlbmVyLmNsZWFyKClcbiAgICAgICAgICAuZmFkZUluKG9wdGlvbnMubWlsbGlzZWNvbmQpXG4gICAgICAgICAgLmNhbGwoKCkgPT4ge1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgdGhpcy5hcHAub25lKCdlbnRlcmZyYW1lJywgKCkgPT4gbWFzay5kZXN0cm95Q2FudmFzKCkpO1xuICAgICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8v44K344O844Oz6Zui6ISx5pmC44Gr56C05qOE44GZ44KLU2hhcGXjgpLnmbvpjLJcbiAgICByZWdpc3REaXNwb3NlOiBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgICB0aGlzLmRpc3Bvc2VFbGVtZW50cy5wdXNoKGVsZW1lbnQpO1xuICAgIH0sXG4gIH0pO1xuXG59KTsiLCIvKlxuICogIEZpcnN0U2NlbmVGbG93LmpzXG4gKi9cblxucGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuXG4gIHBoaW5hLmRlZmluZShcIkZpcnN0U2NlbmVGbG93XCIsIHtcbiAgICBzdXBlckNsYXNzOiBcIk1hbmFnZXJTY2VuZVwiLFxuXG4gICAgaW5pdDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICBzdGFydExhYmVsID0gb3B0aW9ucy5zdGFydExhYmVsIHx8IFwidGl0bGVcIjtcbiAgICAgIHRoaXMuc3VwZXJJbml0KHtcbiAgICAgICAgc3RhcnRMYWJlbDogc3RhcnRMYWJlbCxcbiAgICAgICAgc2NlbmVzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgbGFiZWw6IFwidGl0bGVcIixcbiAgICAgICAgICAgIGNsYXNzTmFtZTogXCJUaXRsZVNjZW5lXCIsXG4gICAgICAgICAgICBuZXh0TGFiZWw6IFwiaG9tZVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgbGFiZWw6IFwibWFpblwiLFxuICAgICAgICAgICAgY2xhc3NOYW1lOiBcIk1haW5TY2VuZVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG59KTsiLCJwaGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZGVmaW5lKCdNYWluU2NlbmUnLCB7XG4gICAgc3VwZXJDbGFzczogJ0Jhc2VTY2VuZScsXG5cbiAgICBpbml0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICB0aGlzLnN1cGVySW5pdCgpO1xuICAgICAgdGhpcy5zZXR1cCgpO1xuICAgIH0sXG5cbiAgICBzZXR1cDogZnVuY3Rpb24oKSB7XG4gICAgICBjb25zdCBiYWNrID0gUmVjdGFuZ2xlU2hhcGUoeyB3aWR0aDogU0NSRUVOX1dJRFRILCBoZWlnaHQ6IFNDUkVFTl9IRUlHSFQsIGZpbGw6IFwiYmxhY2tcIiB9KVxuICAgICAgICAuc2V0UG9zaXRpb24oU0NSRUVOX1dJRFRIX0hBTEYsIFNDUkVFTl9IRUlHSFRfSEFMRilcbiAgICAgICAgLmFkZENoaWxkVG8odGhpcyk7XG4gICAgICB0aGlzLnJlZ2lzdERpc3Bvc2UoYmFjayk7XG5cbiAgICAgIHRoaXMucGxheWVyID0gUGxheWVyKHRoaXMpXG4gICAgICAgIC5hZGRDaGlsZFRvKHRoaXMpXG4gICAgICAgIC5zZXRQb3NpdGlvbig1MDAsIDEwMCk7XG4gICAgfSxcblxuICAgIHVwZGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgfSxcblxuICB9KTtcblxufSk7XG4iLCIvKlxuICogIFRpdGxlU2NlbmUuanNcbiAqL1xuXG5waGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZGVmaW5lKCdUaXRsZVNjZW5lJywge1xuICAgIHN1cGVyQ2xhc3M6ICdCYXNlU2NlbmUnLFxuXG4gICAgX3N0YXRpYzoge1xuICAgICAgaXNBc3NldExvYWRlZDogZmFsc2UsXG4gICAgfSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgIHRoaXMuc3VwZXJJbml0KCk7XG5cbiAgICAgIHRoaXMucHJvZ3Jlc3MgPSAwO1xuICAgICAgdGhpcy5pc0V4aXQgPSBmYWxzZTtcblxuICAgICAgLy/jg63jg7zjg4nmuIjjgb/jgarjgonjgqLjgrvjg4Pjg4jjg63jg7zjg4njgpLjgZfjgarjgYRcbiAgICAgIGlmIChUaXRsZVNjZW5lLmlzQXNzZXRMb2FkZWQpIHtcbiAgICAgICAgdGhpcy5zZXR1cCgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy9wcmVsb2FkIGFzc2V0XG4gICAgICAgIGNvbnN0IGFzc2V0cyA9IEFzc2V0TGlzdC5nZXQoXCJwcmVsb2FkXCIpXG4gICAgICAgIHRoaXMubG9hZGVyID0gcGhpbmEuYXNzZXQuQXNzZXRMb2FkZXIoKTtcbiAgICAgICAgdGhpcy5sb2FkZXIub24oJ2xvYWQnLCAoKSA9PiB7XG4gICAgICAgICAgdGhpcy5zZXR1cCgpXG4gICAgICAgICAgVGl0bGVTY2VuZS5pc0Fzc2V0TG9hZGVkID0gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubG9hZGVyLmxvYWQoYXNzZXRzKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgc2V0dXA6IGZ1bmN0aW9uKCkge1xuICAgICAgY29uc3QgYmFjayA9IFJlY3RhbmdsZVNoYXBlKHsgd2lkdGg6IFNDUkVFTl9XSURUSCwgaGVpZ2h0OiBTQ1JFRU5fSEVJR0hULCBmaWxsOiBcImJsYWNrXCIgfSlcbiAgICAgICAgLnNldFBvc2l0aW9uKFNDUkVFTl9XSURUSF9IQUxGLCBTQ1JFRU5fSEVJR0hUX0hBTEYpXG4gICAgICAgIC5hZGRDaGlsZFRvKHRoaXMpO1xuICAgICAgdGhpcy5yZWdpc3REaXNwb3NlKGJhY2spO1xuXG4gICAgICBjb25zdCBsYWJlbCA9IExhYmVsKHsgdGV4dDogXCJUaXRsZVNjZW5lXCIsIGZpbGw6IFwid2hpdGVcIiB9KVxuICAgICAgICAuc2V0UG9zaXRpb24oU0NSRUVOX1dJRFRIX0hBTEYsIFNDUkVFTl9IRUlHSFRfSEFMRilcbiAgICAgICAgLmFkZENoaWxkVG8odGhpcyk7XG4gICAgICB0aGlzLnJlZ2lzdERpc3Bvc2UobGFiZWwpO1xuXG4gICAgICBiYWNrLnNldEludGVyYWN0aXZlKHRydWUpO1xuICAgICAgYmFjay5vbigncG9pbnRlbmQnLCAoKSA9PiB0aGlzLmV4aXQoXCJtYWluXCIpKTtcblxuICAgICAgLy/jgqLjgrvjg4Pjg4jlvozlh6bnkIZcbiAgICAgIGNvbnN0IGFzc2V0cyA9IEFzc2V0TGlzdC5nZXQoXCJwcmVsb2FkXCIpO1xuICAgICAgYXNzZXRzLmltYWdlLmZvckluKGtleSA9PiB7XG4gICAgICAgIGlmIChwaGluYS5hc3NldC5Bc3NldE1hbmFnZXIuZ2V0KFwiaW1hZ2VcIiwga2V5ICsgXCJfbWFza1wiKSkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IHRleCA9IHBoaW5hLmFzc2V0LkFzc2V0TWFuYWdlci5nZXQoXCJpbWFnZVwiLCBrZXkpLmNsb25lKCk7XG4gICAgICAgIHRleC5maWx0ZXIoIGZ1bmN0aW9uKHBpeGVsLCBpbmRleCwgeCwgeSwgYml0bWFwKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gYml0bWFwLmRhdGE7XG4gICAgICAgICAgICBkYXRhW2luZGV4ICsgMF0gPSAwO1xuICAgICAgICAgICAgZGF0YVtpbmRleCArIDFdID0gMDtcbiAgICAgICAgICAgIGRhdGFbaW5kZXggKyAyXSA9IDA7XG4gICAgICAgIH0pO1xuICAgICAgICBwaGluYS5hc3NldC5Bc3NldE1hbmFnZXIuc2V0KFwiaW1hZ2VcIiwga2V5ICsgXCJfbWFza1wiLCB0ZXgpO1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIHVwZGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoIVRpdGxlU2NlbmUuaXNBc3NldExvYWRlZCB8fCB0aGlzLmlzRXhpdCkgcmV0dXJuO1xuICAgICAgdmFyIGtiID0gcGhpbmFfYXBwLmtleWJvYXJkO1xuICAgICAgaWYgKGtiLmdldEtleShcInNwYWNlXCIpIHx8IGtiLmdldEtleShcInpcIikpIHtcbiAgICAgICAgdGhpcy5pc0V4aXQgPSB0cnVlO1xuICAgICAgICB0aGlzLmV4aXQoXCJtYWluXCIpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgfSk7XG5cbn0pO1xuIiwicGhpbmEuZGVmaW5lKFwiQmFzZUNoYXJhY3RlclwiLCB7XG4gICAgc3VwZXJDbGFzczogXCJwaGluYS5kaXNwbGF5LkRpc3BsYXlFbGVtZW50XCIsXG5cbiAgICAvL+ODnuODg+ODl+OCquODluOCuOOCp+OCr+ODiElEXG4gICAgaWQ6IC0xLFxuXG4gICAgLy/liqDpgJ/luqZcbiAgICB2eDogMCxcbiAgICB2eTogMCxcblxuICAgIC8v5Yid5pyf5bqn5qiZXG4gICAgZmlyc3RYOiAwLFxuICAgIGZpcnN0WTogMCxcblxuICAgIC8v6YeN5Yqb5Yqg6YCf5bqmXG4gICAgZ3Jhdml0eTogMC40NSxcblxuICAgIC8v5qiq56e75YuV5rib6KGw546HXG4gICAgZnJpY3Rpb246IDAuNSxcblxuICAgIC8v5bqK56e75YuV5rib6KGw546HXG4gICAgZmxvb3JGcmljdGlvbjogMC41LFxuXG4gICAgLy/jgrjjg6Pjg7Pjg5fliptcbiAgICBqdW1wUG93ZXI6IDYsXG5cbiAgICAvL+WPjeeZuuS/guaVsFxuICAgIHJlYm91bmQ6IDAsXG5cbiAgICAvL+W6iuS4iuODleODqeOCsFxuICAgIGlzT25GbG9vcjogZmFsc2UsXG5cbiAgICAvL+S5l+OBo+OBpuOBhOOCi+OCquODluOCuOOCp+OCr+ODiFxuICAgIGZsb29yT2JqZWN0OiBudWxsLFxuXG4gICAgLy/mrbvkuqHjg5Xjg6njgrBcbiAgICBpc0RlYWQ6IGZhbHNlLFxuXG4gICAgLy/okL3kuIvmrbvkuqHjg5Xjg6njgrBcbiAgICBpc0Ryb3A6IGZhbHNlLFxuXG4gICAgLy/msJfntbbjg5Xjg6njgrBcbiAgICBpc1N0dW46IGZhbHNlLFxuXG4gICAgLy/mk43kvZzlgZzmraLmmYLplpNcbiAgICBzdG9wVGltZTogMCxcblxuICAgIC8v54Sh5pW144OV44Op44KwXG4gICAgaXNNdXRla2k6IGZhbHNlLFxuXG4gICAgLy/nhKHmlbXmmYLplpNcbiAgICBtdXRla2lUaW1lOiAwLFxuXG4gICAgLy/jgqLjg4vjg6Hjg7zjgrfjg6fjg7Pjg5Xjg6njgrBcbiAgICBpc0FuaW1hdGlvbjogdHJ1ZSxcblxuICAgIC8v54++5Zyo5a6f6KGM5Lit44Ki44Kv44K344On44OzXG4gICAgbm93QW5pbWF0aW9uOiBcInN0YW5kXCIsXG5cbiAgICAvL+WJjeODleODrOODvOODoOWun+ihjOOCouOCr+OCt+ODp+ODs1xuICAgIGJlZm9yZUFuaW1hdGlvbjogXCJcIixcblxuICAgIC8v44Ki44OL44Oh44O844K344On44Oz6YCy6KGM5Y+v6IO944OV44Op44KwXG4gICAgaXNBZHZhbmNlQW5pbWF0aW9uOiB0cnVlLFxuXG4gICAgLy/jgqLjg4vjg6Hjg7zjgrfjg6fjg7PlpInmm7TmpJznn6Xjg5Xjg6njgrBcbiAgICBpc0NoYW5nZUFuaW1hdGlvbjogZmFsc2UsXG5cbiAgICAvL+OCouODi+ODoeODvOOCt+ODp+ODs+mWk+malFxuICAgIGFuaW1hdGlvbkludGVydmFsOiA2LFxuXG4gICAgLy/lnLDlvaLnhKHoppZcbiAgICBpZ25vcmVDb2xsaXNpb246IGZhbHNlLFxuXG4gICAgLy/jgrnjgq/jg6rjg7zjg7PlhoXjg5Xjg6njgrBcbiAgICBvblNjcmVlbjogZmFsc2UsXG5cbiAgICAvL+a0u+WLleODleODqeOCsFxuICAgIGlzQWN0aXZlOiB0cnVlLFxuXG4gICAgLy/lvbHooajnpLpcbiAgICBpc1NoYWRvdzogZmFsc2UsXG4gICAgc2hhZG93WTogMCxcblxuICAgIC8v6K2Y5Yil44OV44Op44KwXG4gICAgaXNQbGF5ZXI6IGZhbHNlLFxuICAgIGlzRW5lbXk6IGZhbHNlLFxuICAgIGlzSXRlbUJveDogZmFsc2UsXG4gICAgaXNJdGVtOiBmYWxzZSxcbiAgICBpc0Jsb2NrOiBmYWxzZSxcbiAgICBpc01hcEFjY2Vzc29yeTogZmFsc2UsXG5cbiAgICAvL+e1jOmBjuODleODrOODvOODoFxuICAgIHRpbWU6IDAsXG5cbiAgICBpbml0OiBmdW5jdGlvbihwYXJlbnRTY2VuZSwgb3B0aW9ucykge1xuICAgICAgICB0aGlzLnN1cGVySW5pdChvcHRpb25zKTtcbiAgICAgICAgdGhpcy5wYXJlbnRTY2VuZSA9IHBhcmVudFNjZW5lO1xuICAgICAgICB0aGlzLmJvdW5kaW5nVHlwZSA9IFwicmVjdFwiO1xuICAgICAgICB0aGlzLnR3ZWVuZXIuc2V0VXBkYXRlVHlwZSgnZnBzJyk7XG5cbiAgICAgICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgdGhpcy5zZXR1cEFuaW1hdGlvbigpO1xuXG4gICAgICAgIHRoaXMuaWQgPSBvcHRpb25zLmlkIHx8IC0xO1xuXG4gICAgICAgIHRoaXMub24oJ2VudGVyZnJhbWUnLCAoKSA9PiB0aGlzLmRlZmF1bHRVcGFkYXRlKCkpO1xuICAgIH0sXG5cbiAgICAvL+S4gOWbnuebruOBrmVudGVyZnJhbWXjgafkuIDluqbjgaDjgZHlkbzjgbDjgozjgotcbiAgICBmaXJzdEZyYW1lOiBmdW5jdGlvbigpIHt9LFxuXG4gICAgZGVmYXVsdFVwYWRhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvL+a0u+WLleODleODqeOCsFxuICAgICAgICBpZiAoIXRoaXMuaXNBY3RpdmUpIHJldHVybjtcblxuICAgICAgICB0aGlzLnggKz0gdGhpcy52eDtcbiAgICAgICAgaWYgKHRoaXMuaXNPbkZsb29yKSB7XG4gICAgICAgICAgICB0aGlzLnZ4ICo9IHRoaXMuZmxvb3JGcmljdGlvbjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMudnggKj0gdGhpcy5mcmljdGlvbjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMueSArPSB0aGlzLnZ5O1xuICAgICAgICB0aGlzLnZ5ICs9IHRoaXMuZ3Jhdml0eTtcbiAgICAgICAgLy/okL3kuIvpgJ/luqbkuIrpmZBcbiAgICAgICAgaWYgKHRoaXMudnkgPiAyMCkgdGhpcy52eSA9IDIwO1xuXG4gICAgICAgIGlmIChNYXRoLmFicyh0aGlzLnZ4KSA8IDAuMDEpIHRoaXMudnggPSAwO1xuICAgICAgICBpZiAoTWF0aC5hYnModGhpcy52eSkgPCAwLjAxKSB0aGlzLnZ5ID0gMDtcblxuICAgICAgICBpZiAodGhpcy55ID4gMzAwKSB7XG4gICAgICAgICAgICB0aGlzLmlzT25GbG9vciA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLmlzSnVtcCA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy52eSA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICAvL+OCouODi+ODoeODvOOCt+ODp+ODs1xuICAgICAgICBpZiAodGhpcy5zcHJpdGUgJiYgdGhpcy5pc0FuaW1hdGlvbiAmJiB0aGlzLmlzQWR2YW5jZUFuaW1hdGlvbiAmJiB0aGlzLnRpbWUgJSB0aGlzLmFuaW1hdGlvbkludGVydmFsID09IDApIHtcbiAgICAgICAgICAgIHRoaXMuaW5kZXggPSAodGhpcy5pbmRleCArIDEpICUgdGhpcy5mcmFtZVt0aGlzLm5vd0FuaW1hdGlvbl0ubGVuZ3RoO1xuICAgICAgICAgICAgLy/mrKHjg5Xjg6zjg7zjg6Dnlarlj7fjgYznibnmrormjIflrprjga7loLTlkIhcbiAgICAgICAgICAgIHZhciBuZXh0ID0gdGhpcy5mcmFtZVt0aGlzLm5vd0FuaW1hdGlvbl1bdGhpcy5pbmRleF07XG4gICAgICAgICAgICBpZiAobmV4dCA9PSBcInN0b3BcIikge1xuICAgICAgICAgICAgICAgIC8v5YGc5q2iXG4gICAgICAgICAgICAgICAgdGhpcy5pbmRleC0tO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChuZXh0ID09IFwicmVtb3ZlXCIpIHtcbiAgICAgICAgICAgICAgICAvL+ODquODoOODvOODllxuICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBuZXh0ID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgLy/mjIflrprjgqLjg4vjg6Hjg7zjgrfjg6fjg7PjgbjlpInmm7RcbiAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbihuZXh0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zcHJpdGUuZnJhbWVJbmRleCA9IG5leHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnRpbWUrKztcbiAgICAgICAgdGhpcy5iZWZvcmVBbmltYXRpb24gPSB0aGlzLm5vd0FuaW1hdGlvbjtcbiAgICB9LFxuXG4gICAgc2V0dXBBbmltYXRpb246IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnNwY2lhbEFuaW1hdGlvbiA9IGZhbHNlO1xuICAgICAgICB0aGlzLmZyYW1lID0gW107XG4gICAgICAgIHRoaXMuZnJhbWVbXCJzdGFuZFwiXSA9IFsxMywgMTRdO1xuICAgICAgICB0aGlzLmZyYW1lW1wianVtcFwiXSA9IFswLCBcInN0b3BcIl07XG4gICAgICAgIHRoaXMuZnJhbWVbXCJ3YWxrXCJdID0gWzBdO1xuICAgICAgICB0aGlzLmZyYW1lW1widXBcIl0gPSAgIFswXTtcbiAgICAgICAgdGhpcy5mcmFtZVtcImRvd25cIl0gPSBbMF07XG4gICAgICAgIHRoaXMuZnJhbWVbXCJhdHRhY2tcIl0gPSBbMCwgXCJzdG9wXCJdO1xuICAgICAgICB0aGlzLmluZGV4ID0gMDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIHNldEFuaW1hdGlvbjogZnVuY3Rpb24oYW5pbU5hbWUpIHtcbiAgICAgICAgaWYgKCF0aGlzLmZyYW1lW2FuaW1OYW1lXSkgcmV0dXJuO1xuICAgICAgICBpZiAoYW5pbU5hbWUgPT0gdGhpcy5ub3dBbmltYXRpb24pIHJldHVybjtcbiAgICAgICAgdGhpcy5ub3dBbmltYXRpb24gPSBhbmltTmFtZTtcbiAgICAgICAgdGhpcy5pbmRleCA9IC0xO1xuICAgICAgICB0aGlzLmlzQ2hhbmdlQW5pbWF0aW9uID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxufSk7XG4iLCJwaGluYS5kZWZpbmUoXCJCYWxsb29uXCIsIHtcbiAgICBzdXBlckNsYXNzOiBcInBoaW5hLmRpc3BsYXkuU3ByaXRlXCIsXG5cbiAgICAvL+Wvv+WRveODleODrOODvOODoFxuICAgIGxpZmVTcGFuOiAzMCxcblxuICAgIC8v44Ki44OL44Oh44O844K344On44Oz6ZaT6ZqUXG4gICAgYW5pbWF0aW9uSW50ZXJ2YWw6IDYsXG5cblxuICAgIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5zdXBlckluaXQoXCJiYWxsb29uXCIsIDI0LCAzMik7XG5cbiAgICAgICAgdGhpcy5wYXR0ZXJuID0gb3B0aW9ucy5wYXR0ZXJuIHx8IFwiIVwiO1xuICAgICAgICB0aGlzLnNldEFuaW1hdGlvbih0aGlzLnBhdHRlcm4pO1xuXG4gICAgICAgIHRoaXMubGlmZVNwYW4gPSBvcHRpb25zLmxpZmVTcGFuIHx8IDYwO1xuICAgICAgICB0aGlzLmFuaW1hdGlvbkludGVydmFsID0gb3B0aW9ucy5hbmltYXRpb25JbnRlcnZhbCB8fCA2O1xuICAgICAgICB0aGlzLnRpbWUgPSAwO1xuXG4gICAgICAgIC8v54m55q6K44OR44K/44O844OzXG4gICAgICAgIGlmICh0aGlzLnBhdHRlcm4gPT0gXCJhbmdlcjJcIikge1xuICAgICAgICAgICAgdGhpcy50d2VlbmVyLnNldFVwZGF0ZVR5cGUoJ2ZwcycpLmNsZWFyKCkuYnkoe3k6IC0xNiwgYWxwaGE6IC0xfSwgdGhpcy5hbmltYXRpb25JbnRlcnZhbCwgXCJlYXNlSW5TaW5lXCIpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHVwZGF0ZSA6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy50aW1lICUgdGhpcy5hbmltYXRpb25JbnRlcnZhbCA9PSAwKSB0aGlzLmZyYW1lSW5kZXgrKztcblxuICAgICAgICB0aGlzLnRpbWUrKztcbiAgICAgICAgaWYgKHRoaXMudGltZSA+IHRoaXMubGlmZVNwYW4pIHRoaXMucmVtb3ZlKCk7XG4gICAgfSxcblxuICAgIHNldEFuaW1hdGlvbjogZnVuY3Rpb24ocGF0dGVybikge1xuICAgICAgICBzd2l0Y2ggKHBhdHRlcm4pIHtcbiAgICAgICAgICAgIGNhc2UgXCIuLi5cIjpcbiAgICAgICAgICAgICAgICB0aGlzLnNldEZyYW1lVHJpbW1pbmcoMCwgMCwgMjQsIDEyOCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiP1wiOlxuICAgICAgICAgICAgICAgIHRoaXMuc2V0RnJhbWVUcmltbWluZyg5NiwgMzIsIDI0LCAzMik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiIVwiOlxuICAgICAgICAgICAgICAgIHRoaXMuc2V0RnJhbWVUcmltbWluZyg3MiwgNjQsIDcyLCAzMik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwienp6XCI6XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRGcmFtZVRyaW1taW5nKDAsIDAsIDI0LCAzMik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwic3R1blwiOlxuICAgICAgICAgICAgICAgIHRoaXMuc2V0RnJhbWVUcmltbWluZygxNDQsIDMyLCA0OCwgMzIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImxpZ2h0XCI6XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRGcmFtZVRyaW1taW5nKDE0NCwgNjQsIDQ4LCAzMik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwibmV3dHlwZVwiOlxuICAgICAgICAgICAgICAgIHRoaXMuc2V0RnJhbWVUcmltbWluZygxNDQsIDk2LCA3MiwgMzIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImFuZ2VyXCI6XG4gICAgICAgICAgICBjYXNlIFwiYW5nZXIxXCI6XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRGcmFtZVRyaW1taW5nKDcyLCA5NiwgMjQsIDMyKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJhbmdlcjJcIjpcbiAgICAgICAgICAgICAgICB0aGlzLnNldEZyYW1lVHJpbW1pbmcoMTQ0LCAxMjgsIDcyLCAzMik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9LFxufSk7XG4iLCJwaGluYS5kZWZpbmUoXCJJdGVtXCIsIHtcbiAgICBzdXBlckNsYXNzOiBcIkJhc2VDaGFyYWN0ZXJcIixcblxuICAgIC8v6K2Y5Yil44OV44Op44KwXG4gICAgaXNJdGVtOiB0cnVlLFxuXG4gICAgLy/jgqLjgqTjg4bjg6DnqK7liKVcbiAgICBraW5kOiAwLFxuXG4gICAgLy/jgqLjgqTjg4bjg6Djg6zjg5njg6tcbiAgICBsZXZlbDogMCxcblxuICAgIC8v5o2o44Gm44Ki44Kk44OG44OgXG4gICAgdGhyb3dBd2F5OiBmYWxzZSxcblxuICAgIC8v5aSn44G+44GL44Gq56iu5Yil44OV44Op44KwXG4gICAgaXNXZWFwb246IGZhbHNlLFxuICAgIGlzRXF1aXA6IGZhbHNlLFxuICAgIGlzRm9vZDogZmFsc2UsXG4gICAgaXNJdGVtOiBmYWxzZSxcbiAgICBpc0tleTogZmFsc2UsXG5cbiAgICAvL+aVteODieODreODg+ODl+OCouOCpOODhuODoOODleODqeOCsFxuICAgIGlzRW5lbXlEcm9wOiBmYWxzZSxcblxuICAgIC8v44Ki44Kk44OG44Og5oOF5aCxXG4gICAgc3RhdHVzOiBudWxsLFxuXG4gICAgLy/lj43nmbrkv4LmlbBcbiAgICByZWJvdW5kOiAwLjMsXG5cbiAgICAvL+OCouODi+ODoeODvOOCt+ODp+ODs+mAsuihjOWPr+iDveODleODqeOCsCAgIFxuICAgIGlzQWR2YW5jZUFuaW1hdGlvbjogZmFsc2UsXG5cbiAgICAvL+W9seihqOekuuODleODqeOCsFxuICAgIGlzU2hhZG93OiBmYWxzZSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uKHBhcmVudFNjZW5lLCBvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuc3VwZXJJbml0KHBhcmVudFNjZW5lLCB7d2lkdGg6IDE2LCBoZWlnaHQ6IDE2fSk7XG5cbiAgICAgICAgLy/jgqLjgqTjg4bjg6Djg6zjg5njg6tcbiAgICAgICAgdGhpcy5sZXZlbCA9IDA7XG4gICAgICAgIHRoaXMua2luZCA9IG51bGw7XG4gICAgICAgIGlmIChvcHRpb25zLnByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIHRoaXMubGV2ZWwgPSBvcHRpb25zLnByb3BlcnRpZXMubGV2ZWwgfHwgMDtcbiAgICAgICAgICAgIHRoaXMua2luZCA9IG9wdGlvbnMucHJvcGVydGllcy5raW5kO1xuICAgICAgICB9XG4gICAgICAgIGlmIChvcHRpb25zLmtpbmQgIT09IHVuZGVmaW5lZCkgdGhpcy5raW5kID0gb3B0aW9ucy5raW5kO1xuXG4gICAgICAgIC8v44Ki44Kk44OG44Og56iu5YilXG4gICAgICAgIGlmICh0aGlzLmtpbmQgPT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMubmFtZSA9PSBcImZvb2RcIikge1xuICAgICAgICAgICAgICAgIHRoaXMua2luZCA9IElURU1fQVBQTEUgKyB0aGlzLmxldmVsO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IFwiSVRFTV9cIitvcHRpb25zLm5hbWUudG9VcHBlckNhc2UoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmtpbmQgPSBldmFsKG5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aGlzLmtpbmQgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIHZhciBuYW1lID0gXCJJVEVNX1wiK3RoaXMua2luZC50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAgICAgdGhpcy5raW5kID0gZXZhbChuYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8v44Ki44Kk44OG44Og44K544OG44O844K/44K55Y+W5b6XXG4gICAgICAgIHRoaXMuJGV4dGVuZChJdGVtSW5mby5nZXQodGhpcy5raW5kKSk7XG5cbiAgICAgICAgLy/jgqLjgqTjg4bjg6Djgrnjg5fjg6njgqTjg4hcbiAgICAgICAgaWYgKHRoaXMuaXNXZWFwb24pIHtcbiAgICAgICAgICAgIC8v5q2m5Zmo44Gu5aC05ZCIXG4gICAgICAgICAgICB2YXIgaW5kZXggPSB0aGlzLmtpbmQgKiAxMCArIE1hdGgubWluKHRoaXMubGV2ZWwsIHRoaXMubWF4SW5kZXgpO1xuICAgICAgICAgICAgdGhpcy5zcHJpdGUgPSBwaGluYS5kaXNwbGF5LlNwcml0ZShcIndlYXBvbnNcIiwgMjQsIDI0KS5hZGRDaGlsZFRvKHRoaXMpLnNldEZyYW1lSW5kZXgoaW5kZXgpO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5sZXZlbCA+IDApIHtcbiAgICAgICAgICAgICAgICAvL+W8t+WMluODrOODmeODq+ihqOekulxuICAgICAgICAgICAgICAgIHZhciBsYWJlbFBhcmFtID0ge1xuICAgICAgICAgICAgICAgICAgICBmaWxsOiBcIndoaXRlXCIsXG4gICAgICAgICAgICAgICAgICAgIHN0cm9rZTogXCJibGFja1wiLFxuICAgICAgICAgICAgICAgICAgICBzdHJva2VXaWR0aDogMixcblxuICAgICAgICAgICAgICAgICAgICBmb250RmFtaWx5OiBcIk9yYml0cm9uXCIsXG4gICAgICAgICAgICAgICAgICAgIGFsaWduOiBcImNlbnRlclwiLFxuICAgICAgICAgICAgICAgICAgICBiYXNlbGluZTogXCJtaWRkbGVcIixcbiAgICAgICAgICAgICAgICAgICAgZm9udFNpemU6IDEwLFxuICAgICAgICAgICAgICAgICAgICBmb250V2VpZ2h0OiAnJ1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcGhpbmEuZGlzcGxheS5MYWJlbCh7dGV4dDogXCIrXCIrdGhpcy5sZXZlbH0uJHNhZmUobGFiZWxQYXJhbSkpLnNldFBvc2l0aW9uKDYsIDYpLmFkZENoaWxkVG8odGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNwcml0ZSA9IHBoaW5hLmRpc3BsYXkuU3ByaXRlKFwiaXRlbVwiLCAyNCwgMjQpLmFkZENoaWxkVG8odGhpcykuc2V0RnJhbWVJbmRleCh0aGlzLmtpbmQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy/lr7/lkb1cbiAgICAgICAgdGhpcy5saWZlU3BhbiA9IDE1MDtcblxuICAgICAgICAvL+OCouOCr+ODhuOCo+ODluODleODqeOCsFxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmFjdGl2ZSA9PT0gdW5kZWZpbmVkIHx8IHRoaXMub3B0aW9ucy5hY3RpdmUgPT0gdHJ1ZSkge1xuICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm9uKCdlbnRlcmZyYW1lJywgZSA9PiB7XG4gICAgICAgICAgICAvL+ODl+ODrOOCpOODpOODvOOBqOOBruW9k+OBn+OCiuWIpOWumlxuICAgICAgICAgICAgdmFyIHBsID0gdGhpcy5wYXJlbnRTY2VuZS5wbGF5ZXI7XG4gICAgICAgICAgICBpZiAodGhpcy5oaXRUZXN0RWxlbWVudChwbCkpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lID4gMTAgJiYgIXRoaXMudGhyb3dBd2F5KSB7XG4gICAgICAgICAgICAgICAgICAgIHBsLmdldEl0ZW0odGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLnRpbWUgPiAzMCAmJiB0aGlzLnRocm93QXdheSkgdGhpcy50aHJvd0F3YXkgPSBmYWxzZTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNFbmVteURyb3ApIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5saWZlU3BhbiA9PSAwKSB0aGlzLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmxpZmVTcGFuIDwgMzApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGltZSAlIDIgPT0gMCkgdGhpcy52aXNpYmxlID0gIXRoaXMudmlzaWJsZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMubGlmZVNwYW4gPCA2MCl7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRpbWUgJSA1ID09IDApIHRoaXMudmlzaWJsZSA9ICF0aGlzLnZpc2libGU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmxpZmVTcGFuIDwgOTApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGltZSAlIDEwID09IDApIHRoaXMudmlzaWJsZSA9ICF0aGlzLnZpc2libGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMubGlmZVNwYW4tLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbn0pO1xuIiwicGhpbmEuZGVmaW5lKFwiSXRlbUluZm9cIiwge1xuICBfc3RhdGljOiB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uKGtpbmQpIHtcbiAgICAgICAgICBzd2l0Y2ggKGtpbmQpIHtcbiAgICAgICAgICAgICAgY2FzZSBcInNob3J0c3dvcmRcIjpcbiAgICAgICAgICAgICAgY2FzZSBJVEVNX1NIT1JUU1dPUkQ6XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiU0hPUlQgU1dPUkRcIixcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcInN3b3JkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgaXNXZWFwb246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgaXNTbGFzaDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBwb3dlcjogMTAsXG4gICAgICAgICAgICAgICAgICAgICAgc3R1blBvd2VyOiAxLFxuICAgICAgICAgICAgICAgICAgICAgIG1heEluZGV4OiAwLFxuICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogMTQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogMzBcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjYXNlIFwibG9uZ3N3b3JkXCI6XG4gICAgICAgICAgICAgIGNhc2UgSVRFTV9MT05HU1dPUkQ6XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiTE9ORyBTV09SRFwiLFxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwic3dvcmRcIixcbiAgICAgICAgICAgICAgICAgICAgICBpc1dlYXBvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBpc1NsYXNoOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIHBvd2VyOiAxNSxcbiAgICAgICAgICAgICAgICAgICAgICBzdHVuUG93ZXI6IDUsXG4gICAgICAgICAgICAgICAgICAgICAgbWF4SW5kZXg6IDcsXG4gICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiAyNCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAyNVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGNhc2UgXCJheFwiOlxuICAgICAgICAgICAgICBjYXNlIElURU1fQVg6XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiQVhcIixcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImF4XCIsXG4gICAgICAgICAgICAgICAgICAgICAgaXNXZWFwb246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgaXNTbGFzaDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBpc0Jyb3c6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgcG93ZXI6IDIwLFxuICAgICAgICAgICAgICAgICAgICAgIHN0dW5Qb3dlcjogMjAsXG4gICAgICAgICAgICAgICAgICAgICAgbWF4SW5kZXg6IDQsXG4gICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiAxNCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAyNlxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGNhc2UgXCJzcGVhclwiOlxuICAgICAgICAgICAgICBjYXNlIElURU1fU1BFQVI6XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiU1BFQVJcIixcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcInNwZWFyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgaXNXZWFwb246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgaXNTdGluZzogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBwb3dlcjogMTAsXG4gICAgICAgICAgICAgICAgICAgICAgc3R1blBvd2VyOiAxLFxuICAgICAgICAgICAgICAgICAgICAgIG1heEluZGV4OiA0LFxuICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogMzksXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogMTBcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjYXNlIFwiYm93XCI6XG4gICAgICAgICAgICAgIGNhc2UgSVRFTV9CT1c6XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiQk9XXCIsXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJib3dcIixcbiAgICAgICAgICAgICAgICAgICAgICBpc1dlYXBvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBpc0Jyb3c6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgcG93ZXI6IDUsXG4gICAgICAgICAgICAgICAgICAgICAgc3R1blBvd2VyOiA1LFxuICAgICAgICAgICAgICAgICAgICAgIG1heEluZGV4OiAwLFxuICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogMjAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogMTBcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjYXNlIFwicm9kXCI6XG4gICAgICAgICAgICAgIGNhc2UgSVRFTV9ST0Q6XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiTUFHSUMgUk9EXCIsXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJyb2RcIixcbiAgICAgICAgICAgICAgICAgICAgICBpc1dlYXBvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBpc0Jyb3c6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgaXNGaXJlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIHBvd2VyOiA1LFxuICAgICAgICAgICAgICAgICAgICAgIHN0dW5Qb3dlcjogMTAsXG4gICAgICAgICAgICAgICAgICAgICAgbWF4SW5kZXg6IDcsXG4gICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiAyMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAxMFxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGNhc2UgXCJib29rXCI6XG4gICAgICAgICAgICAgIGNhc2UgSVRFTV9CT09LOlxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIkJPT0tcIixcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImJvb2tcIixcbiAgICAgICAgICAgICAgICAgICAgICBpc1dlYXBvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBpc0Jyb3c6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgaXNIb2x5OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIHBvd2VyOiAxMCxcbiAgICAgICAgICAgICAgICAgICAgICBzdHVuUG93ZXI6IDQwLFxuICAgICAgICAgICAgICAgICAgICAgIG1heEluZGV4OiAwLFxuICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogMjAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogMjBcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjYXNlIFwic2hpZWxkXCI6XG4gICAgICAgICAgICAgIGNhc2UgSVRFTV9TSElFTEQ6XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiU0hJRUxEXCIsXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJlcXVpcFwiLFxuICAgICAgICAgICAgICAgICAgICAgIGlzRXF1aXA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgcG93ZXI6IDIwLFxuICAgICAgICAgICAgICAgICAgICAgIHBvaW50OiAxMDAwLFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgY2FzZSBcImFybW9yXCI6XG4gICAgICAgICAgICAgIGNhc2UgSVRFTV9BUk1PUjpcbiAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJBUk1PUlwiLFxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiZXF1aXBcIixcbiAgICAgICAgICAgICAgICAgICAgICBpc0VxdWlwOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIHBvd2VyOiAzMCxcbiAgICAgICAgICAgICAgICAgICAgICBwb2ludDogNTAwMCxcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGNhc2UgXCJoYXRcIjpcbiAgICAgICAgICAgICAgY2FzZSBJVEVNX0hBVDpcbiAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJIQVRcIixcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImVxdWlwXCIsXG4gICAgICAgICAgICAgICAgICAgICAgaXNFcXVpcDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBwb3dlcjogMTAsXG4gICAgICAgICAgICAgICAgICAgICAgcG9pbnQ6IDMwMCxcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGNhc2UgXCJib290c1wiOlxuICAgICAgICAgICAgICBjYXNlIElURU1fQk9PVFM6XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiQk9PVFNcIixcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImVxdWlwXCIsXG4gICAgICAgICAgICAgICAgICAgICAgaXNFcXVpcDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBwb3dlcjogMTAsXG4gICAgICAgICAgICAgICAgICAgICAgcG9pbnQ6IDUwMCxcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGNhc2UgXCJncm92ZVwiOlxuICAgICAgICAgICAgICBjYXNlIElURU1fR1JPVkU6XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiR1JPVkVcIixcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImVxdWlwXCIsXG4gICAgICAgICAgICAgICAgICAgICAgaXNFcXVpcDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBwb3dlcjogMTAsXG4gICAgICAgICAgICAgICAgICAgICAgcG9pbnQ6IDUwMCxcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGNhc2UgXCJyaW5nXCI6XG4gICAgICAgICAgICAgIGNhc2UgSVRFTV9SSU5HOlxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIlJJTkdcIixcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImVxdWlwXCIsXG4gICAgICAgICAgICAgICAgICAgICAgaXNFcXVpcDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBwb3dlcjogMjAsXG4gICAgICAgICAgICAgICAgICAgICAgcG9pbnQ6IDMwMDAsXG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjYXNlIFwic2Nyb2xsXCI6XG4gICAgICAgICAgICAgIGNhc2UgSVRFTV9TQ1JPTEw6XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiU0NST0xMXCIsXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJpdGVtXCIsXG4gICAgICAgICAgICAgICAgICAgICAgaXNJdGVtOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIHBvaW50OiAxMDAwLFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgY2FzZSBcImxldHRlclwiOlxuICAgICAgICAgICAgICBjYXNlIElURU1fTEVUVEVSOlxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIkxFVFRFUlwiLFxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiaXRlbVwiLFxuICAgICAgICAgICAgICAgICAgICAgIGlzSXRlbTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBwb2ludDogMTAwLFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgY2FzZSBcImNhcmRcIjpcbiAgICAgICAgICAgICAgY2FzZSBJVEVNX0NBUkQ6XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiQ0FSRFwiLFxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiaXRlbVwiLFxuICAgICAgICAgICAgICAgICAgICAgIGlzSXRlbTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBwb2ludDogMTAwMCxcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGNhc2UgXCJrZXlcIjpcbiAgICAgICAgICAgICAgY2FzZSBJVEVNX0tFWTpcbiAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJLRVlcIixcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImtleVwiLFxuICAgICAgICAgICAgICAgICAgICAgIGlzS2V5OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIHBvaW50OiAyMDAwLFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgY2FzZSBcImNvaW5cIjpcbiAgICAgICAgICAgICAgY2FzZSBJVEVNX0NPSU46XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiQ09JTlwiLFxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiaXRlbVwiLFxuICAgICAgICAgICAgICAgICAgICAgIGlzSXRlbTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBwb2ludDogNTAwLFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgY2FzZSBcImJhZ1wiOlxuICAgICAgICAgICAgICBjYXNlIElURU1fQkFHOlxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIkJBR1wiLFxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiaXRlbVwiLFxuICAgICAgICAgICAgICAgICAgICAgIGlzSXRlbTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBwb2ludDogMTAwMCxcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGNhc2UgXCJvcmJcIjpcbiAgICAgICAgICAgICAgY2FzZSBJVEVNX09SQjpcbiAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJPUkJcIixcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIml0ZW1cIixcbiAgICAgICAgICAgICAgICAgICAgICBpc0l0ZW06IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgcG9pbnQ6IDUwMDAsXG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjYXNlIFwic3RvbmVcIjpcbiAgICAgICAgICAgICAgY2FzZSBJVEVNX1NUT05FOlxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIlNUT05FXCIsXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJpdGVtXCIsXG4gICAgICAgICAgICAgICAgICAgICAgaXNJdGVtOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIHBvaW50OiAyMDAwLFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgY2FzZSBcImpld2VsXCI6XG4gICAgICAgICAgICAgIGNhc2UgSVRFTV9KRVdFTDpcbiAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJKRVdFTFwiLFxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiaXRlbVwiLFxuICAgICAgICAgICAgICAgICAgICAgIGlzSXRlbTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBwb2ludDogNTAwMCxcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGNhc2UgXCJqZXdlbGJveFwiOlxuICAgICAgICAgICAgICBjYXNlIElURU1fSkVXRUxCT1g6XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiSkVXRUxCT1hcIixcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIml0ZW1cIixcbiAgICAgICAgICAgICAgICAgICAgICBpc0l0ZW06IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgcG9pbnQ6IDEwMDAwLFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgY2FzZSBcImFwcGxlXCI6XG4gICAgICAgICAgICAgIGNhc2UgSVRFTV9BUFBMRTpcbiAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJBUFBMRVwiLFxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiZm9vZFwiLFxuICAgICAgICAgICAgICAgICAgICAgIGlzRm9vZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBwb3dlcjogMjAsXG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjYXNlIFwiaGFyYlwiOlxuICAgICAgICAgICAgICBjYXNlIElURU1fSEFSQjpcbiAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJIQVJCXCIsXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJmb29kXCIsXG4gICAgICAgICAgICAgICAgICAgICAgaXNGb29kOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgIHBvd2VyOiA0MCxcbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGNhc2UgXCJtZWF0XCI6XG4gICAgICAgICAgICAgIGNhc2UgSVRFTV9NRUFUOlxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIk1FQVRcIixcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImZvb2RcIixcbiAgICAgICAgICAgICAgICAgICAgICBpc0Zvb2Q6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgcG93ZXI6IDYwLFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgY2FzZSBcInBvdGlvblwiOlxuICAgICAgICAgICAgICBjYXNlIElURU1fUE9USU9OOlxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIlBPVElPTlwiLFxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiZm9vZFwiLFxuICAgICAgICAgICAgICAgICAgICAgIGlzRm9vZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICBwb3dlcjogMTAwLFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgICB9XG4gICAgICB9LFxuICB9LFxufSk7XG5cbiIsInBoaW5hLmRlZmluZShcIlBsYXllclwiLCB7XG4gICAgc3VwZXJDbGFzczogXCJCYXNlQ2hhcmFjdGVyXCIsXG5cbiAgICAvL+itmOWIpeODleODqeOCsFxuICAgIGlzUGxheWVyOiB0cnVlLFxuXG4gICAgLy/jg6rjg6Ljg7zjg4jlgbTjg5fjg6zjgqTjg6Tjg7zjg5Xjg6njgrBcbiAgICBpc1JlbW90ZVBsYXllcjogZmFsc2UsXG5cbiAgICAvL+acgOWkp+ODkuODg+ODiOODneOCpOODs+ODiFxuICAgIGhwTWF4OiAxMDAsXG5cbiAgICAvL+ODkuODg+ODiOODneOCpOODs+ODiFxuICAgIGhwOiAxMDAsXG5cbiAgICAvL+aUu+aSg+WKm1xuICAgIHBvd2VyOiAxMCxcblxuICAgIC8v5rCX57W256K6546HXG4gICAgc3R1blBvd2VyOiAxLFxuXG4gICAgLy/pmLLlvqHliptcbiAgICBkZWZlbnNlOiAxMCxcblxuICAgIC8v56e75YuV6YCf5bqmXG4gICAgc3BlZWQ6IDMsXG5cbiAgICAvL+eZu+WdgumAn+W6plxuICAgIHNwZWVkQXNjZW5kOiA0LFxuXG4gICAgLy/jgrjjg6Pjg7Pjg5fliptcbiAgICBqdW1wUG93ZXI6IDgsXG5cbiAgICAvL+WkmuauteOCuOODo+ODs+ODl+WPr+iDveWbnuaVsFxuICAgIG51bUp1bXA6IDAsXG4gICAgbnVtSnVtcE1heDogMixcblxuICAgIC8v5pON5L2c5Y+v6IO944OV44Op44KwXG4gICAgaXNDb250cm9sOiB0cnVlLFxuXG4gICAgLy/mlLvmkoPkuK3jg5Xjg6njgrBcbiAgICBpc0F0dGFjazogZmFsc2UsXG5cbiAgICAvL+WJjeODleODrOODvOODoOOBruaDheWgsVxuICAgIGJlZm9yZToge1xuICAgICAgICAvL+aTjeS9nOezu1xuICAgICAgICB1cDogZmFsc2UsXG4gICAgICAgIGRvd246IGZhbHNlLFxuICAgICAgICBhdHRhY2s6IGZhbHNlLFxuICAgICAgICBqdW1wOiBmYWxzZSxcbiAgICAgICAgY2hhbmdlOiBmYWxzZSxcbiAgICAgICAgaXNTdHVuOiBmYWxzZSxcbiAgICAgICAgaXNPbkZsb29yOiBmYWxzZSxcbiAgICAgICAgeDogMCxcbiAgICAgICAgeTogMCxcbiAgICB9LFxuXG4gICAgaW5pdDogZnVuY3Rpb24ocGFyZW50U2NlbmUpIHtcbiAgICAgICAgdGhpcy5zdXBlckluaXQocGFyZW50U2NlbmUsIHt3aWR0aDogMTYsIGhlaWdodDogMjB9KTtcblxuICAgICAgICAvL+OCueODl+ODqeOCpOODiOiDjOW+jFxuICAgICAgICB0aGlzLmJhY2sgPSBwaGluYS5kaXNwbGF5LkRpc3BsYXlFbGVtZW50KCkuYWRkQ2hpbGRUbyh0aGlzKS5zZXRTY2FsZSgtMSwgMSk7XG5cbiAgICAgICAgLy/ooajnpLrnlKjjgrnjg5fjg6njgqTjg4hcbiAgICAgICAgdGhpcy5zcHJpdGUgPSBwaGluYS5kaXNwbGF5LlNwcml0ZShcImFjdG9yNFwiLCAzMiwgMzIpLmFkZENoaWxkVG8odGhpcykuc2V0RnJhbWVJbmRleCgwKTtcbiAgICAgICAgdGhpcy5zcHJpdGUuc2NhbGVYID0gLTE7XG5cbiAgICAgICAgLy/mrablmajnlKjjgrnjg5fjg6njgqTjg4hcbiAgICAgICAgdGhpcy53ZWFwb24gPSBwaGluYS5kaXNwbGF5LlNwcml0ZShcIndlYXBvbnNcIiwgMjQsIDI0KVxuICAgICAgICAgICAgLmFkZENoaWxkVG8odGhpcy5iYWNrKVxuICAgICAgICAgICAgLnNldEZyYW1lSW5kZXgoMClcbiAgICAgICAgICAgIC5zZXRPcmlnaW4oMSwgMSlcbiAgICAgICAgICAgIC5zZXRQb3NpdGlvbigzLCAzKTtcbiAgICAgICAgdGhpcy53ZWFwb24uYWxwaGEgPSAwO1xuICAgICAgICB0aGlzLndlYXBvbi50d2VlbmVyLnNldFVwZGF0ZVR5cGUoJ2ZwcycpO1xuICAgICAgICB0aGlzLndlYXBvbi50eXBlID0gXCJzd29yZFwiO1xuXG4gICAgICAgIC8v5pS75pKD5Yik5a6a55SoXG4gICAgICAgIHRoaXMuYXR0YWNrQ29sbGlzaW9uID0gcGhpbmEuZGlzcGxheS5SZWN0YW5nbGVTaGFwZSh7d2lkdGg6IDE0LCBoZWlnaHQ6IDI2fSk7XG5cbiAgICAgICAgLy/lvZPjgZ/jgorliKTlrprjg4fjg5Djg4PjgrDnlKhcbiAgICAgICAgaWYgKERFQlVHX0NPTExJU0lPTikge1xuICAgICAgICAgICAgdGhpcy5vbmUoJ2VudGVyZnJhbWUnLCBlID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmF0dGFja0NvbGxpc2lvbi5hZGRDaGlsZFRvKHRoaXMucGFyZW50U2NlbmUucGxheWVyTGF5ZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNrQ29sbGlzaW9uLmFscGhhID0gMC4zO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLm9uKCdyZW1vdmVkJywgZSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5hdHRhY2tDb2xsaXNpb24ucmVtb3ZlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8v5Yid5pyf44Ki44OL44Oh44O844K344On44Oz6Kit5a6aXG4gICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKFwid2Fsa1wiKTtcbiAgICAgICAgdGhpcy5iZWZvcmVBbmltYXRpb24gPSBcIlwiO1xuXG4gICAgICAgIC8v5q275Lqh5pmC44Kz44O844Or44OQ44OD44KvXG4gICAgICAgIHRoaXMub24oJ2RlYWQnLCAoKSA9PiB0aGlzLnBhcmVudFNjZW5lLmZsYXJlKCdnYW1lb3ZlcicpKTtcblxuICAgICAgICAvL+acgOW+jOOBq+W6iuS4iuOBq+OBhOOBn+WgtOaJgOOCkuS/neWtmFxuICAgICAgICB0aGlzLmxhc3RPbkZsb29yWCA9IDA7XG4gICAgICAgIHRoaXMubGFzdE9uRmxvb3JZID0gMDtcblxuICAgICAgICB0aGlzLnJlc2V0KCk7XG4gICAgfSxcblxuICAgIHVwZGF0ZTogZnVuY3Rpb24oYXBwKSB7XG4gICAgICAgIGlmICh0aGlzLnBhcmVudFNjZW5lLnBhdXNlU2NlbmUpIHJldHVybjtcblxuICAgICAgICAvL+ODl+ODrOOCpOODpOODvOaTjeS9nFxuICAgICAgICBsZXQgY3QgPSBhcHAuY29udHJvbGxlcjtcblxuICAgICAgICBpZiAoIXRoaXMuaXNDb250cm9sKSBjdCA9IHt9O1xuICAgICAgICBpZiAodGhpcy5zdG9wVGltZSA9PSAwKSB7XG4gICAgICAgICAgICAvL+W3puenu+WLlVxuICAgICAgICAgICAgaWYgKGN0LmxlZnQgJiYgIWN0LmRvd24pIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaXNKdW1wICYmICF0aGlzLmlzQXR0YWNrICYmICF0aGlzLmlzQ2F0Y2hMYWRkZXIpIHRoaXMuc2V0QW5pbWF0aW9uKFwid2Fsa1wiKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNjYWxlWCA9IC0xO1xuICAgICAgICAgICAgICAgIHRoaXMudnggPSAtdGhpcy5zcGVlZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8v5Y+z56e75YuVXG4gICAgICAgICAgICBpZiAoY3QucmlnaHQgJiYgIWN0LmRvd24pIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaXNKdW1wICYmICF0aGlzLmlzQXR0YWNrICYmICF0aGlzLmlzQ2F0Y2hMYWRkZXIpIHRoaXMuc2V0QW5pbWF0aW9uKFwid2Fsa1wiKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNjYWxlWCA9IDE7XG4gICAgICAgICAgICAgICAgdGhpcy52eCA9IHRoaXMuc3BlZWQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8v44K444Oj44Oz44OX44Oc44K/44Oz44Gu44G/XG4gICAgICAgICAgICBpZiAoY3QuanVtcCAmJiAhY3QudXApIHtcbiAgICAgICAgICAgICAgICAvL+OCuOODo+ODs+ODl+S6jOauteebruS7pemZjVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzSnVtcCAmJiB0aGlzLm51bUp1bXAgPCB0aGlzLm51bUp1bXBNYXggJiYgdGhpcy52eSA+IC01KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudnkgPSAtdGhpcy5qdW1wUG93ZXI7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubnVtSnVtcCsrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvL+OCuOODo+ODs+ODl1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5pc0p1bXAgJiYgdGhpcy5pc09uRmxvb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oXCJqdW1wXCIpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmlzSnVtcCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudnkgPSAtdGhpcy5qdW1wUG93ZXI7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubnVtSnVtcCA9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy/kuIrjgq3jg7zmirzkuItcbiAgICAgICAgICAgIGlmIChjdC51cCkge1xuICAgICAgICAgICAgICAgIC8v44K444Oj44Oz44OX5LqM5q6155uu5Lul6ZmNXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNKdW1wICYmIHRoaXMubnVtSnVtcCA8IHRoaXMubnVtSnVtcE1heCAmJiB0aGlzLnZ5ID4gLSh0aGlzLmp1bXBQb3dlciAvIDIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudnkgPSAtdGhpcy5qdW1wUG93ZXI7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubnVtSnVtcCsrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvL+OCuOODo+ODs+ODl1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5pc0p1bXAgJiYgdGhpcy5pc09uRmxvb3IgJiYgIXRoaXMuaXNPbkxhZGRlcikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbihcImp1bXBcIik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNKdW1wID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy52eSA9IC10aGlzLmp1bXBQb3dlcjtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5udW1KdW1wID0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvL+aUu+aSg1xuICAgICAgICBpZiAoIXRoaXMuaXNBdHRhY2spIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzT25GbG9vcikge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLm5vd0FuaW1hdGlvbiAhPSBcImRhbWFnZVwiICYmICF0aGlzLmlzRGVmZW5zZSkgdGhpcy5zZXRBbmltYXRpb24oXCJ3YWxrXCIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlzQ2F0Y2hMYWRkZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoY3QudXApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oXCJ1cFwiKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGN0LmRvd24pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNPblN0YWlycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oXCJkb3duXCIpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oXCJ1cFwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmlzU3R1biAmJiAhdGhpcy5pc0RlYWQpIHRoaXMuc2V0QW5pbWF0aW9uKFwianVtcFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjdC5hdHRhY2sgJiYgIXRoaXMuYmVmb3JlLmF0dGFjayAmJiB0aGlzLnN0b3BUaW1lID09IDAgJiYgISh0aGlzLmlzQ2F0Y2hMYWRkZXIgJiYgdGhpcy5pc09uTGFkZGVyKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNDYXRjaExhZGRlciA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKFwiYXR0YWNrXCIpO1xuICAgICAgICAgICAgICAgIHRoaXMud2VhcG9uQXR0YWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvL+atu+S6oeeKtuaFi1xuICAgICAgICBpZiAodGhpcy5pc0RlYWQpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKFwiZGVhZFwiKTtcbiAgICAgICAgICAgIHRoaXMuaXNDYXRjaExhZGRlciA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy/jgqLjg4vjg6Hjg7zjgrfjg6fjg7PlpInmm7TjgpLmpJznn6VcbiAgICAgICAgaWYgKHRoaXMubm93QW5pbWF0aW9uICE9IHRoaXMuYmVmb3JlQW5pbWF0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWUgPSAwO1xuICAgICAgICAgICAgdGhpcy5pc0FkdmFuY2VBbmltYXRpb24gPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5hbmltYXRpb25JbnRlcnZhbCA9IDEyO1xuICAgICAgICAgICAgaWYgKHRoaXMubm93QW5pbWF0aW9uID09IFwiYXR0YWNrXCIpIHRoaXMuYW5pbWF0aW9uSW50ZXJ2YWwgPSA0O1xuICAgICAgICAgICAgaWYgKHRoaXMubm93QW5pbWF0aW9uID09IFwiZGVmZW5zZVwiKSB0aGlzLmFuaW1hdGlvbkludGVydmFsID0gMjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8v5q2p6KGM44Ki44OL44Oh44O844K344On44Oz44Gu5aC05ZCI44Gv56e75YuV44GX44Gm44GE44KL5pmC44Gu44G/6YCy44KB44KLXG4gICAgICAgICAgICBpZiAodGhpcy5ub3dBbmltYXRpb24gPT0gXCJ3YWxrXCIgJiYgIWN0LmxlZnQgJiYgIWN0LnJpZ2h0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0FkdmFuY2VBbmltYXRpb24gPSBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0FkdmFuY2VBbmltYXRpb24gPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMubm93QW5pbWF0aW9uID09IFwidXBcIiB8fCB0aGlzLm5vd0FuaW1hdGlvbiA9PSBcImRvd25cIikge1xuICAgICAgICAgICAgICAgIGlmIChjdC51cCB8fCBjdC5kb3duIHx8IGN0LmxlZnQgfHwgY3QucmlnaHQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0FkdmFuY2VBbmltYXRpb24gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNBZHZhbmNlQW5pbWF0aW9uID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy/mlLvmkoPliKTlrprov73lvpNcbiAgICAgICAgdGhpcy5hdHRhY2tDb2xsaXNpb24ueCA9IHRoaXMueCArIHRoaXMuc2NhbGVYICogMTI7XG4gICAgICAgIHRoaXMuYXR0YWNrQ29sbGlzaW9uLnkgPSB0aGlzLnk7XG5cbiAgICAgICAgLy/jgrPjg7Pjg4jjg63jg7zjg6nku5bmg4XloLHkv53lrZhcbiAgICAgICAgdGhpcy5iZWZvcmUudXAgPSBjdC51cDtcbiAgICAgICAgdGhpcy5iZWZvcmUuZG93biA9IGN0LmRvd247XG4gICAgICAgIHRoaXMuYmVmb3JlLmF0dGFjayA9IGN0LmF0dGFjaztcbiAgICAgICAgdGhpcy5iZWZvcmUuanVtcCA9IGN0LnVwIHx8IGN0Lmp1bXA7XG4gICAgICAgIHRoaXMuYmVmb3JlLmNoYW5nZSA9IGN0LmNoYW5nZTtcbiAgICAgICAgdGhpcy5iZWZvcmUuaXNTdHVuID0gdGhpcy5pc1N0dW47XG4gICAgICAgIHRoaXMuYmVmb3JlLmluT25GbG9vciA9IHRoaXMuaXNPbkZsb29yO1xuICAgICAgICB0aGlzLmJlZm9yZS54ID0gdGhpcy54O1xuICAgICAgICB0aGlzLmJlZm9yZS55ID0gdGhpcy55O1xuICAgIH0sXG5cbiAgICAvL+ODl+ODrOOCpOODpOODvOaDheWgseODquOCu+ODg+ODiFxuICAgIHJlc2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy/np7vli5Xmg4XloLFcbiAgICAgICAgdGhpcy52eCA9IDA7XG4gICAgICAgIHRoaXMudnkgPSAwO1xuXG4gICAgICAgIC8v44K544OG44O844K/44K5XG4gICAgICAgIHRoaXMuaHAgPSB0aGlzLmhwTWF4O1xuXG4gICAgICAgIC8v5ZCE56iu44OV44Op44KwXG4gICAgICAgIHRoaXMuaXNKdW1wID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaXNEZWFkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaXNDYXRjaExhZGRlciA9IGZhbHNlO1xuICAgICAgICB0aGlzLmlzRHJvcCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmlzT25GbG9vciA9IGZhbHNlO1xuICAgICAgICB0aGlzLmlzQWR2YW5jZUFuaW1hdGlvbiA9IHRydWU7XG4gICAgICAgIHRoaXMuaWdub3JlQ29sbGlzaW9uID0gZmFsc2U7XG5cbiAgICAgICAgLy/ntYzpgY7mmYLplpPns7tcbiAgICAgICAgdGhpcy5tdXRla2lUaW1lID0gMDtcbiAgICAgICAgdGhpcy5zdG9wVGltZSA9IDA7XG4gICAgICAgIHRoaXMuZG93bkZyYW1lID0gMDtcbiAgICAgICAgdGhpcy50aW1lID0gMDtcblxuICAgICAgICAvL+OCouODi+ODoeODvOOCt+ODp+ODs1xuICAgICAgICB0aGlzLnNldEFuaW1hdGlvbihcIndhbGtcIik7XG4gICAgICAgIHRoaXMuYmVmb3JlQW5pbWF0aW9uID0gXCJcIjtcbiAgICAgICAgdGhpcy5hbmltYXRpb25JbnRlcnZhbCA9IDEyO1xuXG4gICAgICAgIC8v5omA5oyB6KOF5YKZXG4gICAgICAgIHRoaXMuZXF1aXAgPSB7XG4gICAgICAgICAgICB1c2luZzogMCwgICAgICAgICAvL+ePvuWcqOS9v+eUqOS4re+8iHdlYXBvbnPjga5pbmRleO+8iVxuICAgICAgICAgICAgd2VhcG9uczogWzBdLCAgICAgLy/miYDmjIHjg6rjgrnjg4jvvIjmnIDlpKfvvJPvvIlcbiAgICAgICAgICAgIGxldmVsOiBbMF0sICAgICAgIC8v5q2m5Zmo44Os44OZ44OrXG4gICAgICAgICAgICBzd2l0Y2hPazogdHJ1ZSwgICAvL+WkieabtOWPr+iDveODleODqeOCsFxuICAgICAgICB9O1xuXG4gICAgICAgIC8v5q2m5Zmo44K744OD44OIXG4gICAgICAgIHRoaXMuc2V0V2VhcG9uKHRoaXMuZXF1aXAud2VhcG9uc1t0aGlzLmVxdWlwLnVzaW5nXSk7XG5cbiAgICAgICAgLy/miYDmjIHjgqLjgqTjg4bjg6BcbiAgICAgICAgdGhpcy5pdGVtcyA9IFtdO1xuXG4gICAgICAgIC8v5omA5oyB44Kv44Oq44Ki5p2h5Lu244Kt44O8XG4gICAgICAgIHRoaXMua2V5cyA9IFtdO1xuXG4gICAgICAgIC8v5pON5L2c5Y+v6IO944OV44Op44KwXG4gICAgICAgIHRoaXMuaXNDb250cm9sID0gdHJ1ZTtcblxuICAgICAgICAvL+WkmuauteOCuOODo+ODs+ODl+acgOWkp+WbnuaVsFxuICAgICAgICB0aGlzLm51bUp1bXBNYXggPSAwO1xuXG4gICAgICAgIC8v44OA44Of44O844K544OX44Op44Kk44OI6Zmk5Y67XG4gICAgICAgIGlmICh0aGlzLmR1bW15KSB7XG4gICAgICAgICAgICB0aGlzLmR1bW15LnJlbW92ZSgpO1xuICAgICAgICAgICAgdGhpcy5kdW1teSA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLy/mrablmajlpInmm7RcbiAgICBzZXRXZWFwb246IGZ1bmN0aW9uKGtpbmQsIGxldmVsKSB7XG4gICAgICAgIGtpbmQgPSBraW5kIHx8IDA7XG4gICAgICAgIGxldmVsID0gbGV2ZWwgfHwgMDtcblxuICAgICAgICAvL+WxnuaAp+WIneacn+WMllxuICAgICAgICB0aGlzLmF0dGFja0NvbGxpc2lvbi4kZXh0ZW5kKHtcbiAgICAgICAgICAgIGlzU2xhc2g6IGZhbHNlLFxuICAgICAgICAgICAgaXNTdGluZzogZmFsc2UsXG4gICAgICAgICAgICBpc0Jsb3c6IGZhbHNlLFxuICAgICAgICAgICAgaXNBcnJvdzogZmFsc2UsXG4gICAgICAgICAgICBpc0ZpcmU6IGZhbHNlLFxuICAgICAgICAgICAgaXNJY2U6IGZhbHNlLFxuICAgICAgICAgICAgc3R1blBvd2VyOiAxLFxuICAgICAgICB9KTtcblxuICAgICAgICAvL+OCouOCpOODhuODoOaDheWgseWPluW+l1xuICAgICAgICB2YXIgc3BlYyA9IEl0ZW1JbmZvLmdldChraW5kKTtcbiAgICAgICAgdGhpcy5hdHRhY2tDb2xsaXNpb24uJGV4dGVuZChzcGVjKTtcbiAgICAgICAgdGhpcy5hdHRhY2tDb2xsaXNpb24ucG93ZXIgKz0gbGV2ZWwgKiAoc3BlYy5sZXZlbEJvbnVzIHx8IDIpO1xuXG4gICAgICAgIHN3aXRjaCAoa2luZCkge1xuICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgIC8v44K344On44O844OI44K944O844OJXG4gICAgICAgICAgICAgICAgbGV2ZWwgPSAwO1xuICAgICAgICAgICAgICAgIHRoaXMuZnJhbWVbXCJhdHRhY2tcIl0gPSBbIDQxLCA0MiwgNDMsIDQ0LCBcInN0b3BcIl07XG4gICAgICAgICAgICAgICAgdGhpcy53ZWFwb24uc2V0UG9zaXRpb24oLTMsIDMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgIC8v44Ot44Oz44Kw44K944O844OJXG4gICAgICAgICAgICAgICAgdGhpcy5mcmFtZVtcImF0dGFja1wiXSA9IFsgNDEsIDQyLCA0MywgNDQsIFwic3RvcFwiXTtcbiAgICAgICAgICAgICAgICB0aGlzLndlYXBvbi5zZXRQb3NpdGlvbigtMywgMyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgLy/mlqdcbiAgICAgICAgICAgICAgICB0aGlzLmZyYW1lW1wiYXR0YWNrXCJdID0gWyA0NCwgNDQsIDQ0LCA0MywgNDMsIDQzLCA0MiwgNDIsIDQyLCA0MSwgNDEsIDQxLCBcInN0b3BcIl07XG4gICAgICAgICAgICAgICAgdGhpcy53ZWFwb24uc2V0UG9zaXRpb24oLTMsIDMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgICAgIC8v5qeNXG4gICAgICAgICAgICAgICAgdGhpcy5mcmFtZVtcImF0dGFja1wiXSA9IFsgNDEsIDQyLCA0MywgNDQsIFwic3RvcFwiXTtcbiAgICAgICAgICAgICAgICB0aGlzLndlYXBvbi5zZXRQb3NpdGlvbigwLCAwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNDpcbiAgICAgICAgICAgICAgICAvL+W8k1xuICAgICAgICAgICAgICAgIGxldmVsID0gMDtcbiAgICAgICAgICAgICAgICB0aGlzLmZyYW1lW1wiYXR0YWNrXCJdID0gWyA0MSwgNDIsIDQzLCA0NCwgXCJzdG9wXCJdO1xuICAgICAgICAgICAgICAgIHRoaXMud2VhcG9uLnNldFBvc2l0aW9uKDAsIDApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA1OlxuICAgICAgICAgICAgICAgIC8v6a2U5rOV44Gu5p2WXG4gICAgICAgICAgICAgICAgdGhpcy5mcmFtZVtcImF0dGFja1wiXSA9IFsgNDEsIDQyLCA0MywgNDQsIFwic3RvcFwiXTtcbiAgICAgICAgICAgICAgICB0aGlzLndlYXBvbi5zZXRQb3NpdGlvbigwLCAwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNjpcbiAgICAgICAgICAgICAgICAvL+mtlOWwjuabuFxuICAgICAgICAgICAgICAgIHRoaXMuZnJhbWVbXCJhdHRhY2tcIl0gPSBbIDQ0LCA0NCwgNDQsIDQzLCA0MywgNDMsIDQyLCA0MiwgNDIsIDQxLCA0MSwgNDEsIFwic3RvcFwiXTtcbiAgICAgICAgICAgICAgICB0aGlzLndlYXBvbi5zZXRQb3NpdGlvbigtMywgMyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICAvL+atpuWZqOeUu+WDj+ioreWumlxuICAgICAgICB2YXIgaW5kZXggPSBraW5kICogMTAgKyBNYXRoLm1pbihsZXZlbCwgc3BlYy5tYXhJbmRleCk7XG4gICAgICAgIHRoaXMud2VhcG9uLnNldEZyYW1lSW5kZXgoaW5kZXgpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvL+ijheWCmeatpuWZqOOBq+OCiOOCiuaUu+aSg+ODouODvOOCt+ODp+ODs+OCkuWkieOBiOOCi1xuICAgIHdlYXBvbkF0dGFjazogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBraW5kID0gdGhpcy5lcXVpcC53ZWFwb25zW3RoaXMuZXF1aXAudXNpbmddO1xuICAgICAgICB2YXIgbGV2ZWwgPSB0aGlzLmVxdWlwLmxldmVsW3RoaXMuZXF1aXAudXNpbmddO1xuICAgICAgICB0aGlzLmlzQXR0YWNrID0gdHJ1ZTtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICBzd2l0Y2ggKGtpbmQpIHtcbiAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICAvL+OCt+ODp+ODvOODiOOCveODvOODiVxuICAgICAgICAgICAgICAgIHRoaXMud2VhcG9uLnR3ZWVuZXIuY2xlYXIoKVxuICAgICAgICAgICAgICAgICAgICAuc2V0KHtyb3RhdGlvbjogMjAwLCBhbHBoYTogMS4wfSlcbiAgICAgICAgICAgICAgICAgICAgLnRvKHtyb3RhdGlvbjogMzYwfSwgMTApXG4gICAgICAgICAgICAgICAgICAgIC5mYWRlT3V0KDEpXG4gICAgICAgICAgICAgICAgICAgIC5jYWxsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5pc0F0dGFjayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICAvL+ODreODs+OCsOOCveODvOODiVxuICAgICAgICAgICAgICAgIHRoaXMud2VhcG9uLnR3ZWVuZXIuY2xlYXIoKVxuICAgICAgICAgICAgICAgICAgICAuc2V0KHtyb3RhdGlvbjogMjAwLCBhbHBoYTogMS4wfSlcbiAgICAgICAgICAgICAgICAgICAgLnRvKHtyb3RhdGlvbjogMzYwfSwgMTIpXG4gICAgICAgICAgICAgICAgICAgIC5mYWRlT3V0KDEpXG4gICAgICAgICAgICAgICAgICAgIC5jYWxsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5pc0F0dGFjayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgICAvL+aWp1xuICAgICAgICAgICAgICAgIHRoaXMud2VhcG9uLnR3ZWVuZXIuY2xlYXIoKVxuICAgICAgICAgICAgICAgICAgICAuc2V0KHtyb3RhdGlvbjogNDAwLCBhbHBoYTogMS4wfSlcbiAgICAgICAgICAgICAgICAgICAgLnRvKHtyb3RhdGlvbjogMjcwfSwgMTYpXG4gICAgICAgICAgICAgICAgICAgIC5mYWRlT3V0KDEpXG4gICAgICAgICAgICAgICAgICAgIC5jYWxsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5pc0F0dGFjayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgICAgICAvL+anjVxuICAgICAgICAgICAgICAgIHRoaXMud2VhcG9uLnR3ZWVuZXIuY2xlYXIoKVxuICAgICAgICAgICAgICAgICAgICAuc2V0KHtyb3RhdGlvbjogLTQ1LCBhbHBoYTogMS4wfSlcbiAgICAgICAgICAgICAgICAgICAgLmJ5KHt4OiAtMTB9LCA0KVxuICAgICAgICAgICAgICAgICAgICAuYnkoe3g6IDEwfSwgNClcbiAgICAgICAgICAgICAgICAgICAgLmZhZGVPdXQoMSlcbiAgICAgICAgICAgICAgICAgICAgLmNhbGwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmlzQXR0YWNrID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA0OlxuICAgICAgICAgICAgICAgIC8v5byTXG4gICAgICAgICAgICAgICAgdGhpcy53ZWFwb24udHdlZW5lci5jbGVhcigpXG4gICAgICAgICAgICAgICAgICAgIC5zZXQoe3JvdGF0aW9uOiAtNDUsIGFscGhhOiAxLjB9KVxuICAgICAgICAgICAgICAgICAgICAuYnkoe3g6IDd9LCA2KVxuICAgICAgICAgICAgICAgICAgICAuYnkoe3g6IC03fSwgNilcbiAgICAgICAgICAgICAgICAgICAgLmZhZGVPdXQoMSlcbiAgICAgICAgICAgICAgICAgICAgLmNhbGwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmlzQXR0YWNrID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJyb3dQb3dlciA9IDUgKyBsZXZlbCAqIDI7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcnJvdyA9IFBsYXllckF0dGFjayh0aGlzLnBhcmVudFNjZW5lLCB7d2lkdGg6IDE1LCBoZWlnaHQ6IDEwLCBwb3dlcjogYXJyb3dQb3dlciwgdHlwZTogXCJhcnJvd1wifSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRDaGlsZFRvKHRoaXMucGFyZW50U2NlbmUucGxheWVyTGF5ZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICAuc2V0U2NhbGUodGhpcy5zY2FsZVgsIDEpXG4gICAgICAgICAgICAgICAgICAgICAgICAuc2V0UG9zaXRpb24odGhpcy54LCB0aGlzLnkpO1xuICAgICAgICAgICAgICAgICAgICBhcnJvdy50d2VlbmVyLnNldFVwZGF0ZVR5cGUoJ2ZwcycpLmNsZWFyKClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5ieSh7eDogKDE1MCArIGxldmVsICogNSkgKiB0aGlzLnNjYWxlWH0sIDcpXG4gICAgICAgICAgICAgICAgICAgICAgICAuY2FsbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfS5iaW5kKGFycm93KSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDU6XG4gICAgICAgICAgICAgICAgLy/prZTms5Xjga7mnZZcbiAgICAgICAgICAgICAgICB0aGlzLndlYXBvbi50d2VlbmVyLmNsZWFyKClcbiAgICAgICAgICAgICAgICAgICAgLnNldCh7cm90YXRpb246IDIwMCwgYWxwaGE6IDEuMH0pXG4gICAgICAgICAgICAgICAgICAgIC50byh7cm90YXRpb246IDM2MH0sIDE2KVxuICAgICAgICAgICAgICAgICAgICAuZmFkZU91dCgxKVxuICAgICAgICAgICAgICAgICAgICAuY2FsbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuaXNBdHRhY2sgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdmFyIG1hZ2ljUG93ZXIgPSAxNSArIGxldmVsICogMjtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDY7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbWFnaWMgPSBQbGF5ZXJBdHRhY2sodGhpcy5wYXJlbnRTY2VuZSwge3dpZHRoOiAxNSwgaGVpZ2h0OiAxMCwgaW5kZXg6IDMwLCBwb3dlcjogbWFnaWNQb3dlciwgdHlwZTogXCJmbGFtZVwifSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRDaGlsZFRvKHRoaXMucGFyZW50U2NlbmUucGxheWVyTGF5ZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICAuc2V0U2NhbGUodGhpcy5zY2FsZVgsIDEpO1xuICAgICAgICAgICAgICAgICAgICBtYWdpYy5yYWQgPSAoOTAgLSBpICogMzApLnRvUmFkaWFuKCk7XG4gICAgICAgICAgICAgICAgICAgIG1hZ2ljLmlzQ29sbGlzaW9uID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIG1hZ2ljLnZpc2libGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgbWFnaWMudHdlZW5lci5zZXRVcGRhdGVUeXBlKCdmcHMnKS5jbGVhcigpXG4gICAgICAgICAgICAgICAgICAgICAgICAud2FpdChpKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmNhbGwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0NvbGxpc2lvbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy52aXNpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbXggPSBNYXRoLmNvcyh0aGlzLnJhZCkgKiB0aGF0LnNjYWxlWDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbXkgPSBNYXRoLnNpbih0aGlzLnJhZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRQb3NpdGlvbih0aGF0LnggKyAzMiAqIG14LCB0aGF0LnkgKyAzMiAqIG15KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0uYmluZChtYWdpYykpXG4gICAgICAgICAgICAgICAgICAgICAgICAud2FpdCg4KVxuICAgICAgICAgICAgICAgICAgICAgICAgLmNhbGwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0uYmluZChtYWdpYykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNjpcbiAgICAgICAgICAgICAgICAvL+mtlOWwjuabuFxuICAgICAgICAgICAgICAgIHRoaXMud2VhcG9uLnR3ZWVuZXIuY2xlYXIoKVxuICAgICAgICAgICAgICAgICAgICAuc2V0KHtyb3RhdGlvbjogNDAwLCBhbHBoYTogMS4wfSlcbiAgICAgICAgICAgICAgICAgICAgLnRvKHtyb3RhdGlvbjogMjcwfSwgMTYpXG4gICAgICAgICAgICAgICAgICAgIC5mYWRlT3V0KDEpXG4gICAgICAgICAgICAgICAgICAgIC5jYWxsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5pc0F0dGFjayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgc2V0dXBBbmltYXRpb246IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnNwY2lhbEFuaW1hdGlvbiA9IGZhbHNlO1xuICAgICAgICB0aGlzLmZyYW1lID0gW107XG4gICAgICAgIHRoaXMuZnJhbWVbXCJzdGFuZFwiXSA9IFsxMywgMTRdO1xuICAgICAgICB0aGlzLmZyYW1lW1wianVtcFwiXSA9IFszNiwgXCJzdG9wXCJdO1xuICAgICAgICB0aGlzLmZyYW1lW1wid2Fsa1wiXSA9IFsgMywgIDQsICA1LCAgNF07XG4gICAgICAgIHRoaXMuZnJhbWVbXCJ1cFwiXSA9ICAgWyA5LCAxMCwgMTEsIDEwXTtcbiAgICAgICAgdGhpcy5mcmFtZVtcImRvd25cIl0gPSBbIDAsICAxLCAgMiwgIDFdO1xuICAgICAgICB0aGlzLmZyYW1lW1wiYXR0YWNrXCJdID0gWyA0MSwgNDIsIDQzLCA0NCwgXCJzdG9wXCJdO1xuICAgICAgICB0aGlzLmZyYW1lW1wiZGVmZW5zZVwiXSA9IFsgNDEsIDQyLCA0MywgNDQsIFwic3RvcFwiXTtcbiAgICAgICAgdGhpcy5mcmFtZVtcImRhbWFnZVwiXSA9IFsgMTgsIDE5LCAyMF07XG4gICAgICAgIHRoaXMuZnJhbWVbXCJkcm9wXCJdID0gWzE4LCAxOSwgMjBdO1xuICAgICAgICB0aGlzLmZyYW1lW1wiZGVhZFwiXSA9IFsxOCwgMTksIDIwLCAzMywgMzQsIDM1LCBcInN0b3BcIl07XG4gICAgICAgIHRoaXMuZnJhbWVbXCJjbGVhclwiXSA9IFsyNCwgMjUsIDI2XTtcbiAgICAgICAgdGhpcy5mcmFtZVtcInN0dW5cIl0gPSBbIDE4LCAxOSwgMjBdO1xuICAgICAgICB0aGlzLmluZGV4ID0gMDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8v5b2T44Gf44KK5Yik5a6a55So44Ko44Os44Oh44Oz44OI44Gu5L2N572u5YaN44K744OD44OIXG4gICAgcmVzZXRDb2xsaXNpb25Qb3NpdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB3ID0gTWF0aC5mbG9vcih0aGlzLndpZHRoLzIpKzY7XG4gICAgICAgIHZhciBoID0gTWF0aC5mbG9vcih0aGlzLmhlaWdodC8yKSs2O1xuICAgICAgICB0aGlzLl9jb2xsaXNpb25bMF0uc2V0UG9zaXRpb24odGhpcy54LCB0aGlzLnkgLSBoKTtcbiAgICAgICAgdGhpcy5fY29sbGlzaW9uWzFdLnNldFBvc2l0aW9uKHRoaXMueCArIHcsIHRoaXMueSAtIDUpO1xuICAgICAgICB0aGlzLl9jb2xsaXNpb25bMl0uc2V0UG9zaXRpb24odGhpcy54LCB0aGlzLnkgKyBoKTtcbiAgICAgICAgdGhpcy5fY29sbGlzaW9uWzNdLnNldFBvc2l0aW9uKHRoaXMueCAtIHcsIHRoaXMueSAtIDUpO1xuICAgICAgICB0aGlzLmxhZGRlckNvbGxpc2lvbi5zZXRQb3NpdGlvbih0aGlzLngsIHRoaXMueSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG59KTtcbiIsInBoaW5hLmRlZmluZShcIlBsYXllckF0dGFja1wiLCB7XG4gIHN1cGVyQ2xhc3M6IFwicGhpbmEuZGlzcGxheS5EaXNwbGF5RWxlbWVudFwiLFxuXG4gIC8v5pS75pKD5YqbXG4gIHBvd2VyOiAxLFxuXG4gIC8v5b2T44Gf44KK5Yik5a6a55m655Sf44OV44Op44KwXG4gIGlzQ29sbGlzaW9uOiB0cnVlLFxuXG4gIC8v5bGe5oCnXG4gIGlzU2xhc2g6IGZhbHNlLFxuICBpc1N0aW5nOiBmYWxzZSxcbiAgaXNCbG93OiBmYWxzZSxcbiAgaXNBcnJvdzogZmFsc2UsXG4gIGlzRmlyZTogZmFsc2UsXG4gIGlzSWNlOiBmYWxzZSxcblxuICBpbml0OiBmdW5jdGlvbihwYXJlbnRTY2VuZSwgb3B0aW9ucykge1xuICAgICAgdGhpcy5zdXBlckluaXQob3B0aW9ucyk7XG4gICAgICB0aGlzLnBhcmVudFNjZW5lID0gcGFyZW50U2NlbmU7XG5cbiAgICAgIHRoaXMudHlwZSA9IG9wdGlvbnMudHlwZSB8fCBcImFycm93XCI7XG4gICAgICB0aGlzLnBvd2VyID0gb3B0aW9ucy5wb3dlciB8fCAwO1xuICAgICAgdGhpcy50aW1lID0gMDtcbiAgICAgIHRoaXMuaW5kZXggPSAwO1xuXG4gICAgICAvL+ihqOekuuOCueODl+ODqeOCpOODiFxuICAgICAgc3dpdGNoICh0aGlzLnR5cGUpIHtcbiAgICAgICAgICBjYXNlIFwiYXJyb3dcIjpcbiAgICAgICAgICAgICAgdGhpcy5zcHJpdGUgPSBwaGluYS5kaXNwbGF5LlNwcml0ZShcIndlYXBvbnNcIiwgMjQsIDI0KS5hZGRDaGlsZFRvKHRoaXMpLnNldEZyYW1lSW5kZXgoMSk7XG4gICAgICAgICAgICAgIHRoaXMuZnJhbWUgPSBbMV07XG4gICAgICAgICAgICAgIHRoaXMuaXNBcnJvdyA9IHRydWU7XG4gICAgICAgICAgICAgIHRoaXMuaXNTdGluZyA9IHRydWU7XG4gICAgICAgICAgICAgIHRoaXMuc3R1blBvd2VyID0gMTA7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgXCJmaXJlYmFsbFwiOlxuICAgICAgICAgICAgICB0aGlzLnNwcml0ZSA9IHBoaW5hLmRpc3BsYXkuU3ByaXRlKFwiYnVsbGV0XCIsIDI0LCAzMikuYWRkQ2hpbGRUbyh0aGlzKS5zZXRGcmFtZUluZGV4KDkpO1xuICAgICAgICAgICAgICB0aGlzLmZyYW1lID0gWzksIDEwLCAxMSwgMTBdO1xuICAgICAgICAgICAgICB0aGlzLmlzRmlyZSA9IHRydWU7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgXCJtYXNha2FyaVwiOlxuICAgICAgICAgICAgICB0aGlzLnNwcml0ZSA9IHBoaW5hLmRpc3BsYXkuU3ByaXRlKFwid2VhcG9uc1wiLCAyNCwgMjQpLmFkZENoaWxkVG8odGhpcykuc2V0RnJhbWVJbmRleCgyMCk7XG4gICAgICAgICAgICAgIHRoaXMuZnJhbWUgPSBbMjBdO1xuICAgICAgICAgICAgICB0aGlzLmlzU2xhc2ggPSB0cnVlO1xuICAgICAgICAgICAgICB0aGlzLmlzQnJvdyA9IHRydWU7XG4gICAgICAgICAgICAgIHRoaXMuc3R1blBvd2VyID0gNTA7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgXCJkYWdnZXJcIjpcbiAgICAgICAgICAgICAgdGhpcy5zcHJpdGUgPSBwaGluYS5kaXNwbGF5LlNwcml0ZShcIndlYXBvbnNcIiwgMjQsIDI0KS5hZGRDaGlsZFRvKHRoaXMpLnNldEZyYW1lSW5kZXgoMjApO1xuICAgICAgICAgICAgICB0aGlzLnNwcml0ZS5yb3RhdGlvbiA9IDEzNTtcbiAgICAgICAgICAgICAgdGhpcy5mcmFtZSA9IFswXTtcbiAgICAgICAgICAgICAgdGhpcy5pc1N0aW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgdGhpcy5zdHVuUG93ZXIgPSAxO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIFwiZmxhbWVcIjpcbiAgICAgICAgICAgICAgdGhpcy5zcHJpdGUgPSBwaGluYS5kaXNwbGF5LlNwcml0ZShcImVmZmVjdFwiLCA0OCwgNDgpXG4gICAgICAgICAgICAgICAgICAuYWRkQ2hpbGRUbyh0aGlzKVxuICAgICAgICAgICAgICAgICAgLnNldEZyYW1lVHJpbW1pbmcoMCwgMTkyLCAxOTIsIDk2KVxuICAgICAgICAgICAgICAgICAgLnNldFNjYWxlKDAuNSk7XG4gICAgICAgICAgICAgIHRoaXMuZnJhbWUgPSBbMCwgMSwgMiwgMywgNCwgNSwgNiwgNywgOF07XG4gICAgICAgICAgICAgIHRoaXMuaXNGaXJlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgdGhpcy5zdHVuUG93ZXIgPSAxO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgaWYgKERFQlVHX0NPTExJU0lPTikge1xuICAgICAgICAgIHBoaW5hLmRpc3BsYXkuUmVjdGFuZ2xlU2hhcGUoe3dpZHRoOiB0aGlzLndpZHRoLCBoZWlnaHQ6IHRoaXMuaGVpZ2h0fSkuYWRkQ2hpbGRUbyh0aGlzKS5zZXRBbHBoYSgwLjUpO1xuICAgICAgfVxuICB9LFxuXG4gIHVwZGF0ZTogZnVuY3Rpb24oYXBwKSB7XG4gICAgICBpZiAoIXRoaXMuaXNDb2xsaXNpb24gfHwgdGhpcy50eXBlID09IFwiZXhwbG9kZVwiKSByZXR1cm47XG5cbiAgICAgIGlmICh0aGlzLnRpbWUgJSAzID09IDApIHtcbiAgICAgICAgICB0aGlzLnNwcml0ZS5zZXRGcmFtZUluZGV4KHRoaXMuZnJhbWVbdGhpcy5pbmRleF0pO1xuICAgICAgICAgIHRoaXMuaW5kZXggPSAodGhpcy5pbmRleCArIDEpICUgdGhpcy5mcmFtZS5sZW5ndGg7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy50eXBlID09IFwiZmxhbWVcIikgcmV0dXJuO1xuXG4gICAgICAvL+WcsOW9ouaOpeinpuWIpOWumlxuICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgdGhpcy5wYXJlbnRTY2VuZS5jb2xsaXNpb25MYXllci5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICBpZiAoZS50eXBlID09IFwibGFkZGVyXCIgfHwgZS50eXBlID09IFwic3RhaXJzXCIpIHJldHVybjtcbiAgICAgICAgICBpZiAodGhpcy5oaXRUZXN0RWxlbWVudChlKSkge1xuICAgICAgICAgICAgICB0aGlzLmlzQ29sbGlzaW9uID0gZmFsc2U7XG4gICAgICAgICAgICAgIHN3aXRjaCAodGhpcy50eXBlKSB7XG4gICAgICAgICAgICAgICAgICBjYXNlIFwiYXJyb3dcIjpcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLnN0aWNrKGUpO1xuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgY2FzZSBcImZpcmViYWxsXCI6XG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5leHBsb2RlKGUpO1xuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfS5iaW5kKHRoaXMpKTtcblxuICAgICAgdGhpcy50aW1lKys7XG4gIH0sXG5cbiAgLy/jg5Ljg4Pjg4jlvozlh6bnkIZcbiAgaGl0OiBmdW5jdGlvbih0YXJnZXQpIHtcbiAgICAgIHN3aXRjaCAodGhpcy50eXBlKSB7XG4gICAgICAgICAgY2FzZSBcImZpcmViYWxsXCI6XG4gICAgICAgICAgICAgIHRoaXMuZXhwbG9kZSh0YXJnZXQpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgfSxcblxuICAvL+WIuuOBleOCi1xuICBzdGljazogZnVuY3Rpb24oZSkge1xuICAgICAgLy/lirnmnpzpn7NcbiAgICAgIHN3aXRjaCAodGhpcy50eXBlKSB7XG4gICAgICAgICAgY2FzZSBcImFycm93XCI6XG4gICAgICAgICAgICAgIGFwcC5wbGF5U0UoXCJhcnJvd3N0aWNrXCIpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIFwibWFzYWthcmlcIjpcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLnNjYWxlWCA9PSAxKSB7XG4gICAgICAgICAgdGhpcy54ID0gZS5sZWZ0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnggPSBlLnJpZ2h0O1xuICAgICAgfVxuICAgICAgdGhpcy50d2VlbmVyLmNsZWFyKClcbiAgICAgICAgICAud2FpdCgzMClcbiAgICAgICAgICAuY2FsbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgdGhpcy5yZW1vdmUoKTtcbiAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICB9LFxuXG4gIC8v5by+44GL44KM44KLXG4gIHNuYXA6IGZ1bmN0aW9uKGUpIHtcbiAgICAgIC8v5Yq55p6c6Z+zXG4gICAgICBhcHAucGxheVNFKFwidGlua2xpbmdcIik7XG4gICAgICB0aGlzLnR3ZWVuZXIuY2xlYXIoKVxuICAgICAgICAgIC5ieSh7eTogLTkyLCByb3RhdGlvbjogNzAwfSwgMTUsIFwiZWFzZU91dFF1YWRcIilcbiAgICAgICAgICAuY2FsbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgdGhpcy5yZW1vdmUoKTtcbiAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICB9LFxuXG4gIC8v54iG55m6XG4gIGV4cGxvZGU6IGZ1bmN0aW9uKGUpIHtcbiAgICAgIHRoaXMucGFyZW50U2NlbmUuc3Bhd25FZmZlY3QodGhpcy54LCB0aGlzLnkpO1xuICAgICAgYXBwLnBsYXlTRShcImJvbWJcIik7XG4gICAgICB0aGlzLnJlbW92ZSgpO1xuICB9LFxufSk7XG4iLCJwaGluYS5kZWZpbmUoXCJQbGF5ZXJEdW1teVwiLCB7XG4gIHN1cGVyQ2xhc3M6IFwicGhpbmEuZGlzcGxheS5TcHJpdGVcIixcblxuICBpbml0OiBmdW5jdGlvbihhc3NldE5hbWUpIHtcbiAgICAgIHRoaXMuc3VwZXJJbml0KGFzc2V0TmFtZSwgMzIsIDMyKTtcbiAgICAgIHRoaXMuZnJhbWUgPSBbXTtcbiAgICAgIHRoaXMuZnJhbWVbXCJzdGFuZFwiXSA9IFsxMywgMTRdO1xuICAgICAgdGhpcy5mcmFtZVtcIndhbGtcIl0gPSBbIDMsICA0LCAgNSwgIDRdO1xuICAgICAgdGhpcy5mcmFtZVtcIndhbGtfc3RvcFwiXSA9IFsgMywgIDQsICA1LCAgNCwgXCJzdG9wXCJdO1xuICAgICAgdGhpcy5mcmFtZVtcInVwXCJdID0gICBbIDksIDEwLCAxMSwgMTBdO1xuICAgICAgdGhpcy5mcmFtZVtcInVwX3N0b3BcIl0gPSAgIFsxMCwgXCJzdG9wXCJdO1xuICAgICAgdGhpcy5mcmFtZVtcImRvd25cIl0gPSBbIDAsICAxLCAgMiwgIDFdO1xuICAgICAgdGhpcy5mcmFtZVtcImNsZWFyXCJdID0gWzI0LCBcInN0b3BcIl07XG4gICAgICB0aGlzLmZyYW1lW1wiZGFtYWdlXCJdID0gWyAxOCwgMTksIDIwXTtcbiAgICAgIHRoaXMuZnJhbWVbXCJkZWFkXCJdID0gWzE4LCAxOSwgMjAsIDMzLCAzNCwgMzUsIFwic3RvcFwiXTtcbiAgICAgIHRoaXMuaW5kZXggPSAwO1xuXG4gICAgICB0aGlzLm5vd0FuaW1hdGlvbiA9IFwic3RhbmRcIjtcbiAgICAgIHRoaXMuYW5pbWF0aW9uID0gdHJ1ZTtcblxuICAgICAgdGhpcy5ieCA9IDA7XG4gICAgICB0aGlzLmJ5ID0gMDtcbiAgICAgIHRoaXMudGltZSA9IDA7XG5cbiAgICAgIC8v5b2x44Gu6L+95YqgXG4gICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICB2YXIgc2MgPSAxNiAvIDI0O1xuICAgICAgaWYgKHNjIDwgMSkgc2MgKz0gMC4yO1xuICAgICAgdGhpcy5zaGFkb3dTcHJpdGUgPSBwaGluYS5kaXNwbGF5LlNwcml0ZShcInNoYWRvd1wiLCAyNCwgOClcbiAgICAgICAgICAuYWRkQ2hpbGRUbyh0aGlzKVxuICAgICAgICAgIC5zZXRBbHBoYSgwLjUpXG4gICAgICAgICAgLnNldFNjYWxlKHNjLCAxLjApXG4gICAgICAgICAgLnNldFBvc2l0aW9uKDAsIDE2KTtcbiAgfSxcblxuICB1cGRhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuYW5pbWF0aW9uICYmIHRoaXMudGltZSAlIDYgPT0gMCkge1xuICAgICAgICAgIHRoaXMuaW5kZXggPSAodGhpcy5pbmRleCsxKSAlIHRoaXMuZnJhbWVbdGhpcy5ub3dBbmltYXRpb25dLmxlbmd0aDtcbiAgICAgICAgICBpZiAodGhpcy5mcmFtZVt0aGlzLm5vd0FuaW1hdGlvbl1bdGhpcy5pbmRleF0gPT0gXCJzdG9wXCIpIHRoaXMuaW5kZXgtLTtcbiAgICAgICAgICB0aGlzLmZyYW1lSW5kZXggPSB0aGlzLmZyYW1lW3RoaXMubm93QW5pbWF0aW9uXVt0aGlzLmluZGV4XTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMueCA8IHRoaXMuYngpIHRoaXMuc2NhbGVYID0gMTtcbiAgICAgIGlmICh0aGlzLnggPiB0aGlzLmJ4KSB0aGlzLnNjYWxlWCA9IC0xO1xuICAgICAgdGhpcy5ieCA9IHRoaXMueDtcbiAgICAgIHRoaXMuYnkgPSB0aGlzLnk7XG5cbiAgICAgIHRoaXMudGltZSsrO1xuICB9LFxuXG4gIHNldEFuaW1hdGlvbjogZnVuY3Rpb24oYW5pbU5hbWUpIHtcbiAgICAgIGlmICghdGhpcy5mcmFtZVthbmltTmFtZV0pIHJldHVybjtcbiAgICAgIGlmIChhbmltTmFtZSA9PSB0aGlzLm5vd0FuaW1hdGlvbikgcmV0dXJuO1xuICAgICAgdGhpcy5ub3dBbmltYXRpb24gPSBhbmltTmFtZTtcbiAgICAgIHRoaXMuaW5kZXggPSAtMTtcbiAgICAgIHJldHVybiB0aGlzO1xuICB9LFxufSk7XG4iLCJwaGluYS5kZWZpbmUoXCJQbGF5ZXJXZWFwb25cIiwge1xuICBzdXBlckNsYXNzOiBcInBoaW5hLmRpc3BsYXkuRGlzcGxheUVsZW1lbnRcIixcblxuICBpbml0OiBmdW5jdGlvbihwbGF5ZXIpIHtcbiAgICAgIHRoaXMuc3VwZXJJbml0KCk7XG4gICAgICB0aGlzLnBsYXllciA9IHBsYXllcjtcblxuICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgdGhpcy5iYXNlID0gcGhpbmEuZGlzcGxheS5EaXNwbGF5RWxlbWVudCgpLmFkZENoaWxkVG8odGhpcyk7XG4gICAgICB0aGlzLmJhc2UudXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdGhpcy5yb3RhdGlvbiA9IC10aGF0LnJvdGF0aW9uO1xuICAgICAgfVxuICAgICAgdmFyIHBhcmFtID0ge1xuICAgICAgICAgIHdpZHRoOiAyNSxcbiAgICAgICAgICBoZWlnaHQ6IDI1LFxuICAgICAgICAgIGZpbGw6IFwicmdiYSgwLDAsMCwwLjApXCIsXG4gICAgICAgICAgc3Ryb2tlOiBcInllbGxvd1wiLFxuICAgICAgICAgIHN0cm9rZVdpZHRoOiAyLFxuICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogJ3RyYW5zcGFyZW50JyxcbiAgICAgIH07XG4gICAgICAvL+S9v+eUqOS4reatpuWZqFxuICAgICAgcGhpbmEuZGlzcGxheS5SZWN0YW5nbGVTaGFwZShwYXJhbSkuYWRkQ2hpbGRUbyh0aGlzLmJhc2UpLnNldFBvc2l0aW9uKDAsIC0xOCk7XG4gICAgICAvL+aNqOOBpuOBoeOCg+OBhuatpuWZqFxuICAgICAgdGhpcy5kcm9wRnJhbWUgPSBwaGluYS5kaXNwbGF5LlJlY3RhbmdsZVNoYXBlKHtzdHJva2U6IFwicmVkXCJ9LiRzYWZlKHBhcmFtKSlcbiAgICAgICAgICAuYWRkQ2hpbGRUbyh0aGlzLmJhc2UpXG4gICAgICAgICAgLnNldFBvc2l0aW9uKDE0LCAxMClcbiAgICAgICAgICAuc2V0VmlzaWJsZShmYWxzZSk7XG4gICAgICB0aGlzLmRyb3BGcmFtZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAodGhhdC5wbGF5ZXIuZXF1aXAud2VhcG9ucy5sZW5ndGggPCAzKSB7XG4gICAgICAgICAgICAgIHRoaXMudmlzaWJsZSA9IGZhbHNlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRoaXMudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvL+atpuWZqOODquOCueODiO+8iO+8k+OBpO+8iVxuICAgICAgdGhpcy53ZWFwb25zID0gW107XG4gICAgICB2YXIgcmFkID0gMDtcbiAgICAgIHZhciByYWRfMSA9IChNYXRoLlBJKjIpIC8gMztcbiAgICAgICgzKS50aW1lcyhmdW5jdGlvbihpKSB7XG4gICAgICAgICAgdmFyIHggPSAgTWF0aC5zaW4ocmFkKSoxODtcbiAgICAgICAgICB2YXIgeSA9IC1NYXRoLmNvcyhyYWQpKjE4O1xuICAgICAgICAgIHJhZCAtPSByYWRfMTtcbiAgICAgICAgICB0aGlzLndlYXBvbnNbaV0gPSBwaGluYS5kaXNwbGF5LlNwcml0ZShcIndlYXBvbnNcIiwgMjQsIDI0KVxuICAgICAgICAgICAgICAuYWRkQ2hpbGRUbyh0aGlzKVxuICAgICAgICAgICAgICAuc2V0UG9zaXRpb24oeCwgeSk7XG4gICAgICAgICAgdGhpcy53ZWFwb25zW2ldLmluZGV4ID0gaTtcbiAgICAgICAgICB0aGlzLndlYXBvbnNbaV0udXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHRoaXMucm90YXRpb24gPSAtdGhhdC5yb3RhdGlvbjtcbiAgICAgICAgICAgICAgdmFyIHdlYXBvbnMgPSB0aGF0LnBsYXllci5lcXVpcC53ZWFwb25zO1xuICAgICAgICAgICAgICBpZiAodGhpcy5pbmRleCA8IHdlYXBvbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICB2YXIga2luZCA9IHRoYXQucGxheWVyLmVxdWlwLndlYXBvbnNbdGhpcy5pbmRleF07XG4gICAgICAgICAgICAgICAgICB2YXIgbGV2ZWwgPSB0aGF0LnBsYXllci5lcXVpcC5sZXZlbFt0aGlzLmluZGV4XTtcbiAgICAgICAgICAgICAgICAgIHZhciBzcGVjID0gSXRlbUluZm8uZ2V0KGtpbmQpO1xuICAgICAgICAgICAgICAgICAgdmFyIGluZGV4ID0ga2luZCAqIDEwICsgTWF0aC5taW4obGV2ZWwsIHNwZWMubWF4SW5kZXgpO1xuICAgICAgICAgICAgICAgICAgdGhpcy5zZXRGcmFtZUluZGV4KGluZGV4KTtcbiAgICAgICAgICAgICAgICAgIHRoaXMudmlzaWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICB0aGlzLnZpc2libGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgbGFiZWxQYXJhbSA9IHtcbiAgICAgICAgICAgICAgZmlsbDogXCJ3aGl0ZVwiLFxuICAgICAgICAgICAgICBzdHJva2U6IFwiYmxhY2tcIixcbiAgICAgICAgICAgICAgc3Ryb2tlV2lkdGg6IDIsXG5cbiAgICAgICAgICAgICAgZm9udEZhbWlseTogXCJPcmJpdHJvblwiLFxuICAgICAgICAgICAgICBhbGlnbjogXCJjZW50ZXJcIixcbiAgICAgICAgICAgICAgYmFzZWxpbmU6IFwibWlkZGxlXCIsXG4gICAgICAgICAgICAgIGZvbnRTaXplOiAxMCxcbiAgICAgICAgICAgICAgZm9udFdlaWdodDogJydcbiAgICAgICAgICB9O1xuICAgICAgICAgIC8v5by35YyW44Os44OZ44Or6KGo56S6XG4gICAgICAgICAgdGhpcy53ZWFwb25zW2ldLmxldmVsID0gcGhpbmEuZGlzcGxheS5MYWJlbCh7dGV4dDogXCJcIn0uJHNhZmUobGFiZWxQYXJhbSkpLnNldFBvc2l0aW9uKDYsIDYpLmFkZENoaWxkVG8odGhpcy53ZWFwb25zW2ldKTtcbiAgICAgICAgICB0aGlzLndlYXBvbnNbaV0ubGV2ZWwuaW5kZXggPSBpO1xuICAgICAgICAgIHRoaXMud2VhcG9uc1tpXS5sZXZlbC51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgdmFyIGxldmVsID0gdGhhdC5wbGF5ZXIuZXF1aXAubGV2ZWxbdGhpcy5pbmRleF07XG4gICAgICAgICAgICAgIGlmIChsZXZlbCAhPSAwKSB7XG4gICAgICAgICAgICAgICAgICB0aGlzLnRleHQgPSBcIitcIitsZXZlbDtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHRoaXMudGV4dCA9IFwiXCI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9LmJpbmQodGhpcykpO1xuICB9LFxuXG4gIGNsZWFyOiBmdW5jdGlvbigpIHtcbiAgfSxcbn0pO1xuIiwicGhpbmEuZGVmaW5lKFwiQnV0dG9uXCIsIHtcbiAgc3VwZXJDbGFzczogXCJBY2Nlc3NvcnlcIixcblxuICBsb2ducHJlc3NUaW1lOiA1MDAsXG4gIGRvTG9uZ3ByZXNzOiBmYWxzZSxcblxuICAvL+mVt+aKvOOBl+OBp+mAo+aJk+ODouODvOODiVxuICBsb25ncHJlc3NCYXJyYWdlOiBmYWxzZSxcblxuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN1cGVySW5pdCgpO1xuXG4gICAgdGhpcy5vbihcImF0dGFjaGVkXCIsICgpID0+IHtcbiAgICAgIHRoaXMudGFyZ2V0LmludGVyYWN0aXZlID0gdHJ1ZTtcbiAgICAgIHRoaXMudGFyZ2V0LmNsaWNrU291bmQgPSBCdXR0b24uZGVmYXVsdHMuY2xpY2tTb3VuZDtcblxuICAgICAgLy/jg5zjgr/jg7PmirzjgZfmmYLnlKhcbiAgICAgIHRoaXMudGFyZ2V0LnNjYWxlVHdlZW5lciA9IFR3ZWVuZXIoKS5hdHRhY2hUbyh0aGlzLnRhcmdldCk7XG5cbiAgICAgIC8v6ZW35oq844GX55SoXG4gICAgICB0aGlzLnRhcmdldC50d0xvbmdwcmVzcyA9IFR3ZWVuZXIoKS5hdHRhY2hUbyh0aGlzLnRhcmdldCk7XG5cbiAgICAgIC8v6ZW35oq844GX5Lit54m55q6K5a++5b+c55SoXG4gICAgICB0aGlzLnRhcmdldC50d0xvbmdwcmVzc2luZyA9IFR3ZWVuZXIoKS5hdHRhY2hUbyh0aGlzLnRhcmdldCk7XG5cbiAgICAgIHRoaXMudGFyZ2V0Lm9uKFwicG9pbnRzdGFydFwiLCAoZSkgPT4ge1xuXG4gICAgICAgIC8v44Kk44OZ44Oz44OI6LKr6YCa44Gr44GX44Gm44GK44GPXG4gICAgICAgIGUucGFzcyA9IHRydWU7XG5cbiAgICAgICAgLy/jg5zjgr/jg7Pjga7lkIzmmYLmirzjgZfjgpLliLbpmZBcbiAgICAgICAgaWYgKEJ1dHRvbi5hY3Rpb25UYXJnZXQgIT09IG51bGwpIHJldHVybjtcblxuICAgICAgICAvL+ODquOCueODiOODk+ODpeODvOOBruWtkOS+m+OBoOOBo+OBn+WgtOWQiOOBr3ZpZXdwb3J044Go44Gu44GC44Gf44KK5Yik5a6a44KS44GZ44KLXG4gICAgICAgIGNvbnN0IGxpc3RWaWV3ID0gQnV0dG9uLmZpbmRMaXN0VmlldyhlLnRhcmdldCk7XG4gICAgICAgIGlmIChsaXN0VmlldyAmJiAhbGlzdFZpZXcudmlld3BvcnQuaGl0VGVzdChlLnBvaW50ZXIueCwgZS5wb2ludGVyLnkpKSByZXR1cm47XG5cbiAgICAgICAgaWYgKGxpc3RWaWV3KSB7XG4gICAgICAgICAgLy/jg53jgqTjg7Pjgr/jgYznp7vli5XjgZfjgZ/loLTlkIjjga/plbfmirzjgZfjgq3jg6Pjg7Pjgrvjg6vvvIhsaXN0Vmlld+WGheeJiO+8iVxuICAgICAgICAgIGxpc3RWaWV3LmlubmVyLiR3YXRjaCgneScsICh2MSwgdjIpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRhcmdldCAhPT0gQnV0dG9uLmFjdGlvblRhcmdldCkgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKE1hdGguYWJzKHYxIC0gdjIpIDwgMTApIHJldHVybjtcblxuICAgICAgICAgICAgQnV0dG9uLmFjdGlvblRhcmdldCA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLnRhcmdldC50d0xvbmdwcmVzcy5jbGVhcigpO1xuICAgICAgICAgICAgdGhpcy50YXJnZXQuc2NhbGVUd2VlbmVyLmNsZWFyKCkudG8oe1xuICAgICAgICAgICAgICBzY2FsZVg6IDEuMCAqIHRoaXMuc3gsXG4gICAgICAgICAgICAgIHNjYWxlWTogMS4wICogdGhpcy5zeVxuICAgICAgICAgICAgfSwgNTApO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy/jg5zjgr/jg7Pjga7lh6bnkIbjgpLlrp/ooYzjgZfjgabjgoLllY/poYzjgarjgYTloLTlkIjjga7jgb/osqvpgJrjgpLlgZzmraLjgZnjgotcbiAgICAgICAgZS5wYXNzID0gZmFsc2U7XG4gICAgICAgIEJ1dHRvbi5hY3Rpb25UYXJnZXQgPSB0aGlzLnRhcmdldDtcblxuICAgICAgICAvL+WPjei7ouOBl+OBpuOBhOOCi+ODnOOCv+ODs+eUqOOBq+S/neaMgeOBmeOCi1xuICAgICAgICB0aGlzLnN4ID0gKHRoaXMudGFyZ2V0LnNjYWxlWCA+IDApID8gMSA6IC0xO1xuICAgICAgICB0aGlzLnN5ID0gKHRoaXMudGFyZ2V0LnNjYWxlWSA+IDApID8gMSA6IC0xO1xuXG4gICAgICAgIHRoaXMudGFyZ2V0LnNjYWxlVHdlZW5lci5jbGVhcigpXG4gICAgICAgICAgLnRvKHtcbiAgICAgICAgICAgIHNjYWxlWDogMC45NSAqIHRoaXMuc3gsXG4gICAgICAgICAgICBzY2FsZVk6IDAuOTUgKiB0aGlzLnN5XG4gICAgICAgICAgfSwgNTApO1xuXG4gICAgICAgIHRoaXMuZG9Mb25ncHJlc3MgPSBmYWxzZTtcbiAgICAgICAgdGhpcy50YXJnZXQudHdMb25ncHJlc3MuY2xlYXIoKVxuICAgICAgICAgIC53YWl0KHRoaXMubG9nbnByZXNzVGltZSlcbiAgICAgICAgICAuY2FsbCgoKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXRoaXMubG9uZ3ByZXNzQmFycmFnZSkge1xuICAgICAgICAgICAgICBCdXR0b24uYWN0aW9uVGFyZ2V0ID0gbnVsbDtcbiAgICAgICAgICAgICAgdGhpcy50YXJnZXQuc2NhbGVUd2VlbmVyLmNsZWFyKClcbiAgICAgICAgICAgICAgICAudG8oe1xuICAgICAgICAgICAgICAgICAgc2NhbGVYOiAxLjAgKiB0aGlzLnN4LFxuICAgICAgICAgICAgICAgICAgc2NhbGVZOiAxLjAgKiB0aGlzLnN5XG4gICAgICAgICAgICAgICAgfSwgNTApXG4gICAgICAgICAgICAgIHRoaXMudGFyZ2V0LmZsYXJlKFwibG9uZ3ByZXNzXCIpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aGlzLnRhcmdldC5mbGFyZShcImNsaWNrU291bmRcIik7XG4gICAgICAgICAgICAgIHRoaXMudGFyZ2V0LnR3TG9uZ3ByZXNzaW5nLmNsZWFyKClcbiAgICAgICAgICAgICAgICAud2FpdCg1KVxuICAgICAgICAgICAgICAgIC5jYWxsKCgpID0+IHRoaXMudGFyZ2V0LmZsYXJlKFwiY2xpY2tlZFwiLCB7XG4gICAgICAgICAgICAgICAgICBsb25ncHJlc3M6IHRydWVcbiAgICAgICAgICAgICAgICB9KSlcbiAgICAgICAgICAgICAgICAuY2FsbCgoKSA9PiB0aGlzLnRhcmdldC5mbGFyZShcImxvbmdwcmVzc2luZ1wiKSlcbiAgICAgICAgICAgICAgICAuc2V0TG9vcCh0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnRhcmdldC5vbihcInBvaW50ZW5kXCIsIChlKSA9PiB7XG4gICAgICAgIC8v44Kk44OZ44Oz44OI6LKr6YCa44Gr44GX44Gm44GK44GPXG4gICAgICAgIGUucGFzcyA9IHRydWU7XG5cbiAgICAgICAgLy9cbiAgICAgICAgdGhpcy50YXJnZXQudHdMb25ncHJlc3MuY2xlYXIoKTtcbiAgICAgICAgdGhpcy50YXJnZXQudHdMb25ncHJlc3NpbmcuY2xlYXIoKTtcblxuICAgICAgICAvL+OCv+ODvOOCsuODg+ODiOOBjG51bGzjgYtwb2ludHN0YXJ044Gn5L+d5oyB44GX44Gf44K/44O844Ky44OD44OI44Go6YGV44GG5aC05ZCI44Gv44K544Or44O844GZ44KLXG4gICAgICAgIGlmIChCdXR0b24uYWN0aW9uVGFyZ2V0ID09PSBudWxsKSByZXR1cm47XG4gICAgICAgIGlmIChCdXR0b24uYWN0aW9uVGFyZ2V0ICE9PSB0aGlzLnRhcmdldCkgcmV0dXJuO1xuXG4gICAgICAgIC8v44Oc44K/44Oz44Gu5Yem55CG44KS5a6f6KGM44GX44Gm44KC5ZWP6aGM44Gq44GE5aC05ZCI44Gu44G/6LKr6YCa44KS5YGc5q2i44GZ44KLXG4gICAgICAgIGUucGFzcyA9IGZhbHNlO1xuXG4gICAgICAgIC8v5oq844GX44Gf5L2N572u44GL44KJ44GC44KL56iL5bqm56e75YuV44GX44Gm44GE44KL5aC05ZCI44Gv44Kv44Oq44OD44Kv44Kk44OZ44Oz44OI44KS55m655Sf44GV44Gb44Gq44GEXG4gICAgICAgIGNvbnN0IGlzTW92ZSA9IGUucG9pbnRlci5zdGFydFBvc2l0aW9uLnN1YihlLnBvaW50ZXIucG9zaXRpb24pLmxlbmd0aCgpID4gNTA7XG4gICAgICAgIGNvbnN0IGhpdFRlc3QgPSB0aGlzLnRhcmdldC5oaXRUZXN0KGUucG9pbnRlci54LCBlLnBvaW50ZXIueSk7XG4gICAgICAgIGlmIChoaXRUZXN0ICYmICFpc01vdmUpIHRoaXMudGFyZ2V0LmZsYXJlKFwiY2xpY2tTb3VuZFwiKTtcblxuICAgICAgICB0aGlzLnRhcmdldC5zY2FsZVR3ZWVuZXIuY2xlYXIoKVxuICAgICAgICAgIC50byh7XG4gICAgICAgICAgICBzY2FsZVg6IDEuMCAqIHRoaXMuc3gsXG4gICAgICAgICAgICBzY2FsZVk6IDEuMCAqIHRoaXMuc3lcbiAgICAgICAgICB9LCA1MClcbiAgICAgICAgICAuY2FsbCgoKSA9PiB7XG4gICAgICAgICAgICBCdXR0b24uYWN0aW9uVGFyZ2V0ID0gbnVsbDtcbiAgICAgICAgICAgIGlmICghaGl0VGVzdCB8fCBpc01vdmUgfHwgdGhpcy5kb0xvbmdwcmVzcykgcmV0dXJuO1xuICAgICAgICAgICAgdGhpcy50YXJnZXQuZmxhcmUoXCJjbGlja2VkXCIsIHtcbiAgICAgICAgICAgICAgcG9pbnRlcjogZS5wb2ludGVyXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICAvL+OCouODi+ODoeODvOOCt+ODp+ODs+OBruacgOS4reOBq+WJiumZpOOBleOCjOOBn+WgtOWQiOOBq+WCmeOBiOOBpnJlbW92ZWTjgqTjg5njg7Pjg4jmmYLjgavjg5Xjg6njgrDjgpLlhYPjgavmiLvjgZfjgabjgYrjgY9cbiAgICAgIHRoaXMudGFyZ2V0Lm9uZShcInJlbW92ZWRcIiwgKCkgPT4ge1xuICAgICAgICBpZiAoQnV0dG9uLmFjdGlvblRhcmdldCA9PT0gdGhpcy50YXJnZXQpIHtcbiAgICAgICAgICBCdXR0b24uYWN0aW9uVGFyZ2V0ID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMudGFyZ2V0Lm9uKFwiY2xpY2tTb3VuZFwiLCAoKSA9PiB7XG4gICAgICAgIGlmICghdGhpcy50YXJnZXQuY2xpY2tTb3VuZCB8fCB0aGlzLnRhcmdldC5jbGlja1NvdW5kID09IFwiXCIpIHJldHVybjtcbiAgICAgICAgcGhpbmEuYXNzZXQuU291bmRNYW5hZ2VyLnBsYXkodGhpcy50YXJnZXQuY2xpY2tTb3VuZCk7XG4gICAgICB9KTtcblxuICAgIH0pO1xuICB9LFxuXG4gIC8v6ZW35oq844GX44Gu5by35Yi244Kt44Oj44Oz44K744OrXG4gIGxvbmdwcmVzc0NhbmNlbDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy50YXJnZXQudHdMb25ncHJlc3MuY2xlYXIoKTtcbiAgICB0aGlzLnRhcmdldC50d0xvbmdwcmVzc2luZy5jbGVhcigpO1xuICB9LFxuXG4gIF9zdGF0aWM6IHtcbiAgICAvL+ODnOOCv+ODs+WQjOaZguaKvOOBl+OCkuWItuW+oeOBmeOCi+OBn+OCgeOBq3N0YXR1c+OBr3N0YXRpY+OBq+OBmeOCi1xuICAgIHN0YXR1czogMCxcbiAgICBhY3Rpb25UYXJnZXQ6IG51bGwsXG4gICAgLy/ln7rmnKzoqK3lrppcbiAgICBkZWZhdWx0czoge1xuICAgICAgY2xpY2tTb3VuZDogXCJjb21tb24vc291bmRzL3NlL2J1dHRvblwiLFxuICAgIH0sXG5cbiAgICAvL+imquOCkuOBn+OBqeOBo+OBpkxpc3RWaWV344KS5o6i44GZXG4gICAgZmluZExpc3RWaWV3OiBmdW5jdGlvbihlbGVtZW50LCBwKSB7XG4gICAgICAvL+ODquOCueODiOODk+ODpeODvOOCkuaMgeOBo+OBpuOBhOOCi+WgtOWQiFxuICAgICAgaWYgKGVsZW1lbnQuTGlzdFZpZXcgIT0gbnVsbCkgcmV0dXJuIGVsZW1lbnQuTGlzdFZpZXc7XG4gICAgICAvL+imquOBjOOBquOBkeOCjOOBsOe1guS6hlxuICAgICAgaWYgKGVsZW1lbnQucGFyZW50ID09IG51bGwpIHJldHVybiBudWxsO1xuICAgICAgLy/opqrjgpLjgZ/jganjgotcbiAgICAgIHJldHVybiB0aGlzLmZpbmRMaXN0VmlldyhlbGVtZW50LnBhcmVudCk7XG4gICAgfVxuXG4gIH1cblxufSk7XG4iLCIvKipcclxuICog6Kaq44K544OX44Op44Kk44OI44Gu44OG44Kv44K544OB44Oj44KS5YiH44KK5oqc44GE44Gm6Ieq5YiG44Gu44OG44Kv44K544OB44Oj44Go44GZ44KL44K544OX44Op44Kk44OIXHJcbiAqIOimquOCueODl+ODqeOCpOODiOOBruWIh+OCiuaKnOOBi+OCjOOBn+mDqOWIhuOBr+OAgeWIh+OCiuaKnOOBjeevhOWbsuOBruW3puS4iuOBruODlOOCr+OCu+ODq+OBruiJsuOBp+Whl+OCiuOBpOOBtuOBleOCjOOCi1xyXG4gKiBcclxuICog6Kaq6KaB57Sg44Gu5ouh57iu44O75Zue6Lui44Gv6ICD5oWu44GX44Gq44GEXHJcbiAqL1xyXG5waGluYS5kZWZpbmUoXCJDbGlwU3ByaXRlXCIsIHtcclxuICBzdXBlckNsYXNzOiBcIkFjY2Vzc29yeVwiLFxyXG5cclxuICBpbml0OiBmdW5jdGlvbigpIHtcclxuICAgIHRoaXMuc3VwZXJJbml0KCk7XHJcbiAgICB0aGlzLm9uKFwiYXR0YWNoZWRcIiwgKCkgPT4ge1xyXG4gICAgICB0aGlzLnRhcmdldC5vbmUoXCJhZGRlZFwiLCAoKSA9PiB7XHJcbiAgICAgICAgdGhpcy5zZXR1cCgpO1xyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gIH0sXHJcblxyXG4gIHNldHVwOiBmdW5jdGlvbigpIHtcclxuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMudGFyZ2V0O1xyXG4gICAgY29uc3QgcGFyZW50ID0gdGFyZ2V0LnBhcmVudDtcclxuICAgIGlmIChwYXJlbnQgaW5zdGFuY2VvZiBwaGluYS5kaXNwbGF5LlNwcml0ZSkge1xyXG4gICAgICBjb25zdCB4ID0gcGFyZW50LndpZHRoICogcGFyZW50Lm9yaWdpbi54ICsgdGFyZ2V0LnggLSB0YXJnZXQud2lkdGggKiB0YXJnZXQub3JpZ2luLng7XHJcbiAgICAgIGNvbnN0IHkgPSBwYXJlbnQuaGVpZ2h0ICogcGFyZW50Lm9yaWdpbi55ICsgdGFyZ2V0LnkgLSB0YXJnZXQuaGVpZ2h0ICogdGFyZ2V0Lm9yaWdpbi55O1xyXG4gICAgICBjb25zdCB3ID0gdGFyZ2V0LndpZHRoO1xyXG4gICAgICBjb25zdCBoID0gdGFyZ2V0LmhlaWdodDtcclxuXHJcbiAgICAgIGNvbnN0IHBhcmVudFRleHR1cmUgPSBwYXJlbnQuaW1hZ2U7XHJcbiAgICAgIGNvbnN0IGNhbnZhcyA9IHBoaW5hLmdyYXBoaWNzLkNhbnZhcygpLnNldFNpemUodywgaCk7XHJcbiAgICAgIGNhbnZhcy5jb250ZXh0LmRyYXdJbWFnZShwYXJlbnRUZXh0dXJlLmRvbUVsZW1lbnQsIHgsIHksIHcsIGgsIDAsIDAsIHcsIGgpO1xyXG4gICAgICBpZiAocGFyZW50VGV4dHVyZSBpbnN0YW5jZW9mIHBoaW5hLmdyYXBoaWNzLkNhbnZhcykge1xyXG4gICAgICAgIC8vIOOCr+ODreODvOODs+OBl+OBpuOBneOBo+OBoeOCkuS9v+OBhlxyXG4gICAgICAgIGNvbnN0IHBhcmVudFRleHR1cmVDbG9uZSA9IHBoaW5hLmdyYXBoaWNzLkNhbnZhcygpLnNldFNpemUocGFyZW50VGV4dHVyZS53aWR0aCwgcGFyZW50VGV4dHVyZS5oZWlnaHQpO1xyXG4gICAgICAgIHBhcmVudFRleHR1cmVDbG9uZS5jb250ZXh0LmRyYXdJbWFnZShwYXJlbnRUZXh0dXJlLmRvbUVsZW1lbnQsIDAsIDApO1xyXG4gICAgICAgIHBhcmVudC5pbWFnZSA9IHBhcmVudFRleHR1cmVDbG9uZTtcclxuXHJcbiAgICAgICAgY29uc3QgZGF0YSA9IHBhcmVudFRleHR1cmVDbG9uZS5jb250ZXh0LmdldEltYWdlRGF0YSh4LCB5LCAxLCAxKS5kYXRhO1xyXG4gICAgICAgIHBhcmVudFRleHR1cmVDbG9uZS5jb250ZXh0LmNsZWFyUmVjdCh4LCB5LCB3LCBoKTtcclxuICAgICAgICBpZiAoZGF0YVszXSA+IDApIHtcclxuICAgICAgICAgIHBhcmVudFRleHR1cmVDbG9uZS5jb250ZXh0Lmdsb2JhbEFscGhhID0gMTtcclxuICAgICAgICAgIHBhcmVudFRleHR1cmVDbG9uZS5jb250ZXh0LmZpbGxTdHlsZSA9IGByZ2JhKCR7ZGF0YVswXX0sICR7ZGF0YVsxXX0sICR7ZGF0YVsyXX0sICR7ZGF0YVszXSAvIDI1NX0pYDtcclxuICAgICAgICAgIHBhcmVudFRleHR1cmVDbG9uZS5jb250ZXh0LmZpbGxSZWN0KHggLSAxLCB5IC0gMSwgdyArIDIsIGggKyAyKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IHNwcml0ZSA9IHBoaW5hLmRpc3BsYXkuU3ByaXRlKGNhbnZhcyk7XHJcbiAgICAgIHNwcml0ZS5zZXRPcmlnaW4odGFyZ2V0Lm9yaWdpbi54LCB0YXJnZXQub3JpZ2luLnkpO1xyXG4gICAgICB0YXJnZXQuYWRkQ2hpbGRBdChzcHJpdGUsIDApO1xyXG4gICAgfVxyXG4gIH0sXHJcbn0pO1xyXG4iLCJwaGluYS5kZWZpbmUoXCJHYXVnZVwiLCB7XG4gIHN1cGVyQ2xhc3M6IFwiUmVjdGFuZ2xlQ2xpcFwiLFxuXG4gIF9taW46IDAsXG4gIF9tYXg6IDEuMCxcbiAgX3ZhbHVlOiAxLjAsIC8vbWluIH4gbWF4XG5cbiAgZGlyZWN0aW9uOiBcImhvcml6b250YWxcIiwgLy8gaG9yaXpvbnRhbCBvciB2ZXJ0aWNhbFxuXG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3VwZXJJbml0KCk7XG4gICAgdGhpcy5vbihcImF0dGFjaGVkXCIsICgpID0+IHtcbiAgICAgIHRoaXMuX3dpZHRoID0gdGhpcy53aWR0aDtcbiAgICAgIHRoaXMuX2hlaWdodCA9IHRoaXMud2lkdGg7XG5cbiAgICAgIHRoaXMudGFyZ2V0LmFjY2Vzc29yKFwiR2F1Z2UubWluXCIsIHtcbiAgICAgICAgXCJnZXRcIjogKCkgPT4gdGhpcy5taW4sXG4gICAgICAgIFwic2V0XCI6ICh2KSA9PiB0aGlzLm1pbiA9IHYsXG4gICAgICB9KTtcblxuICAgICAgdGhpcy50YXJnZXQuYWNjZXNzb3IoXCJHYXVnZS5tYXhcIiwge1xuICAgICAgICBcImdldFwiOiAoKSA9PiB0aGlzLm1heCxcbiAgICAgICAgXCJzZXRcIjogKHYpID0+IHRoaXMubWF4ID0gdixcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnRhcmdldC5hY2Nlc3NvcihcIkdhdWdlLnZhbHVlXCIsIHtcbiAgICAgICAgXCJnZXRcIjogKCkgPT4gdGhpcy52YWx1ZSxcbiAgICAgICAgXCJzZXRcIjogKHYpID0+IHRoaXMudmFsdWUgPSB2LFxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMudGFyZ2V0LmFjY2Vzc29yKFwiR2F1Z2UucHJvZ3Jlc3NcIiwge1xuICAgICAgICBcImdldFwiOiAoKSA9PiB0aGlzLnByb2dyZXNzLFxuICAgICAgICBcInNldFwiOiAodikgPT4gdGhpcy5wcm9ncmVzcyA9IHYsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSxcblxuICBfcmVmcmVzaDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuZGlyZWN0aW9uICE9PSBcInZlcnRpY2FsXCIpIHtcbiAgICAgIHRoaXMud2lkdGggPSB0aGlzLnRhcmdldC53aWR0aCAqIHRoaXMucHJvZ3Jlc3M7XG4gICAgICB0aGlzLmhlaWdodCA9IHRoaXMudGFyZ2V0LmhlaWdodDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy53aWR0aCA9IHRoaXMudGFyZ2V0LndpZHRoO1xuICAgICAgdGhpcy5oZWlnaHQgPSB0aGlzLnRhcmdldC5oZWlnaHQgKiB0aGlzLnByb2dyZXNzO1xuICAgIH1cbiAgfSxcblxuICBfYWNjZXNzb3I6IHtcbiAgICBwcm9ncmVzczoge1xuICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3QgcCA9ICh0aGlzLnZhbHVlIC0gdGhpcy5taW4pIC8gKHRoaXMubWF4IC0gdGhpcy5taW4pO1xuICAgICAgICByZXR1cm4gKGlzTmFOKHApKSA/IDAuMCA6IHA7XG4gICAgICB9LFxuICAgICAgc2V0OiBmdW5jdGlvbih2KSB7XG4gICAgICAgIHRoaXMudmFsdWUgPSB0aGlzLm1heCAqIHY7XG4gICAgICB9XG4gICAgfSxcblxuICAgIG1heDoge1xuICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX21heDtcbiAgICAgIH0sXG4gICAgICBzZXQ6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgdGhpcy5fbWF4ID0gdjtcbiAgICAgICAgdGhpcy5fcmVmcmVzaCgpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBtaW46IHtcbiAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9taW47XG4gICAgICB9LFxuICAgICAgc2V0OiBmdW5jdGlvbih2KSB7XG4gICAgICAgIHRoaXMuX21pbiA9IHY7XG4gICAgICAgIHRoaXMuX3JlZnJlc2goKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgdmFsdWU6IHtcbiAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZTtcbiAgICAgIH0sXG4gICAgICBzZXQ6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgdGhpcy5fdmFsdWUgPSB2O1xuICAgICAgICB0aGlzLl9yZWZyZXNoKCk7XG4gICAgICB9XG4gICAgfSxcbiAgfVxuXG59KTtcbiIsInBoaW5hLmRlZmluZShcIkdyYXlzY2FsZVwiLCB7XG4gIHN1cGVyQ2xhc3M6IFwiQWNjZXNzb3J5XCIsXG5cbiAgZ3JheVRleHR1cmVOYW1lOiBudWxsLFxuXG4gIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICB0aGlzLnN1cGVySW5pdCgpO1xuICAgIHRoaXMub24oXCJhdHRhY2hlZFwiLCAoKSA9PiB7XG4gICAgICB0aGlzLmdyYXlUZXh0dXJlTmFtZSA9IG9wdGlvbnMuZ3JheVRleHR1cmVOYW1lO1xuICAgICAgdGhpcy5ub3JtYWwgPSB0aGlzLnRhcmdldC5pbWFnZTtcbiAgICB9KTtcbiAgfSxcblxuICB0b0dyYXlzY2FsZTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy50YXJnZXQuaW1hZ2UgPSB0aGlzLmdyYXlUZXh0dXJlTmFtZTtcbiAgfSxcblxuICB0b05vcm1hbDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy50YXJnZXQuaW1hZ2UgPSB0aGlzLm5vcm1hbDtcbiAgfSxcblxufSk7XG4iLCJwaGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG4gIC8v44Oe44Km44K56L+95b6TXG4gIHBoaW5hLmRlZmluZShcIk1vdXNlQ2hhc2VyXCIsIHtcbiAgICBzdXBlckNsYXNzOiBcIkFjY2Vzc29yeVwiLFxuXG4gICAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnN1cGVySW5pdCgpO1xuICAgIH0sXG5cbiAgICBvbmF0dGFjaGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIGxldCBweCA9IDA7XG4gICAgICBsZXQgcHkgPSAwO1xuICAgICAgY29uc29sZS5sb2coXCIjTW91c2VDaGFzZXJcIiwgXCJvbmF0dGFjaGVkXCIpO1xuICAgICAgdGhpcy50d2VlbmVyID0gVHdlZW5lcigpLmF0dGFjaFRvKHRoaXMudGFyZ2V0KTtcbiAgICAgIHRoaXMudGFyZ2V0Lm9uKFwiZW50ZXJmcmFtZVwiLCAoZSkgPT4ge1xuICAgICAgICBjb25zdCBwID0gZS5hcHAucG9pbnRlcjtcbiAgICAgICAgaWYgKHB5ID09IHAueCAmJiBweSA9PSBwLnkpIHJldHVybjtcbiAgICAgICAgcHggPSBwLng7XG4gICAgICAgIHB5ID0gcC55O1xuICAgICAgICBjb25zdCB4ID0gcC54IC0gU0NSRUVOX1dJRFRIX0hBTEY7XG4gICAgICAgIGNvbnN0IHkgPSBwLnkgLSBTQ1JFRU5fSEVJR0hUX0hBTEY7XG4gICAgICAgIHRoaXMudHdlZW5lci5jbGVhcigpLnRvKHsgeCwgeSB9LCAyMDAwLCBcImVhc2VPdXRRdWFkXCIpXG4gICAgICB9KTtcblxuICAgIH0sXG5cbiAgICBvbmRldGFjaGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiI01vdXNlQ2hhc2VyXCIsIFwib25kZXRhY2hlZFwiKTtcbiAgICAgIHRoaXMudHdlZW5lci5yZW1vdmUoKTtcbiAgICB9XG5cbiAgfSk7XG59KTtcbiIsInBoaW5hLmRlZmluZShcIk11bHRpUmVjdGFuZ2xlQ2xpcFwiLCB7XG4gIHN1cGVyQ2xhc3M6IFwiQWNjZXNzb3J5XCIsXG5cbiAgeDogMCxcbiAgeTogMCxcbiAgd2lkdGg6IDAsXG4gIGhlaWdodDogMCxcblxuICBfZW5hYmxlOiB0cnVlLFxuXG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3VwZXJJbml0KCk7XG4gICAgdGhpcy5faW5pdCgpO1xuICB9LFxuXG4gIF9pbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmNsaXBSZWN0ID0gW107XG5cbiAgICB0aGlzLm9uKFwiYXR0YWNoZWRcIiwgKCkgPT4ge1xuICAgICAgdGhpcy54ID0gMDtcbiAgICAgIHRoaXMueSA9IDA7XG4gICAgICB0aGlzLndpZHRoID0gdGhpcy50YXJnZXQud2lkdGg7XG4gICAgICB0aGlzLmhlaWdodCA9IHRoaXMudGFyZ2V0LmhlaWdodDtcblxuICAgICAgdGhpcy50YXJnZXQuY2xpcCA9IChjKSA9PiB0aGlzLl9jbGlwKGMpO1xuICAgIH0pO1xuICB9LFxuXG4gIGFkZENsaXBSZWN0OiBmdW5jdGlvbihyZWN0KSB7XG4gICAgY29uc3QgciA9IHtcbiAgICAgIHg6IHJlY3QueCxcbiAgICAgIHk6IHJlY3QueSxcbiAgICAgIHdpZHRoOiByZWN0LndpZHRoLFxuICAgICAgaGVpZ2h0OiByZWN0LmhlaWdodCxcbiAgICB9O1xuICAgIHRoaXMuY2xpcFJlY3QucHVzaChyKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBjbGVhckNsaXBSZWN0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmNsaXBSZWN0ID0gW107XG4gIH0sXG5cbiAgX2NsaXA6IGZ1bmN0aW9uKGNhbnZhcykge1xuICAgIGNhbnZhcy5iZWdpblBhdGgoKTtcbiAgICB0aGlzLmNsaXBSZWN0LmZvckVhY2gocmVjdCA9PiB7XG4gICAgICBjYW52YXMucmVjdChyZWN0LngsIHJlY3QueSwgcmVjdC53aWR0aCwgcmVjdC5oZWlnaHQpXG4gICAgfSk7XG4gICAgY2FudmFzLmNsb3NlUGF0aCgpO1xuICB9LFxuXG4gIHNldEVuYWJsZTogZnVuY3Rpb24oZW5hYmxlKSB7XG4gICAgdGhpcy5fZW5hYmxlID0gZW5hYmxlO1xuICAgIGlmICh0aGlzLl9lbmFibGUpIHtcbiAgICAgIHRoaXMudGFyZ2V0LmNsaXAgPSAoYykgPT4gdGhpcy5fY2xpcChjKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy50YXJnZXQuY2xpcCA9IG51bGw7XG4gICAgfVxuICB9LFxuXG4gIF9hY2Nlc3Nvcjoge1xuICAgIGVuYWJsZToge1xuICAgICAgc2V0OiBmdW5jdGlvbih2KSB7XG4gICAgICAgIHRoaXMuc2V0RW5hYmxlKHYpO1xuICAgICAgfSxcbiAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbmFibGU7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG59KTtcbiIsInBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5kZWZpbmUoXCJQaWVDbGlwXCIsIHtcbiAgICBzdXBlckNsYXNzOiBcIkFjY2Vzc29yeVwiLFxuXG4gICAgaW5pdDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9ICh7fSkuJHNhZmUob3B0aW9ucywgUGllQ2xpcC5kZWZhdWx0cylcbiAgICAgIHRoaXMuc3VwZXJJbml0KG9wdGlvbnMpO1xuXG4gICAgICB0aGlzLnBpdm90WCA9IG9wdGlvbnMucGl2b3RYO1xuICAgICAgdGhpcy5waXZvdFkgPSBvcHRpb25zLnBpdm90WTtcbiAgICAgIHRoaXMuYW5nbGVNaW4gPSBvcHRpb25zLmFuZ2xlTWluO1xuICAgICAgdGhpcy5hbmdsZU1heCA9IG9wdGlvbnMuYW5nbGVNYXg7XG4gICAgICB0aGlzLnJhZGl1cyA9IG9wdGlvbnMucmFkaXVzO1xuICAgICAgdGhpcy5hbnRpY2xvY2t3aXNlID0gb3B0aW9ucy5hbnRpY2xvY2t3aXNlO1xuICAgIH0sXG5cbiAgICBvbmF0dGFjaGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMudGFyZ2V0LmNsaXAgPSAoY2FudmFzKSA9PiB7XG4gICAgICAgIGNvbnN0IGFuZ2xlTWluID0gdGhpcy5hbmdsZU1pbiAqIE1hdGguREVHX1RPX1JBRDtcbiAgICAgICAgY29uc3QgYW5nbGVNYXggPSB0aGlzLmFuZ2xlTWF4ICogTWF0aC5ERUdfVE9fUkFEO1xuICAgICAgICBjb25zdCBjdHggPSBjYW52YXMuY29udGV4dDtcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgICBjdHgubW92ZVRvKHRoaXMucGl2b3RYLCB0aGlzLnBpdm90WSk7XG4gICAgICAgIGN0eC5saW5lVG8odGhpcy5waXZvdFggKyBNYXRoLmNvcyhhbmdsZU1pbikgKiB0aGlzLnJhZGl1cywgdGhpcy5waXZvdFkgKyBNYXRoLnNpbihhbmdsZU1pbikgKiB0aGlzLnJhZGl1cyk7XG4gICAgICAgIGN0eC5hcmModGhpcy5waXZvdFgsIHRoaXMucGl2b3RZLCB0aGlzLnJhZGl1cywgYW5nbGVNaW4sIGFuZ2xlTWF4LCB0aGlzLmFudGljbG9ja3dpc2UpO1xuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XG4gICAgICB9O1xuICAgIH0sXG5cbiAgICBfc3RhdGljOiB7XG4gICAgICBkZWZhdWx0czoge1xuICAgICAgICBwaXZvdFg6IDMyLFxuICAgICAgICBwaXZvdFk6IDMyLFxuICAgICAgICBhbmdsZU1pbjogMCxcbiAgICAgICAgYW5nbGVNYXg6IDM2MCxcbiAgICAgICAgcmFkaXVzOiA2NCxcbiAgICAgICAgYW50aWNsb2Nrd2lzZTogZmFsc2UsXG4gICAgICB9LFxuICAgIH0sXG5cbiAgfSk7XG59KTtcbiIsInBoaW5hLmRlZmluZShcIlJlY3RhbmdsZUNsaXBcIiwge1xuICBzdXBlckNsYXNzOiBcIkFjY2Vzc29yeVwiLFxuXG4gIHg6IDAsXG4gIHk6IDAsXG4gIHdpZHRoOiAwLFxuICBoZWlnaHQ6IDAsXG5cbiAgX2VuYWJsZTogdHJ1ZSxcblxuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN1cGVySW5pdCgpO1xuICAgIHRoaXMuX2luaXQoKTtcbiAgfSxcblxuICBfaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5vbihcImF0dGFjaGVkXCIsICgpID0+IHtcblxuICAgICAgdGhpcy50YXJnZXQuYWNjZXNzb3IoXCJSZWN0YW5nbGVDbGlwLndpZHRoXCIsIHtcbiAgICAgICAgXCJnZXRcIjogKCkgPT4gdGhpcy53aWR0aCxcbiAgICAgICAgXCJzZXRcIjogKHYpID0+IHRoaXMud2lkdGggPSB2LFxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMudGFyZ2V0LmFjY2Vzc29yKFwiUmVjdGFuZ2xlQ2xpcC5oZWlnaHRcIiwge1xuICAgICAgICBcImdldFwiOiAoKSA9PiB0aGlzLmhlaWdodCxcbiAgICAgICAgXCJzZXRcIjogKHYpID0+IHRoaXMuaGVpZ2h0ID0gdixcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnRhcmdldC5hY2Nlc3NvcihcIlJlY3RhbmdsZUNsaXAueFwiLCB7XG4gICAgICAgIFwiZ2V0XCI6ICgpID0+IHRoaXMueCxcbiAgICAgICAgXCJzZXRcIjogKHYpID0+IHRoaXMueCA9IHYsXG4gICAgICB9KTtcblxuICAgICAgdGhpcy50YXJnZXQuYWNjZXNzb3IoXCJSZWN0YW5nbGVDbGlwLnlcIiwge1xuICAgICAgICBcImdldFwiOiAoKSA9PiB0aGlzLnksXG4gICAgICAgIFwic2V0XCI6ICh2KSA9PiB0aGlzLnkgPSB2LFxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMueCA9IDA7XG4gICAgICB0aGlzLnkgPSAwO1xuICAgICAgdGhpcy53aWR0aCA9IHRoaXMudGFyZ2V0LndpZHRoO1xuICAgICAgdGhpcy5oZWlnaHQgPSB0aGlzLnRhcmdldC5oZWlnaHQ7XG5cbiAgICAgIHRoaXMudGFyZ2V0LmNsaXAgPSAoYykgPT4gdGhpcy5fY2xpcChjKTtcbiAgICB9KTtcbiAgfSxcblxuICBfY2xpcDogZnVuY3Rpb24oY2FudmFzKSB7XG4gICAgY29uc3QgeCA9IHRoaXMueCAtICh0aGlzLndpZHRoICogdGhpcy50YXJnZXQub3JpZ2luWCk7XG4gICAgY29uc3QgeSA9IHRoaXMueSAtICh0aGlzLmhlaWdodCAqIHRoaXMudGFyZ2V0Lm9yaWdpblkpO1xuXG4gICAgY2FudmFzLmJlZ2luUGF0aCgpO1xuICAgIGNhbnZhcy5yZWN0KHgsIHksIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcbiAgICBjYW52YXMuY2xvc2VQYXRoKCk7XG4gIH0sXG5cbiAgc2V0RW5hYmxlOiBmdW5jdGlvbihlbmFibGUpIHtcbiAgICB0aGlzLl9lbmFibGUgPSBlbmFibGU7XG4gICAgaWYgKHRoaXMuX2VuYWJsZSkge1xuICAgICAgdGhpcy50YXJnZXQuY2xpcCA9IChjKSA9PiB0aGlzLl9jbGlwKGMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnRhcmdldC5jbGlwID0gbnVsbDtcbiAgICB9XG4gIH0sXG5cbiAgX2FjY2Vzc29yOiB7XG4gICAgZW5hYmxlOiB7XG4gICAgICBzZXQ6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgdGhpcy5zZXRFbmFibGUodik7XG4gICAgICB9LFxuICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VuYWJsZTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbn0pO1xuIiwicGhpbmEuZGVmaW5lKFwiVG9nZ2xlXCIsIHtcbiAgc3VwZXJDbGFzczogXCJBY2Nlc3NvcnlcIixcblxuICBpbml0OiBmdW5jdGlvbihpc09uKSB7XG4gICAgdGhpcy5zdXBlckluaXQoKTtcbiAgICB0aGlzLl9pbml0KGlzT24pO1xuICB9LFxuXG4gIF9pbml0OiBmdW5jdGlvbihpc09uKSB7XG4gICAgdGhpcy5pc09uID0gaXNPbiB8fCBmYWxzZTtcbiAgfSxcblxuICBzZXRTdGF0dXM6IGZ1bmN0aW9uKHN0YXR1cykge1xuICAgIHRoaXMuaXNPbiA9IHN0YXR1cztcbiAgICB0aGlzLnRhcmdldC5mbGFyZSgodGhpcy5pc09uKSA/IFwic3dpdGNoT25cIiA6IFwic3dpdGNoT2ZmXCIpO1xuICB9LFxuXG4gIHN3aXRjaE9uOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5pc09uKSByZXR1cm47XG4gICAgdGhpcy5zZXRTdGF0dXModHJ1ZSk7XG4gIH0sXG5cbiAgc3dpdGNoT2ZmOiBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMuaXNPbikgcmV0dXJuO1xuICAgIHRoaXMuc2V0U3RhdHVzKGZhbHNlKTtcbiAgfSxcblxuICBzd2l0Y2g6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaXNPbiA9ICF0aGlzLmlzT247XG4gICAgdGhpcy5zZXRTdGF0dXModGhpcy5pc09uKTtcbiAgfSxcblxuICBfYWNjZXNzb3I6IHtcbiAgICBzdGF0dXM6IHtcbiAgICAgIFwiZ2V0XCI6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5pc09uO1xuICAgICAgfSxcbiAgICAgIFwic2V0XCI6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgcmV0dXJuIHNldFN0YXR1cyh2KTtcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcblxufSk7XG4iLCJwaGluYS5hc3NldC5Bc3NldExvYWRlci5wcm90b3R5cGUubG9hZCA9IGZ1bmN0aW9uKHBhcmFtcykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBsb2FkQXNzZXRzID0gW107XG4gIHZhciBjb3VudGVyID0gMDtcbiAgdmFyIGxlbmd0aCA9IDA7XG4gIHZhciBtYXhDb25uZWN0aW9uQ291bnQgPSAyO1xuXG4gIHBhcmFtcy5mb3JJbihmdW5jdGlvbih0eXBlLCBhc3NldHMpIHtcbiAgICBsZW5ndGggKz0gT2JqZWN0LmtleXMoYXNzZXRzKS5sZW5ndGg7XG4gIH0pO1xuXG4gIGlmIChsZW5ndGggPT0gMCkge1xuICAgIHJldHVybiBwaGluYS51dGlsLkZsb3cucmVzb2x2ZSgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICBzZWxmLmZsYXJlKCdsb2FkJyk7XG4gICAgfSk7XG4gIH1cblxuICBwYXJhbXMuZm9ySW4oZnVuY3Rpb24odHlwZSwgYXNzZXRzKSB7XG4gICAgYXNzZXRzLmZvckluKGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgIGxvYWRBc3NldHMucHVzaCh7XG4gICAgICAgIFwiZnVuY1wiOiBwaGluYS5hc3NldC5Bc3NldExvYWRlci5hc3NldExvYWRGdW5jdGlvbnNbdHlwZV0sXG4gICAgICAgIFwia2V5XCI6IGtleSxcbiAgICAgICAgXCJ2YWx1ZVwiOiB2YWx1ZSxcbiAgICAgICAgXCJ0eXBlXCI6IHR5cGUsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgaWYgKHNlbGYuY2FjaGUpIHtcbiAgICBzZWxmLm9uKCdwcm9ncmVzcycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIGlmIChlLnByb2dyZXNzID49IDEuMCkge1xuICAgICAgICBwYXJhbXMuZm9ySW4oZnVuY3Rpb24odHlwZSwgYXNzZXRzKSB7XG4gICAgICAgICAgYXNzZXRzLmZvckluKGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBhc3NldCA9IHBoaW5hLmFzc2V0LkFzc2V0TWFuYWdlci5nZXQodHlwZSwga2V5KTtcbiAgICAgICAgICAgIGlmIChhc3NldC5sb2FkRXJyb3IpIHtcbiAgICAgICAgICAgICAgdmFyIGR1bW15ID0gcGhpbmEuYXNzZXQuQXNzZXRNYW5hZ2VyLmdldCh0eXBlLCAnZHVtbXknKTtcbiAgICAgICAgICAgICAgaWYgKGR1bW15KSB7XG4gICAgICAgICAgICAgICAgaWYgKGR1bW15LmxvYWRFcnJvcikge1xuICAgICAgICAgICAgICAgICAgZHVtbXkubG9hZER1bW15KCk7XG4gICAgICAgICAgICAgICAgICBkdW1teS5sb2FkRXJyb3IgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGhpbmEuYXNzZXQuQXNzZXRNYW5hZ2VyLnNldCh0eXBlLCBrZXksIGR1bW15KTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhc3NldC5sb2FkRHVtbXkoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHZhciBsb2FkQXNzZXRzQXJyYXkgPSBbXTtcblxuICB3aGlsZSAobG9hZEFzc2V0cy5sZW5ndGggPiAwKSB7XG4gICAgbG9hZEFzc2V0c0FycmF5LnB1c2gobG9hZEFzc2V0cy5zcGxpY2UoMCwgbWF4Q29ubmVjdGlvbkNvdW50KSk7XG4gIH1cblxuICB2YXIgZmxvdyA9IHBoaW5hLnV0aWwuRmxvdy5yZXNvbHZlKCk7XG5cbiAgbG9hZEFzc2V0c0FycmF5LmZvckVhY2goZnVuY3Rpb24obG9hZEFzc2V0cykge1xuICAgIGZsb3cgPSBmbG93LnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZmxvd3MgPSBbXTtcbiAgICAgIGxvYWRBc3NldHMuZm9yRWFjaChmdW5jdGlvbihsb2FkQXNzZXQpIHtcbiAgICAgICAgdmFyIGYgPSBsb2FkQXNzZXQuZnVuYyhsb2FkQXNzZXQua2V5LCBsb2FkQXNzZXQudmFsdWUpO1xuICAgICAgICBmLnRoZW4oZnVuY3Rpb24oYXNzZXQpIHtcbiAgICAgICAgICBpZiAoc2VsZi5jYWNoZSkge1xuICAgICAgICAgICAgcGhpbmEuYXNzZXQuQXNzZXRNYW5hZ2VyLnNldChsb2FkQXNzZXQudHlwZSwgbG9hZEFzc2V0LmtleSwgYXNzZXQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzZWxmLmZsYXJlKCdwcm9ncmVzcycsIHtcbiAgICAgICAgICAgIGtleTogbG9hZEFzc2V0LmtleSxcbiAgICAgICAgICAgIGFzc2V0OiBhc3NldCxcbiAgICAgICAgICAgIHByb2dyZXNzOiAoKytjb3VudGVyIC8gbGVuZ3RoKSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIGZsb3dzLnB1c2goZik7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBwaGluYS51dGlsLkZsb3cuYWxsKGZsb3dzKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIGZsb3cudGhlbihmdW5jdGlvbihhcmdzKSB7XG4gICAgc2VsZi5mbGFyZSgnbG9hZCcpO1xuICB9KTtcbn1cbiIsInBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5hcHAuQmFzZUFwcC5wcm90b3R5cGUuJG1ldGhvZChcInJlcGxhY2VTY2VuZVwiLCBmdW5jdGlvbihzY2VuZSkge1xuICAgIHRoaXMuZmxhcmUoJ3JlcGxhY2UnKTtcbiAgICB0aGlzLmZsYXJlKCdjaGFuZ2VzY2VuZScpO1xuXG4gICAgd2hpbGUgKHRoaXMuX3NjZW5lcy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBzY2VuZSA9IHRoaXMuX3NjZW5lcy5wb3AoKTtcbiAgICAgIHNjZW5lLmZsYXJlKFwiZGVzdHJveVwiKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zY2VuZUluZGV4ID0gMDtcblxuICAgIGlmICh0aGlzLmN1cnJlbnRTY2VuZSkge1xuICAgICAgdGhpcy5jdXJyZW50U2NlbmUuYXBwID0gbnVsbDtcbiAgICB9XG5cbiAgICB0aGlzLmN1cnJlbnRTY2VuZSA9IHNjZW5lO1xuICAgIHRoaXMuY3VycmVudFNjZW5lLmFwcCA9IHRoaXM7XG4gICAgdGhpcy5jdXJyZW50U2NlbmUuZmxhcmUoJ2VudGVyJywge1xuICAgICAgYXBwOiB0aGlzLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0pO1xuXG4gIHBoaW5hLmFwcC5CYXNlQXBwLnByb3RvdHlwZS4kbWV0aG9kKFwicG9wU2NlbmVcIiwgZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5mbGFyZSgncG9wJyk7XG4gICAgdGhpcy5mbGFyZSgnY2hhbmdlc2NlbmUnKTtcblxuICAgIHZhciBzY2VuZSA9IHRoaXMuX3NjZW5lcy5wb3AoKTtcbiAgICAtLXRoaXMuX3NjZW5lSW5kZXg7XG5cbiAgICBzY2VuZS5mbGFyZSgnZXhpdCcsIHtcbiAgICAgIGFwcDogdGhpcyxcbiAgICB9KTtcbiAgICBzY2VuZS5mbGFyZSgnZGVzdHJveScpO1xuICAgIHNjZW5lLmFwcCA9IG51bGw7XG5cbiAgICB0aGlzLmZsYXJlKCdwb3BlZCcpO1xuXG4gICAgLy8gXG4gICAgdGhpcy5jdXJyZW50U2NlbmUuZmxhcmUoJ3Jlc3VtZScsIHtcbiAgICAgIGFwcDogdGhpcyxcbiAgICAgIHByZXZTY2VuZTogc2NlbmUsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gc2NlbmU7XG4gIH0pO1xuXG59KTtcbiIsInBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5ncmFwaGljcy5DYW52YXMucHJvdG90eXBlLiRtZXRob2QoXCJpbml0XCIsIGZ1bmN0aW9uKGNhbnZhcykge1xuICAgIHRoaXMuaXNDcmVhdGVDYW52YXMgPSBmYWxzZTtcbiAgICBpZiAodHlwZW9mIGNhbnZhcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMuY2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihjYW52YXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoY2FudmFzKSB7XG4gICAgICAgIHRoaXMuY2FudmFzID0gY2FudmFzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgdGhpcy5pc0NyZWF0ZUNhbnZhcyA9IHRydWU7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCcjIyMjIGNyZWF0ZSBjYW52YXMgIyMjIycpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuZG9tRWxlbWVudCA9IHRoaXMuY2FudmFzO1xuICAgIHRoaXMuY29udGV4dCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgdGhpcy5jb250ZXh0LmxpbmVDYXAgPSAncm91bmQnO1xuICAgIHRoaXMuY29udGV4dC5saW5lSm9pbiA9ICdyb3VuZCc7XG4gIH0pO1xuXG4gIHBoaW5hLmdyYXBoaWNzLkNhbnZhcy5wcm90b3R5cGUuJG1ldGhvZCgnZGVzdHJveScsIGZ1bmN0aW9uKGNhbnZhcykge1xuICAgIGlmICghdGhpcy5pc0NyZWF0ZUNhbnZhcykgcmV0dXJuO1xuICAgIC8vIGNvbnNvbGUubG9nKGAjIyMjIGRlbGV0ZSBjYW52YXMgJHt0aGlzLmNhbnZhcy53aWR0aH0geCAke3RoaXMuY2FudmFzLmhlaWdodH0gIyMjI2ApO1xuICAgIHRoaXMuc2V0U2l6ZSgwLCAwKTtcbiAgICBkZWxldGUgdGhpcy5jYW52YXM7XG4gICAgZGVsZXRlIHRoaXMuZG9tRWxlbWVudDtcbiAgfSk7XG5cbn0pO1xuIiwicGhpbmEubmFtZXNwYWNlKCgpID0+IHtcblxuICB2YXIgcXVhbGl0eVNjYWxlID0gcGhpbmEuZ2VvbS5NYXRyaXgzMygpO1xuXG4gIHBoaW5hLmRpc3BsYXkuQ2FudmFzUmVuZGVyZXIucHJvdG90eXBlLiRtZXRob2QoXCJyZW5kZXJcIiwgZnVuY3Rpb24oc2NlbmUsIHF1YWxpdHkpIHtcbiAgICB0aGlzLmNhbnZhcy5jbGVhcigpO1xuICAgIGlmIChzY2VuZS5iYWNrZ3JvdW5kQ29sb3IpIHtcbiAgICAgIHRoaXMuY2FudmFzLmNsZWFyQ29sb3Ioc2NlbmUuYmFja2dyb3VuZENvbG9yKTtcbiAgICB9XG5cbiAgICB0aGlzLl9jb250ZXh0LnNhdmUoKTtcbiAgICB0aGlzLnJlbmRlckNoaWxkcmVuKHNjZW5lLCBxdWFsaXR5KTtcbiAgICB0aGlzLl9jb250ZXh0LnJlc3RvcmUoKTtcbiAgfSk7XG5cbiAgcGhpbmEuZGlzcGxheS5DYW52YXNSZW5kZXJlci5wcm90b3R5cGUuJG1ldGhvZChcInJlbmRlckNoaWxkcmVuXCIsIGZ1bmN0aW9uKG9iaiwgcXVhbGl0eSkge1xuICAgIC8vIOWtkOS+m+OBn+OBoeOCguWun+ihjFxuICAgIGlmIChvYmouY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xuICAgICAgdmFyIHRlbXBDaGlsZHJlbiA9IG9iai5jaGlsZHJlbi5zbGljZSgpO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRlbXBDaGlsZHJlbi5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgICB0aGlzLnJlbmRlck9iamVjdCh0ZW1wQ2hpbGRyZW5baV0sIHF1YWxpdHkpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcGhpbmEuZGlzcGxheS5DYW52YXNSZW5kZXJlci5wcm90b3R5cGUuJG1ldGhvZChcInJlbmRlck9iamVjdFwiLCBmdW5jdGlvbihvYmosIHF1YWxpdHkpIHtcbiAgICBpZiAob2JqLnZpc2libGUgPT09IGZhbHNlICYmICFvYmouaW50ZXJhY3RpdmUpIHJldHVybjtcblxuICAgIG9iai5fY2FsY1dvcmxkTWF0cml4ICYmIG9iai5fY2FsY1dvcmxkTWF0cml4KCk7XG5cbiAgICBpZiAob2JqLnZpc2libGUgPT09IGZhbHNlKSByZXR1cm47XG5cbiAgICBvYmouX2NhbGNXb3JsZEFscGhhICYmIG9iai5fY2FsY1dvcmxkQWxwaGEoKTtcblxuICAgIHZhciBjb250ZXh0ID0gdGhpcy5jYW52YXMuY29udGV4dDtcblxuICAgIGNvbnRleHQuZ2xvYmFsQWxwaGEgPSBvYmouX3dvcmxkQWxwaGE7XG4gICAgY29udGV4dC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBvYmouYmxlbmRNb2RlO1xuXG4gICAgaWYgKG9iai5fd29ybGRNYXRyaXgpIHtcblxuICAgICAgcXVhbGl0eVNjYWxlLmlkZW50aXR5KCk7XG5cbiAgICAgIHF1YWxpdHlTY2FsZS5tMDAgPSBxdWFsaXR5IHx8IDEuMDtcbiAgICAgIHF1YWxpdHlTY2FsZS5tMTEgPSBxdWFsaXR5IHx8IDEuMDtcblxuICAgICAgdmFyIG0gPSBxdWFsaXR5U2NhbGUubXVsdGlwbHkob2JqLl93b3JsZE1hdHJpeCk7XG4gICAgICBjb250ZXh0LnNldFRyYW5zZm9ybShtLm0wMCwgbS5tMTAsIG0ubTAxLCBtLm0xMSwgbS5tMDIsIG0ubTEyKTtcblxuICAgIH1cblxuICAgIGlmIChvYmouY2xpcCkge1xuXG4gICAgICBjb250ZXh0LnNhdmUoKTtcblxuICAgICAgb2JqLmNsaXAodGhpcy5jYW52YXMpO1xuICAgICAgY29udGV4dC5jbGlwKCk7XG5cbiAgICAgIGlmIChvYmouZHJhdykgb2JqLmRyYXcodGhpcy5jYW52YXMpO1xuXG4gICAgICAvLyDlrZDkvpvjgZ/jgaHjgoLlrp/ooYxcbiAgICAgIGlmIChvYmoucmVuZGVyQ2hpbGRCeVNlbGYgPT09IGZhbHNlICYmIG9iai5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciB0ZW1wQ2hpbGRyZW4gPSBvYmouY2hpbGRyZW4uc2xpY2UoKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRlbXBDaGlsZHJlbi5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgIHRoaXMucmVuZGVyT2JqZWN0KHRlbXBDaGlsZHJlbltpXSwgcXVhbGl0eSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29udGV4dC5yZXN0b3JlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChvYmouZHJhdykgb2JqLmRyYXcodGhpcy5jYW52YXMpO1xuXG4gICAgICAvLyDlrZDkvpvjgZ/jgaHjgoLlrp/ooYxcbiAgICAgIGlmIChvYmoucmVuZGVyQ2hpbGRCeVNlbGYgPT09IGZhbHNlICYmIG9iai5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciB0ZW1wQ2hpbGRyZW4gPSBvYmouY2hpbGRyZW4uc2xpY2UoKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRlbXBDaGlsZHJlbi5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgIHRoaXMucmVuZGVyT2JqZWN0KHRlbXBDaGlsZHJlbltpXSwgcXVhbGl0eSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgIH1cbiAgfSk7XG5cbn0pO1xuIiwicGhpbmEubmFtZXNwYWNlKCgpID0+IHtcbiAgLy/jg6bjg7zjgrbjg7zjgqjjg7zjgrjjgqfjg7Pjg4jjgYvjgonjg5bjg6njgqbjgrbjgr/jgqTjg5fjga7liKTliKXjgpLooYzjgYZcbiAgcGhpbmEuJG1ldGhvZCgnY2hlY2tCcm93c2VyJywgZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgcmVzdWx0ID0ge307XG4gICAgY29uc3QgYWdlbnQgPSB3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudC50b0xvd2VyQ2FzZSgpOztcblxuICAgIHJlc3VsdC5pc0Nocm9tZSA9IChhZ2VudC5pbmRleE9mKCdjaHJvbWUnKSAhPT0gLTEpICYmIChhZ2VudC5pbmRleE9mKCdlZGdlJykgPT09IC0xKSAmJiAoYWdlbnQuaW5kZXhPZignb3ByJykgPT09IC0xKTtcbiAgICByZXN1bHQuaXNFZGdlID0gKGFnZW50LmluZGV4T2YoJ2VkZ2UnKSAhPT0gLTEpO1xuICAgIHJlc3VsdC5pc0llMTEgPSAoYWdlbnQuaW5kZXhPZigndHJpZGVudC83JykgIT09IC0xKTtcbiAgICByZXN1bHQuaXNGaXJlZm94ID0gKGFnZW50LmluZGV4T2YoJ2ZpcmVmb3gnKSAhPT0gLTEpO1xuICAgIHJlc3VsdC5pc1NhZmFyaSA9IChhZ2VudC5pbmRleE9mKCdzYWZhcmknKSAhPT0gLTEpICYmIChhZ2VudC5pbmRleE9mKCdjaHJvbWUnKSA9PT0gLTEpO1xuICAgIHJlc3VsdC5pc0VsZWN0cm9uID0gKGFnZW50LmluZGV4T2YoJ2VsZWN0cm9uJykgIT09IC0xKTtcblxuICAgIHJlc3VsdC5pc1dpbmRvd3MgPSAoYWdlbnQuaW5kZXhPZignd2luZG93cycpICE9PSAtMSk7XG4gICAgcmVzdWx0LmlzTWFjID0gKGFnZW50LmluZGV4T2YoJ21hYyBvcyB4JykgIT09IC0xKTtcblxuICAgIHJlc3VsdC5pc2lQYWQgPSBhZ2VudC5pbmRleE9mKCdpcGFkJykgPiAtMSB8fCB1YS5pbmRleE9mKCdtYWNpbnRvc2gnKSA+IC0xICYmICdvbnRvdWNoZW5kJyBpbiBkb2N1bWVudDtcbiAgICByZXN1bHQuaXNpT1MgPSBhZ2VudC5pbmRleE9mKCdpcGhvbmUnKSA+IC0xIHx8IHVhLmluZGV4T2YoJ2lwYWQnKSA+IC0xIHx8IHVhLmluZGV4T2YoJ21hY2ludG9zaCcpID4gLTEgJiYgJ29udG91Y2hlbmQnIGluIGRvY3VtZW50O1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSk7XG59KTtcbiIsIi8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vICBFeHRlbnNpb24gcGhpbmEuZGlzcGxheS5EaXNwbGF5RWxlbWVudFxuLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxucGhpbmEubmFtZXNwYWNlKCgpID0+IHtcbiAgcGhpbmEuZGlzcGxheS5EaXNwbGF5RWxlbWVudC5wcm90b3R5cGUuJG1ldGhvZChcImVuYWJsZVwiLCBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNob3coKS53YWtlVXAoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSk7XG5cbiAgcGhpbmEuZGlzcGxheS5EaXNwbGF5RWxlbWVudC5wcm90b3R5cGUuJG1ldGhvZChcImRpc2FibGVcIiwgZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5oaWRlKCkuc2xlZXAoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSk7XG59KTtcbiIsInBoaW5hLm5hbWVzcGFjZSgoKSA9PiB7XG4gIHBoaW5hLmRpc3BsYXkuRGlzcGxheVNjZW5lLnF1YWxpdHkgPSAxLjA7XG4gIHBoaW5hLmRpc3BsYXkuRGlzcGxheVNjZW5lLnByb3RvdHlwZS4kbWV0aG9kKFwiaW5pdFwiLCBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICB0aGlzLnN1cGVySW5pdCgpO1xuICAgIHZhciBxdWFsaXR5ID0gcGhpbmEuZGlzcGxheS5EaXNwbGF5U2NlbmUucXVhbGl0eTtcblxuICAgIHBhcmFtcyA9ICh7fSkuJHNhZmUocGFyYW1zLCBwaGluYS5kaXNwbGF5LkRpc3BsYXlTY2VuZS5kZWZhdWx0cyk7XG4gICAgdGhpcy5jYW52YXMgPSBwaGluYS5ncmFwaGljcy5DYW52YXMoKTtcbiAgICB0aGlzLmNhbnZhcy5zZXRTaXplKHBhcmFtcy53aWR0aCAqIHF1YWxpdHksIHBhcmFtcy5oZWlnaHQgKiBxdWFsaXR5KTtcbiAgICB0aGlzLnJlbmRlcmVyID0gcGhpbmEuZGlzcGxheS5DYW52YXNSZW5kZXJlcih0aGlzLmNhbnZhcyk7XG4gICAgdGhpcy5iYWNrZ3JvdW5kQ29sb3IgPSAocGFyYW1zLmJhY2tncm91bmRDb2xvcikgPyBwYXJhbXMuYmFja2dyb3VuZENvbG9yIDogbnVsbDtcblxuICAgIHRoaXMud2lkdGggPSBwYXJhbXMud2lkdGg7XG4gICAgdGhpcy5oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0O1xuICAgIHRoaXMuZ3JpZFggPSBwaGluYS51dGlsLkdyaWQocGFyYW1zLndpZHRoLCAxNik7XG4gICAgdGhpcy5ncmlkWSA9IHBoaW5hLnV0aWwuR3JpZChwYXJhbXMuaGVpZ2h0LCAxNik7XG5cbiAgICB0aGlzLmludGVyYWN0aXZlID0gdHJ1ZTtcbiAgICB0aGlzLnNldEludGVyYWN0aXZlID0gZnVuY3Rpb24oZmxhZykge1xuICAgICAgdGhpcy5pbnRlcmFjdGl2ZSA9IGZsYWc7XG4gICAgfTtcbiAgICB0aGlzLl9vdmVyRmxhZ3MgPSB7fTtcbiAgICB0aGlzLl90b3VjaEZsYWdzID0ge307XG4gIH0pO1xuXG59KTtcbiIsInBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcclxuXHJcbiAgLy8gYXVkaW/opoHntKDjgafpn7Plo7DjgpLlho3nlJ/jgZnjgovjgILkuLvjgatJReeUqFxyXG4gIHBoaW5hLmRlZmluZShcInBoaW5hLmFzc2V0LkRvbUF1ZGlvU291bmRcIiwge1xyXG4gICAgc3VwZXJDbGFzczogXCJwaGluYS5hc3NldC5Bc3NldFwiLFxyXG5cclxuICAgIGRvbUVsZW1lbnQ6IG51bGwsXHJcbiAgICBlbXB0eVNvdW5kOiBmYWxzZSxcclxuXHJcbiAgICBpbml0OiBmdW5jdGlvbigpIHtcclxuICAgICAgdGhpcy5zdXBlckluaXQoKTtcclxuICAgIH0sXHJcblxyXG4gICAgX2xvYWQ6IGZ1bmN0aW9uKHJlc29sdmUpIHtcclxuICAgICAgdGhpcy5kb21FbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImF1ZGlvXCIpO1xyXG4gICAgICBpZiAodGhpcy5kb21FbGVtZW50LmNhblBsYXlUeXBlKFwiYXVkaW8vbXBlZ1wiKSkge1xyXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gcmVhZHlzdGF0ZUNoZWNrKCkge1xyXG4gICAgICAgICAgaWYgKHRoaXMuZG9tRWxlbWVudC5yZWFkeVN0YXRlIDwgNCkge1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KHJlYWR5c3RhdGVDaGVjay5iaW5kKHRoaXMpLCAxMCk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmVtcHR5U291bmQgPSBmYWxzZTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJlbmQgbG9hZCBcIiwgdGhpcy5zcmMpO1xyXG4gICAgICAgICAgICByZXNvbHZlKHRoaXMpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfS5iaW5kKHRoaXMpLCAxMCk7XHJcbiAgICAgICAgdGhpcy5kb21FbGVtZW50Lm9uZXJyb3IgPSBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwi44Kq44O844OH44Kj44Kq44Gu44Ot44O844OJ44Gr5aSx5pWXXCIsIGUpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5kb21FbGVtZW50LnNyYyA9IHRoaXMuc3JjO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiYmVnaW4gbG9hZCBcIiwgdGhpcy5zcmMpO1xyXG4gICAgICAgIHRoaXMuZG9tRWxlbWVudC5sb2FkKCk7XHJcbiAgICAgICAgdGhpcy5kb21FbGVtZW50LmF1dG9wbGF5ID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5kb21FbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJlbmRlZFwiLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIHRoaXMuZmxhcmUoXCJlbmRlZFwiKTtcclxuICAgICAgICB9LmJpbmQodGhpcykpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwibXAz44Gv5YaN55Sf44Gn44GN44G+44Gb44KTXCIpO1xyXG4gICAgICAgIHRoaXMuZW1wdHlTb3VuZCA9IHRydWU7XHJcbiAgICAgICAgcmVzb2x2ZSh0aGlzKTtcclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBwbGF5OiBmdW5jdGlvbigpIHtcclxuICAgICAgaWYgKHRoaXMuZW1wdHlTb3VuZCkgcmV0dXJuO1xyXG4gICAgICB0aGlzLmRvbUVsZW1lbnQucGF1c2UoKTtcclxuICAgICAgdGhpcy5kb21FbGVtZW50LmN1cnJlbnRUaW1lID0gMDtcclxuICAgICAgdGhpcy5kb21FbGVtZW50LnBsYXkoKTtcclxuICAgIH0sXHJcblxyXG4gICAgc3RvcDogZnVuY3Rpb24oKSB7XHJcbiAgICAgIGlmICh0aGlzLmVtcHR5U291bmQpIHJldHVybjtcclxuICAgICAgdGhpcy5kb21FbGVtZW50LnBhdXNlKCk7XHJcbiAgICAgIHRoaXMuZG9tRWxlbWVudC5jdXJyZW50VGltZSA9IDA7XHJcbiAgICB9LFxyXG5cclxuICAgIHBhdXNlOiBmdW5jdGlvbigpIHtcclxuICAgICAgaWYgKHRoaXMuZW1wdHlTb3VuZCkgcmV0dXJuO1xyXG4gICAgICB0aGlzLmRvbUVsZW1lbnQucGF1c2UoKTtcclxuICAgIH0sXHJcblxyXG4gICAgcmVzdW1lOiBmdW5jdGlvbigpIHtcclxuICAgICAgaWYgKHRoaXMuZW1wdHlTb3VuZCkgcmV0dXJuO1xyXG4gICAgICB0aGlzLmRvbUVsZW1lbnQucGxheSgpO1xyXG4gICAgfSxcclxuXHJcbiAgICBzZXRMb29wOiBmdW5jdGlvbih2KSB7XHJcbiAgICAgIGlmICh0aGlzLmVtcHR5U291bmQpIHJldHVybjtcclxuICAgICAgdGhpcy5kb21FbGVtZW50Lmxvb3AgPSB2O1xyXG4gICAgfSxcclxuXHJcbiAgICBfYWNjZXNzb3I6IHtcclxuICAgICAgdm9sdW1lOiB7XHJcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIGlmICh0aGlzLmVtcHR5U291bmQpIHJldHVybiAwO1xyXG4gICAgICAgICAgcmV0dXJuIHRoaXMuZG9tRWxlbWVudC52b2x1bWU7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHYpIHtcclxuICAgICAgICAgIGlmICh0aGlzLmVtcHR5U291bmQpIHJldHVybjtcclxuICAgICAgICAgIHRoaXMuZG9tRWxlbWVudC52b2x1bWUgPSB2O1xyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICAgIGxvb3A6IHtcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgaWYgKHRoaXMuZW1wdHlTb3VuZCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgcmV0dXJuIHRoaXMuZG9tRWxlbWVudC5sb29wO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2KSB7XHJcbiAgICAgICAgICBpZiAodGhpcy5lbXB0eVNvdW5kKSByZXR1cm47XHJcbiAgICAgICAgICB0aGlzLnNldExvb3Aodik7XHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuXHJcbiAgICB9LFxyXG4gIH0pO1xyXG5cclxuICAvLyBJRTEx44Gu5aC05ZCI44Gu44G/6Z+z5aOw44Ki44K744OD44OI44GvRG9tQXVkaW9Tb3VuZOOBp+WGjeeUn+OBmeOCi1xyXG4gIHZhciB1YSA9IHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCk7XHJcbiAgaWYgKHVhLmluZGV4T2YoJ3RyaWRlbnQvNycpICE9PSAtMSkge1xyXG4gICAgcGhpbmEuYXNzZXQuQXNzZXRMb2FkZXIucmVnaXN0ZXIoXCJzb3VuZFwiLCBmdW5jdGlvbihrZXksIHBhdGgpIHtcclxuICAgICAgdmFyIGFzc2V0ID0gcGhpbmEuYXNzZXQuRG9tQXVkaW9Tb3VuZCgpO1xyXG4gICAgICByZXR1cm4gYXNzZXQubG9hZChwYXRoKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbn0pO1xyXG4iLCJwaGluYS5uYW1lc3BhY2UoKCkgPT4ge1xuXG4gIHBoaW5hLmFwcC5FbGVtZW50LnByb3RvdHlwZS4kbWV0aG9kKFwiZmluZEJ5SWRcIiwgZnVuY3Rpb24oaWQpIHtcbiAgICBpZiAodGhpcy5pZCA9PT0gaWQpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHRoaXMuY2hpbGRyZW5baV0uZmluZEJ5SWQoaWQpKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuY2hpbGRyZW5baV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfSk7XG5cbiAgLy/mjIflrprjgZXjgozjgZ/lrZDjgqrjg5bjgrjjgqfjgq/jg4jjgpLmnIDliY3pnaLjgavnp7vli5XjgZnjgotcbiAgcGhpbmEuYXBwLkVsZW1lbnQucHJvdG90eXBlLiRtZXRob2QoXCJtb3ZlRnJvbnRcIiwgZnVuY3Rpb24oY2hpbGQpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh0aGlzLmNoaWxkcmVuW2ldID09IGNoaWxkKSB7XG4gICAgICAgIHRoaXMuY2hpbGRyZW4uc3BsaWNlKGksIDEpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5jaGlsZHJlbi5wdXNoKGNoaWxkKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSk7XG5cbiAgcGhpbmEuYXBwLkVsZW1lbnQucHJvdG90eXBlLiRtZXRob2QoXCJkZXN0cm95Q2hpbGRcIiwgZnVuY3Rpb24oKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGlzLmNoaWxkcmVuW2ldLmZsYXJlKCdkZXN0cm95Jyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9KTtcblxufSk7XG4iLCJwaGluYS5uYW1lc3BhY2UoKCkgPT4ge1xuXG4gIHBoaW5hLmlucHV0LklucHV0LnF1YWxpdHkgPSAxLjA7XG5cbiAgcGhpbmEuaW5wdXQuSW5wdXQucHJvdG90eXBlLiRtZXRob2QoXCJfbW92ZVwiLCBmdW5jdGlvbih4LCB5KSB7XG4gICAgdGhpcy5fdGVtcFBvc2l0aW9uLnggPSB4O1xuICAgIHRoaXMuX3RlbXBQb3NpdGlvbi55ID0geTtcblxuICAgIC8vIGFkanVzdCBzY2FsZVxuICAgIHZhciBlbG0gPSB0aGlzLmRvbUVsZW1lbnQ7XG4gICAgdmFyIHJlY3QgPSBlbG0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICB2YXIgdyA9IGVsbS53aWR0aCAvIHBoaW5hLmlucHV0LklucHV0LnF1YWxpdHk7XG4gICAgdmFyIGggPSBlbG0uaGVpZ2h0IC8gcGhpbmEuaW5wdXQuSW5wdXQucXVhbGl0eTtcblxuICAgIGlmIChyZWN0LndpZHRoKSB7XG4gICAgICB0aGlzLl90ZW1wUG9zaXRpb24ueCAqPSB3IC8gcmVjdC53aWR0aDtcbiAgICB9XG5cbiAgICBpZiAocmVjdC5oZWlnaHQpIHtcbiAgICAgIHRoaXMuX3RlbXBQb3NpdGlvbi55ICo9IGggLyByZWN0LmhlaWdodDtcbiAgICB9XG5cbiAgfSk7XG5cbn0pO1xuIiwicGhpbmEubmFtZXNwYWNlKCgpID0+IHtcbiAgcGhpbmEuZGlzcGxheS5MYWJlbC5wcm90b3R5cGUuJG1ldGhvZChcImluaXRcIiwgZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIGlmICh0eXBlb2YgYXJndW1lbnRzWzBdICE9PSAnb2JqZWN0Jykge1xuICAgICAgb3B0aW9ucyA9IHsgdGV4dDogYXJndW1lbnRzWzBdLCB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb25zID0gYXJndW1lbnRzWzBdO1xuICAgIH1cblxuICAgIG9wdGlvbnMgPSAoe30pLiRzYWZlKG9wdGlvbnMsIHBoaW5hLmRpc3BsYXkuTGFiZWwuZGVmYXVsdHMpO1xuICAgIHRoaXMuc3VwZXJJbml0KG9wdGlvbnMpO1xuXG4gICAgdGhpcy50ZXh0ID0gKG9wdGlvbnMudGV4dCkgPyBvcHRpb25zLnRleHQgOiBcIlwiO1xuICAgIHRoaXMuZm9udFNpemUgPSBvcHRpb25zLmZvbnRTaXplO1xuICAgIHRoaXMuZm9udFdlaWdodCA9IG9wdGlvbnMuZm9udFdlaWdodDtcbiAgICB0aGlzLmZvbnRGYW1pbHkgPSBvcHRpb25zLmZvbnRGYW1pbHk7XG4gICAgdGhpcy5hbGlnbiA9IG9wdGlvbnMuYWxpZ247XG4gICAgdGhpcy5iYXNlbGluZSA9IG9wdGlvbnMuYmFzZWxpbmU7XG4gICAgdGhpcy5saW5lSGVpZ2h0ID0gb3B0aW9ucy5saW5lSGVpZ2h0O1xuICB9KTtcblxufSk7XG4iLCJwaGluYS5uYW1lc3BhY2UoKCkgPT4ge1xuICBwaGluYS5pbnB1dC5Nb3VzZS5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKGRvbUVsZW1lbnQpIHtcbiAgICB0aGlzLnN1cGVySW5pdChkb21FbGVtZW50KTtcblxuICAgIHRoaXMuaWQgPSAwO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBmdW5jdGlvbihlKSB7XG4gICAgICBzZWxmLl9zdGFydChlLnBvaW50WCwgZS5wb2ludFksIDEgPDwgZS5idXR0b24pO1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB9KTtcblxuICAgIHRoaXMuZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZnVuY3Rpb24oZSkge1xuICAgICAgc2VsZi5fZW5kKDEgPDwgZS5idXR0b24pO1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB9KTtcbiAgICB0aGlzLmRvbUVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZnVuY3Rpb24oZSkge1xuICAgICAgc2VsZi5fbW92ZShlLnBvaW50WCwgZS5wb2ludFkpO1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB9KTtcblxuICAgIC8vIOODnuOCpuOCueOBjOOCreODo+ODs+ODkOOCueimgee0oOOBruWkluOBq+WHuuOBn+WgtOWQiOOBruWvvuW/nFxuICAgIHRoaXMuZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW91dCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIHNlbGYuX2VuZCgxKTtcbiAgICB9KTtcbiAgfVxufSk7XG4iLCIvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyAgRXh0ZW5zaW9uIHBoaW5hLmFwcC5PYmplY3QyRFxuLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5waGluYS5uYW1lc3BhY2UoKCkgPT4ge1xuICBwaGluYS5hcHAuT2JqZWN0MkQucHJvdG90eXBlLiRtZXRob2QoXCJzZXRPcmlnaW5cIiwgZnVuY3Rpb24oeCwgeSwgcmVwb3NpdGlvbikge1xuICAgIGlmICghcmVwb3NpdGlvbikge1xuICAgICAgdGhpcy5vcmlnaW4ueCA9IHg7XG4gICAgICB0aGlzLm9yaWdpbi55ID0geTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8v5aSJ5pu044GV44KM44Gf5Z+65rqW54K544Gr56e75YuV44GV44Gb44KLXG4gICAgY29uc3QgX29yaWdpblggPSB0aGlzLm9yaWdpblg7XG4gICAgY29uc3QgX29yaWdpblkgPSB0aGlzLm9yaWdpblk7XG4gICAgY29uc3QgX2FkZFggPSAoeCAtIF9vcmlnaW5YKSAqIHRoaXMud2lkdGg7XG4gICAgY29uc3QgX2FkZFkgPSAoeSAtIF9vcmlnaW5ZKSAqIHRoaXMuaGVpZ2h0O1xuXG4gICAgdGhpcy54ICs9IF9hZGRYO1xuICAgIHRoaXMueSArPSBfYWRkWTtcbiAgICB0aGlzLm9yaWdpblggPSB4O1xuICAgIHRoaXMub3JpZ2luWSA9IHk7XG5cbiAgICB0aGlzLmNoaWxkcmVuLmZvckVhY2goY2hpbGQgPT4ge1xuICAgICAgY2hpbGQueCAtPSBfYWRkWDtcbiAgICAgIGNoaWxkLnkgLT0gX2FkZFk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0pO1xuXG4gIHBoaW5hLmFwcC5PYmplY3QyRC5wcm90b3R5cGUuJG1ldGhvZChcImhpdFRlc3RFbGVtZW50XCIsIGZ1bmN0aW9uKGVsbSkge1xuICAgIGNvbnN0IHJlY3QwID0gdGhpcy5jYWxjR2xvYmFsUmVjdCgpO1xuICAgIGNvbnN0IHJlY3QxID0gZWxtLmNhbGNHbG9iYWxSZWN0KCk7XG4gICAgcmV0dXJuIChyZWN0MC5sZWZ0IDwgcmVjdDEucmlnaHQpICYmIChyZWN0MC5yaWdodCA+IHJlY3QxLmxlZnQpICYmXG4gICAgICAocmVjdDAudG9wIDwgcmVjdDEuYm90dG9tKSAmJiAocmVjdDAuYm90dG9tID4gcmVjdDEudG9wKTtcbiAgfSk7XG5cbiAgcGhpbmEuYXBwLk9iamVjdDJELnByb3RvdHlwZS4kbWV0aG9kKFwiaW5jbHVkZUVsZW1lbnRcIiwgZnVuY3Rpb24oZWxtKSB7XG4gICAgY29uc3QgcmVjdDAgPSB0aGlzLmNhbGNHbG9iYWxSZWN0KCk7XG4gICAgY29uc3QgcmVjdDEgPSBlbG0uY2FsY0dsb2JhbFJlY3QoKTtcbiAgICByZXR1cm4gKHJlY3QwLmxlZnQgPD0gcmVjdDEubGVmdCkgJiYgKHJlY3QwLnJpZ2h0ID49IHJlY3QxLnJpZ2h0KSAmJlxuICAgICAgKHJlY3QwLnRvcCA8PSByZWN0MS50b3ApICYmIChyZWN0MC5ib3R0b20gPj0gcmVjdDEuYm90dG9tKTtcbiAgfSk7XG5cbiAgcGhpbmEuYXBwLk9iamVjdDJELnByb3RvdHlwZS4kbWV0aG9kKFwiY2FsY0dsb2JhbFJlY3RcIiwgZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgbGVmdCA9IHRoaXMuX3dvcmxkTWF0cml4Lm0wMiAtIHRoaXMub3JpZ2luWCAqIHRoaXMud2lkdGg7XG4gICAgY29uc3QgdG9wID0gdGhpcy5fd29ybGRNYXRyaXgubTEyIC0gdGhpcy5vcmlnaW5ZICogdGhpcy5oZWlnaHQ7XG4gICAgcmV0dXJuIFJlY3QobGVmdCwgdG9wLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gIH0pO1xuXG4gIHBoaW5hLmFwcC5PYmplY3QyRC5wcm90b3R5cGUuJG1ldGhvZChcImNhbGNHbG9iYWxSZWN0XCIsIGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IGxlZnQgPSB0aGlzLl93b3JsZE1hdHJpeC5tMDIgLSB0aGlzLm9yaWdpblggKiB0aGlzLndpZHRoO1xuICAgIGNvbnN0IHRvcCA9IHRoaXMuX3dvcmxkTWF0cml4Lm0xMiAtIHRoaXMub3JpZ2luWSAqIHRoaXMuaGVpZ2h0O1xuICAgIHJldHVybiBSZWN0KGxlZnQsIHRvcCwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuICB9KTtcblxufSk7XG4iLCJwaGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZGlzcGxheS5QbGFpbkVsZW1lbnQucHJvdG90eXBlLiRtZXRob2QoXCJkZXN0cm95Q2FudmFzXCIsIGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5jYW52YXMpIHJldHVybjtcbiAgICB0aGlzLmNhbnZhcy5kZXN0cm95KCk7XG4gICAgZGVsZXRlIHRoaXMuY2FudmFzO1xuICB9KTtcblxufSk7XG4iLCIvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyAgRXh0ZW5zaW9uIHBoaW5hLmRpc3BsYXkuU2hhcGVcbi8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbnBoaW5hLmRpc3BsYXkuU2hhcGUucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKGNhbnZhcykge1xuICBpZiAoIWNhbnZhcykge1xuICAgIGNvbnNvbGUubG9nKFwiY2FudmFzIG51bGxcIik7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBjb250ZXh0ID0gY2FudmFzLmNvbnRleHQ7XG4gIC8vIOODquOCteOCpOOCulxuICB2YXIgc2l6ZSA9IHRoaXMuY2FsY0NhbnZhc1NpemUoKTtcbiAgY2FudmFzLnNldFNpemUoc2l6ZS53aWR0aCwgc2l6ZS5oZWlnaHQpO1xuICAvLyDjgq/jg6rjgqLjgqvjg6njg7xcbiAgY2FudmFzLmNsZWFyQ29sb3IodGhpcy5iYWNrZ3JvdW5kQ29sb3IpO1xuICAvLyDkuK3lv4PjgavluqfmqJnjgpLnp7vli5VcbiAgY2FudmFzLnRyYW5zZm9ybUNlbnRlcigpO1xuXG4gIC8vIOaPj+eUu+WJjeWHpueQhlxuICB0aGlzLnByZXJlbmRlcih0aGlzLmNhbnZhcyk7XG5cbiAgLy8g44K544OI44Ot44O844Kv5o+P55S7XG4gIGlmICh0aGlzLmlzU3Ryb2thYmxlKCkpIHtcbiAgICBjb250ZXh0LnN0cm9rZVN0eWxlID0gdGhpcy5zdHJva2U7XG4gICAgY29udGV4dC5saW5lV2lkdGggPSB0aGlzLnN0cm9rZVdpZHRoO1xuICAgIGNvbnRleHQubGluZUpvaW4gPSBcInJvdW5kXCI7XG4gICAgY29udGV4dC5zaGFkb3dCbHVyID0gMDtcbiAgICB0aGlzLnJlbmRlclN0cm9rZShjYW52YXMpO1xuICB9XG5cbiAgLy8g5aGX44KK44Gk44G244GX5o+P55S7XG4gIGlmICh0aGlzLmZpbGwpIHtcbiAgICBjb250ZXh0LmZpbGxTdHlsZSA9IHRoaXMuZmlsbDtcbiAgICAvLyBzaGFkb3cg44GuIG9uL29mZlxuICAgIGlmICh0aGlzLnNoYWRvdykge1xuICAgICAgY29udGV4dC5zaGFkb3dDb2xvciA9IHRoaXMuc2hhZG93O1xuICAgICAgY29udGV4dC5zaGFkb3dCbHVyID0gdGhpcy5zaGFkb3dCbHVyO1xuICAgICAgY29udGV4dC5zaGFkb3dPZmZzZXRYID0gdGhpcy5zaGFkb3dPZmZzZXRYIHx8IDA7XG4gICAgICBjb250ZXh0LnNoYWRvd09mZnNldFkgPSB0aGlzLnNoYWRvd09mZnNldFkgfHwgMDtcbiAgICB9IGVsc2Uge1xuICAgICAgY29udGV4dC5zaGFkb3dCbHVyID0gMDtcbiAgICB9XG4gICAgdGhpcy5yZW5kZXJGaWxsKGNhbnZhcyk7XG4gIH1cblxuICAvLyDmj4/nlLvlvozlh6bnkIZcbiAgdGhpcy5wb3N0cmVuZGVyKHRoaXMuY2FudmFzKTtcblxuICByZXR1cm4gdGhpcztcbn07XG4iLCJwaGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuYXNzZXQuU291bmQucHJvdG90eXBlLiRtZXRob2QoXCJfbG9hZFwiLCBmdW5jdGlvbihyZXNvbHZlKSB7XG4gICAgaWYgKC9eZGF0YTovLnRlc3QodGhpcy5zcmMpKSB7XG4gICAgICB0aGlzLl9sb2FkRnJvbVVSSVNjaGVtZShyZXNvbHZlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fbG9hZEZyb21GaWxlKHJlc29sdmUpO1xuICAgIH1cbiAgfSk7XG5cbiAgcGhpbmEuYXNzZXQuU291bmQucHJvdG90eXBlLiRtZXRob2QoXCJfbG9hZEZyb21GaWxlXCIsIGZ1bmN0aW9uKHJlc29sdmUpIHtcbiAgICAvLyBjb25zb2xlLmxvZyh0aGlzLnNyYyk7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB4bWwgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICB4bWwub3BlbignR0VUJywgdGhpcy5zcmMpO1xuICAgIHhtbC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh4bWwucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgICBpZiAoWzIwMCwgMjAxLCAwXS5pbmRleE9mKHhtbC5zdGF0dXMpICE9PSAtMSkge1xuICAgICAgICAgIC8vIOmfs+alveODkOOCpOODiuODquODvOODh+ODvOOCv1xuICAgICAgICAgIHZhciBkYXRhID0geG1sLnJlc3BvbnNlO1xuICAgICAgICAgIC8vIHdlYmF1ZGlvIOeUqOOBq+WkieaPm1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGRhdGEpXG4gICAgICAgICAgc2VsZi5jb250ZXh0LmRlY29kZUF1ZGlvRGF0YShkYXRhLCBmdW5jdGlvbihidWZmZXIpIHtcbiAgICAgICAgICAgIHNlbGYubG9hZEZyb21CdWZmZXIoYnVmZmVyKTtcbiAgICAgICAgICAgIHJlc29sdmUoc2VsZik7XG4gICAgICAgICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXCLpn7Plo7Djg5XjgqHjgqTjg6vjga7jg4fjgrPjg7zjg4njgavlpLHmlZfjgZfjgb7jgZfjgZ/jgIIoXCIgKyBzZWxmLnNyYyArIFwiKVwiKTtcbiAgICAgICAgICAgIHJlc29sdmUoc2VsZik7XG4gICAgICAgICAgICBzZWxmLmZsYXJlKCdkZWNvZGVlcnJvcicpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKHhtbC5zdGF0dXMgPT09IDQwNCkge1xuICAgICAgICAgIC8vIG5vdCBmb3VuZFxuICAgICAgICAgIHNlbGYubG9hZEVycm9yID0gdHJ1ZTtcbiAgICAgICAgICBzZWxmLm5vdEZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICByZXNvbHZlKHNlbGYpO1xuICAgICAgICAgIHNlbGYuZmxhcmUoJ2xvYWRlcnJvcicpO1xuICAgICAgICAgIHNlbGYuZmxhcmUoJ25vdGZvdW5kJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8g44K144O844OQ44O844Ko44Op44O8XG4gICAgICAgICAgc2VsZi5sb2FkRXJyb3IgPSB0cnVlO1xuICAgICAgICAgIHNlbGYuc2VydmVyRXJyb3IgPSB0cnVlO1xuICAgICAgICAgIHJlc29sdmUoc2VsZik7XG4gICAgICAgICAgc2VsZi5mbGFyZSgnbG9hZGVycm9yJyk7XG4gICAgICAgICAgc2VsZi5mbGFyZSgnc2VydmVyZXJyb3InKTtcbiAgICAgICAgfVxuICAgICAgICB4bWwub25yZWFkeXN0YXRlY2hhbmdlID0gbnVsbDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgeG1sLnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG5cbiAgICB4bWwuc2VuZChudWxsKTtcbiAgfSk7XG5cbiAgcGhpbmEuYXNzZXQuU291bmQucHJvdG90eXBlLiRtZXRob2QoXCJwbGF5XCIsIGZ1bmN0aW9uKHdoZW4sIG9mZnNldCwgZHVyYXRpb24pIHtcbiAgICB3aGVuID0gd2hlbiA/IHdoZW4gKyB0aGlzLmNvbnRleHQuY3VycmVudFRpbWUgOiAwO1xuICAgIG9mZnNldCA9IG9mZnNldCB8fCAwO1xuXG4gICAgdmFyIHNvdXJjZSA9IHRoaXMuc291cmNlID0gdGhpcy5jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICAgIHZhciBidWZmZXIgPSBzb3VyY2UuYnVmZmVyID0gdGhpcy5idWZmZXI7XG4gICAgc291cmNlLmxvb3AgPSB0aGlzLl9sb29wO1xuICAgIHNvdXJjZS5sb29wU3RhcnQgPSB0aGlzLl9sb29wU3RhcnQ7XG4gICAgc291cmNlLmxvb3BFbmQgPSB0aGlzLl9sb29wRW5kO1xuICAgIHNvdXJjZS5wbGF5YmFja1JhdGUudmFsdWUgPSB0aGlzLl9wbGF5YmFja1JhdGU7XG5cbiAgICAvLyBjb25uZWN0XG4gICAgc291cmNlLmNvbm5lY3QodGhpcy5nYWluTm9kZSk7XG4gICAgdGhpcy5nYWluTm9kZS5jb25uZWN0KHBoaW5hLmFzc2V0LlNvdW5kLmdldE1hc3RlckdhaW4oKSk7XG4gICAgLy8gcGxheVxuICAgIGlmIChkdXJhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBzb3VyY2Uuc3RhcnQod2hlbiwgb2Zmc2V0LCBkdXJhdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNvdXJjZS5zdGFydCh3aGVuLCBvZmZzZXQpO1xuICAgIH1cblxuICAgIHNvdXJjZS5vbmVuZGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoIXNvdXJjZSkge1xuICAgICAgICB0aGlzLmZsYXJlKCdlbmRlZCcpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBzb3VyY2Uub25lbmRlZCA9IG51bGw7XG4gICAgICBzb3VyY2UuZGlzY29ubmVjdCgpO1xuICAgICAgc291cmNlLmJ1ZmZlciA9IG51bGw7XG4gICAgICBzb3VyY2UgPSBudWxsO1xuICAgICAgdGhpcy5mbGFyZSgnZW5kZWQnKTtcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSk7XG5cbiAgcGhpbmEuYXNzZXQuU291bmQucHJvdG90eXBlLiRtZXRob2QoXCJzdG9wXCIsIGZ1bmN0aW9uKCkge1xuICAgIC8vIHN0b3BcbiAgICBpZiAodGhpcy5zb3VyY2UpIHtcbiAgICAgIC8vIHN0b3Ag44GZ44KL44GoIHNvdXJjZS5lbmRlZOOCgueZuueBq+OBmeOCi1xuICAgICAgdGhpcy5zb3VyY2Uuc3RvcCAmJiB0aGlzLnNvdXJjZS5zdG9wKDApO1xuICAgICAgdGhpcy5mbGFyZSgnc3RvcCcpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9KTtcblxufSk7XG4iLCIvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyAgRXh0ZW5zaW9uIHBoaW5hLmFzc2V0LlNvdW5kTWFuYWdlclxuLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuU291bmRNYW5hZ2VyLiRtZXRob2QoXCJnZXRWb2x1bWVcIiwgZnVuY3Rpb24oKSB7XG4gIHJldHVybiAhdGhpcy5pc011dGUoKSA/IHRoaXMudm9sdW1lIDogMDtcbn0pO1xuXG5Tb3VuZE1hbmFnZXIuJG1ldGhvZChcImdldFZvbHVtZU11c2ljXCIsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4gIXRoaXMuaXNNdXRlKCkgPyB0aGlzLm11c2ljVm9sdW1lIDogMDtcbn0pO1xuXG5Tb3VuZE1hbmFnZXIuJG1ldGhvZChcInNldFZvbHVtZU11c2ljXCIsIGZ1bmN0aW9uKHZvbHVtZSkge1xuICB0aGlzLm11c2ljVm9sdW1lID0gdm9sdW1lO1xuICBpZiAoIXRoaXMuaXNNdXRlKCkgJiYgdGhpcy5jdXJyZW50TXVzaWMpIHtcbiAgICB0aGlzLmN1cnJlbnRNdXNpYy52b2x1bWUgPSB2b2x1bWU7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59KTtcblxuU291bmRNYW5hZ2VyLiRtZXRob2QoXCJwbGF5TXVzaWNcIiwgZnVuY3Rpb24obmFtZSwgZmFkZVRpbWUsIGxvb3AsIHdoZW4sIG9mZnNldCwgZHVyYXRpb24pIHtcbiAgLy8gY29uc3QgcmVzID0gcGhpbmEuY2hlY2tCcm93c2VyKCk7XG4gIC8vIGlmIChyZXMuaXNJZTExKSByZXR1cm4gbnVsbDtcblxuICBsb29wID0gKGxvb3AgIT09IHVuZGVmaW5lZCkgPyBsb29wIDogdHJ1ZTtcblxuICBpZiAodGhpcy5jdXJyZW50TXVzaWMpIHtcbiAgICB0aGlzLnN0b3BNdXNpYyhmYWRlVGltZSk7XG4gIH1cblxuICB2YXIgbXVzaWMgPSBudWxsO1xuICBpZiAobmFtZSBpbnN0YW5jZW9mIHBoaW5hLmFzc2V0LlNvdW5kIHx8IG5hbWUgaW5zdGFuY2VvZiBwaGluYS5hc3NldC5Eb21BdWRpb1NvdW5kKSB7XG4gICAgbXVzaWMgPSBuYW1lO1xuICB9IGVsc2Uge1xuICAgIG11c2ljID0gcGhpbmEuYXNzZXQuQXNzZXRNYW5hZ2VyLmdldCgnc291bmQnLCBuYW1lKTtcbiAgfVxuXG4gIGlmICghbXVzaWMpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiU291bmQgbm90IGZvdW5kOiBcIiwgbmFtZSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBtdXNpYy5zZXRMb29wKGxvb3ApO1xuICBtdXNpYy5wbGF5KHdoZW4sIG9mZnNldCwgZHVyYXRpb24pO1xuXG4gIGlmIChmYWRlVGltZSA+IDApIHtcbiAgICB2YXIgY291bnQgPSAzMjtcbiAgICB2YXIgY291bnRlciA9IDA7XG4gICAgdmFyIHVuaXRUaW1lID0gZmFkZVRpbWUgLyBjb3VudDtcbiAgICB2YXIgdm9sdW1lID0gdGhpcy5nZXRWb2x1bWVNdXNpYygpO1xuXG4gICAgbXVzaWMudm9sdW1lID0gMDtcbiAgICB2YXIgaWQgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgIGNvdW50ZXIgKz0gMTtcbiAgICAgIHZhciByYXRlID0gY291bnRlciAvIGNvdW50O1xuICAgICAgbXVzaWMudm9sdW1lID0gcmF0ZSAqIHZvbHVtZTtcblxuICAgICAgaWYgKHJhdGUgPj0gMSkge1xuICAgICAgICBjbGVhckludGVydmFsKGlkKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LCB1bml0VGltZSk7XG4gIH0gZWxzZSB7XG4gICAgbXVzaWMudm9sdW1lID0gdGhpcy5nZXRWb2x1bWVNdXNpYygpO1xuICB9XG5cbiAgdGhpcy5jdXJyZW50TXVzaWMgPSBtdXNpYztcblxuICByZXR1cm4gdGhpcy5jdXJyZW50TXVzaWM7XG59KTtcblxuLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8g44Oc44Kk44K555So44Gu6Z+z6YeP6Kit5a6a44CB5YaN55Sf44Oh44K944OD44OJ5ouh5by1XG5Tb3VuZE1hbmFnZXIuJG1ldGhvZChcImdldFZvbHVtZVZvaWNlXCIsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4gIXRoaXMuaXNNdXRlKCkgPyB0aGlzLnZvaWNlVm9sdW1lIDogMDtcbn0pO1xuXG5Tb3VuZE1hbmFnZXIuJG1ldGhvZChcInNldFZvbHVtZVZvaWNlXCIsIGZ1bmN0aW9uKHZvbHVtZSkge1xuICB0aGlzLnZvaWNlVm9sdW1lID0gdm9sdW1lO1xuICByZXR1cm4gdGhpcztcbn0pO1xuXG5Tb3VuZE1hbmFnZXIuJG1ldGhvZChcInBsYXlWb2ljZVwiLCBmdW5jdGlvbihuYW1lKSB7XG4gIHZhciBzb3VuZCA9IHBoaW5hLmFzc2V0LkFzc2V0TWFuYWdlci5nZXQoJ3NvdW5kJywgbmFtZSk7XG4gIHNvdW5kLnZvbHVtZSA9IHRoaXMuZ2V0Vm9sdW1lVm9pY2UoKTtcbiAgc291bmQucGxheSgpO1xuICByZXR1cm4gc291bmQ7XG59KTtcbiIsIi8v44K544OX44Op44Kk44OI5qmf6IO95ouh5by1XG5waGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZGlzcGxheS5TcHJpdGUucHJvdG90eXBlLnNldEZyYW1lVHJpbW1pbmcgPSBmdW5jdGlvbih4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgdGhpcy5fZnJhbWVUcmltWCA9IHggfHwgMDtcbiAgICB0aGlzLl9mcmFtZVRyaW1ZID0geSB8fCAwO1xuICAgIHRoaXMuX2ZyYW1lVHJpbVdpZHRoID0gd2lkdGggfHwgdGhpcy5pbWFnZS5kb21FbGVtZW50LndpZHRoIC0gdGhpcy5fZnJhbWVUcmltWDtcbiAgICB0aGlzLl9mcmFtZVRyaW1IZWlnaHQgPSBoZWlnaHQgfHwgdGhpcy5pbWFnZS5kb21FbGVtZW50LmhlaWdodCAtIHRoaXMuX2ZyYW1lVHJpbVk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBwaGluYS5kaXNwbGF5LlNwcml0ZS5wcm90b3R5cGUuc2V0RnJhbWVJbmRleCA9IGZ1bmN0aW9uKGluZGV4LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgdmFyIHN4ID0gdGhpcy5fZnJhbWVUcmltWCB8fCAwO1xuICAgIHZhciBzeSA9IHRoaXMuX2ZyYW1lVHJpbVkgfHwgMDtcbiAgICB2YXIgc3cgPSB0aGlzLl9mcmFtZVRyaW1XaWR0aCAgfHwgKHRoaXMuaW1hZ2UuZG9tRWxlbWVudC53aWR0aC1zeCk7XG4gICAgdmFyIHNoID0gdGhpcy5fZnJhbWVUcmltSGVpZ2h0IHx8ICh0aGlzLmltYWdlLmRvbUVsZW1lbnQuaGVpZ2h0LXN5KTtcblxuICAgIHZhciB0dyAgPSB3aWR0aCB8fCB0aGlzLndpZHRoOyAgICAgIC8vIHR3XG4gICAgdmFyIHRoICA9IGhlaWdodCB8fCB0aGlzLmhlaWdodDsgICAgLy8gdGhcbiAgICB2YXIgcm93ID0gfn4oc3cgLyB0dyk7XG4gICAgdmFyIGNvbCA9IH5+KHNoIC8gdGgpO1xuICAgIHZhciBtYXhJbmRleCA9IHJvdypjb2w7XG4gICAgaW5kZXggPSBpbmRleCVtYXhJbmRleDtcblxuICAgIHZhciB4ICAgPSBpbmRleCVyb3c7XG4gICAgdmFyIHkgICA9IH5+KGluZGV4L3Jvdyk7XG4gICAgdGhpcy5zcmNSZWN0LnggPSBzeCt4KnR3O1xuICAgIHRoaXMuc3JjUmVjdC55ID0gc3kreSp0aDtcbiAgICB0aGlzLnNyY1JlY3Qud2lkdGggID0gdHc7XG4gICAgdGhpcy5zcmNSZWN0LmhlaWdodCA9IHRoO1xuXG4gICAgdGhpcy5fZnJhbWVJbmRleCA9IGluZGV4O1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxufSk7IiwicGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuICAvLyDmloflrZfliJfjgYvjgonmlbDlgKTjgpLmir3lh7rjgZnjgotcbiAgLy8g44Os44Kk44Ki44Km44OI44OV44Kh44Kk44Or44GL44KJ5L2c5qWt44GZ44KL5aC05ZCI44Gr5Yip55So44GX44Gf44GP44Gq44KLXG4gIC8vIGhvZ2VfMCBob2dlXzHjgarjganjgYvjgonmlbDlrZfjgaDjgZHmir3lh7pcbiAgLy8gMDEwMF9ob2dlXzk5OTkgPT4gW1wiMDEwMFwiICwgXCI5OTk5XCJd44Gr44Gq44KLXG4gIC8vIGhvZ2UwLjDjgajjgYvjga/jganjgYbjgZnjgYvjgarvvJ9cbiAgLy8g5oq95Ye65b6M44GrcGFyc2VJbnTjgZnjgovjgYvjga/mpJzoqI7kuK1cbiAgU3RyaW5nLnByb3RvdHlwZS4kbWV0aG9kKFwibWF0Y2hJbnRcIiwgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMubWF0Y2goL1swLTldKy9nKTtcbiAgfSk7XG59KTtcbiIsInBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5hc3NldC5UZXh0dXJlLnByb3RvdHlwZS4kbWV0aG9kKFwiX2xvYWRcIiwgZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgIHRoaXMuZG9tRWxlbWVudCA9IG5ldyBJbWFnZSgpO1xuXG4gICAgdmFyIGlzTG9jYWwgPSAobG9jYXRpb24ucHJvdG9jb2wgPT0gJ2ZpbGU6Jyk7XG4gICAgaWYgKCEoL15kYXRhOi8udGVzdCh0aGlzLnNyYykpKSB7XG4gICAgICB0aGlzLmRvbUVsZW1lbnQuY3Jvc3NPcmlnaW4gPSAnYW5vbnltb3VzJzsgLy8g44Kv44Ot44K544Kq44Oq44K444Oz6Kej6ZmkXG4gICAgfVxuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuZG9tRWxlbWVudC5vbmxvYWQgPSBmdW5jdGlvbihlKSB7XG4gICAgICBzZWxmLmxvYWRlZCA9IHRydWU7XG4gICAgICBlLnRhcmdldC5vbmxvYWQgPSBudWxsO1xuICAgICAgZS50YXJnZXQub25lcnJvciA9IG51bGw7XG4gICAgICByZXNvbHZlKHNlbGYpO1xuICAgIH07XG5cbiAgICB0aGlzLmRvbUVsZW1lbnQub25lcnJvciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgIGUudGFyZ2V0Lm9ubG9hZCA9IG51bGw7XG4gICAgICBlLnRhcmdldC5vbmVycm9yID0gbnVsbDtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJwaGluYS5hc3NldC5UZXh0dXJlIF9sb2FkIG9uRXJyb3IgXCIsIHRoaXMuc3JjKTtcbiAgICB9O1xuXG4gICAgdGhpcy5kb21FbGVtZW50LnNyYyA9IHRoaXMuc3JjO1xuICB9KTtcblxufSk7XG4iLCJwaGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuYWNjZXNzb3J5LlR3ZWVuZXIucHJvdG90eXBlLiRtZXRob2QoXCJfdXBkYXRlVHdlZW5cIiwgZnVuY3Rpb24oYXBwKSB7XG4gICAgLy/igLvjgZPjgozjgarjgYTjgahwYXVzZeOBjOOBhuOBlOOBi+OBquOBhFxuICAgIGlmICghdGhpcy5wbGF5aW5nKSByZXR1cm47XG5cbiAgICB2YXIgdHdlZW4gPSB0aGlzLl90d2VlbjtcbiAgICB2YXIgdGltZSA9IHRoaXMuX2dldFVuaXRUaW1lKGFwcCk7XG5cbiAgICB0d2Vlbi5mb3J3YXJkKHRpbWUpO1xuICAgIHRoaXMuZmxhcmUoJ3R3ZWVuJyk7XG5cbiAgICBpZiAodHdlZW4udGltZSA+PSB0d2Vlbi5kdXJhdGlvbikge1xuICAgICAgZGVsZXRlIHRoaXMuX3R3ZWVuO1xuICAgICAgdGhpcy5fdHdlZW4gPSBudWxsO1xuICAgICAgdGhpcy5fdXBkYXRlID0gdGhpcy5fdXBkYXRlVGFzaztcbiAgICB9XG4gIH0pO1xuXG4gIHBoaW5hLmFjY2Vzc29yeS5Ud2VlbmVyLnByb3RvdHlwZS4kbWV0aG9kKFwiX3VwZGF0ZVdhaXRcIiwgZnVuY3Rpb24oYXBwKSB7XG4gICAgLy/igLvjgZPjgozjgarjgYTjgahwYXVzZeOBjOOBhuOBlOOBi+OBquOBhFxuICAgIGlmICghdGhpcy5wbGF5aW5nKSByZXR1cm47XG5cbiAgICB2YXIgd2FpdCA9IHRoaXMuX3dhaXQ7XG4gICAgdmFyIHRpbWUgPSB0aGlzLl9nZXRVbml0VGltZShhcHApO1xuICAgIHdhaXQudGltZSArPSB0aW1lO1xuXG4gICAgaWYgKHdhaXQudGltZSA+PSB3YWl0LmxpbWl0KSB7XG4gICAgICBkZWxldGUgdGhpcy5fd2FpdDtcbiAgICAgIHRoaXMuX3dhaXQgPSBudWxsO1xuICAgICAgdGhpcy5fdXBkYXRlID0gdGhpcy5fdXBkYXRlVGFzaztcbiAgICB9XG4gIH0pO1xuXG59KTtcbiIsInBoaW5hLmRlZmluZShcIkJ1dHRvbml6ZVwiLCB7XG4gIGluaXQ6IGZ1bmN0aW9uKCkge30sXG4gIF9zdGF0aWM6IHtcbiAgICBTVEFUVVM6IHtcbiAgICAgIE5PTkU6IDAsXG4gICAgICBTVEFSVDogMSxcbiAgICAgIEVORDogMixcbiAgICB9LFxuICAgIHN0YXR1czogMCxcbiAgICByZWN0OiBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgICBlbGVtZW50LmJvdW5kaW5nVHlwZSA9IFwicmVjdFwiO1xuICAgICAgdGhpcy5fY29tbW9uKGVsZW1lbnQpO1xuICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgfSxcbiAgICBjaXJjbGU6IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICAgIGVsZW1lbnQucmFkaXVzID0gTWF0aC5tYXgoZWxlbWVudC53aWR0aCwgZWxlbWVudC5oZWlnaHQpICogMC41O1xuICAgICAgZWxlbWVudC5ib3VuZGluZ1R5cGUgPSBcImNpcmNsZVwiO1xuICAgICAgdGhpcy5fY29tbW9uKGVsZW1lbnQpO1xuICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgfSxcbiAgICBfY29tbW9uOiBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgICAvL1RPRE8644Ko44OH44Kj44K/44O844Gn44GN44KL44G+44Gn44Gu5pqr5a6a5a++5b+cXG4gICAgICBlbGVtZW50LnNldE9yaWdpbigwLjUsIDAuNSwgdHJ1ZSk7XG5cbiAgICAgIGVsZW1lbnQuaW50ZXJhY3RpdmUgPSB0cnVlO1xuICAgICAgZWxlbWVudC5jbGlja1NvdW5kID0gXCJzZS9jbGlja0J1dHRvblwiO1xuXG4gICAgICAvL1RPRE8644Oc44K/44Oz44Gu5ZCM5pmC5oq85LiL44Gv5a6f5qmf44Gn6Kq/5pW044GZ44KLXG4gICAgICBlbGVtZW50Lm9uKFwicG9pbnRzdGFydFwiLCBlID0+IHtcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzICE9IHRoaXMuU1RBVFVTLk5PTkUpIHJldHVybjtcbiAgICAgICAgdGhpcy5zdGF0dXMgPSB0aGlzLlNUQVRVUy5TVEFSVDtcbiAgICAgICAgZWxlbWVudC50d2VlbmVyLmNsZWFyKClcbiAgICAgICAgICAudG8oe1xuICAgICAgICAgICAgc2NhbGVYOiAwLjksXG4gICAgICAgICAgICBzY2FsZVk6IDAuOVxuICAgICAgICAgIH0sIDEwMCk7XG4gICAgICB9KTtcblxuICAgICAgZWxlbWVudC5vbihcInBvaW50ZW5kXCIsIChlKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLnN0YXR1cyAhPSB0aGlzLlNUQVRVUy5TVEFSVCkgcmV0dXJuO1xuICAgICAgICBjb25zdCBoaXRUZXN0ID0gZWxlbWVudC5oaXRUZXN0KGUucG9pbnRlci54LCBlLnBvaW50ZXIueSk7XG4gICAgICAgIHRoaXMuc3RhdHVzID0gdGhpcy5TVEFUVVMuRU5EO1xuICAgICAgICBpZiAoaGl0VGVzdCkgZWxlbWVudC5mbGFyZShcImNsaWNrU291bmRcIik7XG5cbiAgICAgICAgZWxlbWVudC50d2VlbmVyLmNsZWFyKClcbiAgICAgICAgICAudG8oe1xuICAgICAgICAgICAgc2NhbGVYOiAxLjAsXG4gICAgICAgICAgICBzY2FsZVk6IDEuMFxuICAgICAgICAgIH0sIDEwMClcbiAgICAgICAgICAuY2FsbCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnN0YXR1cyA9IHRoaXMuU1RBVFVTLk5PTkU7XG4gICAgICAgICAgICBpZiAoIWhpdFRlc3QpIHJldHVybjtcbiAgICAgICAgICAgIGVsZW1lbnQuZmxhcmUoXCJjbGlja2VkXCIsIHtcbiAgICAgICAgICAgICAgcG9pbnRlcjogZS5wb2ludGVyXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICAvL+OCouODi+ODoeODvOOCt+ODp+ODs+OBruacgOS4reOBq+WJiumZpOOBleOCjOOBn+WgtOWQiOOBq+WCmeOBiOOBpnJlbW92ZWTjgqTjg5njg7Pjg4jmmYLjgavjg5Xjg6njgrDjgpLlhYPjgavmiLvjgZfjgabjgYrjgY9cbiAgICAgIGVsZW1lbnQub25lKFwicmVtb3ZlZFwiLCAoKSA9PiB7XG4gICAgICAgIHRoaXMuc3RhdHVzID0gdGhpcy5TVEFUVVMuTk9ORTtcbiAgICAgIH0pO1xuXG4gICAgICBlbGVtZW50Lm9uKFwiY2xpY2tTb3VuZFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKCFlbGVtZW50LmNsaWNrU291bmQpIHJldHVybjtcbiAgICAgICAgLy9waGluYS5hc3NldC5Tb3VuZE1hbmFnZXIucGxheShlbGVtZW50LmNsaWNrU291bmQpO1xuICAgICAgfSk7XG4gICAgfSxcbiAgfSxcbn0pO1xuIiwicGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuXG4gIC8qKlxuICAgKiDjg4bjgq/jgrnjg4Hjg6PplqLkv4Ljga7jg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAgICovXG4gIHBoaW5hLmRlZmluZShcIlRleHR1cmVVdGlsXCIsIHtcblxuICAgIF9zdGF0aWM6IHtcblxuICAgICAgLyoqXG4gICAgICAgKiBSR0LlkITopoHntKDjgavlrp/mlbDjgpLnqY3nrpfjgZnjgotcbiAgICAgICAqL1xuICAgICAgbXVsdGlwbHlDb2xvcjogZnVuY3Rpb24odGV4dHVyZSwgcmVkLCBncmVlbiwgYmx1ZSkge1xuICAgICAgICBpZiAodHlwZW9mKHRleHR1cmUpID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgdGV4dHVyZSA9IEFzc2V0TWFuYWdlci5nZXQoXCJpbWFnZVwiLCB0ZXh0dXJlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHdpZHRoID0gdGV4dHVyZS5kb21FbGVtZW50LndpZHRoO1xuICAgICAgICBjb25zdCBoZWlnaHQgPSB0ZXh0dXJlLmRvbUVsZW1lbnQuaGVpZ2h0O1xuXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IENhbnZhcygpLnNldFNpemUod2lkdGgsIGhlaWdodCk7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSByZXN1bHQuY29udGV4dDtcblxuICAgICAgICBjb250ZXh0LmRyYXdJbWFnZSh0ZXh0dXJlLmRvbUVsZW1lbnQsIDAsIDApO1xuICAgICAgICBjb25zdCBpbWFnZURhdGEgPSBjb250ZXh0LmdldEltYWdlRGF0YSgwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbWFnZURhdGEuZGF0YS5sZW5ndGg7IGkgKz0gNCkge1xuICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2kgKyAwXSA9IE1hdGguZmxvb3IoaW1hZ2VEYXRhLmRhdGFbaSArIDBdICogcmVkKTtcbiAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpICsgMV0gPSBNYXRoLmZsb29yKGltYWdlRGF0YS5kYXRhW2kgKyAxXSAqIGdyZWVuKTtcbiAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpICsgMl0gPSBNYXRoLmZsb29yKGltYWdlRGF0YS5kYXRhW2kgKyAyXSAqIGJsdWUpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQucHV0SW1hZ2VEYXRhKGltYWdlRGF0YSwgMCwgMCk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAgICog6Imy55u444O75b2p5bqm44O75piO5bqm44KS5pON5L2c44GZ44KLXG4gICAgICAgKi9cbiAgICAgIGVkaXRCeUhzbDogZnVuY3Rpb24odGV4dHVyZSwgaCwgcywgbCkge1xuICAgICAgICBpZiAodHlwZW9mKHRleHR1cmUpID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgdGV4dHVyZSA9IEFzc2V0TWFuYWdlci5nZXQoXCJpbWFnZVwiLCB0ZXh0dXJlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHdpZHRoID0gdGV4dHVyZS5kb21FbGVtZW50LndpZHRoO1xuICAgICAgICBjb25zdCBoZWlnaHQgPSB0ZXh0dXJlLmRvbUVsZW1lbnQuaGVpZ2h0O1xuXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IENhbnZhcygpLnNldFNpemUod2lkdGgsIGhlaWdodCk7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSByZXN1bHQuY29udGV4dDtcblxuICAgICAgICBjb250ZXh0LmRyYXdJbWFnZSh0ZXh0dXJlLmRvbUVsZW1lbnQsIDAsIDApO1xuICAgICAgICBjb25zdCBpbWFnZURhdGEgPSBjb250ZXh0LmdldEltYWdlRGF0YSgwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbWFnZURhdGEuZGF0YS5sZW5ndGg7IGkgKz0gNCkge1xuICAgICAgICAgIGNvbnN0IHIgPSBpbWFnZURhdGEuZGF0YVtpICsgMF07XG4gICAgICAgICAgY29uc3QgZyA9IGltYWdlRGF0YS5kYXRhW2kgKyAxXTtcbiAgICAgICAgICBjb25zdCBiID0gaW1hZ2VEYXRhLmRhdGFbaSArIDJdO1xuXG4gICAgICAgICAgY29uc3QgaHNsID0gcGhpbmEudXRpbC5Db2xvci5SR0J0b0hTTChyLCBnLCBiKTtcbiAgICAgICAgICBjb25zdCBuZXdSZ2IgPSBwaGluYS51dGlsLkNvbG9yLkhTTHRvUkdCKGhzbFswXSArIGgsIE1hdGguY2xhbXAoaHNsWzFdICsgcywgMCwgMTAwKSwgTWF0aC5jbGFtcChoc2xbMl0gKyBsLCAwLCAxMDApKTtcblxuICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2kgKyAwXSA9IG5ld1JnYlswXTtcbiAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpICsgMV0gPSBuZXdSZ2JbMV07XG4gICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaSArIDJdID0gbmV3UmdiWzJdO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQucHV0SW1hZ2VEYXRhKGltYWdlRGF0YSwgMCwgMCk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH0sXG5cbiAgICB9LFxuXG4gICAgaW5pdDogZnVuY3Rpb24oKSB7fSxcbiAgfSk7XG5cbn0pO1xuIiwiLypcbiAqICBwaGluYS50aWxlZG1hcC5qc1xuICogIDIwMTYvOS8xMFxuICogIEBhdXRoZXIgbWluaW1vICBcbiAqICBUaGlzIFByb2dyYW0gaXMgTUlUIGxpY2Vuc2UuXG4gKiBcbiAqICAyMDE5LzkvMThcbiAqICB2ZXJzaW9uIDIuMFxuICovXG5cbnBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5kZWZpbmUoXCJwaGluYS5hc3NldC5UaWxlZE1hcFwiLCB7XG4gICAgc3VwZXJDbGFzczogXCJwaGluYS5hc3NldC5YTUxMb2FkZXJcIixcblxuICAgIGltYWdlOiBudWxsLFxuXG4gICAgdGlsZXNldHM6IG51bGwsXG4gICAgbGF5ZXJzOiBudWxsLFxuXG4gICAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuc3VwZXJJbml0KCk7XG4gICAgfSxcblxuICAgIF9sb2FkOiBmdW5jdGlvbihyZXNvbHZlKSB7XG4gICAgICAvL+ODkeOCueaKnOOBjeWHuuOBl1xuICAgICAgdGhpcy5wYXRoID0gXCJcIjtcbiAgICAgIGNvbnN0IGxhc3QgPSB0aGlzLnNyYy5sYXN0SW5kZXhPZihcIi9cIik7XG4gICAgICBpZiAobGFzdCA+IDApIHtcbiAgICAgICAgdGhpcy5wYXRoID0gdGhpcy5zcmMuc3Vic3RyaW5nKDAsIGxhc3QgKyAxKTtcbiAgICAgIH1cblxuICAgICAgLy/ntYLkuobplqLmlbDkv53lrZhcbiAgICAgIHRoaXMuX3Jlc29sdmUgPSByZXNvbHZlO1xuXG4gICAgICAvLyBsb2FkXG4gICAgICBjb25zdCB4bWwgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgIHhtbC5vcGVuKCdHRVQnLCB0aGlzLnNyYyk7XG4gICAgICB4bWwub25yZWFkeXN0YXRlY2hhbmdlID0gKCkgPT4ge1xuICAgICAgICBpZiAoeG1sLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICBpZiAoWzIwMCwgMjAxLCAwXS5pbmRleE9mKHhtbC5zdGF0dXMpICE9PSAtMSkge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IChuZXcgRE9NUGFyc2VyKCkpLnBhcnNlRnJvbVN0cmluZyh4bWwucmVzcG9uc2VUZXh0LCBcInRleHQveG1sXCIpO1xuICAgICAgICAgICAgdGhpcy5kYXRhVHlwZSA9IFwieG1sXCI7XG4gICAgICAgICAgICB0aGlzLmRhdGEgPSBkYXRhO1xuICAgICAgICAgICAgdGhpcy5fcGFyc2UoZGF0YSlcbiAgICAgICAgICAgICAgLnRoZW4oKCkgPT4gdGhpcy5fcmVzb2x2ZSh0aGlzKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgeG1sLnNlbmQobnVsbCk7XG4gICAgfSxcblxuICAgIC8v44Oe44OD44OX44Kk44Oh44O844K45Y+W5b6XXG4gICAgZ2V0SW1hZ2U6IGZ1bmN0aW9uKGxheWVyTmFtZSkge1xuICAgICAgaWYgKGxheWVyTmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmltYWdlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2dlbmVyYXRlSW1hZ2UobGF5ZXJOYW1lKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLy/mjIflrprjg57jg4Pjg5fjg6zjgqTjg6Tjg7zjgpLphY3liJfjgajjgZfjgablj5blvpdcbiAgICBnZXRNYXBEYXRhOiBmdW5jdGlvbihsYXllck5hbWUpIHtcbiAgICAgIC8v44Os44Kk44Ok44O85qSc57SiXG4gICAgICBmb3IobGV0IGkgPSAwOyBpIDwgdGhpcy5sYXllcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHRoaXMubGF5ZXJzW2ldLm5hbWUgPT0gbGF5ZXJOYW1lKSB7XG4gICAgICAgICAgLy/jgrPjg5Tjg7zjgpLov5TjgZlcbiAgICAgICAgICByZXR1cm4gdGhpcy5sYXllcnNbaV0uZGF0YS5jb25jYXQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSxcblxuICAgIC8v44Kq44OW44K444Kn44Kv44OI44Kw44Or44O844OX44KS5Y+W5b6X77yI5oyH5a6a44GM54Sh44GE5aC05ZCI44CB5YWo44Os44Kk44Ok44O844KS6YWN5YiX44Gr44GX44Gm6L+U44GZ77yJXG4gICAgZ2V0T2JqZWN0R3JvdXA6IGZ1bmN0aW9uKGdyb3VwTmFtZSkge1xuICAgICAgZ3JvdXBOYW1lID0gZ3JvdXBOYW1lIHx8IG51bGw7XG4gICAgICBjb25zdCBscyA9IFtdO1xuICAgICAgY29uc3QgbGVuID0gdGhpcy5sYXllcnMubGVuZ3RoO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAodGhpcy5sYXllcnNbaV0udHlwZSA9PSBcIm9iamVjdGdyb3VwXCIpIHtcbiAgICAgICAgICBpZiAoZ3JvdXBOYW1lID09IG51bGwgfHwgZ3JvdXBOYW1lID09IHRoaXMubGF5ZXJzW2ldLm5hbWUpIHtcbiAgICAgICAgICAgIC8v44Os44Kk44Ok44O85oOF5aCx44KS44Kv44Ot44O844Oz44GZ44KLXG4gICAgICAgICAgICBjb25zdCBvYmogPSB0aGlzLl9jbG9uZU9iamVjdExheWVyKHRoaXMubGF5ZXJzW2ldKTtcbiAgICAgICAgICAgIGlmIChncm91cE5hbWUgIT09IG51bGwpIHJldHVybiBvYmo7XG4gICAgICAgICAgICBscy5wdXNoKG9iaik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbHM7XG4gICAgfSxcblxuICAgIC8v44Kq44OW44K444Kn44Kv44OI44Os44Kk44Ok44O844KS44Kv44Ot44O844Oz44GX44Gm6L+U44GZXG4gICAgX2Nsb25lT2JqZWN0TGF5ZXI6IGZ1bmN0aW9uKHNyY0xheWVyKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSB7fS4kc2FmZShzcmNMYXllcik7XG4gICAgICByZXN1bHQub2JqZWN0cyA9IFtdO1xuICAgICAgLy/jg6zjgqTjg6Tjg7zlhoXjgqrjg5bjgrjjgqfjgq/jg4jjga7jgrPjg5Tjg7xcbiAgICAgIHNyY0xheWVyLm9iamVjdHMuZm9yRWFjaChvYmogPT4ge1xuICAgICAgICBjb25zdCByZXNPYmogPSB7XG4gICAgICAgICAgcHJvcGVydGllczoge30uJHNhZmUob2JqLnByb3BlcnRpZXMpLFxuICAgICAgICB9LiRleHRlbmQob2JqKTtcbiAgICAgICAgaWYgKG9iai5lbGxpcHNlKSByZXNPYmouZWxsaXBzZSA9IG9iai5lbGxpcHNlO1xuICAgICAgICBpZiAob2JqLmdpZCkgcmVzT2JqLmdpZCA9IG9iai5naWQ7XG4gICAgICAgIGlmIChvYmoucG9seWdvbikgcmVzT2JqLnBvbHlnb24gPSBvYmoucG9seWdvbi5jbG9uZSgpO1xuICAgICAgICBpZiAob2JqLnBvbHlsaW5lKSByZXNPYmoucG9seWxpbmUgPSBvYmoucG9seWxpbmUuY2xvbmUoKTtcbiAgICAgICAgcmVzdWx0Lm9iamVjdHMucHVzaChyZXNPYmopO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICBfcGFyc2U6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgLy/jgr/jgqTjg6vlsZ7mgKfmg4XloLHlj5blvpdcbiAgICAgICAgY29uc3QgbWFwID0gZGF0YS5nZXRFbGVtZW50c0J5VGFnTmFtZSgnbWFwJylbMF07XG4gICAgICAgIGNvbnN0IGF0dHIgPSB0aGlzLl9hdHRyVG9KU09OKG1hcCk7XG4gICAgICAgIHRoaXMuJGV4dGVuZChhdHRyKTtcbiAgICAgICAgdGhpcy5wcm9wZXJ0aWVzID0gdGhpcy5fcHJvcGVydGllc1RvSlNPTihtYXApO1xuXG4gICAgICAgIC8v44K/44Kk44Or44K744OD44OI5Y+W5b6XXG4gICAgICAgIHRoaXMudGlsZXNldHMgPSB0aGlzLl9wYXJzZVRpbGVzZXRzKGRhdGEpO1xuICAgICAgICB0aGlzLnRpbGVzZXRzLnNvcnQoKGEsIGIpID0+IGEuZmlyc3RnaWQgLSBiLmZpcnN0Z2lkKTtcblxuICAgICAgICAvL+ODrOOCpOODpOODvOWPluW+l1xuICAgICAgICB0aGlzLmxheWVycyA9IHRoaXMuX3BhcnNlTGF5ZXJzKGRhdGEpO1xuXG4gICAgICAgIC8v44Kk44Oh44O844K444OH44O844K/6Kqt44G/6L6844G/XG4gICAgICAgIHRoaXMuX2NoZWNrSW1hZ2UoKVxuICAgICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICAgIC8v44Oe44OD44OX44Kk44Oh44O844K455Sf5oiQXG4gICAgICAgICAgICB0aGlzLmltYWdlID0gdGhpcy5fZ2VuZXJhdGVJbWFnZSgpO1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgIH0pO1xuICAgICAgfSlcbiAgICB9LFxuXG4gICAgLy/jgr/jgqTjg6vjgrvjg4Pjg4jjga7jg5Hjg7zjgrlcbiAgICBfcGFyc2VUaWxlc2V0czogZnVuY3Rpb24oeG1sKSB7XG4gICAgICBjb25zdCBlYWNoID0gQXJyYXkucHJvdG90eXBlLmZvckVhY2g7XG4gICAgICBjb25zdCBkYXRhID0gW107XG4gICAgICBjb25zdCB0aWxlc2V0cyA9IHhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZSgndGlsZXNldCcpO1xuICAgICAgZWFjaC5jYWxsKHRpbGVzZXRzLCBhc3luYyB0aWxlc2V0ID0+IHtcbiAgICAgICAgY29uc3QgdCA9IHt9O1xuICAgICAgICBjb25zdCBhdHRyID0gdGhpcy5fYXR0clRvSlNPTih0aWxlc2V0KTtcbiAgICAgICAgaWYgKGF0dHIuc291cmNlKSB7XG4gICAgICAgICAgdC5pc09sZEZvcm1hdCA9IGZhbHNlO1xuICAgICAgICAgIHQuc291cmNlID0gdGhpcy5wYXRoICsgYXR0ci5zb3VyY2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy/ml6fjg4fjg7zjgr/lvaLlvI/vvIjmnKrlr77lv5zvvIlcbiAgICAgICAgICB0LmlzT2xkRm9ybWF0ID0gdHJ1ZTtcbiAgICAgICAgICB0LmRhdGEgPSB0aWxlc2V0O1xuICAgICAgICB9XG4gICAgICAgIHQuZmlyc3RnaWQgPSBhdHRyLmZpcnN0Z2lkO1xuICAgICAgICBkYXRhLnB1c2godCk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBkYXRhO1xuICAgIH0sXG5cbiAgICAvL+ODrOOCpOODpOODvOaDheWgseOBruODkeODvOOCuVxuICAgIF9wYXJzZUxheWVyczogZnVuY3Rpb24oeG1sKSB7XG4gICAgICBjb25zdCBlYWNoID0gQXJyYXkucHJvdG90eXBlLmZvckVhY2g7XG4gICAgICBjb25zdCBkYXRhID0gW107XG5cbiAgICAgIGNvbnN0IG1hcCA9IHhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZShcIm1hcFwiKVswXTtcbiAgICAgIGNvbnN0IGxheWVycyA9IFtdO1xuICAgICAgZWFjaC5jYWxsKG1hcC5jaGlsZE5vZGVzLCBlbG0gPT4ge1xuICAgICAgICBpZiAoZWxtLnRhZ05hbWUgPT0gXCJsYXllclwiIHx8IGVsbS50YWdOYW1lID09IFwib2JqZWN0Z3JvdXBcIiB8fCBlbG0udGFnTmFtZSA9PSBcImltYWdlbGF5ZXJcIikge1xuICAgICAgICAgIGxheWVycy5wdXNoKGVsbSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBsYXllcnMuZWFjaChsYXllciA9PiB7XG4gICAgICAgIHN3aXRjaCAobGF5ZXIudGFnTmFtZSkge1xuICAgICAgICAgIGNhc2UgXCJsYXllclwiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAvL+mAmuW4uOODrOOCpOODpOODvFxuICAgICAgICAgICAgICBjb25zdCBkID0gbGF5ZXIuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2RhdGEnKVswXTtcbiAgICAgICAgICAgICAgY29uc3QgZW5jb2RpbmcgPSBkLmdldEF0dHJpYnV0ZShcImVuY29kaW5nXCIpO1xuICAgICAgICAgICAgICBjb25zdCBsID0ge1xuICAgICAgICAgICAgICAgICAgdHlwZTogXCJsYXllclwiLFxuICAgICAgICAgICAgICAgICAgbmFtZTogbGF5ZXIuZ2V0QXR0cmlidXRlKFwibmFtZVwiKSxcbiAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICBpZiAoZW5jb2RpbmcgPT0gXCJjc3ZcIikge1xuICAgICAgICAgICAgICAgICAgbC5kYXRhID0gdGhpcy5fcGFyc2VDU1YoZC50ZXh0Q29udGVudCk7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAoZW5jb2RpbmcgPT0gXCJiYXNlNjRcIikge1xuICAgICAgICAgICAgICAgICAgbC5kYXRhID0gdGhpcy5fcGFyc2VCYXNlNjQoZC50ZXh0Q29udGVudCk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBjb25zdCBhdHRyID0gdGhpcy5fYXR0clRvSlNPTihsYXllcik7XG4gICAgICAgICAgICAgIGwuJGV4dGVuZChhdHRyKTtcbiAgICAgICAgICAgICAgbC5wcm9wZXJ0aWVzID0gdGhpcy5fcHJvcGVydGllc1RvSlNPTihsYXllcik7XG5cbiAgICAgICAgICAgICAgZGF0YS5wdXNoKGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAvL+OCquODluOCuOOCp+OCr+ODiOODrOOCpOODpOODvFxuICAgICAgICAgIGNhc2UgXCJvYmplY3Rncm91cFwiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCBsID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0Z3JvdXBcIixcbiAgICAgICAgICAgICAgICBvYmplY3RzOiBbXSxcbiAgICAgICAgICAgICAgICBuYW1lOiBsYXllci5nZXRBdHRyaWJ1dGUoXCJuYW1lXCIpLFxuICAgICAgICAgICAgICAgIHg6IHBhcnNlRmxvYXQobGF5ZXIuZ2V0QXR0cmlidXRlKFwib2Zmc2V0eFwiKSkgfHwgMCxcbiAgICAgICAgICAgICAgICB5OiBwYXJzZUZsb2F0KGxheWVyLmdldEF0dHJpYnV0ZShcIm9mZnNldHlcIikpIHx8IDAsXG4gICAgICAgICAgICAgICAgYWxwaGE6IGxheWVyLmdldEF0dHJpYnV0ZShcIm9wYWNpdHlcIikgfHwgMSxcbiAgICAgICAgICAgICAgICBjb2xvcjogbGF5ZXIuZ2V0QXR0cmlidXRlKFwiY29sb3JcIikgfHwgbnVsbCxcbiAgICAgICAgICAgICAgICBkcmF3b3JkZXI6IGxheWVyLmdldEF0dHJpYnV0ZShcImRyYXdvcmRlclwiKSB8fCBudWxsLFxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBlYWNoLmNhbGwobGF5ZXIuY2hpbGROb2RlcywgZWxtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZWxtLm5vZGVUeXBlID09IDMpIHJldHVybjtcbiAgICAgICAgICAgICAgICBjb25zdCBkID0gdGhpcy5fYXR0clRvSlNPTihlbG0pO1xuICAgICAgICAgICAgICAgIGQucHJvcGVydGllcyA9IHRoaXMuX3Byb3BlcnRpZXNUb0pTT04oZWxtKTtcbiAgICAgICAgICAgICAgICAvL+WtkOimgee0oOOBruino+aekFxuICAgICAgICAgICAgICAgIGlmIChlbG0uY2hpbGROb2Rlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgIGVsbS5jaGlsZE5vZGVzLmZvckVhY2goZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlLm5vZGVUeXBlID09IDMpIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgLy/mpZXlhoZcbiAgICAgICAgICAgICAgICAgICAgaWYgKGUubm9kZU5hbWUgPT0gJ2VsbGlwc2UnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgZC5lbGxpcHNlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvL+WkmuinkuW9olxuICAgICAgICAgICAgICAgICAgICBpZiAoZS5ub2RlTmFtZSA9PSAncG9seWdvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICBkLnBvbHlnb24gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhdHRyID0gdGhpcy5fYXR0clRvSlNPTl9zdHIoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGwgPSBhdHRyLnBvaW50cy5zcGxpdChcIiBcIik7XG4gICAgICAgICAgICAgICAgICAgICAgcGwuZm9yRWFjaChmdW5jdGlvbihzdHIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHB0cyA9IHN0ci5zcGxpdChcIixcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBkLnBvbHlnb24ucHVzaCh7eDogcGFyc2VGbG9hdChwdHNbMF0pLCB5OiBwYXJzZUZsb2F0KHB0c1sxXSl9KTtcbiAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvL+e3muWIhlxuICAgICAgICAgICAgICAgICAgICBpZiAoZS5ub2RlTmFtZSA9PSAncG9seWxpbmUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgZC5wb2x5bGluZSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGF0dHIgPSB0aGlzLl9hdHRyVG9KU09OX3N0cihlKTtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwbCA9IGF0dHIucG9pbnRzLnNwbGl0KFwiIFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICBwbC5mb3JFYWNoKHN0ciA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwdHMgPSBzdHIuc3BsaXQoXCIsXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZC5wb2x5bGluZS5wdXNoKHt4OiBwYXJzZUZsb2F0KHB0c1swXSksIHk6IHBhcnNlRmxvYXQocHRzWzFdKX0pO1xuICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbC5vYmplY3RzLnB1c2goZCk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBsLnByb3BlcnRpZXMgPSB0aGlzLl9wcm9wZXJ0aWVzVG9KU09OKGxheWVyKTtcblxuICAgICAgICAgICAgICBkYXRhLnB1c2gobCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgIC8v44Kk44Oh44O844K444Os44Kk44Ok44O8XG4gICAgICAgICAgY2FzZSBcImltYWdlbGF5ZXJcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgbCA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBcImltYWdlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICBuYW1lOiBsYXllci5nZXRBdHRyaWJ1dGUoXCJuYW1lXCIpLFxuICAgICAgICAgICAgICAgIHg6IHBhcnNlRmxvYXQobGF5ZXIuZ2V0QXR0cmlidXRlKFwib2Zmc2V0eFwiKSkgfHwgMCxcbiAgICAgICAgICAgICAgICB5OiBwYXJzZUZsb2F0KGxheWVyLmdldEF0dHJpYnV0ZShcIm9mZnNldHlcIikpIHx8IDAsXG4gICAgICAgICAgICAgICAgYWxwaGE6IGxheWVyLmdldEF0dHJpYnV0ZShcIm9wYWNpdHlcIikgfHwgMSxcbiAgICAgICAgICAgICAgICB2aXNpYmxlOiAobGF5ZXIuZ2V0QXR0cmlidXRlKFwidmlzaWJsZVwiKSA9PT0gdW5kZWZpbmVkIHx8IGxheWVyLmdldEF0dHJpYnV0ZShcInZpc2libGVcIikgIT0gMCksXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGNvbnN0IGltYWdlRWxtID0gbGF5ZXIuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJpbWFnZVwiKVswXTtcbiAgICAgICAgICAgICAgbC5pbWFnZSA9IHtzb3VyY2U6IGltYWdlRWxtLmdldEF0dHJpYnV0ZShcInNvdXJjZVwiKX07XG5cbiAgICAgICAgICAgICAgZGF0YS5wdXNoKGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgLy/jgrDjg6vjg7zjg5dcbiAgICAgICAgICBjYXNlIFwiZ3JvdXBcIjpcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBkYXRhO1xuICAgIH0sXG5cbiAgICAvL+OCouOCu+ODg+ODiOOBq+eEoeOBhOOCpOODoeODvOOCuOODh+ODvOOCv+OCkuiqreOBv+i+vOOBv1xuICAgIF9jaGVja0ltYWdlOiBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnN0IGltYWdlU291cmNlID0gW107XG4gICAgICBjb25zdCBsb2FkSW1hZ2UgPSBbXTtcblxuICAgICAgLy/kuIDopqfkvZzmiJBcbiAgICAgIHRoaXMudGlsZXNldHMuZm9yRWFjaCh0aWxlc2V0ID0+IHtcbiAgICAgICAgY29uc3Qgb2JqID0ge1xuICAgICAgICAgIGlzVGlsZXNldDogdHJ1ZSxcbiAgICAgICAgICBpbWFnZTogdGlsZXNldC5zb3VyY2UsXG4gICAgICAgIH07XG4gICAgICAgIGltYWdlU291cmNlLnB1c2gob2JqKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5sYXllcnMuZm9yRWFjaChsYXllciA9PiB7XG4gICAgICAgIGlmIChsYXllci5pbWFnZSkge1xuICAgICAgICAgIGNvbnN0IG9iaiA9IHtcbiAgICAgICAgICAgIGlzVGlsZXNldDogZmFsc2UsXG4gICAgICAgICAgICBpbWFnZTogbGF5ZXIuaW1hZ2Uuc291cmNlLFxuICAgICAgICAgIH07XG4gICAgICAgICAgaW1hZ2VTb3VyY2UucHVzaChvYmopO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy/jgqLjgrvjg4Pjg4jjgavjgYLjgovjgYvnorroqo1cbiAgICAgIGltYWdlU291cmNlLmZvckVhY2goZSA9PiB7XG4gICAgICAgIGlmIChlLmlzVGlsZXNldCkge1xuICAgICAgICAgIGNvbnN0IHRzeCA9IHBoaW5hLmFzc2V0LkFzc2V0TWFuYWdlci5nZXQoJ3RzeCcsIGUuaW1hZ2UpO1xuICAgICAgICAgIGlmICghdHN4KSB7XG4gICAgICAgICAgICAvL+OCouOCu+ODg+ODiOOBq+OBquOBi+OBo+OBn+OBruOBp+ODreODvOODieODquOCueODiOOBq+i/veWKoFxuICAgICAgICAgICAgbG9hZEltYWdlLnB1c2goZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGltYWdlID0gcGhpbmEuYXNzZXQuQXNzZXRNYW5hZ2VyLmdldCgnaW1hZ2UnLCBlLmltYWdlKTtcbiAgICAgICAgICBpZiAoIWltYWdlKSB7XG4gICAgICAgICAgICAvL+OCouOCu+ODg+ODiOOBq+OBquOBi+OBo+OBn+OBruOBp+ODreODvOODieODquOCueODiOOBq+i/veWKoFxuICAgICAgICAgICAgbG9hZEltYWdlLnB1c2goZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy/kuIDmi6zjg63jg7zjg4lcbiAgICAgIC8v44Ot44O844OJ44Oq44K544OI5L2c5oiQXG4gICAgICBpZiAobG9hZEltYWdlLmxlbmd0aCkge1xuICAgICAgICBjb25zdCBhc3NldHMgPSB7IGltYWdlOiBbXSwgdHN4OiBbXSB9O1xuICAgICAgICBsb2FkSW1hZ2UuZm9yRWFjaChlID0+IHtcbiAgICAgICAgICBpZiAoZS5pc1RpbGVzZXQpIHtcbiAgICAgICAgICAgIGFzc2V0cy50c3hbZS5pbWFnZV0gPSBlLmltYWdlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvL+OCouOCu+ODg+ODiOOBruODkeOCueOCkuODnuODg+ODl+OBqOWQjOOBmOOBq+OBmeOCi1xuICAgICAgICAgICAgYXNzZXRzLmltYWdlW2UuaW1hZ2VdID0gdGhpcy5wYXRoICsgZS5pbWFnZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgY29uc3QgbG9hZGVyID0gcGhpbmEuYXNzZXQuQXNzZXRMb2FkZXIoKTtcbiAgICAgICAgICBsb2FkZXIubG9hZChhc3NldHMpO1xuICAgICAgICAgIGxvYWRlci5vbignbG9hZCcsICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMudGlsZXNldHMuZm9yRWFjaChlID0+IHtcbiAgICAgICAgICAgICAgZS50c3ggPSBwaGluYS5hc3NldC5Bc3NldE1hbmFnZXIuZ2V0KCd0c3gnLCBlLnNvdXJjZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIC8v44Oe44OD44OX44Kk44Oh44O844K45L2c5oiQXG4gICAgX2dlbmVyYXRlSW1hZ2U6IGZ1bmN0aW9uKGxheWVyTmFtZSkge1xuICAgICAgbGV0IG51bUxheWVyID0gMDtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5sYXllcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHRoaXMubGF5ZXJzW2ldLnR5cGUgPT0gXCJsYXllclwiIHx8IHRoaXMubGF5ZXJzW2ldLnR5cGUgPT0gXCJpbWFnZWxheWVyXCIpIG51bUxheWVyKys7XG4gICAgICB9XG4gICAgICBpZiAobnVtTGF5ZXIgPT0gMCkgcmV0dXJuIG51bGw7XG5cbiAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy53aWR0aCAqIHRoaXMudGlsZXdpZHRoO1xuICAgICAgY29uc3QgaGVpZ2h0ID0gdGhpcy5oZWlnaHQgKiB0aGlzLnRpbGVoZWlnaHQ7XG4gICAgICBjb25zdCBjYW52YXMgPSBwaGluYS5ncmFwaGljcy5DYW52YXMoKS5zZXRTaXplKHdpZHRoLCBoZWlnaHQpO1xuXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubGF5ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIC8v44Oe44OD44OX44Os44Kk44Ok44O8XG4gICAgICAgIGlmICh0aGlzLmxheWVyc1tpXS50eXBlID09IFwibGF5ZXJcIiAmJiB0aGlzLmxheWVyc1tpXS52aXNpYmxlICE9IFwiMFwiKSB7XG4gICAgICAgICAgaWYgKGxheWVyTmFtZSA9PT0gdW5kZWZpbmVkIHx8IGxheWVyTmFtZSA9PT0gdGhpcy5sYXllcnNbaV0ubmFtZSkge1xuICAgICAgICAgICAgY29uc3QgbGF5ZXIgPSB0aGlzLmxheWVyc1tpXTtcbiAgICAgICAgICAgIGNvbnN0IG1hcGRhdGEgPSBsYXllci5kYXRhO1xuICAgICAgICAgICAgY29uc3Qgd2lkdGggPSBsYXllci53aWR0aDtcbiAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IGxheWVyLmhlaWdodDtcbiAgICAgICAgICAgIGNvbnN0IG9wYWNpdHkgPSBsYXllci5vcGFjaXR5IHx8IDEuMDtcbiAgICAgICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgICAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgeSsrKSB7XG4gICAgICAgICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7IHgrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gbWFwZGF0YVtjb3VudF07XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAvL+ODnuODg+ODl+ODgeODg+ODl+OCkumFjee9rlxuICAgICAgICAgICAgICAgICAgdGhpcy5fc2V0TWFwQ2hpcChjYW52YXMsIGluZGV4LCB4ICogdGhpcy50aWxld2lkdGgsIHkgKiB0aGlzLnRpbGVoZWlnaHQsIG9wYWNpdHkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8v44Kq44OW44K444Kn44Kv44OI44Kw44Or44O844OXXG4gICAgICAgIGlmICh0aGlzLmxheWVyc1tpXS50eXBlID09IFwib2JqZWN0Z3JvdXBcIiAmJiB0aGlzLmxheWVyc1tpXS52aXNpYmxlICE9IFwiMFwiKSB7XG4gICAgICAgICAgaWYgKGxheWVyTmFtZSA9PT0gdW5kZWZpbmVkIHx8IGxheWVyTmFtZSA9PT0gdGhpcy5sYXllcnNbaV0ubmFtZSkge1xuICAgICAgICAgICAgY29uc3QgbGF5ZXIgPSB0aGlzLmxheWVyc1tpXTtcbiAgICAgICAgICAgIGNvbnN0IG9wYWNpdHkgPSBsYXllci5vcGFjaXR5IHx8IDEuMDtcbiAgICAgICAgICAgIGxheWVyLm9iamVjdHMuZm9yRWFjaChmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgIGlmIChlLmdpZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3NldE1hcENoaXAoY2FudmFzLCBlLmdpZCwgZS54LCBlLnksIG9wYWNpdHkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvL+OCpOODoeODvOOCuOODrOOCpOODpOODvFxuICAgICAgICBpZiAodGhpcy5sYXllcnNbaV0udHlwZSA9PSBcImltYWdlbGF5ZXJcIiAmJiB0aGlzLmxheWVyc1tpXS52aXNpYmxlICE9IFwiMFwiKSB7XG4gICAgICAgICAgaWYgKGxheWVyTmFtZSA9PT0gdW5kZWZpbmVkIHx8IGxheWVyTmFtZSA9PT0gdGhpcy5sYXllcnNbaV0ubmFtZSkge1xuICAgICAgICAgICAgY29uc3QgaW1hZ2UgPSBwaGluYS5hc3NldC5Bc3NldE1hbmFnZXIuZ2V0KCdpbWFnZScsIHRoaXMubGF5ZXJzW2ldLmltYWdlLnNvdXJjZSk7XG4gICAgICAgICAgICBjYW52YXMuY29udGV4dC5kcmF3SW1hZ2UoaW1hZ2UuZG9tRWxlbWVudCwgdGhpcy5sYXllcnNbaV0ueCwgdGhpcy5sYXllcnNbaV0ueSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHRleHR1cmUgPSBwaGluYS5hc3NldC5UZXh0dXJlKCk7XG4gICAgICB0ZXh0dXJlLmRvbUVsZW1lbnQgPSBjYW52YXMuZG9tRWxlbWVudDtcbiAgICAgIHJldHVybiB0ZXh0dXJlO1xuICAgIH0sXG5cbiAgICAvL+OCreODo+ODs+ODkOOCueOBruaMh+WumuOBl+OBn+W6p+aomeOBq+ODnuODg+ODl+ODgeODg+ODl+OBruOCpOODoeODvOOCuOOCkuOCs+ODlOODvOOBmeOCi1xuICAgIF9zZXRNYXBDaGlwOiBmdW5jdGlvbihjYW52YXMsIGluZGV4LCB4LCB5LCBvcGFjaXR5KSB7XG4gICAgICAvL+WvvuixoeOCv+OCpOODq+OCu+ODg+ODiOOBruWIpOWIpVxuICAgICAgbGV0IHRpbGVzZXQ7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGlsZXNldHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgdHN4MSA9IHRoaXMudGlsZXNldHNbaV07XG4gICAgICAgIGNvbnN0IHRzeDIgPSB0aGlzLnRpbGVzZXRzW2kgKyAxXTtcbiAgICAgICAgaWYgKCF0c3gyKSB7XG4gICAgICAgICAgdGlsZXNldCA9IHRzeDE7XG4gICAgICAgICAgaSA9IHRoaXMudGlsZXNldHMubGVuZ3RoO1xuICAgICAgICB9IGVsc2UgaWYgKHRzeDEuZmlyc3RnaWQgPD0gaW5kZXggJiYgaW5kZXggPCB0c3gyLmZpcnN0Z2lkKSB7XG4gICAgICAgICAgdGlsZXNldCA9IHRzeDE7XG4gICAgICAgICAgaSA9IHRoaXMudGlsZXNldHMubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvL+OCv+OCpOODq+OCu+ODg+ODiOOBi+OCieODnuODg+ODl+ODgeODg+ODl+OCkuWPluW+l1xuICAgICAgY29uc3QgdHN4ID0gdGlsZXNldC50c3g7XG4gICAgICBjb25zdCBjaGlwID0gdHN4LmNoaXBzW2luZGV4IC0gdGlsZXNldC5maXJzdGdpZF07XG4gICAgICBjb25zdCBpbWFnZSA9IHBoaW5hLmFzc2V0LkFzc2V0TWFuYWdlci5nZXQoJ2ltYWdlJywgY2hpcC5pbWFnZSk7XG4gICAgICBjYW52YXMuY29udGV4dC5kcmF3SW1hZ2UoXG4gICAgICAgIGltYWdlLmRvbUVsZW1lbnQsXG4gICAgICAgIGNoaXAueCArIHRzeC5tYXJnaW4sIGNoaXAueSArIHRzeC5tYXJnaW4sXG4gICAgICAgIHRzeC50aWxld2lkdGgsIHRzeC50aWxlaGVpZ2h0LFxuICAgICAgICB4LCB5LFxuICAgICAgICB0c3gudGlsZXdpZHRoLCB0c3gudGlsZWhlaWdodCk7XG4gICAgfSxcblxuICB9KTtcblxuICAvL+ODreODvOODgOODvOOBq+i/veWKoFxuICBwaGluYS5hc3NldC5Bc3NldExvYWRlci5hc3NldExvYWRGdW5jdGlvbnMudG14ID0gZnVuY3Rpb24oa2V5LCBwYXRoKSB7XG4gICAgY29uc3QgdG14ID0gcGhpbmEuYXNzZXQuVGlsZWRNYXAoKTtcbiAgICByZXR1cm4gdG14LmxvYWQocGF0aCk7XG4gIH07XG5cbn0pOyIsIi8qXG4gKiAgcGhpbmEuVGlsZXNldC5qc1xuICogIDIwMTkvOS8xMlxuICogIEBhdXRoZXIgbWluaW1vICBcbiAqICBUaGlzIFByb2dyYW0gaXMgTUlUIGxpY2Vuc2UuXG4gKlxuICovXG5cbnBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5kZWZpbmUoXCJwaGluYS5hc3NldC5UaWxlU2V0XCIsIHtcbiAgICBzdXBlckNsYXNzOiBcInBoaW5hLmFzc2V0LlhNTExvYWRlclwiLFxuXG4gICAgaW1hZ2U6IG51bGwsXG4gICAgdGlsZXdpZHRoOiAwLFxuICAgIHRpbGVoZWlnaHQ6IDAsXG4gICAgdGlsZWNvdW50OiAwLFxuICAgIGNvbHVtbnM6IDAsXG5cbiAgICBpbml0OiBmdW5jdGlvbih4bWwpIHtcbiAgICAgICAgdGhpcy5zdXBlckluaXQoKTtcbiAgICAgICAgaWYgKHhtbCkge1xuICAgICAgICAgIHRoaXMubG9hZEZyb21YTUwoeG1sKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBfbG9hZDogZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgICAgLy/jg5HjgrnmipzjgY3lh7rjgZdcbiAgICAgIHRoaXMucGF0aCA9IFwiXCI7XG4gICAgICBjb25zdCBsYXN0ID0gdGhpcy5zcmMubGFzdEluZGV4T2YoXCIvXCIpO1xuICAgICAgaWYgKGxhc3QgPiAwKSB7XG4gICAgICAgIHRoaXMucGF0aCA9IHRoaXMuc3JjLnN1YnN0cmluZygwLCBsYXN0ICsgMSk7XG4gICAgICB9XG5cbiAgICAgIC8v57WC5LqG6Zai5pWw5L+d5a2YXG4gICAgICB0aGlzLl9yZXNvbHZlID0gcmVzb2x2ZTtcblxuICAgICAgLy8gbG9hZFxuICAgICAgY29uc3QgeG1sID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICB4bWwub3BlbignR0VUJywgdGhpcy5zcmMpO1xuICAgICAgeG1sLm9ucmVhZHlzdGF0ZWNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgaWYgKHhtbC5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgaWYgKFsyMDAsIDIwMSwgMF0uaW5kZXhPZih4bWwuc3RhdHVzKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSAobmV3IERPTVBhcnNlcigpKS5wYXJzZUZyb21TdHJpbmcoeG1sLnJlc3BvbnNlVGV4dCwgXCJ0ZXh0L3htbFwiKTtcbiAgICAgICAgICAgIHRoaXMuZGF0YVR5cGUgPSBcInhtbFwiO1xuICAgICAgICAgICAgdGhpcy5kYXRhID0gZGF0YTtcbiAgICAgICAgICAgIHRoaXMuX3BhcnNlKGRhdGEpXG4gICAgICAgICAgICAgIC50aGVuKCgpID0+IHRoaXMuX3Jlc29sdmUodGhpcykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIHhtbC5zZW5kKG51bGwpO1xuICAgIH0sXG5cbiAgICBsb2FkRnJvbVhNTDogZnVuY3Rpb24oeG1sKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGFyc2UoeG1sKTtcbiAgICB9LFxuXG4gICAgX3BhcnNlOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIC8v44K/44Kk44Or44K744OD44OI5Y+W5b6XXG4gICAgICAgIGNvbnN0IHRpbGVzZXQgPSBkYXRhLmdldEVsZW1lbnRzQnlUYWdOYW1lKCd0aWxlc2V0JylbMF07XG4gICAgICAgIGNvbnN0IHByb3BzID0gdGhpcy5fcHJvcGVydGllc1RvSlNPTih0aWxlc2V0KTtcblxuICAgICAgICAvL+OCv+OCpOODq+OCu+ODg+ODiOWxnuaAp+aDheWgseWPluW+l1xuICAgICAgICBjb25zdCBhdHRyID0gdGhpcy5fYXR0clRvSlNPTih0aWxlc2V0KTtcbiAgICAgICAgYXR0ci4kc2FmZSh7XG4gICAgICAgICAgdGlsZXdpZHRoOiAzMixcbiAgICAgICAgICB0aWxlaGVpZ2h0OiAzMixcbiAgICAgICAgICBzcGFjaW5nOiAwLFxuICAgICAgICAgIG1hcmdpbjogMCxcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuJGV4dGVuZChhdHRyKTtcbiAgICAgICAgdGhpcy5jaGlwcyA9IFtdO1xuXG4gICAgICAgIC8v44K944O844K555S75YOP6Kit5a6a5Y+W5b6XXG4gICAgICAgIHRoaXMuaW1hZ2VOYW1lID0gdGlsZXNldC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW1hZ2UnKVswXS5nZXRBdHRyaWJ1dGUoJ3NvdXJjZScpO1xuICBcbiAgICAgICAgLy/pgI/pgY7oibLoqK3lrprlj5blvpdcbiAgICAgICAgY29uc3QgdHJhbnMgPSB0aWxlc2V0LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdpbWFnZScpWzBdLmdldEF0dHJpYnV0ZSgndHJhbnMnKTtcbiAgICAgICAgaWYgKHRyYW5zKSB7XG4gICAgICAgICAgdGhpcy50cmFuc1IgPSBwYXJzZUludCh0cmFucy5zdWJzdHJpbmcoMCwgMiksIDE2KTtcbiAgICAgICAgICB0aGlzLnRyYW5zRyA9IHBhcnNlSW50KHRyYW5zLnN1YnN0cmluZygyLCA0KSwgMTYpO1xuICAgICAgICAgIHRoaXMudHJhbnNCID0gcGFyc2VJbnQodHJhbnMuc3Vic3RyaW5nKDQsIDYpLCAxNik7XG4gICAgICAgIH1cbiAgXG4gICAgICAgIC8v44Oe44OD44OX44OB44OD44OX44Oq44K544OI5L2c5oiQXG4gICAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgdGhpcy50aWxlY291bnQ7IHIrKykge1xuICAgICAgICAgIGNvbnN0IGNoaXAgPSB7XG4gICAgICAgICAgICBpbWFnZTogdGhpcy5pbWFnZU5hbWUsXG4gICAgICAgICAgICB4OiAociAgJSB0aGlzLmNvbHVtbnMpICogKHRoaXMudGlsZXdpZHRoICsgdGhpcy5zcGFjaW5nKSArIHRoaXMubWFyZ2luLFxuICAgICAgICAgICAgeTogTWF0aC5mbG9vcihyIC8gdGhpcy5jb2x1bW5zKSAqICh0aGlzLnRpbGVoZWlnaHQgKyB0aGlzLnNwYWNpbmcpICsgdGhpcy5tYXJnaW4sXG4gICAgICAgICAgfTtcbiAgICAgICAgICB0aGlzLmNoaXBzW3JdID0gY2hpcDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8v44Kk44Oh44O844K444OH44O844K/6Kqt44G/6L6844G/XG4gICAgICAgIHRoaXMuX2xvYWRJbWFnZSgpXG4gICAgICAgICAgLnRoZW4oKCkgPT4gcmVzb2x2ZSgpKTtcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvL+OCouOCu+ODg+ODiOOBq+eEoeOBhOOCpOODoeODvOOCuOODh+ODvOOCv+OCkuiqreOBv+i+vOOBv1xuICAgIF9sb2FkSW1hZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICBjb25zdCBpbWFnZVNvdXJjZSA9IHtcbiAgICAgICAgICBpbWFnZU5hbWU6IHRoaXMuaW1hZ2VOYW1lLFxuICAgICAgICAgIGltYWdlVXJsOiB0aGlzLnBhdGggKyB0aGlzLmltYWdlTmFtZSxcbiAgICAgICAgICB0cmFuc1I6IHRoaXMudHJhbnNSLFxuICAgICAgICAgIHRyYW5zRzogdGhpcy50cmFuc0csXG4gICAgICAgICAgdHJhbnNCOiB0aGlzLnRyYW5zQixcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGxldCBsb2FkSW1hZ2UgPSBudWxsO1xuICAgICAgICBjb25zdCBpbWFnZSA9IHBoaW5hLmFzc2V0LkFzc2V0TWFuYWdlci5nZXQoJ2ltYWdlJywgaW1hZ2VTb3VyY2UuaW1hZ2UpO1xuICAgICAgICBpZiAoaW1hZ2UpIHtcbiAgICAgICAgICB0aGlzLmltYWdlID0gaW1hZ2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG9hZEltYWdlID0gaW1hZ2VTb3VyY2U7XG4gICAgICAgIH1cblxuICAgICAgICAvL+ODreODvOODieODquOCueODiOS9nOaIkFxuICAgICAgICBjb25zdCBhc3NldHMgPSB7IGltYWdlOiBbXSB9O1xuICAgICAgICBhc3NldHMuaW1hZ2VbaW1hZ2VTb3VyY2UuaW1hZ2VOYW1lXSA9IGltYWdlU291cmNlLmltYWdlVXJsO1xuXG4gICAgICAgIGlmIChsb2FkSW1hZ2UpIHtcbiAgICAgICAgICBjb25zdCBsb2FkZXIgPSBwaGluYS5hc3NldC5Bc3NldExvYWRlcigpO1xuICAgICAgICAgIGxvYWRlci5sb2FkKGFzc2V0cyk7XG4gICAgICAgICAgbG9hZGVyLm9uKCdsb2FkJywgZSA9PiB7XG4gICAgICAgICAgICAvL+mAj+mBjuiJsuioreWumuWPjeaYoFxuICAgICAgICAgICAgdGhpcy5pbWFnZSA9IHBoaW5hLmFzc2V0LkFzc2V0TWFuYWdlci5nZXQoJ2ltYWdlJywgaW1hZ2VTb3VyY2UuaW1hZ2VVcmwpO1xuICAgICAgICAgICAgaWYgKGltYWdlU291cmNlLnRyYW5zUiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHIgPSBpbWFnZVNvdXJjZS50cmFuc1I7XG4gICAgICAgICAgICAgIGNvbnN0IGcgPSBpbWFnZVNvdXJjZS50cmFuc0c7XG4gICAgICAgICAgICAgIGNvbnN0IGIgPSBpbWFnZVNvdXJjZS50cmFuc0I7XG4gICAgICAgICAgICAgIHRoaXMuaW1hZ2UuZmlsdGVyKChwaXhlbCwgaW5kZXgsIHgsIHksIGJpdG1hcCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBiaXRtYXAuZGF0YTtcbiAgICAgICAgICAgICAgICBpZiAocGl4ZWxbMF0gPT0gciAmJiBwaXhlbFsxXSA9PSBnICYmIHBpeGVsWzJdID09IGIpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YVtpbmRleCszXSA9IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0sXG4gIH0pO1xuXG4gIC8v44Ot44O844OA44O844Gr6L+95YqgXG4gIHBoaW5hLmFzc2V0LkFzc2V0TG9hZGVyLmFzc2V0TG9hZEZ1bmN0aW9ucy50c3ggPSBmdW5jdGlvbihrZXksIHBhdGgpIHtcbiAgICBjb25zdCB0c3ggPSBwaGluYS5hc3NldC5UaWxlU2V0KCk7XG4gICAgcmV0dXJuIHRzeC5sb2FkKHBhdGgpO1xuICB9O1xuXG59KTsiLCIvL1xuLy8g5rGO55So6Zai5pWw576kXG4vL1xucGhpbmEuZGVmaW5lKFwiVXRpbFwiLCB7XG4gIF9zdGF0aWM6IHtcblxuICAgIC8v5oyH5a6a44GV44KM44Gf44Kq44OW44K444Kn44Kv44OI44KS44Or44O844OI44Go44GX44Gm55uu55qE44GuaWTjgpLotbDmn7vjgZnjgotcbiAgICBmaW5kQnlJZDogZnVuY3Rpb24oaWQsIG9iaikge1xuICAgICAgaWYgKG9iai5pZCA9PT0gaWQpIHJldHVybiBvYmo7XG4gICAgICBjb25zdCBjaGlsZHJlbiA9IE9iamVjdC5rZXlzKG9iai5jaGlsZHJlbiB8fCB7fSkubWFwKGtleSA9PiBvYmouY2hpbGRyZW5ba2V5XSk7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGhpdCA9IHRoaXMuZmluZEJ5SWQoaWQsIGNoaWxkcmVuW2ldKTtcbiAgICAgICAgaWYgKGhpdCkgcmV0dXJuIGhpdDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG5cbiAgICAvL1RPRE8644GT44GT44GY44KD44Gq44GE5oSf44GM44GC44KL44Gu44Gn44GZ44GM44CB5LiA5pem5a6f6KOFXG4gICAgLy/mjIflrprjgZXjgozjgZ9B44GoQuOBrmFzc2V0c+OBrumAo+aDs+mFjeWIl+OCkuaWsOimj+OBruOCquODluOCuOOCp+OCr+ODiOOBq+ODnuODvOOCuOOBmeOCi1xuICAgIG1lcmdlQXNzZXRzOiBmdW5jdGlvbihhc3NldHNBLCBhc3NldHNCKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSB7fTtcbiAgICAgIGFzc2V0c0EuZm9ySW4oKHR5cGVLZXksIHR5cGVWYWx1ZSkgPT4ge1xuICAgICAgICBpZiAoIXJlc3VsdC4kaGFzKHR5cGVLZXkpKSByZXN1bHRbdHlwZUtleV0gPSB7fTtcbiAgICAgICAgdHlwZVZhbHVlLmZvckluKChhc3NldEtleSwgYXNzZXRQYXRoKSA9PiB7XG4gICAgICAgICAgcmVzdWx0W3R5cGVLZXldW2Fzc2V0S2V5XSA9IGFzc2V0UGF0aDtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIGFzc2V0c0IuZm9ySW4oKHR5cGVLZXksIHR5cGVWYWx1ZSkgPT4ge1xuICAgICAgICBpZiAoIXJlc3VsdC4kaGFzKHR5cGVLZXkpKSByZXN1bHRbdHlwZUtleV0gPSB7fTtcbiAgICAgICAgdHlwZVZhbHVlLmZvckluKChhc3NldEtleSwgYXNzZXRQYXRoKSA9PiB7XG4gICAgICAgICAgcmVzdWx0W3R5cGVLZXldW2Fzc2V0S2V5XSA9IGFzc2V0UGF0aDtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8v54++5Zyo5pmC6ZaT44GL44KJ5oyH5a6a5pmC6ZaT44G+44Gn44Gp44Gu44GP44KJ44GE44GL44GL44KL44GL44KS6L+U5Y2044GZ44KLXG4gICAgLy9cbiAgICAvLyBvdXRwdXQgOiB7IFxuICAgIC8vICAgdG90YWxEYXRlOjAgLCBcbiAgICAvLyAgIHRvdGFsSG91cjowICwgXG4gICAgLy8gICB0b3RhbE1pbnV0ZXM6MCAsIFxuICAgIC8vICAgdG90YWxTZWNvbmRzOjAgLFxuICAgIC8vICAgZGF0ZTowICwgXG4gICAgLy8gICBob3VyOjAgLCBcbiAgICAvLyAgIG1pbnV0ZXM6MCAsIFxuICAgIC8vICAgc2Vjb25kczowIFxuICAgIC8vIH1cbiAgICAvL1xuXG4gICAgY2FsY1JlbWFpbmluZ1RpbWU6IGZ1bmN0aW9uKGZpbmlzaCkge1xuICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHtcbiAgICAgICAgXCJ0b3RhbERhdGVcIjogMCxcbiAgICAgICAgXCJ0b3RhbEhvdXJcIjogMCxcbiAgICAgICAgXCJ0b3RhbE1pbnV0ZXNcIjogMCxcbiAgICAgICAgXCJ0b3RhbFNlY29uZHNcIjogMCxcbiAgICAgICAgXCJkYXRlXCI6IDAsXG4gICAgICAgIFwiaG91clwiOiAwLFxuICAgICAgICBcIm1pbnV0ZXNcIjogMCxcbiAgICAgICAgXCJzZWNvbmRzXCI6IDAsXG4gICAgICB9XG5cbiAgICAgIGZpbmlzaCA9IChmaW5pc2ggaW5zdGFuY2VvZiBEYXRlKSA/IGZpbmlzaCA6IG5ldyBEYXRlKGZpbmlzaCk7XG4gICAgICBsZXQgZGlmZiA9IGZpbmlzaCAtIG5vdztcbiAgICAgIGlmIChkaWZmID09PSAwKSByZXR1cm4gcmVzdWx0O1xuXG4gICAgICBjb25zdCBzaWduID0gKGRpZmYgPCAwKSA/IC0xIDogMTtcblxuICAgICAgLy9UT0RPOuOBk+OBrui+uuOCiuOCguOBhuWwkeOBl+e2uum6l+OBq+abuOOBkeOBquOBhOOBi+aknOiojlxuICAgICAgLy/ljZjkvY3liKUgMeacqua6gOOBrzBcbiAgICAgIHJlc3VsdFtcInRvdGFsRGF0ZVwiXSA9IHBhcnNlSW50KGRpZmYgLyAxMDAwIC8gNjAgLyA2MCAvIDI0KTtcbiAgICAgIHJlc3VsdFtcInRvdGFsSG91clwiXSA9IHBhcnNlSW50KGRpZmYgLyAxMDAwIC8gNjAgLyA2MCk7XG4gICAgICByZXN1bHRbXCJ0b3RhbE1pbnV0ZXNcIl0gPSBwYXJzZUludChkaWZmIC8gMTAwMCAvIDYwKTtcbiAgICAgIHJlc3VsdFtcInRvdGFsU2Vjb25kc1wiXSA9IHBhcnNlSW50KGRpZmYgLyAxMDAwKTtcblxuICAgICAgZGlmZiAtPSByZXN1bHRbXCJ0b3RhbERhdGVcIl0gKiA4NjQwMDAwMDtcbiAgICAgIHJlc3VsdFtcImhvdXJcIl0gPSBwYXJzZUludChkaWZmIC8gMTAwMCAvIDYwIC8gNjApO1xuXG4gICAgICBkaWZmIC09IHJlc3VsdFtcImhvdXJcIl0gKiAzNjAwMDAwO1xuICAgICAgcmVzdWx0W1wibWludXRlc1wiXSA9IHBhcnNlSW50KGRpZmYgLyAxMDAwIC8gNjApO1xuXG4gICAgICBkaWZmIC09IHJlc3VsdFtcIm1pbnV0ZXNcIl0gKiA2MDAwMDtcbiAgICAgIHJlc3VsdFtcInNlY29uZHNcIl0gPSBwYXJzZUludChkaWZmIC8gMTAwMCk7XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG5cbiAgICB9LFxuXG4gICAgLy/jg6zjgqTjgqLjgqbjg4jjgqjjg4fjgqPjgr/jg7zjgafjga9TcHJpdGXlhajjgaZBdGFsc1Nwcml0ZeOBq+OBquOBo+OBpuOBl+OBvuOBhuOBn+OCgeOAgVxuICAgIC8vU3ByaXRl44Gr5beu44GX5pu/44GI44KJ44KM44KL44KI44GG44Gr44GZ44KLXG5cbiAgICAvL0F0bGFzU3ByaXRl6Ieq6Lqr44Gr5Y2Y55m644GuSW1hZ2XjgpLjgrvjg4Pjg4jjgafjgY3jgovjgojjgYbjgavjgZnjgovvvJ9cbiAgICAvL+OBguOBqOOBp+OBquOBq+OBi+OBl+OCieWvvuetluOBl+OBquOBhOOBqOOBoOOCgeOBoOOBjO+8k+aciOe0jeWTgeOBp+OBr+S4gOaXpuOBk+OCjOOBp1xuICAgIHJlcGxhY2VBdGxhc1Nwcml0ZVRvU3ByaXRlOiBmdW5jdGlvbihwYXJlbnQsIGF0bGFzU3ByaXRlLCBzcHJpdGUpIHtcbiAgICAgIGNvbnN0IGluZGV4ID0gcGFyZW50LmdldENoaWxkSW5kZXgoYXRsYXNTcHJpdGUpO1xuICAgICAgc3ByaXRlLnNldE9yaWdpbihhdGxhc1Nwcml0ZS5vcmlnaW5YLCBhdGxhc1Nwcml0ZS5vcmlnaW5ZKTtcbiAgICAgIHNwcml0ZS5zZXRQb3NpdGlvbihhdGxhc1Nwcml0ZS54LCBhdGxhc1Nwcml0ZS55KTtcbiAgICAgIHBhcmVudC5hZGRDaGlsZEF0KHNwcml0ZSwgaW5kZXgpO1xuICAgICAgYXRsYXNTcHJpdGUucmVtb3ZlKCk7XG4gICAgICByZXR1cm4gc3ByaXRlO1xuICAgIH0sXG4gIH1cbn0pO1xuIiwiLypcbiAqICBwaGluYS54bWxsb2FkZXIuanNcbiAqICAyMDE5LzkvMTJcbiAqICBAYXV0aGVyIG1pbmltbyAgXG4gKiAgVGhpcyBQcm9ncmFtIGlzIE1JVCBsaWNlbnNlLlxuICpcbiAqL1xuXG5waGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZGVmaW5lKFwicGhpbmEuYXNzZXQuWE1MTG9hZGVyXCIsIHtcbiAgICBzdXBlckNsYXNzOiBcInBoaW5hLmFzc2V0LkFzc2V0XCIsXG5cbiAgICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5zdXBlckluaXQoKTtcbiAgICB9LFxuXG4gICAgX2xvYWQ6IGZ1bmN0aW9uKHJlc29sdmUpIHtcbiAgICAgIHJlc29sdmUoKTtcbiAgICB9LFxuXG4gICAgLy9YTUzjg5fjg63jg5Hjg4bjgqPjgpJKU09O44Gr5aSJ5o+bXG4gICAgX3Byb3BlcnRpZXNUb0pTT046IGZ1bmN0aW9uKGVsbSkge1xuICAgICAgY29uc3QgcHJvcGVydGllcyA9IGVsbS5nZXRFbGVtZW50c0J5VGFnTmFtZShcInByb3BlcnRpZXNcIilbMF07XG4gICAgICBjb25zdCBvYmogPSB7fTtcbiAgICAgIGlmIChwcm9wZXJ0aWVzID09PSB1bmRlZmluZWQpIHJldHVybiBvYmo7XG5cbiAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgcHJvcGVydGllcy5jaGlsZE5vZGVzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgIGNvbnN0IHAgPSBwcm9wZXJ0aWVzLmNoaWxkTm9kZXNba107XG4gICAgICAgIGlmIChwLnRhZ05hbWUgPT09IFwicHJvcGVydHlcIikge1xuICAgICAgICAgIC8vcHJvcGVydHnjgat0eXBl5oyH5a6a44GM44GC44Gj44Gf44KJ5aSJ5o+bXG4gICAgICAgICAgY29uc3QgdHlwZSA9IHAuZ2V0QXR0cmlidXRlKCd0eXBlJyk7XG4gICAgICAgICAgY29uc3QgdmFsdWUgPSBwLmdldEF0dHJpYnV0ZSgndmFsdWUnKTtcbiAgICAgICAgICBpZiAoIXZhbHVlKSB2YWx1ZSA9IHAudGV4dENvbnRlbnQ7XG4gICAgICAgICAgaWYgKHR5cGUgPT0gXCJpbnRcIikge1xuICAgICAgICAgICAgb2JqW3AuZ2V0QXR0cmlidXRlKCduYW1lJyldID0gcGFyc2VJbnQodmFsdWUsIDEwKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT0gXCJmbG9hdFwiKSB7XG4gICAgICAgICAgICBvYmpbcC5nZXRBdHRyaWJ1dGUoJ25hbWUnKV0gPSBwYXJzZUZsb2F0KHZhbHVlKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT0gXCJib29sXCIgKSB7XG4gICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJ0cnVlXCIpIG9ialtwLmdldEF0dHJpYnV0ZSgnbmFtZScpXSA9IHRydWU7XG4gICAgICAgICAgICBlbHNlIG9ialtwLmdldEF0dHJpYnV0ZSgnbmFtZScpXSA9IGZhbHNlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvYmpbcC5nZXRBdHRyaWJ1dGUoJ25hbWUnKV0gPSB2YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBvYmo7XG4gICAgfSxcblxuICAgIC8vWE1M5bGe5oCn44KSSlNPTuOBq+WkieaPm1xuICAgIF9hdHRyVG9KU09OOiBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICAgIGNvbnN0IG9iaiA9IHt9O1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzb3VyY2UuYXR0cmlidXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBsZXQgdmFsID0gc291cmNlLmF0dHJpYnV0ZXNbaV0udmFsdWU7XG4gICAgICAgIHZhbCA9IGlzTmFOKHBhcnNlRmxvYXQodmFsKSk/IHZhbDogcGFyc2VGbG9hdCh2YWwpO1xuICAgICAgICBvYmpbc291cmNlLmF0dHJpYnV0ZXNbaV0ubmFtZV0gPSB2YWw7XG4gICAgICB9XG4gICAgICByZXR1cm4gb2JqO1xuICAgIH0sXG5cbiAgICAvL1hNTOWxnuaAp+OCkkpTT07jgavlpInmj5vvvIhTdHJpbmfjgafov5TjgZnvvIlcbiAgICBfYXR0clRvSlNPTl9zdHI6IGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgICAgY29uc3Qgb2JqID0ge307XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNvdXJjZS5hdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHZhbCA9IHNvdXJjZS5hdHRyaWJ1dGVzW2ldLnZhbHVlO1xuICAgICAgICBvYmpbc291cmNlLmF0dHJpYnV0ZXNbaV0ubmFtZV0gPSB2YWw7XG4gICAgICB9XG4gICAgICByZXR1cm4gb2JqO1xuICAgIH0sXG5cbiAgICAvL0NTVuODkeODvOOCuVxuICAgIF9wYXJzZUNTVjogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgY29uc3QgZGF0YUxpc3QgPSBkYXRhLnNwbGl0KCcsJyk7XG4gICAgICBjb25zdCBsYXllciA9IFtdO1xuXG4gICAgICBkYXRhTGlzdC5lYWNoKGVsbSA9PiB7XG4gICAgICAgIGNvbnN0IG51bSA9IHBhcnNlSW50KGVsbSwgMTApO1xuICAgICAgICBsYXllci5wdXNoKG51bSk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIGxheWVyO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCQVNFNjTjg5Hjg7zjgrlcbiAgICAgKiBodHRwOi8vdGhla2Fubm9uLXNlcnZlci5hcHBzcG90LmNvbS9oZXJwaXR5LWRlcnBpdHkuYXBwc3BvdC5jb20vcGFzdGViaW4uY29tLzc1S2tzMFdIXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfcGFyc2VCYXNlNjQ6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIGNvbnN0IGRhdGFMaXN0ID0gYXRvYihkYXRhLnRyaW0oKSk7XG4gICAgICBjb25zdCByc3QgPSBbXTtcblxuICAgICAgZGF0YUxpc3QgPSBkYXRhTGlzdC5zcGxpdCgnJykubWFwKGUgPT4gZS5jaGFyQ29kZUF0KDApKTtcblxuICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IGRhdGFMaXN0Lmxlbmd0aCAvIDQ7IGkgPCBsZW47ICsraSkge1xuICAgICAgICBjb25zdCBuID0gZGF0YUxpc3RbaSo0XTtcbiAgICAgICAgcnN0W2ldID0gcGFyc2VJbnQobiwgMTApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcnN0O1xuICAgIH0sXG4gIH0pO1xuXG59KTsiLCIvL1xuLy8g44K344O844Oz44Ko44OV44Kn44Kv44OI44Gu5Z+656SO44Kv44Op44K5XG4vL1xucGhpbmEuZGVmaW5lKFwiU2NlbmVFZmZlY3RCYXNlXCIsIHtcbiAgc3VwZXJDbGFzczogXCJJbnB1dEludGVyY2VwdFwiLFxuXG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3VwZXJJbml0KCk7XG4gICAgdGhpcy5lbmFibGUoKTtcbiAgfSxcblxufSk7XG4iLCIvL1xuLy8g44K344O844Oz44Ko44OV44Kn44Kv44OI77ya6KSH5pWw44Gu5YaG44Gn44OV44Kn44O844OJ44Kk44Oz44Ki44Km44OIXG4vL1xucGhpbmEuZGVmaW5lKFwiU2NlbmVFZmZlY3RDaXJjbGVGYWRlXCIsIHtcbiAgc3VwZXJDbGFzczogXCJTY2VuZUVmZmVjdEJhc2VcIixcblxuICBpbml0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0gKHt9KS4kc2FmZShvcHRpb25zLCBTY2VuZUVmZmVjdENpcmNsZUZhZGUuZGVmYXVsdHMpO1xuXG4gICAgdGhpcy5zdXBlckluaXQoKTtcbiAgfSxcblxuICBfY3JlYXRlQ2lyY2xlOiBmdW5jdGlvbigpIHtcbiAgICBjb25zdCBudW0gPSA1O1xuICAgIGNvbnN0IHdpZHRoID0gU0NSRUVOX1dJRFRIIC8gbnVtO1xuICAgIHJldHVybiBBcnJheS5yYW5nZSgoU0NSRUVOX0hFSUdIVCAvIHdpZHRoKSArIDEpLm1hcCh5ID0+IHtcbiAgICAgIHJldHVybiBBcnJheS5yYW5nZShudW0gKyAxKS5tYXAoeCA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZENoaWxkKENpcmNsZVNoYXBlKHtcbiAgICAgICAgICB4OiB4ICogd2lkdGgsXG4gICAgICAgICAgeTogeSAqIHdpZHRoLFxuICAgICAgICAgIGZpbGw6IHRoaXMub3B0aW9ucy5jb2xvcixcbiAgICAgICAgICBzdHJva2U6IG51bGwsXG4gICAgICAgICAgcmFkaXVzOiB3aWR0aCAqIDAuNSxcbiAgICAgICAgfSkpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgYmVnaW46IGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IGNpcmNsZXMgPSB0aGlzLl9jcmVhdGVDaXJjbGUoKTtcbiAgICBjb25zdCB0YXNrcyA9IFtdO1xuICAgIGNpcmNsZXMuZm9yRWFjaCgoeExpbmUsIHkpID0+IHtcbiAgICAgIHhMaW5lLmZvckVhY2goKGNpcmNsZSwgeCkgPT4ge1xuICAgICAgICBjaXJjbGUuc2NhbGVYID0gMDtcbiAgICAgICAgY2lyY2xlLnNjYWxlWSA9IDA7XG4gICAgICAgIHRhc2tzLnB1c2gobmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgY2lyY2xlLnR3ZWVuZXIuY2xlYXIoKVxuICAgICAgICAgICAgLnRvKHtcbiAgICAgICAgICAgICAgc2NhbGVYOiAxLjUsXG4gICAgICAgICAgICAgIHNjYWxlWTogMS41XG4gICAgICAgICAgICB9LCA1MDAsIFwiZWFzZU91dFF1YWRcIilcbiAgICAgICAgICAgIC5jYWxsKCgpID0+IHtcbiAgICAgICAgICAgICAgY2lyY2xlLnJlbW92ZSgpO1xuICAgICAgICAgICAgICBjaXJjbGUuZGVzdHJveUNhbnZhcygpO1xuICAgICAgICAgICAgICB0aGlzLmNoaWxkcmVuLmNsZWFyKCk7XG4gICAgICAgICAgICAgIHRoaXMuZGlzYWJsZSgpO1xuICAgICAgICAgICAgICByZXNvbHZlKClcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwodGFza3MpO1xuICB9LFxuXG4gIGZpbmlzaDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jaGlsZHJlbi5jbGVhcigpO1xuXG4gICAgY29uc3QgY2lyY2xlcyA9IHRoaXMuX2NyZWF0ZUNpcmNsZSgpO1xuICAgIGNvbnN0IHRhc2tzID0gW107XG4gICAgY2lyY2xlcy5mb3JFYWNoKHhMaW5lID0+IHtcbiAgICAgIHhMaW5lLmZvckVhY2goY2lyY2xlID0+IHtcbiAgICAgICAgY2lyY2xlLnNjYWxlWCA9IDEuNTtcbiAgICAgICAgY2lyY2xlLnNjYWxlWSA9IDEuNTtcbiAgICAgICAgdGFza3MucHVzaChuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICBjaXJjbGUudHdlZW5lci5jbGVhcigpXG4gICAgICAgICAgICAudG8oe1xuICAgICAgICAgICAgICBzY2FsZVg6IDAsXG4gICAgICAgICAgICAgIHNjYWxlWTogMFxuICAgICAgICAgICAgfSwgNTAwLCBcImVhc2VPdXRRdWFkXCIpXG4gICAgICAgICAgICAuY2FsbCgoKSA9PiB7XG4gICAgICAgICAgICAgIGNpcmNsZS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgY2lyY2xlLmRlc3Ryb3lDYW52YXMoKTtcbiAgICAgICAgICAgICAgdGhpcy5jaGlsZHJlbi5jbGVhcigpO1xuICAgICAgICAgICAgICB0aGlzLmRpc2FibGUoKTtcbiAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBQcm9taXNlLmFsbCh0YXNrcyk7XG4gIH0sXG5cbiAgX3N0YXRpYzoge1xuICAgIGRlZmF1bHRzOiB7XG4gICAgICBjb2xvcjogXCJ3aGl0ZVwiLFxuICAgIH1cbiAgfVxuXG59KTtcbiIsIi8vXG4vLyDjgrfjg7zjg7Pjgqjjg5Xjgqfjgq/jg4jvvJrjg5Xjgqfjg7zjg4njgqTjg7PjgqLjgqbjg4hcbi8vXG5waGluYS5kZWZpbmUoXCJTY2VuZUVmZmVjdEZhZGVcIiwge1xuICBzdXBlckNsYXNzOiBcIlNjZW5lRWZmZWN0QmFzZVwiLFxuXG4gIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSAoe30pLiRzYWZlKG9wdGlvbnMsIHtcbiAgICAgIGNvbG9yOiBcImJsYWNrXCIsXG4gICAgICB0aW1lOiA1MDAsXG4gICAgfSk7XG5cbiAgICB0aGlzLnN1cGVySW5pdCgpO1xuICAgIHRoaXMuZnJvbUpTT04oe1xuICAgICAgY2hpbGRyZW46IHtcbiAgICAgICAgZmFkZToge1xuICAgICAgICAgIGNsYXNzTmFtZTogXCJSZWN0YW5nbGVTaGFwZVwiLFxuICAgICAgICAgIGFyZ3VtZW50czoge1xuICAgICAgICAgICAgd2lkdGg6IFNDUkVFTl9XSURUSCxcbiAgICAgICAgICAgIGhlaWdodDogU0NSRUVOX0hFSUdIVCxcbiAgICAgICAgICAgIGZpbGw6IHRoaXMub3B0aW9ucy5jb2xvcixcbiAgICAgICAgICAgIHN0cm9rZTogbnVsbCxcbiAgICAgICAgICAgIHBhZGRpbmc6IDAsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB4OiBTQ1JFRU5fV0lEVEggKiAwLjUsXG4gICAgICAgICAgeTogU0NSRUVOX0hFSUdIVCAqIDAuNSxcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICBzdGF5OiBmdW5jdGlvbigpIHtcbiAgICBjb25zdCBmYWRlID0gdGhpcy5mYWRlO1xuICAgIGZhZGUuYWxwaGEgPSAxLjA7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICB9LFxuXG4gIGJlZ2luOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICBjb25zdCBmYWRlID0gdGhpcy5mYWRlO1xuICAgICAgZmFkZS5hbHBoYSA9IDEuMDtcbiAgICAgIGZhZGUudHdlZW5lci5jbGVhcigpXG4gICAgICAgIC5mYWRlT3V0KHRoaXMub3B0aW9ucy50aW1lKVxuICAgICAgICAuY2FsbCgoKSA9PiB7XG4gICAgICAgICAgLy8xRnJhbWXmj4/nlLvjgZXjgozjgabjgZfjgb7jgaPjgabjgaHjgonjgaTjgY/jga7jgadlbnRlcmZyYW1l44Gn5YmK6ZmkXG4gICAgICAgICAgdGhpcy5vbmUoXCJlbnRlcmZyYW1lXCIsICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZmFkZS5yZW1vdmUoKTtcbiAgICAgICAgICAgIHRoaXMuZmFkZS5kZXN0cm95Q2FudmFzKCk7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZSgpXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgfSxcblxuICBmaW5pc2g6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgIGNvbnN0IGZhZGUgPSB0aGlzLmZhZGU7XG4gICAgICBmYWRlLmFscGhhID0gMC4wO1xuICAgICAgZmFkZS50d2VlbmVyLmNsZWFyKClcbiAgICAgICAgLmZhZGVJbih0aGlzLm9wdGlvbnMudGltZSlcbiAgICAgICAgLmNhbGwoKCkgPT4ge1xuICAgICAgICAgIHRoaXMuZmxhcmUoXCJmaW5pc2hcIik7XG4gICAgICAgICAgLy8xRnJhbWXmj4/nlLvjgZXjgozjgabjgZfjgb7jgaPjgabjgaHjgonjgaTjgY/jga7jgadlbnRlcmZyYW1l44Gn5YmK6ZmkXG4gICAgICAgICAgdGhpcy5vbmUoXCJlbnRlcmZyYW1lXCIsICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZmFkZS5yZW1vdmUoKTtcbiAgICAgICAgICAgIHRoaXMuZmFkZS5kZXN0cm95Q2FudmFzKCk7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZSgpXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgfSxcblxuICBfc3RhdGljOiB7XG4gICAgZGVmYXVsdHM6IHtcbiAgICAgIGNvbG9yOiBcImJsYWNrXCIsXG4gICAgfVxuICB9XG5cbn0pO1xuIiwiLy9cbi8vIOOCt+ODvOODs+OCqOODleOCp+OCr+ODiO+8muOBquOBq+OCguOBl+OBquOBhFxuLy9cbnBoaW5hLmRlZmluZShcIlNjZW5lRWZmZWN0Tm9uZVwiLCB7XG4gIHN1cGVyQ2xhc3M6IFwiU2NlbmVFZmZlY3RCYXNlXCIsXG5cbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdXBlckluaXQoKTtcbiAgfSxcblxuICBiZWdpbjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgdGhpcy5vbmUoXCJlbnRlcmZyYW1lXCIsICgpID0+IHRoaXMucmVtb3ZlKCkpO1xuICAgICAgcmVzb2x2ZSgpO1xuICAgIH0pO1xuICB9LFxuXG4gIGZpbmlzaDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgdGhpcy5vbmUoXCJlbnRlcmZyYW1lXCIsICgpID0+IHRoaXMucmVtb3ZlKCkpO1xuICAgICAgcmVzb2x2ZSgpO1xuICAgIH0pO1xuICB9XG5cbn0pO1xuIiwiLy9cbi8vIOOCt+ODvOODs+OCqOODleOCp+OCr+ODiO+8muOCv+OCpOODq+ODleOCp+ODvOODiVxuLy9cbnBoaW5hLmRlZmluZShcIlNjZW5lRWZmZWN0VGlsZUZhZGVcIiwge1xuICBzdXBlckNsYXNzOiBcIlNjZW5lRWZmZWN0QmFzZVwiLFxuXG4gIHRpbGVzOiBudWxsLFxuICBudW06IDE1LFxuICBzcGVlZDogNTAsXG5cbiAgaW5pdDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIHRoaXMuc3VwZXJJbml0KCk7XG4gICAgdGhpcy5vcHRpb25zID0gKHt9KS4kc2FmZShvcHRpb25zLCB7XG4gICAgICBjb2xvcjogXCJibGFja1wiLFxuICAgICAgd2lkdGg6IDc2OCxcbiAgICAgIGhlaWdodDogMTAyNCxcbiAgICB9KTtcblxuICAgIHRoaXMudGlsZXMgPSB0aGlzLl9jcmVhdGVUaWxlcygpO1xuICB9LFxuXG4gIF9jcmVhdGVUaWxlczogZnVuY3Rpb24oKSB7XG4gICAgY29uc3Qgd2lkdGggPSBNYXRoLmZsb29yKHRoaXMub3B0aW9ucy53aWR0aCAvIHRoaXMubnVtKTtcblxuICAgIHJldHVybiBBcnJheS5yYW5nZSgodGhpcy5vcHRpb25zLmhlaWdodCAvIHdpZHRoKSArIDEpLm1hcCh5ID0+IHtcbiAgICAgIHJldHVybiBBcnJheS5yYW5nZSh0aGlzLm51bSArIDEpLm1hcCh4ID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkQ2hpbGQoUmVjdGFuZ2xlU2hhcGUoe1xuICAgICAgICAgIHdpZHRoOiB3aWR0aCArIDIsXG4gICAgICAgICAgaGVpZ2h0OiB3aWR0aCArIDIsXG4gICAgICAgICAgeDogeCAqIHdpZHRoLFxuICAgICAgICAgIHk6IHkgKiB3aWR0aCxcbiAgICAgICAgICBmaWxsOiB0aGlzLm9wdGlvbnMuY29sb3IsXG4gICAgICAgICAgc3Ryb2tlOiBudWxsLFxuICAgICAgICAgIHN0cm9rZVdpZHRoOiAwLFxuICAgICAgICB9KSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSxcblxuICBzdGF5OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnRpbGVzLmZvckVhY2goKHhsaW5lLCB5KSA9PiB7XG4gICAgICB4bGluZS5mb3JFYWNoKCh0aWxlLCB4KSA9PiB7XG4gICAgICAgIHRpbGUuc2NhbGVYID0gMS4wO1xuICAgICAgICB0aWxlLnNjYWxlWSA9IDEuMDtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgfSxcblxuICBiZWdpbjogZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgdGFza3MgPSBbXTtcbiAgICB0aGlzLnRpbGVzLmZvckVhY2goKHhsaW5lLCB5KSA9PiB7XG4gICAgICBjb25zdCB3ID0gTWF0aC5yYW5kZmxvYXQoMCwgMSkgKiB0aGlzLnNwZWVkO1xuICAgICAgeGxpbmUuZm9yRWFjaCgodGlsZSwgeCkgPT4ge1xuICAgICAgICB0aWxlLnNjYWxlWCA9IDEuMDtcbiAgICAgICAgdGlsZS5zY2FsZVkgPSAxLjA7XG4gICAgICAgIHRhc2tzLnB1c2gobmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgdGlsZS50d2VlbmVyLmNsZWFyKClcbiAgICAgICAgICAgIC53YWl0KHggKiB0aGlzLnNwZWVkICsgdylcbiAgICAgICAgICAgIC50byh7XG4gICAgICAgICAgICAgIHNjYWxlWDogMCxcbiAgICAgICAgICAgICAgc2NhbGVZOiAwXG4gICAgICAgICAgICB9LCA1MDAsIFwiZWFzZU91dFF1YWRcIilcbiAgICAgICAgICAgIC5jYWxsKCgpID0+IHtcbiAgICAgICAgICAgICAgdGlsZS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgdGlsZS5kZXN0cm95Q2FudmFzKCk7XG4gICAgICAgICAgICAgIHJlc29sdmUoKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBQcm9taXNlLmFsbCh0YXNrcylcbiAgfSxcblxuICBmaW5pc2g6IGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IHRhc2tzID0gW107XG4gICAgdGhpcy50aWxlcy5mb3JFYWNoKCh4bGluZSwgeSkgPT4ge1xuICAgICAgY29uc3QgdyA9IE1hdGgucmFuZGZsb2F0KDAsIDEpICogdGhpcy5zcGVlZDtcbiAgICAgIHhsaW5lLmZvckVhY2goKHRpbGUsIHgpID0+IHtcbiAgICAgICAgdGlsZS5zY2FsZVggPSAwLjA7XG4gICAgICAgIHRpbGUuc2NhbGVZID0gMC4wO1xuICAgICAgICB0YXNrcy5wdXNoKG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgIHRpbGUudHdlZW5lci5jbGVhcigpXG4gICAgICAgICAgICAud2FpdCgoeGxpbmUubGVuZ3RoIC0geCkgKiB0aGlzLnNwZWVkICsgdylcbiAgICAgICAgICAgIC50byh7XG4gICAgICAgICAgICAgIHNjYWxlWDogMSxcbiAgICAgICAgICAgICAgc2NhbGVZOiAxXG4gICAgICAgICAgICB9LCA1MDAsIFwiZWFzZU91dFF1YWRcIilcbiAgICAgICAgICAgIC5jYWxsKCgpID0+IHtcbiAgICAgICAgICAgICAgdGlsZS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgdGlsZS5kZXN0cm95Q2FudmFzKCk7XG4gICAgICAgICAgICAgIHJlc29sdmUoKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBQcm9taXNlLmFsbCh0YXNrcylcbiAgfSxcblxuICBfc3RhdGljOiB7XG4gICAgZGVmYXVsdHM6IHtcbiAgICAgIGNvbG9yOiBcImJsYWNrXCIsXG4gICAgfVxuICB9XG5cbn0pO1xuIiwiLy9cbi8vIOOCr+ODquODg+OCr+OChOOCv+ODg+ODgeOCkuOCpOODs+OCv+ODvOOCu+ODl+ODiOOBmeOCi1xuLy9cbnBoaW5hLmRlZmluZShcIklucHV0SW50ZXJjZXB0XCIsIHtcbiAgc3VwZXJDbGFzczogXCJEaXNwbGF5RWxlbWVudFwiLFxuXG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3VwZXJJbml0KCk7XG5cbiAgICB0aGlzLm9uKFwiYWRkZWRcIiwgKCkgPT4ge1xuICAgICAgLy/opqrjgavlr77jgZfjgabopobjgYTjgYvjgbbjgZvjgotcbiAgICAgIHRoaXMud2lkdGggPSB0aGlzLnBhcmVudC53aWR0aDtcbiAgICAgIHRoaXMuaGVpZ2h0ID0gdGhpcy5wYXJlbnQuaGVpZ2h0O1xuICAgICAgdGhpcy5vcmlnaW5YID0gdGhpcy5wYXJlbnQub3JpZ2luWCB8fCAwO1xuICAgICAgdGhpcy5vcmlnaW5ZID0gdGhpcy5wYXJlbnQub3JpZ2luWSB8fCAwO1xuICAgICAgdGhpcy54ID0gMDtcbiAgICAgIHRoaXMueSA9IDA7XG4gICAgfSk7XG4gICAgdGhpcy5kaXNhYmxlKCk7XG4gIH0sXG5cbiAgZW5hYmxlOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNldEludGVyYWN0aXZlKHRydWUpO1xuICB9LFxuXG4gIGRpc2FibGU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2V0SW50ZXJhY3RpdmUoZmFsc2UpO1xuICB9LFxuXG59KTtcbiIsInBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBsZXQgZHVtbXlUZXh0dXJlID0gbnVsbDtcblxuICBwaGluYS5kZWZpbmUoXCJTcHJpdGVMYWJlbFwiLCB7XG4gICAgc3VwZXJDbGFzczogXCJEaXNwbGF5RWxlbWVudFwiLFxuXG4gICAgX3RleHQ6IG51bGwsXG4gICAgdGFibGU6IG51bGwsXG4gICAgZml4V2lkdGg6IDAsXG5cbiAgICBzcHJpdGVzOiBudWxsLFxuXG4gICAgaW5pdDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgaWYgKCFkdW1teVRleHR1cmUpIHtcbiAgICAgICAgZHVtbXlUZXh0dXJlID0gQ2FudmFzKCkuc2V0U2l6ZSgxLCAxKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5zdXBlckluaXQob3B0aW9ucyk7XG4gICAgICB0aGlzLnRhYmxlID0gb3B0aW9ucy50YWJsZTtcbiAgICAgIHRoaXMuZml4V2lkdGggPSBvcHRpb25zLmZpeFdpZHRoIHx8IDA7XG5cbiAgICAgIHRoaXMuc3ByaXRlcyA9IFtdO1xuXG4gICAgICB0aGlzLnNldFRleHQoXCJcIik7XG4gICAgfSxcblxuICAgIHNldFRleHQ6IGZ1bmN0aW9uKHRleHQpIHtcbiAgICAgIHRoaXMuX3RleHQgPSB0ZXh0O1xuXG4gICAgICBjb25zdCBjaGFycyA9IHRoaXMudGV4dC5zcGxpdChcIlwiKTtcblxuICAgICAgaWYgKHRoaXMuc3ByaXRlcy5sZW5ndGggPCBjaGFycy5sZW5ndGgpIHtcbiAgICAgICAgQXJyYXkucmFuZ2UoMCwgdGhpcy5zcHJpdGVzLmxlbmd0aCAtIGNoYXJzLmxlbmd0aCkuZm9yRWFjaCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5zcHJpdGVzLnB1c2goU3ByaXRlKGR1bW15VGV4dHVyZSkpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIEFycmF5LnJhbmdlKDAsIGNoYXJzLmxlbmd0aCAtIHRoaXMuc3ByaXRlcy5sZW5ndGgpLmZvckVhY2goKCkgPT4ge1xuICAgICAgICAgIHRoaXMuc3ByaXRlcy5sYXN0LnJlbW92ZSgpO1xuICAgICAgICAgIHRoaXMuc3ByaXRlcy5sZW5ndGggLT0gMTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3RleHQuc3BsaXQoXCJcIikubWFwKChjLCBpKSA9PiB7XG4gICAgICAgIHRoaXMuc3ByaXRlc1tpXVxuICAgICAgICAgIC5zZXRJbWFnZSh0aGlzLnRhYmxlW2NdKVxuICAgICAgICAgIC5zZXRPcmlnaW4odGhpcy5vcmlnaW5YLCB0aGlzLm9yaWdpblkpXG4gICAgICAgICAgLmFkZENoaWxkVG8odGhpcyk7XG4gICAgICB9KTtcblxuICAgICAgY29uc3QgdG90YWxXaWR0aCA9IHRoaXMuc3ByaXRlcy5yZWR1Y2UoKHcsIHMpID0+IHcgKyAodGhpcy5maXhXaWR0aCB8fCBzLndpZHRoKSwgMCk7XG4gICAgICBjb25zdCB0b3RhbEhlaWdodCA9IHRoaXMuc3ByaXRlcy5tYXAoXyA9PiBfLmhlaWdodCkuc29ydCgpLmxhc3Q7XG5cbiAgICAgIGxldCB4ID0gdG90YWxXaWR0aCAqIC10aGlzLm9yaWdpblg7XG4gICAgICB0aGlzLnNwcml0ZXMuZm9yRWFjaCgocykgPT4ge1xuICAgICAgICBjb25zdCB3aWR0aCA9IHRoaXMuZml4V2lkdGggfHwgcy53aWR0aDtcbiAgICAgICAgcy54ID0geCArIHdpZHRoICogcy5vcmlnaW5YO1xuICAgICAgICB4ICs9IHdpZHRoO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBfYWNjZXNzb3I6IHtcbiAgICAgIHRleHQ6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5fdGV4dDtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2KSB7XG4gICAgICAgICAgdGhpcy5zZXRUZXh0KHYpO1xuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuXG4gIH0pO1xuXG59KTtcbiJdfQ==
