# 🚀 SwachhGrid — Deployment Guide

Deploying the full stack:
- **Backend** → [Render.com](https://render.com) (free, supports WebSockets / Socket.io)
- **Frontend** → [Vercel](https://vercel.com) (free, perfect for Next.js)
- **Database** → Already on Neon ✅

---

## Step 1 — Push to GitHub

Open a terminal in the project root and run:

```bash
git init
git add .
git commit -m "initial commit"
```

Then create a new repository at [github.com/new](https://github.com/new) and push:

```bash
git remote add origin https://github.com/YOUR_USERNAME/swachh-grid.git
git branch -M main
git push -u origin main
```

> ⚠️ Make sure `.gitignore` is committed — it prevents your `.env` files and `node_modules` from being uploaded.

---

## Step 2 — Deploy Backend to Render

1. Go to **[render.com](https://render.com)** → Sign up / Log in with GitHub
2. Click **New → Web Service**
3. Connect your GitHub repo (`swachh-grid`)
4. Fill in these settings:

| Setting | Value |
|---|---|
| **Name** | `swachhgrid-backend` |
| **Root Directory** | `server` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free |

5. Scroll down to **Environment Variables** and add:

| Key | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string (from neon.tech dashboard) |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | *(leave blank for now — fill in after Step 3)* |

6. Click **Create Web Service**
7. Wait ~2 min for it to build and deploy
8. Copy the URL it gives you → looks like `https://swachhgrid-backend.onrender.com`

---

## Step 3 — Deploy Frontend to Vercel

1. Go to **[vercel.com](https://vercel.com)** → Sign up / Log in with GitHub
2. Click **Add New → Project**
3. Import your GitHub repo (`swachh-grid`)
4. Set the **Root Directory** to `client`
5. Vercel auto-detects Next.js ✅
6. Scroll to **Environment Variables** and add:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | `pk.eyJ1...` *(your actual Mapbox public token from mapbox.com)* |
| `NEXT_PUBLIC_SOCKET_URL` | The Render URL from Step 2 e.g. `https://swachhgrid-backend.onrender.com` |

7. Click **Deploy**
8. Wait ~1 min → Vercel gives you a URL like `https://swachh-grid.vercel.app`

---

## Step 4 — Wire Backend CORS to Frontend URL

Now that you have both URLs:

1. Go back to **Render dashboard** → your backend service
2. Click **Environment** tab
3. Add/update:

| Key | Value |
|---|---|
| `FRONTEND_URL` | `https://swachh-grid.vercel.app` *(your actual Vercel URL)* |

4. Click **Save Changes** → Render will redeploy automatically

---

## Step 5 — Test Production

Open your Vercel URL and verify:
- ✅ Landing page loads at `/landing`
- ✅ Dashboard map shows bins at `/`
- ✅ Bins update in real time (Socket.io connected)
- ✅ "Mark as Critical" button redraws routes live
- ✅ Report form submits at `/report`
- ✅ Admin panel shows reports at `/admin`
- ✅ Driver selects truck at `/driver`

> **Note:** Render free tier **spins down** after 15 minutes of inactivity. First request after idle takes ~30 seconds to wake up. This is normal on the free plan.

---

## Environment Variables Summary

### `server/.env` (local dev only — never commit)
```env
DATABASE_URL=postgresql://...@neon.tech/swachhgrid?sslmode=require
PORT=3001
```

### `client/.env.local` (local dev only — never commit)
```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...your-token...
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### Render (production)
```
DATABASE_URL = <Neon connection string>
NODE_ENV     = production
FRONTEND_URL = https://your-app.vercel.app
```

### Vercel (production)
```
NEXT_PUBLIC_MAPBOX_TOKEN = pk.eyJ1...your-token...
NEXT_PUBLIC_SOCKET_URL   = https://swachhgrid-backend.onrender.com
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Socket.io not connecting | Check `NEXT_PUBLIC_SOCKET_URL` in Vercel env vars points to Render URL |
| CORS error in browser console | Make sure `FRONTEND_URL` in Render matches your Vercel URL exactly |
| Render deploy fails | Check Render logs — usually a missing env var or wrong root directory |
| Map not loading | Check `NEXT_PUBLIC_MAPBOX_TOKEN` in Vercel env vars |
| Bins not updating | Backend may be sleeping (free tier) — wait 30s and refresh |

---

*Deployment takes about 10–15 minutes total.* 🚀
