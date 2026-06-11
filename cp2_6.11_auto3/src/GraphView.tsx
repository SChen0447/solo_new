import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import type { GraphNodeDatum, GraphLinkDatum, ModuleNode, DependencyType } from './utils/analyzer';
import { buildGraphData, analyzeModule, findCircularDependencies } from './utils/analyzer';

interface GraphViewProps {
  modules: ModuleNode[];
  selectedNode: string | null;
  onSelectNode: (name: string | null) => void;
  searchTerm: string;
  filterType: 'all' | DependencyType;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  depth: number;
  isExternal: boolean;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: GraphNode | string;
  target: GraphNode | string;
  type: DependencyType;
  isCircular: boolean;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeName: string;
}

const GraphView: React.FC<GraphViewProps> = ({
  modules,
  selectedNode,
  onSelectNode,
  searchTerm,
  filterType
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const gLinkRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const gNodeRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    nodeName: ''
  });

  const { nodes: graphNodes, links: graphLinks } = useMemo(() => {
    return buildGraphData(modules);
  }, [modules]);

  const maxDepth = useMemo(() => {
    let max = 0;
    for (const n of graphNodes) {
      if (n.depth > max) max = n.depth;
    }
    return Math.max(max, 1);
  }, [graphNodes]);

  const colorScale = useCallback((depth: number, isExternal: boolean) => {
    if (isExternal) {
      return '#64748b';
    }
    const t = maxDepth > 0 ? depth / maxDepth : 0;
    const r = Math.round(0 + t * (139 - 0));
    const g = Math.round(212 + t * (92 - 212));
    const b = Math.round(255 + t * (246 - 255));
    return `rgb(${r}, ${g}, ${b})`;
  }, [maxDepth]);

  const getNodeRadius = useCallback((d: GraphNode) => {
    const base = d.isExternal ? 10 : 14;
    const sizeBoost = Math.min(d.depth * 1.5, 8);
    return base + sizeBoost;
  }, []);

  const highlightInfo = useMemo(() => {
    if (!selectedNode) {
      return {
        upstreamSet: new Set<string>(),
        downstreamSet: new Set<string>(),
        directSet: new Set<string>(),
        directLinks: new Set<string>(),
        indirectLinks: new Set<string>()
      };
    }

    const analysis = analyzeModule(modules, selectedNode);
    if (!analysis) {
      return {
        upstreamSet: new Set<string>(),
        downstreamSet: new Set<string>(),
        directSet: new Set<string>(),
        directLinks: new Set<string>(),
        indirectLinks: new Set<string>()
      };
    }

    const upstreamSet = new Set(analysis.allUpstream);
    const downstreamSet = new Set(analysis.allDownstream);
    const directSet = new Set([...analysis.directUpstream, ...analysis.directDownstream]);

    const directLinks = new Set<string>();
    for (const u of analysis.directUpstream) {
      directLinks.add(`${u}->${selectedNode}`);
    }
    for (const d of analysis.directDownstream) {
      directLinks.add(`${selectedNode}->${d}`);
    }

    const indirectLinks = new Set<string>();
    const allRelevant = new Set([selectedNode, ...upstreamSet, ...downstreamSet]);

    return { upstreamSet, downstreamSet, directSet, directLinks, indirectLinks, allRelevant };
  }, [selectedNode, modules]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);

    svg.selectAll('*').remove();

    const width = container.clientWidth;
    const height = container.clientHeight;

    svg.attr('viewBox', [0, 0, width, height]);

    const defs = svg.append('defs');
    
    const glowFilter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    const gLink = g.append('g').attr('class', 'links');
    const gNode = g.append('g').attr('class', 'nodes');

    gLinkRef.current = gLink;
    gNodeRef.current = gNode;

    const nodes: GraphNode[] = graphNodes.map(n => ({
      ...n,
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: height / 2 + (Math.random() - 0.5) * 200
    }));

    const links: GraphLink[] = graphLinks.map(l => ({ ...l }));

    nodesRef.current = nodes;
    linksRef.current = links;

    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(d => {
          if ((d as GraphLink).type === 'external') return 120;
          return 80;
        })
        .strength(d => {
          if ((d as GraphLink).isCircular) return 0.3;
          return 0.5;
        })
      )
      .force('charge', d3.forceManyBody<GraphNode>()
        .strength(d => d.isExternal ? -100 : -250)
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<GraphNode>()
        .radius(d => getNodeRadius(d) + 8)
        .strength(0.8)
      )
      .velocityDecay(0.4);

    simulationRef.current = simulation;

    const link = gLink.selectAll('line')
      .data(links, (d: any) => `${d.source}->${d.target}`)
      .join('line')
      .attr('class', d => `link ${d.isCircular ? 'circular' : ''}`)
      .attr('stroke-opacity', 0.6);

    const nodeG = gNode.selectAll('g.node-group')
      .data(nodes, d => d.id)
      .join('g')
      .attr('class', 'node-group')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    nodeG.append('circle')
      .attr('class', d => `node-circle ${d.isExternal ? 'external' : ''}`)
      .attr('r', d => getNodeRadius(d))
      .attr('fill', d => colorScale(d.depth, d.isExternal))
      .style('filter', d => d.isExternal ? 'none' : 'url(#glow)');

    nodeG.append('text')
      .attr('class', 'node-label')
      .attr('dy', d => getNodeRadius(d) + 14)
      .text(d => d.name.length > 18 ? d.name.slice(0, 16) + '...' : d.name);

    nodeG
      .on('click', (event, d) => {
        event.stopPropagation();
        if (selectedNode === d.name) {
          onSelectNode(null);
        } else {
          onSelectNode(d.name);
        }
      })
      .on('contextmenu', (event, d) => {
        event.preventDefault();
        event.stopPropagation();
        setContextMenu({
          visible: true,
          x: event.clientX,
          y: event.clientY,
          nodeName: d.name
        });
      })
      .on('mouseenter', function(event, d) {
        d3.select(this).select('circle')
          .transition()
          .duration(200)
          .attr('r', getNodeRadius(d) * 1.3);
      })
      .on('mouseleave', function(event, d) {
        d3.select(this).select('circle')
          .transition()
          .duration(200)
          .attr('r', getNodeRadius(d));
      });

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);

      nodeG.attr('transform', d => `translate(${d.x}, ${d.y})`);
    });

    svg.on('click', () => {
      onSelectNode(null);
    });

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      svg.attr('viewBox', [0, 0, w, h]);
      simulation.force('center', d3.forceCenter(w / 2, h / 2));
      simulation.alpha(0.3).restart();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      simulation.stop();
      resizeObserver.disconnect();
    };
  }, [graphNodes, graphLinks, colorScale, getNodeRadius, onSelectNode]);

  useEffect(() => {
    if (!gNodeRef.current || !gLinkRef.current || nodesRef.current.length === 0) return;

    const searchLower = searchTerm.toLowerCase();
    const hasSearch = searchTerm.trim().length > 0;

    const gNode = gNodeRef.current;
    const gLink = gLinkRef.current;

    const isLinkVisible = (d: GraphLink) => {
      if (filterType === 'all') return true;
      return d.type === filterType;
    };

    const isNodeVisible = (d: GraphNode) => {
      if (filterType === 'all') return true;
      if (d.isExternal && filterType === 'external') return true;
      if (!d.isExternal && filterType === 'internal') return true;
      const hasLinkOfType = linksRef.current.some(l => {
        const src = typeof l.source === 'string' ? l.source : l.source.name;
        const tgt = typeof l.target === 'string' ? l.target : l.target.name;
        return (src === d.name || tgt === d.name) && l.type === filterType;
      });
      return hasLinkOfType;
    };

    const isSearchMatch = (name: string) => {
      if (!hasSearch) return true;
      return name.toLowerCase().includes(searchLower);
    };

    gNode.selectAll('g.node-group')
      .transition()
      .duration(400)
      .style('opacity', (d: any) => {
        if (!isNodeVisible(d)) return 0.08;
        if (!hasSearch) return 1;
        return isSearchMatch(d.name) ? 1 : 0.2;
      });

    gNode.selectAll<SVGCircleElement, GraphNode>('circle.node-circle')
      .transition()
      .duration(400)
      .attr('r', d => {
        const baseR = getNodeRadius(d);
        if (hasSearch && isSearchMatch(d.name)) {
          return baseR * 1.4;
        }
        return baseR;
      });

    gLink.selectAll<SVGLineElement, GraphLink>('line.link')
      .classed('direct', false)
      .classed('indirect', false)
      .transition()
      .duration(400)
      .style('opacity', d => {
        if (!isLinkVisible(d)) return 0.05;
        if (!selectedNode) return 0.6;

        const srcName = typeof d.source === 'object' ? (d.source as GraphNode).name : d.source;
        const tgtName = typeof d.target === 'object' ? (d.target as GraphNode).name : d.target;
        const linkKey = `${srcName}->${tgtName}`;

        const info = highlightInfo as any;
        if (d.isCircular) return 1;
        if (info.directLinks?.has(linkKey)) return 1;
        if (info.allRelevant?.has(srcName) && info.allRelevant?.has(tgtName)) return 0.5;
        return 0.1;
      });

    if (selectedNode) {
      const info = highlightInfo as any;

      gLink.selectAll<SVGLineElement, GraphLink>('line.link')
        .filter(d => {
          const srcName = typeof d.source === 'object' ? (d.source as GraphNode).name : d.source;
          const tgtName = typeof d.target === 'object' ? (d.target as GraphNode).name : d.target;
          const linkKey = `${srcName}->${tgtName}`;
          return info.directLinks?.has(linkKey) && !d.isCircular;
        })
        .classed('direct', true);

      gLink.selectAll<SVGLineElement, GraphLink>('line.link')
        .filter(d => {
          const srcName = typeof d.source === 'object' ? (d.source as GraphNode).name : d.source;
          const tgtName = typeof d.target === 'object' ? (d.target as GraphNode).name : d.target;
          const linkKey = `${srcName}->${tgtName}`;
          return !info.directLinks?.has(linkKey) && 
                 info.allRelevant?.has(srcName) && 
                 info.allRelevant?.has(tgtName) && 
                 !d.isCircular;
        })
        .classed('indirect', true);
    }

    gNode.selectAll<SVGGElement, GraphNode>('g.node-group')
      .select('circle.node-circle')
      .classed('selected', (d: any) => d.name === selectedNode);

  }, [selectedNode, searchTerm, filterType, highlightInfo, getNodeRadius]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.visible]);

  const handleCopyName = useCallback(() => {
    navigator.clipboard.writeText(contextMenu.nodeName).catch(() => {});
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, [contextMenu.nodeName]);

  const handleViewDetails = useCallback(() => {
    onSelectNode(contextMenu.nodeName);
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, [contextMenu.nodeName, onSelectNode]);

  return (
    <div ref={containerRef} className="graph-view-container">
      <svg ref={svgRef} className="graph-canvas" />
      
      <div className="legend">
        <div className="legend-item">
          <span className="legend-dot internal"></span>
          <span>内部模块</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot external"></span>
          <span>外部库</span>
        </div>
        <div className="legend-item">
          <span className="legend-line direct"></span>
          <span>直接引用</span>
        </div>
        <div className="legend-item">
          <span className="legend-line indirect"></span>
          <span>间接引用</span>
        </div>
        <div className="legend-item">
          <span className="legend-line circular"></span>
          <span>循环引用</span>
        </div>
      </div>

      <div
        className={`context-menu ${contextMenu.visible ? 'visible' : ''}`}
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="context-menu-item" onClick={handleViewDetails}>
          <span>🔍</span>
          <span>查看依赖详情</span>
        </div>
        <div className="context-menu-divider"></div>
        <div className="context-menu-item" onClick={handleCopyName}>
          <span>📋</span>
          <span>复制模块名</span>
        </div>
      </div>
    </div>
  );
};

export default GraphView;
