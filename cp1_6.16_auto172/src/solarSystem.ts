import * as THREE from 'three';

export interface PlanetData {
  name: string;
  color: number;
  radius: number;
  orbitRadius: number;
  orbitSpeed: number;
  rotationSpeed: number;
  au: number;
  orbitalPeriod: number;
  rotationPeriod: number;
  mass: number;
  satellites: number;
  eccentricity: number;
  inclination: number;
}

export const PLANET_DATA: PlanetData[] = [
  {
    name: '水星',
    color: 0xb5b5b5,
    radius: 0.35,
    orbitRadius: 8,
    orbitSpeed: 4.15,
    rotationSpeed: 0.004,
    au: 0.39,
    orbitalPeriod: 0.24,
    rotationPeriod: 1407.6,
    mass: 0.055,
    satellites: 0,
    eccentricity: 0.2056,
    inclination: 7
  },
  {
    name: '金星',
    color: 0xe8cda0,
    radius: 0.87,
    orbitRadius: 11,
    orbitSpeed: 1.62,
    rotationSpeed: -0.002,
    au: 0.72,
    orbitalPeriod: 0.62,
    rotationPeriod: 5832.5,
    mass: 0.815,
    satellites: 0,
    eccentricity: 0.0068,
    inclination: 3.39
  },
  {
    name: '地球',
    color: 0x4a90d9,
    radius: 0.9,
    orbitRadius: 15,
    orbitSpeed: 1.0,
    rotationSpeed: 0.02,
    au: 1.0,
    orbitalPeriod: 1.0,
    rotationPeriod: 23.9,
    mass: 1.0,
    satellites: 1,
    eccentricity: 0.0167,
    inclination: 0
  },
  {
    name: '火星',
    color: 0xc1440e,
    radius: 0.48,
    orbitRadius: 19,
    orbitSpeed: 0.53,
    rotationSpeed: 0.018,
    au: 1.52,
    orbitalPeriod: 1.88,
    rotationPeriod: 24.6,
    mass: 0.107,
    satellites: 2,
    eccentricity: 0.0934,
    inclination: 1.85
  },
  {
    name: '木星',
    color: 0xd8ca9d,
    radius: 2.5,
    orbitRadius: 28,
    orbitSpeed: 0.084,
    rotationSpeed: 0.04,
    au: 5.2,
    orbitalPeriod: 11.86,
    rotationPeriod: 9.9,
    mass: 317.8,
    satellites: 95,
    eccentricity: 0.0489,
    inclination: 1.31
  },
  {
    name: '土星',
    color: 0xead6b8,
    radius: 2.1,
    orbitRadius: 36,
    orbitSpeed: 0.034,
    rotationSpeed: 0.038,
    au: 9.58,
    orbitalPeriod: 29.46,
    rotationPeriod: 10.7,
    mass: 95.2,
    satellites: 146,
    eccentricity: 0.0565,
    inclination: 2.49
  },
  {
    name: '天王星',
    color: 0xd1e7e7,
    radius: 1.5,
    orbitRadius: 44,
    orbitSpeed: 0.012,
    rotationSpeed: -0.03,
    au: 19.22,
    orbitalPeriod: 84.01,
    rotationPeriod: 17.2,
    mass: 14.5,
    satellites: 28,
    eccentricity: 0.0457,
    inclination: 0.77
  },
  {
    name: '海王星',
    color: 0x5b5ddf,
    radius: 1.45,
    orbitRadius: 52,
    orbitSpeed: 0.006,
    rotationSpeed: 0.032,
    au: 30.05,
    orbitalPeriod: 164.8,
    rotationPeriod: 16.1,
    mass: 17.1,
    satellites: 16,
    eccentricity: 0.0113,
    inclination: 1.77
  }
];

export interface PlanetObject {
  mesh: THREE.Mesh;
  orbitLine: THREE.LineLoop;
  dashedOrbitLine: THREE.LineLoop;
  data: PlanetData;
  angle: number;
}

export class SolarSystem {
  public scene: THREE.Scene;
  public sun: THREE.Mesh;
  public sunParticles: THREE.Points;
  public planets: PlanetObject[] = [];
  public timeScale = 1;

