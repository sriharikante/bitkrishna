# Bitespeed Identity Reconciliation API

A production-ready REST API that identifies and reconciles customer identities across multiple purchases using email and phone number matching.

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Deployment**: Render.com

---

## Project Structure

```
bitespeed-identity/
├── src/
│   ├── controllers/
│   │   └── identityController.ts   # Request parsing & validation
│   ├── routes/
│   │   └── identityRoutes.ts       # Express route definitions
│   ├── services/
│   │   └── identityService.ts      # Core business logic
│   ├── utils/
│   │   ├── prismaClient.ts         # Singleton Prisma client
│   │   └── responseHelper.ts       # JSON response helpers
│   └── app.ts                      # Express app entry point
├── prisma/
│   └── schema.prisma               # Database schema
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
- PostgreSQL running locally or a remote connection string
- npm

### 1. Clone & Install

```bash
git clone https://github.com/your-username/bitespeed-identity.git
cd bitespeed-identity
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/bitespeed?schema=public"
PORT=3000
NODE_ENV=development
```

### 3. Run Migrations (Development)

```bash
npx prisma migrate dev --name init
```

### 4. Generate Prisma Client

```bash
npx prisma generate
```

### 5. Start Dev Server

```bash
npm run dev
```

---

## Production Build

```bash
npm run build
npm start
```

---

## API Reference

### POST /identify

Identifies or creates a contact based on email and/or phone number.

**Request Body:**
```json
{
  "email": "user@example.com",
  "phoneNumber": "1234567890"
}
```

At least one of `email` or `phoneNumber` must be provided.

**Response:**
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

### GET /health

Returns service health status.

```json
{ "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }
```

---

## Logic Summary

| Scenario | Behavior |
|---|---|
| No match | Create new PRIMARY contact |
| One match | Link new info as SECONDARY under existing PRIMARY |
| Two separate primaries match | Older stays PRIMARY, newer becomes SECONDARY |
| Exact duplicate | No new contact created, return existing cluster |
| New email + existing phone | Create SECONDARY with new email under cluster's PRIMARY |
| New phone + existing email | Create SECONDARY with new phone under cluster's PRIMARY |

---

## Render Deployment

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/your-username/bitespeed-identity.git
git push -u origin main
```

### Step 2: Create PostgreSQL Database on Render

1. Go to [render.com](https://render.com) → **New** → **PostgreSQL**
2. Name it `bitespeed-db`, choose free tier, click **Create Database**
3. Copy the **Internal Database URL**

### Step 3: Create Web Service on Render

1. Go to Render → **New** → **Web Service**
2. Connect your GitHub repository
3. Fill in:

| Setting | Value |
|---|---|
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build && npx prisma migrate deploy` |
| **Start Command** | `npm start` |

4. Add Environment Variables:

| Key | Value |
|---|---|
| `DATABASE_URL` | Internal URL from Step 2 |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |

5. Click **Create Web Service**

Render will install, build, migrate, and start your server. Your URL will be `https://your-service-name.onrender.com`.

---

## curl Test Commands

Replace `http://localhost:3000` with your Render URL in production.

```bash
# Test 1: Create new primary contact
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "lorraine@hillvalley.edu", "phoneNumber": "123456"}'

# Test 2: Link by shared email (adds new phone as secondary)
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "lorraine@hillvalley.edu", "phoneNumber": "999999"}'

# Test 3: Link by shared phone (adds new email as secondary)
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "mcfly@hillvalley.edu", "phoneNumber": "123456"}'

# Test 4a: Create first standalone primary
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "george@hillvalley.edu", "phoneNumber": "717171"}'

# Test 4b: Create second standalone primary
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "bifftannen@hillvalley.edu", "phoneNumber": "838383"}'

# Test 4c: Merge two primaries (email from first, phone from second)
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "george@hillvalley.edu", "phoneNumber": "838383"}'

# Test 5: Only email provided
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "onlyemail@test.com"}'

# Test 6: Only phone provided
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "5555555555"}'

# Test 7: Exact duplicate (no new contact created)
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "lorraine@hillvalley.edu", "phoneNumber": "123456"}'

# Test 8: Validation error (no fields)
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{}'

# Test 9: Health check
curl http://localhost:3000/health
```

---

## Postman Collection

Import this JSON directly into Postman:

```json
{
  "info": {
    "name": "Bitespeed Identity API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [{ "key": "baseUrl", "value": "http://localhost:3000" }],
  "item": [
    {
      "name": "Create New Contact",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": { "mode": "raw", "raw": "{\"email\": \"lorraine@hillvalley.edu\", \"phoneNumber\": \"123456\"}" },
        "url": { "raw": "{{baseUrl}}/identify", "host": ["{{baseUrl}}"], "path": ["identify"] }
      }
    },
    {
      "name": "Link by Email",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": { "mode": "raw", "raw": "{\"email\": \"lorraine@hillvalley.edu\", \"phoneNumber\": \"999999\"}" },
        "url": { "raw": "{{baseUrl}}/identify", "host": ["{{baseUrl}}"], "path": ["identify"] }
      }
    },
    {
      "name": "Merge Two Primaries",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": { "mode": "raw", "raw": "{\"email\": \"george@hillvalley.edu\", \"phoneNumber\": \"838383\"}" },
        "url": { "raw": "{{baseUrl}}/identify", "host": ["{{baseUrl}}"], "path": ["identify"] }
      }
    },
    {
      "name": "Only Email",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": { "mode": "raw", "raw": "{\"email\": \"onlyemail@test.com\"}" },
        "url": { "raw": "{{baseUrl}}/identify", "host": ["{{baseUrl}}"], "path": ["identify"] }
      }
    },
    {
      "name": "Only Phone",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": { "mode": "raw", "raw": "{\"phoneNumber\": \"5555555555\"}" },
        "url": { "raw": "{{baseUrl}}/identify", "host": ["{{baseUrl}}"], "path": ["identify"] }
      }
    },
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": { "raw": "{{baseUrl}}/health", "host": ["{{baseUrl}}"], "path": ["health"] }
      }
    }
  ]
}
```

---

## Migration Commands

```bash
# Development — creates migration files under prisma/migrations/
npx prisma migrate dev --name init

# Production — applies existing migrations (used on Render)
npx prisma migrate deploy

# View database in browser GUI
npx prisma studio

# Reset DB — DESTROYS ALL DATA, dev only
npx prisma migrate reset
```
