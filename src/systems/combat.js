// Escolha de alvo e ataques (manual e automático).

import { MELEE_RANGE, RANGED_RANGE } from "../config.js";
import { game, world } from "../state.js";
import { burst, strand } from "../render/effects.js";
import { distance } from "../utils.js";
import { Projectile } from "../entities/projectile.js";

function hasBoss() {
    return game.boss && !game.boss.dead;
}

function chooseTarget(spider) {
    // Boss tem prioridade
    if (hasBoss()) return game.boss;

    let list = world.mobs.filter((mob) => !mob.dead);

    // A segunda aranha não ataca o mesmo mob da primeira.
    const first = world.spiders[0];
    if (spider.id === 2 && first && first.target && !first.target.isBoss) {
        list = list.filter((target) => target !== first.target);
    }

    let closest = null;
    let closestDistance = Infinity;

    for (const target of list) {
        const current = distance(spider, target);
        if (current < closestDistance) {
            closest = target;
            closestDistance = current;
        }
    }

    return closest;
}

function attackDamage(automatic) {
    if (!automatic) return game.damage;
    return (game.damage * BigInt(game.autoPower)) / 100n;
}

export function attack(spider, automatic = false) {
    if (spider.dead) return;

    const target = chooseTarget(spider);
    spider.target = target;
    if (!target) return;

    const targetDistance = distance(spider, target);
    const damage = attackDamage(automatic);

    if (targetDistance <= MELEE_RANGE) {
        const color = spider.color();
        strand(spider, target, color);
        burst(target.x, target.y, color, 4, 1.4);
        target.takeDamage(damage);
        return;
    }

    if (game.rangedUnlocked && targetDistance <= RANGED_RANGE) {
        world.projectiles.push(new Projectile(spider, target, damage));
    }
}

export function attackAll(automatic) {
    world.spiders.forEach((spider) => attack(spider, automatic));
}

export function autoAttack(now) {
    if (!game.autoUnlocked) return;
    if (now - game.lastAuto < game.autoInterval) return;

    game.lastAuto = now;
    attackAll(true);
}
