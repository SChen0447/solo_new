import ColorThief from 'colorthief';

const colorThief = new ColorThief();

const colorNames: { name: string; range: { h: [number, number]; s: [number, number]; l: [number, number] } }[] = [
  { name: '红色', range: { h: [0, 15], s: [50, 100], l: [30, 70] } },
  { name: '橙色', range: { h: [15, 45], s: [50, 100], l: [30, 70] } },
  { name: '黄色', range: { h: [45, 75], s: [50, 100], l: [30, 70] } },
  { name: '绿色', range: { h: [75, 165], s: [30, 100], l: [20, 70] } },
  { name: '青色', range: { h: [165, 195], s: [30, 100], l: [30, 70] } },
  { name: '蓝色', range: { h: [195, 255], s: [30, 100], l: [20, 70] } },
  { name: '紫色', range: { h: [255, 285], s: [30, 100], l: [20, 70] } },
  { name: '品红', range: { h: [285, 345], s: [30, 100], l: [30, 70] } },
  { name: '粉红', range: { h: [345, 360], s: [30, 100], l: [50, 85] } },
  { name: '白色', range: { h: [0, 360], s: [0, 20], l: [85, 100] } },
  { name: '灰色', range: { h: [0, 360], s: [0, 20], l: [30, 85] } },
  { name: '黑色', range: { h: [0, 360], s: [0, 30], l: [0, 30] } },
  { name: '棕色', range: { h: [15, 45], s: [30, 80], l: [15, 40] } }
];

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: h * 360,
    s: s * 100,
    l: l * 100
  };
}

function getColorName(hsl: { h: number; s: number; l: number }): string {
  for (const color of colorNames) {
    const { h, s, l } = color.range;
    const hMatch = hsl.h >= h[0] && hsl.h < h[1];
    const sMatch = hsl.s >= s[0] && hsl.s <= s[1];
    const lMatch = hsl.l >= l[0] && hsl.l <= l[1];
    if (hMatch && sMatch && lMatch) {
      return color.name;
    }
  }
  return '未知';
}

function rgbToHslString(r: number, g: number, b: number): string {
  const hsl = rgbToHsl(r, g, b);
  return `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
}

export async function extractDominantColor(
  imageSource: HTMLImageElement | string
): Promise<{ color: string; colorName: string }> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof imageSource === 'string') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const [r, g, b] = colorThief.getColor(img, 5);
            const hsl = rgbToHsl(r, g, b);
            resolve({
              color: rgbToHslString(r, g, b),
              colorName: getColorName(hsl)
            });
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = reject;
        img.src = imageSource;
      } else {
        const [r, g, b] = colorThief.getColor(imageSource, 5);
        const hsl = rgbToHsl(r, g, b);
        resolve({
          color: rgbToHslString(r, g, b),
          colorName: getColorName(hsl)
        });
      }
    } catch (err) {
      reject(err);
    }
  });
}
