declare module 'colorthief' {
  class ColorThief {
    getColor(img: HTMLImageElement | string, quality?: number): [number, number, number];
    getPalette(img: HTMLImageElement | string, colorCount?: number, quality?: number): [number, number, number][];
  }
  export default ColorThief;
}
