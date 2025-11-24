const { Storage } = require('@google-cloud/storage');

// Configure Storage client to use emulator
const storage = new Storage({
  projectId: 'test-project',
  apiEndpoint: 'http://localhost:4443',
});

const bucketName = 'test-bucket';

async function initializeStorage() {
  try {
    console.log('Initializing Google Cloud Storage emulator...');

    // Create bucket
    console.log(`Creating bucket: ${bucketName}`);
    try {
      await storage.createBucket(bucketName);
      console.log(`Bucket ${bucketName} created successfully`);
    } catch (error) {
      if (error.code === 409) {
        console.log('Bucket already exists, continuing...');
      } else {
        throw error;
      }
    }

    const bucket = storage.bucket(bucketName);

    // Upload sample files
    console.log('\nUploading sample files...');

    // Sample file 1: Text file
    const textContent = 'Hello from Google Cloud Storage emulator!\nThis is a test file.';
    const textFile = bucket.file('sample.txt');
    await textFile.save(textContent, {
      metadata: {
        contentType: 'text/plain',
      },
    });
    console.log('✓ Uploaded: sample.txt');

    // Sample file 2: JSON file
    const jsonContent = JSON.stringify({
      message: 'Sample JSON data',
      timestamp: new Date().toISOString(),
      users: ['Alice', 'Bob', 'Charlie'],
    }, null, 2);
    const jsonFile = bucket.file('data.json');
    await jsonFile.save(jsonContent, {
      metadata: {
        contentType: 'application/json',
      },
    });
    console.log('✓ Uploaded: data.json');

    // Sample file 3: Markdown file
    const mdContent = `# Sample Markdown File

This is a test document stored in GCS emulator.

## Features
- Cloud Storage emulator
- File upload/download
- Integration with Next.js

Generated at: ${new Date().toISOString()}
`;
    const mdFile = bucket.file('README.md');
    await mdFile.save(mdContent, {
      metadata: {
        contentType: 'text/markdown',
      },
    });
    console.log('✓ Uploaded: README.md');

    // List all files
    console.log('\nListing all files in bucket...');
    const [files] = await bucket.getFiles();

    console.log('\nFiles in bucket:');
    console.table(
      files.map((file) => ({
        name: file.name,
        size: file.metadata.size + ' bytes',
        contentType: file.metadata.contentType,
        created: file.metadata.timeCreated,
      }))
    );

    console.log('\n✅ Storage emulator initialized successfully!');
    console.log(`\nBucket: ${bucketName}`);
    console.log(`Files: ${files.length}`);
    console.log(`Endpoint: http://localhost:4443`);

  } catch (error) {
    console.error('Error initializing storage:', error);
    process.exit(1);
  }
}

initializeStorage();
