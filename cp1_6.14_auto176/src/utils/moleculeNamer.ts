import type { Atom, Bond, ElementType } from '../stores/atomsStore';

export interface MoleculeInfo {
  formula: string;
  name: string;
  isComplete: boolean;
  message: string;
}

interface AtomNode {
  atom: Atom;
  bonds: string[];
  visited: boolean;
  bondCount: number;
}

const ELEMENT_ORDER: ElementType[] = ['C', 'H', 'O', 'N', 'S'];

const ALKANE_PREFIXES: Record<number, string> = {
  1: 'meth',
  2: 'eth',
  3: 'prop',
  4: 'but',
  5: 'pent',
  6: 'hex',
  7: 'hept',
  8: 'oct',
  9: 'non',
  10: 'dec'
};

const VALENCE: Record<ElementType, number> = {
  C: 4,
  H: 1,
  O: 2,
  N: 3,
  S: 2
};

function countElements(atoms: Atom[]): Record<ElementType, number> {
  const counts: Record<ElementType, number> = {
    C: 0,
    H: 0,
    O: 0,
    N: 0,
    S: 0
  };

  atoms.forEach(atom => {
    counts[atom.element]++;
  });

  return counts;
}

function buildFormula(counts: Record<ElementType, number>): string {
  let formula = '';

  ELEMENT_ORDER.forEach(element => {
    const count = counts[element];
    if (count > 0) {
      formula += element;
      if (count > 1) {
        formula += count;
      }
    }
  });

  return formula;
}

function buildGraph(atoms: Atom[], bonds: Bond[]): Map<string, AtomNode> {
  const graph = new Map<string, AtomNode>();

  atoms.forEach(atom => {
    graph.set(atom.id, {
      atom,
      bonds: [],
      visited: false,
      bondCount: 0
    });
  });

  bonds.forEach(bond => {
    const fromNode = graph.get(bond.from);
    const toNode = graph.get(bond.to);

    if (fromNode) {
      fromNode.bonds.push(bond.to);
      fromNode.bondCount += bond.type;
    }
    if (toNode) {
      toNode.bonds.push(bond.from);
      toNode.bondCount += bond.type;
    }
  });

  return graph;
}

function checkStructureCompleteness(atoms: Atom[], bonds: Bond[]): { complete: boolean; message: string } {
  if (atoms.length === 0) {
    return { complete: false, message: '请添加原子开始构建分子' };
  }

  const graph = buildGraph(atoms, bonds);

  for (const [, node] of graph) {
    const expectedValence = VALENCE[node.atom.element];
    if (node.bondCount !== expectedValence) {
      return {
        complete: false,
        message: `结构不完整，请检查连接（${node.atom.element}原子价键不匹配）`
      };
    }
  }

  const rootAtom = atoms[0];
  const visited = new Set<string>();
  const queue: string[] = [rootAtom.id];
  visited.add(rootAtom.id);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = graph.get(current);
    if (node) {
      node.bonds.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      });
    }
  }

  if (visited.size !== atoms.length) {
    return { complete: false, message: '结构不完整，存在不相连的片段' };
  }

  return { complete: true, message: '结构完整' };
}

function findLongestCarbonChain(graph: Map<string, AtomNode>, startId: string): string[] {
  let longestPath: string[] = [];

  function dfs(currentId: string, path: string[], visited: Set<string>): void {
    const current = graph.get(currentId);
    if (!current) return;

    const newPath = [...path, currentId];
    const newVisited = new Set(visited);
    newVisited.add(currentId);

    let hasUnvisitedNeighbor = false;

    current.bonds.forEach(neighborId => {
      const neighbor = graph.get(neighborId);
      if (neighbor && neighbor.atom.element === 'C' && !newVisited.has(neighborId)) {
        hasUnvisitedNeighbor = true;
        dfs(neighborId, newPath, newVisited);
      }
    });

    if (!hasUnvisitedNeighbor && newPath.length > longestPath.length) {
      longestPath = newPath;
    }
  }

  dfs(startId, [], new Set());
  return longestPath;
}

function analyzeFunctionalGroups(
  graph: Map<string, AtomNode>,
  carbonChain: string[]
): { hasDoubleBond: boolean; hasTripleBond: boolean; hasOH: boolean; hasCOOH: boolean } {
  let hasDoubleBond = false;
  let hasTripleBond = false;
  let hasOH = false;
  let hasCOOH = false;

  const bondSet = new Set<string>();

  for (const [atomId, node] of graph) {
    if (node.atom.element === 'O') {
      node.bonds.forEach(neighborId => {
        const neighbor = graph.get(neighborId);
        if (neighbor) {
          if (neighbor.atom.element === 'H') {
            hasOH = true;
          }
          const bondKey = [atomId, neighborId].sort().join('-');
          bondSet.add(bondKey);
        }
      });
    }
  }

  carbonChain.forEach((atomId, index) => {
    if (index < carbonChain.length - 1) {
      const nextId = carbonChain[index + 1];
      const current = graph.get(atomId);
      if (current && current.bonds.includes(nextId)) {
        const bondKey = [atomId, nextId].sort().join('-');
        if (bondSet.has(bondKey)) {
          hasDoubleBond = true;
        }
      }
    }
  });

  return { hasDoubleBond, hasTripleBond, hasOH, hasCOOH };
}

