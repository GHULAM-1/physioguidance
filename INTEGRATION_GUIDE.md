# PhysioGuidance - Frontend & Backend Integration Guide

## Overview
Complete authentication and user management system with role-based access control, integrated with BigQuery for data persistence.

---

## Architecture

### Backend (NestJS)
- **Port:** 3000
- **Database:** BigQuery (Emulator on port 9050)
- **Authentication:** Role-based with privilege levels

### Frontend (Next.js 16)
- **Port:** 8080
- **Framework:** React 19 with App Router
- **Styling:** Tailwind CSS

---

## Getting Started

### 1. Start BigQuery Emulator
```bash
cd infrastructure/bigquery
docker-compose -f docker-compose.local.yml up -d
```

### 2. Initialize BigQuery (Create tables & seed admin)
```bash
cd backend
npm run init:bigquery
```

**This creates:**
- Tables: `users`, `user`, `learner`, `admin`, `finance`
- Admin user: `admin@physioguidance.com` / `admin123`

### 3. Start Services with Docker Compose
```bash
# From project root
docker-compose -f docker-compose.local.yml up -d
```

**Services started:**
- Backend runs on: **http://localhost:3000**
- Frontend runs on: **http://localhost:8080**
- BigQuery Emulator on: **http://localhost:9050**
- Storage Emulator on: **http://localhost:4443**

**OR run services individually:**

```bash
# Backend only
cd backend
npm run start:dev  # Runs on port 3000

# Frontend only
cd frontend
npm run dev        # Runs on port 8080
```

---

## User Roles & Permissions

### Roles (Enum)
- **USER** - Basic user access
- **LEARNER** - Self-registered users (default role)
- **ADMIN** - Full system access
- **FINANCE** - Finance department access

### Privileges (Per Role)
- **EDITOR** - Can create, read, update, delete
- **VIEWER** - Read-only access

### Role Assignment
- **LEARNER**: Self-registration → Automatic VIEWER privilege
- **Other Roles**: Admin creates → Custom privilege per role

---

## API Endpoints

### Public Endpoints

#### Register (Learner)
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@physioguidance.com",
  "password": "admin123"
}
```

### Protected Endpoints

#### Create User (Admin Only - EDITOR privilege required)
```http
POST /auth/admin/create-user
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "password123",
  "roles": ["FINANCE", "USER"],
  "privileges": {
    "FINANCE": "EDITOR",
    "USER": "VIEWER"
  }
}
```

#### Get All Users (Admin Only)
```http
GET /auth/admin/users
```

#### Get Users by Department (Admin Only)
```http
GET /auth/admin/department/FINANCE
GET /auth/admin/department/ADMIN
GET /auth/admin/department/USER
GET /auth/admin/department/LEARNER
```

#### Get Current User
```http
GET /auth/me
```

---

## Frontend Routes

### Public Routes
- `/` - Home page
- `/auth/login` - Login page
- `/auth/register` - Registration page (Learner only)

### Protected Routes
- `/admin` - Admin dashboard (ADMIN role required)
  - User list with department filtering
  - Create new users with roles & privileges
  - View all system users

---

## Database Schema

### users Table
```
userId          STRING      (UUID, REQUIRED)
name            STRING      (REQUIRED)
email           STRING      (REQUIRED)
password        STRING      (REQUIRED)
roles           REPEATED    (Array of role strings)
created_at      TIMESTAMP   (REQUIRED)
```

### Role Tables (user, learner, admin, finance)
```
userId          STRING      (FK to users.userId, REQUIRED)
privilege       STRING      (EDITOR or VIEWER, REQUIRED)
created_at      TIMESTAMP   (REQUIRED)
```

---

## User Flows

### 1. Learner Self-Registration
1. Navigate to `/auth/register`
2. Fill in name, email, password
3. Submit → Creates user with `roles: ["LEARNER"]` and `privilege: "VIEWER"`
4. Auto-login → Redirected to home

### 2. Admin Creates User
1. Login as admin
2. Navigate to `/admin`
3. Click "Create New User"
4. Fill in:
   - Name, email, password
   - Select roles (USER, ADMIN, FINANCE)
   - Set privilege for each role (EDITOR/VIEWER)
5. Submit → User created in `users` table + corresponding role tables

### 3. View Users by Department
1. Login as admin
2. Navigate to `/admin`
3. Use department filter dropdown
4. View users filtered by selected role

---

## Guards & Decorators (Backend)

### Guards
```typescript
@UseGuards(AuthGuard)                    // Requires authentication
@UseGuards(RolesGuard)                   // Requires specific role(s)
@UseGuards(PrivilegeGuard)               // Requires specific privilege
```

### Decorators
```typescript
@Roles(Role.ADMIN)                       // Restrict to ADMIN role
@Roles(Role.FINANCE, Role.ADMIN)        // Allow FINANCE OR ADMIN
@RequirePrivilege(Privilege.EDITOR)     // Requires EDITOR privilege
@CurrentUser()                           // Inject current user object
```

### Example
```typescript
@Post('admin/create-user')
@UseGuards(AuthGuard, RolesGuard, PrivilegeGuard)
@Roles(Role.ADMIN)
@RequirePrivilege(Privilege.EDITOR)
async createUser(@Body() data: CreateUserDto) {
  // Only ADMIN with EDITOR privilege can access
}
```

---

## Environment Variables

### Backend (.env)
```env
BIGQUERY_PROJECT_ID=test-project
BIGQUERY_EMULATOR_HOST=http://localhost:9050
BIGQUERY_DATASET_ID=test_dataset
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
BIGQUERY_PROJECT_ID=test-project
BIGQUERY_DATASET_ID=test_dataset
BIGQUERY_EMULATOR_HOST=http://host.docker.internal:9050
```

---

## Testing the Integration

### 1. Test Learner Registration
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Learner",
    "email": "learner@test.com",
    "password": "test123"
  }'
```

