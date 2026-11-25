// Motor de pernas procedurais compartilhado por aranhas, mobs e bosses.
//
// Ideia:
// - Cada perna tem um "pé" fixo em um ponto do campo de pontos.
// - Quando o corpo se afasta demais, o pé dá um passo: escolhe o ponto do campo
//   mais próximo de uma posição à frente (antecipando o movimento) e interpola até lá.
// - O desenho usa IK de 2 segmentos (coxa + canela): o joelho é calculado pela
//   lei dos cossenos e dobra para fora do corpo.

import { nearestDot } from "../render/dotfield.js";
import { clamp, rand } from "../utils.js";

const TAU = Math.PI * 2;

function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export class Crawler {
    /**
     * @param {object} options
     * @param {number} options.legs     quantidade de pernas (par)
     * @param {number} options.reach    comprimento máximo da perna em px
     * @param {number} options.hip      distância do centro até a articulação do quadril
     * @param {number} [options.stepMs] duração de um passo
     */
    constructor({ legs, reach, hip, stepMs = 110 }) {
        this.reach = reach;
        this.hip = hip;
        this.stepMs = stepMs;
        this.prevX = null;
        this.prevY = null;
        this.vx = 0;
        this.vy = 0;
        this.setLegs(legs);
    }

    setLegs(count) {
        const perSide = Math.max(1, Math.floor(count / 2));
        this.legs = [];

        for (let i = 0; i < perSide * 2; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            const index = Math.floor(i / 2);
            const spread = perSide === 1 ? 0.5 : index / (perSide - 1);

            this.legs.push({
                side,
                // Distribui as pernas da frente (0.22 rad) até a traseira (π - 0.28 rad) de cada lado.
                angle: side * (0.22 + spread * (Math.PI - 0.5)),
                length: this.reach * rand(0.85, 1.08),
                // Grupos alternados (como em aranhas reais): vizinhas não pisam juntas.
                group: (index + (side > 0 ? 1 : 0)) % 2,
                foot: null,
                from: null,
                to: null,
                t: 1,
            });
        }
    }

    setReach(reach, hip) {
        const scale = reach / this.reach;
        this.reach = reach;
        this.hip = hip;
        for (const leg of this.legs) leg.length *= scale;
    }

    /** Solta todos os pés (ex.: após teletransporte/respawn). */
    reset() {
        this.prevX = null;
        for (const leg of this.legs) {
            leg.foot = null;
            leg.t = 1;
        }
    }

    pickFoothold(x, y, heading, leg) {
        // Lidera o passo na direção do movimento para a perna "abraçar" o caminho.
        const lead = clamp(Math.hypot(this.vx, this.vy) * 7, 0, leg.length * 0.6);
        const moveAngle = Math.atan2(this.vy, this.vx);
        const a = heading + leg.angle;

        const desiredX = x + Math.cos(a) * leg.length * 0.72 + Math.cos(moveAngle) * lead;
        const desiredY = y + Math.sin(a) * leg.length * 0.72 + Math.sin(moveAngle) * lead;

        const dot = nearestDot(desiredX, desiredY, leg.length * 0.3);
        return dot ? { x: dot.x, y: dot.y } : { x: desiredX, y: desiredY };
    }

    /**
     * @param {number} dt      ms desde o último frame
     * @param {number} x,y     posição do corpo
     * @param {number} heading direção do corpo em radianos
     */
    update(dt, x, y, heading) {
        if (this.prevX === null) {
            this.prevX = x;
            this.prevY = y;
        }

        // Velocidade em px por frame de 60 FPS (suavizada).
        const frames = Math.max(dt / 16.67, 0.001);
        this.vx = this.vx * 0.7 + ((x - this.prevX) / frames) * 0.3;
        this.vy = this.vy * 0.7 + ((y - this.prevY) / frames) * 0.3;
        this.prevX = x;
        this.prevY = y;

        let stepping = 0;
        const steppingGroups = [0, 0];

        for (const leg of this.legs) {
            if (leg.t < 1) {
                stepping++;
                steppingGroups[leg.group]++;
            }
        }

        // Quanto mais rápido o corpo, mais curtos os passos e mais pernas no ar ao mesmo tempo.
        const speed = Math.hypot(this.vx, this.vy);
        const stepMs = this.stepMs / (1 + speed * 0.12);
        const maxStepping = Math.max(2, Math.ceil(this.legs.length / (speed > 3 ? 2 : 3)));

        for (const leg of this.legs) {
            if (leg.t < 1) {
                leg.t = Math.min(1, leg.t + dt / stepMs);
                const e = easeInOut(leg.t);
                leg.foot.x = leg.from.x + (leg.to.x - leg.from.x) * e;
                leg.foot.y = leg.from.y + (leg.to.y - leg.from.y) * e;
                continue;
            }

            if (!leg.foot) {
                const spot = this.pickFoothold(x, y, heading, leg);
                leg.foot = { x: spot.x, y: spot.y };
                continue;
            }

            const hipX = x + Math.cos(heading + leg.angle) * this.hip;
            const hipY = y + Math.sin(heading + leg.angle) * this.hip;
            const stretch = Math.hypot(leg.foot.x - hipX, leg.foot.y - hipY);

            // Ideal: pé a ~70% do alcance, na direção natural da perna.
            const idealX = x + Math.cos(heading + leg.angle) * leg.length * 0.72;
            const idealY = y + Math.sin(heading + leg.angle) * leg.length * 0.72;
            const drift = Math.hypot(leg.foot.x - idealX, leg.foot.y - idealY);

            const overstretched = stretch > leg.length * 1.05;
            const wantsStep = overstretched || drift > leg.length * 0.45;
            if (!wantsStep) continue;

            // Muito esticada: passo obrigatório. Senão respeita o ritmo alternado.
            const otherGroup = 1 - leg.group;
            const allowed =
                stretch > leg.length * 1.2 ||
                (stepping < maxStepping && steppingGroups[otherGroup] === 0);
            if (!allowed) continue;

            const target = this.pickFoothold(x, y, heading, leg);
            leg.from = { x: leg.foot.x, y: leg.foot.y };
            leg.to = target;
            leg.t = 0;
            stepping++;
            steppingGroups[leg.group]++;
        }
    }

    /**
     * Desenha todas as pernas em poucos traços (um path por camada) para ser barato.
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx, x, y, heading, color, width = 1.2) {
        const thighs = new Path2D();
        const shins = new Path2D();
        const feet = new Path2D();

        for (const leg of this.legs) {
            if (!leg.foot) continue;

            const hipAngle = heading + leg.angle;
            const hipX = x + Math.cos(hipAngle) * this.hip;
            const hipY = y + Math.sin(hipAngle) * this.hip;

            const upper = leg.length * 0.58;
            const lower = leg.length * 0.58;

            const dx = leg.foot.x - hipX;
            const dy = leg.foot.y - hipY;
            const d = clamp(Math.hypot(dx, dy), 0.001, upper + lower - 0.001);
            const base = Math.atan2(dy, dx);

            // Lei dos cossenos: ângulo entre a linha quadril→pé e a coxa.
            const cos = clamp((upper * upper + d * d - lower * lower) / (2 * upper * d), -1, 1);
            const bend = Math.acos(cos);

            // Dobra para fora: o sinal acompanha o lado da perna.
            const kneeAngle = base + leg.side * bend;
            const kneeX = hipX + Math.cos(kneeAngle) * upper;
            const kneeY = hipY + Math.sin(kneeAngle) * upper;

            thighs.moveTo(hipX, hipY);
            thighs.quadraticCurveTo(
                (hipX + kneeX) / 2 + Math.cos(kneeAngle + leg.side * 1.2) * upper * 0.12,
                (hipY + kneeY) / 2 + Math.sin(kneeAngle + leg.side * 1.2) * upper * 0.12,
                kneeX,
                kneeY,
            );

            shins.moveTo(kneeX, kneeY);
            shins.lineTo(leg.foot.x, leg.foot.y);

            // Pé levantado (no meio do passo) não marca ponto no chão.
            if (leg.t >= 1) {
                feet.moveTo(leg.foot.x + 1.3, leg.foot.y);
                feet.arc(leg.foot.x, leg.foot.y, 1.3, 0, TAU);
            }
        }

        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = color;

        // Halo suave nas pernas (barato: só um traço largo e transparente).
        ctx.globalAlpha = 0.12;
        ctx.lineWidth = width * 2.6;
        ctx.stroke(thighs);

        ctx.globalAlpha = 1;
        ctx.lineWidth = width;
        ctx.stroke(thighs);

        ctx.globalAlpha = 0.85;
        ctx.lineWidth = width * 0.6;
        ctx.stroke(shins);
        ctx.globalAlpha = 1;

        ctx.fillStyle = color;
        ctx.fill(feet);
    }
}
