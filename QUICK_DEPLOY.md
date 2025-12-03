# 🚀 Quick Deployment Guide - InvestGhanaHub

## ✅ Step 1: Deploy Backend to Railway (FREE)

### 1.1 Create Railway Account
1. Go to **[railway.app](https://railway.app/)**
2. Click **"Start a New Project"**
3. Sign up with **GitHub** (use your Allan-Afari account)
4. Authorize Railway to access your GitHub

### 1.2 Deploy Backend
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Find and select **`Allan-Afari/investghanahub`**
4. Click **"Deploy Now"**
5. Railway will detect it's a Node.js app

### 1.3 Set Root Directory
1. Click on your service
2. Go to **Settings** → **Root Directory**
3. Set to: `backend`
4. Save

### 1.4 Add PostgreSQL Database
1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway creates a PostgreSQL instance automatically

### 1.5 Add Environment Variables
1. Click on your **backend service** (not the database)
2. Go to **Variables** tab
3. Click **"+ New Variable"** and add these one by one:

```env
# Database (Railway auto-generates this - click "Add Reference" on Postgres service)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# JWT & Security
JWT_SECRET=your-super-secure-jwt-secret-min-32-characters-long
JWT_EXPIRES_IN=24h
NODE_ENV=production
ENCRYPTION_KEY=your-32-character-encryption-key

# Frontend URL (we'll update this after deploying frontend)
FRONTEND_URL=https://investghanahub.vercel.app

# Email (Your Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=allanamoah94@gmail.com
SMTP_PASS=xeofghxfncgdqwxk

# Paystack (Your keys)
PAYSTACK_SECRET_KEY=sk_test_fcc0693fc07ac3bb4acea2949970061a94d9b05e
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx

# Cloudinary (Your keys)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=678yhd5WHwLCl1fr-qLH31UmTVg

# Hubtel SMS (Optional - leave empty if not using)
HUBTEL_CLIENT_ID=
HUBTEL_CLIENT_SECRET=
HUBTEL_SENDER_ID=InvestGH
```

**Important:** 
- For `DATABASE_URL`, click **"Add Reference"** on the Postgres service instead of typing it
- Generate secure keys for `JWT_SECRET` and `ENCRYPTION_KEY` (see below)

### 1.6 Generate Secure Keys
Run these in PowerShell to generate secure keys:

```powershell
# JWT Secret (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Encryption Key (exactly 32 characters)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

Copy the output and use as your keys.

### 1.7 Deploy & Get URL
1. Railway will auto-deploy when you add variables
2. Wait for deployment to complete (green checkmark)
3. Click **Settings** → **Domains**
4. Note your Railway URL: `https://investghanahub-backend.railway.app` (or similar)

### 1.8 Run Database Migrations
1. Go to your backend service
2. Click **"Deployments"** tab
3. Click the three dots on latest deployment → **"View Logs"**
4. Or go to **Settings** → **Shell**
5. Run:
```bash
npx prisma db push
npm run seed
```

---

## ✅ Step 2: Deploy Frontend to Vercel (FREE)

### 2.1 Create Vercel Account
1. Go to **[vercel.com](https://vercel.com/)**
2. Click **"Sign Up"**
3. Sign up with **GitHub** (use your Allan-Afari account)
4. Authorize Vercel

### 2.2 Import Project
1. Click **"Add New"** → **"Project"**
2. Find **`Allan-Afari/investghanahub`** repository
3. Click **"Import"**

### 2.3 Configure Project
1. **Framework Preset:** Vite
2. **Root Directory:** `frontend`
3. **Build Command:** `npm run build` (auto-detected)
4. **Output Directory:** `dist` (auto-detected)

### 2.4 Add Environment Variable
1. Scroll down to **"Environment Variables"**
2. Click **"+ Add"**
3. Add:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://your-railway-backend-url.railway.app/api`
   - Replace with your actual Railway backend URL from Step 1.7

### 2.5 Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes for build
3. Vercel will show your live URL: `https://investghanahub.vercel.app`

### 2.6 Update Backend CORS
1. Go back to Railway
2. Update `FRONTEND_URL` variable to your Vercel URL
3. Railway will auto-redeploy

---

## ✅ Step 3: Test Your Live App!

1. Visit your Vercel URL
2. Try registering a new account
3. Test login
4. Check if everything works!

---

## 🎉 Success!

Your app is now live at:
- **Frontend:** `https://investghanahub.vercel.app`
- **Backend:** `https://investghanahub-backend.railway.app`

---

## 📝 Next Steps (Optional)

1. **Buy a Domain** (e.g., `investghanahub.com`) - ~$10/year
2. **Add Custom Domain** to Vercel
3. **Switch to Live Paystack Keys** (for real payments)
4. **Set up Monitoring** (Sentry, LogRocket)

---

## 🆘 Need Help?

If you get stuck:
1. Check Railway logs (Settings → Logs)
2. Check Vercel build logs
3. Verify all environment variables are set correctly

