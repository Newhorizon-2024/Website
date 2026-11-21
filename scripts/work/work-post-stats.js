/* 点赞和评分按作品保存；评论气泡只存在于当前页面。 */
const ratingMax = 4;
const storagePrefix = "nh.work.v1.";
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const paths = {
    like: "M20.5 5.8c-2-2.1-5.4-1.9-7.4.2L12 7.2 10.9 6C8.9 3.9 5.5 3.7 3.5 5.8c-2.2 2.3-1.8 5.8.5 8.1L12 21l8-7.1c2.3-2.3 2.7-5.8.5-8.1Z",
    comment: "M20.5 11.8c0 4.5-3.9 7.8-8.5 7.8-1.3 0-2.6-.2-3.7-.7L3 21l1.3-4.8a7.1 7.1 0 0 1-1-4.4C3.3 7.3 7.1 4 12 4s8.5 3.3 8.5 7.8Z",
    star: "m12 2.7 2.8 5.8 6.4.9-4.6 4.6 1.1 6.4-5.7-3-5.7 3 1.1-6.4-4.6-4.6 6.4-.9Z"
};
function icon(kind) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns,"svg"), path = document.createElementNS(ns,"path");
    svg.setAttribute("viewBox","0 0 24 24");
    svg.setAttribute("aria-hidden","true");
    path.setAttribute("d", paths[kind]);
    svg.append(path);
    return svg;
}
function element(tag, className, text) {
    const el=document.createElement(tag);
    el.className=className;
    if (text !== undefined) el.textContent=text;
    return el;
}
function releaseBubble(cloud, text) {
    while (cloud.childElementCount >= 3) cloud.firstElementChild.remove();
    const bubble = element("div", "work-comment-bubble");
    const message = element("div", "work-comment-message", text);
    const viewport = element("div", "work-comment-window");
    viewport.append(message);
    bubble.append(viewport);
    cloud.append(bubble);

    const reduced = motion.matches;
    const travel = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    const duration = Math.min(8000, 2400 + text.length * 28);
    const drift = Math.round(Math.random() * 16) - 8;
    if (travel && !reduced) {
        message.animate([{ transform: "translateY(0)", offset: .18 },
                         { transform: "translateY(-" + travel + "px)", offset: .84 }],
                        { duration, fill: "both", easing: "ease-in-out" });
    }
    const frames = reduced
        ? [{ opacity: 1 }, { opacity: 1, offset: .86 }, { opacity: 0 }]
        : [{ opacity: 0, transform: "translateY(6px) scale(.94)" },
           { opacity: 1, transform: "translateY(-3px) scale(1)", offset: .12 },
           { opacity: 1, transform: "translate(" + drift + "px,-16px)", offset: .78 },
           { opacity: 0, transform: "translate(" + drift + "px,-34px) scale(1.03)" }];
    const flight = bubble.animate(frames, { duration, easing: "linear", fill: "both" });
    flight.onfinish = flight.oncancel = () => bubble.remove();
}

const counters = new WeakMap();
function incrementStat(button) {
    const label = button.querySelector(".work-post-action-count");
    const state = counters.get(label);
    state.added++;
    if (state.ready) label.textContent = (state.base + state.added).toLocaleString("zh-CN");
}

