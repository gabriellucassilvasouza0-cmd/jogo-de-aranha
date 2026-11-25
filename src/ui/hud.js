// HUD em DOM. Só escreve no DOM quando o valor muda (evita reflow a cada frame).

import { RANGED_LEVEL } from "../config.js";
import { game, world, nextBossLevel } from "../state.js";
import { clamp, fmt, percentBig } from "../utils.js";

const $ = (id) => document.getElementById(id);

const ui = {
    hud: $("hud"),
    hudToggle: $("hudToggle"),
    name: $("spiderName"),
    level: $("level"),
    xp: $("xpText"),
    xpBar: $("xpBar"),
    points: $("points"),
    hp: $("hp"),
    hpBar: $("hpBar"),
    damage: $("damage"),
    kills: $("kills"),
    relics: $("relics"),
    cycle: $("cycle"),
    goal: $("goal"),
    ranged: $("ranged"),
    auto: $("auto"),
    second: $("second"),
    nextBoss: $("nextBoss"),
    relicHeart: $("relicHeart"),
    relicFang: $("relicFang"),
    relicClock: $("relicClock"),
    relicCore: $("relicCore"),
    bossPanel: $("bossPanel"),
    bossName: $("bossName"),
    bossBar: $("bossBar"),
    bossHp: $("bossHp"),
    toast: $("toast"),
    btnHp: $("btnHp"),
    btnDamage: $("btnDamage"),
    btnAutoSpeed: $("btnAutoSpeed"),
    btnAutoPower: $("btnAutoPower"),
};

const lastValues = new WeakMap();

function setText(element, text) {
    if (lastValues.get(element) === text) return;
    lastValues.set(element, text);
    element.textContent = text;
}

function setWidth(element, percent) {
    const value = clamp(percent, 0, 100).toFixed(1) + "%";
    if (lastValues.get(element) === value) return;
    lastValues.set(element, value);
    element.style.width = value;
}

function setFlag(element, className, on) {
    if (element.classList.contains(className) !== on) element.classList.toggle(className, on);
}

let toastTimer = 0;

export function toast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove("show"), 1800);
}

export function bindHud({ onSpend }) {
    ui.btnHp.addEventListener("click", () => onSpend("hp"));
    ui.btnDamage.addEventListener("click", () => onSpend("damage"));
    ui.btnAutoSpeed.addEventListener("click", () => onSpend("autoSpeed"));
    ui.btnAutoPower.addEventListener("click", () => onSpend("autoPower"));

    // Celular: o painel começa recolhido para não cobrir o jogo.
    ui.hudToggle.addEventListener("click", () => {
        const expanded = ui.hud.classList.toggle("expanded");
        ui.hudToggle.setAttribute("aria-expanded", String(expanded));
        ui.hudToggle.textContent = expanded ? "Fechar" : "Menu";
    });
}

export function updateHUD() {
    const mainSpider = world.spiders[0];

    const form = game.celestial ? "celestial" : game.bossesDefeated >= 1 ? "royal" : "normal";
    setText(ui.name, form === "celestial" ? "Aranha Celestial" : form === "royal" ? "Aranha Real" : "Aranha");
    if (ui.hud.dataset.form !== form) ui.hud.dataset.form = form;

    setText(ui.level, fmt(game.level));
    setText(ui.xp, fmt(game.xp) + " / " + fmt(game.xpNeed));
    setWidth(ui.xpBar, (game.xp / Math.max(1, game.xpNeed)) * 100);
    setText(ui.points, fmt(game.points));

    if (mainSpider) {
        setText(ui.hp, fmt(mainSpider.hp) + " / " + fmt(mainSpider.maxHp));
        setWidth(ui.hpBar, percentBig(mainSpider.hp, mainSpider.maxHp));
    }

    setText(ui.damage, fmt(game.damage));
    setText(ui.kills, fmt(game.kills));
    setText(ui.relics, fmt(Object.values(game.relics).reduce((total, amount) => total + amount, 0)));
    setText(ui.cycle, fmt(game.cycle));
    setText(ui.goal, fmt(game.goalLevel));

    setText(ui.ranged, game.rangedUnlocked ? "Distância: ativo" : `Distância: ${fmt(game.level)}/${RANGED_LEVEL}`);
    setFlag(ui.ranged, "on", game.rangedUnlocked);

    setText(
        ui.auto,
        game.autoUnlocked
            ? `Auto: ${Math.round(game.autoInterval)}ms · ${game.autoPower}%`
            : "Automático: Boss I",
    );
    setFlag(ui.auto, "on", game.autoUnlocked);

    setText(ui.second, game.secondSpiderPermanent ? "2ª aranha: ativa" : "2ª aranha: Boss III");
    setFlag(ui.second, "on", game.secondSpiderPermanent);

    setText(ui.nextBoss, game.boss ? game.boss.name + " em combate" : "Próximo boss: LV " + fmt(nextBossLevel()));
    setFlag(ui.nextBoss, "danger", Boolean(game.boss));

    const hasPoints = game.points > 0;
    ui.btnHp.disabled = !hasPoints;
    ui.btnDamage.disabled = !hasPoints;
    ui.btnAutoSpeed.disabled = !game.autoUnlocked || !hasPoints;
    ui.btnAutoPower.disabled = !game.autoUnlocked || !hasPoints;
    setFlag(ui.hudToggle, "attention", hasPoints);

    setText(ui.relicHeart, String(game.relics.heart));
    setText(ui.relicFang, String(game.relics.fang));
    setText(ui.relicClock, String(game.relics.clock));
    setText(ui.relicCore, String(game.relics.core));

    if (game.boss) {
        setFlag(ui.bossPanel, "visible", true);
        setText(ui.bossName, game.boss.name);
        setWidth(ui.bossBar, percentBig(game.boss.hp, game.boss.maxHp));
        setText(ui.bossHp, fmt(game.boss.hp) + " / " + fmt(game.boss.maxHp));
    } else {
        setFlag(ui.bossPanel, "visible", false);
    }
}
