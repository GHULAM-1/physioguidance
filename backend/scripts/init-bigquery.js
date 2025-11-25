const { BigQuery } = require('@google-cloud/bigquery');
const { v4: uuidv4 } = require('uuid');

// Configure BigQuery client to use emulator
const bigquery = new BigQuery({
  projectId: 'test-project',
  apiEndpoint: 'http://localhost:9050',
});

const datasetId = 'test_dataset';

// Import schemas
const schemas = {
  users: [
    { name: 'userId', type: 'STRING', mode: 'REQUIRED' },
    { name: 'name', type: 'STRING', mode: 'REQUIRED' },
    { name: 'email', type: 'STRING', mode: 'REQUIRED' },
    { name: 'password', type: 'STRING', mode: 'REQUIRED' },
    { name: 'roles', type: 'STRING', mode: 'REPEATED' },
    { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
  ],
  user: [
    { name: 'userId', type: 'STRING', mode: 'REQUIRED' },
    { name: 'privilege', type: 'STRING', mode: 'REQUIRED' },
    { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
  ],
  learner: [
    { name: 'userId', type: 'STRING', mode: 'REQUIRED' },
    { name: 'privilege', type: 'STRING', mode: 'REQUIRED' },
    { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
  ],
  admin: [
    { name: 'userId', type: 'STRING', mode: 'REQUIRED' },
    { name: 'privilege', type: 'STRING', mode: 'REQUIRED' },
    { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
  ],
  finance: [
    { name: 'userId', type: 'STRING', mode: 'REQUIRED' },
    { name: 'privilege', type: 'STRING', mode: 'REQUIRED' },
    { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
  ],
};

async function initializeBigQuery() {
  try {
    console.log('🚀 Initializing BigQuery emulator...\n');

    // Create dataset
    console.log(`📁 Creating dataset: ${datasetId}`);
    const [dataset] = await bigquery
      .createDataset(datasetId, { location: 'US' })
      .catch(() => {
        console.log('   Dataset already exists, using existing dataset...');
        return [bigquery.dataset(datasetId)];
      });

    // Create all tables
    console.log('\n📋 Creating tables:');
    for (const [tableName, schema] of Object.entries(schemas)) {
      try {
        console.log(`   Creating table: ${tableName}`);
        await dataset.createTable(tableName, { schema });
        console.log(`   ✅ Table ${tableName} created successfully`);
      } catch (error) {
        if (error.code === 409) {
          console.log(`   ⚠️  Table ${tableName} already exists, deleting and recreating...`);
          await dataset.table(tableName).delete();
          await dataset.createTable(tableName, { schema });
          console.log(`   ✅ Table ${tableName} recreated successfully`);
        } else {
          throw error;
        }
      }
    }

    // Insert seed admin user
    console.log('\n👤 Creating seed admin user...');
    const adminUserId = uuidv4();
    const created_at = new Date().toISOString();

    const adminUser = {
      userId: adminUserId,
      name: 'Admin',
      email: 'admin@physioguidance.com',
      password: 'admin123',
      roles: ['ADMIN'],
      created_at: created_at,
    };

    await dataset.table('users').insert([adminUser]);
    console.log('   ✅ Admin user created in users table');

    // Insert admin record with EDITOR privilege
    const adminRoleRecord = {
      userId: adminUserId,
      privilege: 'EDITOR',
      created_at: created_at,
    };

    await dataset.table('admin').insert([adminRoleRecord]);
    console.log('   ✅ Admin role record created with EDITOR privilege');

    // Verify setup
    console.log('\n🔍 Verifying setup...');
    const query = `SELECT * FROM \`${datasetId}.users\` WHERE email = 'admin@physioguidance.com'`;
    const [rows] = await bigquery.query({ query });

    if (rows.length > 0) {
      console.log('\n✅ BigQuery emulator initialized successfully!\n');
      console.log('📊 Summary:');
      console.log(`   Dataset: ${datasetId}`);
      console.log(`   Tables created: ${Object.keys(schemas).join(', ')}`);
      console.log(`   Admin user email: admin@physioguidance.com`);
      console.log(`   Admin user password: admin123`);
      console.log(`   Admin userId: ${adminUserId}`);
      console.log('\n🎉 Ready to use!');
    } else {
      throw new Error('Failed to verify admin user creation');
    }
  } catch (error) {
    console.error('\n❌ Error initializing BigQuery:', error);
    process.exit(1);
  }
}

initializeBigQuery();
