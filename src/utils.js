import { FRAME_MS } from "./config.js";

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const rand = (min, max) => Math.random() * (max - min) + min;

export const lerp = (a, b, t) => a + (b - a) * t;

export function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Converte um fator de suavização "por frame a 60 FPS" para o dt real.
 * Ex.: x += (alvo - x) * 0.055 por frame  ->  x += (alvo - x) * smoothing(0.055, dt)
 */
export function smoothing(perFrame, dt) {
    return 1 - Math.pow(1 - perFrame, dt / FRAME_MS);
}

/** Formata números (Number ou BigInt) no padrão pt-BR; BigInt enorme vira notação científica. */
export function fmt(value) {
    if (typeof value === "bigint") {
        const negative = value < 0n;
        const text = (negative ? -value : value).toString();
        const sign = negative ? "-" : "";

        if (text.length <= 15) {
            return sign + Number(text).toLocaleString("pt-BR");
        }

        return sign + text[0] + "," + text.slice(1, 4) + "e" + (text.length - 1);
    }

    return Math.floor(value).toLocaleString("pt-BR");
}

/** Percentual (0–100, duas casas) entre dois BigInt sem perder precisão. */
export function percentBig(current, max) {
    if (max <= 0n || current <= 0n) return 0;
    if (current >= max) return 100;
    return Number((current * 10000n) / max) / 100;
}
