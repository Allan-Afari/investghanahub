# Railway Deploy Steps for InvestGhanaHub Backend

## 1) Create Railway Project + Service
1. Go to https://railway.app
2. Click **New Project** -> **Deploy from GitHub repo**
3. Choose your repo: `Allan-Afari/investghanahub`
4. Set **Root Directory**: `backend` (important, because Dockerfile is in backend/)
5. Click **Add Variables** and set the required environment variables (see below)
6. Click **Deploy**

## 2) Add a PostgreSQL Database
1. In your Railway project, click **+ New Service**
2. Choose **PostgreSQL** (starter plan is free)
3. Once created, click the PostgreSQL service -> **Variables** tab
4. Copy the `DATABASE_URL` value

## 3) Set Environment Variables on the Backend Service
In your backend service on Railway, go to **Variables** and set:

```
NODE_ENV=production
DATABASE_URL=<paste the DATABASE_URL from your PostgreSQL service>
JWT_SECRET=your-super-long-random-jwt-secret-string
ENCRYPTION_KEY=your-32-char-random-encryption-key
FRONTEND_URL=capacitor://localhost
```

Optional (for Paystack later):
```
PAYSTACK_SECRET_KEY=...
PAYSTACK_PUBLIC_KEY=...
```

## 4) Redeploy
After adding the database and env vars, click **Deploy** again on the backend service.

## 5) Get the HTTPS URL
Once deployed, Railway will give you a public URL like:
`https://<project-name>-<random>.up.railway.app`

Your API base URL will be:
`https://<project-name>-<random>.up.railway.app/api`

## 6) Verify Health Endpoint
Visit in browser or curl:
`https://<project-name>-<random>.up.railway.app/health`

You should see a success response.

## 7) Update Frontend VITE_API_URL
In your frontend `.env`:
```
VITE_API_URL=https://<project-name>-<random>.up.railway.app/api
```

Then rebuild the web and APK.
