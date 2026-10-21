/* Native image-to-ASCII adaptation of the supplied ASCII Text reference.
 * The owning terminal calls update(); no private RAF, WebGL context or timer.
 * Fade Content's opacity/focus reveal is handled by the scoped CSS class. */
(() => {
    'use strict';
    const CHARSET = " .'`^\",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
    const LOGO_SOURCE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABYIAAAFiCAYAAABLZ6yJAAAACXBIWXMAAAsTAAALEwEAmpwYAAAGGmlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgOS4xLWMwMDIgNzkuYTZhNjM5NiwgMjAyNC8wMy8xMi0wNzo0ODoyMyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDI1LjkgKDIwMjQwNTA2Lm0uMjYxMSBjMTM3MmJmKSAgKFdpbmRvd3MpIiB4bXA6Q3JlYXRlRGF0ZT0iMjAyNS0wMS0yNVQxNTo1NDoxMCswODowMCIgeG1wOk1vZGlmeURhdGU9IjIwMjUtMDEtMjZUMTM6MTQ6MTgrMDg6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjUtMDEtMjZUMTM6MTQ6MTgrMDg6MDAiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjgzODZjMzZlLWRlMTEtOGQ0Ni1hOTNlLTgyZWQ2Y2YwOThhZiIgeG1wTU06RG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOmM5ZDRiMWJhLWUyNTAtZmI0OC05NzA5LTcxNmIzMzE4M2JiZSIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOjg5NTJmNTA1LTIxYjAtNTA0Yi1iYTk2LTUwZjc4Nzg0ZWVlMCI+IDx4bXBNTTpIaXN0b3J5PiA8cmRmOlNlcT4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNyZWF0ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6ODk1MmY1MDUtMjFiMC01MDRiLWJhOTYtNTBmNzg3ODRlZWUwIiBzdEV2dDp3aGVuPSIyMDI1LTAxLTI1VDE1OjU0OjEwKzA4OjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgMjUuOSAoMjAyNDA1MDYubS4yNjExIGMxMzcyYmYpICAoV2luZG93cykiLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjgzODZjMzZlLWRlMTEtOGQ0Ni1hOTNlLTgyZWQ2Y2YwOThhZiIgc3RFdnQ6d2hlbj0iMjAyNS0wMS0yNlQxMzoxNDoxOCswODowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDI1LjkgKDIwMjQwNTA2Lm0uMjYxMSBjMTM3MmJmKSAgKFdpbmRvd3MpIiBzdEV2dDpjaGFuZ2VkPSIvIi8+IDwvcmRmOlNlcT4gPC94bXBNTTpIaXN0b3J5PiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PhXwb0YAAA0iSURBVHic7dzRktNGEEBRK6X//2XlYQMBKlQw7Lg9V+d8gKqR5PHWpXeP67oem9lu4H8c0wMA/CHnL8AM5++H1ffB98Uanhvf2vU8Yy2f43m7fja9O0/6a3oAAAAAAADWEoIBAAAAAOKEYAAAAACAOCEYAAAAACBOCAYAAAAAiBOCAQAAAADihGAAAAAAgDghGAAAAAAgTggGAAAAAIgTggEAAAAA4oRg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';
    const clamp = value => Math.max(0, Math.min(1, value));
    const hash = (x,y) => {const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;return value - Math.floor(value);};

    function create(button) {
        if (!button) return null;
        const canvas = button.querySelector('canvas');
        const fallback = button.querySelector('img');
        const ctx = canvas?.getContext('2d');
        const sample = document.createElement('canvas');
        const sampler = sample.getContext('2d',{willReadFrequently:true});
        const source = new Image();
        let destroyed=false, revealed=false, busy=false, inside=false, activeAt=null;
        let revealAt=0, lastDraw=-Infinity, lastMetrics=null, mask=null, grid=null, fault=false;
        let pointer={x:.5,y:.5};
        let reduced=false;
        const DELAY=2.5;
        const FADE=1;
        button.disabled=true;
        button.classList.remove('is-visible','has-ascii');
        button.setAttribute('aria-hidden','true');

        function prepare() {
            if (!ctx || !sampler || !source.naturalWidth || destroyed || fault) return false;
            const rect=button.getBoundingClientRect();
            const width=Math.max(1,rect.width), height=Math.max(1,rect.height);
            const dpr=Math.min(window.devicePixelRatio||1,2);
            if (grid && grid.width===width && grid.height===height && grid.dpr===dpr) return true;
            const rows=Math.max(10,Math.round(height/5.5));
            const cols=Math.max(32,Math.min(180,Math.round(width/(5.5*.62))));
            sample.width=cols;sample.height=rows;
            try {
                sampler.clearRect(0,0,cols,rows);
                sampler.drawImage(source,0,0,cols,rows);
                const pixels=sampler.getImageData(0,0,cols,rows).data;
                mask=new Float32Array(cols*rows);
                for(let i=0;i<mask.length;i++) mask[i]=pixels[i*4+3]/255 * (pixels[i*4]*.3+pixels[i*4+1]*.6+pixels[i*4+2]*.1)/255;
            } catch {
                fault=true;button.classList.remove('has-ascii');return false;
            }
            canvas.width=Math.max(1,Math.round(width*dpr));
            canvas.height=Math.max(1,Math.round(height*dpr));
            grid={width,height,dpr,rows,cols,cellX:width/cols,cellY:height/rows};
            button.classList.add('has-ascii');
            return true;
        }
        function draw(clock,force=false) {
            if (!prepare() || !revealed || (!force && clock-lastDraw<1/24)) return;
            lastDraw=clock;
            const {width,height,dpr,cols,rows,cellX,cellY}=grid;
            const age=Math.max(0,clock-revealAt);
            const intro=reduced?0:1-clamp(age/1.4);
            const tick=Math.floor(clock*18);
            ctx.setTransform(dpr,0,0,dpr,0,0);
            ctx.clearRect(0,0,width,height);
            ctx.fillStyle='#fff';
            ctx.font=`500 ${cellY*.96}px ui-monospace,Consolas,monospace`;
            ctx.textAlign='center';ctx.textBaseline='middle';
            for(let y=0;y<rows;y++) for(let x=0;x<cols;x++) {
                const amount=mask[y*cols+x];
                if(amount<.045)continue;
                const distance=Math.hypot((x+.5)/cols-pointer.x,((y+.5)/rows-pointer.y)*.45);
                const hover=!reduced&&inside?Math.max(0,1-distance/.35)*.65:0;
                const scramble=!reduced&&hash(x+tick*7.13,y)<Math.max(intro,hover);
                const density=amount*(.84+.16*hash(x,y));
                const index=scramble?1+Math.floor(hash(x+tick*.37,y*1.7)*(CHARSET.length-1)):
                    Math.max(1,Math.min(CHARSET.length-1,Math.round(density*(CHARSET.length-1))));
                const drift=reduced?0:Math.sin(clock*.55+y*.6)*cellX*.1;
                ctx.globalAlpha=Math.min(1,amount*1.3)*(1-intro*.15);
                ctx.fillText(CHARSET[index],(x+.5)*cellX+drift,(y+.5)*cellY);
            }
            ctx.globalAlpha=1;
        }
        function update(metrics) {
            if(destroyed||!metrics)return;
            lastMetrics=metrics;
            reduced=Boolean(metrics.reducedMotion);
            const clock=Number.isFinite(metrics.clock)?metrics.clock:0;
            if(!revealed) {
                if(metrics.cube?.phase==='active'||metrics.available===false) {
                    if(activeAt===null)activeAt=clock;
                    if(reduced||metrics.available===false||clock-activeAt>=DELAY) {
                        revealed=true;revealAt=clock;
                        button.classList.add('is-visible');
                        button.setAttribute('aria-hidden','false');
                        button.disabled=busy;
                    }
                } else activeAt=null;
            }
            if(revealed)draw(clock,reduced);
        }
        function onMove(event) {
            const rect=button.getBoundingClientRect();
            pointer={x:clamp((event.clientX-rect.left)/Math.max(1,rect.width)),y:clamp((event.clientY-rect.top)/Math.max(1,rect.height))};
            inside=true;
        }
        const onLeave=()=>{inside=false;};
        button.addEventListener('pointermove',onMove,{passive:true});
        button.addEventListener('pointerleave',onLeave,{passive:true});
        source.onload=()=>{if(!destroyed){prepare();if(lastMetrics)update(lastMetrics);}};
        source.onerror=()=>{fault=true;button.classList.remove('has-ascii');};
        // Embedded bytes keep canvas sampling origin-clean for double-clicked
        // file:// previews as well as HTTP. The visible image is a local copy.
        source.src=LOGO_SOURCE;
        return Object.freeze({update,
            setBusy(value){busy=Boolean(value);button.disabled=busy||!revealed;button.classList.toggle('is-leaving',busy);},
            get metrics(){return {revealed,ready:Boolean(mask),fallback:!ctx||fault,delay:DELAY,fadeDuration:FADE,
                activeAt,revealAt,clock:lastMetrics?.clock??0,ascii:Boolean(mask),raf:false,disposed:destroyed};},
            destroy(){if(destroyed)return;destroyed=true;source.onload=source.onerror=null;
                button.removeEventListener('pointermove',onMove);button.removeEventListener('pointerleave',onLeave);
                button.classList.remove('is-visible','has-ascii','is-leaving');button.disabled=true;button.setAttribute('aria-hidden','true');
                ctx?.clearRect(0,0,canvas.width,canvas.height);mask=grid=lastMetrics=null;
                if(fallback)fallback.hidden=false;
            }
        });
    }
    window.NewHorizonTerminalLogo=Object.freeze({create});
})();
