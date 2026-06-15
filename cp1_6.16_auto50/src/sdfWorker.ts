export interface Atom {
  index: number;
  element: string;
  x: number;
  y: number;
  z: number;
}

export interface Bond {
  atom1Index: number;
  atom2Index: number;
  order: number;
}

export interface MoleculeData {
  name: string;
  atoms: Atom[];
  bonds: Bond[];
}

function parseSDFContent(content: string): MoleculeData {
  const lines = content.split('\n');
  const name = lines[0].trim() || 'Unknown Molecule';

  const countsLine = lines[3];
  if (!countsLine) {
    throw new Error('Invalid SDF format: missing counts line');
  }

  const atomCount = parseInt(countsLine.substring(0, 3).trim(), 10);
  const bondCount = parseInt(countsLine.substring(3, 6).trim(), 10);

  if (isNaN(atomCount) || isNaN(bondCount)) {
    throw new Error('Invalid SDF format: cannot parse atom/bond counts');
  }

  const atoms: Atom[] = [];
  for (let i = 0; i < atomCount; i++) {
    const lineIndex = 4 + i;
    if (lineIndex >= lines.length) break;
    const line = lines[lineIndex];
    const x = parseFloat(line.substring(0, 10).trim());
    const y = parseFloat(line.substring(10, 20).trim());
    const z = parseFloat(line.substring(20, 30).trim());
    const element = line.substring(31, 34).trim();
    atoms.push({ index: i, element, x, y, z });
  }

  const bonds: Bond[] = [];
  for (let i = 0; i < bondCount; i++) {
    const lineIndex = 4 + atomCount + i;
    if (lineIndex >= lines.length) break;
    const line = lines[lineIndex];
    const atom1Index = parseInt(line.substring(0, 3).trim(), 10) - 1;
    const atom2Index = parseInt(line.substring(3, 6).trim(), 10) - 1;
    const order = parseInt(line.substring(6, 9).trim(), 10);
    bonds.push({ atom1Index, atom2Index, order });
  }

  return { name, atoms, bonds };
}

self.onmessage = (e: MessageEvent) => {
  const { content, jobId } = e.data;
  try {
    const totalSteps = 10;
    for (let step = 0; step < totalSteps; step++) {
      self.postMessage({ type: 'progress', percent: Math.round(((step + 1) / totalSteps) * 100), jobId });
    }
    const result = parseSDFContent(content);
    self.postMessage({ type: 'done', data: result, jobId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown parse error';
    self.postMessage({ type: 'error', message, jobId });
  }
};
