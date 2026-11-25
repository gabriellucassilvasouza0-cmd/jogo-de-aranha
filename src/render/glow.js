// Sprites de brilho pré-renderizados.
// Substituem ctx.shadowBlur, que é caro (principalmente no celular) quando usado a cada frame.

const SPRITE_SIZE = 64;
const MAX_CACHE = 160;
const cache = new Map();

function makeSprite(color) {
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = SPRITE_SIZE;

    const g = sprite.getContext("2d");
    const r = SPRITE_SIZE / 2;
    const gradient = g.createRadialGradient(r, r, 0, r, r, r);

    gradient.addColorStop(0, color);
    gradient.addColorStop(0.25, color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");

    g.globalAlpha = 0.55;
    g.fillStyle = gradient;
    g.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);

    return sprite;
}

export function glowSprite(color) {
    let sprite = cache.get(color);

    if (!sprite) {
        // Cache simples com limite: cores de mobs variam por tier e não podem crescer sem fim.
        if (cache.size >= MAX_CACHE) cache.clear();
        sprite = makeSprite(color);
        cache.set(color, sprite);
    }

    return sprite;
}

/** Desenha um halo de raio `radius` centrado em (x, y), somando luz ao fundo. */
export function drawGlow(ctx, x, y, radius, color, alpha = 1) {
    const sprite = glowSprite(color);
    const previousOp = ctx.globalCompositeOperation;
    const previousAlpha = ctx.globalAlpha;

    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);

    ctx.globalCompositeOperation = previousOp;
    ctx.globalAlpha = previousAlpha;
}