  private particleSizes: Float32Array;
  private particleBasePositions: Float32Array;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.sun = this.createSun();
    this.sunParticles = this.createSunParticles();
    this.particleSizes = new Float32Array(500);
    this.particleBasePositions = new Float32Array(500 * 3);
    this.initParticleData();
    this.planets = this.createPlanets();
  }

  private createSun(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(3, 64, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffcc00
    });
    const sun = new THREE.Mesh(geometry, material);
    this.scene.add(sun);

    const glowGeometry = new THREE.SphereGeometry(3.5, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    sun.add(glow);

    const outerGlowGeometry = new THREE.SphereGeometry(4.2, 32, 32);
    const outerGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.15
    });
    const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
    sun.add(outerGlow);

    return sun;
  }

  private createSunParticles(): THREE.Points {
    const particleCount = 500;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const colorStart = new THREE.Color(0xffd54f);
    const colorEnd = new THREE.Color(0xff6f00);

    for (let i = 0; i < particleCount; i++) {
      const radius = 3.5 + Math.random() * 4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const colorMix = Math.random();
      const color = colorStart.clone().lerp(colorEnd, colorMix);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 2 + Math.random() * 3;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
    return particles;
  }

  private initParticleData(): void {
    const positions = this.sunParticles.geometry.attributes.position.array as Float32Array;
    const sizes = this.sunParticles.geometry.attributes.size.array as Float32Array;
    this.particleBasePositions.set(positions);
    this.particleSizes.set(sizes);
  }

  private createPlanets(): PlanetObject[] {
    const planets: PlanetObject[] = [];

    for (const data of PLANET_DATA) {
      const planetGroup = new THREE.Group();

      const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: data.color,
        roughness: 0.7,
        metalness: 0.1
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { planetData: data };
      planetGroup.add(mesh);

      if (data.name === '土星') {
        const ringGeometry = new THREE.RingGeometry(data.radius * 1.4, data.radius * 2.2, 64);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: 0xc9b896,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2.5;
        mesh.add(ring);
      }

      this.scene.add(planetGroup);

      const orbitLine = this.createOrbitLine(data, false);
      const dashedOrbitLine = this.createOrbitLine(data, true);
      dashedOrbitLine.visible = false;

      const planet: PlanetObject = {
        mesh: planetGroup as unknown as THREE.Mesh,
        orbitLine,
        dashedOrbitLine,
        data,
        angle: Math.random() * Math.PI * 2
      };

      planets.push(planet);
    }

    return planets;
  }

  private createOrbitLine(data: PlanetData, dashed: boolean): THREE.LineLoop {
    const segments = 128;
    const points: THREE.Vector3[] = [];
    const a = data.orbitRadius;
    const b = a * Math.sqrt(1 - data.eccentricity * data.eccentricity);
    const c = a * data.eccentricity;
    const inclinationRad = (data.inclination * Math.PI) / 180;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = a * Math.cos(angle) - c;
      const z = b * Math.sin(angle);
      const y = z * Math.sin(inclinationRad);
      const zAdjusted = z * Math.cos(inclinationRad);
      points.push(new THREE.Vector3(x, y, zAdjusted));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    let material: THREE.LineBasicMaterial | THREE.LineDashedMaterial;
    if (dashed) {
      material = new THREE.LineDashedMaterial({
        color: 0x4fc3f7,
        transparent: true,
        opacity: 0.4,
        dashSize: 0.5,
        gapSize: 0.3
      });
    } else {
      material = new THREE.LineBasicMaterial({
        color: 0x4fc3f7,
        transparent: true,
        opacity: 0.5,
        linewidth: 1.5
      });
    }

    const line = new THREE.LineLoop(geometry, material);
    if (dashed) {
      line.computeLineDistances();
    }
    this.scene.add(line);
    return line;
  }

  public update(deltaTime: number): void {
    const dt = deltaTime * this.timeScale;

    for (const planet of this.planets) {
      planet.angle += planet.data.orbitSpeed * dt * 0.1;

      const a = planet.data.orbitRadius;
      const b = a * Math.sqrt(1 - planet.data.eccentricity * planet.data.eccentricity);
      const c = a * planet.data.eccentricity;
      const inclinationRad = (planet.data.inclination * Math.PI) / 180;

      const x = a * Math.cos(planet.angle) - c;
      const z = b * Math.sin(planet.angle);
      const y = z * Math.sin(inclinationRad);
      const zAdjusted = z * Math.cos(inclinationRad);

      planet.mesh.position.set(x, y, zAdjusted);
      planet.mesh.rotation.y += planet.data.rotationSpeed * dt * 10;

      planet.orbitLine.rotation.y += 0.0002 * dt;
      planet.dashedOrbitLine.rotation.y += 0.0002 * dt;
    }

    this.sun.rotation.y += 0.001 * dt;
    this.sunParticles.rotation.y += 0.0005 * dt;

    const positions = this.sunParticles.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < 500; i++) {
      const idx = i * 3;
      const baseX = this.particleBasePositions[idx];
      const baseY = this.particleBasePositions[idx + 1];
      const baseZ = this.particleBasePositions[idx + 2];
      const offset = 0.15 * Math.sin(Date.now() * 0.002 + i);

      positions[idx] = baseX + offset * (baseX / Math.abs(baseX || 1));
      positions[idx + 1] = baseY + offset * (baseY / Math.abs(baseY || 1));
      positions[idx + 2] = baseZ + offset * (baseZ / Math.abs(baseZ || 1));
    }
    this.sunParticles.geometry.attributes.position.needsUpdate = true;

    (this.sunParticles.material as THREE.PointsMaterial).opacity =
      0.7 + Math.sin(Date.now() * 0.003) * 0.2;
  }

  public setPlanetVisible(index: number, visible: boolean): void {
    if (index >= 0 && index < this.planets.length) {
      this.planets[index].mesh.visible = visible;
      this.planets[index].orbitLine.visible = visible;
      this.planets[index].dashedOrbitLine.visible = !visible;
    }
  }
}
