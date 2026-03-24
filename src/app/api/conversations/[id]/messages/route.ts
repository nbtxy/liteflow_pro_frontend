import { NextResponse } from 'next/server';
import { mockMessages } from '../../../mockData';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const messages = mockMessages[id] || [];

  return NextResponse.json({
    code: 200,
    data: messages,
    message: 'ok',
  });
}
