import { game } from "../state.js";
import { floatText } from "../render/effects.js";
import { drawGlow } from "../render/glow.js";
import { drawDotHighlight } from "../render/dotfield.js";
import { fmt, rand, smoothing } from "../utils.js";
import { Crawler } from "./crawler.js";

// Aparência por forma de evolução: mais pernas, mais alcance e mais brilho.
const FORMS = {
    normal: { legs: 12, reach: 54, body: 6.5 },
    royal: { legs: 14, reach: 60, body: 7.5 },
    celestial: { legs: 16, reach: 68, body: 8.5 },
};

const FLASH_MS = 115;

export class Spider {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.angle = 0;

        this.size = 18;
        this.maxHp = game.maxHp;
        this.hp = this.maxHp;
        this.dead = false;
        this.target = null;
        this.flash = 0;

        this.currentForm = this.form();
        const look = FORMS[this.currentForm];
        this.body = look.body;
        this.crawler = new Crawler({ legs: look.legs, reach: look.reach, hip: look.body * 0.6, stepMs: 95 });
        this.breath = rand(0, 100);
    }

    form() {
        if (game.celestial) return "celestial";
        if (game.bossesDefeated >= 1) return "royal";
        return "normal";
    }

    color() {
        const form = this.form();

        if (form === "celestial") {
            // Matiz quantizado em passos de 4° para reaproveitar os sprites de brilho em cache.
            const hue = Math.round(((performance.now() / 14 + this.id * 70) % 360) / 4) * 4;
            return `hsl(${hue},100%,66%)`;
        }

        if (form === "royal") return "#ff3b55";

        // Forma normal: muda devagar do azul para o violeta conforme evolui.
        const progress = Math.min(1, game.level / Math.max(1, game.goalLevel));
        const hue = Math.round(205 + progress * 130);
        return `hsl(${hue},85%,72%)`;
    }

    follow(x, y) {
        this.targetX = x;
        this.targetY = y;
    }

    heal() {
        this.dead = false;
        this.maxHp = game.maxHp;
        this.hp = this.maxHp;
    }

    takeDamage(amount) {
        if (this.dead) return;

        this.hp -= amount;
        this.flash = FLASH_MS;
        floatText(this.x, this.y - 28, "-" + fmt(amount), "#ff6578");

        if (this.hp <= 0n) {
            this.hp = 0n;
            this.dead = true;
            this.target = null;
        }
    }

    syncForm() {
        const form = this.form();
        if (form === this.currentForm) return;

        this.currentForm = form;
        const look = FORMS[form];
        this.body = look.body;
        this.crawler.setReach(look.reach, look.body * 0.6);
        this.crawler.setLegs(look.legs);
    }

    update(dt) {
        if (this.dead) return;

        this.syncForm();

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const k = smoothing(0.055, dt);

        this.x += dx * k;
        this.y += dy * k;

        if (Math.abs(dx) + Math.abs(dy) > 1) {
            // Gira suavemente em vez de virar instantaneamente.
            const desired = Math.atan2(dy, dx);
            let diff = desired - this.angle;
            diff = Math.atan2(Math.sin(diff), Math.cos(diff));
            this.angle += diff * smoothing(0.2, dt);
        }

        if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
        this.breath += dt * 0.004;

        this.crawler.update(dt, this.x, this.y, this.angle);
    }

    draw(ctx) {
        if (this.dead) return;

        const color = this.flash > 0 ? "#ffffff" : this.color();
        const form = this.currentForm;

        drawDotHighlight(ctx, this.x, this.y, this.crawler.reach * 1.25, color);

        this.crawler.draw(ctx, this.x, this.y, this.angle, color, form === "normal" ? 1.1 : 1.3);

        // Halo
        const pulse = 1 + Math.sin(this.breath) * 0.08;
        drawGlow(ctx, this.x, this.y, this.body * (form === "celestial" ? 6 : 4.5) * pulse, color, 0.9);

        // Abdômen (atrás) + cefalotórax (frente)
        const backX = this.x - Math.cos(this.angle) * this.body * 0.9;
        const backY = this.y - Math.sin(this.angle) * this.body * 0.9;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(backX, backY, this.body * 1.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.x + Math.cos(this.angle) * this.body * 0.45, this.y + Math.sin(this.angle) * this.body * 0.45, this.body * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // Núcleo claro
        ctx.fillStyle = "rgba(255,255,255,.85)";
        ctx.beginPath();
        ctx.arc(backX, backY, this.body * 0.45, 0, Math.PI * 2);
        ctx.fill();

        if (form !== "normal") drawCrown(ctx, this.x, this.y - this.body * 2.6, this.body / 7);
    }
}

/** Coroa minimalista (contorno dourado), sempre "em pé" na tela. */
export function drawCrown(ctx, x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    ctx.strokeStyle = "#ffd84a";
    ctx.fillStyle = "rgba(255,216,74,.25)";
    ctx.lineWidth = 1.4;
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(-8, 4);
    ctx.lineTo(-8, -5);
    ctx.lineTo(-3.5, -1);
    ctx.lineTo(0, -8);
    ctx.lineTo(3.5, -1);
    ctx.lineTo(8, -5);
    ctx.lineTo(8, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
}
