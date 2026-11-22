const bindings = [
    ["W A S D", "移动 / 冲刺方向"], ["C / 空格", "跳跃"],
    ["左 Shift", "冲刺 / 按住抓墙"], ["鼠标", "拖动 Madeline"],
    ["Caps Lock", "双击大写键开启/关闭游戏视角"]
];
export function createBirdTutorial(birdElement) {
    const bubble = document.createElement("aside");
    bubble.className = "summit-bird-bubble";
    bubble.setAttribute("role", "status");
    bubble.setAttribute("aria-live", "polite");
    const message = document.createElement("div");
    message.className = "summit-bird-message";
    bubble.append(message);
    const keys = document.createElement("div");
    keys.className = "summit-bird-controls";
    for (const [key, label] of bindings) {
        const row = document.createElement("span");
        const cap = document.createElement("kbd");
        cap.textContent = key;
        row.append(cap, document.createTextNode(label));
        keys.append(row);
    }
    const farewell = document.createTextNode("如果喜欢这个游戏，就去游玩原作吧！");
    const music = document.getElementById("background-music");
    const chirp = new Audio(new URL("./summit-local/bird-chirp.wav", import.meta.url).href);
    chirp.preload = "auto";
    let page = "", sounded = false;
    function volume() { chirp.volume = (music?.volume ?? 1) * .54; chirp.muted = Boolean(music?.muted); }
    music?.addEventListener("volumechange", volume);
    function position() {
        const bird = birdElement.getBoundingClientRect();
        const viewport = document.documentElement;
        const pad = 8, clearance = 14; // Includes the pixel tail and its shadow.
        const preferredWidth = bubble.offsetWidth;
        const chrome = bubble.offsetHeight - message.offsetHeight;
        const height = message.scrollHeight + chrome;
        const cx = (bird.left + bird.right) / 2, cy = (bird.top + bird.bottom) / 2;
        const above = bird.top - pad - clearance, below = viewport.clientHeight - pad - bird.bottom - clearance;
        let side;
        if (above >= height) side = "above";
        else if (below >= height) side = "below";
        else if (bird.left >= preferredWidth + clearance + pad) side = "left";
        else if (viewport.clientWidth - bird.right >= preferredWidth + clearance + pad) side = "right";
        else side = above >= below ? "above" : "below";
        function fitHeight(available) {
            const clipped = available < height;
            message.style.maxHeight = clipped ? Math.max(0, Math.floor(available - chrome)) + "px" : "";
            bubble.classList.toggle("is-clipped", clipped);
        }
        let vertical = side === "above" || side === "below";
        fitHeight(vertical ? (side === "above" ? above : below) : viewport.clientHeight - 2*pad);
        // A native scrollbar may change the measured width on Windows.
        if (!vertical && bubble.offsetWidth + clearance + pad > (side === "left" ? bird.left : viewport.clientWidth-bird.right)) {
            side = above >= below ? "above" : "below";
            vertical = true;
            fitHeight(side === "above" ? above : below);
        }
        const width = bubble.offsetWidth, actualHeight = bubble.offsetHeight;
        const bound = (v, low, high) => Math.max(low, Math.min(v, high));
        const x = vertical ? bound(cx - width*.73, pad, viewport.clientWidth-width-pad) :
            side === "left" ? bird.left-clearance-width : bird.right+clearance;
        const y = vertical ? (side === "above" ? bird.top-clearance-actualHeight : bird.bottom+clearance) :
            bound(cy-actualHeight/2, pad, viewport.clientHeight-actualHeight-pad);
        bubble.dataset.side = side;
        bubble.style.left = Math.round(x) + "px";
        bubble.style.top = Math.round(y) + "px";
        const tip = vertical ? bound(cx-x-5, 6, width-16) : bound(cy-y-5, 6, actualHeight-16);
        bubble.style.setProperty("--beak", Math.round(tip) + "px");
    }
    function draw(visit) {
        if (!visit?.tutorial || visit.bird.phase !== "perched") { detach(); return; }
        if (!visit.guidePage) { detach(); return; }
        if (!sounded) {
            sounded = true;
            volume();
            if (!chirp.muted && chirp.volume > 0) chirp.play().catch(() => {});
        }
        if (visit.guidePage !== page || !bubble.isConnected) {
            bubble.dataset.page = page = visit.guidePage;
            message.replaceChildren(page === "controls" ? keys : farewell);
            message.scrollTop = 0;
            document.body.append(bubble);
        }
        position();
    }
    function detach() { if (bubble.isConnected) bubble.remove(); }
    function suspend() { chirp.pause(); }
    function destroy() { suspend(); detach(); music?.removeEventListener("volumechange", volume); }
    return {draw, detach, suspend, destroy};
}
