// Salvamento em localStorage. O formato é o mesmo da versão anterior,
// então saves antigos continuam funcionando.

import { AUTO_MIN_MS, AUTO_START_MS, BASE_GOAL_LEVEL, SAVE_KEY } from "../config.js";
import { game, xpNeeded } from "../state.js";

export function saveGame() {
    try {
        const save = {
            level: game.level,
            xp: game.xp,
            xpNeed: game.xpNeed,
            points: game.points,
            kills: game.kills,
            cycle: game.cycle,
            goalLevel: game.goalLevel,
            baseHp: game.baseHp.toString(),
            baseDamage: game.baseDamage.toString(),
            rangedUnlocked: game.rangedUnlocked,
            autoUnlocked: game.autoUnlocked,
            autoInterval: game.autoInterval,
            autoPower: game.autoPower,
            bossesDefeated: game.bossesDefeated,
            secondSpiderPermanent: game.secondSpiderPermanent,
            celestial: game.celestial,
            maxMobTier: game.maxMobTier,
            cycleDifficulty: game.cycleDifficulty,
            cycleXpBoost: game.cycleXpBoost,
            relics: game.relics,
        };

        localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch (error) {
        console.warn("Falha ao salvar", error);
    }
}

/** Número finito e >= min; senão usa o padrão. */
function num(value, fallback, min = 0) {
    const n = Number(value);
    return Number.isFinite(n) && n >= min ? n : fallback;
}

function int(value, fallback, min = 0) {
    return Math.floor(num(value, fallback, min));
}

/** BigInt a partir de string de dígitos; qualquer outra coisa vira o padrão. */
function big(value, fallback) {
    return typeof value === "string" && /^\d{1,4000}$/.test(value) ? BigInt(value) : fallback;
}

export function loadGame() {
    let data;

    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return;
        data = JSON.parse(raw);
        if (!data || typeof data !== "object") throw new Error("save não é um objeto");
    } catch (error) {
        console.warn("Save antigo ou inválido.", error);
        try {
            localStorage.removeItem(SAVE_KEY);
        } catch {
            // armazenamento bloqueado: segue com o jogo novo
        }
        return;
    }

    game.level = int(data.level, 1, 1);
    game.xp = int(data.xp, 0);
    game.xpNeed = int(data.xpNeed, xpNeeded(game.level), 1);
    game.points = int(data.points, 0);
    game.kills = int(data.kills, 0);
    game.cycle = int(data.cycle, 1, 1);
    game.goalLevel = int(data.goalLevel, BASE_GOAL_LEVEL, 1);
    game.baseHp = big(data.baseHp, 200n);
    game.baseDamage = big(data.baseDamage, 1n);
    game.rangedUnlocked = Boolean(data.rangedUnlocked);
    game.autoUnlocked = Boolean(data.autoUnlocked);
    game.autoInterval = num(data.autoInterval, AUTO_START_MS, AUTO_MIN_MS);
    game.autoPower = num(data.autoPower, 100, 1);
    game.bossesDefeated = int(data.bossesDefeated, 0);
    game.secondSpiderPermanent = Boolean(data.secondSpiderPermanent);
    game.celestial = Boolean(data.celestial);
    game.maxMobTier = int(data.maxMobTier, 1, 1);
    game.cycleDifficulty = num(data.cycleDifficulty, 1, 1);
    game.cycleXpBoost = num(data.cycleXpBoost, 1, 1);
    game.relics = {
        heart: int(data.relics?.heart, 0),
        fang: int(data.relics?.fang, 0),
        clock: int(data.relics?.clock, 0),
        core: int(data.relics?.core, 0),
    };
}
