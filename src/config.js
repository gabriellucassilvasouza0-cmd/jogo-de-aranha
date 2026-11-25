// Constantes de balanceamento e configuração.
// Mudar SAVE_KEY invalida os saves existentes dos jogadores.

export const SAVE_KEY = "spider_evolution_clean_v1";

export const BOSS_INTERVAL = 200;
export const RANGED_LEVEL = 100;
export const BASE_MOB_COUNT = 12;

export const MELEE_RANGE = 92;
export const RANGED_RANGE = 900;

export const AUTO_START_MS = 650;
export const AUTO_MIN_MS = 70;

export const BASE_GOAL_LEVEL = 1_000_000;

// Duração de um frame a 60 FPS. A lógica original foi calibrada por frame;
// multiplicamos por (dt / FRAME_MS) para manter a mesma velocidade em qualquer taxa de atualização.
export const FRAME_MS = 1000 / 60;

export const HUD_INTERVAL_MS = 140;
export const SAVE_INTERVAL_MS = 5000;

export const REDUCED_MOTION =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
