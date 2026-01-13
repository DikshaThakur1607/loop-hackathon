# 🧪 Testing Guide - Feature 1: CSV Upload & Team Management

## Prerequisites
- ✅ Server is running (`pnpm dev`)
- ✅ CSV file is in the `uploads/` folder
- ✅ PostgreSQL database is connected

---

## Step 1: Start the Server

```bash
cd Backend
pnpm dev
```

You should see:
```
🚀 Server running on port 3000
📊 API Endpoints:
   - Health: http://localhost:3000/health
   - Teams API: http://localhost:3000/api/teams
```

---

## Step 2: Test Health Check

Open a new terminal and run:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-10T..."
}
```

---

## Step 3: Upload CSV File

Find your CSV filename in the `uploads/` folder, then run:

```bash
# Replace 'your-file.csv' with actual filename
curl -X POST http://localhost:3000/api/teams/upload-csv \
  -F "file=@uploads/your-file.csv"
```

**Example if your file is named `registrations.csv`:**
```bash
curl -X POST http://localhost:3000/api/teams/upload-csv \
  -F "file=@uploads/registrations.csv"
```

Expected response:
```json
{
  "success": true,
  "message": "CSV processed successfully",
  "jobId": "abc123...",
  "stats": {
    "totalTeams": 25,
    "newTeams": 25,
    "updatedTeams": 0,
    "errors": 0
  },
  "errors": []
}
```

**✅ What happens:**
- CSV is parsed
- Teams are normalized (grouped by team ID)
- Leaders are extracted (where is_leader = true)
- Data is imported into database
- Temp file is deleted

---

## Step 4: Get Team Statistics

```bash
curl http://localhost:3000/api/teams/stats
```

Expected response:
```json
{
  "success": true,
  "stats": {
    "total": 25,
    "verified": 8,
    "pending": 15,
    "rejected": 2
  }
}
```

---

## Step 5: Get Verified Teams

```bash
curl http://localhost:3000/api/teams/verified
```

Expected response:
```json
{
  "success": true,
  "count": 8,
  "teams": [
    {
      "id": "team-id-1",
      "unstopTeamId": "T001",
      "teamName": "Code Warriors",
      "collegeName": "IIT Delhi",
      "teamSize": 4,
      "verificationStatus": "VERIFIED",
      "leader": {
        "id": "member-id-1",
        "fullName": "Rahul Sharma",
        "email": "rahul@example.com",
        "phone": "+919876543210"
      }
    }
    // ... more teams
  ]
}
```

---

## Step 6: Get Unverified Teams

```bash
curl http://localhost:3000/api/teams/unverified
```

Expected response:
```json
{
  "success": true,
  "count": 15,
  "teams": [
    {
      "teamId": "team-id-2",
      "teamName": "Tech Titans",
      "leaderName": "Priya Patel",
      "leaderEmail": "priya@example.com",
      "leaderPhone": "+919876543220",
      "verificationStatus": "PENDING"
    }
    // ... more teams
  ]
}
```

---

## Step 7: Get Phone Numbers for Calling

```bash
curl http://localhost:3000/api/teams/unverified/phone-numbers
```

Expected response:
```json
{
  "success": true,
  "count": 15,
  "phoneNumbers": [
    "+919876543220",
    "+919876543230",
    "+919876543240"
    // ... more numbers
  ],
  "callFeature": {
    "description": "Copy phone numbers to your calling app",
    "format": "tel:+919876543220",
    "bulkCallLink": "tel:+919876543220,+919876543230,..."
  }
}
```

**✅ Use these numbers to call unverified team leaders!**

---

## Step 8: Get All Unverified Contacts (for Bulk Email)

```bash
curl http://localhost:3000/api/teams/unverified/all-contacts
```

Expected response:
```json
{
  "success": true,
  "count": 45,
  "contacts": [
    {
      "teamId": "team-id-2",
      "teamName": "Tech Titans",
      "members": [
        {
          "memberId": "member-id-5",
          "fullName": "Priya Patel",
          "email": "priya@example.com",
          "phone": "+919876543220",
          "isLeader": true
        },
        {
          "memberId": "member-id-6",
          "fullName": "Amit Kumar",
          "email": "amit@example.com",
          "phone": "+919876543221",
          "isLeader": false
        }
        // ... more members
      ]
    }
    // ... more teams
  ]
}
```

**✅ This gives you ALL members (leaders + team members) for bulk email!**

---

## Step 9: Send Bulk Verification Reminder Emails

⚠️ **Before running this, configure SendGrid:**

1. Get API key from https://sendgrid.com
2. Update `.env`:
```env
SENDGRID_API_KEY=SG.your-actual-key-here
FROM_EMAIL=noreply@loophackathon.com
FROM_NAME=Loop Hackathon
```

3. Restart server: `pnpm dev`

Then run:

```bash
curl -X POST http://localhost:3000/api/teams/send-verification-reminders
```

Expected response:
```json
{
  "success": true,
  "message": "Verification reminders sent",
  "stats": {
    "sent": 42,
    "failed": 3,
    "total": 45
  }
}
```

**✅ This sends emails to ALL members of unverified teams (leaders + members)!**

---

## Step 10: Export Teams to CSV

**Export all teams:**
```bash
curl http://localhost:3000/api/teams/export > all_teams.csv
```

**Export only verified teams:**
```bash
curl http://localhost:3000/api/teams/export?status=VERIFIED > verified_teams.csv
```

**Export only unverified teams:**
```bash
curl http://localhost:3000/api/teams/export?status=PENDING > unverified_teams.csv
```

**Export only rejected teams:**
```bash
curl http://localhost:3000/api/teams/export?status=REJECTED > rejected_teams.csv
```

---

## Step 11: Manually Verify a Team

Get team ID from the verified/unverified list, then:

```bash
# Replace 'team-id-here' with actual team ID
curl -X PATCH http://localhost:3000/api/teams/team-id-here/verify
```

Expected response:
```json
{
  "success": true,
  "message": "Team verified successfully",
  "team": {
    "id": "team-id-here",
    "teamName": "Tech Titans",
    "verificationStatus": "VERIFIED",
    "verifiedAt": "2026-01-10T..."
  }
}
```

---

## Step 12: Re-upload Same CSV (Update Test)

Upload the same CSV again to test update logic:

```bash
curl -X POST http://localhost:3000/api/teams/upload-csv \
  -F "file=@uploads/your-file.csv"
