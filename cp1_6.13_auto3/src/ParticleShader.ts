// =============================================================================
// ParticleShader.ts - 自定义粒子着色器模块
// -----------------------------------------------------------------------------
// 职责:
//   1. 定义粒子顶点着色器(位置、大小、生命周期衰减)
//   2. 定义粒子片元着色器(发光核心、光晕、颜色渐变、星际尘埃纹理)
//   3. 提供颜色计算工具函数(基于速度的颜色渐变、HSL彩虹色)
//   4. 输出 ShaderMaterial 供 ParticleSystem 使用
//
// 数据流向:
//   输入: ParticleSystem → 通过 BufferAttribute 传入 aPosition/aColor/aSize/aLife/aSpeedFactor
//   处理: 顶点着色器 → 计算屏幕大小、生命周期透明度
//         片元着色器 → 发光晕染、尘埃纹理、速度色增强
//   输出: ShaderMaterial → THREE.Points 渲染
//
// 被调用: ParticleSystem.ts 中 createParticleMaterial() / colorFromSpeed() / rainbowColor()
// 依赖:   three.js (THREE.ShaderMaterial, THREE.Color)
// =============================================================================

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

    float fadeSize = mix(aSize, aSize * 0.25, lifeRatio);
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
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }

  vec3 colorFromSpeedFactor(vec3 baseColor, float speed) {
    vec3 coolTint = vec3(0.3, 0.4, 1.0);
    vec3 warmTint = vec3(1.0, 0.5, 0.2);
    vec3 tint = mix(coolTint, warmTint, speed);
    return mix(baseColor, baseColor * 1.5 + tint * 0.3, speed * 0.5);
  }

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);

    if (dist > 0.5) {
      discard;
    }

    float core = 1.0 - smoothstep(0.0, 0.12, dist);
    float midGlow = 1.0 - smoothstep(0.0, 0.3, dist);
    float outerGlow = 1.0 - smoothstep(0.0, 0.5, dist);
    outerGlow = pow(outerGlow, 2.2);

    vec2 dustUV = gl_PointCoord * 10.0 + vec2(uTime * 0.03, uTime * 0.02);
    float dust = fbm(dustUV);
    dust = smoothstep(0.25, 0.85, dust);
    dust *= (1.0 - smoothstep(0.08, 0.5, dist));

    vec2 streakUV = uv * 6.0;
    float streakNoise = fbm(streakUV + vec2(uTime * 0.1));
    float streaks = pow(streakNoise, 2.0) * (1.0 - smoothstep(0.0, 0.45, dist));

    vec3 baseColor = colorFromSpeedFactor(vColor, vSpeedFactor);

    vec3 finalColor = baseColor;
    finalColor += core * baseColor * 2.0;
    finalColor += midGlow * baseColor * 0.8;
    finalColor += outerGlow * baseColor * 0.4;
    finalColor += dust * baseColor * 0.4;
    finalColor += streaks * baseColor * 0.3;

    float speedBoost = 0.8 + vSpeedFactor * 0.8;
    finalColor *= speedBoost;

    float finalAlpha = (core * 1.0 + midGlow * 0.6 + outerGlow * 0.4 + dust * 0.25 + streaks * 0.2) * vAlpha;
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

// 基于速度归一化值生成颜色：慢速→蓝紫色，快速→橙红色
export function colorFromSpeed(speedNormalized: number): THREE.Color {
  const t = Math.max(0, Math.min(1, speedNormalized));

  if (t < 0.33) {
    const blend = t / 0.33;
    const deepBlue = new THREE.Color(0.15, 0.25, 1.0);
    const purple = new THREE.Color(0.55, 0.2, 1.0);
    return deepBlue.clone().lerp(purple, blend);
  } else if (t < 0.66) {
    const blend = (t - 0.33) / 0.33;
    const purple = new THREE.Color(0.55, 0.2, 1.0);
    const magenta = new THREE.Color(1.0, 0.25, 0.7);
    return purple.clone().lerp(magenta, blend);
  } else {
    const blend = (t - 0.66) / 0.34;
    const orange = new THREE.Color(1.0, 0.55, 0.1);
    const red = new THREE.Color(1.0, 0.15, 0.25);
    return orange.clone().lerp(red, blend);
  }
}

// 基于 HSL 色环均匀分布生成彩虹色（爆发粒子用）
export function rainbowColor(index: number, total: number): THREE.Color {
  const hue = (index / total) % 1;
  const color = new THREE.Color();
  color.setHSL(hue, 1.0, 0.6);
  return color;
}
