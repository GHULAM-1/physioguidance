import { BigQuery } from '@google-cloud/bigquery';
import { v4 as uuidv4 } from 'uuid';
import { RoleTableGenerator } from '../src/bigquery/schemas/role-table.generator';

// Configure BigQuery client to use emulator
const bigquery = new BigQuery({
  projectId: 'test-project',
  apiEndpoint: 'http://localhost:9050',
});

const datasetId = 'test_dataset';

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

    // Generate schemas dynamically from Role ENUM
    console.log('\n🔧 Generating table schemas from Role ENUM...');
    const roleTableSchemas = RoleTableGenerator.generateAllRoleTableSchemas();
    const usersSchema = RoleTableGenerator.getUsersTableSchema();

    const schemas = {
      users: usersSchema,
      ...roleTableSchemas,
    };

    console.log(`   Generated schemas for: ${Object.keys(schemas).join(', ')}`);

    // Create all tables
    console.log('\n📋 Creating tables:');
    for (const [tableName, schema] of Object.entries(schemas)) {
      try {
        console.log(`   Creating table: ${tableName}`);
        await dataset.createTable(tableName, { schema });
        console.log(`   ✅ Table ${tableName} created successfully`);
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`   ℹ️  Table ${tableName} already exists, skipping...`);
          // Skip - preserve existing data
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
      console.log('\n💡 ENUM-Driven Architecture Active:');
      console.log('   - Add new role to Role ENUM → Table auto-generates');
      console.log('   - Remove role from ENUM → Table marked as deprecated');
      console.log('   - All role tables use the same schema template');
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
