// Feet are in viewport CSS pixels. The fixed simulation step uses original pixel units × scale.
export const step = 1 / 60;
const approach = (value, target, delta) => value + Math.sign(target - value) * Math.min(Math.abs(target - value), delta);
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function topAt(surface, x) {
    if (!surface.edges) return surface.top;
    let y = surface.bottom;
    for (const [a, b] of surface.edges) {
        if (x < Math.min(a.x, b.x) || x > Math.max(a.x, b.x)) continue;
        const t = a.x === b.x ? 0 : (x - a.x) / (b.x - a.x);
        y = Math.min(y, a.y + (b.y - a.y) * t);
    }
    return y;
}

export function createActor(x, y) {
    return { x, y, vx: 0, vy: 0, facing: 1, dashes: 1, stamina: 110, breathTime: 0, springLift: 0, support: null,
        grace: 0, buffer: 0, dashBuffer: 0, dashCooldown: 0, dashAttack: 0, dashSlide: false, dashTime: 0, dashAge: -1, dashX: 0, dashY: 0, dashStartX: x, dashStartY: y, refillDelay: 0, jumpHold: 0, kickLock: 0, pose: "idle" };
}

export function advance(p, input, surfaces, scale, width, height, exits = null, emitDust = null) {
    const dt = step, hw = 4 * scale, bodyHeight = 11 * scale;
    const wallAt = (x, dir, reach = 1.6) => surfaces.find(s => !s.edges && p.y > s.top + scale &&
        p.y - bodyHeight < s.bottom - scale &&
        Math.abs(x + dir * hw - (dir > 0 ? s.left : s.right)) <= reach * scale);
    const wallDir = wallAt(p.x, 1) ? 1 : wallAt(p.x, -1) ? -1 : 0;
    const grip = wallDir && input.grab && p.stamina > 0 && !p.support;
    p.buffer = input.jumpPressed ? .11 : Math.max(0, p.buffer - dt);
    p.grace = p.support ? .1 : Math.max(0, p.grace - dt);
    p.breathTime = Math.max(0,p.breathTime - dt);
    p.springLift = Math.max(0,p.springLift - dt);
    p.dashBuffer = input.dashPressed ? .08 : Math.max(0, p.dashBuffer - dt);
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.dashAttack = Math.max(0, p.dashAttack - dt);
    p.refillDelay = Math.max(0, p.refillDelay - dt);
    p.kickLock = Math.max(0, p.kickLock - dt);
    if (p.support) {
        if (!p.refillDelay) p.dashes = 1;
        p.stamina = 110;
    }
    if (p.dashAge >= 0) p.dashAge = p.dashAge < .44 ? p.dashAge + dt : -1;
    if (p.dashBuffer > 0 && p.dashes && !p.dashTime && !p.dashCooldown) {
        let dx = input.x, dy = input.y;
        if (!dx && !dy) dx = p.facing;
        const length = Math.hypot(dx, dy);
        p.dashAge = 0;
        p.dashStartX = p.x; p.dashStartY = p.y;
        p.dashX = dx / length; p.dashY = dy / length;
        const speed = 240 * scale / length;
        p.vx = dx * speed; p.vy = dy * speed;
        if (dx) p.facing = dx;
        p.dashes = 0; p.dashTime = .15; p.refillDelay = .1;
        p.dashCooldown = .2; p.dashAttack = .3; p.dashBuffer = 0; p.dashSlide = false;
        p.springLift = p.jumpHold = 0;
        if (dy !== 0) p.grace = 0;
        p.support = null;
    }
    // Dash attack outlasts the movement impulse. The jump buffer can survive a landing.
    const dashJump = p.buffer > 0 && p.dashAttack > 0;
    const launchOnFloor = dashJump && p.grace > 0 && p.dashX !== 0 && (p.dashY === 0 || p.dashSlide);
    const bounceWall = dashJump && p.dashY === -1 && p.dashX === 0 &&
        (wallDir || (wallAt(p.x, 1, 3) ? 1 : wallAt(p.x, -1, 3) ? -1 : 0));
    if (launchOnFloor || bounceWall) {
        const dir = bounceWall ? -bounceWall : input.x || Math.sign(p.dashX);
        const horizontal = bounceWall ? 170 : p.dashSlide ? 325 : 260;
        const vertical = bounceWall ? -160 : p.dashSlide ? -52.5 : -105;
        emitDust?.(bounceWall ? "wall" : "jump", p.x + (bounceWall || 0) * hw,
            p.y - (bounceWall ? 5 * scale : 0), dir, scale);
        p.facing = dir; p.vx = dir * horizontal * scale; p.vy = vertical * scale;
        p.jumpHold = bounceWall ? .25 : .2; p.kickLock = bounceWall ? .2 : 0;
        p.support = null; p.buffer = p.grace = p.dashTime = p.dashAttack = 0;
        p.dashSlide = false; p.dashAge = -1; p.pose = "jumpFast";
    } else if (p.dashTime > 0) {
        p.pose = "dash";
        p.dashTime = Math.max(0, p.dashTime - dt);
        if (!p.dashTime) {
            p.vx *= .7;
            if (p.vy < 0) p.vy *= .55;
        }
    } else {
        if (input.x && !p.kickLock) p.facing = input.x;
        const duck = p.support && input.y > 0;
        if (!p.kickLock) {
            const target = duck ? 0 : input.x * 90 * scale;
            const carryingSpeed = target * p.vx > 0 && Math.abs(p.vx) > Math.abs(target);
            const acceleration = carryingSpeed ? (p.support ? 400 : 260) : (p.support ? 1000 : 650);
            p.vx = approach(p.vx, target, acceleration * scale * dt);
        }
        if (grip) {
            p.facing = wallDir;
            p.vy = input.y * (input.y < 0 ? 45 : 65) * scale;
            p.stamina = Math.max(0, p.stamina - dt * (input.y < 0 ? 45 : input.y ? 0 : 10));
        } else {
            const sliding = wallDir && (input.x === wallDir || input.grab && !p.stamina) && p.vy > 0 && !p.support;
            const maxFall = sliding ? 52 : input.y > 0 ? 230 : 160;
            const gravity = (p.springLift > 0 || input.jump && p.jumpHold > 0) && p.vy < 0 ? 360 : 900;
            p.vy = approach(p.vy, maxFall * scale, gravity * scale * dt);
        }
        if (p.buffer && (p.grace || wallDir && !(input.grab && !p.stamina && input.x !== -wallDir))) {
            const wallJump = !p.grace && wallDir;
            emitDust?.(wallJump ? "wall" : "jump", p.x + (wallJump ? wallDir * hw : 0),
                p.y - (wallJump ? 5 * scale : 0), wallJump ? -wallDir : p.facing, scale);
            if (wallJump) {
                if (grip) p.stamina = Math.max(0, p.stamina - 27.5);
                p.vx = -wallDir * 126 * scale; p.kickLock = .14; p.facing = -wallDir;
            }
            p.vy = -113 * scale; p.jumpHold = .18;
            p.support = null; p.buffer = p.grace = p.dashAttack = 0;
        }
        if (!input.jump) {
            if (p.jumpHold && p.vy < -52 * scale) p.vy = -52 * scale;
            p.jumpHold = 0;
        }
        p.jumpHold = Math.max(0, p.jumpHold - dt);
        if (!p.support && wallDir && p.stamina <= 20 && input.grab) p.breathTime = 1.0;
        p.pose = grip ? (input.y < 0 ? "climbup" : "wallslide") :
            p.support ? (duck ? "duck" : Math.abs(p.vx) > 9 * scale ? "runFast" : p.breathTime > 0 ? "tired" : "idle") :
            p.vy < 0 ? "jumpFast" : wallDir && (input.x === wallDir || input.grab && !p.stamina) ? "wallslide" : "fallFast";
    }

    const handhold = grip && input.y < 0 && !p.dashTime && !input.jumpPressed && !input.dashPressed && wallAt(p.x,wallDir);
    if (handhold && p.y - handhold.top < 3 * scale) {
        p.x = clamp(p.x + wallDir * (hw + 2 * scale), hw, width - hw);
        p.y = handhold.top; p.vx = p.vy = 0; p.support = handhold.id; p.pose = "idle";
        return false;
    }
    const oldX = p.x, oldY = p.y;
    let nx = clamp(oldX + p.vx * dt, exits?.previous ? -hw : hw, exits?.next ? width + hw : width - hw);
    for (const s of surfaces) {
        if (s.edges || oldY <= s.top + scale || oldY - bodyHeight >= s.bottom - scale) continue;
        if (p.vx > 0 && oldX + hw <= s.left + .01 && nx + hw > s.left) { nx = s.left - hw; p.vx = 0; }
        if (p.vx < 0 && oldX - hw >= s.right - .01 && nx - hw < s.right) { nx = s.right + hw; p.vx = 0; }
    }
    p.x = nx;
    let ny = oldY + p.vy * dt, landed = null;
    if (p.vy >= 0) {
        const planted = p.support != null && surfaces.some(s => s.id === p.support && !s.edges &&
            p.x >= s.left-hw*.55 && p.x <= s.right+hw*.55 && Math.abs(oldY-s.top) <= 3*scale);
        const downThroughCubes = p.pose === "dash" && p.dashX === 0 && p.dashY === 1;
        for (const s of surfaces) {
            if (s.edges && (planted || downThroughCubes)) continue;
            if (p.x < s.left - hw * .55 || p.x > s.right + hw * .55) continue;
            const y = topAt(s, clamp(p.x, s.left + .001, s.right - .001));
            if (oldY > y + (s.id === p.support ? 3 * scale : 1) || ny < y - (s.id === p.support ? 3 * scale : 0)) continue;
            if (landed && (y > ny || (y === ny && (!landed.edges || s.edges)))) continue;
            ny = y; landed = s;
        }
    }
    p.y = ny;
    if (landed && p.support == null && p.vy > 72 * scale) emitDust?.("land", p.x, ny, p.facing, scale);
    p.support = landed?.id ?? null;
    if (landed?.spring) {
        p.vy = -185 * scale; p.vx *= .5; p.pose = "jumpFast";
        p.dashes = 1; p.stamina = 110; p.springLift = .2; p.dashAge = -1;
        p.jumpHold = p.dashAttack = p.dashTime = p.refillDelay = p.dashCooldown = p.grace = p.buffer = 0;
        p.support = null;
        landed.bounce();
    } else if (landed) {
        if (p.pose === "dash" && !p.dashSlide && p.dashX !== 0 && p.dashY > 0 && p.vy > 0) {
            p.dashSlide = true;
            p.vx *= 1.2;
        }
        p.vy = 0;
    }
    if (!exits?.next && p.y > height + bodyHeight) {
        const x = p.x;
        Object.assign(p, createActor(x, -2 * scale), { facing: p.facing, pose: "fallFast" });
        return true;
    }
    return false;
}
