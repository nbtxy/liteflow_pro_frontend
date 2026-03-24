import { NextRequest, NextResponse } from 'next/server';

// Mock file storage
const mockFiles: Record<string, Array<{
  path: string;
  name: string;
  size: number;
  type: string;
  source: string;
  createdAt: string;
}>> = {};

// GET - List files for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const files = mockFiles[id] || [];
  return NextResponse.json({ code: 200, data: files, message: 'ok' });
}

// POST - Upload a file
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { code: 400, data: null, message: 'No file provided' },
        { status: 400 }
      );
    }

    const fileRecord = {
      path: file.name,
      name: file.name,
      size: file.size,
      type: guessFileType(file.name),
      source: 'upload',
      createdAt: new Date().toISOString(),
    };

    if (!mockFiles[id]) {
      mockFiles[id] = [];
    }
    mockFiles[id].push(fileRecord);

    return NextResponse.json({ code: 200, data: fileRecord, message: 'ok' });
  } catch {
    return NextResponse.json(
      { code: 500, data: null, message: 'Upload failed' },
      { status: 500 }
    );
  }
}

function guessFileType(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['py', 'js', 'ts', 'tsx', 'jsx', 'java', 'c', 'cpp', 'go', 'rs'].includes(ext)) return 'CODE';
  if (['html', 'htm'].includes(ext)) return 'HTML';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'IMAGE';
  if (['csv', 'json', 'tsv'].includes(ext)) return 'DATA';
  if (['md', 'markdown'].includes(ext)) return 'MARKDOWN';
  return 'FILE';
}
