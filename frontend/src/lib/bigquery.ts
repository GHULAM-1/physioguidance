import { BigQuery } from '@google-cloud/bigquery';

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: process.env.BIGQUERY_PROJECT_ID || 'test-project',
  apiEndpoint: process.env.BIGQUERY_EMULATOR_HOST || 'http://localhost:9050',
});

export const datasetId = process.env.BIGQUERY_DATASET_ID || 'test_dataset';

export default bigquery;
