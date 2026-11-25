// Canvas principal com suporte a telas de alta densidade (devicePixelRatio).
// Toda a lógica trabalha em pixels CSS (view.W x view.H); o ctx já vem escalado.

export const canvas = document.getElementById("game");
export const ctx = canvas.getContext("2d");

export const view = { W: innerWidth, H: innerHeight, dpr: 1 };

const resizeListeners = [];

export function onResize(callback) {
    resizeListeners.push(callback);
}

function resize() {
    // Limitado a 2: acima disso o custo de preenchimento cresce sem ganho visível.
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    view.W = innerWidth;
    view.H = innerHeight;

    canvas.width = Math.round(view.W * view.dpr);
    canvas.height = Math.round(view.H * view.dpr);
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);

    for (const callback of resizeListeners) callback(view);
}

addEventListener("resize", resize);

export function initCanvas() {
    resize();
}
