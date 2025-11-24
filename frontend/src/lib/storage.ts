import { Storage } from '@google-cloud/storage';

// Initialize Google Cloud Storage client for fake-gcs-server emulator
const storage = new Storage({
  projectId: process.env.STORAGE_PROJECT_ID || 'test-project',
  apiEndpoint: process.env.STORAGE_EMULATOR_HOST || 'http://localhost:4443',
  // Disable authentication for local emulator
  // @ts-ignore - fake credentials for emulator
  credentials: {
    client_email: 'test@example.com',
    private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7W9W\n-----END PRIVATE KEY-----\n',
  },
});

export const bucketName = process.env.STORAGE_BUCKET_NAME || 'test-bucket';

export default storage;
