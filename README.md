# Plant Health Detection Backend (Dockerized)

A **Node.js backend** integrated with a **Python AI inference service** and **Redis**, fully containerized using **Docker Compose**.  
Optimized for **CPU-only environments** and designed with a **privacy-first architecture**.

---

## Important Notice (READ FIRST)

This repository **does NOT include** the following files **by design**:

* AI model files
* Encryption keys
* Environment secrets

These are **intentionally excluded** for:

* Security
* IP protection
* Privacy
* Clean team collaboration

You **must download them separately** before running the backend.

---

## What Is NOT Included in GitHub

The following paths are **ignored in Git** and must be provided externally:

```
ai/saved_models/
ai/secrets/
.env.docker
```

### Missing Files (Required)

```
ai/
├── saved_models/
│   └── best_model.encrypted
├── secrets/
│   └── model.key
.env.docker
```

These files are shared **securely via Drive** (Google Drive / OneDrive / internal storage).

---

## Step 1: Clone the Repository

First, clone this repository to your local machine:

```bash
git clone -b backend-docker --single-branch https://github.com/adityagupta000/plant_backend.git
cd plant_backend
```

---

## Step 2: Download Required Files from Drive

Download the shared **AI bundle** from Drive.  
You will receive a folder structured like this:

```
plant-health-ai/
├── saved_models/
│   └── best_model.encrypted
├── secrets/
│   └── model.key
└── .env.docker
```

---

## Step 3: Place Files into the Project

Now **copy the downloaded files into your cloned repository** like this:

```
backend/
├── ai/
│   ├── saved_models/
│   │   └── best_model.encrypted   ← from Drive
│   ├── secrets/
│   │   └── model.key              ← from Drive
│   └── inference_server.py
├── .env.docker                    ← from Drive
├── docker-compose.yml
├── Dockerfile
└── src/
```

⚠️ **Do NOT rename folders**  
⚠️ **Do NOT change file paths**

---

## Quick Start (Docker)

### 1. Clone the repository

```bash
git clone https://github.com/<org-or-username>/plant-health-backend.git
cd plant-health-backend
```

### 2. Download AI bundle from Drive

Get the shared files and place them in the correct locations (see steps above).

### 3. Verify required files are in place

Check that all files are correctly placed:

```bash
ls ai/saved_models
ls ai/secrets
ls .env.docker
```

### 4. Start the backend

```bash
docker compose up --build
```

---

## Verify Backend Is Running

### Health check

```bash
curl http://localhost:5000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "plant-health-backend",
  "environment": "development"
}
```

---

## Services Included

| Service        | Description                         |
| -------------- | ----------------------------------- |
| Backend        | Node.js REST API                    |
| AI Workers     | Python inference workers (CPU-only) |
| Redis          | Rate limiting & guest control       |
| Docker Compose | Orchestrates all services           |

---

## Project Structure (Simplified)

```
backend/
├── ai/                     # Python AI service
│   ├── inference_server.py
│   ├── requirements.txt
│   ├── saved_models/        # ⛔ provided via Drive
│   └── secrets/             # ⛔ provided via Drive
├── src/                     # Node.js backend
├── docker-compose.yml
├── Dockerfile
├── .env.docker              # ⛔ provided via Drive
└── README.md
```

---

## Why Model & Secrets Are Excluded

* Prevents accidental public exposure
* Protects trained model IP
* Keeps encryption keys secure
* Allows different environments to use different models
* Follows industry best practices

**Docker images = code**  
**Volumes / local files = data & secrets**

---

## Common Commands

### Start

```bash
docker compose up
```

### Stop

```bash
docker compose down
```

### Restart

```bash
docker compose restart
```

### Logs

```bash
docker compose logs -f backend
```

### Enter container

```bash
docker compose exec backend sh
```

---

## Debugging Tips

### Check AI availability

```bash
docker compose logs backend | grep "AI worker"
```

### Verify Python inside container

```bash
docker compose exec backend python -c "import cv2, torch; print('OK')"
```