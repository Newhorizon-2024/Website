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
    { path: 'media/In Full Swing (游戏内录) - John Paesano.mp3', description: '分享自 Arashi' },
    { path: 'media/History Is Now - Natalie Holt.flac', description: '分享自 UNKNOWN' },
    { path: 'media/The Tale of a Cruel World - DM DOKURO.flac', description: '分享自 Arashi' },
    { path: 'media/Stained, Brutal Calamity - DM DOKURO.mp3', description: '分享自 Arashi' },
    { path: 'media/再见深海 (微亮的瞬间) - 唐汉霄.mp3', description: '分享自 Arashi' },
    { path: 'media/Leave Before You Love Me - Marshmello、Jonas Brothers.flac', description: '“Cheer up.” 分享自 JACK!BENJAMIN' },
    { path: 'media/Lose Somebody - Kygo、OneRepublic.flac', description: '“I am by your side.” 分享自 JACK!BENJAMIN' },
    { path: 'media/This Years Gonna Hurt - Lost Stars、Aaron Bonus.flac', description: '“Alan.” 分享自 JACK!BENJAMIN' },
    { path: 'media/Starlight - Westlife.mp3', description: '分享自 Julio.' },
    { path: 'media/Its Time - Imagine Dragons.mp3', description: '分享自 Shirley' },
    { path: 'media/涅槃 (Phoenix) - 英雄联盟.flac', description: '“well done buddy” 分享自 Carter' },
    { path: 'media/Starlight - Westlife.mp3', description: '分享自 Carter' },
    { path: 'media/Bye Bye Bye - NSYNC.mp3', description: '分享自 Carter' },
    { path: 'media/Wish Youd Miss Me - Chase Wright.flac', description: '分享自 Omega' },
    { path: 'media/Say Hello - Elijah Woods.mp3', description: '“Just go for it!” 分享自 Hubble0714' },
    { path: 'media/Save Your Tears (Explicit) - The Weeknd.mp3', description: '分享自 Steve' },
    { path: 'media/I Really Want to Stay at Your House - Samuel Kim、Lorien.mp3', description: '“I hope it can comfort you.” 分享自 Steve' },
    { path: 'media/Our Own Heaven - Masetti.mp3', description: '分享自 Arashi' },
    { path: 'media/Infinitely Falling - Fly By Midnight.mp3', description: '分享自 Arashi' },
    { path: 'media/记忆碎片 - 发条月亮、啊哈、伍六七.mp3', description: '分享自 Laniary' },
    { path: 'media/未竟 - 秦勇、游戏科学、8082Audio.mp3', description: '分享自 Laniary' },
    { path: 'media/Hope - 安室奈美恵.mp3', description: '分享自 Laniary' },
    { path: 'media/Baby Blue - Badfinger.mp3', description: '分享自 Arashi' }
];

let currentSongIndex = 0; // 默认播放第一首歌曲

// 播放/暂停功能
function togglePlayPause() {
    if (audioElement.paused) {
        audioElement.play();
        playPauseButton.textContent = '暂停'; // 修改按钮文本为暂停
    } else {
        audioElement.pause();
        playPauseButton.textContent = '播放'; // 修改按钮文本为播放
    }
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
        currentSongIndex += 1;
        playSong(currentSongIndex); // 调用 playSong 函数播放歌曲
    }
}

// 为按钮绑定事件监听器
prevSongButton.addEventListener('click', playPreviousSong);
playPauseButton.addEventListener('click', togglePlayPause);
nextSongButton.addEventListener('click', playNextSong);

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

// 加载歌单并显示描述
function loadPlaylist() {
    playlistList.innerHTML = '';  // 清空现有的列表
    playlist.forEach((song, index) => {
        const listItem = document.createElement('li');

        // 去掉音频文件的后缀
        const songName = song.path.split('/').pop().replace(/\.[^/.]+$/, '');

        listItem.innerHTML = `<strong>${songName}</strong> - ${song.description}`; // 显示歌曲名和描述
        listItem.addEventListener('click', () => {
            playSong(index);  // 点击歌曲时播放对应的歌曲
        });
        playlistList.appendChild(listItem);
    });
}


// 播放指定歌曲
function playSong(index) {
    currentSongIndex = index;
    audioElement.src = playlist[currentSongIndex].path;
    audioElement.play();
    playPauseButton.textContent = '暂停';  // 播放时显示暂停
}
