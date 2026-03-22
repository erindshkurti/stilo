# Stilo Web Deployment Guide

## 🚀 Hosting Options for Your Stilo Web App

Your Stilo app is built with Expo and can be deployed as a static web application. Here are the best hosting options:

---

## ⭐ Option 1: Vercel (Recommended)

**Best for:** Production deployments, automatic deployments, excellent performance

### Why Vercel?
- ✅ Free tier with generous limits
- ✅ Automatic deployments from GitHub
- ✅ Built-in SSL certificates
- ✅ Global CDN
- ✅ Excellent for React/Next.js apps (Expo web is React-based)
- ✅ Environment variable management
- ✅ Preview deployments for pull requests

### Deployment Steps:

#### 1. Prepare Your Project
```bash
# Build your web app
npx expo export:web

# This creates a 'dist' folder with your static files
```

#### 2. Install Vercel CLI (Optional)
```bash
npm install -g vercel
```

#### 3. Deploy via Vercel Dashboard (Easiest)

1. **Sign up at [vercel.com](https://vercel.com)**
2. **Connect your GitHub repository**
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect it's an Expo project

3. **Configure Build Settings:**
   - Framework Preset: `Other`
   - Build Command: `npx expo export:web`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Add Environment Variables:**
   - Go to Project Settings → Environment Variables
   - Add your complete set of `EXPO_PUBLIC_FIREBASE_*` variables from your `.env` file.

5. **Deploy!**
   - Click "Deploy"
   - Your app will be live at `your-project.vercel.app`

#### 4. Deploy via CLI (Alternative)
```bash
# From your project directory
vercel

# Follow the prompts
# Set environment variables when prompted
```

#### 5. Custom Domain (Optional)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. SSL certificate is automatic!

---

## 🌐 Option 2: Netlify

**Best for:** Simple deployments, form handling, serverless functions

### Why Netlify?
- ✅ Free tier available
- ✅ Drag-and-drop deployment
- ✅ Automatic SSL
- ✅ Global CDN
- ✅ Great for static sites

### Deployment Steps:

#### 1. Build Your App
```bash
npx expo export:web
```

#### 2. Deploy via Netlify Dashboard

1. **Sign up at [netlify.com](https://netlify.com)**
2. **Drag & Drop Deployment:**
   - Drag your `dist` folder to Netlify dashboard
   - Or connect GitHub repository

3. **Configure Build (if using GitHub):**
   - Build command: `npx expo export:web`
   - Publish directory: `dist`

4. **Environment Variables:**
   - Site Settings → Environment Variables
   - Add your 6 Firebase credentials

5. **Deploy!**
   - Your site is live at `your-site.netlify.app`

#### 3. Create `netlify.toml` (Optional)
```toml
[build]
  command = "npx expo export:web"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## 📱 Option 3: Expo Hosting (EAS)

**Best for:** Expo-native deployments, mobile + web combo

### Why EAS?
- ✅ Official Expo solution
- ✅ Integrated with Expo ecosystem
- ✅ Handles both web and mobile builds
- ✅ Easy updates

### Deployment Steps:

#### 1. Install EAS CLI
```bash
npm install -g eas-cli
```

#### 2. Login to Expo
```bash
eas login
```

#### 3. Configure EAS
```bash
eas build:configure
```

#### 4. Update `app.json`
```json
{
  "expo": {
    "web": {
      "bundler": "metro"
    }
  }
}
```

#### 5. Build and Deploy
```bash
# Build for web
eas build --platform web

# Or use Expo's hosting
npx expo export:web
# Then upload to Expo hosting
```

---

## 🔧 Pre-Deployment Checklist

### 1. Environment Variables
- [ ] All 6 `EXPO_PUBLIC_FIREBASE_*` variables are set
- [ ] Never commit `.env` file!

### 2. Build Configuration
```json
// app.json
{
  "expo": {
    "web": {
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    }
  }
}
```

### 3. Firebase Configuration
- [ ] Deploy security Rules via `npx firebase-tools deploy`
- [ ] Add your deployment URL to Firebase Auth "Authorized domains"

**In Firebase Console:**
1. Go to Authentication → Settings → Authorized domains
2. Add your new web domain (e.g. `your-domain.vercel.app`)
3. Ensure Google Sign-In recognizes the new origin

### 4. Test Build Locally
```bash
# Build
npx expo export:web

# Serve locally to test
npx serve dist

# Open http://localhost:3000
```

---

## 🚀 Quick Start: Deploy to Vercel Now

### Method 1: One-Click Deploy
1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Add environment variables
5. Click Deploy!

### Method 2: CLI Deploy
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd /path/to/stilo
vercel

# Deploy to production
vercel --prod
```

---

## 📊 Hosting Comparison

| Feature | Vercel | Netlify | EAS |
|---------|--------|---------|-----|
| Free Tier | ✅ Generous | ✅ Good | ✅ Limited |
| Auto Deploy | ✅ | ✅ | ⚠️ Manual |
| Custom Domain | ✅ Free | ✅ Free | ✅ |
| SSL | ✅ Auto | ✅ Auto | ✅ Auto |
| CDN | ✅ Global | ✅ Global | ✅ |
| Build Time | Fast | Fast | Slower |
| Best For | Production | Static Sites | Expo Apps |

**Recommendation:** Use **Vercel** for the best experience.

---

## 🔒 Post-Deployment Security

### 1. Update Firebase Authorized Domains
If you do not register your production URL with Firebase, users will be instantly blocked from logging in with Google. Add your URL under Firebase Auth settings!

### 2. Configure CORS (if needed)
Firebase handles CORS automatically, but verify your domain is allowed.

### 3. Enable HTTPS
All recommended platforms provide automatic HTTPS.

---

## 🐛 Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules .expo dist
npm install
npx expo export:web
```

### Environment Variables Not Working
- Ensure they start with `EXPO_PUBLIC_FIREBASE_`
- Rebuild after adding variables
- Check platform-specific variable syntax

### OAuth Not Working (Google Sign In Fails)
- You MUST add your URL to Firebase Auth Authorized Domains!
- Double check that you've put `stilo.vercel.app` (without https:// or wildcards).

### 404 Errors on Refresh
Add this to `netlify.toml` or Vercel config:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## 📈 Next Steps After Deployment

1. **Monitor Performance**
   - Set up analytics (Google Analytics, Vercel Analytics)

2. **Set Up CI/CD**
   - Automatic deployments on git push
   - Preview deployments for PRs

3. **Custom Domain**
   - Purchase domain (Namecheap, Google Domains)
   - Configure DNS
   - SSL is automatic!

---

## 🎉 You're Ready to Deploy!

**Recommended Quick Start:**
1. Push code to GitHub
2. Sign up for Vercel
3. Import repository
4. Add environment variables
5. Deploy!

Your app will be live in minutes! 🚀
