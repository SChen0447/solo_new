import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NX = 64, NY = 64, NZ = 16;
const cx = NX / 2, cy = NY / 2, cz = NZ / 2;
const maxR = Math.sqrt(cx * cx + cy * cy);

const velocities = new Float32Array(NX * NY * NZ * 3);

for (let iz = 0; iz < NZ; iz++) {
  for (let iy = 0; iy < NY; iy++) {
    for (let ix = 0; ix < NX; ix++) {
      const idx = (iz * NY * NX + iy * NX + ix) * 3;
      const dx = ix - cx;
      const dy = iy - cy;
      const dz = iz - cz;
      const r = Math.sqrt(dx * dx + dy * dy);
      const theta = Math.atan2(dy, dx);

      const vortexStrength = 2.0 * Math.exp(-r * r / (maxR * maxR * 0.15));
      const zShear = 0.3 * (1.0 - Math.abs(dz) / cz);
      const updraft = 0.5 * Math.exp(-r * r / (maxR * maxR * 0.08)) * (1.0 - Math.abs(dz) / cz);

      const vx = -vortexStrength * Math.sin(theta) + zShear * 0.1 + 0.05 * Math.sin(ix * 0.2 + iz * 0.3);
      const vy = vortexStrength * Math.cos(theta) + zShear * 0.15 + 0.05 * Math.cos(iy * 0.2 + iz * 0.3);
      const vz = updraft + 0.1 * Math.sin(r * 0.3) * Math.cos(iz * 0.5);

      velocities[idx] = vx;
      velocities[idx + 1] = vy;
      velocities[idx + 2] = vz;
    }
  }
}

const output = {
  dimensions: [NX, NY, NZ],
  origin: [0, 0, 0],
  spacing: [1, 1, 1],
  velocities: Array.from(velocities)
};

const outPath = path.join(__dirname, 'public', 'data', 'sampleFlow.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(output));
console.log(`Generated sampleFlow.json: ${NX}x${NY}x${NZ} = ${NX * NY * NZ} grid points`);
