import {
    initializeNavigation
} from "./navigation/navigation.js?v=26.11.21.10";

import {
    initializeBackToParent
} from "./navigation/back-to-parent.js";

import {
    initializeMusicControls
} from "./music-controls/player.js?v=26.11.21.10";


/* ===========================
   页面控制入口
=========================== */

function initializeControls() {
    initializeNavigation();
    initializeMusicControls();
    initializeBackToParent();
}


/* ===========================
   页面初始化
=========================== */

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeControls,
        {
            once: true
        }
    );
} else {
    initializeControls();
}
