import QRCode from 'qrcode';

export async function generateQRCode(data: string): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 300;

  await QRCode.toCanvas(canvas, data, {
    width: 300,
    margin: 2,
    color: {
      dark: '#333333',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });

  return canvas;
}

export async function generateQRCodeDataURL(data: string): Promise<string> {
  return await QRCode.toDataURL(data, {
    width: 300,
    margin: 2,
    color: {
      dark: '#333333',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}