function generateIUPACName(atoms: Atom[], bonds: Bond[]): string {
  if (atoms.length === 0) {
    return '未命名';
  }

  const counts = countElements(atoms);

  if (atoms.length === 1) {
    const atom = atoms[0];
    const names: Record<ElementType, string> = {
      C: '碳单质',
      H: '氢原子',
      O: '氧原子',
      N: '氮原子',
      S: '硫原子'
    };
    return names[atom.element];
  }

  if (counts.C === 0) {
    if (counts.H === 2 && counts.O === 1) return '水 (Water)';
    if (counts.N === 1 && counts.H === 3) return '氨 (Ammonia)';
    if (counts.H === 2 && counts.S === 1) return '硫化氢 (Hydrogen sulfide)';
    if (counts.O === 2) return '氧气 (Oxygen)';
    if (counts.N === 2) return '氮气 (Nitrogen)';
    if (counts.H === 2) return '氢气 (Hydrogen)';
    return '简单无机物';
  }

  const graph = buildGraph(atoms, bonds);
  const carbonAtoms = atoms.filter(a => a.element === 'C');

  if (carbonAtoms.length === 0) {
    return '无机化合物';
  }

  let longestChain: string[] = [];
  carbonAtoms.forEach(carbon => {
    const chain = findLongestCarbonChain(graph, carbon.id);
    if (chain.length > longestChain.length) {
      longestChain = chain;
    }
  });

  const chainLength = longestChain.length;
  const prefix = ALKANE_PREFIXES[chainLength] || `C${chainLength}`;

  const functionalGroups = analyzeFunctionalGroups(graph, longestChain);

  let suffix = 'ane';
  let name = '';

  if (functionalGroups.hasDoubleBond) {
    suffix = 'ene';
  }
  if (functionalGroups.hasTripleBond) {
    suffix = 'yne';
  }

  if (functionalGroups.hasOH && counts.O === 1 && counts.C >= 1) {
    name = `${prefix}anol`;
  } else if (functionalGroups.hasCOOH) {
    name = `${prefix}anoic acid`;
  } else {
    name = `${prefix}${suffix}`;
  }

  if (counts.O >= 2 && counts.H >= 4) {
    if (counts.C === 6 && counts.H === 12 && counts.O === 6) {
      return '葡萄糖 (Glucose)';
    }
  }

  if (counts.C === 2 && counts.H === 6 && counts.O === 1) {
    return '乙醇 (Ethanol)';
  }
  if (counts.C === 1 && counts.H === 4 && counts.O === 1) {
    return '甲醇 (Methanol)';
  }
  if (counts.C === 2 && counts.H === 4 && counts.O === 2) {
    return '乙酸 (Acetic acid)';
  }
  if (counts.C === 3 && counts.H === 6 && counts.O === 1) {
    return '丙酮 (Acetone)';
  }
  if (counts.C === 6 && counts.H === 6) {
    return '苯 (Benzene)';
  }
  if (counts.C === 2 && counts.H === 4) {
    return '乙烯 (Ethene)';
  }
  if (counts.C === 2 && counts.H === 2) {
    return '乙炔 (Ethyne)';
  }

  const elementNames: Record<ElementType, string> = {
    C: '碳',
    H: '氢',
    O: '氧',
    N: '氮',
    S: '硫'
  };

  let chineseName = '';
  ELEMENT_ORDER.forEach(element => {
    if (counts[element] > 0) {
      chineseName += elementNames[element];
      if (counts[element] > 1) {
        chineseName += counts[element];
      }
    }
  });

  return `${name.charAt(0).toUpperCase() + name.slice(1)} (${chineseName})`;
}

export function analyzeMolecule(atoms: Atom[], bonds: Bond[]): MoleculeInfo {
  const counts = countElements(atoms);
  const formula = buildFormula(counts);
  const { complete, message } = checkStructureCompleteness(atoms, bonds);

  if (!complete) {
    return {
      formula,
      name: '结构不完整',
      isComplete: false,
      message
    };
  }

  const name = generateIUPACName(atoms, bonds);

  return {
    formula,
    name,
    isComplete: true,
    message: '结构完整'
  };
}

export function getFormula(atoms: Atom[]): string {
  const counts = countElements(atoms);
  return buildFormula(counts);
}