```

Expected response:
```json
{
  "success": true,
  "message": "CSV processed successfully",
  "stats": {
    "totalTeams": 25,
    "newTeams": 0,
    "updatedTeams": 25,  // ← All updated, not duplicated!
    "errors": 0
  }
}
```

**✅ Teams are updated, not duplicated!**

---

## 🎯 Quick Test Workflow

```bash
# 1. Start server
pnpm dev

# 2. In another terminal, run all tests:

# Upload CSV
curl -X POST http://localhost:3000/api/teams/upload-csv \
  -F "file=@uploads/registrations.csv"

# Get stats
curl http://localhost:3000/api/teams/stats

# Get verified teams
curl http://localhost:3000/api/teams/verified

# Get unverified teams
curl http://localhost:3000/api/teams/unverified

# Get phone numbers for calling
curl http://localhost:3000/api/teams/unverified/phone-numbers

# Get all contacts for bulk email
curl http://localhost:3000/api/teams/unverified/all-contacts

# Export to CSV
curl http://localhost:3000/api/teams/export?status=PENDING > unverified.csv
```

---

## 🐛 Troubleshooting

### Error: "No CSV file uploaded"
- Make sure the field name is `file`
- Use `-F "file=@path/to/file.csv"`

### Error: "Only CSV files are allowed"
- File must have `.csv` extension
- MIME type must be `text/csv`

### Error: "Failed to send email"
- Check SENDGRID_API_KEY in `.env`
- Verify SendGrid account is active
- Check SendGrid free tier limits (100 emails/day)

### Error: "Database connection failed"
- Check DATABASE_URL in `.env`
- Ensure PostgreSQL is running
- Verify network connectivity to Azure

### Error: "Team not found"
- Use correct team ID from the GET endpoints
- Check if team exists in database

---

## 📊 Expected Database State After Upload

Check in Prisma Studio:
```bash
pnpm prisma:studio
```

You should see:
- ✅ Teams in `Team` table
- ✅ Members in `TeamMember` table (with `isLeader` flag)
- ✅ SyncJob entry with import stats
- ✅ CommunicationLog entries (if emails sent)

---

## 🎉 Success Criteria

✅ CSV uploaded successfully  
✅ Teams imported to database  
✅ Verified/unverified teams separated  
✅ Phone numbers extracted correctly  
✅ All contacts (leaders + members) retrieved  
✅ Bulk emails sent (if SendGrid configured)  
✅ Export to CSV works  
✅ Statistics show correct counts  
✅ Manual verification works  
✅ Re-upload updates (not duplicates)

---

## 📝 Next Steps After Testing

If all tests pass, you're ready for:
1. **Feature 2** - Submission tracking
2. **Feature 3** - Evaluation system
3. **Feature 4** - Payment integration
4. **Feature 5** - Automated cron jobs

Need help? Check `FEATURE_1_GUIDE.md` for detailed API documentation!
