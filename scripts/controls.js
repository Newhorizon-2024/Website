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
    { separator: true, label: "— 推荐的登录曲 —" },
    
    { separator: true, label: "— BOSSRUSH —" },

    { path: 'media/Ensemble Of Fools - CDMusic.mp3',
        description: `游戏《泰拉瑞亚》"Terraria" Calamity Mod Boss Rush Tier 1`,
        speedMultiplier: 1 },

    { path: 'media/Onslaught Of Beasts - CDMusic.mp3',
        description: `游戏《泰拉瑞亚》"Terraria" Calamity Mod Boss Rush Tier 2`,
        speedMultiplier: 2 },

    { path: 'media/Reign Of Lords - CDMusic.mp3',
        description: `游戏《泰拉瑞亚》"Terraria" Calamity Mod Boss Rush Tier 3`,
        speedMultiplier: 3 },

    { path: 'media/Trial of the Insane - CDMusic.mp3',
        description: `游戏《泰拉瑞亚》"Terraria" Calamity Mod Boss Rush Tier 4`,
        speedMultiplier: 4 },

    { separator: true, label: "— 影视曲 —" },

    { path: 'media/Am I Dreaming - Metro Boomin、A$AP Rocky.mp3', description: `电影《蜘蛛侠：纵横宇宙》"Spider-Man:Across The Spider-Verse"` },
    { path: 'media/Baby Blue (US Single Mix Remastered 2010) - Badfinger.mp3', description: `电视剧《绝命毒师》"Breaking Bad"` },
    { path: 'media/Blizzard - 三浦大知.mp3', description: `电影《龙珠超：布罗利》"Dragon Ball Super:Broly"` },
    { path: 'media/Bye Bye Bye - NSYNC.mp3', description: `电影《死侍与金刚狼》"Deadpool & Wolverine"` },
    { path: 'media/CHA-LA HEAD-CHA-LA - 影山ヒロノブ.mp3', description: `动漫《龙珠Z》"Dragon Ball Z"` },
    { path: 'media/DAN DAN 心魅かれてく - Field of View.mp3', description: `动漫《龙珠GT》"Dragon Ball GT"` },
    { path: 'media/Do I Matter To Me - 赵寒.mp3', description: `动画《刺客五六七》` },
    { path: 'media/F1 - Hans Zimmer.mp3', description: `电影"F1"` },
    { path: 'media/History Is Now - Natalie Holt.mp3', description: `电视剧《洛基》"Loki"` },
    { path: 'media/History Is Now - Iván Cairo.mp3', description: `电视剧《洛基》"Loki"` },
    { path: 'media/Kung Fu Fighting (Celebration Time) - Shanghai Roxi Musical Studio Choirs、Metro Voices London.mp3', description: `电影《功夫熊猫3》"Kung Fu Panda 3"` },
    { path: 'media/Lightyears - Fiji Blue.mp3', description: `动画《命运拳台》"Ringing fate"` },
    { path: 'media/STAY - Hans Zimmer.mp3', description: `电影《星际穿越》"Interstellar"` },
    { path: 'media/Self Love - Metro Boomin、Coi Leray.mp3', description: `电影《蜘蛛侠：纵横宇宙》"Spider-Man:Across The Spider-Verse"` },
    { path: 'media/Sunflower (Spider-Man Into the Spider-Verse) - Post Malone、Swae Lee.mp3', description: `电影《蜘蛛侠：平行宇宙》"Spider-Man: Into the Spider-Verse"` },
    { path: 'media/TVA (From Loki Score) - Natalie Holt.mp3', description: `电视剧《洛基》"Loki"` },
    { path: 'media/Whats Up Danger - Blackway、Black Caviar.mp3', description: `电影《蜘蛛侠：平行宇宙》"Spider-Man: Into the Spider-Verse"` },
    { path: 'media/怀抱的温柔并不属于我 - 牛奶咖啡.mp3', description: `动画《刺客五六七》` },
    { path: 'media/记忆碎片 - 发条月亮、啊哈、伍六七.mp3', description: `动画《刺客伍六七》` },
    { path: 'media/开启新征程2 - 阿鲲.mp3', description: `电影《流浪地球2》` },
    { path: 'media/裏切り者のレクイエム (Diavolo Ver) - 長谷川大祐.mp3', description: `动漫《JOJO的奇妙冒险：黄金之风》"ジョジョの奇妙な冒険 黄金の風"` },
    { path: 'media/平凡之路 - 朴树.mp3', description: `电影《后会无期》` },
    { path: 'media/嘘 (流行版) - 艾索.mp3', description: `动画《罗小黑战记》` },
    { path: 'media/再见深海 (微亮的瞬间) - 唐汉霄.mp3', description: `电影《深海》` },

    { separator: true, label: "— 游戏曲 —" },

    { path: 'media/Alpha - C418.mp3', description: `游戏《我的世界》"Minecraft"` },
    { path: 'media/Arknights Endfield Login Theme (游戏内录) - Hypergryph.mp3', description: `游戏《明日方舟：终末地》"Arknights:Endfield"` },
    { path: 'media/Avarice - David Fenn.mp3', description: `游戏《死亡之门》"Death's Door"` },
    { path: 'media/Battle of the Demon King - Fontainebleau.mp3', description: `游戏《不/存在的你，和我》` },
    { path: 'media/Comforting Memories - Minecraft、谷岡久美.mp3', description: `游戏《我的世界》"Minecraft"` },
    { path: 'media/Mutation - C418.mp3', description: `游戏《我的世界》"Minecraft"` },
    { path: 'media/My Actual Code - Draw Me A Pixel.mp3', description: `游戏《这里没有游戏》"There Is No Game"` },
    { path: 'media/New World - 幻塔、钱润玉Runyu.mp3', description: `游戏《幻塔》"Tower of Fantasy"` },
    { path: 'media/Sleepwalking - The Chain Gang of 1974.mp3', description: `游戏《侠盗猎车手5》"Grand Theft Auto V"` },
    { path: 'media/Stellaris Suite Creation and Beyond - Andreas Waldetoft.mp3', description: `游戏《群星》"Stellaris"` },
    { path: 'media/Summer of Monsters Main Menu - Brawl Stars.mp3', description: `游戏《荒野乱斗》"Brawl Stars"` },
    { path: 'media/The Titan - Paradox Interactive.mp3', description: `游戏《群星》"Stellaris"` },
    { path: 'media/罗德行进曲 - BaoUner.mp3', description: `游戏《明日方舟》"Arknights"` },
    { path: 'media/她 - 郎朗.mp3', description: `游戏《第五人格》"Identity_V"` },

    { separator: true, label: "— 分享曲 —" },

    { path: 'media/2022欧美串烧王 - 陆鳐LuLu.mp3', description: `分享自 佚名` },
    { path: 'media/Deadman - 蔡徐坤.mp3', description: `分享自 佚名` },
    { path: 'media/Dehors (普通话版) - Jordann.mp3', description: `分享自 佚名` },
    { path: 'media/Diamond King - MC Jams.mp3', description: `分享自 佚名` },
    { path: 'media/Diamond King (REMIX) - MC Jams.mp3', description: `分享自 佚名` },
    { path: 'media/Earth Song - Michael Jackson.mp3', description: `分享自 佚名` },
    { path: 'media/Every Door - CG5.mp3', description: `分享自 佚名` },
    { path: 'media/Falling Apart - Daniel Pemberton.mp3', description: `分享自 佚名` },
    { path: 'media/Fathers Land - Jordan Critz.mp3', description: `分享自 Mortal` },
    { path: 'media/Forest Mixtape - Christina Kuong.mp3', description: `分享自 Roastedfish` },
    { path: 'media/From The Ground Up - Laura Shigihara.mp3', description: `分享自 Roastedfish` },
    { path: 'media/Heal the World - Michael Jackson.mp3', description: `分享自 佚名` },
    { path: 'media/HELL LIKE THIS - CG5.mp3', description: `分享自 佚名` },
    { path: 'media/Hope - 安室奈美恵.mp3', description: `分享自 Laniary` },
    { path: 'media/How Do I Craft This again - WoodenToaster.mp3', description: `分享自 佚名` },
    { path: 'media/I Really Want to Stay at Your House - Samuel Kim、Lorien.mp3', description: `分享自 佚名` },
    { path: 'media/In Full Swing (游戏内录) - John Paesano.mp3', description: `分享自 佚名` },
    { path: 'media/Infinite Future (DRAGON BALL 40th Anniversary Special Video - Theme) - Hans Zimmer.mp3', description: `分享自 Arashi` },
    { path: 'media/Infinitely Falling - Fly By Midnight.mp3', description: `分享自 佚名` },
    { path: 'media/Invincible (like u) - Dream.mp3', description: `分享自 佚名` },
    { path: 'media/Leave Before You Love Me - Marshmello、Jonas Brothers.mp3', description: `分享自 佚名` },
    { path: 'media/Let Go - Beau Young Prince.mp3', description: `分享自 佚名` },
    { path: 'media/Let Her Go - Passenger.mp3', description: `分享自 佚名` },
    { path: 'media/Lets Play Again - Hans Zimmer.mp3', description: `分享自 佚名` },
    { path: 'media/Lo-Fight (Remastered) - Whitty、Jean Magglio Gonzaga Contreras.mp3', description: `分享自 佚名` },
    { path: 'media/Marvel Studios Fanfare - Matheus Pereira.mp3', description: `分享自 佚名` },
    { path: 'media/Monster - STARSET.mp3', description: `游戏《明日方舟》"Arknights"概念宣传PV` },
    { path: 'media/Neverland - Crywolf、Charity Lane.mp3', description: `分享自 Roastedfish` },
    { path: 'media/OCD - CG5.mp3', description: `分享自 佚名` },
    { path: 'media/Our Own Heaven - Masetti.mp3', description: `分享自 佚名` },
    { path: 'media/Past Lives - Martin Arteta、11#11 Music Group、creamy、Jasper.mp3', description: `分享自 佚名` },
    { path: 'media/Pokemon - Dr Pez - VGM.mp3', description: `分享自 佚名` },
    { path: 'media/Roadtrip - PmBata、Dream.mp3', description: `分享自 佚名` },
    { path: 'media/Roadtrip (Dreams Version) - Dream、PmBata.mp3', description: `分享自 佚名` },
    { path: 'media/STAY (Explicit) - The Kid LAROI、Justin Bieber.mp3', description: `分享自 佚名` },
    { path: 'media/Sparks - Lights & Motion.mp3', description: `分享自 佚名` },
    { path: 'media/Spider-Man (From Marvels Spider-Man Score) - John Paesano.mp3', description: `分享自 佚名` },
    { path: 'media/Spider-Man Epic Suite (No Way Home Tribute) - Samuel Kim.mp3', description: `分享自 佚名` },
    { path: 'media/Stained, Brutal Calamity - DM DOKURO.mp3', description: `分享自 Arashi` },
    { path: 'media/Stories of Hope - Steven Coltart、Marcus Warner.mp3', description: `分享自 Mortal` },
    { path: 'media/Take On Me - a-ha.mp3', description: `分享自 佚名` },
    { path: 'media/The Devourer of Gods (Nonstop Mix) - DM DOKURO.mp3', description: `分享自 Arashi` },
    { path: 'media/The Largest Black Hole - Epic Mountain.mp3', description: `分享自 佚名` },
    { path: 'media/The Tale of a Cruel World - DM DOKURO.mp3', description: `分享自 Arashi` },
    { path: 'media/Toes - Glass Animals.mp3', description: `分享自 佚名` },
    { path: 'media/Try - 派伟俊、周杰伦.mp3', description: `分享自 Mortal` },
    { path: 'media/UNDERTALE三周年纪念·传说之下16首BGM四手联弹无缝串烧 - Kyle Xian.mp3', description: `分享自 佚名` },
    { path: 'media/Waiting For Superman - Daughtry.mp3', description: `分享自 佚名` },
    { path: 'media/Wake Me Up x After Hours (São Paulo Studio Version) - The Weeknd.mp3', description: `分享自 Mortal` },
    { path: 'media/We Are The World - USA for Africa.mp3', description: `分享自 佚名` },
    { path: 'media/Witch Parade Assassin - Ugress.mp3', description: `分享自 Laniary “我觉得这首配悬赏令很有搞头”` },
    { path: 'media/How Do I Craft This again - WoodenToaster.mp3', description: `分享自 佚名` },
    { path: 'media/モニタリング (Monitoring) - DECO27.mp3', description: `分享自 佚名` },
    { path: 'media/阿七 - 发条月亮.mp3', description: `分享自 佚名` },
    { path: 'media/病名は愛だった (Cover 鏡音リン_鏡音レン) - まふまふ.mp3', description: `分享自 佚名` },
    { path: 'media/不由己 - 陈彼得、游戏科学、8082Audio.mp3', description: `分享自 佚名` },
    { path: 'media/春嵐 - John.mp3', description: `分享自 佚名` },
    { path: 'media/给你寄的信 - 小潮院长、杜海皇、小杨Johnson.mp3', description: `分享自 佚名` },
    { path: 'media/即将到达 - 小杨Johnson.mp3', description: `分享自 小潮tEam` },
    { path: 'media/就要做挑战 - 小潮院长、杜海皇、小傲想睡觉、高斯Goh.mp3', description: `分享自 小潮tEam` },
    { path: 'media/逃生舱 - 老番茄.mp3', description: `分享自 佚名` },
    { path: 'media/鲜花 - 回春丹乐队.mp3', description: `分享自 佚名` },
    { path: 'media/游戏的King - 小砍丶、小潮院长.mp3', description: `分享自 小潮tEam` },
    { path: 'media/蜘蛛糸モノポリー (蜘蛛丝Monopoly) - sasakure.UK、初音ミク.mp3', description: `分享自 佚名` },
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
    playlistList.innerHTML = '';  

    let lastSeparator = null;

    playlist.forEach((song, index) => {
        const listItem = document.createElement('li');

        // 分割线（可折叠）
        if (song.separator) {
            listItem.textContent = song.label;
            listItem.style.textAlign = "center";
            listItem.style.fontWeight = "bold";
            listItem.style.margin = "12px 0";
            listItem.style.opacity = "0.7";
            listItem.classList.add("playlist-separator");

            // ⭐ 默认折叠
            listItem.dataset.collapsed = "true";

            // ⭐ 点击切换折叠状态
            listItem.addEventListener('click', () => {
            const collapsed = listItem.dataset.collapsed === "true";
            listItem.dataset.collapsed = collapsed ? "false" : "true";

            let next = listItem.nextSibling;
            while (next && !next.classList.contains("playlist-separator")) {
                next.style.display = collapsed ? "flex" : "none";
                next = next.nextSibling;
            }
        });


            playlistList.appendChild(listItem);
            lastSeparator = listItem;
            return;
        }

        // 正常歌曲
        const songName = song.path.split('/').pop().replace(/\.[^/.]+$/, '');
        const nameSpan = document.createElement('span');
        nameSpan.innerHTML = `<strong>${songName}</strong> - ${song.description}`;

        // 默认折叠：如果上一个分割线是折叠状态，则隐藏本歌曲
        if (lastSeparator && lastSeparator.dataset.collapsed === "true") {
            listItem.style.display = "none";
        }

        // “登录曲”按钮
        const loginBtn = document.createElement('button');
        loginBtn.textContent = "登录曲";
        loginBtn.classList.add("login-song-btn");
        loginBtn.title = "设置为每次登录网页播放的歌曲"; // 鼠标提示

        // 点击设置默认歌曲
        loginBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 防止触发播放
            localStorage.setItem("defaultLoginSong", index);
            alert(`已将「${songName}」设为登录曲`);
        });

        // 组合
        listItem.appendChild(nameSpan);
        listItem.appendChild(loginBtn);

        // 点击播放
        listItem.addEventListener('click', () => playSong(index));
        playlistList.appendChild(listItem);

        // ⭐ 手机端：点击歌曲项时切换按钮显示 
        listItem.addEventListener('touchstart', () => { 
            if (loginBtn.style.display === "none" || loginBtn.style.display === "") { 
                loginBtn.style.display = "inline-block"; 
            } else { 
                loginBtn.style.display = "none"; 
            } 
        });
    });

}

// 播放指定歌曲
function playSong(index) {
    currentSongIndex = index;
    audioElement.src = playlist[currentSongIndex].path;
    audioElement.play();
    playPauseButton.textContent = '暂停';  // 播放时显示暂停

    //  根据歌曲设置背景速度倍率（Boss Rush 加速）
    globalSpeedMultiplier = playlist[currentSongIndex].speedMultiplier || 1;
}

// 默认音量条位置（视觉 50%）
volumeSlider.value = 0.5;

// 默认实际音量（听觉 50%）
audioElement.volume = Math.pow(0.5, 2);

window.addEventListener("load", () => {
    const saved = localStorage.getItem("defaultLoginSong");

    if (saved !== null) {
        // 用户设置过登录曲 → 播放用户的
        playSong(parseInt(saved));
    } else {
        // 用户没有设置 → 播放官方默认歌曲（HTML 中的 source）
        audioElement.play();
    }
});

