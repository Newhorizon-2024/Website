/* Hidden observation branch. The directory remains the active Section: no
 * fabricated history entry, release/recapture, or second directory renderer. */
import {hitWorldviewCore, getWorldviewCoreScreenPosition,
    setWorldviewPortalSuspended, renderWorldviewPortalFocus,
    beginWorldviewPortalFocus, endWorldviewPortalFocus
} from './worldview-core.js?v=26.10.21.7';
import {createAnotherWorldRuntime} from './another-world/portal-runtime.js?v=26.10.21.6';
import {createPortalAudioSession} from './another-world/portal-audio.js?v=26.10.21.7';

const canvas = document.getElementById('worldview-canvas');
const section = document.getElementById('worldview-section');
if (canvas && section) initialize();

function initialize() {
    const root = document.createElement('div');
    root.id = 'another-world-portal';
    root.hidden = true;
    root.tabIndex = -1;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', '另一个世界');
    root.innerHTML = `
      <canvas id="another-world-focus" aria-hidden="true"></canvas>
      <div id="another-world-question">
        <p>是否查看另一个世界？</p>
        <div class="another-world-choices">
          <button id="another-world-yes" type="button">是</button>
          <span aria-hidden="true">（或）</span>
          <button id="another-world-no" type="button">否</button>
        </div>
      </div>
      <div id="another-world-mask" aria-hidden="true"></div>
      <div id="another-world-stage" hidden><div id="another-world-content">
      <div id="another-world-terminal" hidden>
        <div id="another-world-display">
          <button id="another-world-enter" class="terminal-logo" type="button" aria-label="进入另一个世界" aria-hidden="true" data-no-terminal-hit disabled>
            <img src="images/nhn/worldview/gray-redaction/gray-redaction-logo-white.png" alt="" width="1410" height="354" draggable="false">
            <canvas aria-hidden="true"></canvas>
          </button>
        </div>
      </div>
      <div id="another-world-black-hole" hidden></div>
      <div id="another-world-horizon-fill" aria-hidden="true" hidden></div>
      <div id="another-world-return" hidden>
        <p aria-label="这里还不能驻足。"></p>
        <button id="another-world-back" type="button" class="back-to-parent"><span>返回上一级</span></button>
      </div>
      <div id="another-world-error" role="status" hidden>
        <p>观测信号暂时不可用。</p>
        <button id="another-world-error-back" type="button">返回世界观目录</button>
      </div>
      </div></div>
      <button id="another-world-audio-enable" type="button" hidden>点击播放观测配乐</button>`;
    document.body.append(root);
    const byId = id => document.getElementById(id);
    const focusCanvas = byId('another-world-focus');
    const mask = byId('another-world-mask');
    const question = byId('another-world-question');
    const terminal = byId('another-world-terminal');
    const blackHole = byId('another-world-black-hole');
    const returnCopy = byId('another-world-return');
    const stageLayer = byId('another-world-stage');
    const horizonFill = byId('another-world-horizon-fill');
    const audioEnable = byId('another-world-audio-enable');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const abort = new AbortController();
    const listen = (target, type, fn, options = {}) => target.addEventListener(type, fn, {...options, signal: abort.signal});
    let phase = 'idle', hold = null, runtime = null, assets = null, token = 0, audioSession = null;
    let audioRetry = null, sourceRetryButton = null, visuallyRevealed = false;
    let previousFocus = null, savedInert = [], scrollY = 0, lenisWasRunning = false;
    let previousOverflow = '', savedPadding = '', activeAnimations = new Set();
    const emit = hidden => window.dispatchEvent(new CustomEvent('another-world-visibility-change', {detail: {hidden}}));
    const isDirectory = () => section.classList.contains('is-active') && !canvas.hidden && !document.hidden;
    const setPhase = value => {phase = value; root.dataset.phase = value;};
    const easing = 'cubic-bezier(.22,1,.36,1)';

    // Each glyph owns a bounded, smooth CSS oscillation; no per-letter RAF.
    const glyphs = Array.from('这里还不能驻足。', char => {
        const span = document.createElement('span');
        span.textContent = char; span.setAttribute('aria-hidden', 'true');
        span.style.setProperty('--float-up', (-1.2 - Math.random() * 1.8).toFixed(2) + 'px');
        span.style.setProperty('--float-down', (1 + Math.random() * 1.6).toFixed(2) + 'px');
        span.style.setProperty('--float-duration', (3.5 + Math.random() * 2.5).toFixed(2) + 's');
        span.style.setProperty('--float-delay', (-Math.random() * 6).toFixed(2) + 's');
        return span;
    });
    returnCopy.querySelector('p').append(...glyphs);
    // A single reusable controller also keeps deferred foreground restoration
    // alive after pagehide; it never creates/fetches Audio until enter().
    audioSession = createPortalAudioSession({sourceAudio: byId('background-music'), onBlocked: audioBlocked});

    function audioBlocked({stage, retry}) {
        if (stage === 'source') {
            sourceRetryButton?.remove();
            const button = document.createElement('button');
            button.className = 'another-world-source-audio-retry';
            button.textContent = '点击恢复原音乐';
            button.addEventListener('click', () => {Promise.resolve(retry()).then(success => {if (success) button.remove();}).catch(() => {});});
            document.body.append(button); sourceRetryButton = button;
        } else if (phase !== 'idle' && !phase.startsWith('return')) {
            audioRetry = retry; audioEnable.hidden = false;
        }
    }
    function finishAudio() {
        audioEnable.hidden = true; audioRetry = null;
        audioSession?.finish();
    }

    function cancelHold() {
        if (!hold) return;
        clearTimeout(hold.timer);
        hold = null;
    }
    function beginHold(event, keyboard = false) {
        if (phase !== 'idle' || hold || !isDirectory() ||
            (!keyboard && (event.button !== 0 || event.isPrimary === false || !hitWorldviewCore(event.clientX, event.clientY)))) return;
        const point = keyboard ? getWorldviewCoreScreenPosition() : {x: event.clientX, y: event.clientY};
        if (!point) return;
        hold = {id: keyboard ? 'keyboard' : event.pointerId, x: point.x, y: point.y,
            key: keyboard ? event.code : null, slop: event.pointerType === 'touch' ? 8 : 4,
            timer: setTimeout(() => {
                const pending = hold;
                hold = null;
                if (pending && isDirectory()) openQuestion();
            }, 2500)};
    }

    function freezeSite() {
        previousFocus = document.activeElement;
        scrollY = window.scrollY;
        lenisWasRunning = Boolean(window.lenis && !window.lenis.isStopped);
        if (lenisWasRunning) window.lenis.stop();
        previousOverflow = document.documentElement.style.overflow;
        savedPadding = document.documentElement.style.paddingRight;
        const gutter = window.innerWidth - document.documentElement.clientWidth;
        if (gutter > 0) document.documentElement.style.paddingRight = gutter + 'px';
        document.documentElement.style.overflow = 'hidden';
        savedInert = Array.from(document.body.children).filter(el => el !== root && !el.matches('script,style,link')).map(el => [el, el.inert]);
        for (const [el] of savedInert) el.inert = true;
        document.body.classList.add('is-another-world-transitioning', 'is-another-world-focused');
        visuallyRevealed = false;
    }
    function revealSite() {
        if (visuallyRevealed) return;
        visuallyRevealed = true;
        document.body.classList.remove('is-another-world-focused', 'is-another-world-obscured');
        endWorldviewPortalFocus();
        emit(false);
        setWorldviewPortalSuspended(false);
    }
    function restoreSite() {
        revealSite();
        for (const [el, inert] of savedInert) if (el.isConnected) el.inert = inert;
        savedInert = [];
        document.documentElement.style.overflow = previousOverflow;
        document.documentElement.style.paddingRight = savedPadding;
        if (lenisWasRunning) window.lenis?.start();
        lenisWasRunning = false;
        window.scrollTo({top: scrollY, behavior: 'instant'});
        const focus = previousFocus?.isConnected && !previousFocus.inert ? previousFocus : canvas;
        focus?.focus?.({preventScroll: true});
        previousFocus = null;
        document.body.classList.remove('is-another-world-transitioning');
    }
    function positionQuestion() {
        const point = getWorldviewCoreScreenPosition() || {x: innerWidth / 2, y: innerHeight / 2};
        root.style.setProperty('--portal-x', point.x + 'px');
        root.style.setProperty('--portal-y', point.y + 'px');
        const top = Math.max(32, Math.min(innerHeight - 150, point.y + 110));
        question.style.top = top + 'px';
        question.style.left = Math.max(130, Math.min(innerWidth - 130, point.x)) + 'px';
        return point;
    }
    function openQuestion() {
        if (phase !== 'idle' || !isDirectory()) return false;
        if (!beginWorldviewPortalFocus(focusCanvas)) return false;
        freezeSite();
        positionQuestion();
        root.hidden = false;
        root.setAttribute('aria-label', '是否查看另一个世界？');
        setPhase('confirm');
        byId('another-world-no').focus({preventScroll: true});
        return true;
    }
    function animate(target, frames, options) {
        if (reduced.matches || !target.animate) return Promise.resolve();
        const animation = target.animate(frames, options);
        activeAnimations.add(animation);
        return animation.finished.catch(() => {}).finally(() => activeAnimations.delete(animation));
    }
    function loadAssets() {
        if (assets) return assets;
        const names = ['orbital-warp-shaders', 'exposure-cycle', 'orbital-black-hole', 'terminal-cube', 'terminal-display', 'terminal-logo'];
        const globals = ['NewHorizonOrbitalWarpShaders', 'NewHorizonExposureCycle', 'NewHorizonOrbitalBlackHole', 'NewHorizonTerminalCube', 'NewHorizonTerminalDisplay', 'NewHorizonTerminalLogo'];
        assets = names.reduce((promise, name, index) => promise.then(() => {
            if (window[globals[index]]) return;
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = new URL('./another-world/' + name + '.js?v=26.10.21.6', import.meta.url).href;
                script.onload = () => {script.remove(); resolve();};
                script.onerror = () => {script.remove(); reject(new Error('Observation resource unavailable: ' + name));};
                document.head.append(script);
            });
        }), Promise.resolve()).catch(error => {assets = null; throw error;});
        return assets;
    }
    async function accept() {
        if (phase !== 'confirm') return;
        const ownToken = ++token;
        sourceRetryButton?.remove(); sourceRetryButton = null;
        // Remain in the synchronous "Yes" user gesture to authorize audio.
        audioSession.enter();
        const point = positionQuestion();
        const radius = Math.hypot(Math.max(point.x, innerWidth - point.x), Math.max(point.y, innerHeight - point.y));
        mask.style.width = mask.style.height = (radius * 2 / 0.62 + 160) + 'px';
        setPhase('cover');
        byId('another-world-yes').disabled = byId('another-world-no').disabled = true;
        root.focus({preventScroll: true});
        const ready = loadAssets();
        // Load and cover concurrently, but do not uncover a partially mounted screen.
        const covered = animate(mask, [{transform: 'translate(-50%,-50%) scale(0)'},
            {transform: 'translate(-50%,-50%) scale(1)'}],
            {duration: 1200, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards'});
        try {
            await Promise.all([ready, covered]);
            if (ownToken !== token || phase !== 'cover' || !isDirectory()) return;
            endWorldviewPortalFocus();
            setWorldviewPortalSuspended(true);
            document.body.classList.add('is-another-world-obscured');
            emit(true);
            stageLayer.hidden = false;
            terminal.hidden = false;
            setPhase('terminal');
            runtime = createAnotherWorldRuntime({
                terminalHost: byId('another-world-display'), logoButton: byId('another-world-enter'), blackHoleHost: blackHole,
                onStageChange(stage) {
                    if (ownToken !== token) return;
                    terminal.hidden = stage !== 'terminal';
                    blackHole.hidden = stage !== 'black-hole';
                    setPhase(stage);
                    root.setAttribute('aria-label', stage === 'terminal' ? '另一个世界 · 显示屏' : '另一个世界 · 黑洞');
                    root.focus({preventScroll: true});
                },
                onNearest() {
                    if (ownToken !== token || phase !== 'black-hole') return;
                    const back = byId('another-world-back');
                    back.classList.remove('is-history-empty');
                    back.setAttribute('aria-disabled', 'false');
                    back.disabled = false;
                    returnCopy.hidden = false;
                    returnCopy.classList.add('is-visible');
                },
                onError() {if (ownToken === token) showError();}
            });
            if (phase === 'error') {runtime?.destroy();runtime = null;}
            else if (!runtime) showError();
            else audioSession?.start();
        } catch {if (ownToken === token) showError();}
    }
    function showError() {
        runtime?.destroy(); runtime = null;
        terminal.hidden = blackHole.hidden = returnCopy.hidden = true;
        stageLayer.hidden = false;
        setPhase('error');
        byId('another-world-error').hidden = false;
        byId('another-world-error-back').focus({preventScroll: true});
    }
    async function close({immediate = false} = {}) {
        cancelHold();
        if (phase === 'idle' || (phase.startsWith('return') && !immediate)) return;
        const ownToken = ++token;
        const fromBlackHole = phase === 'black-hole';
        const blackHoleMetrics = runtime?.metrics?.blackHole;
        const shouldFade = !immediate && phase !== 'confirm';
        audioEnable.hidden = true;
        for (const animation of activeAnimations) animation.cancel();
        activeAnimations.clear();
        if (!immediate && fromBlackHole && blackHoleMetrics) {
            setPhase('return-filling');
            byId('another-world-back').disabled = true;
            const {pixelRatio = 1, centerX = innerWidth / 2, centerY = innerHeight / 2, coreRadiusCss = 0} = blackHoleMetrics;
            const radius = Math.max(0, coreRadiusCss - 0.8);
            // Sample the actual site's fixed viewport gradient, not a new palette.
            horizonFill.style.backgroundImage = getComputedStyle(document.body, '::before').backgroundImage;
            horizonFill.style.clipPath = `circle(${radius}px at ${centerX / pixelRatio}px ${centerY / pixelRatio}px)`;
            horizonFill.hidden = false;
            await animate(horizonFill, [{opacity: 0}, {opacity: 1}], {duration: 1050, easing, fill: 'forwards'});
            if (ownToken !== token) return;
            revealSite();
            setPhase('returning');
            // The feather extends below the initial viewport, so it cannot pop
            // into view before the smoothly accelerating upward departure.
            stageLayer.classList.add('has-return-mask');
            await animate(stageLayer, [{transform: 'translateY(0)'}, {transform: 'translateY(calc(-100% - 2px))'}],
                {duration: 1650, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards'});
        } else {
            setPhase('returning');
            if (shouldFade) await animate(root, [{opacity: 1}, {opacity: 0}], {duration: 650, easing});
        }
        if (ownToken !== token) return;
        runtime?.destroy(); runtime = null;
        root.hidden = true;
        stageLayer.hidden = horizonFill.hidden = true;
        stageLayer.classList.remove('has-return-mask');
        terminal.hidden = blackHole.hidden = returnCopy.hidden = true;
        byId('another-world-error').hidden = true;
        returnCopy.classList.remove('is-visible');
        focusCanvas.width = focusCanvas.height = 1;
        byId('another-world-yes').disabled = byId('another-world-no').disabled = false;
        for (const animation of root.getAnimations({subtree: true})) animation.cancel();
        setPhase('idle');
        restoreSite();
        finishAudio();
    }

    listen(canvas, 'pointerdown', event => beginHold(event), {capture: true});
    listen(window, 'pointermove', event => {
        if (hold && hold.id === event.pointerId && Math.hypot(event.clientX - hold.x, event.clientY - hold.y) > hold.slop) cancelHold();
    }, {capture: true, passive: true});
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(window, type, event => {
        if (hold?.id === event.pointerId) cancelHold();
    }, {capture: true});
    listen(window, 'pointerdown', event => {if (hold && event.pointerId !== hold.id) cancelHold();}, {capture: true});
    listen(window, 'blur', cancelHold);
    listen(window, 'scroll', cancelHold, {capture: true, passive: true});
    listen(document, 'keydown', event => {
        if (phase !== 'idle' && event.key === 'Escape') {
            event.preventDefault(); event.stopImmediatePropagation(); close(); return;
        }
        if (phase !== 'idle' && event.key === 'Tab') {
            const elements = Array.from(root.querySelectorAll('button:not(:disabled)')).filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
            const first = elements[0], last = elements.at(-1);
            if (!first) {event.preventDefault();root.focus();return;}
            if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) {event.preventDefault();last.focus();}
            else if (!event.shiftKey && (document.activeElement === last || document.activeElement === root)) {event.preventDefault();first.focus();}
        }
        if (event.target === canvas && ['Space', 'Enter'].includes(event.code)) {
            event.preventDefault();
            if (!event.repeat) beginHold(event, true);
        }
    }, {capture: true});
    listen(document, 'keyup', event => {if (hold?.key === event.code) cancelHold();}, {capture: true});
    listen(byId('another-world-no'), 'click', () => close());
    listen(byId('another-world-yes'), 'click', accept);
    for (const id of ['another-world-back', 'another-world-error-back']) listen(byId(id), 'click', event => {
        // Reuse NH's visual class without popping its real Section history.
        event.preventDefault(); event.stopPropagation(); close();
    });
    listen(audioEnable, 'click', () => {if (audioRetry) Promise.resolve(audioRetry()).then(success => {if (success) audioEnable.hidden = true;}).catch(() => {});});
    listen(byId('background-music'), 'playing', () => {sourceRetryButton?.remove();sourceRetryButton = null;});
    listen(document, 'visibilitychange', () => {
        cancelHold();
        if (phase === 'confirm' || phase === 'cover') close({immediate: true});
        // Renderer owners already gate their clocks on document.visibility;
        // restarting display.start() here would skip an interrupted intro.
    });
    listen(window, 'section-shown', event => {if (event.detail?.sectionId !== 'worldview-section') close({immediate: true});});
    listen(window, 'worldview-core-hide', () => close({immediate: true}));
    listen(window, 'resize', () => {
        cancelHold();
        if (phase === 'confirm') {renderWorldviewPortalFocus(focusCanvas); positionQuestion();}
        else if (phase === 'cover') close({immediate: true});
    });
    listen(window, 'pagehide', () => close({immediate: true}));
    listen(root, 'contextmenu', event => event.preventDefault());
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', '世界观目录：可拖动旋转，长按中心方块或按住 Enter、空格 2.5 秒查看另一个世界');
    window.NewHorizonAnotherWorldPortal = Object.freeze({
        cancel: () => close(), returnToDirectory: () => close(),
        get state() {return {phase, holdPending: Boolean(hold), point: getWorldviewCoreScreenPosition(), runtime: runtime?.metrics || null,
            audio: audioSession?.metrics || null};},
        get runtime() {return runtime;},
        destroy() {close({immediate: true});audioSession?.destroy();sourceRetryButton?.remove();abort.abort();root.remove();}
    });
}
