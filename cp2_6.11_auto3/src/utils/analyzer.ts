export type DependencyType = 'internal' | 'external';

export interface ModuleDependency {
  name: string;
  type: DependencyType;
}

export interface ModuleNode {
  name: string;
  dependencies: ModuleDependency[];
}

export interface ProjectDependencyData {
  modules: ModuleNode[];
}

export interface GraphNodeDatum {
  id: string;
  name: string;
  depth: number;
  isExternal: boolean;
}

export interface GraphLinkDatum {
  source: string;
  target: string;
  type: DependencyType;
  isCircular: boolean;
}

export interface ModuleAnalysis {
  name: string;
  directUpstream: string[];
  directDownstream: string[];
  allUpstream: string[];
  allDownstream: string[];
  depth: number;
  impactScore: number;
  circularPaths: string[][];
}

export interface AnalysisReport {
  totalModules: number;
  maxDependencyDepth: number;
  circularDependencyCount: number;
  circularPaths: string[][];
  keyModules: { name: string; impactScore: number; depth: number }[];
}

function buildAdjacencyList(modules: ModuleNode[]): {
  forward: Map<string, { name: string; type: DependencyType }[]>;
  backward: Map<string, { name: string; type: DependencyType }[]>;
  moduleMap: Map<string, ModuleNode>;
} {
  const forward = new Map<string, { name: string; type: DependencyType }[]>();
  const backward = new Map<string, { name: string; type: DependencyType }[]>();
  const moduleMap = new Map<string, ModuleNode>();

  for (const mod of modules) {
    moduleMap.set(mod.name, mod);
    if (!forward.has(mod.name)) forward.set(mod.name, []);
    if (!backward.has(mod.name)) backward.set(mod.name, []);

    for (const dep of mod.dependencies) {
      forward.get(mod.name)!.push({ name: dep.name, type: dep.type });
      if (!backward.has(dep.name)) backward.set(dep.name, []);
      backward.get(dep.name)!.push({ name: mod.name, type: dep.type });
      if (!forward.has(dep.name)) forward.set(dep.name, []);
      if (!moduleMap.has(dep.name)) {
        moduleMap.set(dep.name, { name: dep.name, dependencies: [] });
      }
    }
  }

  return { forward, backward, moduleMap };
}

