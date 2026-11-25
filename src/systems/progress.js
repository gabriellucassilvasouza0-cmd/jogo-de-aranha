// Progressão: XP, níveis, melhorias, relíquias, segunda aranha e novo ciclo.

import { AUTO_MIN_MS, AUTO_START_MS, BASE_GOAL_LEVEL, RANGED_LEVEL } from "../config.js";
import { game, world, freshRelics, recalcStats, xpNeeded } from "../state.js";
import { view } from "../render/canvas.js";
import { clamp } from "../utils.js";
import { Spider } from "../entities/spider.js";
import { chooseMobTier } from "../entities/mob.js";
import { checkBossSpawn } from "../entities/boss.js";
import { saveGame } from "./save.js";
import { toast, updateHUD } from "../ui/hud.js";

// ---------------------------------------------------------------- aranhas

export function createSpiders() {
    world.spiders = [new Spider(1, view.W / 2, view.H / 2)];
    ensureSecondSpider();
    world.spiders.forEach((spider) => spider.heal());
}

export function ensureSecondSpider() {
    if (game.secondSpiderPermanent && world.spiders.length < 2) {
        world.spiders.push(new Spider(2, view.W / 2 + 48, view.H / 2));
    }
}

export function respawnMobs() {
    for (const mob of world.mobs) {
        mob.tier = chooseMobTier();
        mob.spawn();
    }
}

// ---------------------------------------------------------------- nível e XP

function levelUp() {
    if (game.level >= game.goalLevel) return;

    game.level++;
    game.points += 3;
    game.baseDamage += 1n;
    game.xpNeed = xpNeeded(game.level);

    // Mobs mais fortes
    game.maxMobTier = Math.max(game.maxMobTier, 1 + Math.floor(game.level / 12));

    if (game.level >= RANGED_LEVEL) game.rangedUnlocked = true;

    recalcStats();
    checkBossSpawn();
}

export function gainXp(amount) {
    const gained = Math.max(1, Math.floor(amount * game.cycleXpBoost));
    game.xp += gained;

    // Pode subir vários níveis de uma vez (limite de segurança contra loop infinito).
    let safety = 0;
    while (game.xp >= game.xpNeed && game.level < game.goalLevel && safety < 10000) {
        game.xp -= game.xpNeed;
        levelUp();
        safety++;
    }

    checkBossSpawn();
}

// ---------------------------------------------------------------- melhorias

export function spend(type) {
    if (game.points <= 0) return;

    if (type === "hp") {
        game.baseHp += 10n;
    } else if (type === "damage") {
        game.baseDamage += 1n;
    } else if (type === "autoSpeed") {
        if (!game.autoUnlocked) return;
        game.autoInterval = Math.max(AUTO_MIN_MS, game.autoInterval - 18);
    } else if (type === "autoPower") {
        if (!game.autoUnlocked) return;
        game.autoPower += 10;
    } else {
        return;
    }

    game.points--;
    recalcStats();
    updateHUD();
    saveGame();
}

// ---------------------------------------------------------------- relíquias

export const relicDefinitions = [
    { key: "heart", icon: "❤️", name: "Coração Antigo", effect: "+5% vida" },
    { key: "fang", icon: "🦷", name: "Presa Ancestral", effect: "+5% dano" },
    { key: "clock", icon: "⏳", name: "Ampulheta", effect: "+2% velocidade automática" },
    { key: "core", icon: "🔮", name: "Núcleo", effect: "+5% força automática" },
];

/** Mob fraco: 1%. Mob mais forte do momento: até 20%. */
function relicChance(mob) {
    const relative = clamp(mob.tier / Math.max(1, game.maxMobTier), 0, 1);
    return clamp(0.01 + relative * 0.19, 0.01, 0.2);
}

export function rollRelic(mob) {
    if (Math.random() > relicChance(mob)) return;

    // Antes do automático, relíquias de automático não caem.
    const available = game.autoUnlocked
        ? relicDefinitions
        : relicDefinitions.filter((relic) => relic.key === "heart" || relic.key === "fang");

    const relic = available[Math.floor(Math.random() * available.length)];
    game.relics[relic.key]++;

    if (relic.key === "clock") {
        game.autoInterval = Math.max(AUTO_MIN_MS, Math.floor(game.autoInterval * 0.98));
    }

    if (relic.key === "core") game.autoPower += 5;

    recalcStats();
    toast("🧿 " + relic.name + " — " + relic.effect);
}

// ---------------------------------------------------------------- ciclo

export function newCycle() {
    game.cycle++;
    game.goalLevel = BASE_GOAL_LEVEL * game.cycle;
    game.cycleDifficulty *= 1.5; // mais difícil
    game.cycleXpBoost *= 1.35; // XP mais rápido

    // Reset (a segunda aranha continua desbloqueada)
    Object.assign(game, {
        level: 1,
        xp: 0,
        xpNeed: 1,
        points: 0,
        kills: 0,
        baseHp: 200n,
        baseDamage: 1n,
        rangedUnlocked: false,
        autoUnlocked: false,
        autoInterval: AUTO_START_MS,
        autoPower: 100,
        lastAuto: 0,
        bossesDefeated: 0,
        boss: null,
        celestial: false,
        maxMobTier: 1,
        relics: freshRelics(),
    });

    recalcStats();
    createSpiders();
    respawnMobs();

    toast("🌌 Ciclo " + game.cycle + ": mais difícil e mais rápido.");
    updateHUD();
    saveGame();
}
