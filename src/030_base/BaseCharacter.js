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
