import { Grid } from '@react-three/drei'

export function GridFloor() {
  return (
    <Grid
      position={[0, -3, 0]}
      args={[20, 20]}
      cellSize={1}
      cellThickness={0.5}
      cellColor="rgba(255,255,255,0.05)"
      sectionSize={5}
      sectionThickness={1}
      sectionColor="rgba(255,255,255,0.08)"
      fadeDistance={30}
      fadeStrength={1}
      followCamera={false}
      infiniteGrid
    />
  )
}
