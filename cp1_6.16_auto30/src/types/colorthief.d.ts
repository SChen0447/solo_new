declare module 'colorthief' {
  type RGBColor = [number, number, number];

  interface ColorThiefOptions {
    colorCount?: number;
    quality?: number;
    ignoreWhite?: boolean;
    whiteThreshold?: number;
    alphaThreshold?: number;
    minSaturation?: number;
  }

  type ImageSource = HTMLImageElement | HTMLCanvasElement | ImageData | ImageBitmap;

  class ColorThief {
    getColor(sourceImage: ImageSource, quality?: number): RGBColor | null;
    getColor(sourceImage: ImageSource, options?: ColorThiefOptions): RGBColor | null;
    getPalette(sourceImage: ImageSource, colorCount?: number, quality?: number): RGBColor[] | null;
    getPalette(sourceImage: ImageSource, options?: ColorThiefOptions): RGBColor[] | null;
  }

  export default ColorThief;
}
