/* ===========================
   1. 页面元素
=========================== */

const navbar = document.getElementById("navbar");
const navigationTabs = document.querySelectorAll("#navbar .tab");
const navigationIndicator = document.getElementById("nav-indicator");

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
    document.getElementById("volume-slider-container");

const progressBar =
    document.getElementById("progress-bar");

const audioElement =
    document.getElementById("background-music");

const currentTimeDisplay =
    document.getElementById("current-time");

const remainingTimeDisplay =
    document.getElementById("remaining-time");

const playlistButton =
    document.getElementById("playlist-btn");

const playlistContainer =
    document.getElementById("playlist-container");

const playlistList =
    document.getElementById("playlist");

const bossrushEyes =
    document.getElementById("bossrush-eyes");

const bossrushEyesBackground =
    document.getElementById("bossrush-eyes-bg");

const bossrushFilter =
    document.getElementById("bossrush-filter");


/* ===========================
   2. 导航栏状态
=========================== */

let currentActiveTab =
    navigationTabs.length > 0
        ? navigationTabs[0]
        : null;


/* ===========================
   3. 音乐播放列表
=========================== */

const playlist = [
    {
        separator: true,
        label: "— BOSSRUSH —"
    },

    {
        path: "media/Ensemble Of Fools - CDMusic.mp3",
        description:
            `游戏《泰拉瑞亚》"Terraria" Calamity Mod Boss Rush Tier 1`,
        speedMultiplier: 2
    },

    {
        path: "media/Onslaught Of Beasts - CDMusic.mp3",
        description:
            `游戏《泰拉瑞亚》"Terraria" Calamity Mod Boss Rush Tier 2`,
        speedMultiplier: 4
    },

    {
        path: "media/Reign Of Lords - CDMusic.mp3",
        description:
            `游戏《泰拉瑞亚》"Terraria" Calamity Mod Boss Rush Tier 3`,
        speedMultiplier: 6
    },

    {
        path: "media/Trial of the Insane - CDMusic.mp3",
        description:
            `游戏《泰拉瑞亚》"Terraria" Calamity Mod Boss Rush Tier 4`,
        speedMultiplier: 8
    },

    {
        separator: true,
        label: "— 影视曲 —"
    },

    {
        path:
            "media/Am I Dreaming - Metro Boomin、A$AP Rocky.mp3",
        description:
            `电影《蜘蛛侠：纵横宇宙》"Spider-Man:Across The Spider-Verse"`
    },

    {
        path:
            "media/Baby Blue (US Single Mix Remastered 2010) - Badfinger.mp3",
        description:
            `电视剧《绝命毒师》"Breaking Bad"`
    },

    {
        path:
            "media/Blizzard - 三浦大知.mp3",
        description:
            `电影《龙珠超：布罗利》"Dragon Ball Super:Broly"`
    },

    {
        path:
            "media/Bye Bye Bye - NSYNC.mp3",
        description:
            `电影《死侍与金刚狼》"Deadpool & Wolverine"`
    },

    {
        path:
            "media/CHA-LA HEAD-CHA-LA - 影山ヒロノブ.mp3",
        description:
            `动漫《龙珠Z》"Dragon Ball Z"`
    },

    {
        path:
            "media/DAN DAN 心魅かれてく - Field of View.mp3",
        description:
            `动漫《龙珠GT》"Dragon Ball GT"`
    },

    {
        path:
            "media/Do I Matter To Me - 赵寒.mp3",
        description:
            "动画《刺客五六七》"
    },

    {
        path:
            "media/F1 - Hans Zimmer.mp3",
        description:
            '电影"F1"'
    },

    {
        path:
            "media/Falling Apart - Daniel Pemberton.mp3",
        description:
            `电影《蜘蛛侠：纵横宇宙》"Spider-Man:Across The Spider-Verse"`
    },

    {
        path:
            "media/History Is Now - Natalie Holt.mp3",
        description:
            `电视剧《洛基》"Loki"`
    },

    {
        path:
            "media/History Is Now - Iván Cairo.mp3",
        description:
            `电视剧《洛基》"Loki"`
    },

    {
        path:
            "media/Kung Fu Fighting (Celebration Time) - Shanghai Roxi Musical Studio Choirs、Metro Voices London.mp3",
        description:
            `电影《功夫熊猫3》"Kung Fu Panda 3"`
    },

    {
        path:
            "media/Lightyears - Fiji Blue.mp3",
        description:
            `动画《命运拳台》"Ringing fate"`
    },

    {
        path:
            "media/STAY - Hans Zimmer.mp3",
        description:
            `电影《星际穿越》"Interstellar"`
    },

    {
        path:
            "media/Self Love - Metro Boomin、Coi Leray.mp3",
        description:
            `电影《蜘蛛侠：纵横宇宙》"Spider-Man:Across The Spider-Verse"`
    },

    {
        path:
            "media/Sunflower (Spider-Man Into the Spider-Verse) - Post Malone、Swae Lee.mp3",
        description:
            `电影《蜘蛛侠：平行宇宙》"Spider-Man: Into the Spider-Verse"`
    },

    {
        path:
            "media/TVA (From Loki Score) - Natalie Holt.mp3",
        description:
            `电视剧《洛基》"Loki"`
    },

    {
        path:
            "media/Whats Up Danger - Blackway、Black Caviar.mp3",
        description:
            `电影《蜘蛛侠：平行宇宙》"Spider-Man: Into the Spider-Verse"`
    },

    {
        path:
            "media/阿七 - 发条月亮.mp3",
        description:
            "动画《刺客五六七》"
    },

    {
        path:
            "media/怀抱的温柔并不属于我 - 牛奶咖啡.mp3",
        description:
            "动画《刺客五六七》"
    },

    {
        path:
            "media/记忆碎片 - 发条月亮、啊哈、伍六七.mp3",
        description:
            "动画《刺客伍六七》"
    },

    {
        path:
            "media/开启新征程2 - 阿鲲.mp3",
        description:
            "电影《流浪地球2》"
    },

    {
        path:
            "media/裏切り者のレクイエム (Diavolo Ver) - 長谷川大祐.mp3",
        description:
            `动漫《JOJO的奇妙冒险：黄金之风》"ジョジョの奇妙な冒険 黄金の風"`
    },

    {
        path:
            "media/平凡之路 - 朴树.mp3",
        description:
            "电影《后会无期》"
    },

    {
        path:
            "media/胸がドキドキ - THE HIGH-LOWS.mp3",
        description:
            `动漫《名侦探柯南》"名探偵コナン"`
    },

    {
        path:
            "media/嘘 (流行版) - 艾索.mp3",
        description:
            "动画《罗小黑战记》"
    },

    {
        path:
            "media/再见深海 (微亮的瞬间) - 唐汉霄.mp3",
        description:
            "电影《深海》"
    },

    {
        separator: true,
        label: "— 游戏曲 —"
    },

    {
        path:
            "media/Alpha - C418.mp3",
        description:
            `游戏《我的世界》"Minecraft"`
    },

    {
        path:
            "media/Avarice - David Fenn.mp3",
        description:
            `游戏《死亡之门》"Death's Door"`
    },

    {
        path:
            "media/Battle of the Demon King - Fontainebleau.mp3",
        description:
            "游戏《不/存在的你，和我》"
    },

    {
        path:
            "media/Comforting Memories - Minecraft、谷岡久美.mp3",
        description:
            `游戏《我的世界》"Minecraft"`
    },

    {
        path:
            "media/Catastrophes before the calamity - DM DOKURO.mp3",
        description:
            `游戏《泰拉瑞亚》"Terraria" Calamity Mod`
    },

    {
        path:
            "media/In Full Swing (游戏内录) - John Paesano.mp3",
        description:
            `游戏《漫威蜘蛛侠2》"Marvel Spider-Man 2"`
    },

    {
        path:
            "media/Mutation - C418.mp3",
        description:
            `游戏《我的世界》"Minecraft"`
    },

    {
        path:
            "media/My Actual Code - Draw Me A Pixel.mp3",
        description:
            `游戏《这里没有游戏》"There Is No Game"`
    },

    {
        path:
            "media/New World - 幻塔、钱润玉Runyu.mp3",
        description:
            `游戏《幻塔》"Tower of Fantasy"`
    },

    {
        path:
            "media/Sleepwalking - The Chain Gang of 1974.mp3",
        description:
            `游戏《侠盗猎车手5》"Grand Theft Auto V"`
    },

    {
        path:
            "media/Spider-Man (From Marvels Spider-Man Score) - John Paesano.mp3",
        description:
            `游戏《漫威蜘蛛侠》"Marvel Spider-Man"`
    },

    {
        path:
            "media/Stained, Brutal Calamity - DM DOKURO.mp3",
        description:
            `游戏《泰拉瑞亚》"Terraria" Calamity Mod`
    },

    {
        path:
            "media/Stellaris Suite Creation and Beyond - Andreas Waldetoft.mp3",
        description:
            `游戏《群星》"Stellaris"`
    },

    {
        path:
            "media/Summer of Monsters Main Menu - Brawl Stars.mp3",
        description:
            `游戏《荒野乱斗》"Brawl Stars"`
    },

    {
        path:
            "media/The Devourer of Gods (Nonstop Mix) - DM DOKURO.mp3",
        description:
            `游戏《泰拉瑞亚》"Terraria" Calamity Mod`
    },

    {
        path:
            "media/The Tale of a Cruel World - DM DOKURO.mp3",
        description:
            `游戏《泰拉瑞亚》"Terraria" Calamity Mod`
    },

    {
        path:
            "media/The Titan - Paradox Interactive.mp3",
        description:
            `游戏《群星》"Stellaris"`
    },

    {
        path:
            "media/不由己 - 陈彼得、游戏科学、8082Audio.mp3",
        description:
            `游戏《黑神话：悟空》"Black Myth:Goku"`
    },

    {
        path:
            "media/罗德行进曲 - BaoUner.mp3",
        description:
            `游戏《明日方舟》"Arknights"`
    },

    {
        path:
            "media/她 - 郎朗.mp3",
        description:
            `游戏《第五人格》"Identity_V"`
    },

    {
        path:
            "media/协议流 (游戏内录) - 铁痕电台-MSR、Mike Truman、Lottie Truman.mp3",
        description:
            `游戏《明日方舟：终末地》"Arknights:Endfield"`
    },

    {
        path:
            "media/众怒 - 塞壬唱片-MSR、Angry5JaR、EUROPA木卫二.mp3",
        description:
            `游戏《明日方舟》"Arknights"`
    },

    {
        separator: true,
        label: "— 分享曲 —"
    },

    {
        path:
            "media/2022欧美串烧王 - 陆鳐LuLu.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Deadman - 蔡徐坤.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Dehors (普通话版) - Jordann.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Diamond King - MC Jams.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Diamond King (REMIX) - MC Jams.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Earth Song - Michael Jackson.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Every Door - CG5.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Fathers Land - Jordan Critz.mp3",
        description:
            "分享自 Mortal"
    },

    {
        path:
            "media/Forest Mixtape - Christina Kuong.mp3",
        description:
            "分享自 Roastedfish"
    },

    {
        path:
            "media/From The Ground Up - Laura Shigihara.mp3",
        description:
            "分享自 Roastedfish"
    },

    {
        path:
            "media/Heal the World - Michael Jackson.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/HELL LIKE THIS - CG5.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Hope - 安室奈美恵.mp3",
        description:
            "分享自 Laniary"
    },

    {
        path:
            "media/How Do I Craft This again - WoodenToaster.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/I Really Want to Stay at Your House - Samuel Kim、Lorien.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Infinite Future (DRAGON BALL 40th Anniversary Special Video - Theme) - Hans Zimmer.mp3",
        description:
            "分享自 Arashi"
    },

    {
        path:
            "media/Infinitely Falling - Fly By Midnight.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Invincible (like u) - Dream.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Leave Before You Love Me - Marshmello、Jonas Brothers.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Let Go - Beau Young Prince.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Let Her Go - Passenger.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Lets Play Again - Hans Zimmer.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Lo-Fight (Remastered) - Whitty、Jean Magglio Gonzaga Contreras.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Marvel Studios Fanfare - Matheus Pereira.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Monster - STARSET.mp3",
        description:
            `游戏《明日方舟》"Arknights"概念宣传PV`
    },

    {
        path:
            "media/Neverland - Crywolf、Charity Lane.mp3",
        description:
            "分享自 Roastedfish"
    },

    {
        path:
            "media/OCD - CG5.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Our Own Heaven - Masetti.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Past Lives - Martin Arteta、11#11 Music Group、creamy、Jasper.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Pokemon - Dr Pez - VGM.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Roadtrip - PmBata、Dream.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Roadtrip (Dreams Version) - Dream、PmBata.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/STAY (Explicit) - The Kid LAROI、Justin Bieber.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Sparks - Lights & Motion.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Spider-Man Epic Suite (No Way Home Tribute) - Samuel Kim.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Stories of Hope - Steven Coltart、Marcus Warner.mp3",
        description:
            "分享自 Mortal"
    },

    {
        path:
            "media/Take On Me - a-ha.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/The Largest Black Hole - Epic Mountain.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Toes - Glass Animals.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Try - 派伟俊、周杰伦.mp3",
        description:
            "分享自 Mortal"
    },

    {
        path:
            "media/UNDERTALE三周年纪念·传说之下16首BGM四手联弹无缝串烧 - Kyle Xian.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Waiting For Superman - Daughtry.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Wake Me Up x After Hours (São Paulo Studio Version) - The Weeknd.mp3",
        description:
            "分享自 Mortal"
    },

    {
        path:
            "media/We Are The World - USA for Africa.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/Witch Parade Assassin - Ugress.mp3",
        description:
            "分享自 Laniary “我觉得这首配悬赏令很有搞头”"
    },

    {
        path:
            "media/How Do I Craft This again - WoodenToaster.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/モニタリング (Monitoring) - DECO27.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/病名は愛だった (Cover 鏡音リン_鏡音レン) - まふまふ.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/春嵐 - John.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/给你寄的信 - 小潮院长、杜海皇、小杨Johnson.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/即将到达 - 小杨Johnson.mp3",
        description:
            "分享自 小潮tEam"
    },

    {
        path:
            "media/就要做挑战 - 小潮院长、杜海皇、小傲想睡觉、高斯Goh.mp3",
        description:
            "分享自 小潮tEam"
    },

    {
        path:
            "media/逃生舱 - 老番茄.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/鲜花 - 回春丹乐队.mp3",
        description:
            "分享自 佚名"
    },

    {
        path:
            "media/游戏的King - 小砍丶、小潮院长.mp3",
        description:
            "分享自 小潮tEam"
    },

    {
        path:
            "media/蜘蛛糸モノポリー (蜘蛛丝Monopoly) - sasakure.UK、初音ミク.mp3",
        description:
            "分享自 佚名"
    }
];


