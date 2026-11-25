import { BOSS_INTERVAL, FRAME_MS } from "../config.js";
import { game, world, cycleDifficultyInt, nextBossLevel, recalcStats } from "../state.js";
import { view } from "../render/canvas.js";
import { burst, floatText } from "../render/effects.js";
import { drawGlow } from "../render/glow.js";
import { clamp, distance, fmt } from "../utils.js";
import { ensureSecondSpider, newCycle } from "../systems/progress.js";
import { saveGame } from "../systems/save.js";
import { toast } from "../ui/hud.js";
import { Crawler } from "./crawler.js";

export class Boss {
    constructor(index, finalBoss = false) {
        this.isBoss = true;
        this.index = index;
        this.finalBoss = finalBoss;
        this.dead = false;

        this.x = view.W / 2;
        this.y = 125;

        const growth = Math.log2(index + 1);
        this.radius = clamp(58 + growth * 5, 58, 105);
        this.speed = clamp(0.75 + growth * 0.05, 0.75, 2); // px por frame de 60 FPS
        this.angle = Math.PI / 2;

        this.lastHit = 0;
        this.cooldown = Math.max(280, 900 - growth * 45);

        // Boss 1: 10.000 HP / 10 dano. Cada boss seguinte dobra.
        const factor = 2n ** BigInt(index - 1);
        this.maxHp = 10000n * factor * cycleDifficultyInt();
        this.hp = this.maxHp;
        this.damage = 10n * factor * cycleDifficultyInt();

        this.name = finalBoss ? "BOSS FINAL" : "BOSS " + index;

        this.crawler = new Crawler({
            legs: finalBoss ? 28 : 22,
            reach: this.radius * 1.55,
            hip: this.radius * 0.25,
            stepMs: 160,
        });
    }

    hue(time) {
        return this.finalBoss ? Math.round(((time / 12) % 360) / 4) * 4 : (this.index * 51) % 360;
    }

    targetSpider() {
        let best = null;
        let bestDistance = Infinity;

        for (const spider of world.spiders) {
            if (spider.dead) continue;
            const current = distance(this, spider);
            if (current < bestDistance) {
                best = spider;
                bestDistance = current;
            }
        }

        return best;
    }

    update(dt) {
        if (this.dead) return;

        const spider = this.targetSpider();

        if (spider) {
            const dx = spider.x - this.x;
            const dy = spider.y - this.y;
            const distanceToSpider = Math.hypot(dx, dy) || 1;
            const attackRange = this.radius + 42;

            if (distanceToSpider > attackRange) {
                const step = this.speed * (dt / FRAME_MS);
                this.x += (dx / distanceToSpider) * step;
                this.y += (dy / distanceToSpider) * step;
                this.angle = Math.atan2(dy, dx);
            } else {
                const now = performance.now();
                if (now - this.lastHit >= this.cooldown) {
                    spider.takeDamage(this.damage);
                    this.lastHit = now;
                }
            }
        }

        this.crawler.update(dt, this.x, this.y, this.angle);
    }

    takeDamage(amount) {
        if (this.dead) return;

        this.hp -= amount;
        floatText(this.x, this.y - this.radius - 12, "-" + fmt(amount), "#ffd34f");

        if (this.hp <= 0n) {
            this.hp = 0n;
            this.die();
        }
    }

    die() {
        if (this.dead) return;

        this.dead = true;
        const { index, finalBoss } = this;

        burst(this.x, this.y, `hsl(${this.hue(performance.now())},100%,70%)`, 60, 4);

        game.boss = null;
        game.bossesDefeated++;

        // Boss 1: ataque automático
        if (index === 1) {
            game.autoUnlocked = true;
            toast("⚡ Ataque automático liberado!");
        }

        // Boss 2+: aranha celestial
        if (index >= 2) game.celestial = true;

        // Boss 3: segunda aranha
        if (index === 3 && !game.secondSpiderPermanent) {
            game.secondSpiderPermanent = true;
            ensureSecondSpider();
            toast("🕷️ Segunda aranha liberada para sempre!");
        }

        // Cada boss dobra o poder base
        recalcStats();
        world.spiders.forEach((spider) => spider.heal());

        if (finalBoss) newCycle();
        else saveGame();
    }

    draw(ctx) {
        if (this.dead) return;

        const time = performance.now();
        const hue = this.hue(time);
        const color = `hsl(${hue},100%,66%)`;
        const pulse = Math.sin(time / 160) * 3;
        const body = this.radius * 0.32 + pulse * 0.5;

        // Aura
        drawGlow(ctx, this.x, this.y, this.radius * 2.2 + pulse * 2, `hsl(${hue},100%,55%)`, 0.6);

        this.crawler.draw(ctx, this.x, this.y, this.angle, color, 1.6);

        // Anel giratório tracejado
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(time / 1800);
        ctx.setLineDash([10, 9]);
        ctx.strokeStyle = `hsla(${hue},100%,72%,.55)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.75, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Corpo
        ctx.fillStyle = `hsl(${hue},80%,45%)`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, body, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, body * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // Olhos (grupo de 4, como uma aranha) apontando para a direção do movimento
        ctx.fillStyle = "#ffffff";
        const ex = Math.cos(this.angle);
        const ey = Math.sin(this.angle);
        for (const [forward, sideOffset, r] of [[0.75, -0.28, 3], [0.75, 0.28, 3], [0.55, -0.55, 2], [0.55, 0.55, 2]]) {
            const px = this.x + ex * body * forward - ey * body * sideOffset;
            const py = this.y + ey * body * forward + ex * body * sideOffset;
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Nome
        ctx.fillStyle = "#ffffff";
        ctx.font = "700 13px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(this.name, this.x, this.y - this.radius - 30);
    }
}

export function checkBossSpawn() {
    if (game.boss) return;

    if (game.level >= game.goalLevel) {
        spawnBoss(true);
        return;
    }

    if (game.level >= nextBossLevel()) spawnBoss(false);
}

export function spawnBoss(finalBoss) {
    if (game.boss) return;

    const index = finalBoss
        ? Math.max(1, Math.floor(game.goalLevel / BOSS_INTERVAL))
        : game.bossesDefeated + 1;

    game.boss = new Boss(index, finalBoss);
    toast(finalBoss ? "☠️ BOSS FINAL!" : "👑 Boss " + index + " apareceu!");
}
