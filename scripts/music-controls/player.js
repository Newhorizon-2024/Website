import { playlist }
    from "./playlist-data.js";

import {
    applySongVisuals
} from "./song-visuals.js";

/* ===========================
   1. 页面元素
=========================== */

const previousSongButton =
    document.getElementById("prev-song-btn");

const playPauseButton =
    document.getElementById("play-pause-btn");

const nextSongButton =
    document.getElementById("next-song-btn");

const volumeButton =
    document.getElementById("volume-btn");

const volumeSlider =
    document.getElementById("volume-slider");

const volumeSliderContainer =
    document.getElementById(
        "volume-slider-container"
    );

const progressBar =
    document.getElementById("progress-bar");

const audioElement =
    document.getElementById(
        "background-music"
    );

const currentTimeDisplay =
    document.getElementById(
        "current-time"
    );

const remainingTimeDisplay =
    document.getElementById(
        "remaining-time"
    );

const playlistButton =
    document.getElementById(
        "playlist-btn"
    );

const playlistContainer =
    document.getElementById(
        "playlist-container"
    );

const playlistList =
    document.getElementById("playlist");


/* ===========================
   2. 播放列表
=========================== */

if (playlist.length === 0) {
    console.warn(
        "播放列表为空，请检查 playlist-data.js 中的 playlist 数据。"
    );
}


/* ===========================
   3. 播放器状态
=========================== */

let currentSongIndex =
    findPlayableSongIndex(0, 1);

let playlistLoaded = false;


/* ===========================
   4. 通用辅助函数
=========================== */

function isPlayableSong(index) {
    const song = playlist[index];

    return Boolean(
        song &&
        !song.separator &&
        typeof song.path === "string" &&
        song.path.length > 0
    );
}

function findPlayableSongIndex(
    startingIndex,
    direction
) {
    for (
        let index = startingIndex;
        index >= 0 &&
        index < playlist.length;
        index += direction
    ) {
        if (isPlayableSong(index)) {
            return index;
        }
    }

    return -1;
}

function getSongName(song) {
    if (
        !song ||
        typeof song.path !== "string"
    ) {
        return "";
    }

    return song.path
        .split("/")
        .pop()
        .replace(/\.[^/.]+$/, "");
}

function formatTime(seconds) {
    if (
        !Number.isFinite(seconds) ||
        seconds < 0
    ) {
        return "0:00";
    }

    const minutes =
        Math.floor(seconds / 60);

    const remainingSeconds =
        Math.floor(seconds % 60);

    return (
        `${minutes}:` +
        String(
            remainingSeconds
        ).padStart(2, "0")
    );
}

function applyCurrentSongVisuals(song) {
    if (!song) {
        return;
    }

    applySongVisuals(song);
}


/* ===========================
   5. 播放与暂停
=========================== */

async function togglePlayPause() {
    if (
        !audioElement ||
        !playPauseButton
    ) {
        return;
    }

    if (audioElement.paused) {
        try {
            await audioElement.play();

            playPauseButton.textContent =
                "暂停";
        } catch (error) {
            console.log(
                "音频播放失败，需要用户再次操作：",
                error
            );
        }

        return;
    }

    audioElement.pause();

    playPauseButton.textContent =
        "播放";
}


/* ===========================
   6. 切换歌曲
=========================== */

function playPreviousSong() {
    if (currentSongIndex === -1) {
        return;
    }

    const previousIndex =
        findPlayableSongIndex(
            currentSongIndex - 1,
            -1
        );

    if (previousIndex !== -1) {
        playSong(previousIndex);
    }
}

function playNextSong() {
    if (currentSongIndex === -1) {
        return;
    }

    const nextIndex =
        findPlayableSongIndex(
            currentSongIndex + 1,
            1
        );

    if (nextIndex !== -1) {
        playSong(nextIndex);
    }
}


/* ===========================
   7. 音量控制
=========================== */

function updateVolumeBarColor() {
    if (!volumeSlider) {
        return;
    }

    const value =
        Number(volumeSlider.value);

    const maximum =
        Number(volumeSlider.max) || 1;

    const percentage =
        value / maximum * 100;

    volumeSlider.style.setProperty(
        "--volume",
        `${percentage}%`
    );
}

function updateAudioVolume() {
    if (
        !audioElement ||
        !volumeSlider
    ) {
        return;
    }

    const sliderValue =
        Number(volumeSlider.value);

    /*
     * 使用平方曲线，使滑条中段的听感变化
     * 更加自然。
     */
    audioElement.volume =
        Math.min(
            1,
            Math.max(
                0,
                sliderValue ** 2
            )
        );

    updateVolumeBarColor();
}

function toggleVolumeSlider() {
    if (!volumeSliderContainer) {
        return;
    }

    const isHidden =
        window.getComputedStyle(
            volumeSliderContainer
        ).display === "none";

    volumeSliderContainer.style.display =
        isHidden
            ? "block"
            : "none";
}


/* ===========================
   8. 播放进度
=========================== */