### 2. Test Admin Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@physioguidance.com",
    "password": "admin123"
  }'
```

### 3. Test Create User (As Admin)
First login as admin, then:
```bash
curl -X POST http://localhost:3000/auth/admin/create-user \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Finance User",
    "email": "finance@test.com",
    "password": "test123",
    "roles": ["FINANCE"],
    "privileges": {
      "FINANCE": "EDITOR"
    }
  }'
```

---

## Troubleshooting

### Backend won't start
- Check if BigQuery emulator is running: `docker ps`
- Verify port 3000 is available: `lsof -i :3000`
- Check backend container logs: `docker logs physioguidance-backend`

### Frontend can't connect to backend
- Check `NEXT_PUBLIC_API_URL` in `.env.local` (should be `http://localhost:3000`)
- Verify backend is running on port 3000
- Check frontend container logs: `docker logs physioguidance-frontend`
- Test backend directly: `curl http://localhost:3000/auth/me`

### BigQuery initialization fails
- Ensure BigQuery emulator is running
- Check connection: `curl http://localhost:9050`
- Review `backend/scripts/init-bigquery.js` logs

---

## Project Structure

```
physioguidance/
├── backend/
│   ├── src/
│   │   ├── auth/              # Auth module
│   │   │   ├── guards/        # Role & privilege guards
│   │   │   ├── decorators/    # Custom decorators
│   │   │   ├── auth.controller.ts
│   │   │   └── auth.service.ts
│   │   ├── bigquery/          # BigQuery module
│   │   │   ├── enums/         # Role & Privilege enums
│   │   │   ├── schemas/       # Table schemas
│   │   │   ├── interfaces/    # TypeScript interfaces
│   │   │   └── bigquery.service.ts
│   │   └── dto/auth/          # Data transfer objects
│   └── scripts/
│       └── init-bigquery.js   # DB initialization
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/          # Auth pages
│   │   │   ├── admin/         # Admin dashboard
│   │   │   └── page.tsx       # Home page
│   │   ├── components/auth/   # Auth components
│   │   ├── contexts/          # React contexts
│   │   ├── lib/auth/          # API functions
│   │   └── types/             # TypeScript types
│   └── .env.local             # Environment variables
└── infrastructure/
    └── bigquery/
        ├── docker-compose.local.yml
        └── init.js
```

---

## Next Steps

1. Add JWT token-based authentication instead of localStorage
2. Implement session management with HTTP-only cookies
3. Add password hashing (bcrypt)
4. Add email verification for new users
5. Implement forgot password flow
6. Add audit logging for admin actions
7. Create department-specific dashboards
8. Add user profile editing

---

## Support

For issues or questions:
- Check backend logs: `npm run start:dev` (in backend/)
- Check frontend console: Browser DevTools
- Review BigQuery emulator logs: `docker logs bigquery-emulator`