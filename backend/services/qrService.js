// services/qrService.js
const QRCode = require('qrcode');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

async function generateDocumentQR(docId) {
  const url = `${CLIENT_URL}/verify/${docId}`;

  const dataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    type:    'image/png',
    width:   512,
    margin:  2,
    color:   { dark: '#0f172a', light: '#ffffff' },
  });

  return { dataUrl, url };
}

module.exports = { generateDocumentQR };
