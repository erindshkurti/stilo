# Complete Vercel Deployment Guide - Stilo App

## 📋 Prerequisites Checklist

Before starting, ensure you have:
- [ ] GitHub account
- [ ] Your code pushed to GitHub
- [ ] Firebase project created (with web app registered)
- [ ] Your Firebase configuration variables
- [ ] 10 minutes of time

---

## Step 1: Prepare Your GitHub Repository

### 1.1 Check Git Status
```bash
git status
```

### 1.2 Commit Any Pending Changes
```bash
# Add all changes
git add .

# Commit with a message
git commit -m "Prepare for Vercel deployment"
```

### 1.3 Push to GitHub
```bash
# If you haven't set up remote yet:
git remote add origin https://github.com/YOUR_USERNAME/stilo.git

# Push to main branch
git push -u origin main
```

**✅ Checkpoint:** Your code should now be visible on GitHub at `github.com/YOUR_USERNAME/stilo`

---

## Step 2: Create Vercel Account

### 2.1 Go to Vercel
1. Open browser and go to: **https://vercel.com**
2. Click **"Sign Up"** in the top right

### 2.2 Sign Up with GitHub
1. Click **"Continue with GitHub"**
2. Authorize Vercel to access your GitHub account
3. You'll be redirected to Vercel dashboard

**✅ Checkpoint:** You should see the Vercel dashboard with "Let's build something new"

---

## Step 3: Import Your Project

### 3.1 Start New Project
1. Click **"Add New..."** button (top right)
2. Select **"Project"**

### 3.2 Import Git Repository
1. You'll see "Import Git Repository" section
2. Find your **"stilo"** repository in the list
3. Click **"Import"** next to it

**If you don't see your repository:**
- Click "Adjust GitHub App Permissions"
- Grant Vercel access to your repositories
- Refresh the page

**✅ Checkpoint:** You should now see "Configure Project" screen

---

## Step 4: Configure Build Settings

### 4.1 Project Settings
You'll see a form with these fields:

**Project Name:**
```
stilo
```
(or choose your own name - this will be your URL: `stilo.vercel.app`)

**Framework Preset:**
```
Other
```
(Vercel will auto-detect, but select "Other" if needed)

### 4.2 Build and Output Settings

Click **"Build and Output Settings"** to expand.

**Build Command:**
```bash
npx expo export:web
```

**Output Directory:**
```
dist
```

**Install Command:**
```bash
npm install
```

**Root Directory:**
```
./
```
(leave as default)

### 4.3 Environment Variables

Click **"Environment Variables"** to expand.

Add the following variables exactly as they appear in your local `.env` file. You can find these in your Firebase Console under Project Settings -> General -> Your Apps.

1. **`EXPO_PUBLIC_FIREBASE_API_KEY`**
2. **`EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`**
3. **`EXPO_PUBLIC_FIREBASE_PROJECT_ID`**
4. **`EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`**
5. **`EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`**
6. **`EXPO_PUBLIC_FIREBASE_APP_ID`**

For all variables, select all Environments (Production, Preview, Development) and click Add.

**✅ Checkpoint:** You should have all 6 Firebase environment variables added

---

## Step 5: Deploy!

### 5.1 Click Deploy Button
1. Review your settings
2. Click the big blue **"Deploy"** button
3. Wait for deployment (usually 1-3 minutes)

### 5.2 Watch the Build Process
You'll see:
- ✓ Building...
- ✓ Deploying...
- ✓ Assigning Domain...

**✅ Checkpoint:** You should see "🎉 Congratulations!" when done

---

## Step 6: View Your Live Site

### 6.1 Click "Visit" Button
Your site is now live at:
```
https://stilo.vercel.app
```
(or whatever name you chose)

