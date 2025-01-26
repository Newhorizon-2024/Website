let hideTimeout;
let hideFullscreenTimeout;
let hideScrollbarTimeout;
let hideLanguageTimeout;
let scrollbarEnabled = true;
let isEnglish = false;

function showVolumeControls() {
    const controls = document.getElementById('volume-controls');
    controls.style.left = '10px';
    controls.style.opacity = '1';
}

function hideVolumeControls() {
    hideTimeout = setTimeout(() => {
        const controls = document.getElementById('volume-controls');
        controls.style.left = '-150px';
        controls.style.opacity = '0';
    }, 1000);
}

function clearHideTimeout() {
    clearTimeout(hideTimeout);
}

function adjustVolume(value) {
    const audio = document.getElementById('background-music');
    audio.volume = value / 100;
}

function toggleMute() {
    const audio = document.getElementById('background-music');
    const muteButton = document.getElementById('mute-button');
    audio.muted = !audio.muted;
    muteButton.textContent = audio.muted ? "取消静音" : "静音";
}

function showFullscreenControls() {
    const controls = document.getElementById('fullscreen-controls');
    controls.style.right = '10px';
    controls.style.opacity = '1';
}

function hideFullscreenControls() {
    hideFullscreenTimeout = setTimeout(() => {
        const controls = document.getElementById('fullscreen-controls');
        controls.style.right = '-150px';
        controls.style.opacity = '0';
    }, 1000);
}

function clearHideTimeoutFullscreen() {
    clearTimeout(hideFullscreenTimeout);
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
        document.exitFullscreen();
    }
}

function showScrollbarControls() {
    const controls = document.getElementById('scrollbar-controls');
    controls.style.right = '10px';
    controls.style.opacity = '1';
}

function hideScrollbarControls() {
    hideScrollbarTimeout = setTimeout(() => {
        const controls = document.getElementById('scrollbar-controls');
        controls.style.right = '-150px';
        controls.style.opacity = '0';
    }, 1000);
}

function clearHideTimeoutScrollbar() {
    clearTimeout(hideScrollbarTimeout);
}

function toggleScrollbar() {
    const body = document.body;
    const scrollbarButton = document.getElementById('scrollbar-button');
    scrollbarEnabled = !scrollbarEnabled;
    body.style.overflowY = scrollbarEnabled ? 'auto' : 'hidden';
    scrollbarButton.textContent = scrollbarEnabled ? "隐藏滚动条" : "显示滚动条";
}

function showLanguageControls() {
    const controls = document.getElementById('language-controls');
    controls.style.right = '10px';
    controls.style.opacity = '1';
}

function hideLanguageControls() {
    hideLanguageTimeout = setTimeout(() => {
        const controls = document.getElementById('language-controls');
        controls.style.right = '-150px';
        controls.style.opacity = '0';
    }, 1000);
}

function clearHideTimeoutLanguage() {
    clearTimeout(hideLanguageTimeout);
}

function toggleLanguage() {
    isEnglish = !isEnglish;
    document.getElementById('mute-button').textContent = isEnglish ? "Mute" : "静音";
    document.getElementById('fullscreen-controls').querySelector('button').textContent = isEnglish ? "Fullscreen" : "全屏";
    document.getElementById('scrollbar-button').textContent = scrollbarEnabled ? (isEnglish ? "Hide Scrollbar" : "隐藏滚动条") : (isEnglish ? "Show Scrollbar" : "显示滚动条");
    document.getElementById('language-button').textContent = isEnglish ? "Switch Language" : "切换语言";
}
