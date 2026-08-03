/* ===========================
   作品动态 Spotlight 与 Chroma
=========================== */

let workPostEffectsInitialized =
    false;


/* ===========================
   初始化
=========================== */

export function initializeWorkPostPointerEffects() {
    if (workPostEffectsInitialized) {
        return;
    }

    const workPosts =
        document.querySelectorAll(
            ".work-post"
        );

    if (
        workPosts.length ===
        0
    ) {
        return;
    }

    workPostEffectsInitialized =
        true;

    const supportsPointerEffects =
        window.matchMedia(
            "(hover: hover) and (pointer: fine)"
        ).matches;

    workPosts.forEach(
        post => {
            initializeWorkPostMedia(
                post
            );

            if (
                supportsPointerEffects
            ) {
                initializeSpotlight(
                    post
                );
            }
        }
    );
}


/* ===========================
   Spotlight Card
=========================== */

function initializeSpotlight(
    post
) {
    post.addEventListener(
        "pointerenter",
        () => {
            post.classList.add(
                "is-pointer-active"
            );
        }
    );

    post.addEventListener(
        "pointermove",
        event => {
            updatePostSpotlight(
                post,
                event
            );
        }
    );

    post.addEventListener(
        "pointerleave",
        () => {
            resetPostSpotlight(
                post
            );
        }
    );
}


/* ===========================
   更新卡片聚光
=========================== */

function updatePostSpotlight(
    post,
    event
) {
    const rect =
        post.getBoundingClientRect();

    if (
        rect.width <= 0 ||
        rect.height <= 0
    ) {
        return;
    }

    const x =
        event.clientX -
        rect.left;

    const y =
        event.clientY -
        rect.top;

    post.style.setProperty(
        "--work-light-x",
        `${x.toFixed(2)}px`
    );

    post.style.setProperty(
        "--work-light-y",
        `${y.toFixed(2)}px`
    );
}


/* ===========================
   重置卡片聚光
=========================== */

function resetPostSpotlight(
    post
) {
    post.classList.remove(
        "is-pointer-active"
    );

    post.style.setProperty(
        "--work-light-x",
        "50%"
    );

    post.style.setProperty(
        "--work-light-y",
        "50%"
    );

    const media =
        post.querySelector(
            ".work-post-media"
        );

    resetChromaFocus(
        media
    );
}


/* ===========================
   初始化媒体图片
=========================== */

function initializeWorkPostMedia(
    post
) {
    const media =
        post.querySelector(
            ".work-post-media"
        );

    if (!media) {
        return;
    }

    const baseImage =
        media.querySelector(
            ":scope > img:not(.work-post-media-color)"
        );

    if (!baseImage) {
        return;
    }

    createColorImageLayer(
        media,
        baseImage
    );

    const supportsPointerEffects =
        window.matchMedia(
            "(hover: hover) and (pointer: fine)"
        ).matches;

    if (
        !supportsPointerEffects
    ) {
        return;
    }

    media.addEventListener(
        "pointerenter",
        event => {
            media.classList.add(
                "is-chroma-active"
            );

            updateChromaFocus(
                media,
                event
            );
        }
    );

    media.addEventListener(
        "pointermove",
        event => {
            updateChromaFocus(
                media,
                event
            );
        }
    );

    media.addEventListener(
        "pointerleave",
        () => {
            resetChromaFocus(
                media
            );
        }
    );
}


/* ===========================
   创建彩色图片图层
=========================== */

function createColorImageLayer(
    media,
    baseImage
) {
    const existingColorLayer =
        media.querySelector(
            ":scope > " +
            ".work-post-media-color"
        );

    if (existingColorLayer) {
        return existingColorLayer;
    }

    const colorImage =
        baseImage.cloneNode(
            false
        );

    colorImage.classList.add(
        "work-post-media-color"
    );

    /*
     * 彩色层只是视觉复制，
     * 不应被辅助技术重复读取。
     */
    colorImage.alt =
        "";

    colorImage.setAttribute(
        "aria-hidden",
        "true"
    );

    colorImage.removeAttribute(
        "id"
    );

    colorImage.removeAttribute(
        "loading"
    );

    media.appendChild(
        colorImage
    );

    return colorImage;
}


/* ===========================
   更新 Chroma 聚焦
=========================== */

function updateChromaFocus(
    media,
    event
) {
    if (!media) {
        return;
    }

    const rect =
        media.getBoundingClientRect();

    if (
        rect.width <= 0 ||
        rect.height <= 0
    ) {
        return;
    }

    const x =
        event.clientX -
        rect.left;

    const y =
        event.clientY -
        rect.top;

    media.style.setProperty(
        "--chroma-x",
        `${x.toFixed(2)}px`
    );

    media.style.setProperty(
        "--chroma-y",
        `${y.toFixed(2)}px`
    );

    media.classList.add(
        "is-chroma-active"
    );
}


/* ===========================
   重置 Chroma 聚焦
=========================== */

function resetChromaFocus(
    media
) {
    if (!media) {
        return;
    }

    media.classList.remove(
        "is-chroma-active"
    );

    media.style.setProperty(
        "--chroma-x",
        "50%"
    );

    media.style.setProperty(
        "--chroma-y",
        "50%"
    );
}