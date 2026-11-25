// Efeitos visuais de curta duração: textos de dano, partículas e fios de teia.
// Tudo baseado em tempo (ms), independente da taxa de quadros.

import { REDUCED_MOTION } from "../config.js";
import { rand } from "../utils.js";

const floats = [];
const particles = [];
const strands = [];

const FLOAT_LIFE = 750;
const MAX_PARTICLES = REDUCED_MOTION ? 80 : 400;

export function floatText(x, y, text, color = "#ffffff") {
    floats.push({ x, y, text, color, life: FLOAT_LIFE });
}

/** Explosão de partículas (morte de mob, golpe). */
export function burst(x, y, color, count = 14, speed = 2.4) {
    const amount = REDUCED_MOTION ? Math.ceil(count / 3) : count;

    for (let i = 0; i < amount && particles.length < MAX_PARTICLES; i++) {
        const angle = rand(0, Math.PI * 2);
        const velocity = rand(0.3, 1) * speed * 0.06; // px/ms
        const life = rand(350, 700);

        particles.push({
            x,
            y,
            vx: Math.cos(angle) * velocity,
            vy: Math.sin(angle) * velocity,
            life,
            max: life,
            size: rand(0.8, 2),
            color,
        });
    }
}

/** Fio de teia instantâneo entre dois pontos (ataque corpo a corpo). */
export function strand(from, to, color) {
    strands.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, color, life: 160, max: 160 });
}

export function updateEffects(dt) {
    for (let i = floats.length - 1; i >= 0; i--) {
        const item = floats[i];
        item.y -= 0.033 * dt;
        item.life -= dt;
        if (item.life <= 0) floats.splice(i, 1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = strands.length - 1; i >= 0; i--) {
        strands[i].life -= dt;
        if (strands[i].life <= 0) strands.splice(i, 1);
    }
}

/** Fios e partículas ficam abaixo das criaturas. */
export function drawEffectsBelow(ctx) {
    ctx.lineCap = "round";

    for (const s of strands) {
        const t = s.life / s.max;
        ctx.globalAlpha = t;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1 + t;
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        // Leve curvatura: um fio de seda nunca é perfeitamente reto.
        const mx = (s.x1 + s.x2) / 2 + (s.y2 - s.y1) * 0.08;
        const my = (s.y1 + s.y2) / 2 - (s.x2 - s.x1) * 0.08;
        ctx.quadraticCurveTo(mx, my, s.x2, s.y2);
        ctx.stroke();
    }

    for (const p of particles) {
        ctx.globalAlpha = p.life / p.max;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }

    ctx.globalAlpha = 1;
}

/** Textos de dano ficam por cima de tudo. */
export function drawFloats(ctx) {
    ctx.font = "600 12px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";

    for (const item of floats) {
        ctx.globalAlpha = Math.max(0, item.life / FLOAT_LIFE);
        ctx.fillStyle = item.color;
        ctx.fillText(item.text, item.x, item.y);
    }

    ctx.globalAlpha = 1;
}
