document.addEventListener("DOMContentLoaded", () => {

    /* ===========================
       1. 倒计时 Tooltip
       =========================== */
    const countdownText = document.getElementById("countdown");

    if (countdownText) {
        function showAgeTooltip(event) {
            const style = getComputedStyle(countdownText);
            if (style.opacity === "0" || style.display === "none") return;

            const tooltip = document.createElement("div");
            tooltip.id = "age-tooltip";
            tooltip.textContent = "New Horizon 的年龄";
            tooltip.style.position = "absolute";
            tooltip.style.background = "rgba(0, 0, 0, 0.8)";
            tooltip.style.color = "white";
            tooltip.style.padding = "5px 10px";
            tooltip.style.borderRadius = "5px";
            tooltip.style.fontSize = "0.9em";
            tooltip.style.whiteSpace = "nowrap";
            tooltip.style.pointerEvents = "none";
            tooltip.style.zIndex = "1000";
            tooltip.style.left = `${event.pageX + 10}px`;
            tooltip.style.top = `${event.pageY + 10}px`;

            document.body.appendChild(tooltip);

            function updateTooltipPosition(e) {
                tooltip.style.left = `${e.pageX + 10}px`;
                tooltip.style.top = `${e.pageY + 10}px`;
            }

            countdownText.addEventListener("mousemove", updateTooltipPosition);

            function removeTooltip() {
                tooltip.remove();
                countdownText.removeEventListener("mousemove", updateTooltipPosition);
                countdownText.removeEventListener("mouseleave", removeTooltip);
                countdownText.removeEventListener("click", removeTooltip);
            }

            countdownText.addEventListener("mouseleave", removeTooltip);
            countdownText.addEventListener("click", removeTooltip);
        }

        countdownText.addEventListener("mouseenter", showAgeTooltip);
        countdownText.addEventListener("click", showAgeTooltip);
    }

    /* ===========================
       2. 导航栏切换逻辑
       =========================== */
    const tabs = document.querySelectorAll(".tab");
    const sections = document.querySelectorAll(".section");
    const mainContent = document.getElementById("content");
    const backButton = document.getElementById("back-to-home");
    const newsSection = document.getElementById("news-section");

    function showSection(sectionId) {
        sections.forEach(section => {
            if (section) section.style.display = "none";
        });

        if (sectionId === "content") {
            mainContent.style.display = "block";
            newsSection.style.display = "block";
            backButton.style.display = "none";
        } else {
            mainContent.style.display = "none";
            newsSection.style.display = "none";

            const target = document.getElementById(sectionId);
            if (target) {
                target.style.display = "block";
            } else {
                console.error(`未找到目标部件: #${sectionId}`);
            }

            backButton.style.display = "block";
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const target = tab.getAttribute("data-target");
            showSection(target);
        });
    });

    backButton.addEventListener("click", () => {
        showSection("content");
    });

    sections.forEach(section => {
        if (section) section.style.display = "none";
    });

    backButton.style.display = "none";

});
