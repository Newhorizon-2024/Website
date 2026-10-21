/* Seeded, seekable exposure envelopes. Eight variable cycles share a block
 * so random access is bounded: no timers, frame loop or growing history. */
(() => {
    'use strict';
    const BLOCK_SECONDS = 80;
    const CYCLES_PER_BLOCK = 8;
    const smooth = x => {
        const v = Math.min(1, Math.max(0, x));
        return v * v * v * (v * (v * 6 - 15) + 10);
    };
    function create(seed = 0) {
        const seedValue = Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 0;
        const random = index => {
            let n = (seedValue ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0;
            n = Math.imul(n ^ (n >>> 16), 0x85ebca6b);
            n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
            return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
        };
        let cachedBlock = -1, cycles = [];
        function build(block) {
            const rows = [];
            let gapTotal = 0, weightTotal = 0;
            for (let i = 0; i < CYCLES_PER_BLOCK; i++) {
                const id = block * 97 + i * 11;
                const gap = 0.15 + random(id + 2) * 0.75;
                const weight = 9 + random(id) * 2;
                rows.push({gap, weight, ratio: 0.42 + random(id + 1) * 0.10,
                    peakFactor: 0.35 + random(id + 3) * 0.65});
                gapTotal += gap;
                weightTotal += weight;
            }
            let cursor = block * BLOCK_SECONDS;
            cycles = rows.map((row, i) => {
                const active = (BLOCK_SECONDS - gapTotal) * row.weight / weightTotal;
                const rise = active * row.ratio, fall = active - rise;
                const cycle = {index: block * CYCLES_PER_BLOCK + i, start: cursor,
                    rise, fall, gap: row.gap, peakFactor: row.peakFactor,
                    end: cursor + active + row.gap};
                cursor = cycle.end;
                return cycle;
            });
            cachedBlock = block;
        }
        return seconds => {
            const time = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
            const block = Math.floor(time / BLOCK_SECONDS);
            if (block !== cachedBlock) build(block);
            const cycle = cycles.find(item => time < item.end) || cycles[cycles.length - 1];
            const age = Math.max(0, time - cycle.start);
            let value = 0, phase = 'gap';
            if (age < cycle.rise) {
                value = cycle.peakFactor * smooth(age / cycle.rise);
                phase = 'rise';
            } else if (age < cycle.rise + cycle.fall) {
                value = cycle.peakFactor * (1 - smooth((age - cycle.rise) / cycle.fall));
                phase = 'fall';
            }
            // Roundoff near a quintic endpoint must never produce negative
            // exposure or a peak slightly above the configured ceiling.
            return {...cycle, value: Math.min(cycle.peakFactor, Math.max(0, value)), phase};
        };
    }
    function createObservation(seed = 0) {
        const seedValue = Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 0;
        const groupSeconds = 32;
        const names = ['low', 'medium', 'high'];
        const random = index => {
            let n = (seedValue ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0;
            n = Math.imul(n ^ (n >>> 16), 0x85ebca6b);
            n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
            return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
        };
        function build(groupIndex) {
            const gaps = names.map((_, index) => 0.15 + random(groupIndex * 101 + index * 17 + 2) * 0.75);
            let remaining = groupSeconds - gaps.reduce((sum, gap) => sum + gap, 0);
            let cursor = groupIndex * groupSeconds;
            return names.map((stageName, stageIndex) => {
                const id = groupIndex * 101 + stageIndex * 17;
                const following = names.length - stageIndex - 1;
                // Reserve 8–12 seconds for each remaining pulse. This keeps
                // both arbitrary seeks and the total cached history bounded.
                const minimum = Math.max(8, remaining - following * 12);
                const maximum = Math.min(12, remaining - following * 8);
                const duration = Math.min(12, Math.max(8, minimum + random(id) * (maximum - minimum)));
                remaining -= duration;
                const rise = duration * (0.42 + random(id + 1) * 0.10);
                const cycle = {index: groupIndex * 3 + stageIndex, stageIndex, stageName, groupIndex,
                    start: cursor, rise, fall: duration - rise, duration, gap: gaps[stageIndex],
                    peakFactor: (stageIndex + 1) / 3, activeEnd: cursor + duration,
                    end: cursor + duration + gaps[stageIndex]};
                cursor = cycle.end;
                return cycle;
            });
        }
        const first = build(0);
        const mediumStart = first[1].start;
        const firstGroupEnd = first[2].activeEnd;
        let cachedGroup = 0, cycles = first;
        return seconds => {
            const time = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
            const groupIndex = Math.floor(time / groupSeconds);
            if (groupIndex !== cachedGroup) { cycles = build(groupIndex); cachedGroup = groupIndex; }
            const cycle = cycles.find(item => time < item.end) || cycles[2];
            const age = Math.max(0, time - cycle.start);
            let value = 0, phase = 'gap';
            if (age < cycle.rise) { value = cycle.peakFactor * smooth(age / cycle.rise); phase = 'rise'; }
            else if (age < cycle.duration) { value = cycle.peakFactor * (1 - smooth((age - cycle.rise) / cycle.fall)); phase = 'fall'; }
            // Camera movement uses absolute first-group time, so it remains
            // continuous even while the exposure is zero between pulses.
            const cameraFactor = time <= mediumStart ? 3 - smooth(time / mediumStart) :
                time < firstGroupEnd ? 2 - smooth((time - mediumStart) / (firstGroupEnd - mediumStart)) : 1;
            return {...cycle, value: Math.min(cycle.peakFactor, Math.max(0, value)), phase,
                masterCap: 1, currentCap: cycle.peakFactor, cap: cycle.peakFactor,
                cameraFactor, firstGroup: time < firstGroupEnd, mediumStart, firstGroupEnd, groupSeconds};
        };
    }
    window.NewHorizonExposureCycle = Object.freeze({create, createObservation});
})();
