// Shared by the button renderer and game physics. The docked mesh owns its contact surface.
const springs = new WeakMap();
export function getHomeSpring(pad) {
    if (springs.has(pad)) return springs.get(pad);
    const root = pad.closest(".sling-button");
    const fallback = pad.querySelector(".sling-button__fallback");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let contact = null, active = false, struck = -Infinity, fallbackMotion = null;
    function bounce() {
        if (reduced.matches) return;
        struck = performance.now();
        if (!root.hasAttribute("data-cube-field") && fallback) {
            fallbackMotion?.cancel();
            fallbackMotion = fallback.animate([
                { transform:"translateY(0) scale(1)" },
                { transform:"translateY(4px) scale(1.12,.78)", offset:.18 },
                { transform:"translateY(-3px) scale(.94,1.1)", offset:.48 },
                { transform:"translateY(0) scale(1)" }
            ], { duration:400, easing:"ease-in-out" });
        }
    }
    const spring = {
        get active() { return active; },
        get recoil() {
            const t = (performance.now()-struck)/1000;
            return t < .45 && !reduced.matches ? Math.sin(24*t)*Math.exp(-9*t)*(1-t/.45) : 0;
        },
        setContact(bounds) { contact = bounds; },
        surface() {
            active = true;
            const field = root.hasAttribute("data-cube-field");
            const box = field ? (root.dataset.cubePhase === "docked" ? contact : null) : fallback?.getBoundingClientRect();
            if (!box || box.right <= box.left || box.bottom <= 0 || box.top >= innerHeight) return null;
            return {id:pad, spring:true, bounce, left:box.left, right:box.right, top:box.top, bottom:box.bottom, edges:box.edges};
        },
        detach() { active = false; contact = null; struck = -Infinity; fallbackMotion?.cancel(); }
    };
    springs.set(pad, spring);
    return spring;
}
