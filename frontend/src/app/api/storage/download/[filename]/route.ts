import { NextRequest, NextResponse } from 'next/server';
import storage, { bucketName } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Filename is required' },
        { status: 400 }
      );
    }

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filename);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    // Download file
    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': metadata.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Storage download error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      },
      { status: 500 }
    );
  }
}