/* ===========================
   4. 播放器状态
=========================== */

let currentSongIndex = 0;
let playlistLoaded = false;
let bossrushHideTimeout = null;
let cubeColorAnimationFrame = null;


/* ===========================
   5. 通用辅助函数
=========================== */

function isPlayableSong(index) {
    const song = playlist[index];

    return Boolean(
        song &&
        !song.separator &&
        typeof song.path === "string"
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


/* ===========================
   6. 导航栏指示器
=========================== */

function moveIndicator(tab) {
    if (
        !tab ||
        !navigationIndicator ||
        !tab.parentElement
    ) {
        return;
    }

    const tabRect =
        tab.getBoundingClientRect();

    const navigationRect =
        tab.parentElement
            .getBoundingClientRect();

    navigationIndicator.style.left =
        `${
            tabRect.left -
            navigationRect.left
        }px`;

    navigationIndicator.style.width =
        `${tabRect.width}px`;
}

function initializeNavigation() {
    if (
        !navbar ||
        !navigationIndicator ||
        navigationTabs.length === 0
    ) {
        return;
    }

    moveIndicator(currentActiveTab);

    navigationTabs.forEach(tab => {
        tab.addEventListener(
            "mouseenter",
            () => {
                moveIndicator(tab);
            }
        );

        tab.addEventListener(
            "click",
            () => {
                currentActiveTab = tab;

                moveIndicator(tab);

                const targetId =
                    tab.getAttribute(
                        "data-target"
                    );

                if (!targetId) {
                    return;
                }

                const targetElement =
                    document.getElementById(
                        targetId
                    );

                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: "smooth"
                    });
                }
            }
        );
    });

    navbar.addEventListener(
        "mouseleave",
        () => {
            moveIndicator(
                currentActiveTab
            );
        }
    );

    window.addEventListener(
        "resize",
        () => {
            moveIndicator(
                currentActiveTab
            );
        }
    );
}


