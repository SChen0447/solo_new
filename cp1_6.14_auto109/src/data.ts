import { GeologicalLayerData } from './types'

const layerDefinitions = [
  { name: '表土层', color: '#5C4033', lithology: '表土', era: '第四纪' },
  { name: '黏土层', color: '#8B7355', lithology: '黏土', era: '新近纪' },
  { name: '砂岩层', color: '#D2B48C', lithology: '砂岩', era: '白垩纪' },
  { name: '石灰岩层', color: '#B0C4DE', lithology: '石灰岩', era: '侏罗纪' },
  { name: '花岗岩基底层', color: '#C0C0C0', lithology: '花岗岩', era: '前寒武纪' },
]

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export function generateLayerData(): GeologicalLayerData[] {
  const rand = seededRandom(42)
  let yPosition = 0
  return layerDefinitions.map((def, index) => {
    const thickness = 1 + rand() * 2
    const layer: GeologicalLayerData = {
      id: `layer-${index}`,
      name: def.name,
      thickness: parseFloat(thickness.toFixed(2)),
      color: def.color,
      lithology: def.lithology,
      era: def.era,
      yPosition: parseFloat(yPosition.toFixed(2)),
    }
    yPosition += thickness
    return layer
  })
}
