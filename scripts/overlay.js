/* ===========================
   1. 页面初始化
=========================== */

// 禁止浏览器恢复先前的滚动位置
window.history.scrollRestoration = "manual";

// Lenis 平滑滚动实例
let lenis = null;

// Lenis 动画帧编号
let lenisAnimationFrame = null;

// 防止重复启动网页体验
let experienceStarted = false;

// 防止重复创建倒计时定时器
let countdownInterval = null;


/* ===========================
   2. 页面加载事件
=========================== */

document.addEventListener("DOMContentLoaded", () => {
    // 页面加载完成后强制回到顶部
    window.scrollTo(0, 0);

    // 初始化遮罩网络提示
    initializeOverlayNetworkTip();

    const overlayElement =
        document.getElementById("overlay");

    if (!overlayElement) {
        return;
    }

    // 只绑定一次启动事件
    overlayElement.addEventListener(
        "click",
        startExperience,
        { once: true }
    );
});


/* ===========================
   3. 启动网页体验
=========================== */

function startExperience() {
    // 防止重复执行启动流程
    if (experienceStarted) {
        return;
    }

    const audio =
        document.getElementById("background-music");

    const overlayElement =
        document.getElementById("overlay");

    if (!overlayElement) {
        return;
    }

    experienceStarted = true;

    const overlayTitle =
        overlayElement.querySelector("h1");

    // 禁止遮罩层再次表现为可点击状态
    overlayElement.style.cursor = "default";

    // 禁止遮罩层继续响应鼠标事件
    overlayElement.style.pointerEvents = "none";

    // 播放背景音乐
    if (audio) {
        audio.play().catch(error => {
            console.log(
                "浏览器阻止了背景音乐播放：",
                error
            );
        });
    }

    // 解锁页面滚动
    document.body.classList.remove("locked");

    // 启用遮罩标题消失动画
    overlayElement.classList.add("loading");

    // 创建加载动画轨道
    const loadingBar =
        document.createElement("div");

    loadingBar.id = "loading-bar";

    document.body.appendChild(loadingBar);

    // 启动 Lenis 平滑滚动
    startLenis();

    // 等待加载矩形动画结束
    loadingBar.addEventListener(
        "animationend",
        event => {
            // 只响应加载矩形的指定动画
            if (
                event.animationName !==
                "loadingSequence"
            ) {
                return;
            }

            loadingBar.remove();

            // 淡出遮罩背景
            overlayElement.classList.add("hidden");

            // 等待遮罩背景淡出完成
            window.setTimeout(() => {
                overlayElement.style.display = "none";

                // 确保标题保持隐藏
                if (overlayTitle) {
                    overlayTitle.style.opacity = "0";
                }

                // 略微延迟后显示欢迎信息
                window.setTimeout(
                    showWelcomeMessage,
                    500
                );
            }, 1500);
        },
        { once: true }
    );
}


/* ===========================
   4. Lenis 平滑滚动
=========================== */

function startLenis() {
    // 已存在实例时不重复创建
    if (lenis) {
        return;
    }

    // Lenis 未成功加载时使用浏览器原生滚动
    if (typeof Lenis === "undefined") {
        console.warn(
            "Lenis 未加载，页面将使用浏览器原生滚动。"
        );

        return;
    }

    lenis = new Lenis({
        smoothWheel: true,
        duration: 1.2,

        easing: t =>
            Math.min(
                1,
                1.001 -
                Math.pow(
                    2,
                    -10 * t
                )
            ),

        orientation:
            "vertical",

        gestureOrientation:
            "vertical",

        autoResize:
            true
    });

    /*
    * 暴露给 navigation.js 等其他模块。
    */
    window.lenis =
        lenis;

    /*
     * 通知延迟初始化的页面模块，
     * Lenis 实例现在已经可以安全访问。
     */
    window.dispatchEvent(
        new CustomEvent(
            "lenis-ready",
            {
                detail: {
                    lenis
                }
            }
        )
    );

    lenis.scrollTo(
        0,
        {
            immediate:
                true
        }
    );

    // 启动后立即回到页面顶部
    lenis.scrollTo(0, {
        immediate: true
    });

    // Lenis 动画循环
    function updateLenis(time) {
        lenis.raf(time);

        lenisAnimationFrame =
            window.requestAnimationFrame(
                updateLenis
            );
    }

    lenisAnimationFrame =
        window.requestAnimationFrame(
            updateLenis
        );
}


/* ===========================
   5. 欢迎信息
=========================== */

