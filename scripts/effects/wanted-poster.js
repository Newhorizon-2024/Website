/* ===========================
    悬赏令图片鼠标倾斜
=========================== */

export function initializeWantedPosterPointerEffects() {
    const wantedPosters =
        document.querySelectorAll(
            ".wanted-poster"
        );

    const supportsPointerEffects =
        window.matchMedia(
            "(hover: hover) and (pointer: fine)"
        ).matches;

    if (
        !supportsPointerEffects ||
        wantedPosters.length === 0
    ) {
        return;
    }

    function resetPosterEffect(poster) {
        poster.classList.remove(
            "is-pointer-active"
        );

        poster.style.setProperty(
            "--poster-rotate-x",
            "0deg"
        );

        poster.style.setProperty(
            "--poster-rotate-y",
            "0deg"
        );

        poster.style.setProperty(
            "--poster-light-x",
            "50%"
        );

        poster.style.setProperty(
            "--poster-light-y",
            "50%"
        );
    }

    wantedPosters.forEach(poster => {
        poster.addEventListener(
            "mouseenter",
            () => {
                poster.classList.add(
                    "is-pointer-active"
                );
            }
        );

        poster.addEventListener(
            "mousemove",
            event => {
                const posterRect =
                    poster.getBoundingClientRect();

                if (
                    posterRect.width === 0 ||
                    posterRect.height === 0
                ) {
                    return;
                }

                const horizontalRatio =
                    (
                        event.clientX -
                        posterRect.left
                    ) /
                    posterRect.width;

                const verticalRatio =
                    (
                        event.clientY -
                        posterRect.top
                    ) /
                    posterRect.height;

                /*
                 * 图片倾斜角度。
                 * 数值越大，角度反馈越明显。
                 */
                const maxRotation = 5;

                const rotateX =
                    (
                        0.5 -
                        verticalRatio
                    ) *
                    maxRotation *
                    2;

                const rotateY =
                    (
                        horizontalRatio -
                        0.5
                    ) *
                    maxRotation *
                    2;

                poster.style.setProperty(
                    "--poster-rotate-x",
                    `${rotateX.toFixed(2)}deg`
                );

                poster.style.setProperty(
                    "--poster-rotate-y",
                    `${rotateY.toFixed(2)}deg`
                );

                /*
                 * 高光位置跟随鼠标。
                 */
                poster.style.setProperty(
                    "--poster-light-x",
                    `${(
                        horizontalRatio *
                        100
                    ).toFixed(2)}%`
                );

                poster.style.setProperty(
                    "--poster-light-y",
                    `${(
                        verticalRatio *
                        100
                    ).toFixed(2)}%`
                );
            }
        );

        poster.addEventListener(
            "mouseleave",
            () => {
                resetPosterEffect(
                    poster
                );
            }
        );
    });
}