/* ===========================
   返回上一级
   基于真实导航历史
=========================== */


/* ===========================
   1. 基础状态
=========================== */

let initialized =
    false;

let navigatingBack =
    false;

/*
 * 真实访问历史。
 *
 * 示例：
 * [
 *     "home-section",
 *     "nhn-section",
 *     "worldview-section",
 *     "innerworld-section"
 * ]
 */
let navigationHistory =
    [];


/* ===========================
   2. 初始化
=========================== */

export function initializeBackToParent() {
    if (initialized) {
        return;
    }

    initialized =
        true;

    initializeHistory();

    document.addEventListener(
        "click",
        handleBackButtonClick
    );

    document.addEventListener(
        "pointermove",
        handleSpecularPointerMove
    );

    document.addEventListener(
        "pointerout",
        handleSpecularPointerOut
    );

    window.addEventListener(
        "section-shown",
        handleSectionShown
    );

    /*
     * 提供给其他模块读取。
     */
    window.getNavigationHistory =
        getNavigationHistory;

    window.navigateBack =
        navigateBack;
}


/* ===========================
   3. 初始化历史
=========================== */

function initializeHistory() {
    const activeSection =
        document.querySelector(
            ".section.is-active"
        ) ||
        document.getElementById(
            "home-section"
        );

    navigationHistory =
        activeSection?.id
            ? [
                activeSection.id
            ]
            : [];
}


/* ===========================
   4. 页面显示事件
=========================== */

function handleSectionShown(
    event
) {
    const sectionId =
        event.detail?.sectionId;

    const historyMode =
        event.detail?.historyMode ||
        "push";

    if (!sectionId) {
        return;
    }

    /*
     * 返回操作已经提前弹出历史，
     * 这里只确认返回结果，不重复加入。
     */
    if (
        historyMode ===
            "back" ||
        navigatingBack
    ) {
        navigatingBack =
            false;

        ensureHistoryEndsWith(
            sectionId
        );

        updateBackButtons();

        return;
    }

    /*
     * 替换当前历史项。
     * 可用于主页或特殊重定向。
     */
    if (
        historyMode ===
        "replace"
    ) {
        if (
            navigationHistory.length ===
            0
        ) {
            navigationHistory.push(
                sectionId
            );
        } else {
            navigationHistory[
                navigationHistory.length -
                1
            ] =
                sectionId;
        }

        removeDuplicateTail();

        updateBackButtons();

        return;
    }

    /*
     * 普通前进导航。
     */
    pushHistory(
        sectionId
    );

    updateBackButtons();
}


/* ===========================
   5. 添加历史
=========================== */

function pushHistory(
    sectionId
) {
    if (!sectionId) {
        return;
    }

    const currentSectionId =
        navigationHistory[
            navigationHistory.length -
            1
        ];

    if (
        currentSectionId ===
        sectionId
    ) {
        return;
    }

    navigationHistory.push(
        sectionId
    );
}


/* ===========================
   6. 确保历史尾部正确
=========================== */

function ensureHistoryEndsWith(
    sectionId
) {
    const currentSectionId =
        navigationHistory[
            navigationHistory.length -
            1
        ];

    if (
        currentSectionId ===
        sectionId
    ) {
        return;
    }

    const existingIndex =
        navigationHistory
            .lastIndexOf(
                sectionId
            );

    if (
        existingIndex >= 0
    ) {
        navigationHistory =
            navigationHistory.slice(
                0,
                existingIndex +
                    1
            );

        return;
    }

    navigationHistory.push(
        sectionId
    );
}


/* ===========================
   7. 清理连续重复项
=========================== */

function removeDuplicateTail() {
    while (
        navigationHistory.length >
            1 &&
        navigationHistory[
            navigationHistory.length -
            1
        ] ===
        navigationHistory[
            navigationHistory.length -
            2
        ]
    ) {
        navigationHistory.splice(
            navigationHistory.length -
                1,
            1
        );
    }
}


/* ===========================
   8. 返回按钮点击
=========================== */

function handleBackButtonClick(
    event
) {
    const target =
        event.target;

    if (
        !(
            target instanceof
            Element
        )
    ) {
        return;
    }

    const button =
        target.closest(
            ".back-to-parent"
        );

    if (!button) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    navigateBack(
        button
    );
}


/* ===========================
   9. 真正返回上一级
=========================== */

