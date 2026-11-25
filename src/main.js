// Ponto de entrada: inicialização, entrada do jogador e loop principal.

import { BASE_MOB_COUNT, HUD_INTERVAL_MS, SAVE_INTERVAL_MS } from "./config.js";
import { game, world, isGameOver, recalcStats } from "./state.js";
import { canvas, ctx, initCanvas, onResize, view } from "./render/canvas.js";
import { buildDotField, drawDotField } from "./render/dotfield.js";
import { drawEffectsBelow, drawFloats, updateEffects } from "./render/effects.js";
import { Mob } from "./entities/mob.js";
import { checkBossSpawn } from "./entities/boss.js";
import { attackAll, autoAttack } from "./systems/combat.js";
import { createSpiders, respawnMobs, spend } from "./systems/progress.js";
import { loadGame, saveGame } from "./systems/save.js";
import { bindHud, updateHUD } from "./ui/hud.js";

// ---------------------------------------------------------------- entrada

const pointer = { x: innerWidth / 2, y: innerHeight / 2 };

addEventListener("pointermove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
});

canvas.addEventListener("pointerdown", () => attackAll(false));

// Celular costuma matar a aba em segundo plano sem aviso: salva ao sair.
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveGame();
});
addEventListener("pagehide", saveGame);

// ---------------------------------------------------------------- movimento

function updateSpiderTargets(now) {
    world.spiders.forEach((spider, index) => {
        if (index === 0) {
            spider.follow(pointer.x, pointer.y);
        } else {
            // A segunda aranha orbita o cursor.
            const angle = now / 850;
            spider.follow(pointer.x + Math.cos(angle) * 48, pointer.y + Math.sin(angle) * 48);
        }
    });
}

// ---------------------------------------------------------------- game over

function drawGameOver() {
    const { W, H } = view;

    ctx.fillStyle = "rgba(0,0,0,.72)";
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ff4d68";
    ctx.font = "700 44px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("GAME OVER", W / 2, H / 2);

    ctx.fillStyle = "#d8e0f0";
    ctx.font = "15px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("Recarregue a página para voltar ao último salvamento.", W / 2, H / 2 + 36);
}

// ---------------------------------------------------------------- inicialização

onResize(buildDotField);
initCanvas();

loadGame();
recalcStats();
createSpiders();

world.mobs = Array.from({ length: BASE_MOB_COUNT }, () => new Mob(1));
respawnMobs();

bindHud({ onSpend: spend });

// Se o save já estiver em um nível de boss, ele aparece.
checkBossSpawn();
updateHUD();

// ---------------------------------------------------------------- loop

let lastTime = performance.now();
let lastHud = lastTime;
let lastSave = lastTime;

function loop(now) {
    // dt limitado: ao voltar de outra aba não teletransporta tudo.
    const dt = Math.min(50, Math.max(0, now - lastTime));
    lastTime = now;

    drawDotField(ctx, view);
    updateSpiderTargets(now);

    const over = isGameOver();

    if (!over) {
        autoAttack(now);

        for (const mob of world.mobs) mob.update(dt);
        if (game.boss) game.boss.update(dt);
        for (const spider of world.spiders) spider.update(dt);

        for (let i = world.projectiles.length - 1; i >= 0; i--) {
            world.projectiles[i].update(dt);
            if (world.projectiles[i].dead) world.projectiles.splice(i, 1);
        }
    }

    updateEffects(dt);

    // Desenho em camadas: efeitos de fundo → mobs → boss → aranhas → projéteis → textos
    drawEffectsBelow(ctx);

    if (!over) {
        for (const mob of world.mobs) mob.draw(ctx);
        if (game.boss) game.boss.draw(ctx);
        for (const spider of world.spiders) spider.draw(ctx);
        for (const projectile of world.projectiles) projectile.draw(ctx);
    }

    drawFloats(ctx);

    if (over) drawGameOver();

    if (now - lastHud > HUD_INTERVAL_MS) {
        lastHud = now;
        updateHUD();
    }

    if (now - lastSave > SAVE_INTERVAL_MS) {
        lastSave = now;
        saveGame();
    }

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
