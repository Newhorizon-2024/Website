// 禁止浏览器恢复滚动位置
window.history.scrollRestoration = "manual";

// 页面加载时强制回到顶部
window.addEventListener("DOMContentLoaded", () => {
    window.scrollTo(0, 0);
});

let lenis = null;

function startExperience() {
    const audio = document.getElementById('background-music');

    // 用户点击后才播放
    audio.play().catch(err => {
        console.log("浏览器阻止了自动播放，需要用户交互:", err);
    });

    // 1. 解锁并加载动画
    document.body.classList.remove("locked");

    const bar = document.createElement("div");
    bar.id = "loading-bar";
    document.body.appendChild(bar);
    // 动画结束后移除元素
    bar.addEventListener("animationend", () => {
        bar.remove();
    });

    // 2. 淡出 overlay
    const overlayElement = document.getElementById('overlay');
    overlayElement.classList.add("hidden");
    
    // 3. 点击后才启动 Lenis
    lenis = new Lenis({
        smoothWheel: true,
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        autoResize: true,
    });

    lenis.scrollTo(0, { immediate: true });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // 4. 欢迎信息
    setTimeout(() => {
        overlayElement.style.display = 'none';
        // 再停顿 0.5 秒
        setTimeout(() => {
            showWelcomeMessage();
        }, 1000);
    }, 1250);
}

// 让 overlay 点击时触发 startExperience
document.addEventListener("DOMContentLoaded", () => {
    const overlayElement = document.getElementById('overlay');
    overlayElement.addEventListener("click", startExperience);
});

function showWelcomeMessage() {
    const welcomeMessage = document.getElementById('welcome-message');
    welcomeMessage.style.opacity = 1;
    setTimeout(() => {
        setTimeout(() => {
            welcomeMessage.style.opacity = 0;
            setTimeout(() => {
                showCountdown();
            }, 2500);
        }, 1000);
    }, 2500);
}

function showCountdown() {
    const countdownElement = document.getElementById('countdown');
    countdownElement.style.opacity = 1;
    if (typeof updateCountdown === 'function') {
        setInterval(updateCountdown, 1000);
    }
}

// 挂载到 window 对象上
window.startExperience = startExperience;
