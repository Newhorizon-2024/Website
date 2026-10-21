/* ===========================
   页面功能导入
=========================== */

import {
    initializeImageLoading
} from "./effects/image-loading.js?v=26.10.19.4";

import {
    initializeCreatorGallery
} from "./creators/creator-gallery.js?v=26.10.19.5";

import {
    initializeCreatorNameText
} from "./creators/creator-name-text.js?v=26.10.20.1";

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
import {initializeInnerDomainCubes} from "./effects/inner-domain-cubes.js?v=26.10.21.5";

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
} from "./effects/wanted-poster.js?v=26.10.19.5";

import {
    initializeWantedPreview
} from "./effects/wanted-preview.js?v=26.10.19.4";

import {
    initializeWorldviewCore
} from "./effects/worldview-core.js?v=26.10.21.3";

import {
    initializeWorldviewOrganizations
} from "./effects/worldview-organizations.js?v=26.10.19.5";

import {
    initializeWorldviewTargetCursor
} from "./effects/worldview-target-cursor.js?v=26.10.19.2";

import {
    initializeWorldviewUnavailableSignal
} from "./effects/worldview-unavailable-signal.js?v=26.9.2.1";

import {
    initializeWorldviewThings
} from "./effects/worldview-things.js?v=26.10.18.2";

import {
    initializeWorldviewScenes
} from "./effects/worldview-scenes.js?v=26.9.2.1";

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
} from "./navigation/nhn-accordion.js?v=26.10.18.2";

import {
    initializeNhnTimeline
} from "./navigation/nhn-timeline.js?v=26.10.18.4";

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
    initializeImageLoading();
    initializeBountyNavigation();
    initializeBossrushSection();
    initializeColosseumSection();
    initializeCountdownTooltip();
    initializeCreatorGallery();
    initializeCreatorNameText();
    initializeInnerDomainSection();
    initializeInnerDomainCubes();
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
    initializeWantedPreview();
    initializeWorldviewCore();
    initializeWorldviewTargetCursor();
    initializeWorldviewUnavailableSignal();
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