export function computeDepths(modules: ModuleNode[]): Map<string, number> {
  const { forward, moduleMap } = buildAdjacencyList(modules);
  const depths = new Map<string, number>();
  const inDegree = new Map<string, number>();

  for (const name of moduleMap.keys()) {
    inDegree.set(name, 0);
    depths.set(name, 0);
  }

  for (const [, deps] of forward) {
    for (const dep of deps) {
      if (dep.type === 'internal') {
        inDegree.set(dep.name, (inDegree.get(dep.name) || 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const [name, deg] of inDegree) {
    if (deg === 0) queue.push(name);
  }

  const processed = new Set<string>();
  while (queue.length > 0) {
    const name = queue.shift()!;
    if (processed.has(name)) continue;
    processed.add(name);

    const deps = forward.get(name) || [];
    for (const dep of deps) {
      if (dep.type !== 'internal') continue;
      const newDepth = (depths.get(name) || 0) + 1;
      if (newDepth > (depths.get(dep.name) || 0)) {
        depths.set(dep.name, newDepth);
      }
      const deg = (inDegree.get(dep.name) || 0) - 1;
      inDegree.set(dep.name, deg);
      if (deg <= 0) queue.push(dep.name);
    }
  }

  for (const name of moduleMap.keys()) {
    const mod = moduleMap.get(name);
    if (mod && mod.dependencies.length === 0) {
      const hasIncoming = (backward_quick(modules, name).length > 0);
      if (!hasIncoming && depths.get(name) === 0) {
        depths.set(name, 0);
      }
    }
  }

  return depths;
}

function backward_quick(modules: ModuleNode[], target: string): string[] {
  const result: string[] = [];
  for (const mod of modules) {
    if (mod.dependencies.some(d => d.name === target)) {
      result.push(mod.name);
    }
  }
  return result;
}

export function findCircularDependencies(modules: ModuleNode[]): string[][] {
  const { forward, moduleMap } = buildAdjacencyList(modules);
  const allNames = Array.from(moduleMap.keys());

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;

  const color = new Map<string, number>();
  for (const name of allNames) color.set(name, WHITE);

  const paths: string[][] = [];
  const pathStack: string[] = [];

  function dfs(node: string) {
    color.set(node, GRAY);
    pathStack.push(node);

    const deps = forward.get(node) || [];
    for (const dep of deps) {
      if (dep.type !== 'internal') continue;
      const c = color.get(dep.name);
      if (c === WHITE) {
        dfs(dep.name);
      } else if (c === GRAY) {
        const cycleStartIdx = pathStack.indexOf(dep.name);
        if (cycleStartIdx !== -1) {
          const cycle = pathStack.slice(cycleStartIdx);
          cycle.push(dep.name);
          const normalized = normalizeCycle(cycle);
          if (!paths.some(p => cyclesEqual(p, normalized))) {
            paths.push(normalized);
          }
        }
      }
    }

    pathStack.pop();
    color.set(node, BLACK);
  }

  for (const name of allNames) {
    if (color.get(name) === WHITE) {
      dfs(name);
    }
  }

  return paths;
}

function normalizeCycle(cycle: string[]): string[] {
  const c = [...cycle];
  if (c[0] === c[c.length - 1] && c.length > 1) c.pop();
  let minIdx = 0;
  for (let i = 1; i < c.length; i++) {
    if (c[i] < c[minIdx]) minIdx = i;
  }
  const rotated = [...c.slice(minIdx), ...c.slice(0, minIdx)];
  return rotated;
}

function cyclesEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  if (a.length === 0) return true;
  for (let start = 0; start < b.length; start++) {
    let match = true;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[(start + i) % b.length]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

export function buildGraphData(modules: ModuleNode[]): {
  nodes: GraphNodeDatum[];
  links: GraphLinkDatum[];
  depths: Map<string, number>;
  circularPaths: string[][];
} {
  const { forward, moduleMap } = buildAdjacencyList(modules);
  const depths = computeDepths(modules);
  const circularPaths = findCircularDependencies(modules);

  const circularEdgeSet = new Set<string>();
  for (const path of circularPaths) {
    for (let i = 0; i < path.length; i++) {
      const from = path[i];
      const to = path[(i + 1) % path.length];
      circularEdgeSet.add(`${from}->${to}`);
    }
  }

  const nodes: GraphNodeDatum[] = [];
  const links: GraphLinkDatum[] = [];

  for (const name of moduleMap.keys()) {
    const mod = moduleMap.get(name)!;
    const isExternal = !modules.some(m => m.name === name) || 
      (mod.dependencies.length === 0 && !forward.has(name) && !backward_quick(modules, name).length);
    
    let actualIsExternal = true;
    if (modules.some(m => m.name === name)) {
      actualIsExternal = false;
    }

    nodes.push({
      id: name,
      name,
      depth: depths.get(name) || 0,
      isExternal: actualIsExternal
    });
  }

  const linkSet = new Set<string>();
  for (const mod of modules) {
    for (const dep of mod.dependencies) {
      const key = `${mod.name}->${dep.name}`;
      if (linkSet.has(key)) continue;
      linkSet.add(key);
      links.push({
        source: mod.name,
        target: dep.name,
        type: dep.type,
        isCircular: circularEdgeSet.has(key)
      });
    }
  }

  return { nodes, links, depths, circularPaths };
}

export function analyzeModule(
  modules: ModuleNode[],
  targetName: string
): ModuleAnalysis | null {
  const { forward, backward, moduleMap } = buildAdjacencyList(modules);
  if (!moduleMap.has(targetName)) return null;

  const directDownstream = (forward.get(targetName) || []).map(d => d.name);
  const directUpstream = (backward.get(targetName) || []).map(d => d.name);

  function bfs(start: string, adj: Map<string, { name: string; type: DependencyType }[]>): string[] {
    const visited = new Set<string>();
    const queue: string[] = [start];
    visited.add(start);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const neighbors = adj.get(cur) || [];
      for (const n of neighbors) {
        if (!visited.has(n.name)) {
          visited.add(n.name);
          queue.push(n.name);
        }
      }
    }
    visited.delete(start);
    return Array.from(visited);
  }

  const allDownstream = bfs(targetName, forward);
  const allUpstream = bfs(targetName, backward);

  const depths = computeDepths(modules);
  const depth = depths.get(targetName) || 0;

  const circularPaths = findCircularDependencies(modules);
  const relevantCircular = circularPaths.filter(p => p.includes(targetName));

  const impactScore = allDownstream.length + allUpstream.length * 0.5;

  return {
    name: targetName,
    directUpstream,
    directDownstream,
    allUpstream,
    allDownstream,
    depth,
    impactScore,
    circularPaths: relevantCircular
  };
}

export function generateAnalysisReport(modules: ModuleNode[]): AnalysisReport {
  const { moduleMap } = buildAdjacencyList(modules);
  const depths = computeDepths(modules);
  const circularPaths = findCircularDependencies(modules);

  const totalModules = moduleMap.size;
  let maxDepth = 0;
  for (const d of depths.values()) {
    if (d > maxDepth) maxDepth = d;
  }

  const keyModules: { name: string; impactScore: number; depth: number }[] = [];
  for (const name of moduleMap.keys()) {
    const analysis = analyzeModule(modules, name);
    if (analysis) {
      keyModules.push({
        name,
        impactScore: analysis.impactScore,
        depth: analysis.depth
      });
    }
  }
  keyModules.sort((a, b) => b.impactScore - a.impactScore);

  return {
    totalModules,
    maxDependencyDepth: maxDepth,
    circularDependencyCount: circularPaths.length,
    circularPaths,
    keyModules: keyModules.slice(0, 5)
  };
}

export function reportToText(report: AnalysisReport): string {
  const lines: string[] = [];
  lines.push('=== 代码依赖分析报告 ===');
  lines.push('');
  lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
  lines.push('');
  lines.push('--- 基本统计 ---');
  lines.push(`模块总数: ${report.totalModules}`);
  lines.push(`最大依赖深度: ${report.maxDependencyDepth}`);
  lines.push(`循环依赖数量: ${report.circularDependencyCount}`);
  lines.push('');
  lines.push('--- 关键模块 Top 5 (按影响分数排序) ---');
  for (let i = 0; i < report.keyModules.length; i++) {
    const m = report.keyModules[i];
    lines.push(`${i + 1}. ${m.name}`);
    lines.push(`   影响分数: ${m.impactScore.toFixed(1)}`);
    lines.push(`   依赖深度: ${m.depth}`);
  }
  lines.push('');
  if (report.circularPaths.length > 0) {
    lines.push('--- 循环依赖路径 ---');
    for (let i = 0; i < report.circularPaths.length; i++) {
      const path = report.circularPaths[i];
      lines.push(`循环 ${i + 1}: ${path.join(' → ')} → ${path[0]}`);
    }
    lines.push('');
  }
  lines.push('==========================');
  return lines.join('\n');
}

export function downloadReport(text: string, filename: string = 'dependency-analysis-report.txt') {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const sampleDependencyData: ProjectDependencyData = {
  modules: [
    {
      name: 'app',
      dependencies: [
        { name: 'router', type: 'internal' },
        { name: 'store', type: 'internal' },
        { name: 'components/AppHeader', type: 'internal' },
        { name: 'react', type: 'external' },
        { name: 'react-dom', type: 'external' }
      ]
    },
    {
      name: 'router',
      dependencies: [
        { name: 'pages/Home', type: 'internal' },
        { name: 'pages/About', type: 'internal' },
        { name: 'pages/Dashboard', type: 'internal' },
        { name: 'react-router-dom', type: 'external' }
      ]
    },
    {
      name: 'store',
      dependencies: [
        { name: 'slices/userSlice', type: 'internal' },
        { name: 'slices/dataSlice', type: 'internal' },
        { name: 'utils/api', type: 'internal' },
        { name: '@reduxjs/toolkit', type: 'external' }
      ]
    },
    {
      name: 'components/AppHeader',
      dependencies: [
        { name: 'components/NavMenu', type: 'internal' },
        { name: 'components/Logo', type: 'internal' },
        { name: 'hooks/useAuth', type: 'internal' },
        { name: 'react', type: 'external' }
      ]
    },
    {
      name: 'components/NavMenu',
      dependencies: [
        { name: 'components/Logo', type: 'internal' },
        { name: 'utils/helpers', type: 'internal' }
      ]
    },
    {
      name: 'components/Logo',
      dependencies: [
        { name: 'utils/constants', type: 'internal' }
      ]
    },
    {
      name: 'pages/Home',
      dependencies: [
        { name: 'components/FeatureList', type: 'internal' },
        { name: 'components/HeroBanner', type: 'internal' },
        { name: 'hooks/useHomeData', type: 'internal' }
      ]
    },
    {
      name: 'pages/About',
      dependencies: [
        { name: 'components/TeamList', type: 'internal' }
      ]
    },
    {
      name: 'pages/Dashboard',
      dependencies: [
        { name: 'components/Chart', type: 'internal' },
        { name: 'components/StatsCard', type: 'internal' },
        { name: 'hooks/useDashboard', type: 'internal' },
        { name: 'store', type: 'internal' }
      ]
    },
    {
      name: 'slices/userSlice',
      dependencies: [
        { name: 'utils/api', type: 'internal' },
        { name: 'utils/auth', type: 'internal' }
      ]
    },
    {
      name: 'slices/dataSlice',
      dependencies: [
        { name: 'utils/api', type: 'internal' },
        { name: 'utils/transformers', type: 'internal' }
      ]
    },
    {
      name: 'hooks/useAuth',
      dependencies: [
        { name: 'utils/auth', type: 'internal' },
        { name: 'store', type: 'internal' }
      ]
    },
    {
      name: 'hooks/useHomeData',
      dependencies: [
        { name: 'utils/api', type: 'internal' }
      ]
    },
    {
      name: 'hooks/useDashboard',
      dependencies: [
        { name: 'utils/api', type: 'internal' },
        { name: 'utils/chartUtils', type: 'internal' }
      ]
    },
    {
      name: 'utils/api',
      dependencies: [
        { name: 'utils/request', type: 'internal' },
        { name: 'utils/constants', type: 'internal' },
        { name: 'axios', type: 'external' }
      ]
    },
    {
      name: 'utils/auth',
      dependencies: [
        { name: 'utils/constants', type: 'internal' },
        { name: 'utils/api', type: 'internal' }
      ]
    },
    {
      name: 'utils/request',
      dependencies: [
        { name: 'utils/constants', type: 'internal' }
      ]
    },
    {
      name: 'utils/transformers',
      dependencies: [
        { name: 'utils/helpers', type: 'internal' }
      ]
    },
    {
      name: 'utils/chartUtils',
      dependencies: [
        { name: 'utils/helpers', type: 'internal' },
        { name: 'd3', type: 'external' }
      ]
    },
    {
      name: 'components/FeatureList',
      dependencies: [
        { name: 'components/FeatureItem', type: 'internal' }
      ]
    },
    {
      name: 'components/HeroBanner',
      dependencies: [
        { name: 'utils/constants', type: 'internal' }
      ]
    },
    {
      name: 'components/TeamList',
      dependencies: [
        { name: 'components/TeamMember', type: 'internal' }
      ]
    },
    {
      name: 'components/Chart',
      dependencies: [
        { name: 'utils/chartUtils', type: 'internal' }
      ]
    },
    {
      name: 'components/StatsCard',
      dependencies: [
        { name: 'utils/helpers', type: 'internal' }
      ]
    },
    {
      name: 'components/FeatureItem',
      dependencies: [],
    },
    {
      name: 'components/TeamMember',
      dependencies: [],
    },
    {
      name: 'utils/constants',
      dependencies: [],
    },
    {
      name: 'utils/helpers',
      dependencies: [],
    }
  ]
};
