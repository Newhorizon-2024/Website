function startExperience() {
    const audio = document.getElementById('background-music');

    // 用户点击后才播放
    audio.play().catch(err => {
        console.log("浏览器阻止了自动播放，需要用户交互:", err);
    });

    const overlayElement = document.getElementById('overlay');
    overlayElement.style.opacity = 0;
    setTimeout(() => {
        overlayElement.style.display = 'none';
        showWelcomeMessage();
    }, 2000);
}

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

// 关键：让 overlay 点击时触发 startExperience
document.addEventListener("DOMContentLoaded", () => {
    const overlayElement = document.getElementById('overlay');
    overlayElement.addEventListener("click", startExperience);
});
