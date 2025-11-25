# PhysioGuidance - Project Architecture Documentation

## Project Overview

PhysioGuidance is a full-stack application for physiotherapy management with role-based access control (RBAC) and department-specific data management. Built with NestJS backend, Next.js frontend, and Google BigQuery as the database.

---

## Tech Stack

### Backend
- **Framework:** NestJS (TypeScript)
- **Database:** Google BigQuery
- **Authentication:** JWT (JSON Web Tokens)
- **Authorization:** Role-Based Access Control (RBAC) + Privilege-Based Access Control (PBAC)
- **Testing:** Jest + @nestjs/testing

### Frontend
- **Framework:** Next.js 16.0.3 with App Router
- **UI Library:** React 19.2.0
- **UI Components:** Radix UI + shadcn/ui
- **Styling:** Tailwind CSS
- **State Management:** React Context API

### Infrastructure
- **Container:** Docker + Docker Compose
- **Local Development:** BigQuery Emulator
- **Deployment:** Google Cloud Run (planned)

---

## TypeScript Conventions

### Type vs Interface

**CRITICAL RULE: Always use `type`, NEVER use `interface`**

This project follows a strict convention of using TypeScript `type` declarations instead of `interface` declarations for all type definitions.

**✅ DO - Use type:**
```typescript
export type User = {
  userId: string;
  name: string;
  email: string;
  roles: Role[];
};

export type ValidationResult = {
  allTablesExist: boolean;
  missingTables: string[];
};
```

**❌ DON'T - Use interface:**
```typescript
// NEVER do this
export interface User {
  userId: string;
  name: string;
}
```

**Exception:** The ONLY exception is TypeScript declaration merging (e.g., extending Express types in `.d.ts` files), which technically requires `interface`:
```typescript
// Only acceptable use of interface (declaration merging)
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
```

**Why types over interfaces?**
- Consistent codebase style
- Types are more flexible (can represent unions, intersections, primitives, etc.)
- Reduces cognitive load (one way to do things)
- Avoids confusion between when to use which

### Type Organization Structure

**CRITICAL RULE: Types must mirror the source folder structure**

All types are organized in the `src/types` folder, with subdirectories that mirror the actual source code structure. This creates a clear relationship between types and their related code.

**Structure:**
```
src/
├── types/                          # All type definitions
│   ├── auth/                       # Types related to src/auth
│   │   └── type.ts                # User type
│   ├── bigquery/                   # Types related to src/bigquery
│   │   └── type.ts                # RolePrivilege, MigrationResult, ValidationResult
│   ├── testing/                    # Types related to src/testing
│   │   └── type.ts                # Mock types (MockTable, MockDataset, MockBigQuery)
│   ├── error.types.ts             # Common error types
│   └── express.d.ts               # Express type extensions
│
├── auth/                          # Auth-related code
│   ├── auth.service.ts           # Uses User from types/auth/type
│   └── ...
│
├── bigquery/                      # BigQuery-related code
│   ├── bigquery.service.ts       # Uses types from types/bigquery/type
│   └── ...
│
└── dto/                           # Data Transfer Objects (classes)
    └── auth/
        └── create-user.dto.ts    # DTOs remain as classes in dto folder
```

**File Naming Convention:**
- Each type folder has a single `type.ts` file
- Special files: `error.types.ts`, `express.d.ts`

**Import Examples:**
```typescript
// In src/auth/auth.service.ts
import { User } from '../types/auth/type';

// In src/bigquery/bigquery.service.ts
import { User } from '../types/auth/type';
import { RolePrivilege, MigrationResult } from '../types/bigquery/type';

// In src/testing/mocks/bigquery.mocks.ts
import { MockTable, MockDataset, MockBigQuery } from '../../types/testing/type';
```

