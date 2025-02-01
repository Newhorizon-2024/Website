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

// 检测是否为移动端设备
function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(navigator.userAgent);
}

// 如果是移动端设备，隐藏按钮
if (isMobileDevice()) {
    toggleScrollbarButton.style.display = 'none'; // 移动端隐藏按钮
} else {
    // 确保按钮在加载时显示出来（PC端）
    toggleScrollbarButton.style.display = 'none';  // 初始时隐藏按钮

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
        console.log('按钮被点击了');  // 确保按钮点击事件被触发
        const bodyStyle = document.body.style;

        // 判断当前滚动条状态并切换
        if (bodyStyle.overflow === 'hidden') {
            bodyStyle.setProperty('overflow', 'auto', 'important');  // 显示滚动条，强制执行
            window.scrollTo(0, 0);  // 确保页面滚动到顶部
            hideScrollbarButton();  // 隐藏按钮
        } else {
            bodyStyle.setProperty('overflow', 'hidden', 'important');  // 隐藏滚动条，强制执行
            window.scrollTo(0, 0);  // 确保页面滚动到顶部
            showScrollbarButton();  // 再次显示按钮
        }
    });

    // 当倒计时出现后，调用显示按钮
    window.addEventListener('DOMContentLoaded', () => {
        const countdownElement = document.getElementById('countdown');
        if (countdownElement) {
            countdownElement.addEventListener('transitionend', () => {
                showScrollbarButton();  // 显示按钮
            });
        }
    });
}

function showEscHint() {
    toggleScrollbarButton.textContent = '按ESC退出'; // 修改按钮文本
    setTimeout(() => {
        toggleScrollbarButton.style.opacity = 0; // 渐变消失
        setTimeout(() => {
            toggleScrollbarButton.style.display = 'none'; // 隐藏按钮
            toggleScrollbarButton.textContent = '隐藏滚动条'; // 恢复默认文本
        }, 2000); // 等待透明度渐变完成后隐藏
    }, 2000); // 显示 2 秒后开始渐变隐藏
}

let isButtonTriggered = false; // 标志位

// 按钮点击事件
toggleScrollbarButton.addEventListener('click', () => {
    isButtonTriggered = true; // 标志为按钮触发
    const bodyStyle = document.body.style;

    // 判断当前滚动条状态并切换
    if (bodyStyle.overflow === 'hidden') {
        bodyStyle.setProperty('overflow', 'auto', 'important'); // 显示滚动条
    } else {
        bodyStyle.setProperty('overflow', 'hidden', 'important'); // 隐藏滚动条
    }
    showEscHint(); // 显示 ESC 提示
    setTimeout(() => isButtonTriggered = false, 1000); // 重置标志
});

// 监听键盘事件 ESC 恢复滚动条
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !isButtonTriggered) { // 仅当不是按钮触发时执行
        console.log('ESC 按下，恢复滚动条');
        document.body.style.setProperty('overflow', 'auto', 'important'); // 恢复滚动条
        showScrollbarButton(); // 重新显示按钮
    }
});

// 获取所有导航栏的选项卡
const tabs = document.querySelectorAll("#navbar .tab");

// 滚动到对应的部件
function scrollToSection(event) {
    const targetId = event.target.getAttribute("data-target");
    const targetSection = document.getElementById(targetId);

    if (targetSection) {
        window.scrollTo({
            top: targetSection.offsetTop - 50, // 让滚动位置更舒适
            behavior: "smooth" // 平滑滚动
        });
    }
}

// 绑定点击事件
tabs.forEach(tab => {
    tab.addEventListener("click", scrollToSection);
});

document.addEventListener("DOMContentLoaded", () => {
    const tabs = document.querySelectorAll("#navbar .tab");

    function scrollToSection(event) {
        const targetId = event.target.getAttribute("data-target");
        const targetSection = document.getElementById(targetId);

        if (targetSection) {
            window.scrollTo({
                top: targetSection.offsetTop - 50, // 调整滚动位置，避免紧贴顶部
                behavior: "smooth" // 平滑滚动
            });
        } else {
            console.error(`未找到目标部件: #${targetId}`);
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener("click", scrollToSection);
    });

    console.log("导航栏事件监听已绑定");
});