function updateProgressDisplay() {
    if (
        !audioElement ||
        !progressBar ||
        !currentTimeDisplay ||
        !remainingTimeDisplay
    ) {
        return;
    }

    const duration =
        audioElement.duration;

    const currentTime =
        audioElement.currentTime;

    const hasDuration =
        Number.isFinite(duration) &&
        duration > 0;

    const progress =
        hasDuration
            ? currentTime /
                duration *
                100
            : 0;

    progressBar.value =
        String(progress);

    progressBar.style.setProperty(
        "--progress",
        `${progress}%`
    );

    currentTimeDisplay.textContent =
        formatTime(currentTime);

    remainingTimeDisplay.textContent =
        hasDuration
            ? formatTime(
                Math.max(
                    0,
                    duration -
                    currentTime
                )
            )
            : "0:00";
}

function seekAudio() {
    if (
        !audioElement ||
        !progressBar ||
        !Number.isFinite(
            audioElement.duration
        ) ||
        audioElement.duration <= 0
    ) {
        return;
    }

    const percentage =
        Number(progressBar.value);

    audioElement.currentTime =
        percentage /
        100 *
        audioElement.duration;

    updateProgressDisplay();
}


/* ===========================
   9. 歌单面板
=========================== */

function togglePlaylist() {
    if (
        !playlistButton ||
        !playlistContainer
    ) {
        return;
    }

    const isOpen =
        playlistContainer.classList
            .contains("is-open");

    if (
        !isOpen &&
        !playlistLoaded
    ) {
        loadPlaylist();
        playlistLoaded = true;
    }

    playlistContainer.classList.toggle(
        "is-open",
        !isOpen
    );

    playlistButton.classList.toggle(
        "active",
        !isOpen
    );

    playlistButton.setAttribute(
        "aria-expanded",
        String(!isOpen)
    );
}

function loadPlaylist() {
    if (!playlistList) {
        return;
    }

    playlistList.innerHTML = "";

    let lastSeparator = null;
    let visibleSongIndex = 0;

    playlist.forEach(
        (song, index) => {
            const listItem =
                document.createElement("li");

            /*
             * 歌单分隔项
             */
            if (song.separator) {
                listItem.textContent =
                    song.label || "";

                listItem.classList.add(
                    "playlist-separator"
                );

                listItem.dataset.collapsed =
                    "true";

                listItem.setAttribute(
                    "role",
                    "button"
                );

                listItem.setAttribute(
                    "tabindex",
                    "0"
                );

                listItem.setAttribute(
                    "aria-expanded",
                    "false"
                );

                listItem.addEventListener(
                    "click",
                    () => {
                        togglePlaylistGroup(
                            listItem
                        );
                    }
                );

                listItem.addEventListener(
                    "keydown",
                    event => {
                        if (
                            event.key !==
                                "Enter" &&
                            event.key !==
                                " "
                        ) {
                            return;
                        }

                        event.preventDefault();

                        togglePlaylistGroup(
                            listItem
                        );
                    }
                );

                playlistList.appendChild(
                    listItem
                );

                lastSeparator =
                    listItem;

                return;
            }

            /*
             * 普通歌曲
             */
            const songName =
                getSongName(song);

            const songInformation =
                document.createElement(
                    "span"
                );

            songInformation.classList.add(
                "playlist-song-info"
            );

            const songTitle =
                document.createElement(
                    "strong"
                );

            songTitle.textContent =
                songName;

            const description =
                document.createTextNode(
                    ` - ${
                        song.description ||
                        ""
                    }`
                );

            songInformation.appendChild(
                songTitle
            );

            songInformation.appendChild(
                description
            );

            listItem.classList.add(
                "playlist-song"
            );

            listItem.dataset.songIndex =
                String(index);

            listItem.style.setProperty(
                "--playlist-item-index",
                String(
                    Math.min(
                        visibleSongIndex,
                        8
                    )
                )
            );

            visibleSongIndex += 1;

            if (
                lastSeparator &&
                lastSeparator.dataset
                    .collapsed ===
                    "true"
            ) {
                listItem.classList.add(
                    "is-collapsed"
                );
            }

            /*
             * 登录曲按钮
             */
            const loginSongButton =
                document.createElement(
                    "button"
                );

            loginSongButton.type =
                "button";

            loginSongButton.textContent =
                "登录曲";

            loginSongButton.classList.add(
                "login-song-btn"
            );

            loginSongButton.title =
                "设置为每次登录网页播放的歌曲";

            loginSongButton
                .addEventListener(
                    "click",
                    event => {
                        event.stopPropagation();

                        saveDefaultLoginSong(
                            index,
                            songName
                        );
                    }
                );

            listItem.appendChild(
                songInformation
            );

            listItem.appendChild(
                loginSongButton
            );

            listItem.addEventListener(
                "click",
                event => {
                    if (
                        event.target.closest(
                            ".login-song-btn"
                        )
                    ) {
                        return;
                    }

                    playSong(index);
                }
            );

            playlistList.appendChild(
                listItem
            );
        }
    );

    setActivePlaylistItem(
        currentSongIndex
    );
}

