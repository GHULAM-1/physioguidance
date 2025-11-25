# PhysioGuidance - Docker Setup Guide

## Quick Reference

### Port Mapping
| Service | Container Port | Host Port | Access URL |
|---------|---------------|-----------|------------|
| Frontend | 8080 | 8080 | http://localhost:8080 |
| Backend | 3000 | 3000 | http://localhost:3000 |
| BigQuery Emulator | 9050, 9060 | 9050, 9060 | http://localhost:9050 |
| Storage Emulator | 4443 | 4443 | http://localhost:4443 |

---

## Starting the Application

### Option 1: All Services with Docker Compose (Recommended)

```bash
# From project root
docker-compose -f docker-compose.local.yml up -d
```

This starts:
- ✅ BigQuery Emulator
- ✅ Cloud Storage Emulator
- ✅ Backend (NestJS)
- ✅ Frontend (Next.js)

**Access the application:**
- Frontend: http://localhost:8080
- Backend API: http://localhost:3000
- Admin login: admin@physioguidance.com / admin123

### Option 2: Individual Services

```bash
# Start BigQuery Emulator only
cd infrastructure/bigquery
docker-compose -f docker-compose.local.yml up -d

# Start Backend only
cd backend
docker-compose -f ../docker-compose.local.yml up backend -d

# Start Frontend only
cd frontend
docker-compose -f ../docker-compose.local.yml up frontend -d
```

---

## Initial Setup

### First Time Setup

```bash
# 1. Create Docker network (if not exists)
docker network create physioguidance-network

# 2. Start BigQuery Emulator
docker-compose -f docker-compose.local.yml up bigquery-emulator -d

# 3. Wait for BigQuery to be ready
docker logs bigquery-emulator

# 4. Initialize BigQuery (create tables + seed admin)
cd backend
npm run init:bigquery

# 5. Start all services
cd ..
docker-compose -f docker-compose.local.yml up -d
```

---

## Managing Containers

### View Running Containers
```bash
docker ps
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.local.yml logs -f

# Specific service
docker logs -f physioguidance-frontend
docker logs -f physioguidance-backend
docker logs -f bigquery-emulator
docker logs -f storage-emulator
```

### Stop Services
```bash
# Stop all services
docker-compose -f docker-compose.local.yml down

# Stop specific service
docker stop physioguidance-frontend
docker stop physioguidance-backend
```

### Restart Services
```bash
# Restart all services
docker-compose -f docker-compose.local.yml restart

# Restart specific service
docker restart physioguidance-frontend
docker restart physioguidance-backend
```

### Rebuild Containers
```bash
# Rebuild all services
docker-compose -f docker-compose.local.yml up -d --build

# Rebuild specific service
docker-compose -f docker-compose.local.yml up -d --build frontend
docker-compose -f docker-compose.local.yml up -d --build backend
```

---

## Environment Variables

### Frontend Container
```bash
# Inside docker-compose.local.yml
environment:
  - NODE_ENV=development
  - PORT=8080
  - NEXT_PUBLIC_API_URL=http://localhost:3000  # Browser connects to host
  - BIGQUERY_EMULATOR_HOST=bigquery-emulator:9050  # Container-to-container
```

### Backend Container
```bash
# Inside docker-compose.local.yml
environment:
  - NODE_ENV=development
  - PORT=3000
  - BIGQUERY_PROJECT_ID=test-project
  - BIGQUERY_EMULATOR_HOST=bigquery-emulator:9050
  - STORAGE_EMULATOR_HOST=http://storage-emulator:4443
```

---

## Troubleshooting

### Frontend Can't Connect to Backend

**Problem:** Browser shows "Failed to fetch" or connection errors

**Solutions:**
1. Check backend is running: `docker ps | grep backend`
2. Test backend directly: `curl http://localhost:3000/auth/me`
3. Check frontend env: `NEXT_PUBLIC_API_URL=http://localhost:3000`
4. View frontend logs: `docker logs physioguidance-frontend`

### Backend Can't Connect to BigQuery

**Problem:** Backend throws BigQuery connection errors

