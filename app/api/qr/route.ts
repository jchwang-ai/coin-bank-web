import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://coin-bank.vercel.app';
    const qrUrl = `${baseUrl}`;

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#7c3aed', // Purple
        light: '#ffffff',
      },
    });

    return NextResponse.json({
      success: true,
      qrDataUrl,
      url: qrUrl,
    });
  } catch (error) {
    console.error('QR code generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate QR code',
      },
      { status: 500 }
    );
  }
}
