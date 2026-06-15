import dagre from 'dagre'
import type { Node, Edge, LayoutDirection, LayoutResult } from '../editor/stores/graphStore'

export interface Point {
  x: number
  y: number
}

export function autoLayout(
  nodes: Node[],
  edges: Edge[],
  direction: LayoutDirection = 'LR'
): LayoutResult {
  const g = new dagre.graphlib.Graph()

  g.setGraph({
    rankdir: direction,
    ranker: 'network-simplex',
    nodesep: 50,
    ranksep: 80,
    marginx: 50,
    marginy: 50
  })

  g.setDefaultEdgeLabel(() => ({}))

  nodes.forEach((node) => {
    g.setNode(node.id, {
      width: node.width,
      height: node.height
    })
  })

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target, { id: edge.id })
  })

  dagre.layout(g)

  const layoutNodes: { id: string; x: number; y: number }[] = []
  const layoutEdges: { id: string; points: Point[] }[] = []

  g.nodes().forEach((id) => {
    const node = g.node(id)
    if (node) {
      layoutNodes.push({
        id,
        x: node.x,
        y: node.y
      })
    }
  })

  g.edges().forEach((e) => {
    const edge = g.edge(e)
    const originalEdge = edges.find((ed) => ed.source === e.v && ed.target === e.w)
    if (edge && originalEdge && edge.points) {
      const points = edge.points.map((p: { x: number; y: number }) => ({
        x: p.x,
        y: p.y
      }))
      layoutEdges.push({
        id: originalEdge.id,
        points
      })
    }
  })

  return {
    nodes: layoutNodes,
    edges: layoutEdges
  }
}

export function generateBezierPath(
  source: Point,
  target: Point,
  direction: LayoutDirection = 'LR',
  nodes: Node[] = []
): { path: string; points: Point[] } {
  const dx = target.x - source.x
  const dy = target.y - source.y

  let cp1x: number, cp1y: number, cp2x: number, cp2y: number

  if (direction === 'LR') {
    const offset = Math.max(Math.abs(dx) * 0.5, 40)
    cp1x = source.x + offset
    cp1y = source.y
    cp2x = target.x - offset
    cp2y = target.y
  } else {
    const offset = Math.max(Math.abs(dy) * 0.5, 40)
    cp1x = source.x
    cp1y = source.y + offset
    cp2x = target.x
    cp2y = target.y - offset
  }

  const controlPoints = [
    { x: cp1x, y: cp1y },
    { x: cp2x, y: cp2y }
  ]

  controlPoints.forEach((cp) => {
    for (const node of nodes) {
      const nodeCenterX = node.x + node.width / 2
      const nodeCenterY = node.y + node.height / 2
      const distToNode = Math.sqrt(
        Math.pow(cp.x - nodeCenterX, 2) + Math.pow(cp.y - nodeCenterY, 2)
      )
      const minDist = Math.max(node.width, node.height) * 0.6

      if (distToNode < minDist) {
        const angle = Math.atan2(cp.y - nodeCenterY, cp.x - nodeCenterX)
        cp.x = nodeCenterX + Math.cos(angle) * minDist
        cp.y = nodeCenterY + Math.sin(angle) * minDist
      }
    }
  })

  const points: Point[] = [
    source,
    { x: controlPoints[0].x, y: controlPoints[0].y },
    { x: controlPoints[1].x, y: controlPoints[1].y },
    target
  ]

  const path = `M ${source.x} ${source.y} C ${controlPoints[0].x} ${controlPoints[0].y}, ${controlPoints[1].x} ${controlPoints[1].y}, ${target.x} ${target.y}`

  return { path, points }
}