**Rules:**
1. **Mirror Structure**: If code is in `src/auth`, types go in `src/types/auth/type.ts`
2. **Single File**: Each type folder has ONE `type.ts` file (not multiple files)
3. **No Interfaces**: Types live in `types` folder, NOT scattered in feature folders
4. **DTOs Exception**: Data Transfer Objects remain as classes in `src/dto` folder

**Why this structure?**
- Clear separation of types from implementation
- Easy to find types (just mirror the folder name)
- Prevents circular dependencies
- Centralized type management
- Consistent import paths

---

## Core Architecture Principles

### 1. ENUM-Driven Architecture (ANCHOR STONE)

**The Role ENUM is the single source of truth for all departments/roles in the system.**

**File:** `backend/src/bigquery/enums/roles.enum.ts`

```typescript
export enum Role {
  USER = 'USER',
  LEARNER = 'LEARNER',
  ADMIN = 'ADMIN',
  FINANCE = 'FINANCE',
}
```

**How it works:**
- Add a role to the ENUM → Department table auto-creates (with auto-migration enabled)
- Remove a role from ENUM → System marks it as deprecated
- Table names are derived from ENUM values: `Role.ADMIN` → `admin` table (via `getRoleTableName()`)

### 2. Normalized Database Structure

#### Users Table (Common Data)
**Table:** `users`

Stores data common to ALL users regardless of department:
```
userId          STRING      REQUIRED    Primary key (UUID)
name            STRING      REQUIRED    User's full name
email           STRING      REQUIRED    Unique email address
password        STRING      REQUIRED    Plain text (TODO: hash with bcrypt)
roles           STRING[]    REPEATED    Array of Role ENUM values ["ADMIN", "FINANCE"]
created_at      TIMESTAMP   REQUIRED    Account creation timestamp
```

**Purpose of `roles` array:**
- Quick lookup: Which departments does this user belong to?
- Authorization: Check if user has required role
- Query optimization: Know exactly which department tables to query
- Single source of role membership

#### Department Tables (Department-Specific Data)
**Tables:** `admin`, `finance`, `learner`, `user`

Store department-specific data for users assigned to that department:
```
userId          STRING      REQUIRED    Foreign key to users.userId
privilege       STRING      REQUIRED    EDITOR or VIEWER
created_at      TIMESTAMP   REQUIRED    Department assignment timestamp
```

**All department tables follow the same schema pattern.**

**Future:** Can add department-specific fields:
- `learner` table: `coursesCompleted`, `lastActiveDate`
- `finance` table: `budgetLimit`, `approvalLevel`

### 3. Data Access Pattern

```typescript
// Step 1: Get user from users table
const user = await getUserById(userId);
// user.roles = ["ADMIN", "FINANCE"]

// Step 2: Query only relevant department tables
for (const role of user.roles) {
  const tableName = getRoleTableName(role); // "admin", "finance"
  const privilege = await getUserPrivilegeForRole(userId, role);
  const departmentData = await queryDepartmentTable(tableName, userId);
}

// Result: Complete user profile with all department-specific data
```

**Benefits:**
- No need to query all department tables
- Fast role checking (just read array)
- Scalable (add 100 departments, still efficient)

---

## Authorization System

### Two-Tier Authorization

#### Tier 1: Role-Based Access Control (RBAC)
**Check:** Does user have the required role?

```typescript
@Roles(Role.ADMIN)  // User must have ADMIN in their roles array
async adminOnlyEndpoint() { }
```

#### Tier 2: Privilege-Based Access Control (PBAC)
**Check:** Does user have the required privilege for that role?

```typescript
@Roles(Role.ADMIN)
@RequirePrivilege(Privilege.EDITOR)  // User must have EDITOR privilege in admin table
async adminEditorEndpoint() { }
```

**Privilege Levels:**
- `EDITOR` - Can read AND write (create, update, delete)
- `VIEWER` - Can only read (no modifications)

**Example:**
- User has `roles: ["ADMIN", "FINANCE"]`
- Admin table: `privilege = EDITOR`
- Finance table: `privilege = VIEWER`
- Result: Can edit admin data, but only view finance data

