import { FRAME_MS } from "../config.js";
import { burst } from "../render/effects.js";
import { drawGlow } from "../render/glow.js";

const SPEED = 14; // px por frame de 60 FPS (igual ao original)
const HIT_RADIUS = 18;

export class Projectile {
    constructor(spider, target, damage) {
        this.originX = spider.x;
        this.originY = spider.y;
        this.x = spider.x;
        this.y = spider.y;
        this.target = target;
        this.damage = damage;
        this.dead = false;
        this.color = spider.flash > 0 ? "#ffffff" : spider.color();
    }

    update(dt) {
        if (this.dead || !this.target || this.target.dead) {
            this.dead = true;
            return;
        }

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        const step = SPEED * (dt / FRAME_MS);

        // Usa o passo do frame para não "atravessar" o alvo em frames longos.
        if (dist < HIT_RADIUS || dist <= step) {
            this.target.takeDamage(this.damage);
            burst(this.target.x, this.target.y, this.color, 5, 1.5);
            this.dead = true;
            return;
        }

        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
    }

    draw(ctx) {
        if (this.dead) return;

        // Fio de seda da aranha até a bolinha de teia
        ctx.strokeStyle = this.color;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(this.originX, this.originY);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
        ctx.globalAlpha = 1;

        drawGlow(ctx, this.x, this.y, 12, this.color, 0.9);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
    }
}
