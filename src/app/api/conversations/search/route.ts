import { NextResponse } from 'next/server';
import { mockConversations } from '../../mockData';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  
  let items = mockConversations;
  if (q) {
    items = items.filter(c => c.title?.toLowerCase().includes(q.toLowerCase()));
  }
  
  items = items.sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return NextResponse.json({
    code: 200,
    data: items,
    message: 'ok',
  });
}
