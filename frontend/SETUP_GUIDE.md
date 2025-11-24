# Google Cloud Services - Local Development Setup

This guide shows you how to run your Next.js app with BigQuery and Cloud Storage emulators locally.

## 🚀 Services Running

### 1. Next.js App (Docker)
- **Port**: 8080
- **Container**: `nextjs-app-v2`
- **Access**: http://localhost:8080

### 2. BigQuery Emulator (Docker)
- **REST API**: http://localhost:9050
- **gRPC**: http://localhost:9060
- **Container**: `bigquery-emulator`
- **Project**: test-project
- **Dataset**: test_dataset

### 3. Cloud Storage Emulator (Docker)
- **API**: http://localhost:4443
- **Container**: `storage-emulator`
- **Bucket**: test-bucket

---

## 📋 Quick Start

### Start All Services

```bash
# 1. Start BigQuery emulator
docker-compose -f bigquery-docker-compose.yml up -d

# 2. Start Storage emulator
docker-compose -f storage-docker-compose.yml up -d

# 3. Initialize BigQuery with sample data
node scripts/init-bigquery.js

# 4. Initialize Storage with sample files
node scripts/init-storage.js

# 5. Start Next.js app with all environment variables
docker run -d -p 8080:8080 \
  -e PORT=8080 \
  -e BIGQUERY_PROJECT_ID=test-project \
  -e BIGQUERY_DATASET_ID=test_dataset \
  -e BIGQUERY_EMULATOR_HOST=http://host.docker.internal:9050 \
  -e STORAGE_EMULATOR_HOST=http://host.docker.internal:4443 \
  -e STORAGE_BUCKET_NAME=test-bucket \
  -e STORAGE_PROJECT_ID=test-project \
  --name nextjs-app-v2 \
  nextjs-cloudrun-app:v2
```

### Or Start All At Once

```bash
docker-compose -f all-services-docker-compose.yml up -d
```

---

## 🔧 Development Workflow

### Make Changes to Code

1. Edit your code
2. Rebuild Docker image:
   ```bash
   docker build -t nextjs-cloudrun-app:v2 .
   ```
3. Restart container with env vars:
   ```bash
   docker stop nextjs-app-v2 && docker rm nextjs-app-v2
   docker run -d -p 8080:8080 \
     -e PORT=8080 \
     -e BIGQUERY_EMULATOR_HOST=http://host.docker.internal:9050 \
     -e STORAGE_EMULATOR_HOST=http://host.docker.internal:4443 \
     --name nextjs-app-v2 \
     nextjs-cloudrun-app:v2
   ```

---

## 📡 API Endpoints

### BigQuery
- **List users**: `GET http://localhost:8080/api/bigquery/users`
  ```bash
  curl http://localhost:8080/api/bigquery/users
  ```

### Cloud Storage
- **List files**: `GET http://localhost:8080/api/storage/files`
  ```bash
  curl http://localhost:8080/api/storage/files
  ```

- **Upload file**: `POST http://localhost:8080/api/storage/upload`
  ```bash
  curl -F "file=@myfile.txt" http://localhost:8080/api/storage/upload
  ```

- **Download file**: `GET http://localhost:8080/api/storage/download/{filename}`
  ```bash
  curl http://localhost:8080/api/storage/download/sample.txt
  ```

---

## 🐛 Troubleshooting

### BigQuery/Storage "Connection Refused"

**Problem**: Next.js container can't reach emulators

**Solution**: Make sure you're using `host.docker.internal` not `localhost` in environment variables

```bash
# ❌ Wrong
BIGQUERY_EMULATOR_HOST=http://localhost:9050

# ✅ Correct
BIGQUERY_EMULATOR_HOST=http://host.docker.internal:9050
```

### Table/Bucket Not Found

**Problem**: Emulators lose data on restart (they're in-memory)

**Solution**: Reinitialize after restarting emulators

```bash
node scripts/init-bigquery.js
node scripts/init-storage.js
```

### Check Container Status

```bash
# View all containers
docker ps

# View logs
docker logs bigquery-emulator
docker logs storage-emulator
docker logs nextjs-app-v2

# Restart a container
docker restart nextjs-app-v2
```

---

## 📁 Project Structure

```
frontend/
├── Dockerfile                          # Next.js container definition
├── docker-compose.yml                  # Next.js service
├── bigquery-docker-compose.yml         # BigQuery emulator
├── storage-docker-compose.yml          # Storage emulator
├── all-services-docker-compose.yml     # All services combined
├── .env.local                          # Local environment variables
├── src/
│   ├── lib/
│   │   ├── bigquery.ts                 # BigQuery client
│   │   └── storage.ts                  # Storage client
│   └── app/api/
│       ├── bigquery/users/route.ts     # BigQuery API
│       └── storage/
│           ├── upload/route.ts         # Upload files
│           ├── files/route.ts          # List files
│           └── download/[filename]/    # Download file
│               └── route.ts
└── scripts/
    ├── init-bigquery.js                # Populate BigQuery
    └── init-storage.js                 # Populate Storage
```

---

## 🌐 Network Architecture

```
┌────────────────────────────────────────────────────────┐
│              Your Mac (Host)                           │
│                                                        │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Next.js    │  │  BigQuery    │  │  Storage     │ │
│  │  Container  │──▶  Emulator    │  │  Emulator    │ │
│  │  :8080      │  │  :9050       │  │  :4443       │ │
│  └─────────────┘  └──────────────┘  └──────────────┘ │
│         │                │                  │         │
└─────────┼────────────────┼──────────────────┼─────────┘
          │                │                  │
          ▼                ▼                  ▼
   localhost:8080   localhost:9050    localhost:4443
```

**Key Point**: Containers use `host.docker.internal` to reach host services!

---

## 🚀 Deploy to Google Cloud Run

When ready to deploy:

```bash
# 1. Tag image for Google Container Registry
docker tag nextjs-cloudrun-app:v2 gcr.io/YOUR_PROJECT_ID/nextjs-app

# 2. Push to GCR
docker push gcr.io/YOUR_PROJECT_ID/nextjs-app

# 3. Deploy to Cloud Run
gcloud run deploy nextjs-app \
  --image gcr.io/YOUR_PROJECT_ID/nextjs-app \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars BIGQUERY_PROJECT_ID=YOUR_PROJECT_ID \
  --set-env-vars STORAGE_BUCKET_NAME=your-bucket-name
```

**Note**: Remove emulator environment variables for production!

---

## 📚 Useful Commands

```bash
# View all running containers
docker ps

# Stop all services
docker stop bigquery-emulator storage-emulator nextjs-app-v2

# Remove all containers
docker rm bigquery-emulator storage-emulator nextjs-app-v2

# View container logs
docker logs -f nextjs-app-v2

# Execute command in container
docker exec -it nextjs-app-v2 sh

# Check environment variables
docker exec nextjs-app-v2 env | grep BIGQUERY
docker exec nextjs-app-v2 env | grep STORAGE
```

---

Built with ❤️ using Google Cloud emulators
