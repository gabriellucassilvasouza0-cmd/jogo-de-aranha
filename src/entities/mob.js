import { FRAME_MS } from "../config.js";
import { game, mobXp, worldPower, cycleDifficultyInt } from "../state.js";
import { view } from "../render/canvas.js";
import { burst, floatText } from "../render/effects.js";
import { drawGlow } from "../render/glow.js";
import { clamp, fmt, percentBig, rand } from "../utils.js";
import { gainXp, rollRelic } from "../systems/progress.js";
import { Crawler } from "./crawler.js";

const RESPAWN_MS = 240;

export class Mob {
    constructor(tier = 1) {
        this.isBoss = false;
        this.dead = false;
        this.tier = tier;
        this.crawler = null;
        this.spawn();
    }

    spawn() {
        const { W, H } = view;

        this.dead = false;
        this.x = rand(45, Math.max(46, W - 45));
        this.y = rand(75, Math.max(76, H - 45));
        this.angle = rand(0, Math.PI * 2);
        this.turn = rand(55, 170); // em frames de 60 FPS (como no original)

        const growth = Math.log2(this.tier + 1);
        this.radius = clamp(12 + growth * 2.2, 12, 31);
        this.speed = clamp(0.4 + growth * 0.11, 0.4, 2.4); // px por frame de 60 FPS

        // Mob inicial: 5 HP
        const baseHp = BigInt(Math.max(5, Math.floor(3 + this.tier * 2)));
        this.maxHp = baseHp * worldPower() * cycleDifficultyInt();
        this.hp = this.maxHp;
        this.xpReward = mobXp(this.tier);
        this.color = this.getColor();

        this.strong = this.tier >= Math.max(5, game.maxMobTier * 0.45);

        const reach = this.radius * 2.1;
        const legs = this.strong ? 10 : 8;
        if (!this.crawler) {
            this.crawler = new Crawler({ legs, reach, hip: this.radius * 0.3, stepMs: 130 });
        } else {
            this.crawler.setReach(reach, this.radius * 0.3);
            if (this.crawler.legs.length !== legs) this.crawler.setLegs(legs);
            this.crawler.reset();
        }
        this.breath = rand(0, 100);
    }

    getColor() {
        const growth = Math.log2(this.tier + 1);
        const hue = Math.round((205 + growth * 55) % 360);
        const light = Math.round(clamp(68 - growth * 3.5, 36, 68));
        return `hsl(${hue},82%,${light}%)`;
    }

    update(dt) {
        if (this.dead) return;

        const { W, H } = view;
        const frames = dt / FRAME_MS;

        this.turn -= frames;
        if (this.turn <= 0) {
            this.angle = rand(0, Math.PI * 2);
            this.turn = rand(55, 170);
        }

        this.x += Math.cos(this.angle) * this.speed * frames;
        this.y += Math.sin(this.angle) * this.speed * frames;

        // Bordas
        if (this.x < this.radius || this.x > W - this.radius) {
            this.angle = Math.PI - this.angle;
            this.x = clamp(this.x, this.radius, W - this.radius);
        }

        if (this.y < 60 || this.y > H - this.radius) {
            this.angle = -this.angle;
            this.y = clamp(this.y, 60, H - this.radius);
        }

        this.breath += dt * 0.004;
        this.crawler.update(dt, this.x, this.y, this.angle);
    }

    takeDamage(amount) {
        if (this.dead) return;

        this.hp -= amount;
        floatText(this.x, this.y - this.radius * 0.6, "-" + fmt(amount));

        if (this.hp <= 0n) this.die();
    }

    die() {
        if (this.dead) return;

        this.dead = true;
        game.kills++;

        burst(this.x, this.y, this.color, this.strong ? 22 : 14);

        gainXp(this.xpReward);
        rollRelic(this);

        // Cada morte aumenta o teto dos mobs
        game.maxMobTier = Math.max(game.maxMobTier, 1 + game.kills, 1 + Math.floor(game.level / 12));

        setTimeout(() => {
            this.tier = chooseMobTier();
            this.spawn();
        }, RESPAWN_MS);
    }

    draw(ctx) {
        if (this.dead) return;

        const body = this.radius * 0.42 * (1 + Math.sin(this.breath) * 0.06);

        this.crawler.draw(ctx, this.x, this.y, this.angle, this.color, this.strong ? 1.1 : 0.9);
        drawGlow(ctx, this.x, this.y, body * 4, this.color, 0.75);

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, body, 0, Math.PI * 2);
        ctx.fill();

        // Mobs fortes ganham um anel (substitui os antigos "espinhos").
        if (this.strong) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(this.x, this.y, body * 1.9, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Vida
        const hpPercent = percentBig(this.hp, this.maxHp) / 100;
        const barWidth = 32;
        const barY = this.y - this.radius - 10;

        ctx.fillStyle = "rgba(255,255,255,.12)";
        ctx.fillRect(this.x - barWidth / 2, barY, barWidth, 2);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - barWidth / 2, barY, barWidth * hpPercent, 2);

        // Tier
        ctx.fillStyle = "rgba(220,228,245,.7)";
        ctx.font = "600 9px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("T" + fmt(this.tier), this.x, this.y + this.radius + 14);
    }
}

export function chooseMobTier() {
    const strongest = Math.max(1, game.maxMobTier);
    const chance = Math.random();

    // 30% fracos
    if (chance < 0.3) {
        return Math.max(1, Math.floor(rand(1, Math.min(10, strongest) + 1)));
    }

    // 42% médios
    if (chance < 0.72) {
        return Math.max(1, Math.floor(rand(Math.max(1, strongest * 0.15), Math.max(2, strongest * 0.6))));
    }

    // 28% fortes
    return Math.max(1, Math.floor(rand(Math.max(1, strongest * 0.6), strongest + 1)));
}
