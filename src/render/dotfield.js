// Campo de pontos do cenário.
// Além de decorar, é a "superfície" onde as pernas procedurais se apoiam:
// cada pé procura o ponto mais próximo de onde quer pisar (busca via grade espacial).

import { REDUCED_MOTION } from "../config.js";
import { clamp, rand } from "../utils.js";

const CELL = 48;
const AREA_PER_DOT = 700; // px² por ponto → densidade parecida em qualquer tela

let dots = [];
let grid = new Map();
let layer = null; // canvas offscreen com os pontos estáticos

function cellKey(cx, cy) {
    return cx * 73856093 ^ cy * 19349663;
}

export function buildDotField(view) {
    const count = Math.round(clamp((view.W * view.H) / AREA_PER_DOT, 250, 2200));

    dots = Array.from({ length: count }, () => ({
        x: Math.random() * view.W,
        y: Math.random() * view.H,
        r: rand(0.5, 1.25),
        a: rand(0.18, 0.5),
    }));

    grid = new Map();
    for (const dot of dots) {
        const key = cellKey(Math.floor(dot.x / CELL), Math.floor(dot.y / CELL));
        let bucket = grid.get(key);
        if (!bucket) grid.set(key, (bucket = []));
        bucket.push(dot);
    }

    renderLayer(view);
}

function renderLayer(view) {
    layer = document.createElement("canvas");
    layer.width = Math.round(view.W * view.dpr);
    layer.height = Math.round(view.H * view.dpr);

    const g = layer.getContext("2d");
    g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);

    // Vinheta muito sutil: o centro é levemente menos escuro.
    const vignette = g.createRadialGradient(
        view.W / 2, view.H / 2, 0,
        view.W / 2, view.H / 2, Math.max(view.W, view.H) * 0.75,
    );
    vignette.addColorStop(0, "#07080c");
    vignette.addColorStop(1, "#000000");
    g.fillStyle = vignette;
    g.fillRect(0, 0, view.W, view.H);

    g.fillStyle = "#e8ecf5";
    for (const dot of dots) {
        g.globalAlpha = dot.a;
        g.beginPath();
        g.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        g.fill();
    }
    g.globalAlpha = 1;
}

/** Itera sobre os pontos num raio aproximado (células cobertas pelo círculo). */
function forEachNear(x, y, radius, callback) {
    const minX = Math.floor((x - radius) / CELL);
    const maxX = Math.floor((x + radius) / CELL);
    const minY = Math.floor((y - radius) / CELL);
    const maxY = Math.floor((y + radius) / CELL);

    for (let cx = minX; cx <= maxX; cx++) {
        for (let cy = minY; cy <= maxY; cy++) {
            const bucket = grid.get(cellKey(cx, cy));
            if (bucket) for (const dot of bucket) callback(dot);
        }
    }
}

/** Ponto do campo mais próximo de (x, y) dentro de maxRadius, ou null. */
export function nearestDot(x, y, maxRadius) {
    let best = null;
    let bestD2 = maxRadius * maxRadius;

    forEachNear(x, y, maxRadius, (dot) => {
        const dx = dot.x - x;
        const dy = dot.y - y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) {
            bestD2 = d2;
            best = dot;
        }
    });

    return best;
}

export function drawDotField(ctx, view) {
    if (layer) ctx.drawImage(layer, 0, 0, view.W, view.H);
    else {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, view.W, view.H);
    }
}

/** Acende os pontos ao redor de uma criatura (efeito de "sentir" a teia). */
export function drawDotHighlight(ctx, x, y, radius, color) {
    if (REDUCED_MOTION) return;

    ctx.fillStyle = color;
    forEachNear(x, y, radius, (dot) => {
        const dx = dot.x - x;
        const dy = dot.y - y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > radius) return;

        ctx.globalAlpha = (1 - d / radius) * 0.7;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r + 0.4, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}
