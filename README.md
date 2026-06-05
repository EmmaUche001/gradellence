# School Result Management System (SRMS)

A production-grade multi-tenant SaaS platform for schools to manage academic results.

## Tech Stack

### Backend
- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT Authentication
- RBAC Authorization

### Frontend
- React
- Vite
- TypeScript
- Tailwind CSS
- React Router
- TanStack Query
- Zustand
- React Hook Form
- Zod

## Project Structure

```
srms/
├── server/                 # Backend (NestJS)
│   ├── prisma/            # Database schema and migrations
│   ├── src/
│   │   ├── common/        # Shared utilities, guards, decorators
│   │   ├── config/        # Configuration
│   │   ├── database/      # Database module
│   │   ├── modules/       # Feature modules
│   │   │   ├── auth/
│   │   │   ├── schools/
│   │   │   ├── users/
│   │   │   └── ...
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── test/
│
├── client/                # Frontend (React)
│   ├── src/
│   │   ├── app/           # App component
│   │   ├── components/    # Shared components
│   │   ├── features/      # Feature modules
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   └── ...
│   │   ├── layouts/       # Layout components
│   │   ├── routes/        # Route definitions
│   │   ├── services/      # API services
│   │   ├── store/         # Zustand stores
│   │   └── types/         # TypeScript types
│   └── public/
│
└── docs/                  # Documentation
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Docker (optional)

### Backend Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your database credentials and JWT secrets.

5. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

6. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

7. Start the development server:
   ```bash
   npm run start:dev
   ```

### Frontend Setup

1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Docker Setup

1. Start all services:
   ```bash
   docker-compose up -d
   ```

2. Run migrations:
   ```bash
   docker-compose exec backend npx prisma migrate dev
   ```

## API Documentation

Once the backend is running, API documentation is available at:
```
http://localhost:3000/api/docs
```

## Development Phases

### Phase 1 - Foundation ✅
- Project setup
- Authentication system
- RBAC foundation
- School management
- User management

### Phase 2 - Academic Core (Next)
- Students module
- Teachers module
- Classes module
- Subjects module
- Sessions and terms

### Phase 3 - Result System
- Assessments
- Grading system
- Result computation
- Result publishing

### Phase 4 - Reporting
- Report cards
- Broadsheets
- Transcripts

### Phase 5 - SaaS Features
- Subscriptions
- Billing
- Onboarding

### Phase 6 - Advanced Features
- Analytics
- Notifications
- Parent portal
- QR verification

## License

UNLICENSED - Proprietary software.