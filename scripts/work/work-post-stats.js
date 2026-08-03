/* ===========================
    作品动态数字解码
=========================== */

export function initializeWorkPostStats() {
    const workPosts =
        document.querySelectorAll(
            ".work-post"
        );

    if (workPosts.length === 0) {
        return;
    }

    const scrambleCharacters =
        "0123456789#$%&?@";

    /*
     * 返回指定范围内的随机整数。
     */
    function createRandomNumber(
        minimum,
        maximum
    ) {
        return Math.floor(
            Math.random() *
            (
                maximum -
                minimum +
                1
            )
        ) + minimum;
    }

    /*
     * 根据最终数字长度生成乱码。
     */
    function createScrambleText(length) {
        let result = "";

        for (
            let index = 0;
            index < length;
            index += 1
        ) {
            const characterIndex =
                Math.floor(
                    Math.random() *
                    scrambleCharacters.length
                );

            result +=
                scrambleCharacters[
                    characterIndex
                ];
        }

        return result;
    }

    /*
     * 播放单个数字的乱码解码动画。
     */
    function animateStatCount(countElement) {
        const button =
            countElement.closest(
                ".work-post-stat"
            );

        if (!button) {
            return;
        }

        const minimum =
            Number.parseInt(
                button.dataset.min,
                10
            );

        const maximum =
            Number.parseInt(
                button.dataset.max,
                10
            );

        if (
            Number.isNaN(minimum) ||
            Number.isNaN(maximum)
        ) {
            console.error(
                "作品统计按钮缺少有效的 data-min 或 data-max。"
            );

            return;
        }

        const lowerBound =
            Math.min(
                minimum,
                maximum
            );

        const upperBound =
            Math.max(
                minimum,
                maximum
            );

        const finalNumber =
            createRandomNumber(
                lowerBound,
                upperBound
            );

        const finalText =
            finalNumber.toLocaleString(
                "zh-CN"
            );

        const animationDuration = 1100;
        const updateInterval = 55;
        const startTime =
            performance.now();

        countElement.classList.add(
            "is-decoding"
        );

        function updateScramble(
            currentTime
        ) {
            const elapsedTime =
                currentTime -
                startTime;

            const progress =
                Math.min(
                    elapsedTime /
                    animationDuration,
                    1
                );

            /*
             * 动画后半段逐渐显示正确数字。
             */
            const resolvedLength =
                Math.floor(
                    finalText.length *
                    Math.max(
                        0,
                        (
                            progress -
                            0.45
                        ) /
                        0.55
                    )
                );

            const scrambleLength =
                finalText.length -
                resolvedLength;

            const scrambleText =
                createScrambleText(
                    scrambleLength
                );

            const resolvedText =
                finalText.slice(
                    finalText.length -
                    resolvedLength
                );

            countElement.textContent =
                scrambleText +
                resolvedText;

            if (progress >= 1) {
                countElement.textContent =
                    finalText;

                countElement.classList.remove(
                    "is-decoding"
                );

                return;
            }

            window.setTimeout(
                () => {
                    window.requestAnimationFrame(
                        updateScramble
                    );
                },
                updateInterval
            );
        }

        window.requestAnimationFrame(
            updateScramble
        );
    }

    /*
     * 播放一整条作品动态中的统计数字。
     */
    function animatePostStats(post) {
        const countElements =
            post.querySelectorAll(
                ".work-post-action-count"
            );

        countElements.forEach(
            (
                countElement,
                index
            ) => {
                window.setTimeout(
                    () => {
                        animateStatCount(
                            countElement
                        );
                    },
                    index * 140
                );
            }
        );
    }

    if (
        !(
            "IntersectionObserver"
            in window
        )
    ) {
        workPosts.forEach(
            animatePostStats
        );

        return;
    }

    const observer =
        new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (
                        !entry.isIntersecting
                    ) {
                        return;
                    }

                    const post =
                        entry.target;

                    /*
                     * 每条动态只播放一次。
                     */
                    if (
                        post.dataset
                            .statsAnimated ===
                        "true"
                    ) {
                        return;
                    }

                    post.dataset.statsAnimated =
                        "true";

                    animatePostStats(post);

                    observer.unobserve(post);
                });
            },
            {
                root: null,
                rootMargin:
                    "0px 0px -12% 0px",
                threshold: 0.35
            }
        );

    workPosts.forEach(post => {
        observer.observe(post);
    });
}