export function detectEdgeIntersections(
  edges: Array<{ id: string; points: Point[] }>
): Map<string, Array<{ point: Point; count: number }>> {
  const intersections = new Map<string, Array<{ point: Point; count: number }>>()

  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const edge1 = edges[i]
      const edge2 = edges[j]

      if (
        edge1.points.length < 4 ||
        edge2.points.length < 4
      ) {
        continue
      }

      const intersection = findBezierIntersection(edge1.points, edge2.points)
      if (intersection) {
        if (!intersections.has(edge1.id)) {
          intersections.set(edge1.id, [])
        }
        if (!intersections.has(edge2.id)) {
          intersections.set(edge2.id, [])
        }

        const existing1 = intersections.get(edge1.id)!
        const existing2 = intersections.get(edge2.id)!

        let count1 = 1
        let count2 = 1

        for (const ex of existing1) {
          const dist = Math.sqrt(
            Math.pow(ex.point.x - intersection.x, 2) +
              Math.pow(ex.point.y - intersection.y, 2)
          )
          if (dist < 10) {
            count1 = ex.count + 1
            break
          }
        }

        for (const ex of existing2) {
          const dist = Math.sqrt(
            Math.pow(ex.point.x - intersection.x, 2) +
              Math.pow(ex.point.y - intersection.y, 2)
          )
          if (dist < 10) {
            count2 = ex.count + 1
            break
          }
        }

        existing1.push({ point: intersection, count: count1 })
        existing2.push({ point: intersection, count: count2 })
      }
    }
  }

  return intersections
}

function findBezierIntersection(
  points1: Point[],
  points2: Point[]
): Point | null {
  const steps = 20
  const tolerance = 3

  for (let i = 0; i <= steps; i++) {
    const t1 = i / steps
    const p1 = getPointOnBezier(points1, t1)

    for (let j = 0; j <= steps; j++) {
      const t2 = j / steps
      const p2 = getPointOnBezier(points2, t2)

      const dist = Math.sqrt(
        Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)
      )

      if (dist < tolerance) {
        return {
          x: (p1.x + p2.x) / 2,
          y: (p1.y + p2.y) / 2
        }
      }
    }
  }

  return null
}

function getPointOnBezier(points: Point[], t: number): Point {
  const mt = 1 - t

  if (points.length === 4) {
    const x =
      mt * mt * mt * points[0].x +
      3 * mt * mt * t * points[1].x +
      3 * mt * t * t * points[2].x +
      t * t * t * points[3].x

    const y =
      mt * mt * mt * points[0].y +
      3 * mt * mt * t * points[1].y +
      3 * mt * t * t * points[2].y +
      t * t * t * points[3].y

    return { x, y }
  }

  return points[0]
}

export function getNodeAnchors(node: Node): Array<{
  position: 'top' | 'right' | 'bottom' | 'left'
  x: number
  y: number
}> {
  const centerX = node.x + node.width / 2
  const centerY = node.y + node.height / 2

  return [
    {
      position: 'top',
      x: centerX,
      y: node.y
    },
    {
      position: 'right',
      x: node.x + node.width,
      y: centerY
    },
    {
      position: 'bottom',
      x: centerX,
      y: node.y + node.height
    },
    {
      position: 'left',
      x: node.x,
      y: centerY
    }
  ]
}

export function findNearestAnchor(
  node: Node,
  targetPoint: Point,
  direction: LayoutDirection
): { position: 'top' | 'right' | 'bottom' | 'left'; x: number; y: number } {
  const anchors = getNodeAnchors(node)
  let nearest = anchors[0]
  let minDist = Infinity

  anchors.forEach((anchor) => {
    const dist = Math.sqrt(
      Math.pow(anchor.x - targetPoint.x, 2) +
        Math.pow(anchor.y - targetPoint.y, 2)
    )

    let priority = 1
    if (direction === 'LR') {
      if (anchor.position === 'right') priority = 0.3
      if (anchor.position === 'left') priority = 0.6
    } else {
      if (anchor.position === 'bottom') priority = 0.3
      if (anchor.position === 'top') priority = 0.6
    }

    const adjustedDist = dist * priority

    if (adjustedDist < minDist) {
      minDist = adjustedDist
      nearest = anchor
    }
  })

  return nearest
}
