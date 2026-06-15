import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWeatherStore } from '../store/weatherStore';
import { SKY_COLORS } from '../types';

const lerpColor = (a: string, b: string, t: number): THREE.Color => {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  return ca.lerp(cb, t);
};

const getSkyColorByWeather = (weather: any, mode: string): string => {
  const base = SKY_COLORS[mode as keyof typeof SKY_COLORS] || SKY_COLORS.sunny;
  return base;
};

export const SceneEnvironment: React.FC = React.memo(() => {
  const weather = useWeatherStore((s) => s.weather);
  const weatherMode = useWeatherStore((s) => s.weatherMode);
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const sceneColorRef = useRef(new THREE.Color(SKY_COLORS.sunny));
  const timeRef = useRef(0);

  const sunTargetElevation = useMemo(() => {
    const t = Math.min(weather.light / 2000, 1);
    return THREE.MathUtils.lerp(Math.PI / 4, Math.PI / 2.2, t);
  }, [weather.light]);

  useFrame((state, delta) => {
    timeRef.current += delta;

    if (dirLightRef.current) {
      const light = dirLightRef.current;
      const azimuth = timeRef.current * 0.02;
      const r = 80;
      const currentElev = THREE.MathUtils.lerp(
        Math.asin(light.position.y / r),
        sunTargetElevation,
        0.02
      );
      light.position.set(
        Math.cos(currentElev) * Math.cos(azimuth) * r,
        Math.sin(currentElev) * r,
        Math.cos(currentElev) * Math.sin(azimuth) * r
      );

      const intensityBase = weather.light / 1200;
      light.intensity = THREE.MathUtils.lerp(light.intensity, intensityBase, 0.05);

      if (weather.windSpeed > 10) {
        const swayAmount = (weather.windSpeed - 10) * 0.03;
        const swayFreq = THREE.MathUtils.lerp(0.2, 0.5, (weather.windSpeed - 10) / 10);
        light.target.position.x = Math.sin(timeRef.current * swayFreq * Math.PI * 2) * swayAmount * 5;
        light.target.position.z = Math.cos(timeRef.current * swayFreq * Math.PI * 2) * swayAmount * 5;
        light.target.updateMatrixWorld();
      }
    }

    if (ambientRef.current) {
      const target = 0.3 + (weather.light / 2000) * 0.4;
      ambientRef.current.intensity = THREE.MathUtils.lerp(ambientRef.current.intensity, target, 0.05);
    }

    const targetColor = getSkyColorByWeather(weather, weatherMode);
    sceneColorRef.current.lerp(new THREE.Color(targetColor), 0.03);
    state.scene.background = sceneColorRef.current;
    state.scene.fog = new THREE.Fog(sceneColorRef.current, 60, 180);
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.5} color="#ffffff" />
      <directionalLight
        ref={dirLightRef}
        position={[60, 70, 40]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={200}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-bias={-0.0005}
      />
    </>
  );
});

SceneEnvironment.displayName = 'SceneEnvironment';
