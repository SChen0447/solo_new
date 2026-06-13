import * as THREE from 'three';

export const ParticleUniforms = {
  uTime: { value: 0.0 },
  uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
};

export const particleVertexShader = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aLife;
  attribute float aMaxLife;
  attribute float aSpeedFactor;

  varying vec3 vColor;
  varying float vLife;
  varying float vAlpha;
  varying float vSpeedFactor;

  uniform float uPixelRatio;

  void main() {
    vColor = aColor;
    vLife = aLife;
    vSpeedFactor = aSpeedFactor;

    float lifeRatio = clamp(aLife / max(aMaxLife, 0.0001), 0.0, 1.0);
    vAlpha = 1.0 - lifeRatio;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float fadeSize = mix(aSize, aSize * 0.3, lifeRatio);
    gl_PointSize = fadeSize * uPixelRatio * (300.0 / -mvPosition.z);
  }
`;

export const particleFragmentShader = /* glsl */ `
  precision highp float;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vSpeedFactor;

  uniform float uTime;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 3; i++) {
      value += amplitude * noise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);

    if (dist > 0.5) {
      discard;
    }

    float core = 1.0 - smoothstep(0.0, 0.15, dist);
    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    glow = pow(glow, 2.0);

    vec2 dustUV = gl_PointCoord * 8.0 + vec2(uTime * 0.05);
    float dust = fbm(dustUV);
    dust = smoothstep(0.3, 0.9, dust);
    dust *= (1.0 - smoothstep(0.1, 0.5, dist));

    float speedBoost = 0.5 + vSpeedFactor * 0.5;

    vec3 finalColor = vColor;
    finalColor += core * vColor * 1.5;
    finalColor += dust * 0.3;
    finalColor *= (1.0 + speedBoost * 0.3);

    float finalAlpha = (core * 0.9 + glow * 0.6 + dust * 0.2) * vAlpha;
    finalAlpha = clamp(finalAlpha, 0.0, 1.0);

    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

export function createParticleMaterial(_maxParticles: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: ParticleUniforms.uTime,
      uPixelRatio: ParticleUniforms.uPixelRatio,
    },
    vertexShader: particleVertexShader,
    fragmentShader: particleFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: false,
  });
}

export function colorFromSpeed(speedNormalized: number): THREE.Color {
  const t = Math.max(0, Math.min(1, speedNormalized));

  if (t < 0.5) {
    const blend = t * 2;
    const blue = new THREE.Color(0.2, 0.4, 1.0);
    const purple = new THREE.Color(0.6, 0.2, 1.0);
    return blue.clone().lerp(purple, blend);
  } else {
    const blend = (t - 0.5) * 2;
    const orange = new THREE.Color(1.0, 0.5, 0.1);
    const red = new THREE.Color(1.0, 0.15, 0.3);
    return orange.clone().lerp(red, blend);
  }
}

export function rainbowColor(index: number, total: number): THREE.Color {
  const hue = (index / total) % 1;
  const color = new THREE.Color();
  color.setHSL(hue, 1.0, 0.6);
  return color;
}
