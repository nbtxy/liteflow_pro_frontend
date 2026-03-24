import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { type } = await request.json();
  
  console.log(`Received ${type} feedback for message ${id}`);

  return NextResponse.json({
    code: 200,
    data: null,
    message: 'ok',
  });
}