function togglePlaylistGroup(
    separatorItem
) {
    const isCollapsed =
        separatorItem.dataset
            .collapsed ===
        "true";

    separatorItem.dataset.collapsed =
        String(!isCollapsed);

    separatorItem.classList.toggle(
        "is-expanded",
        isCollapsed
    );

    separatorItem.setAttribute(
        "aria-expanded",
        String(isCollapsed)
    );

    let nextItem =
        separatorItem.nextElementSibling;

    let itemIndex = 0;

    while (
        nextItem &&
        !nextItem.classList.contains(
            "playlist-separator"
        )
    ) {
        if (isCollapsed) {
            nextItem.style.setProperty(
                "--group-item-index",
                String(
                    Math.min(
                        itemIndex,
                        8
                    )
                )
            );

            nextItem.classList.remove(
                "is-collapsed"
            );
        } else {
            nextItem.classList.add(
                "is-collapsed"
            );
        }

        itemIndex += 1;

        nextItem =
            nextItem.nextElementSibling;
    }
}

function setActivePlaylistItem(
    songIndex
) {
    if (!playlistList) {
        return;
    }

    const playlistItems =
        playlistList.querySelectorAll(
            ".playlist-song"
        );

    playlistItems.forEach(item => {
        item.classList.toggle(
            "active",
            Number(
                item.dataset.songIndex
            ) === songIndex
        );
    });
}


/* ===========================
   10. 指定歌曲播放
=========================== */

async function playSong(index) {
    if (
        !audioElement ||
        !isPlayableSong(index)
    ) {
        return;
    }

    currentSongIndex = index;

    const song =
        playlist[currentSongIndex];

    audioElement.src =
        song.path;

    setActivePlaylistItem(
        currentSongIndex
    );

    applyCurrentSongVisuals(song);

    try {
        await audioElement.play();

        if (playPauseButton) {
            playPauseButton.textContent =
                "暂停";
        }
    } catch (error) {
        console.log(
            "自动播放失败，需要用户点击播放按钮：",
            error
        );

        if (playPauseButton) {
            playPauseButton.textContent =
                "播放";
        }
    }
}


/* ===========================
   11. 登录曲
=========================== */

function saveDefaultLoginSong(
    songIndex,
    songName
) {
    if (!isPlayableSong(songIndex)) {
        return;
    }

    try {
        localStorage.setItem(
            "defaultLoginSong",
            String(songIndex)
        );

        window.alert(
            `已将「${songName}」设为登录曲`
        );
    } catch (error) {
        console.warn(
            "无法保存登录曲：",
            error
        );
    }
}

function restoreDefaultLoginSong() {
    if (!audioElement) {
        return;
    }

    let savedIndex = Number.NaN;

    try {
        savedIndex =
            Number.parseInt(
                localStorage.getItem(
                    "defaultLoginSong"
                ),
                10
            );
    } catch (error) {
        console.warn(
            "无法读取登录曲：",
            error
        );

        return;
    }

    if (!isPlayableSong(savedIndex)) {
        return;
    }

    currentSongIndex =
        savedIndex;

    const song =
        playlist[currentSongIndex];

    audioElement.src =
        song.path;

    setActivePlaylistItem(
        currentSongIndex
    );

    applyCurrentSongVisuals(song);
}


/* ===========================
   12. 播放结束
=========================== */

function handleAudioEnded() {
    if (playPauseButton) {
        playPauseButton.textContent =
            "播放";
    }
}


/* ===========================
   13. 事件绑定
=========================== */

export function initializeMusicControls() {
    if (!audioElement) {
        console.warn(
            "未找到 #background-music，音乐控制不会启用。"
        );

        return;
    }

    previousSongButton
        ?.addEventListener(
            "click",
            playPreviousSong
        );

    playPauseButton
        ?.addEventListener(
            "click",
            togglePlayPause
        );

    nextSongButton
        ?.addEventListener(
            "click",
            playNextSong
        );

    volumeButton
        ?.addEventListener(
            "click",
            toggleVolumeSlider
        );

    playlistButton
        ?.addEventListener(
            "click",
            togglePlaylist
        );

    volumeSlider
        ?.addEventListener(
            "input",
            updateAudioVolume
        );

    progressBar
        ?.addEventListener(
            "input",
            seekAudio
        );

    audioElement.addEventListener(
        "timeupdate",
        updateProgressDisplay
    );

    audioElement.addEventListener(
        "loadedmetadata",
        updateProgressDisplay
    );

    audioElement.addEventListener(
        "durationchange",
        updateProgressDisplay
    );

    audioElement.addEventListener(
        "ended",
        handleAudioEnded
    );

    if (volumeSlider) {
        volumeSlider.value =
            "0.5";

        updateAudioVolume();
    }

    updateProgressDisplay();
    restoreDefaultLoginSong();
}