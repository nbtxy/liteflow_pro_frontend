import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { phone, code } = await request.json();
    
    if (!phone || !code) {
      return NextResponse.json({ message: 'Phone and code are required' }, { status: 400 });
    }
    
    // Mock login verification
    if (code !== '123456' && code !== '000000') {
      // Just accept any code for now, or specifically allow 123456
      console.log(`Mock login with phone ${phone} and code ${code}`);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        accessToken: 'mock-access-token-' + Date.now(),
        refreshToken: 'mock-refresh-token-' + Date.now(),
      }
    });
  } catch {
    return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
  }
}
