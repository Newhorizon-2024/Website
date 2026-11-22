import { advance, clamp, createActor, step, topAt } from "./summit-motion.js?v=26.11.22.8";
import { createAvatar, loadSummitPack } from "./summit-avatar.js?v=26.11.22.8";
import { createEncounter, createEncounterView } from "./summit-encounter.js?v=26.11.22.8";

import { createDashEffect } from "./summit-dash.js?v=26.11.22.2";

import { createSpring } from "./summit-spring.js?v=26.11.22.8";
import { createCubeCrystal } from "./summit-field-items.js?v=26.11.22.8";

import { createDust } from "./summit-trail.js?v=26.11.22.6";
import { createRoomCamera } from "./summit-camera.js?v=26.11.22.8";
import { createBirdTutorial } from "./summit-tutorial.js?v=26.11.22.8";

const panels = "#navbar, #settings-section, .site-panel, .work-post, .creator-card, #countdown, #sponsor-section, #bounty-board-section.is-active :is(.wanted-poster, .bounty-page-link, .bounty-rank)";
const keys = {
    KeyA:"left", KeyD:"right",
    KeyW:"up", KeyS:"down",
    KeyC:"jump", Space:"jump", KeyX:"dash", KeyZ:"grab", KeyV:"grab", ShiftLeft:"grabDash"
};
const blockedPage = ".locked, .creator-lightbox-open, .wanted-lightbox-open, .is-another-world-focused, .is-another-world-obscured, .is-another-world-transitioning";

function isEditing(el) {
    return el instanceof Element && (el.isContentEditable ||
        Boolean(el.closest("input, textarea, select, [role=textbox], dialog[open], [aria-modal=true]")));
}
function supportsInput(event) {
    if (event.defaultPrevented || event.isComposing || event.metaKey || event.altKey || event.ctrlKey || isEditing(event.target)) return false;
    return !(event.code === "Space" && event.target instanceof Element &&
        event.target.closest("button:focus-visible, a:focus-visible, [role=button]:focus-visible, [role=slider]"));
}
function readPad() {
    try { return Array.from(navigator.getGamepads?.() || []).find(p => p?.connected && p.mapping === "standard"); }
    catch { return null; }
}
function rectOf(el) {
    const heading = el.matches("#bounty-board-section :is(.bounty-page-link, .bounty-rank)");
    let rect = el.getBoundingClientRect();
    if (heading && rect.height) {
        const range = document.createRange(); range.selectNodeContents(el);
        rect = range.getBoundingClientRect();
    }
    const {left,top,right,bottom,width,height} = rect;
    if (!width || !height || left >= innerWidth || right <= 0 || top > innerHeight + 48 || bottom < -64) return null;
    if (heading || el.id === "countdown" || el.classList.contains("wanted-poster")) {
        const style = getComputedStyle(el);
        if (style.visibility !== "visible" || (+style.opacity <= .01 && !el.classList.contains("is-wanted-decaying"))) return null;
    }
    return {id:el,left,top,right,bottom};
}

