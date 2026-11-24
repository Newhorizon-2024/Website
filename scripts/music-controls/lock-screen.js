import { appleMobile } from "../device-input.js?v=26.11.24.1";

const logo = new URL("../../icons/icon-512x512.png?v=26.11.24.1", import.meta.url).href;
let published = null;

export function clearSiteArtwork() {
    if (!published) return;
    if (navigator.mediaSession?.metadata === published) navigator.mediaSession.metadata = null;
    published = null;
}

export function updateLockScreen(audio, songs) {
    if (!appleMobile || !navigator.mediaSession || typeof MediaMetadata !== "function") return;
    const source = audio.currentSrc || audio.src;
    const song = songs.find(item => item.useSiteArtwork && new URL(item.path,document.baseURI).href === source);
    if (!song) { clearSiteArtwork(); return; }
    const name = song.path.slice(song.path.lastIndexOf("/") + 1).replace(/\.[^.]+$/, "");
    const separator = name.lastIndexOf(" - ");
    const title = separator < 0 ? name : name.slice(0,separator);
    const artist = separator < 0 ? "" : name.slice(separator + 3);
    if (published && navigator.mediaSession.metadata === published && published.title === title && published.artist === artist) return;
    try {
        const metadata = new MediaMetadata({title, artist, artwork:[{src:logo, sizes:"512x512", type:"image/png"}]});
        navigator.mediaSession.metadata = metadata;
        published = metadata;
    } catch { /* Metadata is optional on older WebKit versions. */ }
}