/* ===========================
   7. 播放与切歌
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

function playPreviousSong() {
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
   8. 音量控制
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
   9. 播放进度
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
        )
    ) {
        return;
    }

    audioElement.currentTime =
        Number(progressBar.value) /
        100 *
        audioElement.duration;

    updateProgressDisplay();
}


/* ===========================
   10. 歌单面板
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
                document.createElement(
                    "li"
                );

            /*
             * 歌单分隔项
             */
            if (song.separator) {
                listItem.textContent =
                    song.label;

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

                        localStorage.setItem(
                            "defaultLoginSong",
                            String(index)
                        );

                        window.alert(
                            `已将「${songName}」设为登录曲`
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
   11. 指定歌曲播放
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

    applySongVisuals(song);

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
   12. Bossrush 视觉效果
=========================== */

function applySongVisuals(song) {
    const speedMultiplier =
        song.speedMultiplier || 1;

    window.globalSpeedMultiplier =
        speedMultiplier;

    const root =
        document.documentElement;

    switch (speedMultiplier) {
        case 2:
            root.style.setProperty(
                "--eyes-size",
                "clamp(100px, 35vw, 200px)"
            );

            root.style.setProperty(
                "--eyes-bg-size",
                "clamp(150px, 35vw, 300px)"
            );

            fadeCubeColor("#888888");
            break;

        case 4:
            root.style.setProperty(
                "--eyes-size",
                "clamp(200px, 45vw, 400px)"
            );

            root.style.setProperty(
                "--eyes-bg-size",
                "clamp(200px, 45vw, 400px)"
            );

            fadeCubeColor("#666666");
            break;

        case 6:
            root.style.setProperty(
                "--eyes-size",
                "clamp(300px, 55vw, 600px)"
            );

            root.style.setProperty(
                "--eyes-bg-size",
                "clamp(300px, 55vw, 600px)"
            );

            fadeCubeColor("#444444");
            break;

        case 8:
            root.style.setProperty(
                "--eyes-size",
                "clamp(400px, 65vw, 800px)"
            );

            root.style.setProperty(
                "--eyes-bg-size",
                "clamp(400px, 65vw, 800px)"
            );

            fadeCubeColor("#222222");
            break;

        default:
            fadeOutBossrush();
            fadeCubeColor("#888888");
            return;
    }

    showBossrush();
}

function showBossrush() {
    if (bossrushHideTimeout) {
        window.clearTimeout(
            bossrushHideTimeout
        );

        bossrushHideTimeout = null;
    }

    [
        bossrushEyes,
        bossrushEyesBackground,
        bossrushFilter
    ].forEach(element => {
        if (!element) {
            return;
        }

        element.style.animation = "";
        element.style.display = "block";
    });
}

function fadeOutBossrush() {
    const bossrushElements = [
        bossrushEyes,
        bossrushEyesBackground,
        bossrushFilter
    ].filter(Boolean);

    if (
        bossrushElements.length === 0
    ) {
        return;
    }

    if (bossrushHideTimeout) {
        window.clearTimeout(
            bossrushHideTimeout
        );
    }

    bossrushElements.forEach(element => {
        element.style.animation =
            "bossrushFadeOut 1s ease-out forwards";
    });

    bossrushHideTimeout =
        window.setTimeout(
            () => {
                bossrushElements.forEach(
                    element => {
                        element.style.display =
                            "none";

                        element.style.animation =
                            "";
                    }
                );

                bossrushHideTimeout =
                    null;
            },
            1000
        );
}

function fadeCubeColor(
    targetColor,
    duration = 600
) {
    if (
        !window.material ||
        !window.material.color ||
        typeof THREE === "undefined"
    ) {
        return;
    }

    if (cubeColorAnimationFrame) {
        window.cancelAnimationFrame(
            cubeColorAnimationFrame
        );
    }

    const startingColor =
        window.material.color.clone();

    const endingColor =
        new THREE.Color(targetColor);

    const startingTime =
        performance.now();

    function updateCubeColor(time) {
        const progress =
            Math.min(
                1,
                (
                    time -
                    startingTime
                ) /
                duration
            );

        window.material.color
            .copy(startingColor)
            .lerp(
                endingColor,
                progress
            );

        if (progress < 1) {
            cubeColorAnimationFrame =
                window.requestAnimationFrame(
                    updateCubeColor
                );

            return;
        }

        cubeColorAnimationFrame =
            null;
    }

    cubeColorAnimationFrame =
        window.requestAnimationFrame(
            updateCubeColor
        );
}


/* ===========================
   13. 登录曲
=========================== */

function restoreDefaultLoginSong() {
    if (!audioElement) {
        return;
    }

    const savedIndex =
        Number.parseInt(
            localStorage.getItem(
                "defaultLoginSong"
            ),
            10
        );

    if (
        !isPlayableSong(savedIndex)
    ) {
        return;
    }

    currentSongIndex =
        savedIndex;

    audioElement.src =
        playlist[
            currentSongIndex
        ].path;

    setActivePlaylistItem(
        currentSongIndex
    );
}


/* ===========================
   14. 事件绑定
=========================== */

function initializeMusicControls() {
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
        () => {
            if (playPauseButton) {
                playPauseButton.textContent =
                    "播放";
            }
        }
    );

    if (volumeSlider) {
        volumeSlider.value =
            "0.5";

        updateAudioVolume();
    }

    updateProgressDisplay();
    restoreDefaultLoginSong();
}


/* ===========================
   15. 页面初始化
=========================== */

function initializeControls() {
    initializeNavigation();
    initializeMusicControls();
}

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeControls,
        { once: true }
    );
} else {
    initializeControls();
}
