(() => {

    "use strict";


    // =====================================================
    // CANVAS
    // =====================================================

    const canvas =
        document.getElementById("game");

    const ctx =
        canvas.getContext("2d");


    let W =
        innerWidth;

    let H =
        innerHeight;


    function resize() {

        W =
            canvas.width =
            innerWidth;

        H =
            canvas.height =
            innerHeight;

    }


    resize();


    addEventListener(
        "resize",
        resize
    );


    // =====================================================
    // INTERFACE
    // =====================================================

    const ui = {

        name:
            document.getElementById(
                "spiderName"
            ),

        level:
            document.getElementById(
                "level"
            ),

        xp:
            document.getElementById(
                "xpText"
            ),

        xpBar:
            document.getElementById(
                "xpBar"
            ),

        points:
            document.getElementById(
                "points"
            ),

        hp:
            document.getElementById(
                "hp"
            ),

        damage:
            document.getElementById(
                "damage"
            ),

        kills:
            document.getElementById(
                "kills"
            ),

        relics:
            document.getElementById(
                "relics"
            ),

        cycle:
            document.getElementById(
                "cycle"
            ),

        goal:
            document.getElementById(
                "goal"
            ),

        ranged:
            document.getElementById(
                "ranged"
            ),

        auto:
            document.getElementById(
                "auto"
            ),

        second:
            document.getElementById(
                "second"
            ),

        nextBoss:
            document.getElementById(
                "nextBoss"
            ),

        relicList:
            document.getElementById(
                "relicList"
            ),

        bossPanel:
            document.getElementById(
                "bossPanel"
            ),

        bossName:
            document.getElementById(
                "bossName"
            ),

        bossBar:
            document.getElementById(
                "bossBar"
            ),

        bossHp:
            document.getElementById(
                "bossHp"
            ),

        toast:
            document.getElementById(
                "toast"
            ),

        btnHp:
            document.getElementById(
                "btnHp"
            ),

        btnDamage:
            document.getElementById(
                "btnDamage"
            ),

        btnAutoSpeed:
            document.getElementById(
                "btnAutoSpeed"
            ),

        btnAutoPower:
            document.getElementById(
                "btnAutoPower"
            )

    };


    // =====================================================
    // MOUSE
    // =====================================================

    const pointer = {

        x:
            W / 2,

        y:
            H / 2

    };


    addEventListener(
        "pointermove",
        event => {

            pointer.x =
                event.clientX;

            pointer.y =
                event.clientY;

        }
    );


    // =====================================================
    // FUNÇÕES ÚTEIS
    // =====================================================

    const clamp =
        (
            value,
            min,
            max
        ) =>

            Math.max(
                min,
                Math.min(
                    max,
                    value
                )
            );


    const rand =
        (
            min,
            max
        ) =>

            Math.random() *
            (max - min) +
            min;


    function distance(
        a,
        b
    ) {

        return Math.hypot(

            a.x - b.x,

            a.y - b.y

        );

    }


    // =====================================================
    // FORMATAÇÃO DE NÚMEROS GRANDES
    // =====================================================

    function fmt(
        value
    ) {

        if (
            typeof value ===
            "bigint"
        ) {

            const negative =
                value < 0n;


            const number =

                negative

                    ? -value

                    : value;


            const text =
                number.toString();


            if (
                text.length <= 15
            ) {

                const formatted =

                    Number(text)
                        .toLocaleString(
                            "pt-BR"
                        );


                return (

                    negative

                        ? "-"

                        : ""

                ) + formatted;

            }


            const mantissa =

                text[0] +
                "," +
                text.slice(
                    1,
                    4
                );


            return (

                negative

                    ? "-"

                    : ""

            ) +

            mantissa +

            "e" +

            (
                text.length -
                1
            );

        }


        return Math.floor(
            value
        ).toLocaleString(
            "pt-BR"
        );

    }


    function percentBig(
        current,
        max
    ) {

        if (
            max <= 0n ||
            current <= 0n
        ) {

            return 0;
        }


        if (
            current >= max
        ) {

            return 100;
        }


        return Number(

            current *
            10000n /
            max

        ) / 100;

    }


    // =====================================================
    // CONFIGURAÇÕES
    // =====================================================

    const SAVE_KEY =
        "spider_evolution_clean_v1";


    const BOSS_INTERVAL =
        200;


    const RANGED_LEVEL =
        100;


    const BASE_MOB_COUNT =
        12;


    const MELEE_RANGE =
        92;


    const RANGED_RANGE =
        900;


    const AUTO_START_MS =
        650;


    const AUTO_MIN_MS =
        70;


    // =====================================================
    // ESTADO DO JOGO
    // =====================================================

    const game = {

        level:
            1,

        xp:
            0,

        xpNeed:
            1,

        points:
            0,

        kills:
            0,


        cycle:
            1,


        goalLevel:
            1000000,


        baseHp:
            200n,

        baseDamage:
            1n,


        maxHp:
            200n,

        damage:
            1n,


        rangedUnlocked:
            false,


        autoUnlocked:
            false,


        autoInterval:
            AUTO_START_MS,


        autoPower:
            100,


        lastAuto:
            0,


        bossesDefeated:
            0,


        boss:
            null,


        secondSpiderPermanent:
            false,


        celestial:
            false,


        maxMobTier:
            1,


        cycleDifficulty:
            1,


        cycleXpBoost:
            1,


        relics: {

            heart:
                0,

            fang:
                0,

            clock:
                0,

            core:
                0

        }

    };


    // =====================================================
    // XP PARA SUBIR DE NÍVEL
    // =====================================================

    function xpNeeded(
        level
    ) {

        if (
            level <= 1
        ) {

            return 1;
        }


        /*
        1 XP
        10 XP
        20 XP
        30 XP
        40 XP...
        */

        return (
            level -
            1
        ) * 10;

    }


    // =====================================================
    // MULTIPLICADOR DOS BOSSES
    // =====================================================

    function bossMultiplier() {

        return (

            2n **

            BigInt(
                game.bossesDefeated
            )

        );

    }


    // =====================================================
    // RECALCULAR ESTATÍSTICAS
    // =====================================================

    function recalcStats() {

        const power =
            bossMultiplier();


        /*
        RELÍQUIAS
        */

        const hpBonus =

            10000n +

            BigInt(
                game.relics.heart
            ) *

            500n;


        const damageBonus =

            10000n +

            BigInt(
                game.relics.fang
            ) *

            500n;


        game.maxHp =

            game.baseHp *

            power *

            hpBonus /

            10000n;


        game.damage =

            game.baseDamage *

            power *

            damageBonus /

            10000n;


        if (
            game.maxHp < 1n
        ) {

            game.maxHp =
                1n;

        }


        if (
            game.damage < 1n
        ) {

            game.damage =
                1n;

        }


        for (
            const spider
            of spiders
        ) {

            spider.maxHp =
                game.maxHp;


            if (
                spider.hp >
                spider.maxHp
            ) {

                spider.hp =
                    spider.maxHp;

            }

        }

    }


    // =====================================================
    // NOTIFICAÇÃO
    // =====================================================

    function toast(
        message
    ) {

        ui.toast.textContent =
            message;


        ui.toast.classList.add(
            "show"
        );


        clearTimeout(
            toast.timer
        );


        toast.timer =
            setTimeout(
                () => {

                    ui.toast
                        .classList
                        .remove(
                            "show"
                        );

                },
                1500
            );

    }


    // =====================================================
    // TEXTOS DE DANO
    // =====================================================

    const floats = [];


    function floatText(
        x,
        y,
        text,
        color = "#fff"
    ) {

        floats.push({

            x,

            y,

            text,

            color,

            life:
                45

        });

    }


    function drawFloats() {

        for (
            let i =
                floats.length - 1;

            i >= 0;

            i--
        ) {

            const item =
                floats[i];


            item.y -=
                0.55;


            item.life--;


            ctx.globalAlpha =

                clamp(

                    item.life /
                    45,

                    0,

                    1

                );


            ctx.fillStyle =
                item.color;


            ctx.font =
                "700 12px Arial";


            ctx.textAlign =
                "center";


            ctx.fillText(

                item.text,

                item.x,

                item.y

            );


            ctx.globalAlpha =
                1;


            if (
                item.life <= 0
            ) {

                floats.splice(
                    i,
                    1
                );

            }

        }

    }


    // =====================================================
    // CENÁRIO
    // =====================================================

    const stars =

        Array.from(

            {
                length:
                    120
            },

            () => ({

                x:
                    Math.random(),

                y:
                    Math.random(),

                size:
                    rand(
                        0.3,
                        1.6
                    ),

                alpha:
                    rand(
                        0.12,
                        0.55
                    )

            })

        );


    const dust =

        Array.from(

            {
                length:
                    35
            },

            () => ({

                x:
                    Math.random(),

                y:
                    Math.random(),

                radius:
                    rand(
                        15,
                        60
                    ),

                speed:
                    rand(
                        0.00001,
                        0.00005
                    )

            })

        );


    function drawBackground(
        time
    ) {

        /*
        FUNDO
        */

        const gradient =

            ctx.createRadialGradient(

                W / 2,
                H / 2,
                20,

                W / 2,
                H / 2,

                Math.max(
                    W,
                    H
                ) * 0.75

            );


        gradient.addColorStop(
            0,
            "#131c31"
        );


        gradient.addColorStop(
            0.5,
            "#080d18"
        );


        gradient.addColorStop(
            1,
            "#020307"
        );


        ctx.fillStyle =
            gradient;


        ctx.fillRect(

            0,
            0,

            W,
            H

        );


        /*
        ESTRELAS
        */

        for (
            const star
            of stars
        ) {

            ctx.globalAlpha =
                star.alpha;


            ctx.fillStyle =
                "#c8dcff";


            ctx.beginPath();


            ctx.arc(

                star.x * W,

                star.y * H,

                star.size,

                0,

                Math.PI * 2

            );


            ctx.fill();

        }


        ctx.globalAlpha =
            1;


        /*
        TEIA GIGANTE
        */

        ctx.save();


        ctx.translate(

            W / 2,

            H / 2

        );


        ctx.strokeStyle =
            "rgba(110,150,220,.075)";


        ctx.lineWidth =
            1;


        const maxRadius =
            Math.max(
                W,
                H
            );


        for (
            let i = 0;

            i < 16;

            i++
        ) {

            const angle =

                i /
                16 *

                Math.PI *
                2;


            ctx.beginPath();


            ctx.moveTo(
                0,
                0
            );


            ctx.lineTo(

                Math.cos(
                    angle
                ) *

                maxRadius,

                Math.sin(
                    angle
                ) *

                maxRadius

            );


            ctx.stroke();

        }


        for (
            let radius = 70;

            radius <
                maxRadius;

            radius += 70
        ) {

            ctx.beginPath();


            ctx.arc(

                0,
                0,

                radius,

                0,

                Math.PI * 2

            );


            ctx.stroke();

        }


        ctx.restore();


        /*
        NÉVOA
        */

        for (
            const particle
            of dust
        ) {

            const x =

                (
                    (
                        particle.x +

                        time *
                        particle.speed

                    ) % 1

                ) * W;


            const y =
                particle.y *
                H;


            const fog =

                ctx.createRadialGradient(

                    x,
                    y,
                    0,

                    x,
                    y,

                    particle.radius

                );


            fog.addColorStop(

                0,

                "rgba(65,90,160,.03)"

            );


            fog.addColorStop(

                1,

                "rgba(0,0,0,0)"

            );


            ctx.fillStyle =
                fog;


            ctx.beginPath();


            ctx.arc(

                x,
                y,

                particle.radius,

                0,

                Math.PI * 2

            );


            ctx.fill();

        }

    }


    // =====================================================
    // ARANHA
    // =====================================================

    class Spider {

        constructor(
            id,
            x,
            y
        ) {

            this.id =
                id;


            this.x =
                x;

            this.y =
                y;


            this.targetX =
                x;

            this.targetY =
                y;


            this.angle =
                0;


            this.leg =
                rand(
                    0,
                    100
                );


            this.size =
                18;


            this.maxHp =
                game.maxHp;


            this.hp =
                this.maxHp;


            this.dead =
                false;


            this.target =
                null;


            this.flash =
                0;

        }


        form() {

            if (
                game.celestial
            ) {

                return "celestial";
            }


            if (
                game.bossesDefeated >=
                1
            ) {

                return "royal";
            }


            return "normal";

        }


        color() {

            const form =
                this.form();


            /*
            ARANHA CELESTIAL
            */

            if (
                form ===
                "celestial"
            ) {

                const hue =

                    (
                        performance.now() /
                        14 +

                        this.id *
                        70

                    ) % 360;


                return `hsl(${hue},100%,62%)`;

            }


            /*
            ARANHA REAL
            */

            if (
                form ===
                "royal"
            ) {

                return "#ff2b45";

            }


            /*
            FORMA NORMAL
            TAMBÉM MUDA DEVAGAR
            CONFORME EVOLUI
            */

            const progress =

                Math.min(

                    1,

                    game.level /

                    Math.max(
                        1,
                        game.goalLevel
                    )

                );


            const hue =

                205 +

                progress *
                130;


            return `hsl(${hue},85%,68%)`;

        }


        follow(
            x,
            y
        ) {

            this.targetX =
                x;

            this.targetY =
                y;

        }


        heal() {

            this.dead =
                false;


            this.maxHp =
                game.maxHp;


            this.hp =
                this.maxHp;

        }


        takeDamage(
            amount
        ) {

            if (
                this.dead
            ) {

                return;
            }


            this.hp -=
                amount;


            this.flash =
                7;


            floatText(

                this.x,

                this.y - 28,

                "-" +
                fmt(
                    amount
                ),

                "#ff6578"

            );


            if (
                this.hp <= 0n
            ) {

                this.hp =
                    0n;


                this.dead =
                    true;


                this.target =
                    null;

            }


            updateHUD();

        }


        update() {

            if (
                this.dead
            ) {

                return;
            }


            const dx =
                this.targetX -
                this.x;


            const dy =
                this.targetY -
                this.y;


            this.x +=

                dx *
                0.055;


            this.y +=

                dy *
                0.055;


            if (
                Math.abs(dx) +
                Math.abs(dy) >
                1
            ) {

                this.angle =
                    Math.atan2(
                        dy,
                        dx
                    );

            }


            this.leg +=
                0.19;


            if (
                this.flash > 0
            ) {

                this.flash--;

            }

        }


        draw() {

            if (
                this.dead
            ) {

                return;
            }


            const color =

                this.flash > 0

                    ? "#ffffff"

                    : this.color();


            ctx.save();


            ctx.shadowColor =
                color;


            ctx.shadowBlur =

                this.form() ===
                "celestial"

                    ? 22

                    : 10;


            ctx.strokeStyle =
                color;


            ctx.lineWidth =
                1.7;


            ctx.lineCap =
                "round";


            /*
            8 PERNAS
            */

            for (
                let side = -1;

                side <= 1;

                side += 2
            ) {

                for (
                    let i = 0;

                    i < 4;

                    i++
                ) {

                    const angle =

                        this.angle +

                        side *

                        (
                            0.45 +
                            i * 0.28
                        );


                    const movement =

                        Math.sin(

                            this.leg +

                            i *
                            0.9

                        ) * 0.22;


                    const middleX =

                        this.x +

                        Math.cos(
                            angle
                        ) *

                        this.size *
                        0.85;


                    const middleY =

                        this.y +

                        Math.sin(
                            angle
                        ) *

                        this.size *
                        0.85;


                    const endAngle =

                        angle +

                        side *

                        (
                            0.68 +
                            movement
                        );


                    const endX =

                        middleX +

                        Math.cos(
                            endAngle
                        ) *

                        this.size *
                        1.05;


                    const endY =

                        middleY +

                        Math.sin(
                            endAngle
                        ) *

                        this.size *
                        1.05;


                    ctx.beginPath();


                    ctx.moveTo(

                        this.x,

                        this.y

                    );


                    ctx.lineTo(

                        middleX,

                        middleY

                    );


                    ctx.lineTo(

                        endX,

                        endY

                    );


                    ctx.stroke();

                }

            }


            /*
            CORPO
            */

            ctx.translate(

                this.x,

                this.y

            );


            ctx.rotate(
                this.angle
            );


            ctx.fillStyle =
                color;


            ctx.beginPath();


            ctx.ellipse(

                -5,
                0,

                12,
                15,

                0,

                0,

                Math.PI * 2

            );


            ctx.fill();


            /*
            CABEÇA
            */

            ctx.beginPath();


            ctx.arc(

                9,
                0,

                7.5,

                0,

                Math.PI * 2

            );


            ctx.fill();


            /*
            OLHOS
            */

            ctx.shadowBlur =
                0;


            ctx.fillStyle =
                "#09101c";


            ctx.beginPath();


            ctx.arc(

                11,
                -2.7,

                1.5,

                0,

                Math.PI * 2

            );


            ctx.fill();


            ctx.beginPath();


            ctx.arc(

                11,
                2.7,

                1.5,

                0,

                Math.PI * 2

            );


            ctx.fill();


            /*
            COROA
            */

            if (
                this.form() !==
                "normal"
            ) {

                drawCrown(

                    ctx,

                    8,

                    -15

                );

            }


            ctx.restore();

        }


        tick() {

            this.update();

            this.draw();

        }

    }


    // =====================================================
    // COROA
    // =====================================================

    function drawCrown(
        canvasContext,
        x,
        y
    ) {

        canvasContext.save();


        canvasContext.translate(
            x,
            y
        );


        canvasContext.fillStyle =
            "#ffd84a";


        canvasContext.shadowColor =
            "#ffd84a";


        canvasContext.shadowBlur =
            8;


        canvasContext.beginPath();


        canvasContext.moveTo(
            -10,
            6
        );


        canvasContext.lineTo(
            -9,
            -7
        );


        canvasContext.lineTo(
            -3,
            0
        );


        canvasContext.lineTo(
            0,
            -12
        );


        canvasContext.lineTo(
            4,
            0
        );


        canvasContext.lineTo(
            10,
            -7
        );


        canvasContext.lineTo(
            10,
            6
        );


        canvasContext.closePath();


        canvasContext.fill();


        canvasContext.restore();

    }


    // =====================================================
    // CRIAR PRIMEIRA ARANHA
    // =====================================================

    let spiders = [

        new Spider(

            1,

            W / 2,

            H / 2

        )

    ];


    // =====================================================
    // SEGUNDA ARANHA
    // =====================================================

    function ensureSecondSpider() {

        if (
            game.secondSpiderPermanent &&
            spiders.length < 2
        ) {

            spiders.push(

                new Spider(

                    2,

                    W / 2 + 48,

                    H / 2

                )

            );

        }

    }


    // =====================================================
    // FORÇA DO MUNDO
    // =====================================================

    function worldPower() {

        const stage =

            Math.floor(

                Math.max(

                    0,

                    game.level -
                    1

                ) /

                BOSS_INTERVAL

            );


        return (

            2n **

            BigInt(
                stage
            )

        );

    }


    function cycleDifficultyInt() {

        return BigInt(

            Math.max(

                1,

                Math.ceil(
                    game.cycleDifficulty
                )

            )

        );

    }


    // =====================================================
    // XP DOS MOBS
    // =====================================================

    function mobXp(
        tier
    ) {

        if (
            tier <= 1
        ) {

            return 1;
        }


        const relative =

            clamp(

                tier /

                Math.max(
                    1,
                    game.maxMobTier
                ),

                0,

                1

            );


        return Math.max(

            1,

            Math.floor(

                game.xpNeed *

                (
                    0.025 +

                    relative *
                    0.12
                )

            )

        );

    }


    // =====================================================
    // MOB
    // =====================================================

    class Mob {

        constructor(
            tier = 1
        ) {

            this.isBoss =
                false;


            this.dead =
                false;


            this.tier =
                tier;


            this.spawn();

        }


        spawn() {

            this.dead =
                false;


            this.x =

                rand(

                    45,

                    Math.max(
                        46,
                        W - 45
                    )

                );


            this.y =

                rand(

                    75,

                    Math.max(
                        76,
                        H - 45
                    )

                );


            this.angle =

                rand(

                    0,

                    Math.PI * 2

                );


            this.turn =

                rand(
                    55,
                    170
                );


            this.radius =

                clamp(

                    12 +

                    Math.log2(
                        this.tier + 1
                    ) *

                    2.2,

                    12,

                    31

                );


            this.speed =

                clamp(

                    0.4 +

                    Math.log2(
                        this.tier + 1
                    ) *

                    0.11,

                    0.4,

                    2.4

                );


            /*
            MOB INICIAL:
            5 HP
            */

            const baseHp =

                BigInt(

                    Math.max(

                        5,

                        Math.floor(

                            3 +

                            this.tier *
                            2

                        )

                    )

                );


            this.maxHp =

                baseHp *

                worldPower() *

                cycleDifficultyInt();


            this.hp =
                this.maxHp;


            this.xpReward =
                mobXp(
                    this.tier
                );


            this.color =
                this.getColor();

        }


        getColor() {

            const hue =

                (
                    205 +

                    Math.log2(
                        this.tier + 1
                    ) *

                    55

                ) % 360;


            const light =

                clamp(

                    68 -

                    Math.log2(
                        this.tier + 1
                    ) *

                    3.5,

                    36,

                    68

                );


            return `hsl(${hue},82%,${light}%)`;

        }


        update() {

            if (
                this.dead
            ) {

                return;
            }


            this.turn--;


            if (
                this.turn <= 0
            ) {

                this.angle =

                    rand(

                        0,

                        Math.PI * 2

                    );


                this.turn =

                    rand(
                        55,
                        170
                    );

            }


            this.x +=

                Math.cos(
                    this.angle
                ) *

                this.speed;


            this.y +=

                Math.sin(
                    this.angle
                ) *

                this.speed;


            /*
            BORDAS
            */

            if (
                this.x <
                    this.radius ||

                this.x >
                    W -
                    this.radius
            ) {

                this.angle =

                    Math.PI -
                    this.angle;


                this.x =

                    clamp(

                        this.x,

                        this.radius,

                        W -
                        this.radius

                    );

            }


            if (
                this.y < 60 ||

                this.y >
                    H -
                    this.radius
            ) {

                this.angle =
                    -this.angle;


                this.y =

                    clamp(

                        this.y,

                        60,

                        H -
                        this.radius

                    );

            }

        }


        takeDamage(
            amount
        ) {

            if (
                this.dead
            ) {

                return;
            }


            this.hp -=
                amount;


            floatText(

                this.x,

                this.y,

                "-" +
                fmt(
                    amount
                )

            );


            if (
                this.hp <= 0n
            ) {

                this.die();

            }

        }


        die() {

            if (
                this.dead
            ) {

                return;
            }


            this.dead =
                true;


            game.kills++;


            /*
            XP
            */

            gainXp(
                this.xpReward
            );


            /*
            RELÍQUIA
            */

            rollRelic(
                this
            );


            /*
            CADA MORTE AUMENTA
            O TETO DOS MOBS
            */

            game.maxMobTier =

                Math.max(

                    game.maxMobTier,

                    1 +
                    game.kills,

                    1 +
                    Math.floor(
                        game.level / 12
                    )

                );


            /*
            NOVO MOB
            */

            setTimeout(
                () => {

                    this.tier =
                        chooseMobTier();


                    this.spawn();

                },

                240
            );

        }


        draw() {

            if (
                this.dead
            ) {

                return;
            }


            const pulse =

                Math.sin(

                    performance.now() /
                    260 +

                    this.tier

                ) * 1.3;


            const radius =

                this.radius +
                pulse;


            ctx.save();


            /*
            BRILHO
            */

            ctx.shadowColor =
                this.color;


            ctx.shadowBlur =
                12;


            ctx.fillStyle =
                this.color;


            ctx.beginPath();


            ctx.arc(

                this.x,

                this.y,

                radius,

                0,

                Math.PI * 2

            );


            ctx.fill();


            /*
            MOBS FORTES
            GANHAM ESPINHOS
            */

            const strong =

                this.tier >=

                Math.max(

                    5,

                    game.maxMobTier *
                    0.45

                );


            if (
                strong
            ) {

                ctx.strokeStyle =
                    this.color;


                ctx.lineWidth =
                    2;


                for (
                    let i = 0;

                    i < 8;

                    i++
                ) {

                    const angle =

                        i /
                        8 *

                        Math.PI *
                        2;


                    ctx.beginPath();


                    ctx.moveTo(

                        this.x +

                        Math.cos(
                            angle
                        ) *

                        radius *
                        0.9,


                        this.y +

                        Math.sin(
                            angle
                        ) *

                        radius *
                        0.9

                    );


                    ctx.lineTo(

                        this.x +

                        Math.cos(
                            angle
                        ) *

                        radius *
                        1.35,


                        this.y +

                        Math.sin(
                            angle
                        ) *

                        radius *
                        1.35

                    );


                    ctx.stroke();

                }

            }


            ctx.shadowBlur =
                0;


            /*
            OLHOS
            */

            ctx.fillStyle =
                "#ffffff";


            ctx.beginPath();


            ctx.arc(

                this.x -
                radius *
                0.3,

                this.y - 3,

                3,

                0,

                Math.PI * 2

            );


            ctx.fill();


            ctx.beginPath();


            ctx.arc(

                this.x +
                radius *
                0.3,

                this.y - 3,

                3,

                0,

                Math.PI * 2

            );


            ctx.fill();


            ctx.fillStyle =
                "#07101b";


            ctx.beginPath();


            ctx.arc(

                this.x -
                radius *
                0.3,

                this.y - 3,

                1.3,

                0,

                Math.PI * 2

            );


            ctx.fill();


            ctx.beginPath();


            ctx.arc(

                this.x +
                radius *
                0.3,

                this.y - 3,

                1.3,

                0,

                Math.PI * 2

            );


            ctx.fill();


            /*
            VIDA
            */

            const hpPercent =

                percentBig(

                    this.hp,

                    this.maxHp

                ) / 100;


            const barWidth =
                40;


            ctx.fillStyle =
                "rgba(0,0,0,.65)";


            ctx.fillRect(

                this.x -
                barWidth / 2,

                this.y -
                radius -
                12,

                barWidth,

                4

            );


            ctx.fillStyle =
                this.color;


            ctx.fillRect(

                this.x -
                barWidth / 2,

                this.y -
                radius -
                12,

                barWidth *
                hpPercent,

                4

            );


            /*
            TIER
            */

            ctx.fillStyle =
                "#cfd9ef";


            ctx.font =
                "700 9px Arial";


            ctx.textAlign =
                "center";


            ctx.fillText(

                "T" +
                fmt(
                    this.tier
                ),

                this.x,

                this.y +
                radius +
                15

            );


            ctx.restore();

        }


        tick() {

            this.update();

            this.draw();

        }

    }


    // =====================================================
    // ESCOLHER TIER
    // =====================================================

    function chooseMobTier() {

        const strongest =

            Math.max(

                1,

                game.maxMobTier

            );


        const chance =
            Math.random();


        /*
        30% DOS MOBS
        CONTINUAM FRACOS
        */

        if (
            chance < 0.30
        ) {

            return Math.max(

                1,

                Math.floor(

                    rand(

                        1,

                        Math.min(
                            10,
                            strongest
                        ) +

                        1

                    )

                )

            );

        }


        /*
        42% MÉDIOS
        */

        if (
            chance < 0.72
        ) {

            return Math.max(

                1,

                Math.floor(

                    rand(

                        Math.max(

                            1,

                            strongest *
                            0.15

                        ),

                        Math.max(

                            2,

                            strongest *
                            0.60

                        )

                    )

                )

            );

        }


        /*
        28% FORTES
        */

        return Math.max(

            1,

            Math.floor(

                rand(

                    Math.max(

                        1,

                        strongest *
                        0.60

                    ),

                    strongest +
                    1

                )

            )

        );

    }


    // =====================================================
    // MOBS INICIAIS
    // =====================================================

    const mobs =

        Array.from(

            {
                length:
                    BASE_MOB_COUNT
            },

            () =>
                new Mob(1)

        );


    // =====================================================
    // RELÍQUIAS
    // =====================================================

    const relicDefinitions = [

        {
            key:
                "heart",

            name:
                "Coração Antigo",

            effect:
                "+5% vida"
        },

        {
            key:
                "fang",

            name:
                "Presa Ancestral",

            effect:
                "+5% dano"
        },

        {
            key:
                "clock",

            name:
                "Ampulheta",

            effect:
                "+2% velocidade automática"
        },

        {
            key:
                "core",

            name:
                "Núcleo",

            effect:
                "+5% força automática"
        }

    ];


    function relicChance(
        mob
    ) {

        const relative =

            clamp(

                mob.tier /

                Math.max(

                    1,

                    game.maxMobTier

                ),

                0,

                1

            );


        /*
        MOB FRACO:
        1%

        MOB MUITO FORTE:
        ATÉ 20%
        */

        return clamp(

            0.01 +

            relative *
            0.19,

            0.01,

            0.20

        );

    }


    function rollRelic(
        mob
    ) {

        if (
            Math.random() >
            relicChance(mob)
        ) {

            return;
        }


        let available =
            relicDefinitions;


        /*
        ANTES DO AUTO,
        NÃO PODE PEGAR
        RELÍQUIAS DE AUTO
        */

        if (
            !game.autoUnlocked
        ) {

            available =

                relicDefinitions.filter(

                    relic =>

                        relic.key ===
                            "heart" ||

                        relic.key ===
                            "fang"

                );

        }


        const relic =

            available[

                Math.floor(

                    Math.random() *

                    available.length

                )

            ];


        game.relics[
            relic.key
        ]++;


        /*
        AMPULHETA
        */

        if (
            relic.key ===
            "clock"
        ) {

            game.autoInterval =

                Math.max(

                    AUTO_MIN_MS,

                    Math.floor(

                        game.autoInterval *
                        0.98

                    )

                );

        }


        /*
        NÚCLEO
        */

        if (
            relic.key ===
            "core"
        ) {

            game.autoPower +=
                5;

        }


        recalcStats();


        toast(

            "🧿 " +
            relic.name +
            " — " +
            relic.effect

        );


        updateHUD();

    }


    // =====================================================
    // PRÓXIMO BOSS
    // =====================================================

    function nextBossLevel() {

        return (

            game.bossesDefeated +
            1

        ) *

        BOSS_INTERVAL;

    }


    // =====================================================
    // BOSS
    // =====================================================

    class Boss {

        constructor(
            index,
            finalBoss = false
        ) {

            this.isBoss =
                true;


            this.index =
                index;


            this.finalBoss =
                finalBoss;


            this.dead =
                false;


            this.x =
                W / 2;


            this.y =
                125;


            this.radius =

                clamp(

                    58 +

                    Math.log2(
                        index + 1
                    ) *

                    5,

                    58,

                    105

                );


            this.speed =

                clamp(

                    0.75 +

                    Math.log2(
                        index + 1
                    ) *

                    0.05,

                    0.75,

                    2

                );


            this.lastHit =
                0;


            this.cooldown =

                Math.max(

                    280,

                    900 -

                    Math.log2(
                        index + 1
                    ) *

                    45

                );


            /*
            BOSS 1
            10.000 HP
            10 DANO

            BOSS 2
            20.000 HP
            20 DANO

            BOSS 3
            40.000 HP
            40 DANO

            ETC...
            */

            const factor =

                2n **

                BigInt(
                    index -
                    1
                );


            this.maxHp =

                10000n *

                factor *

                cycleDifficultyInt();


            this.hp =
                this.maxHp;


            this.damage =

                10n *

                factor *

                cycleDifficultyInt();


            this.name =

                finalBoss

                    ? "BOSS FINAL"

                    : "BOSS " +
                      index;

        }


        targetSpider() {

            const alive =

                spiders.filter(

                    spider =>

                        !spider.dead

                );


            if (
                alive.length === 0
            ) {

                return null;
            }


            let best =
                alive[0];


            let bestDistance =

                distance(

                    this,

                    best

                );


            for (
                let i = 1;

                i <
                alive.length;

                i++
            ) {

                const current =

                    distance(

                        this,

                        alive[i]

                    );


                if (
                    current <
                    bestDistance
                ) {

                    best =
                        alive[i];


                    bestDistance =
                        current;

                }

            }


            return best;

        }


        update() {

            if (
                this.dead
            ) {

                return;
            }


            const spider =
                this.targetSpider();


            if (
                !spider
            ) {

                return;
            }


            const dx =
                spider.x -
                this.x;


            const dy =
                spider.y -
                this.y;


            const distanceToSpider =

                Math.hypot(

                    dx,

                    dy

                ) || 1;


            const attackRange =

                this.radius +
                42;


            /*
            PERSEGUIR
            */

            if (
                distanceToSpider >
                attackRange
            ) {

                this.x +=

                    dx /

                    distanceToSpider *

                    this.speed;


                this.y +=

                    dy /

                    distanceToSpider *

                    this.speed;

            }


            /*
            ATACAR
            */

            else {

                const now =
                    performance.now();


                if (
                    now -
                    this.lastHit >=
                    this.cooldown
                ) {

                    spider.takeDamage(
                        this.damage
                    );


                    this.lastHit =
                        now;

                }

            }

        }


        takeDamage(
            amount
        ) {

            if (
                this.dead
            ) {

                return;
            }


            this.hp -=
                amount;


            floatText(

                this.x,

                this.y -
                this.radius -
                12,

                "-" +
                fmt(
                    amount
                ),

                "#ffd34f"

            );


            if (
                this.hp <= 0n
            ) {

                this.hp =
                    0n;


                this.die();

            }

        }


        die() {

            if (
                this.dead
            ) {

                return;
            }


            this.dead =
                true;


            const index =
                this.index;


            const finalBoss =
                this.finalBoss;


            game.boss =
                null;


            game.bossesDefeated++;


            /*
            BOSS 1:
            ATAQUE AUTOMÁTICO
            */

            if (
                index === 1
            ) {

                game.autoUnlocked =
                    true;


                toast(
                    "⚡ Ataque automático liberado!"
                );

            }


            /*
            BOSS 2:
            ARANHA CELESTIAL
            */

            if (
                index >= 2
            ) {

                game.celestial =
                    true;

            }


            /*
            BOSS 3:
            SEGUNDA ARANHA
            */

            if (
                index === 3 &&
                !game.secondSpiderPermanent
            ) {

                game.secondSpiderPermanent =
                    true;


                ensureSecondSpider();


                toast(
                    "🕷️ Segunda aranha liberada para sempre!"
                );

            }


            /*
            CADA BOSS DOBRA
            O PODER BASE
            */

            recalcStats();


            spiders.forEach(

                spider =>

                    spider.heal()

            );


            /*
            FINAL
            */

            if (
                finalBoss
            ) {

                newCycle();

            }

            else {

                updateHUD();

                saveGame();

            }

        }


        draw() {

            if (
                this.dead
            ) {

                return;
            }


            const time =
                performance.now();


            let hue;


            if (
                this.finalBoss
            ) {

                hue =

                    (
                        time /
                        12
                    ) % 360;

            }

            else {

                hue =

                    (
                        this.index *
                        51
                    ) % 360;

            }


            const pulse =

                Math.sin(

                    time /
                    160

                ) * 4;


            const radius =

                this.radius +
                pulse;


            ctx.save();


            /*
            AURA
            */

            const aura =

                ctx.createRadialGradient(

                    this.x,
                    this.y,
                    radius *
                    0.4,

                    this.x,
                    this.y,
                    radius *
                    2.1

                );


            aura.addColorStop(

                0,

                `hsla(${hue},100%,55%,.38)`

            );


            aura.addColorStop(

                1,

                "rgba(0,0,0,0)"

            );


            ctx.fillStyle =
                aura;


            ctx.beginPath();


            ctx.arc(

                this.x,

                this.y,

                radius *
                2.1,

                0,

                Math.PI * 2

            );


            ctx.fill();


            /*
            ANEL GIRATÓRIO
            */

            ctx.translate(

                this.x,

                this.y

            );


            ctx.rotate(
                time / 1800
            );


            ctx.setLineDash([
                12,
                9
            ]);


            ctx.strokeStyle =

                `hsla(${hue},100%,70%,.7)`;


            ctx.lineWidth =
                2.5;


            ctx.beginPath();


            ctx.arc(

                0,
                0,

                radius +
                23,

                0,

                Math.PI * 2

            );


            ctx.stroke();


            ctx.setLineDash([]);


            ctx.rotate(
                -time / 1800
            );


            /*
            CORPO
            */

            ctx.shadowColor =

                `hsl(${hue},100%,55%)`;


            ctx.shadowBlur =
                20;


            ctx.fillStyle =

                `hsl(${hue},78%,34%)`;


            ctx.beginPath();


            ctx.arc(

                0,
                0,

                radius,

                0,

                Math.PI * 2

            );


            ctx.fill();


            ctx.shadowBlur =
                0;


            /*
            OLHOS
            */

            ctx.fillStyle =
                "#f6fbff";


            ctx.beginPath();


            ctx.ellipse(

                -radius *
                0.28,

                -8,

                11,
                7,

                0,

                0,

                Math.PI * 2

            );


            ctx.fill();


            ctx.beginPath();


            ctx.ellipse(

                radius *
                0.28,

                -8,

                11,
                7,

                0,

                0,

                Math.PI * 2

            );


            ctx.fill();


            ctx.fillStyle =
                "#05080f";


            ctx.beginPath();


            ctx.arc(

                -radius *
                0.28,

                -8,

                3.5,

                0,

                Math.PI * 2

            );


            ctx.fill();


            ctx.beginPath();


            ctx.arc(

                radius *
                0.28,

                -8,

                3.5,

                0,

                Math.PI * 2

            );


            ctx.fill();


            ctx.restore();


            /*
            NOME
            */

            ctx.fillStyle =
                "#ffffff";


            ctx.font =
                "800 14px Arial";


            ctx.textAlign =
                "center";


            ctx.fillText(

                this.name,

                this.x,

                this.y -
                radius -
                35

            );

        }


        tick() {

            this.update();

            this.draw();

        }

    }


    // =====================================================
    // CHECAR BOSS
    // =====================================================

    function checkBossSpawn() {

        if (
            game.boss
        ) {

            return;
        }


        /*
        BOSS FINAL
        */

        if (
            game.level >=
            game.goalLevel
        ) {

            spawnBoss(
                true
            );

            return;

        }


        /*
        BOSS A CADA
        200 NÍVEIS
        */

        if (
            game.level >=
            nextBossLevel()
        ) {

            spawnBoss(
                false
            );

        }

    }


    // =====================================================
    // CRIAR BOSS
    // =====================================================

    function spawnBoss(
        finalBoss
    ) {

        if (
            game.boss
        ) {

            return;
        }


        let index;


        if (
            finalBoss
        ) {

            index =

                Math.max(

                    1,

                    Math.floor(

                        game.goalLevel /

                        BOSS_INTERVAL

                    )

                );

        }

        else {

            index =

                game.bossesDefeated +
                1;

        }


        game.boss =

            new Boss(

                index,

                finalBoss

            );


        toast(

            finalBoss

                ? "☠️ BOSS FINAL!"

                : "👑 Boss " +
                  index +
                  " apareceu!"

        );


        updateHUD();

    }


    // =====================================================
    // LEVEL UP
    // =====================================================

    function levelUp() {

        if (
            game.level >=
            game.goalLevel
        ) {

            return;
        }


        game.level++;


        /*
        +3 PONTOS
        */

        game.points +=
            3;


        /*
        +1 DANO BASE
        */

        game.baseDamage +=
            1n;


        game.xpNeed =

            xpNeeded(
                game.level
            );


        /*
        MOBS MAIS FORTES
        */

        game.maxMobTier =

            Math.max(

                game.maxMobTier,

                1 +

                Math.floor(

                    game.level /
                    12

                )

            );


        /*
        DISTÂNCIA
        */

        if (
            game.level >=
            RANGED_LEVEL
        ) {

            game.rangedUnlocked =
                true;

        }


        recalcStats();


        checkBossSpawn();

    }


    // =====================================================
    // GANHAR XP
    // =====================================================

    function gainXp(
        amount
    ) {

        const gained =

            Math.max(

                1,

                Math.floor(

                    amount *

                    game.cycleXpBoost

                )

            );


        game.xp +=
            gained;


        /*
        SUBIR VÁRIOS NÍVEIS
        SE POSSÍVEL
        */

        let safety =
            0;


        while (

            game.xp >=
                game.xpNeed &&

            game.level <
                game.goalLevel &&

            safety <
                10000

        ) {

            game.xp -=
                game.xpNeed;


            levelUp();


            safety++;

        }


        checkBossSpawn();


        updateHUD();

    }


    // =====================================================
    // MELHORIAS
    // =====================================================

    function spend(
        type
    ) {

        if (
            game.points <= 0
        ) {

            return;
        }


        /*
        VIDA
        */

        if (
            type ===
            "hp"
        ) {

            game.baseHp +=
                10n;


            game.points--;

        }


        /*
        DANO
        */

        else if (
            type ===
            "damage"
        ) {

            game.baseDamage +=
                1n;


            game.points--;

        }


        /*
        VELOCIDADE
        */

        else if (
            type ===
            "autoSpeed"
        ) {

            if (
                !game.autoUnlocked
            ) {

                return;
            }


            game.autoInterval =

                Math.max(

                    AUTO_MIN_MS,

                    game.autoInterval -
                    18

                );


            game.points--;

        }


        /*
        PODER AUTOMÁTICO
        */

        else if (
            type ===
            "autoPower"
        ) {

            if (
                !game.autoUnlocked
            ) {

                return;
            }


            game.autoPower +=
                10;


            game.points--;

        }


        recalcStats();


        updateHUD();


        saveGame();

    }


    ui.btnHp.addEventListener(
        "click",
        () =>
            spend("hp")
    );


    ui.btnDamage.addEventListener(
        "click",
        () =>
            spend("damage")
    );


    ui.btnAutoSpeed.addEventListener(
        "click",
        () =>
            spend(
                "autoSpeed"
            )
    );


    ui.btnAutoPower.addEventListener(
        "click",
        () =>
            spend(
                "autoPower"
            )
    );


    // =====================================================
    // PROJÉTEIS
    // =====================================================

    const projectiles = [];


    class Projectile {

        constructor(
            spider,
            target,
            damage
        ) {

            this.x =
                spider.x;


            this.y =
                spider.y;


            this.target =
                target;


            this.damage =
                damage;


            this.speed =
                14;


            this.dead =
                false;


            this.hue =

                spider.form() ===
                "celestial"

                    ? (
                        performance.now() /
                        12
                    ) % 360

                    : 205;

        }


        update() {

            if (
                this.dead ||
                !this.target ||
                this.target.dead
            ) {

                this.dead =
                    true;


                return;

            }


            const dx =
                this.target.x -
                this.x;


            const dy =
                this.target.y -
                this.y;


            const distanceToTarget =

                Math.hypot(

                    dx,

                    dy

                ) || 1;


            if (
                distanceToTarget <
                18
            ) {

                this.target
                    .takeDamage(
                        this.damage
                    );


                this.dead =
                    true;


                return;

            }


            this.x +=

                dx /

                distanceToTarget *

                this.speed;


            this.y +=

                dy /

                distanceToTarget *

                this.speed;

        }


        draw() {

            if (
                this.dead ||
                !this.target
            ) {

                return;
            }


            ctx.strokeStyle =

                `hsla(${this.hue},100%,75%,.35)`;


            ctx.lineWidth =
                1;


            ctx.beginPath();


            ctx.moveTo(

                this.x,

                this.y

            );


            ctx.lineTo(

                this.target.x,

                this.target.y

            );


            ctx.stroke();


            ctx.shadowColor =

                `hsl(${this.hue},100%,65%)`;


            ctx.shadowBlur =
                10;


            ctx.fillStyle =

                `hsl(${this.hue},100%,82%)`;


            ctx.beginPath();


            ctx.arc(

                this.x,

                this.y,

                4,

                0,

                Math.PI * 2

            );


            ctx.fill();


            ctx.shadowBlur =
                0;

        }


        tick() {

            this.update();

            this.draw();

        }

    }


    // =====================================================
    // TODOS OS ALVOS
    // =====================================================

    function targets() {

        const list =

            mobs.filter(

                mob =>
                    !mob.dead

            );


        if (
            game.boss &&
            !game.boss.dead
        ) {

            list.unshift(
                game.boss
            );

        }


        return list;

    }


    // =====================================================
    // ESCOLHER ALVO
    // =====================================================

    function chooseTarget(
        spider
    ) {

        /*
        SE TIVER BOSS,
        ELE TEM PRIORIDADE
        */

        if (
            game.boss &&
            !game.boss.dead
        ) {

            return game.boss;

        }


        let list =
            targets();


        if (
            list.length === 0
        ) {

            return null;
        }


        /*
        SEGUNDA ARANHA
        NÃO ATACA O MESMO
        MOB DA PRIMEIRA
        */

        if (
            spider.id === 2 &&
            spiders[0] &&
            spiders[0].target &&
            !spiders[0].target.isBoss
        ) {

            list =

                list.filter(

                    target =>

                        target !==
                        spiders[0].target

                );


            if (
                list.length === 0
            ) {

                return null;
            }

        }


        let closest =
            list[0];


        let closestDistance =

            distance(

                spider,

                closest

            );


        for (
            let i = 1;

            i <
            list.length;

            i++
        ) {

            const current =

                distance(

                    spider,

                    list[i]

                );


            if (
                current <
                closestDistance
            ) {

                closest =
                    list[i];


                closestDistance =
                    current;

            }

        }


        return closest;

    }


    // =====================================================
    // DANO
    // =====================================================

    function attackDamage(
        automatic
    ) {

        if (
            !automatic
        ) {

            return game.damage;
        }


        return (

            game.damage *

            BigInt(
                game.autoPower
            )

        ) / 100n;

    }


    // =====================================================
    // ATAQUE
    // =====================================================

    function attack(
        spider,
        automatic = false
    ) {

        if (
            spider.dead
        ) {

            return;
        }


        const target =

            chooseTarget(
                spider
            );


        spider.target =
            target;


        if (
            !target
        ) {

            return;
        }


        const targetDistance =

            distance(

                spider,

                target

            );


        const damage =

            attackDamage(
                automatic
            );


        /*
        CORPO A CORPO
        */

        if (
            targetDistance <=
            MELEE_RANGE
        ) {

            target.takeDamage(
                damage
            );


            return;

        }


        /*
        ATAQUE À DISTÂNCIA
        */

        if (
            game.rangedUnlocked &&
            targetDistance <=
                RANGED_RANGE
        ) {

            projectiles.push(

                new Projectile(

                    spider,

                    target,

                    damage

                )

            );

        }

    }


    // =====================================================
    // CLIQUE
    // =====================================================

    canvas.addEventListener(
        "pointerdown",
        () => {

            spiders.forEach(

                spider =>

                    attack(

                        spider,

                        false

                    )

            );

        }
    );


    // =====================================================
    // ATAQUE AUTOMÁTICO
    // =====================================================

    function autoAttack() {

        if (
            !game.autoUnlocked
        ) {

            return;
        }


        const now =
            performance.now();


        if (
            now -
            game.lastAuto <
            game.autoInterval
        ) {

            return;
        }


        game.lastAuto =
            now;


        spiders.forEach(

            spider =>

                attack(

                    spider,

                    true

                )

        );

    }


    // =====================================================
    // NOVO CICLO
    // =====================================================

    function newCycle() {

        game.cycle++;


        /*
        NOVA META
        */

        game.goalLevel =

            1000000 *

            game.cycle;


        /*
        MAIS DIFÍCIL
        */

        game.cycleDifficulty *=
            1.5;


        /*
        XP MAIS RÁPIDO
        */

        game.cycleXpBoost *=
            1.35;


        /*
        RESET
        */

        game.level =
            1;


        game.xp =
            0;


        game.xpNeed =
            1;


        game.points =
            0;


        game.kills =
            0;


        game.baseHp =
            200n;


        game.baseDamage =
            1n;


        game.rangedUnlocked =
            false;


        game.autoUnlocked =
            false;


        game.autoInterval =
            AUTO_START_MS;


        game.autoPower =
            100;


        game.lastAuto =
            0;


        game.bossesDefeated =
            0;


        game.boss =
            null;


        game.celestial =
            false;


        game.maxMobTier =
            1;


        game.relics = {

            heart:
                0,

            fang:
                0,

            clock:
                0,

            core:
                0

        };


        recalcStats();


        /*
        PRIMEIRA ARANHA
        */

        spiders = [

            new Spider(

                1,

                W / 2,

                H / 2

            )

        ];


        /*
        SEGUNDA CONTINUA
        DESBLOQUEADA
        */

        ensureSecondSpider();


        spiders.forEach(

            spider =>
                spider.heal()

        );


        /*
        RECRIAR MOBS
        */

        mobs.forEach(

            mob => {

                mob.tier =
                    chooseMobTier();


                mob.spawn();

            }

        );


        toast(

            "🌌 Ciclo " +
            game.cycle +
            ": mais difícil e mais rápido."

        );


        updateHUD();


        saveGame();

    }


    // =====================================================
    // MOVIMENTO DAS ARANHAS
    // =====================================================

    function updateSpiderMovement() {

        spiders.forEach(

            (
                spider,
                index
            ) => {

                /*
                PRIMEIRA
                */

                if (
                    index === 0
                ) {

                    spider.follow(

                        pointer.x,

                        pointer.y

                    );

                }


                /*
                SEGUNDA
                ORBITA A PRIMEIRA
                */

                else {

                    const angle =

                        performance.now() /
                        850;


                    spider.follow(

                        pointer.x +

                        Math.cos(
                            angle
                        ) *

                        48,


                        pointer.y +

                        Math.sin(
                            angle
                        ) *

                        48

                    );

                }

            }

        );

    }


    // =====================================================
    // HUD
    // =====================================================

    function updateHUD() {

        const mainSpider =
            spiders[0];


        /*
        NOME
        */

        if (
            game.celestial
        ) {

            ui.name.textContent =
                "🕷️ Aranha Celestial";

        }

        else if (
            game.bossesDefeated >=
            1
        ) {

            ui.name.textContent =
                "🕷️ Aranha Real";

        }

        else {

            ui.name.textContent =
                "🕷️ Aranha";

        }


        ui.level.textContent =
            fmt(
                game.level
            );


        ui.xp.textContent =

            fmt(
                game.xp
            ) +

            " / " +

            fmt(
                game.xpNeed
            );


        ui.xpBar.style.width =

            clamp(

                game.xp /

                Math.max(

                    1,

                    game.xpNeed

                ) *

                100,

                0,

                100

            ) +

            "%";


        ui.points.textContent =
            fmt(
                game.points
            );


        if (
            mainSpider
        ) {

            ui.hp.textContent =

                fmt(
                    mainSpider.hp
                ) +

                " / " +

                fmt(
                    mainSpider.maxHp
                );

        }


        ui.damage.textContent =
            fmt(
                game.damage
            );


        ui.kills.textContent =
            fmt(
                game.kills
            );


        /*
        QUANTIDADE DE RELÍQUIAS
        */

        ui.relics.textContent =

            Object.values(
                game.relics
            )
            .reduce(

                (
                    total,
                    amount
                ) =>

                    total +
                    amount,

                0

            );


        ui.cycle.textContent =
            game.cycle;


        ui.goal.textContent =
            fmt(
                game.goalLevel
            );


        /*
        DISTÂNCIA
        */

        ui.ranged.textContent =

            game.rangedUnlocked

                ? "🕸️ Distância: ON"

                : "🔒 Distância: " +

                  fmt(
                      game.level
                  ) +

                  "/100";


        /*
        AUTOMÁTICO
        */

        ui.auto.textContent =

            game.autoUnlocked

                ? "⚡ Auto: " +

                  Math.round(
                      game.autoInterval
                  ) +

                  "ms • " +

                  game.autoPower +

                  "%"

                : "🔒 Automático: Boss I";


        /*
        SEGUNDA ARANHA
        */

        ui.second.textContent =

            game.secondSpiderPermanent

                ? "🕷️ 2ª aranha: ATIVA"

                : "🔒 2ª aranha: Boss III";


        /*
        BOSS
        */

        ui.nextBoss.textContent =

            game.boss

                ? "⚠️ " +
                  game.boss.name

                : "👑 Próximo boss: LV " +

                  fmt(
                      nextBossLevel()
                  );


        /*
        BOTÕES AUTO
        */

        ui.btnAutoSpeed.disabled =
            !game.autoUnlocked;


        ui.btnAutoPower.disabled =
            !game.autoUnlocked;


        /*
        RELÍQUIAS
        */

        ui.relicList.innerHTML =

            "❤️ Coração Antigo: <b>" +
            game.relics.heart +
            "</b><br>" +

            "🦷 Presa Ancestral: <b>" +
            game.relics.fang +
            "</b><br>" +

            "⏳ Ampulheta: <b>" +
            game.relics.clock +
            "</b><br>" +

            "🔮 Núcleo: <b>" +
            game.relics.core +
            "</b>";


        /*
        BARRA DO BOSS
        */

        if (
            game.boss
        ) {

            ui.bossPanel
                .classList
                .add(
                    "visible"
                );


            ui.bossName.textContent =
                game.boss.name;


            ui.bossBar.style.width =

                clamp(

                    percentBig(

                        game.boss.hp,

                        game.boss.maxHp

                    ),

                    0,

                    100

                ) +

                "%";


            ui.bossHp.textContent =

                fmt(
                    game.boss.hp
                ) +

                " / " +

                fmt(
                    game.boss.maxHp
                );

        }

        else {

            ui.bossPanel
                .classList
                .remove(
                    "visible"
                );

        }

    }


    // =====================================================
    // SALVAR
    // =====================================================

    function saveGame() {

        try {

            const save = {

                level:
                    game.level,

                xp:
                    game.xp,

                xpNeed:
                    game.xpNeed,

                points:
                    game.points,

                kills:
                    game.kills,

                cycle:
                    game.cycle,

                goalLevel:
                    game.goalLevel,

                baseHp:
                    game.baseHp
                        .toString(),

                baseDamage:
                    game.baseDamage
                        .toString(),

                rangedUnlocked:
                    game.rangedUnlocked,

                autoUnlocked:
                    game.autoUnlocked,

                autoInterval:
                    game.autoInterval,

                autoPower:
                    game.autoPower,

                bossesDefeated:
                    game.bossesDefeated,

                secondSpiderPermanent:
                    game.secondSpiderPermanent,

                celestial:
                    game.celestial,

                maxMobTier:
                    game.maxMobTier,

                cycleDifficulty:
                    game.cycleDifficulty,

                cycleXpBoost:
                    game.cycleXpBoost,

                relics:
                    game.relics

            };


            localStorage.setItem(

                SAVE_KEY,

                JSON.stringify(
                    save
                )

            );

        }

        catch (
            error
        ) {

            console.warn(

                "Falha ao salvar",

                error

            );

        }

    }


    // =====================================================
    // CARREGAR
    // =====================================================

    function loadGame() {

        try {

            const raw =

                localStorage.getItem(
                    SAVE_KEY
                );


            if (
                !raw
            ) {

                return;
            }


            const data =

                JSON.parse(
                    raw
                );


            game.level =
                Number(
                    data.level
                ) || 1;


            game.xp =
                Number(
                    data.xp
                ) || 0;


            game.xpNeed =
                Number(
                    data.xpNeed
                ) ||

                xpNeeded(
                    game.level
                );


            game.points =
                Number(
                    data.points
                ) || 0;


            game.kills =
                Number(
                    data.kills
                ) || 0;


            game.cycle =
                Number(
                    data.cycle
                ) || 1;


            game.goalLevel =
                Number(
                    data.goalLevel
                ) ||

                1000000;


            game.baseHp =

                BigInt(

                    data.baseHp ||
                    "200"

                );


            game.baseDamage =

                BigInt(

                    data.baseDamage ||
                    "1"

                );


            game.rangedUnlocked =
                Boolean(
                    data.rangedUnlocked
                );


            game.autoUnlocked =
                Boolean(
                    data.autoUnlocked
                );


            game.autoInterval =
                Number(
                    data.autoInterval
                ) ||

                AUTO_START_MS;


            game.autoPower =
                Number(
                    data.autoPower
                ) || 100;


            game.bossesDefeated =
                Number(
                    data.bossesDefeated
                ) || 0;


            game.secondSpiderPermanent =
                Boolean(
                    data.secondSpiderPermanent
                );


            game.celestial =
                Boolean(
                    data.celestial
                );


            game.maxMobTier =

                Math.max(

                    1,

                    Number(
                        data.maxMobTier
                    ) || 1

                );


            game.cycleDifficulty =
                Number(
                    data.cycleDifficulty
                ) || 1;


            game.cycleXpBoost =
                Number(
                    data.cycleXpBoost
                ) || 1;


            game.relics = {

                heart:

                    Number(
                        data.relics?.heart
                    ) || 0,


                fang:

                    Number(
                        data.relics?.fang
                    ) || 0,


                clock:

                    Number(
                        data.relics?.clock
                    ) || 0,


                core:

                    Number(
                        data.relics?.core
                    ) || 0

            };

        }

        catch (
            error
        ) {

            console.warn(

                "Save antigo ou inválido.",

                error

            );


            localStorage.removeItem(
                SAVE_KEY
            );

        }

    }


    // =====================================================
    // GAME OVER
    // =====================================================

    function gameOver() {

        return (

            spiders.length >
                0 &&

            spiders.every(

                spider =>
                    spider.dead

            )

        );

    }


    function drawGameOver() {

        if (
            !gameOver()
        ) {

            return;
        }


        ctx.fillStyle =
            "rgba(0,0,0,.72)";


        ctx.fillRect(

            0,
            0,

            W,
            H

        );


        ctx.textAlign =
            "center";


        ctx.fillStyle =
            "#ff4d68";


        ctx.font =
            "800 46px Arial";


        ctx.fillText(

            "GAME OVER",

            W / 2,

            H / 2

        );


        ctx.fillStyle =
            "#d8e0f0";


        ctx.font =
            "15px Arial";


        ctx.fillText(

            "Recarregue a página para voltar ao último salvamento.",

            W / 2,

            H / 2 +
            36

        );

    }


    // =====================================================
    // INICIAR
    // =====================================================

    loadGame();


    recalcStats();


    spiders = [

        new Spider(

            1,

            W / 2,

            H / 2

        )

    ];


    ensureSecondSpider();


    spiders.forEach(

        spider =>

            spider.heal()

    );


    mobs.forEach(

        mob => {

            mob.tier =
                chooseMobTier();


            mob.spawn();

        }

    );


    /*
    SE O SAVE JÁ ESTIVER
    EM UM NÍVEL DE BOSS,
    ELE APARECE.
    */

    checkBossSpawn();


    updateHUD();


    // =====================================================
    // LOOP DO JOGO
    // =====================================================

    let lastSave =
        performance.now();


    let lastHud =
        performance.now();


    function loop(
        time
    ) {

        /*
        CENÁRIO
        */

        drawBackground(
            time
        );


        /*
        MOVIMENTO
        */

        updateSpiderMovement();


        if (
            !gameOver()
        ) {

            /*
            AUTO
            */

            autoAttack();


            /*
            MOBS
            */

            mobs.forEach(

                mob =>
                    mob.tick()

            );


            /*
            BOSS
            */

            if (
                game.boss
            ) {

                game.boss.tick();

            }


            /*
            ARANHAS
            */

            spiders.forEach(

                spider =>
                    spider.tick()

            );


            /*
            PROJÉTEIS
            */

            for (
                let i =
                    projectiles.length - 1;

                i >= 0;

                i--
            ) {

                projectiles[i]
                    .tick();


                if (
                    projectiles[i]
                        .dead
                ) {

                    projectiles.splice(
                        i,
                        1
                    );

                }

            }

        }


        /*
        TEXTOS DE DANO
        */

        drawFloats();


        /*
        GAME OVER
        */

        drawGameOver();


        /*
        ATUALIZAR HUD
        */

        if (
            time -
            lastHud >
            140
        ) {

            lastHud =
                time;


            updateHUD();

        }


        /*
        SALVAR
        A CADA 5s
        */

        if (
            time -
            lastSave >
            5000
        ) {

            lastSave =
                time;


            saveGame();

        }


        requestAnimationFrame(
            loop
        );

    }


    requestAnimationFrame(
        loop
    );

})();