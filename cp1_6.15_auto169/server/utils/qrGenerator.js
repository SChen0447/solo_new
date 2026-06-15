const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const qrDir = path.join(__dirname, '..', 'public', 'qrcodes');
if (!fs.existsSync(qrDir)) {
  fs.mkdirSync(qrDir, { recursive: true });
}

const generateQRCode = async (toolId) => {
  try {
    const qrData = JSON.stringify({ toolId });
    const fileName = `${toolId}.png`;
    const filePath = path.join(qrDir, fileName);
    
    await QRCode.toFile(filePath, qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    
    return `/qrcodes/${fileName}`;
  } catch (error) {
    console.error('QR码生成失败:', error);
    throw error;
  }
};

module.exports = { generateQRCode };
