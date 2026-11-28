// Display order follows the labels' pinyin (A–Z), with Latin names in the same sequence.
const choices = [
    ["shade", "暗幕"], ["eyes", "Bossrush"], ["flash", "方块闪光"],
    ["cubes", "方块速度"], ["sparks", "火花"], ["flame", "火焰"],
    ["snow", "落雪与积雪"], ["game", "Madeline 小游戏"], ["wave", "音频响应"]
];
const levels = { eyes: 4, cubes: 4 };
let custom = null;
let enabled = true;

function selection(song) {
    if (custom) return custom;
    if (song?.visualEffect === "pixel-snow") return new Set(["snow", "flash", "game"]);
    if (song?.visualEffect === "shadowflame") return new Set(["flame", "sparks"]);
    if (song?.speedMultiplier > 1) return new Set(["eyes", "shade", "wave", "cubes"]);
    return new Set();
}

export function effectLevel(key, song) {
    return custom ? levels[key] : song?.speedMultiplier || 4;
}

export function songEffects(song) {
    const active = enabled ? new Set(selection(song)) : new Set();
    if (active.has("snow")) active.add("banks");
    return active;
}

export function initializeEffectMenu(getSong, onChange) {
    const panel = document.getElementById("song-effects-menu");
    const button = document.getElementById("song-effects-btn");
    if (!panel || !button) return;
    function checkbox(key, text, parent) {
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.value = key;
        label.append(input, document.createTextNode(text));
        parent.append(label);
        return input;
    }
    const settings = panel.querySelector(".effect-switches");
    const master = checkbox("enabled", "启用播放特效", settings);
    const auto = checkbox("auto", "跟随当前歌曲", settings);
    const options = panel.querySelector(".effect-options");
    const inputs = new Map(), selectors = new Map();
    for (const [key, text] of choices) {
        const row = document.createElement("div");
        inputs.set(key, checkbox(key, text, row));
        if (Object.hasOwn(levels, key)) {
            const select = document.createElement("select");
            select.setAttribute("aria-label", text + "档位");
            select.dataset.level = key;
            for (const n of [1, 2, 3, 4]) select.add(new Option(n + " 档", String(n * 2)));
            selectors.set(key, select);
            row.append(select);
        }
        options.append(row);
    }
    function paint() {
        const song = getSong();
        master.checked = enabled;
        auto.checked = custom === null;
        const selected = selection(song);
        for (const [key, input] of inputs) input.checked = selected.has(key);
        for (const [key, select] of selectors) select.value = String(effectLevel(key, song));
    }
    function customize() {
        if (custom) return;
        const song = getSong();
        for (const key of selectors.keys()) levels[key] = effectLevel(key, song);
        custom = new Set(selection(song));
    }
    panel.addEventListener("change", ({target}) => {
        if (target === master) enabled = master.checked;
        else if (target === auto && auto.checked) custom = null;
        else {
            customize();
            if (target.dataset.level) {
                levels[target.dataset.level] = Number(target.value);
                custom.add(target.dataset.level);
            } else if (target !== auto) {
                if (target.checked) custom.add(target.value);
                else custom.delete(target.value);
            }
        }
        paint();
        onChange();
    });
    button.addEventListener("click", () => {
        panel.hidden = !panel.hidden;
        button.setAttribute("aria-expanded", String(!panel.hidden));
        paint();
    });
    paint();
    return paint;
}
