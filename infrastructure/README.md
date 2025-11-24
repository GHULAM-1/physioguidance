# Infrastructure Documentation

This directory contains all Docker Compose configurations for the PhysiGuidance project's infrastructure services.

## Directory Structure

```
infrastructure/
├── bigquery/
│   ├── docker-compose.local.yml    # BigQuery emulator for local dev
│   ├── docker-compose.prod.yml     # Production BigQuery config
│   └── init.js                     # Initialize BigQuery with sample data
├── storage/
│   ├── docker-compose.local.yml    # Cloud Storage emulator for local dev
│   ├── docker-compose.prod.yml     # Production Storage config
│   └── init.js                     # Initialize Storage with sample files
├── cloudrun/
│   ├── docker-compose.local.yml    # Cloud Run emulator for local dev
│   └── docker-compose.prod.yml     # Production Cloud Run config
├── backend/
│   ├── docker-compose.local.yml    # NestJS + all backend dependencies
│   └── docker-compose.prod.yml     # Production backend config
└── frontend/
    ├── docker-compose.local.yml    # Next.js + BigQuery reference
    └── docker-compose.prod.yml     # Production frontend config
```

## Root Level Docker Compose Files

### `docker-compose.local.yml`
Orchestrates all services for local development:
- BigQuery Emulator (port 9050, 9060)
- Cloud Storage Emulator (port 4443)
- Backend (NestJS on port 3000)
- Frontend (Next.js on port 8080)

### `docker-compose.prod.yml`
Production configuration reference (services deployed to GCP in production)

## Usage

### Local Development

**Start all services:**
```bash
docker-compose -f docker-compose.local.yml up -d
```

**Start specific services:**
```bash
# Just backend + its dependencies
docker-compose -f infrastructure/backend/docker-compose.local.yml up -d

# Just frontend
docker-compose -f infrastructure/frontend/docker-compose.local.yml up -d
```

**Stop all services:**
```bash
docker-compose -f docker-compose.local.yml down
```

**View logs:**
```bash
docker-compose -f docker-compose.local.yml logs -f [service-name]
```

### Initialize Emulators

After starting the emulators, initialize them with sample data:

**BigQuery:**
```bash
cd infrastructure/bigquery
node init.js
```

**Cloud Storage:**
```bash
cd infrastructure/storage
node init.js
```

## Service Dependencies

### Backend Services
The backend requires:
- BigQuery Emulator (for database operations)
- Cloud Storage Emulator (for file storage)
- Cloud Run (runs as container locally)

### Frontend Services
The frontend requires:
- BigQuery Emulator (for data queries)
- Backend API (for business logic)

## Environment Variables

### Backend Environment
```
NODE_ENV=development
PORT=3000
BIGQUERY_PROJECT_ID=test-project
BIGQUERY_DATASET=test_dataset
BIGQUERY_EMULATOR_HOST=bigquery-emulator:9050
STORAGE_PROJECT_ID=test-project
STORAGE_BUCKET=test-bucket
STORAGE_EMULATOR_HOST=http://storage-emulator:4443
CLOUD_RUN_SERVICE_URL=http://backend:3000
```

### Frontend Environment
```
NODE_ENV=development
PORT=8080
NEXT_PUBLIC_BIGQUERY_PROJECT_ID=test-project
NEXT_PUBLIC_BIGQUERY_DATASET=test_dataset
BIGQUERY_EMULATOR_HOST=bigquery-emulator:9050
NEXT_PUBLIC_API_URL=http://backend:3000
```

## Port Mapping

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 8080 | Next.js application |
| Backend | 3000 | NestJS API |
| BigQuery Emulator | 9050 | REST API |
| BigQuery Emulator | 9060 | gRPC API |
| Cloud Storage Emulator | 4443 | Storage API |

## Network

All services run on the `physioguidance-network` Docker network, allowing inter-container communication using service names as hostnames.

## Production Deployment

In production:
- Backend: Deploy to Google Cloud Run
- Frontend: Deploy to Cloud Run, Vercel, or Cloud Storage + CDN
- BigQuery: Use real Google BigQuery service
- Cloud Storage: Use real Google Cloud Storage buckets
- No emulators are used

See individual `docker-compose.prod.yml` files for production configurations.

## Troubleshooting

**Services won't start:**
- Check if ports are already in use: `lsof -i :8080` (or other port)
- Ensure Docker is running: `docker info`

**Can't connect to emulators:**
- Verify services are healthy: `docker-compose ps`
- Check logs: `docker-compose logs [service-name]`

**Network issues:**
- Recreate network: `docker network rm physioguidance-network && docker network create physioguidance-network`
