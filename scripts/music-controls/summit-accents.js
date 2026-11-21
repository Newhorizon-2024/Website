// Reach for the Summit — Lena Raine. Milliseconds at distinct tonal attacks
// in loud phrases of the site's 668.93 s recording (spectral peaks at 0.86–5.13 kHz).
const onsets = [
    168700, 169644, 170572, 171516, 181596, 189324, 192844, 199708, 204332, 207628,
    208332, 214204, 215820, 219148, 222860, 225948, 227068, 229196, 230572, 231516,
    232700, 233404, 235276, 238092, 238780, 244684, 247932, 248876, 250268, 252604,
    253100, 254012, 256716, 260460, 272044, 273788, 274300, 274844, 278444, 279388,
    282604, 283340, 315564, 316828, 317772, 318700, 319244, 319772, 320572, 321532,
    322460, 322988, 323516, 324572, 325644, 326364, 512140, 512652, 513260, 514076,
    515820, 516764, 517836, 518668, 519596, 520652, 521564, 522060, 523324, 524380,
    525308, 526268, 528012, 528956, 529708, 531308, 531804, 534332, 537628, 538604,
    539372, 541132, 542588, 544076, 544700, 545868, 546524, 547484, 549132, 552860,
    555948, 559196, 559740, 562924, 563420, 563948, 568140, 570908, 571724, 573596,
    574668, 575468, 577500, 578172, 578892, 579692, 580508, 588252, 589116, 590828,
    591772, 592812, 593644, 594572, 595980, 596572, 597068, 598364, 599404, 600316,
    601276, 602060, 603148, 603948, 605020, 606572, 609100, 612620, 613324, 614508,
    616252, 618140, 619180, 619996, 620828, 621868, 622700, 624140, 627628, 632076,
    633948, 636412
];

export function createSummitCuePlayer(path) {
    if (path !== "media/Reach for the Summit - Lena Raine.mp3") return null;
    let previous = null;
    let index = 0;

    function seek(ms) {
        let low = 0, high = onsets.length;
        while (low<high) {
            const mid = (low+high) >>> 1;
            if (onsets[mid]<=ms) low = mid+1;
            else high = mid;
        }
        index = low;
    }
    return {
        reset() {
            previous = null;
            window.NewHorizonBackgroundCubes?.clearCubePulse();
        },
        advance(audio) {
            const ms = audio.currentTime*1000;
            if (audio.seeking || audio.paused || audio.ended) return;
            if (previous === null || ms<previous || ms-previous>220*audio.playbackRate) {
                seek(ms);
            } else if (index<onsets.length && onsets[index]<=ms) {
                index++;
                if (!audio.muted && audio.volume>0) window.NewHorizonBackgroundCubes?.pulseVisibleCube();
            }
            previous = ms;
        }
    };
}
