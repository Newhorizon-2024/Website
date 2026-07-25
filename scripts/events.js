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
            tooltip.style.color = "#EEEEEE";
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
        /* 先隐藏所有可切换页面 */
        sections.forEach(section => {
            if (section) {
                section.style.display = "none";
            }
        });

        /*
        * #content 保持显示：
        * 这样其中的倒计时不会随栏目切换消失
        */
        if (mainContent) {
            mainContent.style.display = "block";
        }

        if (sectionId === "content") {
            /* 返回主页 */
            if (newsSection) {
                newsSection.style.display = "block";
            }

            if (backButton) {
                backButton.style.display = "none";
            }
        } else {
            /* 进入其他栏目，只隐藏主页内容 */
            if (newsSection) {
                newsSection.style.display = "none";
            }

            const target = document.getElementById(sectionId);

            if (target) {
                target.style.display = "block";
            } else {
                console.error(`未找到目标部件: #${sectionId}`);
            }

            if (backButton) {
                backButton.style.display = "block";
            }
        }
    }

    let homeUnlocked = false; // 初始锁定主页按钮

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const target = tab.getAttribute("data-target");

            // ★ 如果点击的是主页按钮
            if (target === "back-to-home") {
                if (!homeUnlocked) return; // 未解锁 → 不生效
                showSection("content");    // 解锁后 → 返回主页
                return;
            }

            // 点击其它内容 → 解锁主页按钮
            homeUnlocked = true;

            // 显示对应内容
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

    /* ===========================
        3. 创作者栏目滚动与作品预览
       =========================== */

    const creatorCards = document.querySelectorAll(".creator-card");
    const creatorWorks = Array.from(
        document.querySelectorAll(".creator-work")
    );

    const creatorLightbox = document.getElementById("creator-lightbox");
    const creatorLightboxCaption = document.getElementById(
        "creator-lightbox-caption"
    );
    const creatorLightboxClose = document.querySelector(
        ".creator-lightbox-close"
    );
    const creatorLightboxImage = document.getElementById(
        "creator-lightbox-image"
    );
    const creatorLightboxNext = document.querySelector(
        ".creator-lightbox-next"
    );
    const creatorLightboxPrev = document.querySelector(
        ".creator-lightbox-prev"
    );

    let activeCreatorWorkIndex = 0;


    /* 生成指定范围内的随机角度 */
    function createRandomRotation(min, max) {
        return `${(Math.random() * (max - min) + min).toFixed(2)}deg`;
    }


    /* 为头像与作品生成轻微随机倾斜 */
    creatorCards.forEach(card => {
        card.style.setProperty(
            "--avatar-rotation",
            createRandomRotation(-5, 5)
        );

        for (let index = 1; index <= 4; index += 1) {
            card.style.setProperty(
                `--work-rotation-${index}`,
                createRandomRotation(-5, 5)
            );
        }
    });


    /* 根据栏目进入视口的程度切换位置状态 */
    const creatorCardObserver = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                const card = entry.target;

                if (!entry.isIntersecting) {
                    card.classList.remove("is-entering", "is-settled");
                    return;
                }

                if (entry.intersectionRatio >= 0.58) {
                    card.classList.add("is-settled");
                    card.classList.remove("is-entering");
                    return;
                }

                card.classList.add("is-entering");
                card.classList.remove("is-settled");
            });
        },
        {
            root: null,
            rootMargin: "0px 0px -8% 0px",
            threshold: [0.08, 0.58]
        }
    );

    creatorCards.forEach(card => {
        creatorCardObserver.observe(card);
    });


    /* 更新大图内容 */
    function updateCreatorLightbox(index) {
        const work = creatorWorks[index];

        if (!work || !creatorLightboxImage) {
            return;
        }

        const image = work.querySelector("img");
        const fullImage = work.dataset.full || image?.src || "";
        const caption = work.dataset.caption || image?.alt || "";

        activeCreatorWorkIndex = index;
        creatorLightboxImage.src = fullImage;
        creatorLightboxImage.alt = caption;

        if (creatorLightboxCaption) {
            creatorLightboxCaption.textContent = caption;
        }
    }


    /* 打开作品大图 */
    function openCreatorLightbox(index) {
        if (!creatorLightbox) {
            return;
        }

        updateCreatorLightbox(index);

        creatorLightbox.classList.add("active");
        creatorLightbox.setAttribute("aria-hidden", "false");
        document.body.classList.add("creator-lightbox-open");

        creatorLightboxClose?.focus();
    }


    /* 关闭作品大图 */
    function closeCreatorLightbox() {
        if (!creatorLightbox) {
            return;
        }

        creatorLightbox.classList.remove("active");
        creatorLightbox.setAttribute("aria-hidden", "true");
        document.body.classList.remove("creator-lightbox-open");

        creatorWorks[activeCreatorWorkIndex]?.focus();
    }


    /* 切换作品大图 */
    function changeCreatorLightbox(direction) {
        if (creatorWorks.length === 0) {
            return;
        }

        activeCreatorWorkIndex =
            (
                activeCreatorWorkIndex
                + direction
                + creatorWorks.length
            ) % creatorWorks.length;

        updateCreatorLightbox(activeCreatorWorkIndex);
    }


    /* 绑定作品点击事件 */
    creatorWorks.forEach((work, index) => {
        work.addEventListener("click", () => {
            openCreatorLightbox(index);
        });
    });


    /* 绑定大图控制按钮 */
    creatorLightboxClose?.addEventListener("click", closeCreatorLightbox);

    creatorLightboxNext?.addEventListener("click", () => {
        changeCreatorLightbox(1);
    });

    creatorLightboxPrev?.addEventListener("click", () => {
        changeCreatorLightbox(-1);
    });


    /* 点击背景关闭预览 */
    creatorLightbox?.addEventListener("click", event => {
        if (event.target === creatorLightbox) {
            closeCreatorLightbox();
        }
    });


    /* 大图键盘控制 */
    document.addEventListener("keydown", event => {
        if (!creatorLightbox?.classList.contains("active")) {
            return;
        }

        if (event.key === "Escape") {
            closeCreatorLightbox();
        }

        if (event.key === "ArrowLeft") {
            changeCreatorLightbox(-1);
        }

        if (event.key === "ArrowRight") {
            changeCreatorLightbox(1);
        }
    });

    /* ===========================
       4.情报署标志磁吸效果
       =========================== */

    /* 获取情报署标志图片 */
    const nhnLogo = document.querySelector(".nhn-logo");

    /* 鼠标磁吸最大作用距离（像素） */
    const logoMagnetDistance = 360;

    /* 图片最大位移距离（像素） */
    const logoMagnetOffset = 16;

    /* 图片位移缓动系数 */
    const logoLerp = 0.12;

    let logoCurrentX = 0;
    let logoCurrentY = 0;

    let logoTargetX = 0;
    let logoTargetY = 0;


    /* 更新鼠标目标位置 */
    document.addEventListener("mousemove", event => {

        if (!nhnLogo) {
            return;
        }

        const rect = nhnLogo.getBoundingClientRect();

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = event.clientX - centerX;
        const deltaY = event.clientY - centerY;

        const distance = Math.hypot(deltaX, deltaY);

        if (distance < logoMagnetDistance) {

            const strength = 1 - distance / logoMagnetDistance;

            logoTargetX =
                deltaX *
                (logoMagnetOffset / logoMagnetDistance) *
                strength;

            logoTargetY =
                deltaY *
                (logoMagnetOffset / logoMagnetDistance) *
                strength;

            nhnLogo.style.opacity = "1";

        } else {

            logoTargetX = 0;
            logoTargetY = 0;

            nhnLogo.style.opacity = "0.9";

        }

    });

    /* 鼠标离开页面后恢复原位 */
    document.addEventListener("mouseleave", () => {

        logoTargetX = 0;
        logoTargetY = 0;

        if (nhnLogo) {
            nhnLogo.style.opacity = "0.9";
        }

    });

    /* 图片磁吸动画 */
    function animateNhnLogo() {

        if (nhnLogo) {

            logoCurrentX += (logoTargetX - logoCurrentX) * logoLerp;
            logoCurrentY += (logoTargetY - logoCurrentY) * logoLerp;

            nhnLogo.style.transform =
                `translate3d(${logoCurrentX}px, ${logoCurrentY}px, 0)`;

        }

        requestAnimationFrame(animateNhnLogo);

    }

    /* 启动磁吸动画 */
    animateNhnLogo();

    /* ===========================
       4. 情报署手风琴与时间轴
       =========================== */

    const accordionOptions = document.querySelectorAll(
        ".accordion-menu-option"
    );

    const nhnSection = document.getElementById("nhn-section");
    const timelineSection = document.getElementById("timeline-section");
    const timelineItems = document.querySelectorAll(".timeline-item");
    const timelineDetails = document.querySelectorAll(".timeline-detail");

    /* ===========================
       5. 时间轴事件详情
       =========================== */

    /**
     * 隐藏所有时间轴事件详情，
     * 同时移除所有节点的选中状态。
     */
    function hideTimelineDetails() {
        timelineDetails.forEach(detail => {
            detail.classList.remove("active");
            detail.setAttribute("aria-hidden", "true");
        });

        timelineItems.forEach(item => {
            item.classList.remove("active");
            item.setAttribute("aria-expanded", "false");
        });
    }


    /**
     * 显示指定的时间轴事件详情。
     *
     * @param {HTMLElement} item
     * @param {HTMLElement} detail
     */
    function showTimelineDetail(item, detail) {
        hideTimelineDetails();

        item.classList.add("active");
        item.setAttribute("aria-expanded", "true");

        detail.classList.add("active");
        detail.setAttribute("aria-hidden", "false");
    }


    /* 初始化时间轴节点和详情的辅助属性 */
    timelineItems.forEach(item => {
        item.setAttribute("role", "button");
        item.setAttribute("tabindex", "0");
        item.setAttribute("aria-expanded", "false");

        const targetId = item.dataset.target;

        if (targetId) {
            item.setAttribute("aria-controls", targetId);
        }
    });

    timelineDetails.forEach(detail => {
        detail.setAttribute("aria-hidden", "true");
    });


    /**
     * 处理时间轴节点选择。
     *
     * 再次点击当前节点时收起详情；
     * 点击其他节点时切换到对应详情。
     *
     * @param {HTMLElement} item
     */
    function selectTimelineItem(item) {
        const targetId = item.dataset.target;

        if (!targetId) {
            console.error("该时间轴节点没有设置 data-target。");
            return;
        }

        const targetDetail = document.getElementById(targetId);

        if (!targetDetail) {
            console.error(`未找到时间轴事件详情: #${targetId}`);
            return;
        }

        const isCurrentItem = item.classList.contains("active");

        /* 再次点击当前节点时收起 */
        if (isCurrentItem) {
            hideTimelineDetails();
            return;
        }

        /* 显示对应事件详情 */
        showTimelineDetail(item, targetDetail);
    }


    /* 点击时间轴节点 */
    timelineItems.forEach(item => {
        item.addEventListener("click", event => {
            /*
            * 阻止点击继续冒泡到 document，
            * 避免详情刚显示就被全局点击事件关闭。
            */
            event.stopPropagation();

            selectTimelineItem(item);
        });

        /*
        * 支持键盘操作：
        * Enter 或空格键也可以打开详情。
        */
        item.addEventListener("keydown", event => {
            if (event.key !== "Enter" && event.key !== " ") {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            selectTimelineItem(item);
        });
    });


    /*
    * 点击详情内容时不关闭详情。
    * 这样可以正常选择文字、点击链接或与详情内部内容交互。
    */
    timelineDetails.forEach(detail => {
        detail.addEventListener("click", event => {
            event.stopPropagation();
        });
    });


    /*
    * 点击时间轴节点和详情区域以外的位置时，
    * 隐藏当前事件详情。
    */
    document.addEventListener("click", event => {
        const clickedTimelineItem = event.target.closest(".timeline-item");
        const clickedTimelineDetail = event.target.closest(".timeline-detail");

        if (!clickedTimelineItem && !clickedTimelineDetail) {
            hideTimelineDetails();
        }
    });


    /* 按下 Escape 键时关闭详情 */
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            hideTimelineDetails();
        }
    });


    /* ===========================
       6. 情报署手风琴菜单
       =========================== */

    accordionOptions.forEach(option => {
        option.addEventListener("click", () => {
            const targetId = option.dataset.target;
            const isExpanded = option.classList.contains("expanded");

            /* 清除所有菜单选项的展开状态 */
            accordionOptions.forEach(item => {
                item.classList.remove("expanded");
            });

            /*
            * 没有 data-target 的菜单：
            * 仅负责展开或收起图片。
            */
            if (!targetId) {
                if (!isExpanded) {
                    option.classList.add("expanded");
                }

                return;
            }

            /* 获取菜单对应的目标页面 */
            const targetSection = document.getElementById(targetId);

            if (!targetSection) {
                console.error(`未找到情报署目标部件: #${targetId}`);
                return;
            }

            /* 先播放手风琴展开动画 */
            option.classList.add("expanded");

            setTimeout(() => {
                /*
                * 清除菜单展开状态，
                * 避免返回情报署后该选项仍然保持展开。
                */
                option.classList.remove("expanded");

                /* 每次进入时间轴时重置事件详情 */
                hideTimelineDetails();

                /* 隐藏情报署主页 */
                if (nhnSection) {
                    nhnSection.style.display = "none";
                }

                /*
                * 重置目标页面显示状态，
                * 使进入动画能够再次播放。
                */
                targetSection.classList.remove("visible");
                targetSection.style.removeProperty("display");

                /* 强制浏览器重新计算布局 */
                void targetSection.offsetWidth;

                /* 显示目标页面 */
                targetSection.classList.add("visible");

                /* 显示全局返回主页按钮 */
                if (backButton) {
                    backButton.style.display = "block";
                }
            }, 250);
        });
    });


    /* ===========================
       6. 返回情报署
       =========================== */

    const backToNhnButtons = document.querySelectorAll(".back-to-nhn");

    backToNhnButtons.forEach(button => {
        button.addEventListener("click", event => {
            event.stopPropagation();

            /* 关闭所有事件详情 */
            hideTimelineDetails();

            /* 隐藏时间轴页面 */
            if (timelineSection) {
                timelineSection.classList.remove("visible");
                timelineSection.style.display = "none";
            }

            /* 重新显示情报署主页 */
            if (nhnSection) {
                nhnSection.style.removeProperty("display");
                nhnSection.style.display = "block";
            }

            /* 重置所有手风琴选项 */
            accordionOptions.forEach(option => {
                option.classList.remove("expanded");
            });
        });
    });
});
