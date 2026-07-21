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

document.addEventListener("DOMContentLoaded", () => {
    const tabs = document.querySelectorAll(".tab"); // 获取所有导航栏按钮
    const sections = document.querySelectorAll(".section"); // 仅获取可切换的页面部件
    const mainContent = document.getElementById("content"); // 主页内容
    const backButton = document.getElementById("back-to-home"); // 返回主页按钮
    const newsSection = document.getElementById("news-section"); // 新闻部件始终可见

    // 显示指定的部件，隐藏其他部件
    function showSection(sectionId) {
        // 隐藏所有可切换的页面部件
        sections.forEach(section => section.style.display = "none");

        // 如果目标是主页，则只显示主页 & 新闻部件，并隐藏返回按钮
        if (sectionId === "content") {
            mainContent.style.display = "block"; // 主页可见
            newsSection.style.display = "block"; // 新闻部件可见
            backButton.style.display = "none"; // 返回按钮隐藏
        } else {
            // 隐藏主页，显示选中的部件，并显示返回按钮
            mainContent.style.display = "none";
            newsSection.style.display = "none";
            document.getElementById(sectionId).style.display = "block";
            backButton.style.display = "block";
        }
    }

    // 监听导航栏按钮点击事件
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const target = tab.getAttribute("data-target");
            showSection(target);
        });
    });

    // 监听返回主页按钮
    backButton.addEventListener("click", () => {
        showSection("content"); // 切换回主页
    });

    // 初始化时，**只隐藏可切换的页面部件**，确保主页和新闻部件可见
    sections.forEach(section => section.style.display = "none");
    backButton.style.display = "none"; // 默认隐藏返回按钮
});
