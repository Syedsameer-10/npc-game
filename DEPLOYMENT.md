# Deploying NPC Behavior Compiler on Render

This guide walks you through deploying both the **FastAPI Backend** and the **React + Vite Frontend** on [Render.com](https://render.com).

---

## ⚡ Deployment Architectures

You have two options on Render:

| Architecture | Services Used | Advantages | Ideal For |
| :--- | :--- | :--- | :--- |
| **Method 1: Unified Web Service** *(Recommended)* | **1 Web Service** (Docker or Native Python) | Single URL, zero CORS problems, fast setup, uses only 1 free web service slot. | Quickest & easiest deployment |
| **Method 2: Separate Services** | **1 Web Service** (API) + **1 Static Site** (Vite UI) | Static UI has instant CDN delivery with zero spin-down time. | Decoupled architecture |

---

## 🚀 Method 1: Unified Web Service (Recommended — 1 Service)

In this approach, Render builds the React frontend assets (`frontend/dist`) and serves both the API endpoints (`/api/...`) and the interactive web workbench from a single domain (e.g., `https://npc-compiler.onrender.com`).

### Option A — Using Render Blueprint (Automatic 1-Click)
1. Fork or push this repository to your GitHub account:
   `https://github.com/Syedsameer-10/npc-game`
2. Log into [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Blueprint**.
4. Connect your `npc-game` repository.
5. Render reads `render.yaml` automatically. Click **Apply**.
6. Render builds the Docker image and provisions your live application.

---

### Option B — Manual Setup in Render Dashboard (Docker)
1. In Render Dashboard, click **New +** → **Web Service**.
2. Select your repository: `Syedsameer-10/npc-game`.
3. Configure the following fields:
   - **Name**: `npc-behavior-compiler`
   - **Region**: Closest to you (e.g. Frankfurt, Oregon, Singapore)
   - **Branch**: `main`
   - **Runtime**: `Docker`
   - **Instance Type**: `Free`
4. Under **Advanced Settings**:
   - **Health Check Path**: `/api/health`
5. Click **Create Web Service**.
6. Render will automatically execute the multi-stage `Dockerfile`, build the frontend with Node 20, install the Python backend, and launch Uvicorn on `$PORT`.

---

### Option C — Manual Setup in Render Dashboard (Native Python Environment)
If you prefer Render's native Python runtime instead of Docker:
1. Click **New +** → **Web Service**.
2. Connect your repository.
3. Configure:
   - **Name**: `npc-behavior-compiler`
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     chmod +x build.sh && ./build.sh
     ```
     *(Or: `pip install -r requirements.txt && npm --prefix frontend install && npm --prefix frontend run build`)*
   - **Start Command**:
     ```bash
     uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type**: `Free`
4. Under **Advanced Settings**:
   - Add Environment Variable:
     - `PYTHON_VERSION`: `3.11.9`
   - **Health Check Path**: `/api/health`
5. Click **Create Web Service**.

---

## 🌐 Method 2: Separate Backend API + Static Site

Use this method if you want Render's free global CDN to serve the frontend as a Static Site.

### Step 1: Deploy the Backend API (Web Service)
1. Click **New +** → **Web Service**.
2. Connect your repo `Syedsameer-10/npc-game`.
3. Configure:
   - **Name**: `npc-compiler-api`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/api/health`
4. Click **Create Web Service**.
5. Once deployed, copy your backend URL (e.g., `https://npc-compiler-api.onrender.com`).

### Step 2: Deploy the Frontend (Static Site)
1. Click **New +** → **Static Site**.
2. Connect your repo `Syedsameer-10/npc-game`.
3. Configure:
   - **Name**: `npc-compiler-web`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add **Environment Variable**:
   - `VITE_API_URL`: `https://npc-compiler-api.onrender.com` *(paste your Step 1 backend URL)*
5. Under **Redirects/Rewrites**:
   - Click **Add Rewrite**
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: `Rewrite` *(This enables direct links and SPA subroutes like `/#/phases`)*
6. Click **Create Static Site**.

---

## 🔍 Verification & Health Checks

Once deployed, you can verify your service:

1. **Frontend UI**:
   - Visit `https://<your-service-name>.onrender.com`
   - Check the top navigation bar: it should display `DSL v1.0` and a green `API LIVE` badge.
2. **API Health Check**:
   - Visit `https://<your-service-name>.onrender.com/api/health`
   - Expected JSON response:
     ```json
     {
       "status": "healthy",
       "service": "npc-behavior-compiler",
       "version": "1.0.0"
     }
     ```
3. **Interactive Swagger / OpenAPI Docs**:
   - Visit `https://<your-service-name>.onrender.com/docs`
   - Test `POST /api/compile` or `GET /api/presets` directly in the browser.

---

## 💡 Render Free Tier Notes

- **Spin Down on Inactivity**: Free Web Services on Render go to sleep after 15 minutes of zero traffic. When a new request arrives, Render takes 30-50 seconds to wake the instance up.
- **Client Fallback**: The NPC Behavior Compiler features client-side compilation in the browser so that syntax checking and 2D simulations work even while the backend is waking up!
- **Health Checks**: Setting the Health Check Path to `/api/health` prevents premature deployment timeouts while the server is initializing.
