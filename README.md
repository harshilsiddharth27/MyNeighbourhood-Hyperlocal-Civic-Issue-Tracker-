# MyNeighbourhood 🏙️
### Hyperlocal Problem-Solving & Civic Action Platform

MyNeighbourhood is a production-ready, full-stack hyperlocal civic reporting application. It empowers local citizens to report physical neighborhood hazards (potholes, broken streetlights, illegal waste dumping, public property damage), uses **Gemini 3.5 AI** for real-time multimodal image analysis and priority triage, and displays issues on an interactive neighborhood coordinate plotter map.

---

## 🚀 Key Features
- **Multimodal AI Analysis**: Integrates the official `@google/genai` SDK with `gemini-3.5-flash` to extract structured JSON containing category classification, safety severity rating (Low, Medium, High), short visual summaries, and municipal action items.
- **Interactive Plotter Map**: Interactive SVG block map depicting real-world streets and parks, supporting custom pins, status markers, and single-click coordinates picking to automate form lat/lng inputs.
- **Proximity-Based Deduplication**: Runs server-side mathematical Haversine calculations to identify overlapping active reports within a 100-meter radius, automatically flagging potential duplicates.
- **Mock Municipal Action Panel**: Allows citizens or evaluators to simulate civic work orders, moving issue states from `Reported` to `In Progress` or `Resolved`.
- **Zero-Flicker Full-Stack Architecture**: Merges an Express.js backend with an interactive React 19 + Tailwind v4 single-page application.

---

## 📁 1. Project Directory Structure
The workspace follows standard full-stack monolithic guidelines:

```text
MyNeighbourhood/
├── dist/                          # Compiled production bundles
│   ├── index.html                 # Built static client assets
│   └── server.cjs                 # Bundled production CJS server (via esbuild)
├── src/                           # Client-side React source code
│   ├── components/                # Modular layout structures
│   ├── App.tsx                    # Main interactive frontend dashboard
│   ├── index.css                  # Global Tailwind CSS & Typography configuration
│   ├── main.tsx                   # Client entry bootstrapper
│   └── types.ts                   # Unified full-stack interfaces & types
├── .env.example                   # Environment variable declarations
├── .gitignore                     # Git tracking exclusions
├── Dockerfile                     # Multi-stage optimized production containerizer
├── metadata.json                  # AI Studio Applet settings & permissions
├── package.json                   # Build orchestrator & dependencies config
├── server.ts                      # Backend Express & Gemini API gateway
├── tsconfig.json                  # TypeScript compiler settings
└── vite.config.ts                 # Vite bundler options
```

---

## 🛠️ 2. Local Setup & Execution

### Prerequisites
- Node.js (v18 or higher)
- A valid Google AI Studio/Gemini API Key

### Step-by-Step Local Launch
1. **Clone or Download** the repository to your local directory.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY="your_actual_gemini_api_key_here"
   NODE_ENV="development"
   PORT=3000
   ```
4. **Boot Development Environment**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your web browser.

5. **Build and Test Production Bundle**:
   ```bash
   npm run build
   npm run start
   ```

---

## 📦 3. Containerization
The containerized setup uses a multi-stage `Dockerfile` to produce secure, micro-sized deployment runtimes:
- **Build Phase**: Uses `node:20-alpine` to compile static assets via Vite, bundle the TypeScript backend via `esbuild` down to a single optimized `dist/server.cjs` script, and prune build dependencies.
- **Execution Phase**: Installs only necessary runtime modules to reduce container cold-starts and memory overhead.

---

## ☁️ 4. Google Cloud Run Deployment Guide

Deploying MyNeighbourhood to Google Cloud Run involves four automated phases using the Google Cloud SDK (`gcloud` CLI).

### Phase A: Google Cloud Project Initialization
Set up your active billing project and enable the Google Cloud Build, Artifact Registry, and Cloud Run APIs:

```bash
# Log in to your Google Account
gcloud auth login

# Set your active Google Cloud Project ID
export PROJECT_ID="your-gcp-project-id"
gcloud config set project $PROJECT_ID

# Enable essential developer and deployment APIs
gcloud services enable \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com
```

### Phase B: Secure API Secret Integration
Store your sensitive `GEMINI_API_KEY` securely. While Cloud Run supports direct environment arguments, Google Secret Manager is recommended for enterprise safety.

To pass your Gemini key securely as an environment flag at deployment runtime:
```bash
export GEMINI_API_KEY="AIzaSyYourGeminiAPIKeyHere"
```

### Phase C: Build and Package Container Image with Cloud Builds
Compile, containerize, and push your platform application directly to your private Google Artifact Registry repository using Cloud Build:

```bash
# Create an Artifact Registry Docker Repository (run once)
gcloud artifacts repositories create myneighbourhood-repo \
    --repository-format=docker \
    --location=us-central1 \
    --description="MyNeighbourhood Production Docker Images"

# Trigger a secure Cloud Build compile of the Dockerfile
gcloud builds submit --tag us-central1-docker.pkg.dev/$PROJECT_ID/myneighbourhood-repo/app:latest
```

### Phase D: Deploy to Google Cloud Run
Deploy the packaged image to Google Cloud Run, setting appropriate CPU allocations, memory boundaries, environment pointers, and allowing public unauthenticated traffic:

```bash
gcloud run deploy myneighbourhood \
    --image us-central1-docker.pkg.dev/$PROJECT_ID/myneighbourhood-repo/app:latest \
    --region us-central1 \
    --platform managed \
    --set-env-vars="GEMINI_API_KEY=$GEMINI_API_KEY,NODE_ENV=production" \
    --allow-unauthenticated \
    --port 3000 \
    --memory 512Mi \
    --cpu 1
```

Once deployment finishes, `gcloud` will output the **Live Service URL** (e.g., `https://myneighbourhood-xxxxx.run.app`) where evaluators can interact with your production application.

---

## 🐙 5. Deploying to GitHub
To share this repository with the global open-source community:

1. **Initialize Git & Commit**:
   ```bash
   git init
   git add .
   git commit -m "feat: complete production-ready MyNeighbourhood platform with Gemini 3.5 integrations"
   ```
2. **Create Repository on GitHub**:
   Log into [GitHub](https://github.com) and create a new public repository named `MyNeighbourhood`.
3. **Push to Remote**:
   ```bash
   git branch -M main
   git remote add origin https://github.com/your-username/MyNeighbourhood.git
   git push -u origin main
   ```

---

## 🛡️ Production Verification Checklist
- [x] Client and Server TypeScript structures compile completely clean (`npm run build`).
- [x] Static compilation and esbuild module resolution produce a zero-dependency production target in `dist/`.
- [x] Server fallback heuristics handle offline execution gracefully when `GEMINI_API_KEY` is not present.
- [x] Responsive layout runs desktop-first and is highly optimized for touchscreen tablet navigation.
- [x] Ingress port maps precisely to AI Studio reverse proxy standard `3000`.