async function navigateBack(
    button = null
) {
    if (navigatingBack) {
        return false;
    }

    if (
        typeof window.showSection !==
        "function"
    ) {
        console.error(
            "全局 showSection 尚未初始化。"
        );

        return false;
    }

    /*
     * 历史不足两层时没有上一级。
     */
    if (
        navigationHistory.length <
        2
    ) {
        console.warn(
            "当前没有可返回的上一级页面。"
        );

        return false;
    }

    const currentSectionId =
        navigationHistory[
            navigationHistory.length -
            1
        ];

    /*
     * 先临时移除当前项，
     * 得到真正的上一访问页面。
     */
    navigationHistory.pop();

    const previousSectionId =
        navigationHistory[
            navigationHistory.length -
            1
        ];

    if (!previousSectionId) {
        navigationHistory.push(
            currentSectionId
        );

        return false;
    }

    const previousSection =
        document.getElementById(
            previousSectionId
        );

    if (!previousSection) {
        console.error(
            `历史中的目标区块不存在：#${previousSectionId}`
        );

        navigationHistory.push(
            currentSectionId
        );

        return false;
    }

    navigatingBack =
        true;

    if (button) {
        button.disabled =
            true;
    }

    /*
     * 供世界观 Core、时间轴等模块
     * 在返回前执行恢复或清理。
     */
    window.dispatchEvent(
        new CustomEvent(
            "before-back-to-parent",
            {
                detail: {
                    from:
                        currentSectionId,

                    to:
                        previousSectionId,

                    button
                }
            }
        )
    );

    /*
     * 离开时间轴时收起详情。
     */
    if (
        currentSectionId ===
            "timeline-section" &&
        typeof window
            .hideTimelineDetails ===
            "function"
    ) {
        window.hideTimelineDetails();
    }

    try {
        const result =
            await window.showSection(
                previousSectionId,
                {
                    transitionType:
                        getBackTransitionType(
                            currentSectionId,
                            previousSectionId
                        ),

                    direction:
                        "backward",

                    scrollMode:
                        "top",

                    historyMode:
                        "back"
                }
            );

        if (result === false) {
            navigationHistory.push(
                currentSectionId
            );

            navigatingBack =
                false;

            updateBackButtons();

            return false;
        }

        return true;
    } catch (error) {
        /*
         * 返回失败时恢复历史。
         */
        navigationHistory.push(
            currentSectionId
        );

        navigatingBack =
            false;

        console.error(
            "返回上一级失败：",
            error
        );

        updateBackButtons();

        return false;
    } finally {
        if (button) {
            window.setTimeout(
                () => {
                    button.disabled =
                        false;
                },
                450
            );
        }
    }
}


/* ===========================
   10. 返回转场类型
=========================== */

function getBackTransitionType(
    fromSectionId,
    toSectionId
) {
    const slideGroups = [
        [
            "nhn-section",
            "timeline-section",
            "worldview-section",
            "innerworld-section"
        ],

        [
            "bounty-board-section",
            "wanted-info-section",
            "the-ruler-info-section",
            "the-monarch-info-section"
        ]
    ];

    const belongsToSameGroup =
        slideGroups.some(
            group => {
                return (
                    group.includes(
                        fromSectionId
                    ) &&
                    group.includes(
                        toSectionId
                    )
                );
            }
        );

    return belongsToSameGroup
        ? "slide"
        : "depth";
}


/* ===========================
   11. 更新返回按钮状态
=========================== */

function updateBackButtons() {
    const buttons =
        document.querySelectorAll(
            ".back-to-parent"
        );

    const canNavigateBack =
        navigationHistory.length >
        1;

    buttons.forEach(
        button => {
            button.setAttribute(
                "aria-disabled",
                String(
                    !canNavigateBack
                )
            );

            /*
             * 不直接隐藏按钮，
             * 避免页面布局变化。
             */
            button.classList.toggle(
                "is-history-empty",
                !canNavigateBack
            );
        }
    );
}


/* ===========================
   12. 获取历史副本
=========================== */

function getNavigationHistory() {
    return [
        ...navigationHistory
    ];
}


/* ===========================
   13. 镜面高光跟随
=========================== */

function handleSpecularPointerMove(
    event
) {
    const target =
        event.target;

    if (
        !(
            target instanceof
            Element
        )
    ) {
        return;
    }

    const button =
        target.closest(
            ".back-to-parent"
        );

    if (!button) {
        return;
    }

    const rect =
        button.getBoundingClientRect();

    if (
        rect.width <= 0 ||
        rect.height <= 0
    ) {
        return;
    }

    const localX =
        event.clientX -
        rect.left;

    const localY =
        event.clientY -
        rect.top;

    const xPercent =
        localX /
        rect.width *
        100;

    const yPercent =
        localY /
        rect.height *
        100;

    const centerX =
        rect.width /
        2;

    const centerY =
        rect.height /
        2;

    const angle =
        Math.atan2(
            localY -
                centerY,
            localX -
                centerX
        ) *
        180 /
        Math.PI +
        90;

    button.style.setProperty(
        "--specular-x",
        `${xPercent}%`
    );

    button.style.setProperty(
        "--specular-y",
        `${yPercent}%`
    );

    button.style.setProperty(
        "--specular-angle",
        `${angle}deg`
    );

    button.style.setProperty(
        "--specular-opacity",
        "1"
    );
}


/* ===========================
   14. 清除镜面高光
=========================== */

function handleSpecularPointerOut(
    event
) {
    const target =
        event.target;

    if (
        !(
            target instanceof
            Element
        )
    ) {
        return;
    }

    const button =
        target.closest(
            ".back-to-parent"
        );

    if (!button) {
        return;
    }

    const nextTarget =
        event.relatedTarget;

    if (
        nextTarget instanceof
            Node &&
        button.contains(
            nextTarget
        )
    ) {
        return;
    }

    button.style.removeProperty(
        "--specular-x"
    );

    button.style.removeProperty(
        "--specular-y"
    );

    button.style.removeProperty(
        "--specular-angle"
    );

    button.style.removeProperty(
        "--specular-opacity"
    );
}