### Guards (Execution Order)

1. **AuthGuard** - Verifies user is logged in (JWT valid)
2. **RolesGuard** - Checks if user has required role(s)
3. **PrivilegeGuard** - Checks if user has required privilege for role(s)

---

## Project Structure

### Backend (`/backend`)

```
backend/
├── src/
│   ├── auth/                           # Authentication & Authorization
│   │   ├── auth.controller.ts         # 8 endpoints (login, register, CRUD users)
│   │   ├── auth.service.ts            # Business logic
│   │   ├── guards/                    # Authorization guards
│   │   │   ├── auth.guard.ts         # Basic auth check
│   │   │   ├── roles.guard.ts        # Role-based access
│   │   │   └── privilege.guard.ts    # Privilege-based access
│   │   ├── middleware/
│   │   │   └── jwt-auth.middleware.ts # JWT verification
│   │   └── decorators/
│   │       ├── roles.decorator.ts     # @Roles() decorator
│   │       ├── privilege.decorator.ts # @RequirePrivilege() decorator
│   │       └── current-user.decorator.ts # @CurrentUser() decorator
│   │
│   ├── bigquery/                      # Database layer
│   │   ├── bigquery.service.ts       # 13 database methods
│   │   ├── bigquery.module.ts        # NestJS module
│   │   ├── enums/
│   │   │   ├── roles.enum.ts         # Role ENUM (ANCHOR STONE)
│   │   │   └── privilege.enum.ts     # Privilege ENUM
│   │   ├── interfaces/
│   │   │   └── user.interface.ts     # TypeScript interfaces
│   │   └── schemas/                   # BigQuery table schemas
│   │       ├── users.schema.ts       # Users table
│   │       ├── admin.schema.ts       # Admin department table
│   │       ├── learner.schema.ts     # Learner department table
│   │       ├── finance.schema.ts     # Finance department table
│   │       └── user.schema.ts        # User department table
│   │
│   ├── dto/                           # Data Transfer Objects
│   │   └── auth/
│   │       ├── login.dto.ts
│   │       ├── register.dto.ts
│   │       ├── create-user.dto.ts
│   │       └── update-user.dto.ts
│   │
│   └── main.ts                        # Application entry point
│
├── scripts/
│   └── init-bigquery.js              # Database initialization script
│
├── test/                              # E2E tests
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
│
├── Dockerfile                         # Backend containerization
├── docker-compose.local.yml           # Local development setup
└── package.json
```

### Frontend (`/frontend`)

```
frontend/
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── page.tsx                  # Home page
│   │   ├── admin/
│   │   │   └── page.tsx              # Admin dashboard (user management)
│   │   └── auth/
│   │       ├── login/page.tsx        # Login page
│   │       └── register/page.tsx     # Register page
│   │
│   ├── components/
│   │   ├── ui/                        # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── table.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   └── auth/
│   │       └── ProtectedRoute.tsx    # Route protection wrapper
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx           # Authentication state management
│   │
│   ├── lib/
│   │   └── auth/
│   │       └── api.ts                # API client (fetch wrapper)
│   │
│   └── types/
│       └── auth.ts                    # TypeScript types (mirrors backend)
│
├── Dockerfile                         # Frontend containerization
└── package.json
```

---

## Key Features Implemented

### Admin Panel User Management
- ✅ Create users with multiple roles and privileges
- ✅ Edit user information (name, email, password optional)
- ✅ Edit user roles and privileges
- ✅ Delete users (with confirmation dialog)
- ✅ List all users with their privileges
- ✅ Filter users by department/role
- ✅ Privilege-based UI (VIEWER users see disabled buttons)

### Authentication & Authorization
- ✅ User registration (auto-assigns LEARNER role with VIEWER privilege)
- ✅ Login with JWT token generation
- ✅ Protected routes (client-side and server-side)
- ✅ Role-based access control (RBAC)
- ✅ Privilege-based access control (PBAC)
- ✅ Multi-role support (users can have multiple roles)

