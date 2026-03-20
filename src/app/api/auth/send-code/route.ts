import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ message: 'Phone is required' }, { status: 400 });
    }
    
    // Mock sending code
    console.log(`Sending mock code to ${phone}`);
    
    return NextResponse.json({ success: true, message: 'Code sent successfully' });
  } catch {
    return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
  }
}
