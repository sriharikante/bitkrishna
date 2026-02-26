# Bitespeed Identity Reconciliation API

## Live Endpoint

**Base URL:**  
https://bitkrishna.onrender.com  

**Identify Endpoint:**  
POST https://bitkrishna.onrender.com/identify  

> Note: This service is deployed on Render free tier.  
> It may take 20–40 seconds to respond after inactivity due to cold start.

---

## Quick Production Test

```bash
curl -X POST https://bitkrishna.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "phoneNumber": "123456"}'
```

---

A production-ready REST API that identifies and reconciles customer identities across multiple purchases using email and phone number matching.

---

## Tech Stack

- **Runtime:** Node.js + TypeScript  
- **Framework:** Express.js  
- **ORM:** Prisma  
- **Database:** PostgreSQL  
- **Deployment:** Render.com  

---

## Project Structure

```
bitespeed-identity/
├── src/
│   ├── controllers/
│   │   └── identityController.ts
│   ├── routes/
│   │   └── identityRoutes.ts
│   ├── services/
│   │   └── identityService.ts
│   ├── utils/
│   │   ├── prismaClient.ts
│   │   └── responseHelper.ts
│   └── app.ts
├── prisma/
│   └── schema.prisma
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## Local Setup

### Prerequisites

- Node.js >= 18
- PostgreSQL (local or remote)
- npm

---

### 1️⃣ Clone & Install

```bash
git clone https://github.com/your-username/bitespeed-identity.git
cd bitespeed-identity
npm install
```

---

### 2️⃣ Configure Environment

Create a `.env` file:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/bitespeed?schema=public"
PORT=3000
NODE_ENV=development
```

---

### 3️⃣ Run Migrations (Development)

```bash
npx prisma migrate dev --name init
```

---

### 4️⃣ Generate Prisma Client

```bash
npx prisma generate
```

---

### 5️⃣ Start Development Server

```bash
npm run dev
```

Server runs at:

```
http://localhost:3000
```

---

## Production Build

```bash
npm run build
npm start
```

---

# API Reference

---

## POST /identify

Identifies or creates a contact based on email and/or phone number.

### Request Body

```json
{
  "email": "user@example.com",
  "phoneNumber": "1234567890"
}
```

At least one of `email` or `phoneNumber` must be provided.

---

### Success Response

```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["user@example.com"],
    "phoneNumbers": ["1234567890"],
    "secondaryContactIds": []
  }
}
```

---

## GET /health

Returns service health status.

```json
{
  "status": "ok",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

---

# Logic Summary

| Scenario | Behavior |
|-----------|-----------|
| No match | Create new PRIMARY contact |
| One match | Link new info as SECONDARY under existing PRIMARY |
| Two separate primaries match | Older remains PRIMARY, newer becomes SECONDARY |
| Exact duplicate | No new contact created |
| New email + existing phone | Create SECONDARY under cluster |
| New phone + existing email | Create SECONDARY under cluster |

---

# Render Deployment

---

## Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/your-username/bitespeed-identity.git
git push -u origin main
```

---

## Step 2: Create PostgreSQL Database on Render

1. Go to Render → **New → PostgreSQL**
2. Choose Free Tier
3. Copy the **Internal Database URL**

---

## Step 3: Create Web Service on Render

Use these settings:

| Setting | Value |
|----------|--------|
| Runtime | Node |
| Build Command | `npm install && npm run build && npx prisma migrate deploy` |
| Start Command | `npm start` |

Add Environment Variables:

| Key | Value |
|------|--------|
| DATABASE_URL | Internal DB URL |
| NODE_ENV | production |
| PORT | 3000 |

---

# Testing via curl

Replace localhost with your Render URL in production.

```bash
# Create new primary contact
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "lorraine@hillvalley.edu", "phoneNumber": "123456"}'

# Health check
curl http://localhost:3000/health
```

---

# Migration Commands

```bash
# Development
npx prisma migrate dev --name init

# Production
npx prisma migrate deploy

# View DB
npx prisma studio

# Reset DB (Dev only)
npx prisma migrate reset
```

---

## Author

Developed as part of the Bitespeed Backend Engineering Assessment.
