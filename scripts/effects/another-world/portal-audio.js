/* A separate observation soundtrack. Never replace the site's playlist source
 * or seek its media element: a paused song keeps its exact original position. */
export const PORTAL_AUDIO_SOURCE = 'media/STAY - Hans Zimmer.mp3';

export function createPortalAudioSession({
    sourceAudio = globalThis.document?.getElementById('background-music'),
    onBlocked = () => {},
    source,
    createAudio = url => new Audio(url),
    documentTarget = globalThis.document,
    windowTarget = globalThis.window
} = {}) {
    const soundtrack = source || new URL('../../../' + PORTAL_AUDIO_SOURCE, import.meta.url).href;
    let phase = 'idle', generation = 0, disposed = false, pageHidden = false;
    let portalAudio = null, previous = null, pendingRestore = null;
    let sourceRequest = null, sourceSerial = 0;
    const cleanup = new Map();
    const reported = new Set();
    const isHidden = () => pageHidden || Boolean(documentTarget?.hidden);
    const sourceKey = () => sourceAudio?.currentSrc || sourceAudio?.src || '';
    const listen = (target, name, callback) => {
        target?.addEventListener(name, callback);
        return () => target?.removeEventListener(name, callback);
    };
    const notify = (stage, error, retry) => {
        const key = stage + ':' + (error?.name || 'MediaError');
        if (reported.has(key)) return;
        reported.add(key);
        try { onBlocked({stage, error, retry}); } catch { /* UI must not break cleanup. */ }
    };
    const releaseAudio = audio => {
        if (!audio) return;
        cleanup.get(audio)?.();
        cleanup.delete(audio);
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
    };
    const canPlay = (audio, ownGeneration) => !disposed && portalAudio === audio &&
        generation === ownGeneration && !isHidden() && (phase === 'prepared' || phase === 'active');

    function playPortal() {
        const audio = portalAudio, ownGeneration = generation;
        if (!audio || !canPlay(audio, ownGeneration)) return Promise.resolve(false);
        // Calling play() before the first await preserves the click's activation.
        let request;
        try { request = audio.play(); }
        catch (error) { request = Promise.reject(error); }
        return Promise.resolve(request).then(() => {
            if (!canPlay(audio, ownGeneration)) { audio.pause(); return false; }
            return true;
        }, error => {
            if (canPlay(audio, ownGeneration) && error?.name !== 'AbortError') {
                // A muted warm-up can be refused without yet needing visible UI;
                // the audible start still gets its own attempt and error report.
                if (phase === 'active') notify('portal', error, retry);
            }
            return false;
        });
    }

    function restoreSource(snapshot) {
        if (disposed || !snapshot || !sourceAudio) return Promise.resolve(false);
        // Do not resurrect an old song if another component deliberately changed it.
        if (sourceKey() !== snapshot.source) {
            if (pendingRestore === snapshot) pendingRestore = null;
            return Promise.resolve(false);
        }
        if (phase === 'active') return Promise.resolve(false);
        // Keep intent until play actually succeeds, rather than losing it while
        // the stream buffers or the browser decides whether playback is allowed.
        pendingRestore = snapshot;
        if (isHidden()) return Promise.resolve(false);
        sourceAudio.volume = snapshot.volume;
        sourceAudio.muted = snapshot.muted;
        if (!snapshot.wasPlaying) {pendingRestore = null; return Promise.resolve(false);}
        if (sourceRequest?.snapshot === snapshot && sourceRequest.generation === generation) return sourceRequest.promise;
        const record = {serial: ++sourceSerial, generation, snapshot, promise: null};
        sourceRequest = record;
        const ownsRequest = () => sourceRequest === record && record.serial === sourceSerial && record.generation === generation;
        let request;
        try { request = sourceAudio.play(); }
        catch (error) { request = Promise.reject(error); }
        record.promise = Promise.resolve(request).then(() => {
            // A delayed original play must not overlap a new observation session.
            if (phase === 'active' || isHidden()) {
                sourceAudio.pause();
                if (ownsRequest()) sourceRequest = null;
                return false;
            }
            if (!ownsRequest() || sourceKey() !== snapshot.source) return false;
            sourceRequest = null;
            pendingRestore = null;
            return true;
        }, error => {
            if (!ownsRequest()) return false;
            sourceRequest = null;
            if (!disposed && phase !== 'active' && !isHidden() && error?.name !== 'AbortError') {
                notify('source', error, retry);
            }
            return false;
        });
        return record.promise;
    }

    function enter() {
        if (disposed) return Promise.resolve(false);
        if (phase === 'prepared' || phase === 'active') return playPortal();
        generation += 1;
        reported.clear();
        phase = 'prepared';
        const audio = createAudio(soundtrack);
        portalAudio = audio;
        audio.preload = 'auto';
        audio.loop = true;
        audio.muted = true;
        audio.volume = 0;
        cleanup.set(audio, listen(audio, 'error', () => {
            if (audio === portalAudio && phase === 'active') {
                notify('portal', audio.error || new Error('Observation soundtrack unavailable'), retry);
            }
        }));
        return playPortal();
    }

    function start() {
        if (disposed) return Promise.resolve(false);
        if (phase === 'idle') enter();
        if (phase === 'active') return playPortal();
        const restoring = pendingRestore?.source === sourceKey() ? pendingRestore : null;
        previous = sourceAudio ? {
            source: sourceKey(), currentTime: sourceAudio.currentTime,
            volume: sourceAudio.volume, muted: sourceAudio.muted,
            wasPlaying: (!sourceAudio.paused && !sourceAudio.ended) || Boolean(restoring?.wasPlaying)
        } : null;
        // Transfer a still-pending restoration into this session's snapshot.
        // Old play callbacks may silence stale playback, but cannot clear it.
        sourceSerial += 1;
        sourceRequest = null;
        pendingRestore = null;
        phase = 'active';
        sourceAudio?.pause();
        // Only our private soundtrack is rewound after its silent authorization.
        try { portalAudio.currentTime = 0; } catch { /* A cold stream starts at zero. */ }
        portalAudio.volume = previous?.volume ?? 0.25;
        portalAudio.muted = previous?.muted ?? false;
        return playPortal();
    }

    function finish({restore = true} = {}) {
        if (disposed) return Promise.resolve(false);
        generation += 1;
        phase = 'idle';
        const audio = portalAudio;
        portalAudio = null;
        releaseAudio(audio);
        const snapshot = previous || pendingRestore;
        previous = null;
        pendingRestore = null;
        sourceSerial += 1;
        sourceRequest = null;
        return restore ? restoreSource(snapshot) : Promise.resolve(false);
    }

    function retry() {
        reported.clear();
        if (disposed) return Promise.resolve(false);
        if (phase === 'active' || phase === 'prepared') return playPortal();
        if (pendingRestore) {
            return restoreSource(pendingRestore);
        }
        return Promise.resolve(false);
    }

    function visibilityChanged() {
        if (disposed) return;
        if (isHidden()) {
            portalAudio?.pause();
            if (sourceRequest) {
                // pause() can reject the pending play promise. Invalidate the
                // request, not its snapshot, so foreground retries it safely.
                sourceSerial += 1;
                sourceRequest = null;
                sourceAudio?.pause();
            }
            return;
        }
        if (phase === 'active' || phase === 'prepared') playPortal();
        else if (pendingRestore) retry();
    }
    const removeListeners = [
        listen(documentTarget, 'visibilitychange', visibilityChanged),
        listen(windowTarget, 'pagehide', () => {
            pageHidden = true;
            visibilityChanged();
        }),
        listen(windowTarget, 'pageshow', () => {
            pageHidden = false;
            visibilityChanged();
        }),
        // Guard against an older, in-flight original play() from another module.
        listen(sourceAudio, 'play', () => { if (phase === 'active') sourceAudio.pause(); })
    ];

    return Object.freeze({
        enter, start, finish, retry,
        destroy({restore = true} = {}) {
            if (disposed) return Promise.resolve(false);
            const result = finish({restore});
            disposed = true;
            generation += 1;
            pendingRestore = null;
            sourceSerial += 1;
            sourceRequest = null;
            for (const remove of removeListeners) remove();
            return result;
        },
        get metrics() {
            return {
                phase, disposed, hidden: isHidden(), source: soundtrack,
                soundtrackPaused: portalAudio?.paused ?? true,
                sourceWasPlaying: previous?.wasPlaying ?? pendingRestore?.wasPlaying ?? null,
                sourceTime: sourceAudio?.currentTime ?? null,
                restorePending: Boolean(pendingRestore), restoreInFlight: Boolean(sourceRequest)
            };
        }
    });
}
