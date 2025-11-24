import { NextResponse } from 'next/server';
import storage, { bucketName } from '@/lib/storage';

export async function GET() {
  try {
    const bucket = storage.bucket(bucketName);
    const [files] = await bucket.getFiles();

    const fileList = files.map((file) => ({
      name: file.name,
      size: file.metadata.size,
      contentType: file.metadata.contentType,
      created: file.metadata.timeCreated,
      updated: file.metadata.updated,
    }));

    return NextResponse.json({
      success: true,
      bucket: bucketName,
      count: fileList.length,
      files: fileList,
    });
  } catch (error) {
    console.error('Storage list error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list files',
      },
      { status: 500 }
    );
  }
}
