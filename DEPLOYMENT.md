# PrepPulse: Production Deployment Guide 🚀

This guide provides step-by-step instructions for deploying PrepPulse using the recommended production stack:
- **Database:** MongoDB Atlas (Free M0 Cluster)
- **Backend API:** Render (Web Service)
- **Frontend App:** Vercel (Static SPA)

---

## Architecture Overview

```text
┌────────────────────────┐
│  Vercel (React + Vite) │
│  https://app.vercel.app│
└───────────┬────────────┘
            │ HTTPS REST API requests (VITE_API_URL)
            ▼
┌────────────────────────┐
│  Render (Express API)  │
│  https://api.onrender  │
└───────────┬────────────┘
            │ TLS / SCRAM-SHA-256
            ▼
┌────────────────────────┐
│  MongoDB Atlas (Cloud) │
│  mongodb+srv://...     │
└────────────────────────┘
```

---

## Step 1: Set Up MongoDB Atlas

1. **Sign Up / Log In:**
   Go to [MongoDB Atlas](https://www.mongodb.com/atlas) and log in or create a free account.
2. **Create a Free Cluster:**
   - Choose the free **M0 Shared Tier** (AWS, Google Cloud, or Azure in your preferred region, e.g., Mumbai `ap-south-1`).
   - Click **Create Deployment**.
3. **Configure Database Access (User):**
   - In Atlas left navigation, go to **Security** → **Database Access**.
   - Click **Add New Database User**.
   - Choose **Password** authentication.
   - Enter a username (e.g. `preppulse_admin`) and generate a strong password. Save this password securely.
   - Under **Database User Privileges**, select **Read and write to any database**.
   - Click **Add User**.
4. **Configure Network Access (Firewall):**
   - Go to **Security** → **Network Access**.
   - Click **Add IP Address**.
   - Click **Allow Access from Anywhere** (`0.0.0.0/0`) because Render's free tier uses dynamic egress IPs.
   - Click **Confirm**.
5. **Obtain Connection String:**
   - Go to **Deployments** → **Database**.
   - Click **Connect** next to your cluster.
   - Select **Drivers** (Node.js).
   - Copy the connection string. It will look like:
     ```text
     mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/preppulse?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your database user password and specify `/preppulse` as the database name.

---

## Step 2: Seed the Remote Database

Load the curated questions into your remote Atlas database before launching the web service:

1. Open a terminal on your development machine.
2. Navigate to the `server/` directory:
   ```bash
   cd server
   ```
3. Run the seed script passing your Atlas connection string:
   ```bash
   MONGO_URI="mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/preppulse?retryWrites=true&w=majority" npm run seed
   ```
4. Verify the output summary shows ~198 approved questions inserted into Atlas.
   *(Note: The seed script uses idempotent upsert matching question text, so it is safe to re-run anytime).*

---

## Step 3: Deploy Backend on Render

> [!NOTE]
> **Render Free Tier Spin-Down:**
> Render's free web services automatically spin down (sleep) after 15 minutes of inactivity. When a new request arrives, cold starts take approximately 30–50 seconds before the service responds. Once awake, subsequent requests respond immediately.

### Option A: Using the Render Blueprint (`render.yaml`)

1. Log into [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** → **Blueprint**.
3. Select your `PrepPulse` GitHub repository.
4. Render will parse `render.yaml`. Click **Apply**.
5. Fill in the required environment variables marked with `sync: false`.

### Option B: Manual Web Service Setup

1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your `PrepPulse` GitHub repository.
3. Configure settings:
   - **Name:** `preppulse-api`
   - **Language:** `Node`
   - **Region:** Nearest to your database (e.g., Singapore / Frankfurt)
   - **Branch:** `main`
   - **Root Directory:** `server`
   - **Build Command:** `npm ci`
   - **Start Command:** `npm start`
   - **Plan:** `Free`
4. Under **Advanced**, set **Health Check Path** to:
   ```text
   /api/v1/health
   ```
5. Add the following **Environment Variables**:
   | Variable | Value | Notes |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production security & logging policies |
   | `PORT` | `5000` | Port for Express service |
   | `MONGO_URI` | `mongodb+srv://<username>:<password>@...` | Your MongoDB Atlas connection string |
   | `JWT_SECRET` | *(Random 32+ character string)* | e.g. run `openssl rand -hex 24` |
   | `JWT_EXPIRES_IN` | `7d` | Token lifetime |
   | `CLIENT_URL` | `https://<your-app>.vercel.app` | Vercel production frontend URL (and preview URLs separated by commas) |
6. Click **Create Web Service**. Wait for the deployment to finish.
7. Test the health endpoint: `https://<render-url>.onrender.com/api/v1/health` (should return `{"status":"ok"}`).

---

## Step 4: Deploy Frontend on Vercel

1. Log into [Vercel](https://vercel.com/).
2. Click **Add New...** → **Project**.
3. Import your `PrepPulse` GitHub repository.
4. Configure the project:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click edit and select `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Under **Environment Variables**, add:
   | Variable | Value | Notes |
   |---|---|---|
   | `VITE_API_URL` | `https://<your-render-url>.onrender.com/api/v1` | Points to your live Render backend (must include `/api/v1`) |
6. Click **Deploy**.
7. Once deployed, copy your production Vercel URL (e.g. `https://preppulse.vercel.app`).
8. Return to your **Render Web Service** → **Environment Variables** and update `CLIENT_URL` with your actual Vercel URL.

> [!TIP]
> `client/vercel.json` already contains single-page application (SPA) rewrite rules to route all subpaths (`/dashboard`, `/daily`, `/questions`, `/practice/:id`) to `/index.html` on browser refresh.

---

## Step 5: Post-Deployment Verification Checklist

After deploying both services, walk through this checklist:

- [ ] **Health Check:** Open `https://<your-render-url>.onrender.com/api/v1/health` in a browser. Confirms `{"status":"ok"}`.
- [ ] **Landing Page:** Visit your Vercel URL. Check that navbar displays `API Online`.
- [ ] **Registration:** Sign up with a new account. Confirms JWT generation and password hashing.
- [ ] **Navbar Streak Badge:** Confirm the flame badge shows `0` with `best: 0`.
- [ ] **Browse Questions:** Go to `/questions`. Verify that seeded questions load, filter by category/difficulty, and search queries work.
- [ ] **Bookmark Question:** Click the bookmark icon on any question and check `/bookmarks` to verify persistence.
- [ ] **Practice Mode:** Open a question in `/practice/:id`. Test MCQ selection or "Show Answer" self-rating (`Knew it`, `Partly`, `Missed it`).
- [ ] **Daily Challenge:** Go to `/daily`. Start the challenge, complete all 5 questions, and verify that the **Streak Extended! (Day 1)** milestone banner appears.
- [ ] **WeekCalendar:** Check that today is filled with a checkmark on the 7-day activity calendar.
- [ ] **Instant Navbar Sync:** Confirm the flame badge in the navbar updates to `1` without manual page reload.
- [ ] **Hard Refresh Test:** Press browser reload on `/daily` and `/dashboard` to verify that Vercel SPA rewrites work without returning 404.
