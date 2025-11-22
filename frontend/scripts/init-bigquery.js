const { BigQuery } = require('@google-cloud/bigquery');

// Configure BigQuery client to use emulator
const bigquery = new BigQuery({
  projectId: 'test-project',
  apiEndpoint: 'http://localhost:9050',
});

const datasetId = 'test_dataset';
const tableId = 'users';

async function initializeBigQuery() {
  try {
    console.log('Initializing BigQuery emulator...');

    // Create dataset
    console.log(`Creating dataset: ${datasetId}`);
    const [dataset] = await bigquery.createDataset(datasetId, {
      location: 'US',
    }).catch(() => {
      console.log('Dataset already exists, skipping...');
      return [bigquery.dataset(datasetId)];
    });

    // Define table schema
    const schema = [
      { name: 'id', type: 'INTEGER', mode: 'REQUIRED' },
      { name: 'name', type: 'STRING', mode: 'REQUIRED' },
      { name: 'email', type: 'STRING', mode: 'REQUIRED' },
      { name: 'age', type: 'INTEGER', mode: 'NULLABLE' },
      { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
    ];

    // Create table
    console.log(`Creating table: ${tableId}`);
    const [table] = await dataset.createTable(tableId, { schema }).catch(() => {
      console.log('Table already exists, deleting and recreating...');
      return dataset.table(tableId).delete().then(() => {
        return dataset.createTable(tableId, { schema });
      });
    });

    // Insert sample data
    console.log('Inserting sample data...');
    const rows = [
      { id: 1, name: 'John Doe', email: 'john@example.com', age: 30, created_at: new Date().toISOString() },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25, created_at: new Date().toISOString() },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com', age: 35, created_at: new Date().toISOString() },
      { id: 4, name: 'Alice Williams', email: 'alice@example.com', age: 28, created_at: new Date().toISOString() },
      { id: 5, name: 'Charlie Brown', email: 'charlie@example.com', age: 32, created_at: new Date().toISOString() },
    ];

    await table.insert(rows);
    console.log(`Inserted ${rows.length} rows successfully!`);

    // Verify data
    console.log('\nQuerying data to verify...');
    const query = `SELECT * FROM \`${datasetId}.${tableId}\` LIMIT 10`;
    const [queryRows] = await bigquery.query({ query });

    console.log('\nSample data:');
    console.table(queryRows);

    console.log('\n✅ BigQuery emulator initialized successfully!');
    console.log(`\nDataset: ${datasetId}`);
    console.log(`Table: ${tableId}`);
    console.log(`Rows: ${rows.length}`);

  } catch (error) {
    console.error('Error initializing BigQuery:', error);
    process.exit(1);
  }
}

initializeBigQuery();