function showWelcomeMessage() {
    const welcomeMessage =
        document.getElementById(
            "welcome-message"
        );

    // 欢迎信息不存在时直接显示倒计时
    if (!welcomeMessage) {
        showCountdown();
        return;
    }

    // 欢迎信息淡入
    welcomeMessage.style.opacity = "1";

    // 等待淡入完成
    window.setTimeout(() => {
        // 保持显示 1 秒
        window.setTimeout(() => {
            // 欢迎信息淡出
            welcomeMessage.style.opacity = "0";

            // 等待淡出完成后显示倒计时
            window.setTimeout(
                showCountdown,
                2500
            );
        }, 1000);
    }, 2500);
}


/* ===========================
   遮罩网络加载提示
=========================== */

function initializeOverlayNetworkTip() {
    const overlayTip =
        document.getElementById(
            "overlay-tip"
        );

    if (!overlayTip) {
        return;
    }

    /*
     * 超过该时间仍未完成加载，
     * 认为页面加载较慢。
     */
    const slowLoadThreshold = 5000;

    let pageLoaded =
        document.readyState ===
        "complete";

    let slowLoadTimer = null;

    function resetState() {
        overlayTip.classList.remove(
            "is-slow",
            "is-loaded",
            "is-offline"
        );
    }

    function showNormalTip() {
        resetState();

        overlayTip.textContent =
            "如加载缓慢，最好使用代理加速。";
    }

    function showSlowTip() {
        if (pageLoaded) {
            return;
        }

        resetState();

        overlayTip.classList.add(
            "is-slow"
        );

        overlayTip.textContent =
            "当前加载速度较慢，最好使用代理加速。";
    }

    function showLoadedTip() {
        pageLoaded = true;

        if (slowLoadTimer !== null) {
            clearTimeout(
                slowLoadTimer
            );

            slowLoadTimer = null;
        }

        resetState();

        overlayTip.classList.add(
            "is-loaded"
        );

        overlayTip.textContent =
            "网站资源已加载完成。";
    }

    function showOfflineTip() {
        resetState();

        overlayTip.classList.add(
            "is-offline"
        );

        overlayTip.textContent =
            "当前网络似乎已断开，请检查网络连接。";
    }

    function detectConnectionState() {
        if (!navigator.onLine) {
            showOfflineTip();
            return;
        }

        if (pageLoaded) {
            showLoadedTip();
            return;
        }

        const connection =
            navigator.connection ||
            navigator.mozConnection ||
            navigator.webkitConnection;

        const slowConnectionTypes = [
            "slow-2g",
            "2g",
            "3g"
        ];

        if (
            connection &&
            (
                connection.saveData ||
                slowConnectionTypes.includes(
                    connection.effectiveType
                )
            )
        ) {
            showSlowTip();
            return;
        }

        showNormalTip();
    }

    slowLoadTimer =
        window.setTimeout(
            showSlowTip,
            slowLoadThreshold
        );

    if (pageLoaded) {
        showLoadedTip();
    } else {
        window.addEventListener(
            "load",
            showLoadedTip,
            { once: true }
        );
    }

    window.addEventListener(
        "online",
        detectConnectionState
    );

    window.addEventListener(
        "offline",
        detectConnectionState
    );

    navigator.connection
        ?.addEventListener(
            "change",
            detectConnectionState
        );

    detectConnectionState();
}


/* ===========================
   6. 运行时间
=========================== */

function showCountdown() {
    const countdownElement =
        document.getElementById("countdown");

    if (!countdownElement) {
        return;
    }

    // 显示运行时间
    countdownElement.style.opacity = "1";

    /*
     * updateCountdown 如果定义在其他模块中，
     * 需要通过 window.updateCountdown 暴露。
     */
    if (
        typeof window.updateCountdown !==
        "function"
    ) {
        console.warn(
            "未找到 window.updateCountdown，倒计时不会更新。"
        );

        return;
    }

    // 立即更新一次
    window.updateCountdown();

    // 避免重复创建定时器
    if (countdownInterval) {
        return;
    }

    countdownInterval =
        window.setInterval(
            window.updateCountdown,
            1000
        );
}


/* ===========================
   7. 页面卸载清理
=========================== */

window.addEventListener("beforeunload", () => {
    if (countdownInterval) {
        window.clearInterval(
            countdownInterval
        );

        countdownInterval = null;
    }

    if (lenisAnimationFrame) {
        window.cancelAnimationFrame(
            lenisAnimationFrame
        );

        lenisAnimationFrame = null;
    }

    if (lenis) {
        lenis.destroy();
        lenis = null;
    }
});


/* ===========================
   8. 全局兼容入口
=========================== */

/*
 * 当前 HTML 不再需要 onclick。
 * 暂时保留全局入口，兼容可能存在的旧调用。
 */
window.startExperience = startExperience;