### 6.2 Test Your Site
- [ ] Homepage loads
- [ ] Search works
- [ ] Can browse businesses
- [ ] Sign in works (we'll configure this next)

**⚠️ Note:** Google OAuth sign-in will not work yet - we need to update the Firebase Authentication settings to allow your Vercel URL.

---

## Step 7: Configure Firebase for Your Vercel Domain

### 7.1 Go to Firebase Console
1. Open **[console.firebase.google.com](https://console.firebase.google.com)**
2. Go to your Stilo project
3. Click **Authentication** in the sidebar
4. Click **Settings** (tab at the top)
5. Click **Authorized domains**

### 7.2 Add Vercel Domain
1. Click **Add domain**
2. Enter your Vercel URL without the `https://`:
```
stilo.vercel.app
```
(use your actual Vercel URL)
3. Click **Add**

**✅ Checkpoint:** Google OAuth sign-in should now work flawlessly on your deployed site!

---

## Step 8: Set Up Custom Domain (Optional)

### 8.1 Go to Project Settings
1. In Vercel dashboard, click your project
2. Click **Settings** tab
3. Click **Domains** in sidebar

### 8.2 Add Custom Domain
1. Click **"Add"**
2. Enter your domain: `stilo.com` or `www.stilo.com`
3. Click **"Add"**

### 8.3 Configure DNS
Vercel will show you DNS records to add:

**For apex domain (stilo.com):**
```
Type: A
Name: @
Value: 76.76.21.21
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

Add these records in your domain registrar (GoDaddy, Namecheap, etc.)
*Don't forget to authorize your new custom domain in Firebase Authentication settings (Step 7) as well!*

**✅ Checkpoint:** Domain will be active in 24-48 hours (usually much faster)

---

## Step 9: Enable Automatic Deployments

### 9.1 How It Works
Vercel automatically deploys when you push to GitHub!

```bash
# Make a change
echo "// Updated" >> app/index.tsx

# Commit and push
git add .
git commit -m "Update homepage"
git push

# Vercel automatically deploys! 🚀
```

### 9.2 View Deployments
1. Go to your project in Vercel
2. Click **"Deployments"** tab
3. See all your deployments with preview URLs

**✅ Checkpoint:** Every git push triggers a new deployment

---

## 🎯 Quick Reference Commands

### Build Locally (Test Before Deploy)
```bash
# Build
npx expo export:web

# Test locally
npx serve dist
# Open http://localhost:3000
```

### Deploy via CLI (Alternative Method)
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Update Environment Variables
```bash
# Via CLI
vercel env add EXPO_PUBLIC_FIREBASE_API_KEY production
vercel env add EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN production
# ... repeat for all 6 variables

# Or via dashboard:
# Project → Settings → Environment Variables
```

---

## 🐛 Troubleshooting

### Build Fails: "Command not found: expo"
**Solution:** Vercel needs to install Expo
```bash
# Add to package.json scripts:
"build": "npx expo export:web"
```

### Environment Variables Not Working
**Solution:**
1. Ensure they start with `EXPO_PUBLIC_FIREBASE_`
2. Redeploy after adding variables
3. Check they're set for the correct "Production" environment

### Google OAuth Sign-In Error
**Solution:**
1. You did not authorize the Vercel domain.
2. Go to Firebase Console -> Authentication -> Settings -> Authorized domains.
3. Add `your-site.vercel.app` to the list.

### 404 on Page Refresh
**Solution:** Add `vercel.json` to your project:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Build Takes Too Long
**Solution:**
- Vercel free tier has 6000 build minutes/month
- Builds usually take 1-3 minutes
- Check build logs for errors

---

## 📊 What You Get with Vercel Free Tier

- ✅ Unlimited deployments
- ✅ Automatic HTTPS/SSL
- ✅ Global CDN (100+ locations)
- ✅ Preview deployments for PRs
- ✅ Analytics (basic)
- ✅ 100 GB bandwidth/month
- ✅ Custom domains
- ✅ Automatic git integration

---

## 🎉 You're Done!

Your Stilo app is now:
- ✅ Live on the internet
- ✅ Automatically deploys on git push
- ✅ Has HTTPS enabled
- ✅ Globally distributed via CDN
- ✅ Connected to your Firebase backend

**Your live URL:** `https://stilo.vercel.app`

### Next Steps:
1. Share your URL with users
2. Set up custom domain (optional)
3. Deploy your security rules (`npx firebase-tools deploy`)
4. Monitor analytics in Vercel dashboard
5. Keep building features!

---

## 📞 Need Help?

- **Vercel Docs:** https://vercel.com/docs
- **Expo Docs:** https://docs.expo.dev/distribution/publishing-websites/
- **Firebase Docs:** https://firebase.google.com/docs

Happy deploying! 🚀
