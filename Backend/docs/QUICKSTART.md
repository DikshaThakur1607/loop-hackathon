# Loop Hackathon Backend - Quick Start Guide

> **Get up and running in 5 minutes! 🚀**

---

## ⚡ Quick Setup

```bash
# 1. Clone repo
git clone https://github.com/sushil016/loop.hackathon.git
cd loop.hackathon/Backend

# 2. Install dependencies
pnpm install

# 3. Copy environment template
cp .env.example .env

# 4. Generate Prisma Client
pnpm prisma:generate

# 5. Push schema to database
pnpm prisma:push

# 6. Start dev server
pnpm dev
```

Server runs on **http://localhost:3000** 🎉

---

## 🔑 Environment Variables

Edit `.env` with these values:

```env
# Azure PostgreSQL Database
DATABASE_URL=postgresql://crew_admin:PASSWORD@crewdb-prod.postgres.database.azure.com:5432/testmigrationdb?sslmode=require

# SendGrid Email (Optional - for bulk emails)
SENDGRID_API_KEY=SG.your-key-here
FROM_EMAIL=noreply@loophackathon.com
FROM_NAME=Loop Hackathon

# Server
PORT=3000
NODE_ENV=development
```

**Get database credentials from team lead.**

---

## 🧪 Test It Works

```bash
# Test health check
curl http://localhost:3000/health

# Should return: {"status":"ok","timestamp":"..."}
```

---

## 📤 Upload CSV

```bash
# 1. Get CSV from Unstop and save to uploads/ folder

# 2. Upload it
curl -X POST http://localhost:3000/api/teams/upload-csv \
  -F "file=@uploads/your-file.csv"

# 3. Check stats
curl http://localhost:3000/api/teams/stats
```

---

## 🎯 Main Features

| Feature | Endpoint | Description |
|---------|----------|-------------|
| **Upload CSV** | `POST /api/teams/upload-csv` | Import Unstop registrations |
| **Get Stats** | `GET /api/teams/stats` | Team counts |
| **Verified Teams** | `GET /api/teams/verified` | Complete registrations |
| **Unverified Teams** | `GET /api/teams/unverified` | Incomplete registrations |
| **Phone Numbers** | `GET /api/teams/unverified/phone-numbers` | For calling |
| **All Contacts** | `GET /api/teams/unverified/all-contacts` | For bulk email |
| **Send Emails** | `POST /api/teams/send-verification-reminders` | Bulk reminders |
| **Export CSV** | `GET /api/teams/export?status=PENDING` | Download lists |

---

## 🛠 Useful Commands

```bash
# Development
pnpm dev              # Start with hot reload
pnpm build            # Build for production
pnpm start            # Run production build

# Prisma
pnpm prisma:studio    # Open database GUI
pnpm prisma:generate  # Regenerate client
pnpm prisma:push      # Sync schema to DB
```

---

## 📁 Project Structure

```
Backend/
├── src/
│   ├── index.ts              # Main server
│   ├── controllers/          # HTTP handlers
│   ├── services/             # Business logic
│   ├── routes/               # API routes
│   └── lib/                  # Utilities
├── prisma/
│   └── schema.prisma         # Database schema
├── uploads/                  # CSV files
└── .env                      # Config
```

---

## 🐛 Common Issues

**Error: "PrismaClient is not a constructor"**
```bash
pnpm prisma:generate
```

**Error: "Database connection failed"**
- Check DATABASE_URL in `.env`
- Ask team lead for correct credentials

**Error: "Port 3000 in use"**
```bash
# Change port in .env
PORT=3001
```

---

## 📚 Full Documentation

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for:
- Complete API reference
- Database schema details
- Development workflow
- Contributing guidelines

---

## 💬 Need Help?

- **Team Lead:** Sushil Sahani
- **Email:** sahanisushil325@gmail.com
- **GitHub Issues:** [Create Issue](https://github.com/sushil016/loop.hackathon/issues)

---

## ✅ Checklist

- [ ] Cloned repository
- [ ] Installed dependencies with `pnpm install`
- [ ] Set up `.env` file
- [ ] Generated Prisma Client
- [ ] Pushed database schema
- [ ] Server running on port 3000
- [ ] Tested health check endpoint
- [ ] Uploaded sample CSV successfully

---

**Ready to contribute? Check [CONTRIBUTING.md](./CONTRIBUTING.md) for next steps!** 🚀