function initializePost(post) {
    const key=storagePrefix+post.dataset.workId;
    let state = { like: false, rating: 0 }, volatile = false;
    function latest() {
        if (volatile) return;
        try {
            const saved = JSON.parse(localStorage.getItem(key) || "{}") || {};
            const wasFiveStars = saved.rating === 5;
            if (wasFiveStars) saved.rating = ratingMax;
            state = { like: saved.like === true, rating: Number.isInteger(saved.rating) && saved.rating >= 1 && saved.rating <= ratingMax ? saved.rating : 0 };
            if (wasFiveStars || Object.hasOwn(saved, "comments")) {
                delete saved.comments;
                localStorage.setItem(key, JSON.stringify(saved));
            }
        } catch { volatile = true; }
    }
    latest();
    const footer=post.querySelector(".work-post-actions");
    const like=footer.querySelector('[data-stat="like"]'), comment=footer.querySelector('[data-stat="comment"]');
    for (const button of [like,comment]) {
        counters.set(button.querySelector(".work-post-action-count"), { base: 0, added: 0, ready: false });
        button.querySelector(".work-post-action-label").replaceChildren(icon(button.dataset.stat));
    }
    like.setAttribute("aria-label","喜欢");
    comment.setAttribute("aria-label","评论");
    comment.setAttribute("aria-expanded","false");

    const rating=element("div","work-rating");
    rating.setAttribute("role","group");rating.setAttribute("aria-label","作品评分");
    const tip=element("span","work-rating-tip");
    tip.setAttribute("aria-hidden","true");rating.append(tip);
    const stars=Array.from({length:ratingMax},(_,i)=>{
        const button=element("button","work-star");
        button.type="button";button.setAttribute("aria-label",(i+1)+" 星");
        button.append(icon("star"));rating.append(button);return button;
    });
    footer.append(rating);
    const panel=element("div","work-discussion");
    panel.hidden=true;
    panel.id="discussion-"+post.dataset.workId;
    comment.setAttribute("aria-controls",panel.id);
    const form=element("form","work-comment-form");
    form.autocomplete = "off";
    const label=element("label","work-comment-label","写评论");
    const input=element("textarea","work-comment-input");
    label.htmlFor=input.id=panel.id+"-text";input.rows=2;
    const submit=element("button","work-comment-submit","发表");submit.type="submit";submit.disabled=true;
    const cloud = element("div", "work-comment-cloud");
    cloud.setAttribute("aria-hidden", "true");
    footer.append(cloud);
    const status=element("p","work-comment-status");status.setAttribute("role","status");
    form.append(label,input,submit);panel.append(form,status);footer.after(panel);

    function showRating(preview=0) {
        stars.forEach((button,i)=>{
            button.classList.toggle("is-lit",i<(preview||state.rating));
            button.classList.toggle("is-peeking",preview>i);
            button.setAttribute("aria-pressed",String(state.rating===i+1));
        });
        tip.hidden=!preview;
        if (preview) { tip.textContent=preview+" / "+ratingMax;tip.style.left=((preview-.5)/ratingMax*100)+"%"; }
    }
    function refresh() {
        like.setAttribute("aria-pressed",String(state.like));
        showRating();
    }
    function save(change) {
        latest();change(state);
        try { localStorage.setItem(key,JSON.stringify(state)); volatile=false; }
        catch { volatile=true; }
        refresh();
    }
    function pulse(el,frames) {
        if (!motion.matches) el.animate(frames,{duration:380,easing:"cubic-bezier(.18,.75,.25,1)"});
    }
    like.addEventListener("click",()=>{
        incrementStat(like);
        save(s=>{s.like=!s.like;});
        pulse(like.querySelector("svg"),[{transform:"scale(.82)"},{transform:"scale(1.24)",offset:.48},{transform:"scale(1)"}]);
    });
    function toggleDiscussion(open) {
        panel.hidden=!open;comment.setAttribute("aria-expanded",String(open));
        if (open) { input.focus({preventScroll:true}); pulse(panel,[{opacity:.25,translate:"0 -5px"},{opacity:1,translate:"0 0"}]); }
        else comment.focus({preventScroll:true});
    }
    comment.addEventListener("click",()=>toggleDiscussion(panel.hidden));
    panel.addEventListener("keydown",event=>{if(event.key==="Escape"&&!event.isComposing){event.preventDefault();toggleDiscussion(false);}});
    input.addEventListener("input",()=>{submit.disabled=!input.value.trim();status.textContent="";});
    form.addEventListener("submit",event=>{
        event.preventDefault();
        const text=input.value;
        if (!text.trim()) return;
        incrementStat(comment);
        releaseBubble(cloud, text);
        input.value = "";
        submit.disabled = true;
        status.textContent = "评论已化作气泡。";
        input.focus({preventScroll:true});
    });
    stars.forEach((star,i)=>{
        star.addEventListener("pointerenter",e=>{if(e.pointerType!=="touch")showRating(i+1);});
        star.addEventListener("focus",()=>showRating(i+1));
        star.addEventListener("click",()=>{
            save(s=>{s.rating=s.rating===i+1?0:i+1;});
            pulse(star.querySelector("svg"),[{transform:"scale(.86)"},{transform:"scale(1.25)",offset:.5},{transform:"scale(1)"}]);
        });
        star.addEventListener("keydown",e=>{
            const to={ArrowLeft:Math.max(0,i-1),ArrowRight:Math.min(stars.length-1,i+1),Home:0,End:stars.length-1}[e.key];
            if (to!==undefined) {e.preventDefault();stars[to].focus();}
        });
    });
    rating.addEventListener("pointerleave",()=>showRating());
    rating.addEventListener("focusout",e=>{if(!rating.contains(e.relatedTarget))showRating();});
    window.addEventListener("storage",event=>{
        if (event.key===key || event.key===null) {volatile=false;latest();refresh();}
    });
    refresh();
    function clearDiscussion() {
        cloud.replaceChildren();
        input.value = "";
        submit.disabled = true;
        status.textContent = "";
        panel.hidden = true;
        comment.setAttribute("aria-expanded", "false");
    }
    window.addEventListener("pagehide", clearDiscussion);
    window.addEventListener("section-shown", event => {
        if (event.detail.previousSectionId === "works-section") clearDiscussion();
    });
}

export function initializeWorkPostStats() {
    const workPosts =
        document.querySelectorAll(
            ".work-post"
        );

    if (workPosts.length === 0) {
        return;
    }

    workPosts.forEach(initializePost);

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

        const state = counters.get(countElement);
        state.base = finalNumber;
        const display = () => (state.base + state.added).toLocaleString("zh-CN");
        if (motion.matches) {
            state.ready = true;
            countElement.textContent = display();
            return;
        }

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
            const finalText = display();
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
                state.ready = true;
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