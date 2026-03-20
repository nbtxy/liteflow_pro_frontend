import { NextResponse } from 'next/server';
import { deleteConversation } from '../../mockData';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  deleteConversation(id);
  
  return NextResponse.json({
    success: true,
  });
}
