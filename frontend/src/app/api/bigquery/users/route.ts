import { NextResponse } from 'next/server';
import bigquery, { datasetId } from '@/lib/bigquery';

export async function GET() {
  try {
    const query = `SELECT * FROM \`${datasetId}.users\` ORDER BY id`;

    const [rows] = await bigquery.query({ query });

    return NextResponse.json({
      success: true,
      data: rows,
      count: rows.length,
    });
  } catch (error) {
    console.error('BigQuery error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
