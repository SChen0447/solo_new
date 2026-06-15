import * as THREE from 'three';

export interface DayNightState {
  timeOfDay: number;
  sunPosition: THREE.Vector3;
  ambientIntensity: number;
  directionalIntensity: number;
  lightColor: THREE.Color;
  skyColor: THREE.Color;
  fogColor: THREE.Color;
}

export class DayNightCycle {
  private time: number = 0.25;
  private cycleDuration: number;
  private sunDistance: number = 100;

  private readonly colors = {
    sunrise: new THREE.Color(0xFFD580),
    noon: new THREE.Color(0xFFFFFF),
    sunset: new THREE.Color(0xFF8C00),
    midnight: new THREE.Color(0x112233),
    skyNoon: new THREE.Color(0x87CEEB),
    skySunrise: new THREE.Color(0xFFB347),
    skySunset: new THREE.Color(0xFF6B35),
    skyMidnight: new THREE.Color(0x0a0a2a)
  };

  constructor(cycleDuration: number = 120) {
    this.cycleDuration = cycleDuration;
  }

  update(delta: number): void {
    this.time = (this.time + delta / this.cycleDuration) % 1;
  }

  setTime(time: number): void {
    this.time = ((time % 1) + 1) % 1;
  }

  getTime(): number {
    return this.time;
  }

  getTimeString(): string {
    const totalMinutes = this.time * 24 * 60;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  getState(): DayNightState {
    const angle = this.time * Math.PI * 2 - Math.PI / 2;
    const sunX = Math.cos(angle) * this.sunDistance;
    const sunY = Math.sin(angle) * this.sunDistance;
    const sunZ = 30;

    const sunPosition = new THREE.Vector3(sunX, sunY, sunZ);

    const normalizedY = (sunY / this.sunDistance + 1) / 2;
    const ambientIntensity = 0.15 + normalizedY * 0.4;
    const directionalIntensity = Math.max(0.1, normalizedY * 1.2);

    const lightColor = this.interpolateLightColor();
    const skyColor = this.interpolateSkyColor();
    const fogColor = skyColor.clone().multiplyScalar(0.8);

    return {
      timeOfDay: this.time,
      sunPosition,
      ambientIntensity,
      directionalIntensity,
      lightColor,
      skyColor,
      fogColor
    };
  }

  private interpolateLightColor(): THREE.Color {
    const t = this.time;

    if (t < 0.2) {
      const alpha = t / 0.2;
      return this.lerpColor(this.colors.midnight, this.colors.sunrise, alpha);
    } else if (t < 0.35) {
      const alpha = (t - 0.2) / 0.15;
      return this.lerpColor(this.colors.sunrise, this.colors.noon, alpha);
    } else if (t < 0.65) {
      const alpha = (t - 0.35) / 0.3;
      return this.lerpColor(this.colors.noon, this.colors.noon, alpha);
    } else if (t < 0.8) {
      const alpha = (t - 0.65) / 0.15;
      return this.lerpColor(this.colors.noon, this.colors.sunset, alpha);
    } else {
      const alpha = (t - 0.8) / 0.2;
      return this.lerpColor(this.colors.sunset, this.colors.midnight, alpha);
    }
  }

  private interpolateSkyColor(): THREE.Color {
    const t = this.time;

    if (t < 0.2) {
      const alpha = t / 0.2;
      return this.lerpColor(this.colors.skyMidnight, this.colors.skySunrise, alpha);
    } else if (t < 0.35) {
      const alpha = (t - 0.2) / 0.15;
      return this.lerpColor(this.colors.skySunrise, this.colors.skyNoon, alpha);
    } else if (t < 0.65) {
      return this.colors.skyNoon.clone();
    } else if (t < 0.8) {
      const alpha = (t - 0.65) / 0.15;
      return this.lerpColor(this.colors.skyNoon, this.colors.skySunset, alpha);
    } else {
      const alpha = (t - 0.8) / 0.2;
      return this.lerpColor(this.colors.skySunset, this.colors.skyMidnight, alpha);
    }
  }

  private lerpColor(color1: THREE.Color, color2: THREE.Color, alpha: number): THREE.Color {
    const result = color1.clone();
    result.lerp(color2, alpha);
    return result;
  }

  getCycleDuration(): number {
    return this.cycleDuration;
  }
}
