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
