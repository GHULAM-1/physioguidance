import { NextRequest, NextResponse } from 'next/server';
import storage, { bucketName } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const bucket = storage.bucket(bucketName);
    const blob = bucket.file(file.name);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload file
    await blob.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error('Storage upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}
