/* The portal's only graphics owner. The six native renderer scripts are loaded
 * once by index.html; no preview UI, browser storage, polling or extra RAF. */
const DISPLAY_PROFILE = Object.freeze({
    screenZoom: 1.5, fieldScale: 0.9, ribbonCount: 6, detail: 2,
    cubeX: -35, cubeY: 45, cubeZ: -60
});

export function createAnotherWorldRuntime({
    terminalHost, logoButton, blackHoleHost, onNearest, onError, onStageChange
} = {}) {
    if (!terminalHost?.appendChild || !blackHoleHost?.appendChild || !logoButton) {
        throw new TypeError('Another-world portal requires its display, logo button and black-hole host.');
    }
    let stage = 'terminal', disposed = false, visible = true;
    let display = null, logo = null, blackHole = null, exitTask = null;
    let nearestAnnounced = false, nearestElapsed = 0;
    let nearestTimer = 0, nearestTimerStarted = 0, nearestRemaining = 5000;
    let canvasForLoss = null, graphicsLost = false;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const active = () => !disposed && visible && !document.hidden;
    const notify = (callback, value) => {
        if (typeof callback !== 'function') return;
        try { callback(value); } catch (error) { console.warn('Another-world UI callback:', error); }
    };
    const changeStage = next => { stage = next; notify(onStageChange, next); };
    // Renderer creation may fail synchronously. Let the caller receive this
    // runtime before its error handler destroys it; otherwise an unsupported
    // browser can leave a newly returned owner alive behind the error screen.
    const reportError = error => {
        const problem = error instanceof Error ? error : new Error(String(error));
        queueMicrotask(() => { if (!disposed) notify(onError, problem); });
    };

    function cancelNearestTimer() {
        if (!nearestTimer) return;
        clearTimeout(nearestTimer);
        nearestRemaining = Math.max(0, nearestRemaining - (performance.now() - nearestTimerStarted));
        nearestElapsed = (5000 - nearestRemaining) / 1000;
        nearestTimer = 0;
    }
    function announceNearest() {
        if (nearestAnnounced || !active() || stage !== 'black-hole') return;
        nearestAnnounced = true;
        cancelNearestTimer();
        notify(onNearest);
    }
    function nearestEligible(metrics = blackHole?.metrics) {
        return active() && stage === 'black-hole' &&
            !nearestAnnounced && blackHole && !blackHole.paused &&
            !graphicsLost && metrics &&
            !metrics.observationBlackout && metrics.cameraZoom <= 1.000001 &&
            (motion.matches || metrics.exposurePulse?.firstGroup === false) &&
            !blackHoleHost.classList.contains('is-unavailable');
    }
    function syncNearestTimer(metrics) {
        if (!nearestEligible(metrics)) { cancelNearestTimer(); return; }
        if (!nearestTimer) {
            nearestTimerStarted = performance.now();
            nearestTimer = setTimeout(() => {
                // A low-FPS renderer still waits five real visible seconds,
                // rather than another five seconds of its capped frame clock.
                // Recheck ownership/visibility before delivering the one-shot.
                cancelNearestTimer();
                if (nearestEligible()) {
                    if (nearestRemaining <= 0) announceNearest();
                    else syncNearestTimer(blackHole.metrics);
                }
            }, nearestRemaining);
        }
    }
    function observationFrame() {
        if (!blackHole || disposed || stage !== 'black-hole') return;
        // A qualifying rendered frame starts one cancellable wall-clock wait.
        // Later frames only validate it; no polling or additional RAF is used.
        syncNearestTimer(blackHole.metrics);
    }
    function cancelExit() {
        if (!exitTask) return;
        exitTask = null;
        display?.cancelExit();
        logo?.setBusy(false);
    }
    function destroyDisplay() {
        cancelExit();
        display?.destroy(); display = null;
        logo?.destroy(); logo = null;
    }
    function contextLost() { graphicsLost = true; cancelNearestTimer(); }
    function detachLossListener() {
        canvasForLoss?.removeEventListener('webglcontextlost', contextLost);
        canvasForLoss = null;
    }
    function mountBlackHole(saved = {}) {
        if (disposed || stage !== 'black-hole') return;
        cancelNearestTimer();
        detachLossListener();
        blackHole?.destroy(); blackHole = null;
        graphicsLost = false;
        const renderer = window.NewHorizonOrbitalBlackHole;
        if (!renderer?.create) { reportError('Black-hole renderer is unavailable.'); return; }
        try {
            blackHole = renderer.create(blackHoleHost, {
                ...renderer.preferredDefaults, ...saved,
                speed: 0.75, observationEntry: true, intro: false,
                paused: !active(),
                onObservationUpdate: observationFrame,
                onRestore: snapshot => mountBlackHole(snapshot)
            });
            if (!blackHole) { reportError('This browser cannot display the black-hole graphics.'); return; }
            canvasForLoss = blackHole.canvas;
            canvasForLoss.addEventListener('webglcontextlost', contextLost);
            observationFrame();
        } catch (error) { reportError(error); }
    }
    function enterBlackHole() {
        if (disposed || !active()) return Promise.resolve(false);
        if (stage === 'black-hole') return Promise.resolve(true);
        if (exitTask) return exitTask.promise;
        const task = {promise: null};
        exitTask = task; logo?.setBusy(true);
        let animation;
        try { animation = display?.metrics.available ? display.transitionOut({duration: 1080, glitch: true}) : true; }
        catch (error) { reportError(error); animation = true; }
        task.promise = Promise.resolve(animation).then(completed => {
            if (disposed || !active() || exitTask !== task || stage !== 'terminal') return false;
            exitTask = null;
            if (completed === false) { logo?.setBusy(false); return false; }
            destroyDisplay();
            changeStage('black-hole');
            mountBlackHole();
            return Boolean(blackHole);
        }, error => { if (exitTask === task) { exitTask = null; logo?.setBusy(false); } reportError(error); return false; });
        return task.promise;
    }
    function setVisible(value) {
        if (disposed) return;
        visible = Boolean(value);
        if (!active()) {
            cancelExit(); cancelNearestTimer();
            display?.stop(); blackHole?.pause(true);
        } else if (stage === 'terminal') {
            display?.start({intro: false});
            logo?.update(display?.metrics || {available: false, reducedMotion: true, clock: 0});
        } else {
            blackHole?.pause(false);
            observationFrame();
        }
    }
    function visibilityChanged() {
        // Native owners already pause their frame clocks on tab visibility.
        // Do not restart the terminal here: that would snap an interrupted
        // cube intro to its final pose when the user returns to the tab.
        if (document.hidden) { cancelExit(); cancelNearestTimer(); }
        else if (visible) observationFrame();
    }
    function motionChanged() { cancelNearestTimer(); observationFrame(); }
    function logoClick(event) { event.preventDefault(); enterBlackHole(); }
    logoButton.addEventListener('click', logoClick);
    document.addEventListener('visibilitychange', visibilityChanged);
    motion.addEventListener('change', motionChanged);

    changeStage('terminal');
    try {
        logo = window.NewHorizonTerminalLogo?.create(logoButton);
        display = window.NewHorizonTerminalDisplay?.create(terminalHost, {
            ...DISPLAY_PROFILE, autostart: false,
            onUpdate: metrics => logo?.update(metrics)
        });
        if (display) display.start({intro: true});
        logo?.update(display?.metrics || {available: false, reducedMotion: true, clock: 0});
        if (!logo) {
            logoButton.disabled = false;
            logoButton.classList.add('is-visible');
            logoButton.setAttribute('aria-hidden', 'false');
        }
    } catch (error) {
        destroyDisplay();
        logoButton.disabled = false;
        logoButton.classList.add('is-visible');
        logoButton.setAttribute('aria-hidden', 'false');
        reportError(error);
    }
    return Object.freeze({
        enterBlackHole, setVisible,
        get metrics() {
            const visibleElapsed = nearestTimer ?
                (5000 - Math.max(0, nearestRemaining - (performance.now() - nearestTimerStarted))) / 1000 : nearestElapsed;
            return {stage, disposed, visible, transitioning: Boolean(exitTask), nearestAnnounced,
                nearestElapsed: visibleElapsed, terminal: display?.metrics || null, logo: logo?.metrics || null,
                blackHole: blackHole?.metrics || null};
        },
        destroy() {
            if (disposed) return;
            disposed = true;
            cancelNearestTimer(); destroyDisplay(); detachLossListener();
            blackHole?.destroy(); blackHole = null;
            logoButton.removeEventListener('click', logoClick);
            document.removeEventListener('visibilitychange', visibilityChanged);
            motion.removeEventListener('change', motionChanged);
        }
    });
}
