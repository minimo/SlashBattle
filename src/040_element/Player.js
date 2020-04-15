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
        if (this.isRemotePlayer) {
            if (this.controlData) {
                ct = this.controlData;
            } else {
                ct = {};
            }
        }

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
                if (this.isJump && this.numJump < this.numJumpMax && this.vy > -(this.jumpPower / 2)) {
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
                SoundManager.play("slash");
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

    setControlData: function(data) {
        this.controlData = data;
    },
});
