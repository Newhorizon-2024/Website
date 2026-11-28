import { trackWaveforms } from "./track-waveforms-data.js?v=26.11.28.4";

// 每个时间窗结合整体 RMS 与最强短音节。声道分别累加，反相立体声也能保留响度。
function measureWaveform(buffer) {
    const count = Math.min(512, buffer.length);
    const levels = new Float32Array(count);
    const channels = Array.from({length: buffer.numberOfChannels}, (_, i) => buffer.getChannelData(i));
    const hop = Math.max(1, Math.round(buffer.sampleRate * .04));
    for (let i = 0; i < count; i++) {
        const start = Math.floor(i * buffer.length / count);
        const end = Math.floor((i + 1) * buffer.length / count);
        let total = 0, loudest = 0;
        for (let pos = start; pos < end; pos += hop) {
            const stop = Math.min(end, pos + hop);
            let energy = 0;
            for (const samples of channels) {
                for (let k = pos; k < stop; k++) energy += samples[k] * samples[k];
            }
            energy /= channels.length;
            total += energy;
            loudest = Math.max(loudest, energy / (stop - pos));
        }
        levels[i] = .78 * Math.sqrt(total / (end - start)) + .22 * Math.sqrt(loudest);
    }
    const sorted = levels.slice().sort();
    const reference = Math.max(.002, sorted[Math.floor(count * .985)] || 0);
    return Uint8Array.from(levels, value => Math.round(255 * Math.min(1, value / reference) ** .88));
}

// 已收录曲目直接使用随站发布的数据。新素材在首次取得时长后本地解码。
export function initializeTrackWaveform(audio, canvas) {
    const pen = canvas?.getContext("2d");
    if (!audio || !pen) return;
    const catalog = new Map(Object.entries(trackWaveforms).map(([path, row]) => [new URL(path, document.baseURI).href, row]));
    const recent = new Map();
    const events = new AbortController();
    let width = 0, height = 0, columns = new Float32Array(0), peaks = null;
    let key = "", origin = "", pending = null, lastSplit = -1, visible = true;
    let decodeQueue = Promise.resolve();

    function paint(force = false) {
        if (!visible || !width || !height) return;
        const progress = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.currentTime / audio.duration : 0;
        const split = Math.round(progress * columns.length);
        if (!force && split === lastSplit) return;
        lastSplit = split;
        pen.clearRect(0, 0, width, height);
        const step = width / columns.length;
        for (let i = 0; i < columns.length; i++) {
            const h = columns[i] * (height - 1);
            if (h < .5) continue;
            pen.fillStyle = i < split ? "rgba(234,236,238,.78)" : "rgba(198,203,209,.43)";
            pen.fillRect(i * step, height - h, Math.max(1, step - 1), h);
        }
    }

    function rebuild() {
        const count = peaks ? Math.min(peaks.length, Math.max(1, Math.floor(width / 3.4))) : 0;
        columns = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            const a = Math.floor(i * peaks.length / count);
            const b = Math.floor((i + 1) * peaks.length / count);
            let energy = 0;
            for (let j = a; j < b; j++) energy += peaks[j] ** 2;
            columns[i] = Math.sqrt(energy / (b - a)) / 255;
        }
        paint(true);
    }

    function resize() {
        width = canvas.clientWidth;
        height = canvas.clientHeight;
        const ratio = Math.min(devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        pen.setTransform(ratio, 0, 0, ratio, 0, 0);
        rebuild();
    }

    function cancel() {
        pending?.abort();
        pending = null;
    }

    function select() {
        const url = audio.getAttribute("src") ? audio.src : audio.currentSrc || audio.querySelector("source[src]")?.src || "";
        const duration = audio.currentSrc === url && Number.isFinite(audio.duration) ? audio.duration : 0;
        if (url !== key) {
            cancel();
            key = url;
            origin = "";
            peaks = null;
            rebuild();
        }
        if (!url) return;
        const row = catalog.get(url);
        if (row && (!duration || Math.abs(duration - row[0]) <= Math.max(.5, duration * .001))) {
            if (origin !== "catalog") {
                cancel();
                origin = "catalog";
                peaks = Uint8Array.from(atob(row[1]), char => char.charCodeAt(0));
                rebuild();
            }
            return;
        }
        if (origin === "catalog") { origin = ""; peaks = null; rebuild(); }
        if (!duration || pending || origin === "decoded" || origin === "unavailable") return;
        const cached = recent.get(url);
        if (cached && Math.abs(cached.duration - duration) < .5) {
            origin = "decoded";
            peaks = cached.peaks;
            rebuild();
            return;
        }
        const request = new AbortController();
        pending = request;
        // decodeAudioData 本身无法中止。串行处理，快速切歌时丢弃过期结果。
        decodeQueue = decodeQueue.then(async () => {
            if (request.signal.aborted) return;
            const response = await fetch(url, { signal: request.signal });
            if (!response.ok) throw Error("Audio " + response.status);
            const bytes = await response.arrayBuffer();
            if (request.signal.aborted) return;
            const offline = new OfflineAudioContext(2, 1, 16000);
            const buffer = await offline.decodeAudioData(bytes);
            if (request.signal.aborted) return;
            peaks = measureWaveform(buffer);
            origin = "decoded";
            recent.set(url, { duration, peaks });
            if (recent.size > 8) recent.delete(recent.keys().next().value);
            rebuild();
        }).catch(() => {
            if (!request.signal.aborted) origin = "unavailable";
        }).finally(() => {
            if (pending === request) pending = null;
        });
    }

    const listen = (target, type, fn) => target.addEventListener(type, fn, { signal: events.signal });
    for (const type of ["loadstart", "loadedmetadata", "durationchange", "emptied"]) listen(audio, type, select);
    for (const type of ["timeupdate", "seeking", "seeked"]) listen(audio, type, () => paint());
    const size = new ResizeObserver(resize);
    const sight = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) paint(true);
    });
    size.observe(canvas);
    sight.observe(canvas);
    listen(window, "pagehide", event => {
        cancel();
        if (!event.persisted) { size.disconnect(); sight.disconnect(); events.abort(); }
    });
    listen(window, "pageshow", select);
    resize();
    select();
}
