/* ===========================
   世界观未开放档案反馈
=========================== */

const SIGNAL_CONFIG = {
    "worldview-orbiter-unavailable": {
        english:
            "ARCHIVE UNAVAILABLE",
        chinese:
            "档案尚未开放"
    },

    "worldview-scene-unavailable": {
        english:
            "LOCATION UNAVAILABLE",
        chinese:
            "场景档案尚未开放",
        duration:
            650,
        className:
            "is-scene-signal"
    },

    "worldview-things-unavailable": {
        english:
            "ARCHIVE UNAVAILABLE",
        chinese:
            "事物档案尚未开放"
    },

    "worldview-organization-unavailable": {
        english:
            "ORGANIZATION FILE LOCKED",
        chinese:
            "组织档案尚未开放"
    }
};

let initialized =
    false;

let signalElement =
    null;

let activeSource =
    null;

let activeSection =
    null;

let revealTimer =
    null;

let cleanupTimer =
    null;


/* ===========================
   初始化
=========================== */

export function initializeWorldviewUnavailableSignal() {
    if (initialized) {
        return;
    }

    initialized =
        true;

    Object.keys(
        SIGNAL_CONFIG
    ).forEach(eventName => {
        window.addEventListener(
            eventName,
            event => {
                showUnavailableSignal(
                    event,
                    SIGNAL_CONFIG[eventName]
                );
            }
        );
    });

    window.addEventListener(
        "section-shown",
        clearUnavailableSignal
    );

    window.addEventListener(
        "worldview-core-hide",
        clearUnavailableSignal
    );

    window.addEventListener(
        "pagehide",
        clearUnavailableSignal
    );
}


/* ===========================
   显示反馈
=========================== */

function showUnavailableSignal(
    event,
    config
) {
    clearUnavailableSignal();

    const detail =
        event.detail ||
        {};

    activeSource =
        detail.sourceElement instanceof
            Element
            ? detail.sourceElement
            : null;

    activeSection =
        activeSource?.closest(
            ".section"
        ) ||
        document.querySelector(
            ".section.is-active"
        );

    signalElement =
        createSignalElement(
            config
        );

    if (config.className) {
        signalElement.classList.add(
            config.className
        );
    }

    positionSignal(
        signalElement,
        activeSource,
        detail.anchor
    );

    document.body.append(
        signalElement
    );

    if (activeSource) {
        void activeSource.offsetWidth;

        activeSource.classList.add(
            "is-worldview-unavailable-source"
        );
    }

    activeSection?.classList.add(
        "has-worldview-unavailable-signal"
    );

    if (
        detail.category ===
        "scene"
    ) {
        activeSection?.classList.add(
            "has-worldview-scene-unavailable-signal"
        );
    }

    void signalElement.offsetWidth;

    signalElement.classList.add(
        "is-visible"
    );

    revealTimer =
        window.setTimeout(
            () => {
                const english =
                    signalElement?.querySelector(
                        ".worldview-unavailable-english"
                    );

                if (english) {
                    english.textContent =
                        config.english;
                }
            },
            150
        );

    cleanupTimer =
        window.setTimeout(
            clearUnavailableSignal,
            config.duration ||
                900
        );
}

function createSignalElement(config) {
    const element =
        document.createElement(
            "div"
        );

    element.className =
        "worldview-unavailable-signal";

    element.setAttribute(
        "role",
        "status"
    );

    element.setAttribute(
        "aria-live",
        "polite"
    );

    const english =
        document.createElement(
            "span"
        );

    english.className =
        "worldview-unavailable-english";

    english.textContent =
        config.english.replace(
            /I/g,
            "_"
        );

    const chinese =
        document.createElement(
            "span"
        );

    chinese.className =
        "worldview-unavailable-chinese";

    chinese.textContent =
        config.chinese;

    element.append(
        english,
        chinese
    );

    return element;
}

function positionSignal(
    element,
    source,
    anchor
) {
    let x =
        Number(anchor?.x);

    let y =
        Number(anchor?.y);

    if (
        !Number.isFinite(x) ||
        !Number.isFinite(y)
    ) {
        const rect =
            source?.getBoundingClientRect();

        if (rect) {
            x =
                rect.left +
                rect.width /
                2;

            y =
                rect.top +
                rect.height /
                2;
        }
    }

    if (
        !Number.isFinite(x) ||
        !Number.isFinite(y)
    ) {
        x =
            window.innerWidth /
            2;

        y =
            window.innerHeight /
            2;
    }

    element.style.left =
        `${Math.max(
            110,
            Math.min(
                window.innerWidth -
                    110,
                x
            )
        )}px`;

    element.style.top =
        `${Math.max(
            90,
            Math.min(
                window.innerHeight -
                    70,
                y
            )
        )}px`;
}


/* ===========================
   清理
=========================== */

function clearUnavailableSignal() {
    if (revealTimer) {
        window.clearTimeout(
            revealTimer
        );

        revealTimer =
            null;
    }

    if (cleanupTimer) {
        window.clearTimeout(
            cleanupTimer
        );

        cleanupTimer =
            null;
    }

    signalElement?.remove();
    signalElement =
        null;

    activeSource?.classList.remove(
        "is-worldview-unavailable-source"
    );

    activeSection?.classList.remove(
        "has-worldview-unavailable-signal"
    );

    activeSection?.classList.remove(
        "has-worldview-scene-unavailable-signal"
    );

    activeSource =
        null;
    activeSection =
        null;
}
