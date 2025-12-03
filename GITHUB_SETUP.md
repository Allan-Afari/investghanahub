# 📦 Push to GitHub - Quick Guide

## Step 1: Create GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **"+"** icon → **"New repository"**
3. Repository name: `investghanahub`
4. Description: `Investment platform for Ghana`
5. Make it **Private** (or Public if you want)
6. **DO NOT** initialize with README, .gitignore, or license
7. Click **"Create repository"**

## Step 2: Copy Your Repository URL

After creating, GitHub will show you commands. Copy the URL that looks like:
```
https://github.com/YOUR-USERNAME/investghanahub.git
```

## Step 3: Connect and Push

Run these commands in PowerShell (in your project folder):

```powershell
# Refresh PATH (if needed)
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Rename branch to main
git branch -M main

# Add your GitHub repository (replace YOUR-USERNAME with your actual GitHub username)
git remote add origin https://github.com/YOUR-USERNAME/investghanahub.git

# Push to GitHub
git push -u origin main
```

## Step 4: Verify

Go back to GitHub and refresh - you should see all your files! 🎉

---

## 🚀 Next: Deploy to Production

Once your code is on GitHub, follow `DEPLOYMENT.md` to deploy to Railway and Vercel!

