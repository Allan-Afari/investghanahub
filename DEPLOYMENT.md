# 🚀 InvestGhanaHub Deployment Guide

Complete guide to deploy InvestGhanaHub to production.

---

## 📋 Table of Contents

1. [Railway (Backend)](#railway-backend)
2. [Vercel (Frontend)](#vercel-frontend)
3. [Database Setup](#database-setup)
4. [Environment Variables](#environment-variables)
5. [Domain & SSL](#domain--ssl)
6. [Post-Deployment](#post-deployment)

---

## 🚂 Railway (Backend)

Railway is the easiest way to deploy the backend.

### Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app/)
2. Sign up with GitHub

### Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Connect your GitHub account
4. Select the `investghanahub` repository
5. Select the `backend` folder as root directory

### Step 3: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway will create a PostgreSQL instance

### Step 4: Configure Environment Variables

Click on your service → **"Variables"** → Add these:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars
JWT_EXPIRES_IN=24h
NODE_ENV=production
ENCRYPTION_KEY=your-32-character-encryption-key!
FRONTEND_URL=https://your-frontend-domain.vercel.app

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Paystack
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Hubtel SMS (Optional)
HUBTEL_CLIENT_ID=your-client-id
HUBTEL_CLIENT_SECRET=your-client-secret
HUBTEL_SENDER_ID=InvestGH
```

### Step 5: Deploy

1. Railway will auto-deploy when you push to GitHub
2. Click **"Settings"** → Note your Railway URL (e.g., `https://investghanahub-backend.railway.app`)

### Step 6: Run Migrations

In Railway, go to your service → **"Shell"** and run:

```bash
npx prisma db push
npm run seed
```

---

## ▲ Vercel (Frontend)

### Step 1: Create Vercel Account

1. Go to [vercel.com](https://vercel.com/)
2. Sign up with GitHub

### Step 2: Import Project

1. Click **"Add New"** → **"Project"**
2. Import your GitHub repository
3. Set **Root Directory** to `frontend`
4. Framework: **Vite**

### Step 3: Configure Environment Variables

Add this environment variable:

```env
VITE_API_URL=https://your-railway-backend-url.railway.app/api
```

### Step 4: Deploy

1. Click **"Deploy"**
2. Vercel will build and deploy automatically
3. Note your Vercel URL (e.g., `https://investghanahub.vercel.app`)

### Step 5: Update Backend CORS

Go back to Railway and update:

```env
FRONTEND_URL=https://investghanahub.vercel.app
```

---

## 🗄️ Database Setup

### Option A: Railway PostgreSQL (Recommended)

- Already included when you add PostgreSQL in Railway
- Automatic backups
- Easy management

### Option B: Supabase (Free tier available)

1. Create account at [supabase.com](https://supabase.com/)
2. Create new project
3. Go to **Settings** → **Database**
4. Copy the connection string
5. Use in `DATABASE_URL`

### Option C: Neon (Serverless PostgreSQL)

1. Create account at [neon.tech](https://neon.tech/)
2. Create new project
3. Copy connection string

---

## 🔐 Environment Variables

### Production Checklist

| Variable | Where to Get | Required |
|----------|--------------|----------|
| `DATABASE_URL` | Railway/Supabase | ✅ |
| `JWT_SECRET` | Generate random 32+ chars | ✅ |
| `ENCRYPTION_KEY` | Generate random 32 chars | ✅ |
| `FRONTEND_URL` | Your Vercel URL | ✅ |
| `SMTP_USER` | Your Gmail | ✅ |
| `SMTP_PASS` | Gmail App Password | ✅ |
| `PAYSTACK_SECRET_KEY` | Paystack Dashboard | ✅ |
| `CLOUDINARY_*` | Cloudinary Dashboard | ✅ |
| `HUBTEL_*` | Hubtel Dashboard | Optional |

### Generate Secure Keys

Run this in terminal to generate secure keys:

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Encryption Key (exactly 32 characters)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

---

## 🌐 Domain & SSL

### Custom Domain on Vercel

1. Go to your Vercel project
2. **Settings** → **Domains**
3. Add your domain (e.g., `investghanahub.com`)
4. Update DNS records at your registrar

### Custom Domain on Railway

1. Go to your Railway service
2. **Settings** → **Domains**
3. Add custom domain
4. Update DNS records

### SSL Certificates

- **Vercel**: Automatic SSL (free)
- **Railway**: Automatic SSL (free)

---

## ✅ Post-Deployment Checklist

### 1. Test All Features

- [ ] User registration
- [ ] User login
- [ ] KYC submission
- [ ] Admin approval
- [ ] Wallet deposit
- [ ] Investment flow
- [ ] Email notifications
- [ ] Password reset

### 2. Security

- [ ] Change all test API keys to live keys
- [ ] Enable Paystack live mode
- [ ] Set secure JWT_SECRET
- [ ] Test rate limiting

### 3. Monitoring

- [ ] Set up error tracking (Sentry)
- [ ] Set up uptime monitoring
- [ ] Set up database backups

### 4. Legal

- [ ] Update Terms of Service
- [ ] Update Privacy Policy
- [ ] Add contact information

---

## 🔧 Troubleshooting

### Common Issues

**1. Database connection failed**
- Check DATABASE_URL is correct
- Ensure database is running
- Check firewall/network settings

**2. CORS errors**
- Update FRONTEND_URL in backend env
- Ensure URLs don't have trailing slashes

**3. Paystack errors**
- Verify you're using correct keys (test vs live)
- Check account is verified

**4. Emails not sending**
- Verify Gmail App Password
- Check spam folder
- Ensure 2FA is enabled on Gmail

---

## 📞 Support

For deployment help:
- Email: support@investghanahub.com
- Documentation: https://docs.investghanahub.com

---

## 🎉 Success!

Once deployed, your app will be live at:

- **Frontend**: `https://investghanahub.vercel.app`
- **Backend API**: `https://investghanahub-backend.railway.app`
- **Custom Domain**: `https://investghanahub.com`

Congratulations! 🇬🇭 InvestGhanaHub is now live!

