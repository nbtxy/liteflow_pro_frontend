import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { refreshToken } = await request.json();
    
    if (!refreshToken) {
      return NextResponse.json({ message: 'Refresh token is required' }, { status: 400 });
    }
    
    // Mock token refresh
    return NextResponse.json({
      success: true,
      accessToken: 'mock-access-token-refreshed-' + Date.now(),
      refreshToken: 'mock-refresh-token-refreshed-' + Date.now(),
    });
  } catch {
    return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
  }
}
