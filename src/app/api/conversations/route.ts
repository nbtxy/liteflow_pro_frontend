import { NextResponse } from 'next/server';
import { mockConversations } from '../mockData';

export async function GET() {
  // Sort by updatedAt descending
  const sorted = [...mockConversations].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return NextResponse.json({
    code: 200,
    data: sorted,
    message: 'ok',
  });
}
