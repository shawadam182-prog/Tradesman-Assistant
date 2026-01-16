import QRCode from 'qrcode';
import { APP_CONFIG } from './constants';

/**
 * Generate a QR code as a data URL (for displaying in an <img> tag)
 */
export async function generateQRCode(referralCode: string): Promise<string> {
  const url = `${APP_CONFIG.BASE_URL}/r/${referralCode}`;

  try {
    const dataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
    return dataUrl;
  } catch (err) {
    console.error('QR generation failed:', err);
    throw err;
  }
}

/**
 * Generate and download a QR code as a PNG file
 */
export async function downloadQRCode(referralCode: string, wholesalerName: string): Promise<void> {
  const url = `${APP_CONFIG.BASE_URL}/r/${referralCode}`;

  const canvas = document.createElement('canvas');
  await QRCode.toCanvas(canvas, url, {
    width: 400,
    margin: 2,
    errorCorrectionLevel: 'M'
  });

  const link = document.createElement('a');
  const safeName = wholesalerName
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase();

  link.download = `tradesync-qr-${safeName}-${referralCode}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * Get the referral URL for a wholesaler
 */
export function getReferralUrl(referralCode: string): string {
  return `${APP_CONFIG.BASE_URL}/r/${referralCode}`;
}
