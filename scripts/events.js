document.addEventListener('DOMContentLoaded', () => {
    const countdownText = document.getElementById('countdown');

    function showAgeTooltip(event) {
        // 检查倒计时是否可见
        const style = getComputedStyle(countdownText);
        if (style.opacity === '0' || style.display === 'none') {
            return; // 如果倒计时不可见，则退出函数
        }

        const tooltip = document.createElement('div');
        tooltip.id = 'age-tooltip';
        tooltip.textContent = `New Horizon 的年龄`;
        tooltip.style.position = 'absolute';
        tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '5px 10px';
        tooltip.style.borderRadius = '5px';
        tooltip.style.fontSize = '0.9em';
        tooltip.style.whiteSpace = 'nowrap';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.zIndex = '1000';
        tooltip.style.left = `${event.pageX + 10}px`;
        tooltip.style.top = `${event.pageY + 10}px`;

        document.body.appendChild(tooltip);

        function updateTooltipPosition(e) {
            tooltip.style.left = `${e.pageX + 10}px`;
            tooltip.style.top = `${e.pageY + 10}px`;
        }

        countdownText.addEventListener('mousemove', updateTooltipPosition);

        function removeTooltip() {
            tooltip.remove();
            countdownText.removeEventListener('mousemove', updateTooltipPosition);
            countdownText.removeEventListener('mouseleave', removeTooltip);
            countdownText.removeEventListener('click', removeTooltip);
        }

        countdownText.addEventListener('mouseleave', removeTooltip);
        countdownText.addEventListener('click', removeTooltip);
    }

    countdownText.addEventListener('mouseenter', showAgeTooltip);
    countdownText.addEventListener('click', showAgeTooltip);
});

// 获取按钮元素
const toggleScrollbarButton = document.getElementById('toggle-scrollbar');

// 设置按钮显示函数
function showScrollbarButton() {
    toggleScrollbarButton.style.display = 'block';  // 显示按钮
    setTimeout(() => {
        toggleScrollbarButton.style.opacity = 1;  // 透明度渐变显示
    }, 100);  // 稍微延迟，确保样式生效
}

// 隐藏按钮函数
function hideScrollbarButton() {
    toggleScrollbarButton.style.opacity = 0;  // 透明度渐变消失
    setTimeout(() => {
        toggleScrollbarButton.style.display = 'none';  // 隐藏按钮
    }, 2000);  // 等待透明度渐变完毕后隐藏按钮
}

// 绑定按钮点击事件，切换滚动条
toggleScrollbarButton.addEventListener('click', () => {
    const bodyStyle = document.body.style;
    if (bodyStyle.overflow === 'hidden') {
        bodyStyle.overflow = 'auto';  // 显示滚动条
        hideScrollbarButton();  // 隐藏按钮
    } else {
        bodyStyle.overflow = 'hidden';  // 隐藏滚动条
        showScrollbarButton();  // 再次显示按钮
    }
});

// 当倒计时出现后，调用显示按钮
window.addEventListener('DOMContentLoaded', () => {
    // 等待倒计时渲染后再显示按钮
    const countdownElement = document.getElementById('countdown');
    if (countdownElement) {
        countdownElement.addEventListener('transitionend', () => {
            showScrollbarButton();  // 显示按钮
        });
    }
});

/* 切换模式部件 */
#switch-mode-section {
    padding: 30px 0;
    text-align: center;
    background: linear-gradient(120deg, #000000, #434343); /* 渐变背景 */
    color: white;
    margin-top: 50px;
}

#switch-mode-section h1 {
    font-size: 2em;
    margin-bottom: 20px;
}

.switch-container {
    margin-top: 20px;
    font-size: 1.2em;
}

.switch-container label {
    margin-right: 10px;  /* 给label和input之间增加间距 */
}

/* 让输入框本身显示得更清晰 */
.switch-container input {
    margin-left: 10px;
    transform: scale(1.2);  /* 稍微放大一下复选框 */
}

/* 副标题 */
.subtitle {
    font-size: 1.5em;
    margin-top: 20px;
    color: #ff6347;  /* 番茄红 */
    display: none;  /* 初始时隐藏 */
}