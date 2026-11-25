import { AUTO_START_MS, BASE_GOAL_LEVEL, BOSS_INTERVAL } from "./config.js";
import { clamp } from "./utils.js";

// Estado persistente da partida (o que vai para o save, mais alguns campos de runtime).
export const game = {
    level: 1,
    xp: 0,
    xpNeed: 1,
    points: 0,
    kills: 0,

    cycle: 1,
    goalLevel: BASE_GOAL_LEVEL,

    baseHp: 200n,
    baseDamage: 1n,
    maxHp: 200n,
    damage: 1n,

    rangedUnlocked: false,
    autoUnlocked: false,
    autoInterval: AUTO_START_MS,
    autoPower: 100,
    lastAuto: 0,

    bossesDefeated: 0,
    boss: null,
    secondSpiderPermanent: false,
    celestial: false,

    maxMobTier: 1,
    cycleDifficulty: 1,
    cycleXpBoost: 1,

    relics: { heart: 0, fang: 0, clock: 0, core: 0 },
};

// Entidades vivas na tela (não são salvas).
export const world = {
    spiders: [],
    mobs: [],
    projectiles: [],
};

export function freshRelics() {
    return { heart: 0, fang: 0, clock: 0, core: 0 };
}

/** XP para passar do nível: 1, 10, 20, 30, ... */
export function xpNeeded(level) {
    if (level <= 1) return 1;
    return (level - 1) * 10;
}

/** Cada boss derrotado dobra o poder base. */
export function bossMultiplier() {
    return 2n ** BigInt(game.bossesDefeated);
}

/** Mobs dobram de força a cada faixa de BOSS_INTERVAL níveis. */
export function worldPower() {
    const stage = Math.floor(Math.max(0, game.level - 1) / BOSS_INTERVAL);
    return 2n ** BigInt(stage);
}

export function cycleDifficultyInt() {
    return BigInt(Math.max(1, Math.ceil(game.cycleDifficulty)));
}

export function nextBossLevel() {
    return (game.bossesDefeated + 1) * BOSS_INTERVAL;
}

export function mobXp(tier) {
    if (tier <= 1) return 1;

    const relative = clamp(tier / Math.max(1, game.maxMobTier), 0, 1);
    return Math.max(1, Math.floor(game.xpNeed * (0.025 + relative * 0.12)));
}

/** Recalcula vida/dano máximos a partir da base, bosses e relíquias. */
export function recalcStats() {
    const power = bossMultiplier();

    // Relíquias: +5% cada (em base 10000 para manter inteiro).
    const hpBonus = 10000n + BigInt(game.relics.heart) * 500n;
    const damageBonus = 10000n + BigInt(game.relics.fang) * 500n;

    game.maxHp = (game.baseHp * power * hpBonus) / 10000n;
    game.damage = (game.baseDamage * power * damageBonus) / 10000n;

    if (game.maxHp < 1n) game.maxHp = 1n;
    if (game.damage < 1n) game.damage = 1n;

    for (const spider of world.spiders) {
        spider.maxHp = game.maxHp;
        if (spider.hp > spider.maxHp) spider.hp = spider.maxHp;
    }
}

export function isGameOver() {
    return world.spiders.length > 0 && world.spiders.every((spider) => spider.dead);
}
