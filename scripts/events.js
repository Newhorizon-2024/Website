/* ===========================
   页面功能导入
=========================== */

import {
    initializeCreatorGallery
} from "./creators/creator-gallery.js";

import {
    initializeCountdownTooltip
} from "./effects/countdown-tooltip.js";

import {
    initializeColosseumSection
} from "./effects/colosseum-section.js";

import {
    initializeBossrushSection
} from "./effects/bossrush-section.js";

import {
    initializeInnerworldSection
} from "./effects/innerworld-section.js";

import {
    initializeInnerDomainSection
} from "./effects/inner-domain-section.js";

import {
    initializeMineashSection
} from "./effects/mineash-section.js";

import {
    initializePowerSystemSection
} from "./effects/power-system-section.js";

import {
    initializeNewworldSection
} from "./effects/newworld-section.js";

import {
    initializeNhnLogoMagnet
} from "./effects/nhn-logo.js";

import {
    initializePanelPointerEffects
} from "./effects/panel-pointer.js";

import {
    initializeWantedPosterPointerEffects
} from "./effects/wanted-poster.js";

import {
    initializeWorldviewCore
} from "./effects/worldview-core.js";

import {
    initializeWorldviewOrganizations
} from "./effects/worldview-organizations.js";

import {
    initializeWorldviewTargetCursor
} from "./effects/worldview-target-cursor.js";

import {
    initializeWorldviewThings
} from "./effects/worldview-things.js";

import {
    initializeWorldviewScenes
} from "./effects/worldview-scenes.js";

import {
    initializeWorkPostPointerEffects
} from "./effects/work-post-pointer.js";

import {
    initializeBountyNavigation
} from "./navigation/bounty-navigation.js";

import {
    initializeInlineSectionLinks
} from "./navigation/inline-section-links.js";

import {
    initializeNhnAccordion
} from "./navigation/nhn-accordion.js";

import {
    initializeNhnTimeline
} from "./navigation/nhn-timeline.js";

import {
    initializeWorkFeed
} from "./work/work-feed.js";

import {
    initializeWorkPostStats
} from "./work/work-post-stats.js";


/* ===========================
   页面初始化
=========================== */

function initializeEvents() {
    initializeBountyNavigation();
    initializeBossrushSection();
    initializeColosseumSection();
    initializeCountdownTooltip();
    initializeCreatorGallery();
    initializeInnerDomainSection();
    initializeInnerworldSection();
    initializeInlineSectionLinks();
    initializeMineashSection();
    initializeNewworldSection();
    initializeNhnAccordion();
    initializeNhnLogoMagnet();
    initializeNhnTimeline();
    initializePanelPointerEffects();
    initializePowerSystemSection();
    initializeWantedPosterPointerEffects();
    initializeWorldviewCore();
    initializeWorldviewTargetCursor();
    initializeWorldviewOrganizations();
    initializeWorldviewThings();
    initializeWorldviewScenes();
    initializeWorkFeed();
    initializeWorkPostStats();
    initializeWorkPostPointerEffects();
    
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeEvents,
        { once: true }
    );
} else {
    initializeEvents();
}
