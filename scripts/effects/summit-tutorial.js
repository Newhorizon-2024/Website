const bindings = [
    ["W A S D", "移动 / 冲刺方向，S 下蹲"], ["C / 空格", "跳跃"],
    ["X", "冲刺"], ["Z / V", "抓墙，W / S 攀爬"],
    ["左 Shift", "冲刺 / 按住抓墙"], ["鼠标", "拖动 Madeline"],
    ["方向键", "滚动网页"], ["Caps Lock", "双击大写键开启/关闭游戏视角"]
];
export function createBirdTutorial() {
    const bubble = document.createElement("aside");
    bubble.className = "summit-bird-bubble";
    bubble.setAttribute("role", "status");
    bubble.setAttribute("aria-live", "polite");
    const keys = document.createElement("div");
    keys.className = "summit-bird-controls";
    for (const [key, label] of bindings) {
        const row = document.createElement("span");
        const cap = document.createElement("kbd");
        cap.textContent = key;
        row.append(cap, document.createTextNode(label));
        keys.append(row);
    }
    const controller = document.createElement("span");
    controller.className = "summit-bird-gamepad";
    controller.textContent = "手柄 · 左摇杆 / 十字键移动　A / Y 跳跃　X / B 冲刺　肩键 / 扳机抓墙";
    keys.append(controller);
    const farewell = document.createTextNode("如果喜欢这个游戏，就去游玩原作吧！");
    const music = document.getElementById("background-music");
    const chirp = new Audio(new URL("./summit-local/bird-chirp.wav", import.meta.url).href);
    chirp.preload = "auto";
    let page = "", sounded = false;
    function volume() { chirp.volume = (music?.volume ?? 1) * .54; chirp.muted = Boolean(music?.muted); }
    music?.addEventListener("volumechange", volume);
    function draw(visit, scale) {
        const b = visit?.bird;
        if (!visit?.tutorial || b.phase !== "perched") { detach(); return; }
        const next = b.clock < 6 ? "controls" : "farewell";
        if (next !== page || !bubble.isConnected) {
            bubble.dataset.page = page = next;
            bubble.replaceChildren(next === "controls" ? keys : farewell);
            document.body.append(bubble);
        }
        if (!sounded) {
            sounded = true;
            volume();
            if (!chirp.muted && chirp.volume > 0) chirp.play().catch(() => {});
        }
        // A clipped perch can move during ordinary scrolling. Keep the pointer on the bird.
        const width = bubble.offsetWidth;
        const x = Math.max(6, Math.min(innerWidth - width - 6, b.x - width * .73));
        bubble.style.left = Math.round(x) + "px";
        bubble.style.bottom = Math.max(4, innerHeight - b.y + 11*scale) + "px";
        bubble.style.setProperty("--beak", Math.max(8,Math.min(width-16,b.x-x)) + "px");
    }
    function detach() { if (bubble.isConnected) bubble.remove(); }
    function suspend() { chirp.pause(); }
    function destroy() { suspend(); detach(); music?.removeEventListener("volumechange", volume); }
    return {draw, detach, suspend, destroy};
}