### Security Features
- ✅ JWT authentication with 7-day expiration
- ✅ Authorization guards (Auth, Roles, Privilege)
- ✅ Password excluded from API responses
- ✅ Self-deletion prevention (can't delete own account)
- ✅ Email uniqueness validation
- ⚠️ **TODO:** Password hashing (currently plain text!)

---

## API Endpoints

**Base URL:** `/api/v1`

All endpoints are prefixed with `/api/v1` for versioning and follow a departmental structure.

### Auth Endpoints (Authentication & Authorization)

**Public Endpoints (No Auth Required):**
- `POST /api/v1/auth/register` - User self-registration
- `POST /api/v1/auth/login` - User login

**Protected Endpoints (Auth Required):**
- `GET /api/v1/auth/me` - Get current user info
- `GET /api/v1/auth/roles` - Get available roles (dynamic from ENUM)
- `GET /api/v1/auth/privileges` - Get available privileges (dynamic from ENUM)

### Admin Endpoints (Admin Department)

**Admin Viewer Endpoints (ADMIN Role Required):**
- `GET /api/v1/admin/users` - List all users with privileges
- `GET /api/v1/admin/department/:role` - List users by department

**Admin Editor Endpoints (ADMIN Role + EDITOR Privilege Required):**
- `POST /api/v1/admin/create-user` - Create new user
- `PUT /api/v1/admin/users/:userId` - Update user
- `DELETE /api/v1/admin/users/:userId` - Delete user

---

## Database Initialization

### Local Development Setup

1. **Start BigQuery Emulator:**
```bash
docker-compose up bigquery-emulator
```

2. **Initialize Database:**
```bash
npm run init:bigquery
```

This creates:
- `test_dataset` dataset
- `users` table
- `admin`, `finance`, `learner`, `user` tables
- Seeds admin user: `admin@physioguidance.com` / `admin123`

3. **Start Backend:**
```bash
npm run start:dev
```

### Manual Initialization Script
**File:** `backend/scripts/init-bigquery.js`

- Creates all tables with schemas
- Idempotent (safe to run multiple times)
- Handles existing tables gracefully (409 errors)

---

## Planned Enhancements

### 1. ENUM-Driven Auto-Migration System (In Progress)
**Goal:** Make Role ENUM the true "anchor stone"

**Features:**
- ✅ Schema generator from ENUM
- 🚧 Startup validation (check all tables exist)
- 🚧 Auto-create missing tables on startup
- 🚧 Environment variable control (`AUTO_MIGRATE=true/false`)
- 🚧 Role deprecation system

**Benefit:** Add `CONSULTANT` to ENUM → `consultant` table auto-creates. Zero manual steps!

### 2. Comprehensive Test Suite (Planned)
- 🚧 Unit tests for all services, controllers, guards
- 🚧 E2E tests for all API endpoints
- 🚧 Target: 80%+ code coverage

### 3. Security Improvements (High Priority)
- ⚠️ Implement bcrypt password hashing
- ⚠️ Add password strength validation
- ⚠️ Add rate limiting for login attempts
- ⚠️ Add refresh token support

### 4. Department-Specific Features (Future)
- Add custom fields to department tables
- Department-specific dashboards
- Department-specific permissions

---

## Environment Variables

### Backend

```bash
# BigQuery Configuration
BIGQUERY_PROJECT_ID=test-project
BIGQUERY_DATASET_ID=test_dataset
BIGQUERY_EMULATOR_HOST=http://localhost:9050

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Auto-Migration (Future)
AUTO_MIGRATE=true  # Development only
TABLE_VALIDATION=strict  # strict/warn/disabled
```

### Frontend

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Common Development Tasks

### Add a New Role/Department

**Current (Manual):**
1. Add to `backend/src/bigquery/enums/roles.enum.ts`
2. Create schema in `backend/src/bigquery/schemas/newrole.schema.ts`
3. Update `backend/scripts/init-bigquery.js`
4. Run `npm run init:bigquery`

**Future (Automated):**
1. Add to `backend/src/bigquery/enums/roles.enum.ts`
2. Restart backend (table auto-creates)

### Create a New Admin User

**Option 1: Via API**
```bash
POST /auth/admin/create-user
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "roles": ["ADMIN"],
  "privileges": {
    "ADMIN": "EDITOR"
  }
}
```

**Option 2: Via Seed Script**
Edit `backend/scripts/init-bigquery.js` and add user data.

### Run Tests

```bash
# Backend unit tests
cd backend && npm test

# Backend E2E tests
cd backend && npm run test:e2e

# Frontend tests (not yet implemented)
cd frontend && npm test
```

---

## Troubleshooting

### "Table not found" errors
- **Cause:** BigQuery tables not initialized
- **Fix:** Run `npm run init:bigquery`

### "User not found" after login
- **Cause:** JWT middleware can't find user in database
- **Fix:** Check BigQuery connection, verify user exists in `users` table

### "Forbidden" errors on admin endpoints
- **Cause:** User lacks required role or privilege
- **Fix:** Check user's `roles` array and department table privileges

### Frontend shows "Network Error"
- **Cause:** Backend not running or CORS misconfigured
- **Fix:** Check backend is running on port 3001, verify CORS settings in `main.ts`

---

## Important Notes

### Current Limitations
1. **Passwords stored in plain text** - This is NOT production-ready! Needs bcrypt.
2. **No BigQuery transactions** - Role updates could partially fail
3. **No migration system** - Schema changes are manual
4. **No password reset flow** - Users can't reset forgotten passwords
5. **No email verification** - Anyone can register with any email

### Production Deployment Considerations
1. Use Google Cloud BigQuery (not emulator)
2. Implement password hashing before deployment
3. Set strong JWT_SECRET
4. Configure proper CORS origins
5. Add rate limiting
6. Set up proper logging and monitoring
7. Create production database tables manually (don't use emulator script)

---

## Git Branches

- `main` - Production-ready code
- `feat/auth` - Current working branch (auth features)
- `develop` - Development branch (future)

---

## Team Communication

### When Adding New Features
1. Check if Role ENUM needs updates
2. Consider authorization requirements (which roles/privileges?)
3. Update this CLAUDE.md file with new features
4. Add tests for new functionality
5. Update API documentation

### When Modifying Authorization
1. Review impact on existing endpoints
2. Test with both EDITOR and VIEWER privileges
3. Update frontend to handle new permissions
4. Document changes in this file

---

## Quick Reference

### Add User to Database
```typescript
await authService.createUserByAdmin({
  name: 'Alice',
  email: 'alice@example.com',
  password: 'password123',
  roles: [Role.ADMIN, Role.FINANCE],
  privileges: {
    [Role.ADMIN]: Privilege.EDITOR,
    [Role.FINANCE]: Privilege.VIEWER,
  }
});
```

### Check User Authorization
```typescript
// In any service/controller with access to user object
const hasAdminRole = user.roles.includes(Role.ADMIN);
const adminPrivilege = await bigQueryService.getUserPrivilegeForRole(user.userId, Role.ADMIN);
const canEdit = adminPrivilege === Privilege.EDITOR;
```

### Query Pattern
```typescript
// Get user with all privileges
const user = await authService.getAllUsers(); // Returns users with privileges populated

// Get users by specific department
const financeUsers = await authService.getUsersByDepartment(Role.FINANCE);
```

---

## Contact & Resources

- **Documentation:** This file (CLAUDE.md)
- **Docker Setup:** See DOCKER_SETUP.md
- **Issues:** Report at GitHub (if applicable)

---

**Last Updated:** 2025-01-25
**Architecture Version:** 1.0
**Status:** Active Development