export async function createSummitGame() {
    const [skin,wildlife,tutorialArt] = await Promise.all([
        loadSummitPack("madeline"), loadSummitPack("wildlife"), loadSummitPack("tutorial")
    ]);
    const avatar = createAvatar(skin, tutorialArt);
    const dashEffect = createDashEffect(avatar.el, wildlife);
    const encounter = createEncounter();
    const encounterView = createEncounterView(wildlife, tutorialArt);
    const dust = createDust(tutorialArt);
    const camera = createRoomCamera();
    const tutorial = createBirdTutorial(encounterView.birdElement);
    let lastCaps = -Infinity;
    const spring = createSpring(tutorialArt, document.getElementById("back-to-home-pad"));
    const cubeCrystal = createCubeCrystal(wildlife);
    const hint = document.createElement("div");
    hint.className = "summit-game-hint";
    hint.setAttribute("role","status");
    hint.setAttribute("aria-live","polite");
    const navbar = document.getElementById("navbar");
    const held = new Set();
    let actor, intro = 0, frame = 0, last = 0, debt = 0, playing = false, disposed = false;
    let targets = [], nextScan = 0, support = null, launchScrolled = false, hintTimer;
    let jumpEdge = false, dashEdge = false, lastJump = false, lastDash = false, padIndex = null;
    let listeners = null;
    const scale = () => innerWidth >= 1024 ? 3 : 2;
    const showHint = msg => {
        clearTimeout(hintTimer);
        hint.textContent = msg;
        hint.classList.add("is-shown");
        hintTimer = setTimeout(() => hint.classList.remove("is-shown"), 5200);
    };
    function clearInput() {
        lastCaps = -Infinity;
        held.clear(); jumpEdge = dashEdge = lastJump = lastDash = false;
    }
    let drag = null, eatenClick = -1;
    function placeDraggedActor() {
        const size = scale();
        actor.x = clamp(drag.x + drag.dx, 4 * size, innerWidth - 4 * size);
        actor.y = clamp(drag.y + drag.dy, 12 * size, innerHeight - size);
    }
    function endDrag() {
        if (!drag) return;
        const id = drag.id;
        eatenClick = performance.now();
        drag = null;
        avatar.el.classList.remove("is-grabbed");
        document.documentElement.classList.remove("summit-dragging");
        if (document.documentElement.hasPointerCapture(id)) document.documentElement.releasePointerCapture(id);
        clearInput();
    }
    function beginDrag(event) {
        eatenClick = -1;
        if (!actor || intro < 1 || drag || camera.busy || event.pointerType !== "mouse" || event.button !== 0 ||
            !event.isPrimary || event.defaultPrevented || !avatar.hit(event.clientX,event.clientY)) return;
        const target = document.elementFromPoint(event.clientX,event.clientY);
        if (target?.closest("dialog, [aria-modal=true], #playlist-container, .volume-container")) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        drag = {id:event.pointerId,x:event.clientX,y:event.clientY,dx:actor.x-event.clientX,dy:actor.y-event.clientY};
        actor.vx = actor.vy = actor.dashTime = actor.jumpHold = actor.grace = actor.buffer = 0;
        actor.springLift = 0;
        actor.dashAge = -1;
        actor.dashBuffer = actor.dashAttack = 0; actor.dashSlide = false;
        actor.support = support = null;
        actor.pose = "idle";
        dashEffect.clear();
        avatar.el.classList.add("is-grabbed");
        document.documentElement.classList.add("summit-dragging");
        document.documentElement.setPointerCapture(event.pointerId);
        clearInput();
    }
    function moveDrag(event) {
        if (!drag || event.pointerId !== drag.id) return;
        if (event.type === "pointermove" && !(event.buttons & 1)) {endDrag();return;}
        event.stopPropagation();
        drag.x = event.clientX; drag.y = event.clientY;
        placeDraggedActor();
        avatar.draw(actor,scale(),0);
    }
    function releaseDrag(event) {
        if (!drag || event.pointerId !== drag.id) return;
        if (event.type === "pointerup") moveDrag(event);
        endDrag();
    }

    function keyDown(event) {
        if (drag || !supportsInput(event) || document.body.matches(blockedPage)) return;
        if (event.code === "CapsLock") {
            if (!event.repeat && !held.has(event.code)) {
                const now = performance.now();
                if (now-lastCaps <= 450) {
                    showHint(camera.toggle() ? "游戏视角已开启" : "游戏视角已关闭");
                    lastCaps = -Infinity;
                } else lastCaps = now;
            }
            held.add(event.code);
            return;
        }
        const action = keys[event.code];
        if (!action) return;
        if (!held.has(event.code) && !event.repeat) {
            if (action === "jump") jumpEdge = true;
            if (action === "dash" || action === "grabDash") dashEdge = true;
        }
        held.add(event.code);
        event.preventDefault();
    }
    function pollInput() {
        const pad = readPad();
        if ((pad?.index ?? null) !== padIndex) {
            if (pad || padIndex !== null) showHint(pad ? "手柄已连接" : "手柄已断开 · 键盘可继续操作");
            padIndex = pad?.index ?? null;
            lastJump = lastDash = false;
        }
        if (isEditing(document.activeElement)) {
            clearInput();
            return {x:0,y:0,jump:false,grab:false,jumpPressed:false,dashPressed:false};
        }
        const down = (...codes) => codes.some(k => held.has(k));
        const btn = i => Boolean(pad?.buttons[i]?.pressed);
        const axis = (v = 0) => Math.abs(v) >= .35 ? Math.sign(v) : 0;
        const sx = Number(down("KeyD") || btn(15)) - Number(down("KeyA") || btn(14));
        const sy = Number(down("KeyS") || btn(13)) - Number(down("KeyW") || btn(12));
        const pj = btn(0)||btn(3), pd = btn(1)||btn(2);
        const input = { x:sx || axis(pad?.axes[0]), y:sy || axis(pad?.axes[1]),
            jump:down("KeyC","Space") || pj, grab:down("KeyZ","KeyV","ShiftLeft") || [4,5,6,7].some(btn),
            jumpPressed:jumpEdge || (pj && !lastJump), dashPressed:dashEdge || (pd && !lastDash) };
        jumpEdge = dashEdge = false; lastJump = pj; lastDash = pd;
        return input;
    }
    function run(time) {
        frame = requestAnimationFrame(run);
        const elapsed = last ? (time-last)/1000 : 0;
        const dt = Math.min(elapsed, .08);
        last = time;
        const size = scale();
        if (camera.busy) { debt = 0; return; }
        if (!actor || intro < 1) {
            const r = navbar?.getBoundingClientRect();
            if (!r?.width) return;
            if (!actor && !launchScrolled && (r.top < Math.min(180,innerHeight*.35) || r.top > innerHeight - 16)) {
                launchScrolled = true;
                if (window.lenis?.scrollTo) window.lenis.scrollTo(navbar,{offset:-Math.round(innerHeight*.38),immediate:true});
                else navbar.scrollIntoView({block:"center",behavior:"instant"});
                return;
            }
            if (!actor) actor = createActor(-24*size, r.top);
            intro = Math.min(1, intro + dt / .76);
            const targetX = r.left + Math.min(r.width * .13, 28*size);
            actor.x = -24*size + (targetX + 24*size) * (1 - (1-intro)**1.45);
            actor.y = r.top - Math.sin(Math.PI*intro) * 26*size - (1-intro)*3*size;
            actor.pose = intro < .49 ? "jumpFast" : "fallFast";
            if (intro === 1) {
                actor.support = navbar; actor.pose = "idle"; support = rectOf(navbar);
                encounter.greet(navbar, size);
                encounterView.draw(encounter.visit, size);
                dust.emit("land", actor.x, actor.y, actor.facing, size);
            }
            avatar.draw(actor,size,dt);
            return;
        }

        if (time >= nextScan) { targets = Array.from(document.querySelectorAll(panels)); nextScan = time + 500; }
        const platforms = targets.map(rectOf).filter(Boolean);
        const coil = spring.surface(size);
        if (coil) platforms.push(coil);
        const cubes = window.NewHorizonBackgroundCubes?.platformsNear?.(actor.x, actor.y, 120*size) || [];
        platforms.push(...cubes);
        cubeCrystal.sample(window.NewHorizonBackgroundCubes,size,dt);
        if (actor.support !== null && support && actor.support === support.id) {
            const next = platforms.find(s => s.id === support.id);
            if (next && (!next.edges || (next.generation === support.generation && Math.abs(next.left - support.left) < 100))) {
                actor.x = clamp(actor.x + (next.left + next.right - support.left - support.right)/2,4*size,innerWidth-4*size);
                actor.y = topAt(next,clamp(actor.x,next.left+.001,next.right-.001));
            } else actor.support = null;
        }
        // Tutorial text stays up for real foreground time, even when physics drops frames.
        encounter.readTutorial(elapsed);
        const exits = camera.boundaries();
        debt += dt;
        while(debt >= step) {
            const input = pollInput();
            if (drag) placeDraggedActor();
            const takeoff = !drag && typeof actor.support === "string" && cubes.find(s => s.id === actor.support);
            const respawned = !drag && advance(actor,input,platforms,size,innerWidth,innerHeight,exits,dust.emit);
            if (takeoff && actor.support !== takeoff.id && !respawned) {
                const dash = actor.dashAge >= 0 && actor.dashTime > 0;
                const effort = dash ? .68 : actor.vy < 0 ? .48 : .12;
                window.NewHorizonBackgroundCubes?.kickPlatform?.(takeoff, -actor.vx*effort, -actor.vy*effort);
            }
            if (!drag && camera.cross(actor,size,exits,() => avatar.draw(actor,size,0))) {
                support = null; nextScan = 0; debt = 0;
                dashEffect.clear(); dust.clear();
                encounter.abandon(actor.x); encounterView.detach(); tutorial.detach(); cubeCrystal.detach();
                return;
            }
            if (respawned) {
                encounter.abandon(actor.x);
                dashEffect.clear();
            }
            encounter.update(actor,platforms,size,step,!drag);
            cubeCrystal.update(actor,size,step,!drag);
            avatar.draw(actor,size,step);
            dashEffect.draw(actor,size);
            dust.update(step);
            debt -= step;
        }
        encounterView.draw(encounter.visit,size);
        tutorial.draw(encounter.visit);
        cubeCrystal.draw(size);
        spring.draw(dt);
        support = actor.support === null ? null : platforms.find(s => s.id === actor.support);
    }
    let focused = document.hasFocus();
    function update() {
        const shown = playing && !disposed && !document.body.matches(blockedPage);
        const runNow = shown && focused && !document.hidden;
        if (shown && !avatar.el.isConnected) document.body.append(avatar.el,hint);
        if (runNow && !listeners) {
            listeners = new AbortController();
            const signal = listeners.signal;
            window.addEventListener("keydown",keyDown,{capture:true,signal});
            window.addEventListener("keyup",e=>held.delete(e.code),{capture:true,signal});
            window.addEventListener("focusin",e=>{if(isEditing(e.target)) clearInput();},{signal});
            window.addEventListener("contextmenu",clearInput,{signal});
            window.addEventListener("pointerdown",beginDrag,{capture:true,signal});
            window.addEventListener("click",e=>{
                if (e.detail && eatenClick >= 0 && performance.now()-eatenClick < 500) {
                    e.preventDefault();e.stopImmediatePropagation();eatenClick=-1;
                }
            },{capture:true,signal});
            window.addEventListener("pointermove",moveDrag,{capture:true,signal});
            window.addEventListener("pointerup",releaseDrag,{capture:true,signal});
            window.addEventListener("pointercancel",releaseDrag,{signal});
            // Browser chrome can revoke capture while the primary button is still held.
            window.addEventListener("lostpointercapture",e=>{if (!(e.buttons & 1)) releaseDrag(e);},{capture:true,signal});
            window.addEventListener("resize",camera.cancel,{signal});
            window.addEventListener("wheel",camera.cancel,{passive:true,signal});
            last = debt = nextScan = 0;
            frame = requestAnimationFrame(run);
        } else if (!runNow && listeners) {
            camera.cancel(); tutorial.suspend();
            cancelAnimationFrame(frame); frame = 0;
            listeners.abort(); listeners=null;
            endDrag();
            clearInput(); clearTimeout(hintTimer);
            hint.classList.remove("is-shown");
        }
        if (!shown) {
            dashEffect.detach(); dust.clear(); tutorial.detach();
            encounterView.detach();
            cubeCrystal.detach(); spring.detach();
            avatar.el.remove(); hint.remove();
        }
    }

    const lifecycle = new AbortController();
    const signal = lifecycle.signal;
    window.addEventListener("focus",()=>{focused=true;update();},{signal});
    window.addEventListener("blur",()=>{focused=false;update();},{signal});
    document.addEventListener("visibilitychange",()=>{focused=document.hasFocus();update();},{signal});
    const observer = new MutationObserver(update);
    observer.observe(document.body,{attributes:true,attributeFilter:["class"]});
    return {
        setPlaying(value) { playing=value; update(); },
        destroy() { disposed=true; update(); tutorial.destroy(); observer.disconnect(); lifecycle.abort(); }
    };
}
