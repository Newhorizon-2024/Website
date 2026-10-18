/* Motion Garden Shadowflame：保留原始噪声，按设计调整中低、两侧高的火焰包络。 */
export const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uWarp;
uniform float uDetail;
uniform float uShimmer;
uniform float uHeight;
uniform float uWidth;
uniform float uGrain;
uniform vec3 uCoreColor;
uniform vec3 uFlameColor;
uniform vec3 uBgColor;
out vec4 fragColor;

vec2 hash(vec2 p){
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  float n = mix(
    mix(dot(-1.0 + 2.0 * hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
        dot(-1.0 + 2.0 * hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(-1.0 + 2.0 * hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
        dot(-1.0 + 2.0 * hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
    u.y);
  return 0.5 + 0.5 * n;
}
// CONSTANT bound + break keeps the octave loop a compile-time constant while
// still honouring the live "detail" control (1..6 octaves).
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 6; i++){
    if (float(i) >= uDetail) break;
    v += a * noise(p);
    p = p * 2.0 + vec2(37.1, 17.7);
    a *= 0.5;
  }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float aspect = iResolution.x / max(iResolution.y, 1.0);
  float t = iTime;
  float vy = uv.y;                      // 0 bottom, 1 top

  // Heat shimmer: horizontally offset the sample point, stronger higher up.
  float shim = sin(vy * 22.0 - t * uSpeed * 1.5) * uShimmer * 0.03 * vy;
  vec2 p = vec2((uv.x - 0.5) * aspect + shim, vy);

  // Flame field scrolls upward over time. Sampled anisotropically — high
  // frequency across x, stretched along y — because fire is vertically
  // elongated. An isotropic field reads as round puffs of fog, and the extra
  // cells across the width are what separate the body into distinct tongues.
  vec2 fp = vec2(p.x * 4.6, p.y * 2.2 - t * uSpeed * 1.3);

  // Domain warp — the signature swirling licks of flame.
  vec2 warped = fp + uWarp * vec2(
    fbm(fp + vec2(0.0, t * uSpeed * 0.6)),
    fbm(fp + vec2(7.0, t * uSpeed * 0.6 + 7.0))
  );
  float density = fbm(warped);

  // 两侧抬高、中央压低；uHeight 继续统一控制整体高度。
  float side = smoothstep(0.10, 0.92, abs(uv.x - 0.5) * 2.0);
  float localHeight = uHeight * mix(0.50, 1.0, side);
  float taper = 1.0 - smoothstep(0.0, localHeight, vy);
  // Base intake so the flame roots solidly at the very bottom.
  taper = max(taper, (1.0 - smoothstep(0.0, 0.12, vy)) * 0.9);

  // 保留两侧火舌，不再用中央锥形包络把屏幕边缘截掉。
  float horiz = mix(0.75, 1.0, side) * clamp(uWidth / 1.6, 0.0, 1.0);

  // Carve tongues out of the noise before shaping it. fbm returns a soft field
  // centred near 0.5; with no contrast window every value survives into the
  // colour ramp and the flame reads as haze with no edges.
  float body = smoothstep(0.33, 0.63, density);

  float flame = clamp(body * taper * horiz, 0.0, 1.0);
  flame = pow(flame, 1.1);

  // Colour ramp: background -> dark flame body -> amethyst core near the base.
  vec3 col = uBgColor;
  col = mix(col, uFlameColor, smoothstep(0.12, 0.55, flame));
  // Amethyst self-illumination so the dark flame reads as light against the void,
  // not black-on-black — the whole lick glows, the core just burns brightest.
  col += uCoreColor * pow(flame, 1.6) * 0.32;

  // Amethyst core: only the hottest density, weighted toward the base.
  float baseWeight = 1.0 - smoothstep(localHeight * 0.35, localHeight * 0.95, vy);
  float coreMask = smoothstep(0.45, 0.9, flame) * baseWeight;
  col = mix(col, uCoreColor, coreMask);
  // Soft additive bloom so the core reads as emitted light, not a flat fill.
  col += uCoreColor * pow(coreMask, 2.0) * 0.35;

  // Film grain — animated hash keyed off the pixel and fractional time.
  float g = fract(sin(dot(gl_FragCoord.xy + fract(iTime), vec2(12.9898, 78.233))) * 43758.5453);
  col += (g - 0.5) * uGrain;

  col = clamp(col, 0.0, 1.0);
  fragColor = vec4(col, 1.0);
}
`;
