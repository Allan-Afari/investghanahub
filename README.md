# InvestGhanaHub 🇬🇭

Ghana's Premier Investment Platform - Fund crops, startups, and operational businesses across Ghana.

![InvestGhanaHub](https://img.shields.io/badge/Made%20with-❤️%20in%20Ghana-gold)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-20+-green)
![React](https://img.shields.io/badge/React-18.2-61DAFB)

## 📋 Features

- **User Authentication** - Register/Login with JWT authentication
- **KYC Verification** - Ghana Card-based identity verification with encryption
- **Business Registration** - Create and manage businesses (crops, startups, operational)
- **Investment Opportunities** - Browse and invest in verified opportunities
- **Portfolio Management** - Track investments and expected returns
- **Admin Dashboard** - Manage users, KYC approvals, and fraud detection
- **Audit Logs** - Complete compliance tracking
- **Fraud Detection** - Automated suspicious activity monitoring

## 🏗️ Tech Stack

### Backend
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcrypt
- **Security**: Helmet, Rate Limiting, Data Encryption

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **HTTP Client**: Axios
- **Routing**: React Router v6

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database running
- npm or yarn package manager

### 1. Clone and Setup

```bash
# Navigate to project directory
cd investment-cursor

# Setup Backend
cd backend
npm install

# Setup Frontend
cd ../frontend
npm install
```

### 2. Database Configuration

1. Create a PostgreSQL database:
```sql
CREATE DATABASE investghanahub;
```

2. Copy the environment example file:
```bash
cd backend
cp env.example.txt .env
```

3. Update `.env` with your database credentials:
```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/investghanahub"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
ENCRYPTION_KEY="your-32-character-encryption-key!"
```

### 3. Initialize Database

```bash
cd backend

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:push

# Seed the database with test data
npm run seed
```

### 4. Start the Application

**Backend (Terminal 1):**
```bash
cd backend
npm run dev
```
Backend runs on: http://localhost:5000

**Frontend (Terminal 2):**
```bash
cd frontend
npm run dev
```
Frontend runs on: http://localhost:5173

## 🔐 Test Accounts

After seeding, use these accounts to test:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@investghanahub.com | Admin@123 |
| **Investor** (KYC Approved) | kofi.mensah@email.com | Investor@123 |
| **Investor** (KYC Pending) | kwame.boateng@email.com | Investor@123 |
| **Business Owner** | akua.owusu@email.com | Owner@123 |

## 📁 Project Structure

```
investghanahub/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── seed.ts            # Seed data
│   ├── src/
│   │   ├── server.ts          # Server entry point
│   │   ├── app.ts             # Express app config
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   ├── middleware/        # Auth & fraud detection
│   │   └── utils/             # Encryption utilities
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx           # Entry point
│   │   ├── App.tsx            # Main app with routing
│   │   ├── pages/             # Page components
│   │   ├── components/        # Reusable components
│   │   └── utils/             # API utilities
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile

### KYC
- `POST /api/kyc/submit` - Submit KYC
- `GET /api/kyc/status` - Get KYC status
- `POST /api/kyc/:id/approve` - Approve KYC (admin)
- `POST /api/kyc/:id/reject` - Reject KYC (admin)

### Businesses
- `GET /api/businesses` - List approved businesses
- `POST /api/businesses` - Create business
- `GET /api/businesses/:id` - Get business details
- `POST /api/businesses/:id/opportunities` - Create opportunity

### Investments
- `GET /api/investments/opportunities` - List opportunities
- `POST /api/investments/invest` - Make investment
- `GET /api/investments/portfolio` - Get portfolio
- `GET /api/investments/history` - Investment history

### Admin
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/users` - List users
- `GET /api/admin/fraud-alerts` - Fraud alerts
- `GET /api/admin/audit-logs` - Audit logs

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - bcrypt with salt rounds
- **Ghana Card Encryption** - AES-256-GCM encryption
- **Rate Limiting** - Prevent abuse
- **Input Validation** - Express-validator
- **Fraud Detection** - Automated pattern detection
- **Audit Logging** - Complete action tracking
- **CORS & Helmet** - Security headers

## 🇬🇭 Ghana Compliance

- Ghana Card number validation (GHA-XXXXXXXXX-X)
- All 16 Ghana regions supported
- Ghana phone number validation (+233/0)
- KYC mandatory for investments
- Sensitive data encryption
- Complete audit trail

## 📝 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
PORT=5000
NODE_ENV=development
ENCRYPTION_KEY=32-character-key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
FRONTEND_URL=http://localhost:5173
```

## 🛠️ Development Commands

### Backend
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run prisma:studio # Open Prisma Studio
npm run seed         # Seed database
```

### Frontend
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

## 📄 License

MIT License - See LICENSE file for details.

---

Built with 💛 for Ghana's economic growth.

