import { NextResponse } from 'next/server';
import { mockConversations } from '../mockData';

export async function GET() {
  // Sort by updatedAt descending
  const sorted = [...mockConversations].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return NextResponse.json({
    success: true,
    data: {
      items: sorted,
    }
  });
}
