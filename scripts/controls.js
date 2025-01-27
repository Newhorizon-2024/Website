// 获取按钮元素
const prevSongButton = document.getElementById('prev-song-btn');
const playPauseButton = document.getElementById('play-pause-btn');
const nextSongButton = document.getElementById('next-song-btn');
const volumeButton = document.getElementById('volume-btn');
const volumeSlider = document.getElementById('volume-slider');
const progressBar = document.getElementById('progress-bar');
const audioElement = document.getElementById('background-music');

// 获取时间显示元素
const currentTimeDisplay = document.getElementById('current-time');
const remainingTimeDisplay = document.getElementById('remaining-time');

// 音乐播放列表（可以根据需要添加更多歌曲）
const playlist = [
    'media/in-full-swing(game).mp3',
    'media/loki.flac', // 这里可以替换为实际的音频路径
    'media/the-tale-of-a-cruel-world.flac',
    'media/stained,-brutal-calamity.mp3',
];

let currentSongIndex = 0; // 当前播放的歌曲索引

// 播放/暂停功能
function togglePlayPause() {
    if (audioElement.paused)   
        playPauseButton.textContent = '暂停'; // 修改按钮文本为暂停
        audioElement.pause();
        playPauseButton.textContent = '播放'; // 修改按钮文本为播放
    
}

// 播放上一首（不循环）
function playPreviousSong() {
    // 只播放上一首歌，且不循环
    if (currentSongIndex > 0) {
        currentSongIndex -= 1;
        playSong(currentSongIndex); // 调用 playSong 函数播放歌曲
    }
}

// 播放下一首（不循环）
function playNextSong() {
    // 只播放下一首歌，且不循环
    if (currentSongIndex < playlist.length - 1) {
        currentSongIndex += 2;
        playSong(currentSongIndex); // 调用 playSong 函数播放歌曲
    }
}

// 音量控制
volumeSlider.addEventListener('input', (e) => {
    audioElement.volume = e.target.value; // 设置音量
});

// 进度条控制
audioElement.addEventListener('timeupdate', () => {
    const progress = (audioElement.currentTime / audioElement.duration) * 100;
    progressBar.value = progress; // 更新进度条

    // 更新已播放时间
    const currentMinutes = Math.floor(audioElement.currentTime / 60);
    const currentSeconds = Math.floor(audioElement.currentTime % 60);
    currentTimeDisplay.textContent = `${currentMinutes}:${currentSeconds < 10 ? '0' + currentSeconds : currentSeconds}`;

    // 更新剩余时间
    const remainingTime = audioElement.duration - audioElement.currentTime;
    const remainingMinutes = Math.floor(remainingTime / 60);
    const remainingSeconds = Math.floor(remainingTime % 60);
    remainingTimeDisplay.textContent = `${remainingMinutes}:${remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds}`;
});

// 点击进度条跳转
progressBar.addEventListener('input', (e) => {
    const seekTime = (e.target.value / 100) * audioElement.duration;
    audioElement.currentTime = seekTime; // 跳转到进度条的对应位置
});

// 音量按钮点击显示/隐藏音量调节条
volumeButton.addEventListener('click', () => {
    const volumeSliderContainer = document.getElementById('volume-slider-container');
    volumeSliderContainer.style.display = volumeSliderContainer.style.display === 'none' ? 'block' : 'none'; // 切换显示和隐藏
});

// 歌单部分控制
const playlistButton = document.getElementById('playlist-btn');
const playlistContainer = document.getElementById('playlist-container');
const playlistList = document.getElementById('playlist');

// 显示/隐藏歌单
playlistButton.addEventListener('click', () => {
    if (playlistContainer.style.display === 'none') {
        playlistContainer.style.display = 'block';
        loadPlaylist();  // 加载歌单
    } else {
        playlistContainer.style.display = 'none';
    }
});

// 加载歌单
function loadPlaylist() {
    playlistList.innerHTML = '';  // 清空现有的列表
    playlist.forEach((song, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = song.split('/').pop();  // 获取文件名作为歌曲名称
        listItem.addEventListener('click', () => {
        playSong(index);  // 点击歌曲时播放对应的歌曲
        });
        playlistList.appendChild(listItem);
    });
}

// 播放指定歌曲
function playSong(index) {
    currentSongIndex = index;
    audioElement.src = playlist[currentSongIndex];
    audioElement.play();
    playPauseButton.textContent = '暂停';  // 播放时显示暂停
}