**Solutions:**
1. Check BigQuery is running: `docker ps | grep bigquery`
2. Test BigQuery: `curl http://localhost:9050`
3. Check backend env: `BIGQUERY_EMULATOR_HOST=bigquery-emulator:9050`
4. View backend logs: `docker logs physioguidance-backend`

### Port Already in Use

**Problem:** `Error: port is already allocated`

**Solutions:**
```bash
# Find what's using the port
lsof -i :8080  # Frontend
lsof -i :3000  # Backend
lsof -i :9050  # BigQuery

# Kill the process
kill -9 <PID>

# Or use different ports in docker-compose.yml
```

### Container Won't Start

**Problem:** Container exits immediately

**Solutions:**
1. Check logs: `docker logs physioguidance-frontend`
2. Check Dockerfile syntax
3. Rebuild: `docker-compose -f docker-compose.local.yml up -d --build`
4. Check dependencies are running first

---

## Data Persistence

### BigQuery Data
- Stored in container, lost on `docker-compose down`
- Re-run `npm run init:bigquery` to reinitialize

### Cloud Storage Data
- Persisted in Docker volume: `gcs-data`
- View volumes: `docker volume ls`
- Remove volume: `docker volume rm gcs-data`

### User Data (localStorage)
- Stored in browser
- Clear: Browser DevTools → Application → Local Storage

---

## Network Communication

### Container-to-Container
```
Frontend Container → backend:3000 → Backend Container
Backend Container → bigquery-emulator:9050 → BigQuery Container
Backend Container → storage-emulator:4443 → Storage Container
```

### Browser-to-Backend
```
Browser → localhost:8080 → Frontend Container
Browser → localhost:3000 → Backend Container
```

---

## Useful Commands

### Clean Everything
```bash
# Stop all containers
docker-compose -f docker-compose.local.yml down

# Remove volumes
docker volume prune

# Remove images
docker rmi physioguidance-frontend physioguidance-backend

# Remove network
docker network rm physioguidance-network
```

### Full Reset
```bash
# Stop and remove everything
docker-compose -f docker-compose.local.yml down -v

# Rebuild and start fresh
docker-compose -f docker-compose.local.yml up -d --build

# Reinitialize BigQuery
cd backend
npm run init:bigquery
```

### Shell into Container
```bash
# Access container shell
docker exec -it physioguidance-frontend sh
docker exec -it physioguidance-backend sh

# View environment variables
docker exec physioguidance-frontend env
docker exec physioguidance-backend env
```

---

## Testing the Setup

### 1. Check All Containers Running
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Expected output:
```
NAMES                        STATUS          PORTS
physioguidance-frontend      Up X minutes    0.0.0.0:8080->8080/tcp
physioguidance-backend       Up X minutes    0.0.0.0:3000->3000/tcp
bigquery-emulator            Up X minutes    0.0.0.0:9050->9050/tcp, 9060/tcp
storage-emulator             Up X minutes    0.0.0.0:4443->4443/tcp
```

### 2. Test Backend Health
```bash
curl http://localhost:3000/auth/me
# Expected: 401 Unauthorized (this is good - means backend is working)
```

### 3. Test Frontend
```bash
# Open in browser
open http://localhost:8080
```

### 4. Test Admin Login
1. Go to http://localhost:8080/auth/login
2. Email: admin@physioguidance.com
3. Password: admin123
4. Should redirect to home page showing user info

---

## Production Deployment

For production, use `docker-compose.prod.yml`:

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

**Production Differences:**
- Frontend: Port 80 (standard HTTP)
- Backend: Port 8080 (Cloud Run standard)
- Uses real GCP services (no emulators)
- Images pushed to GCR: `gcr.io/${PROJECT_ID}/physioguidance-*`

---

## Quick Links

- Frontend: http://localhost:8080
- Backend API: http://localhost:3000
- Admin Dashboard: http://localhost:8080/admin
- Login Page: http://localhost:8080/auth/login
- Register Page: http://localhost:8080/auth/register

**Default Admin Credentials:**
- Email: admin@physioguidance.com
- Password: admin123