// The page supplies the rooms. Side exits turn forward/back through the same vertical
// document, so there is no cloned layout or empty horizontal scroll area.
export function createRoomCamera() {
    const root = document.documentElement;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let enabled = false, move = null;
    const limit = () => Math.max(0, document.scrollingElement.scrollHeight - innerHeight);
    function scrollToY(y) {
        if (window.lenis?.scrollTo) window.lenis.scrollTo(y, {immediate:true, force:true});
        else window.scrollTo({top:y, behavior:"instant"});
    }
    function finish(trip) {
        if (move !== trip) return;
        cancelAnimationFrame(trip.frame);
        root.classList.remove("summit-room-pan");
        root.style.removeProperty("--summit-room-x");
        root.style.removeProperty("--summit-room-y");
        move = null;
    }
    function cancel() {
        if (!move) return;
        const trip = move;
        trip.view?.skipTransition();
        finish(trip);
    }
    function boundaries() {
        if (!enabled) return null;
        return {previous:scrollY > 2, next:scrollY < limit() - 2};
    }
    function cross(actor, scale, exits, paint) {
        if (!exits || move) return false;
        const h = innerHeight, w = innerWidth;
        let dx = 0, dy = 0;
        if (actor.y >= h + 2 * scale && actor.vy > 0 && exits.next) dy = 1;
        else if (actor.y <= 2 * scale && actor.vy < 0 && exits.previous) dy = -1;
        else if (actor.x > w && actor.vx > 0 && exits.next) dx = 1;
        else if (actor.x < 0 && actor.vx < 0 && exits.previous) dx = -1;
        if (!dx && !dy) return false;
        const start = scrollY;
        const target = Math.max(0, Math.min(limit(), start + (dy || dx) * (h - 20 * scale)));
        if (Math.abs(target - start) < 1) return false;
        const trip = {frame:0, view:null};
        move = trip;
        const fromX = actor.x, fromY = actor.y;
        const toX = dx > 0 ? 6*scale : dx < 0 ? w-6*scale : fromX;
        actor.support = null;
        function place(fraction) {
            if (move !== trip) return;
            scrollToY(start + (target-start)*fraction);
            actor.x = fromX + (toX-fromX)*fraction;
            actor.y = dx ? fromY : fromY - (scrollY-start);
            paint();
        }
        if (reduced.matches) { place(1); finish(trip); return true; }
        root.style.setProperty("--summit-room-x", dx * 100 + "vw");
        root.style.setProperty("--summit-room-y", (dy ? target - start : 0) + "px");
        root.classList.add("summit-room-pan");
        if (document.startViewTransition) {
            trip.view = document.startViewTransition(() => place(1));
            // A skipped snapshot still invokes the update callback in a visible document.
            trip.view.ready.catch(() => {});
            trip.view.finished.then(() => finish(trip), () => finish(trip));
        } else {
            const since = performance.now();
            function pan(now) {
                if (move !== trip) return;
                const t = Math.min(1,(now-since)/440);
                place(t*t*(3-2*t));
                if (t < 1) trip.frame = requestAnimationFrame(pan);
                else finish(trip);
            }
            trip.frame = requestAnimationFrame(pan);
        }
        return true;
    }
    function toggle() { cancel(); enabled = !enabled; return enabled; }
    return {toggle, boundaries, cross, cancel, get busy() { return !!move; }};
}
