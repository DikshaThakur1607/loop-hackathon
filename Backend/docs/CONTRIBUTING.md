# Loop Hackathon Backend - Developer Documentation

> **Complete guide for team members to set up, develop, and contribute to the Loop Hackathon backend system**

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Getting Started](#getting-started)
4. [Project Structure](#project-structure)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Features Overview](#features-overview)
8. [Development Workflow](#development-workflow)
9. [Testing Guide](#testing-guide)
10. [Deployment](#deployment)
11. [Contributing Guidelines](#contributing-guidelines)
12. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

The Loop Hackathon Backend is a Node.js/TypeScript application that manages:
- **Team Registration** from Unstop CSV uploads
- **Verification Management** (Complete/Incomplete status)
- **Bulk Communication** (Email reminders via SendGrid)
- **Submission Tracking** (Round 1 submissions)
- **Evaluation System** (Judging and scoring)
- **Payment Integration** (Razorpay for final teams)

**Current Status:** Feature 1 (CSV Upload & Team Management) ✅ Complete

---

## 🛠 Tech Stack

### Core Technologies
- **Runtime:** Node.js v20+
- **Language:** TypeScript 5.9.3
- **Framework:** Express.js 5.2.1
- **Database:** PostgreSQL (Azure hosted)
- **ORM:** Prisma 7.2.0
- **Package Manager:** pnpm

### Key Libraries
- **Authentication:** bcrypt, jsonwebtoken
- **File Upload:** multer 2.0.2
- **CSV Processing:** csv-parser 3.2.0
- **Email Service:** @sendgrid/mail 8.1.6
- **Payment:** razorpay 2.9.6
- **Storage:** @azure/storage-blob 12.29.1
- **Job Queue:** bull 4.16.5 + ioredis 5.9.1
- **Scheduling:** node-cron 3.0.3

---

## 🚀 Getting Started

### Prerequisites

1. **Node.js** v20 or higher
2. **pnpm** (install with `npm install -g pnpm`)
3. **PostgreSQL** database access (we use Azure PostgreSQL)
4. **Git** for version control

### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/sushil016/loop.hackathon.git
cd loop.hackathon/Backend

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your actual credentials

# 4. Generate Prisma Client
pnpm prisma:generate

# 5. Push database schema (or run migrations)
pnpm prisma:push

# 6. Start development server
pnpm dev
```

Server will run on `http://localhost:3000`

---

## 📁 Project Structure

```
Backend/
├── src/
│   ├── index.ts                    # Main Express server
│   ├── lib/
│   │   └── prisma.ts              # Prisma client instance
│   ├── controllers/
│   │   └── team.controller.ts     # Team API handlers
│   ├── services/
│   │   ├── team.service.ts        # Team business logic
│   │   ├── sync/
│   │   │   └── csv-processing.service.ts  # CSV parsing & import
│   │   └── communication/
│   │       └── email.service.ts   # Email sending service
│   └── routes/
│       └── team.routes.ts         # API route definitions
├── prisma/
│   └── schema.prisma              # Database schema
├── uploads/                        # Temporary CSV uploads
├── generated/                      # Generated Prisma client
├── .env                           # Environment variables
├── package.json                   # Dependencies & scripts
├── tsconfig.json                  # TypeScript config
└── nodemon.json                   # Hot reload config
```

---

## 🗄 Database Schema

### Core Models

#### Team
Stores team information from Unstop registrations.

```prisma
model Team {
  id                  String              @id @default(uuid())
  unstopTeamId        String              @unique
  teamName            String
  collegeName         String
  teamSize            Int
  verificationStatus  VerificationStatus  @default(PENDING)
  submissionStatus    SubmissionStatus    @default(NOT_SUBMITTED)
  evaluationStatus    EvaluationStatus    @default(PENDING)
  paymentStatus       String              @default("PENDING")
  
  members             TeamMember[]
  submissions         Submission[]
  evaluations         Evaluation[]
  payments            Payment[]
  communicationLogs   CommunicationLog[]
}
```

#### TeamMember
Individual team member details.

```prisma
model TeamMember {
  id          String   @id @default(uuid())
  teamId      String
  fullName    String
  email       String
  phone       String
  degree      String?
  yearOfStudy Int?
  isLeader    Boolean  @default(false)
  
  team        Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
}
```

#### Enums

```prisma
enum VerificationStatus {
  PENDING    // Registration incomplete
  VERIFIED   // Registration complete
  REJECTED   // Disqualified
}

enum SubmissionStatus {
  NOT_SUBMITTED
  SUBMITTED
  LATE_SUBMITTED
}

enum EvaluationStatus {
  PENDING
  SHORTLISTED
  REJECTED
}
```

**View full schema:** `prisma/schema.prisma`

---

## 🌐 API Endpoints

### Base URL
```
http://localhost:3000/api
```

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-10T..."
}
```

---

### Team Management

#### 1. Upload CSV
Upload Unstop registration CSV file.

```http
POST /api/teams/upload-csv
Content-Type: multipart/form-data
```

**Request:**
```bash
curl -X POST http://localhost:3000/api/teams/upload-csv \
  -F "file=@path/to/registrations.csv"
```

**Response:**
```json
{
  "success": true,
  "message": "CSV processed successfully",
  "jobId": "uuid",
  "stats": {
    "totalTeams": 149,
    "newTeams": 51,
    "updatedTeams": 98,
    "errors": 0
  },
  "errors": []
}
```

---

#### 2. Get Team Statistics
```http
GET /api/teams/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 149,
    "verified": 89,
    "pending": 58,
    "rejected": 2
  }
}
```

---

#### 3. Get Verified Teams
Returns teams with "Complete" registration status.

```http
GET /api/teams/verified
```

**Response:**
```json
{
  "success": true,
  "count": 89,
  "teams": [
    {
      "id": "uuid",
      "unstopTeamId": "UR38OD11",
      "teamName": "Team Rotor Riot",
      "collegeName": "BVCOE Navi Mumbai",
      "teamSize": 3,
      "verificationStatus": "VERIFIED",
      "leader": {
        "id": "uuid",
        "fullName": "Sushil Sahani",
        "email": "sahanisushil325@gmail.com",
        "phone": "+919967612372"
      }
    }
  ]
}
```

---

#### 4. Get Unverified Teams
Returns teams with "Incomplete" registration status.

```http
GET /api/teams/unverified
```

**Response:**
```json
{
  "success": true,
  "count": 58,
  "teams": [
    {
      "teamId": "uuid",
      "teamName": "Tech Squad",
      "leaderName": "John Doe",
      "leaderEmail": "john@example.com",
      "leaderPhone": "+919876543210",
      "verificationStatus": "PENDING"
    }
  ]
}
```

---

#### 5. Get Phone Numbers (for calling)
Extract phone numbers of unverified team leaders.

```http
GET /api/teams/unverified/phone-numbers
```

**Response:**
```json
{
  "success": true,
  "count": 58,
  "phoneNumbers": [
    "+919876543210",
    "+919876543220",
    "+919876543230"
  ],
  "callFeature": {
    "description": "Copy phone numbers to your calling app",
    "format": "tel:+919876543210"
  }
}
```

**Use case:** Copy these numbers to call unverified team leaders.

---

#### 6. Get All Contacts (for bulk email)
Get all members (leaders + team members) from unverified teams.

```http
GET /api/teams/unverified/all-contacts
```

**Response:**
```json
{
  "success": true,
  "count": 174,
  "contacts": [
    {
      "teamId": "uuid",
      "teamName": "Tech Squad",
      "members": [
        {
          "memberId": "uuid",
          "fullName": "John Doe",
          "email": "john@example.com",
          "phone": "+919876543210",
          "isLeader": true
        },
        {
          "memberId": "uuid",
          "fullName": "Jane Smith",
          "email": "jane@example.com",
          "phone": "+919876543211",
          "isLeader": false
        }
      ]
    }
  ]
}
```

**Use case:** Send bulk emails to ALL members of unverified teams.

---

#### 7. Send Verification Reminders
Send bulk email to all unverified team members.

```http
POST /api/teams/send-verification-reminders
```

**Prerequisites:** Configure SendGrid API key in `.env`

**Response:**
```json
{
  "success": true,
  "message": "Verification reminders sent",
  "stats": {
    "sent": 170,
    "failed": 4,
    "total": 174
  }
}
```

---

#### 8. Export Teams to CSV
```http
GET /api/teams/export?status=VERIFIED|PENDING|REJECTED
```

**Examples:**
```bash
# Export all verified teams
curl http://localhost:3000/api/teams/export?status=VERIFIED > verified.csv

# Export all unverified teams
curl http://localhost:3000/api/teams/export?status=PENDING > unverified.csv

# Export all teams
curl http://localhost:3000/api/teams/export > all_teams.csv
```

---

#### 9. Manually Verify Team
```http
PATCH /api/teams/:teamId/verify
```

**Example:**
```bash
curl -X PATCH http://localhost:3000/api/teams/abc-123-uuid/verify
```

**Response:**
```json
{
  "success": true,
  "message": "Team verified successfully",
  "team": {
    "id": "abc-123-uuid",
    "teamName": "Tech Squad",
    "verificationStatus": "VERIFIED",
    "verifiedAt": "2026-01-10T..."
  }
}
```

---

## 🎯 Features Overview

### ✅ Feature 1: CSV Upload & Team Management (COMPLETE)

**What it does:**
1. Upload Unstop registration CSV
2. Parse and normalize team data
3. Extract team leaders automatically
4. Separate verified/unverified teams
5. Provide phone numbers for calling
6. Send bulk email reminders
7. Export filtered lists to CSV

**Status:** ✅ Fully implemented and tested

---

### 🚧 Feature 2: Submission Tracking (PLANNED)

**Requirements:**
- Daily CSV sync (24-hour cron job)
- Detect new submissions
- Track submission status (PPT, Prototype, Video, GitHub)
- Send reminders to verified teams who haven't submitted
- Deadline tracking

**Files to create:**
- `src/services/submission.service.ts`
- `src/controllers/submission.controller.ts`
- `src/routes/submission.routes.ts`
- `src/cron/submission-sync.ts`

---

### 🚧 Feature 3: Evaluation System (PLANNED)

**Requirements:**
- Judge panel management
- Scoring system (4 criteria, 0-10 each)
- Auto-ranking by total score
- Shortlist/reject decisions
- Send rejection emails to non-shortlisted teams
- Send payment invite to shortlisted teams

**Files to create:**
- `src/services/evaluation.service.ts`
- `src/controllers/evaluation.controller.ts`
- `src/routes/evaluation.routes.ts`

---

### 🚧 Feature 4: Payment Integration (PLANNED)

**Requirements:**
- Razorpay payment link generation
- Track payment status
- Confirm team availability
- Payment deadline reminders
- Final confirmation emails

**Files to create:**
- `src/services/payment.service.ts`
- `src/controllers/payment.controller.ts`
- `src/routes/payment.routes.ts`

---

## 💻 Development Workflow

### 1. Create a New Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

Follow the existing code structure:
- **Controllers:** Handle HTTP requests/responses
- **Services:** Business logic and database operations
- **Routes:** Define API endpoints

### 3. Test Your Code

```bash
# Run dev server
pnpm dev

# Test with curl
curl http://localhost:3000/api/your-endpoint

# Check Prisma Studio
pnpm prisma:studio
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add submission tracking feature"
```

**Commit message format:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring
- `test:` Tests
- `chore:` Maintenance

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

---

## 🧪 Testing Guide

### Manual Testing

#### Test CSV Upload
```bash
# 1. Place CSV in uploads/ folder
curl -X POST http://localhost:3000/api/teams/upload-csv \
  -F "file=@uploads/your-file.csv"

# 2. Check stats
curl http://localhost:3000/api/teams/stats

# 3. Verify data in Prisma Studio
pnpm prisma:studio
```

#### Test Email Service
```bash
# 1. Configure SendGrid in .env
SENDGRID_API_KEY=SG.your-key-here
FROM_EMAIL=noreply@loophackathon.com

# 2. Send test emails
curl -X POST http://localhost:3000/api/teams/send-verification-reminders

# 3. Check SendGrid dashboard for delivery status
```

### Database Testing

```bash
# Open Prisma Studio
pnpm prisma:studio

# View data in browser at http://localhost:5555
```

---

## 🚀 Deployment

### Environment Variables

Required in production `.env`:

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require

# SendGrid Email
SENDGRID_API_KEY=SG.xxxxx
FROM_EMAIL=noreply@loophackathon.com
FROM_NAME=Loop Hackathon

# Razorpay Payment
RAZORPAY_KEY_ID=rzp_xxxxx
RAZORPAY_KEY_SECRET=xxxxx

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=xxxxx

# Server
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://loophackathon.com
```

### Build for Production

```bash
# Install dependencies
pnpm install --prod

# Generate Prisma Client
pnpm prisma:generate

# Build TypeScript
pnpm build

# Start server
pnpm start
```

### Deploy to Azure/AWS/Vercel

Follow platform-specific guides for Node.js deployment.

---

## 🤝 Contributing Guidelines

### Code Style

- Use **TypeScript** for type safety
- Follow **ES2022** syntax
- Use **async/await** instead of callbacks
- Add **JSDoc comments** for functions
- Keep functions **small and focused**

### Example Service Function

```typescript
/**
 * Get all verified teams with leader details
 */
async getVerifiedTeamsWithLeaders(): Promise<VerifiedTeam[]> {
  const teams = await prisma.team.findMany({
    where: {
      verificationStatus: 'VERIFIED',
    },
    include: {
      members: {
        where: {
          isLeader: true,
        },
      },
    },
  });

  return teams.map((team) => ({
    id: team.id,
    unstopTeamId: team.unstopTeamId,
    teamName: team.teamName,
    collegeName: team.collegeName,
    teamSize: team.teamSize,
    verificationStatus: team.verificationStatus,
    leader: team.members[0],
  }));
}
```

### Pull Request Checklist

- [ ] Code follows project structure
- [ ] TypeScript compiles without errors
- [ ] API endpoints tested with curl
- [ ] Database changes documented
- [ ] README/docs updated if needed
- [ ] No sensitive data in code
- [ ] Commit messages are clear

---

## 🐛 Troubleshooting

### Common Issues

#### "PrismaClient is not a constructor"
```bash
# Solution: Regenerate Prisma Client
pnpm prisma:generate
```

#### "Database connection failed"
```bash
# Solution: Check .env DATABASE_URL
# Ensure PostgreSQL is accessible
# Verify SSL mode for Azure: ?sslmode=require
```

#### "Module not found"
```bash
# Solution: Reinstall dependencies
rm -rf node_modules
pnpm install
```

#### "Port 3000 already in use"
```bash
# Solution: Change port in .env
PORT=3001

# Or kill existing process
lsof -ti:3000 | xargs kill
```

#### CSV Upload Fails
```bash
# Check CSV format matches Unstop export
# Required columns:
# - Team ID
# - Team Name
# - Candidate role (Team Leader/Team Member)
# - Candidate's Name
# - Candidate's Email
# - Candidate's Mobile
# - Reg. Status (Complete/Incomplete)
```

---

## 📚 Additional Resources

### Documentation
- [Prisma Docs](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [SendGrid API](https://docs.sendgrid.com/api-reference)

### Tools
- **Prisma Studio:** `pnpm prisma:studio` - Database GUI
- **Postman:** API testing tool
- **Azure Data Studio:** PostgreSQL client

### Package Scripts

```bash
pnpm dev              # Start dev server with hot reload
pnpm build            # Compile TypeScript to JavaScript
pnpm start            # Run production build
pnpm prisma:generate  # Generate Prisma Client
pnpm prisma:migrate   # Run database migrations
pnpm prisma:studio    # Open Prisma Studio GUI
pnpm prisma:push      # Push schema to database
```

---

## 👥 Team Contacts

**Project Lead:** Sushil Sahani  
**Email:** sahanisushil325@gmail.com  
**GitHub:** [@sushil016](https://github.com/sushil016)

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🎯 Next Steps for Contributors

1. **Set up your development environment** (see Getting Started)
2. **Explore the codebase** (start with `src/index.ts`)
3. **Test Feature 1** (upload a CSV and test all endpoints)
4. **Pick a feature to build** (Feature 2, 3, or 4)
5. **Join the team discussion** (ask questions, share ideas)

---

**Last Updated:** January 10, 2026  
**Version:** 1.0.0  
**Status:** Feature 1 Complete ✅

---

Made with ❤️ by the Loop Hackathon Team
