precision highp float;

varying vec3 vWorldPos;

uniform float uFadeFar;
uniform vec3 uGridColor;
uniform vec3 uAxisXColor;
uniform vec3 uAxisYColor;

float gridLine(vec2 coord, float scale) {
  vec2 uv = coord / scale;
  vec2 d  = fwidth(uv);
  vec2 g  = abs(fract(uv - 0.5) - 0.5) / d;
  return 1.0 - clamp(min(g.x, g.y), 0.0, 1.0);
}

float scaleAlpha(float camHeight, float scale) {
  float logRatio = log(camHeight / scale) / log(10.0);
  return 1.0 - clamp(logRatio - 1.0, 0.0, 1.0);
}

float axisLine(float coord, float widthPx) {
  return 1.0 - clamp(abs(coord) / (fwidth(coord) * widthPx), 0.0, 1.0);
}

void main() {
  float dist = length(vWorldPos - cameraPosition);
  float nearFade = smoothstep(0.0, uFadeFar * 0.02, dist);
  float farFade  = 1.0 - smoothstep(uFadeFar * 0.5, uFadeFar, dist);
  float fade = nearFade * farFade;
  if (fade <= 0.0) discard;

  vec2  xy = vWorldPos.xy;
  float h  = max(abs(cameraPosition.z), 0.1);

  float log10inv  = 1.0 / log(10.0);
  float logH      = log(h) * log10inv;
  float n         = floor(logH - 1.0);
  float fineScale   = pow(10.0, n);
  float coarseScale = pow(10.0, n + 1.0);

  float fineLine   = gridLine(xy, fineScale)   * scaleAlpha(h, fineScale);
  float coarseLine = gridLine(xy, coarseScale) * scaleAlpha(h, coarseScale);

  float alpha = max(fineLine, coarseLine);

  float axX = axisLine(vWorldPos.y, 2.0);
  float axY = axisLine(vWorldPos.x, 2.0);
  float axisAlpha = max(axX, axY);

  vec3 color = uGridColor;
  if (axisAlpha > alpha) {
    color = axX >= axY ? uAxisXColor : uAxisYColor;
    alpha = axisAlpha;
  }

  // Fade at grazing angles (inverse Fresnel): dot(fragment→camera, up-normal).
  // Encodes both angle and height — high camera stays visible even at low pitch.
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float grazeFade = smoothstep(0.0, 0.5, abs(viewDir.z));

  alpha *= fade * grazeFade;
  if (alpha <= 0.0) discard;

  gl_FragColor = vec4(color, alpha);
}
