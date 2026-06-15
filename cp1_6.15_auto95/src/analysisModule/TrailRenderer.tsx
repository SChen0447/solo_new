import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useJointStore } from '../jointModule/JointController';

const TrailRenderer: React.FC = () => {
  const lineObj = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      linewidth: 2
    });
    return new THREE.Line(geo, mat);
  }, []);

  const { trailPoints } = useJointStore();
  const colors = useMemo(() => new Float32Array(100000 * 3), []);

  useFrame(() => {
    const geometry = lineObj.geometry;
    if (trailPoints.length < 2) {
      geometry.setDrawRange(0, 0);
      if (geometry.attributes.position) {
        geometry.attributes.position.needsUpdate = true;
      }
      return;
    }

    const pointCount = trailPoints.length;
    const positions = new Float32Array(pointCount * 3);

    for (let i = 0; i < pointCount; i++) {
      positions[i * 3] = trailPoints[i].x;
      positions[i * 3 + 1] = trailPoints[i].y;
      positions[i * 3 + 2] = trailPoints[i].z;

      const t = i / Math.max(1, pointCount - 1);
      const r = Math.floor(30 + 80 * (1 - t));
      const g = Math.floor(100 + 155 * t);
      const b = 255;
      colors[i * 3] = r / 255;
      colors[i * 3 + 1] = g / 255;
      colors[i * 3 + 2] = b / 255;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors.slice(0, pointCount * 3), 3));
    geometry.setDrawRange(0, pointCount);
    geometry.computeBoundingSphere();
  });

  if (trailPoints.length < 2) return null;

  return <primitive object={lineObj} />;
};

export const TrailDots: React.FC = () => {
  const { trailPoints } = useJointStore();

  const pointsObj = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const mat = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true
    });
    return new THREE.Points(geo, mat);
  }, []);

  useFrame(() => {
    const geometry = pointsObj.geometry;
    const pointCount = trailPoints.length;
    if (pointCount < 2) {
      geometry.setDrawRange(0, 0);
      if (geometry.attributes.position) {
        geometry.attributes.position.needsUpdate = true;
      }
      return;
    }

    const positions = new Float32Array(pointCount * 3);
    const colors = new Float32Array(pointCount * 3);

    for (let i = 0; i < pointCount; i++) {
      positions[i * 3] = trailPoints[i].x;
      positions[i * 3 + 1] = trailPoints[i].y;
      positions[i * 3 + 2] = trailPoints[i].z;

      const t = i / Math.max(1, pointCount - 1);
      colors[i * 3] = (30 + 80 * (1 - t)) / 255;
      colors[i * 3 + 1] = (100 + 155 * t) / 255;
      colors[i * 3 + 2] = 1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setDrawRange(0, pointCount);
    geometry.computeBoundingSphere();
  });

  if (trailPoints.length < 2) return null;

  return <primitive object={pointsObj} />;
};

export default TrailRenderer;
