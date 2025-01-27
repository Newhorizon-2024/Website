function startExperience() {
    const audio = document.getElementById('background-music');
    audio.play();

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
        }, 1000); // Pause for 1 second before fading out
    }, 2500); // Fade in duration
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
