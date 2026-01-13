# Loop Hackathon Backend

Backend API for Loop Hackathon management system with automated workflows for registration, submission tracking, evaluation, and payment processing.

## Tech Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Queue:** Bull (Redis-based)
- **Storage:** Azure Blob Storage
- **Payment:** Razorpay
- **Email:** SendGrid
- **SMS:** Twilio
- **Cron Jobs:** node-cron

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database
- Redis server
- Azure Blob Storage account
- Razorpay account

### Installation

```bash
# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
pnpm prisma:generate

# Run database migrations
pnpm prisma:migrate

# Start development server
pnpm dev
```

## Available Scripts

```bash
pnpm dev              # Start development server with hot reload
pnpm build            # Build TypeScript to JavaScript
pnpm start            # Start production server
pnpm prisma:generate  # Generate Prisma client
pnpm prisma:migrate   # Run database migrations
pnpm prisma:studio    # Open Prisma Studio (database GUI)
pnpm prisma:push      # Push schema changes to database
```

## Project Structure

```
Backend/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── services/         # Business logic
│   │   ├── payment/      # Razorpay integration
│   │   ├── storage/      # Azure Blob Storage
│   │   ├── communication/# Email & SMS
│   │   ├── sync/         # Data sync from Unstop
│   │   ├── state/        # Team state management
│   │   ├── action/       # Action engine
│   │   └── evaluation/   # Evaluation logic
│   ├── models/           # Database models (Prisma)
│   ├── routes/           # API routes
│   ├── middleware/       # Express middleware
│   ├── utils/            # Utility functions
│   ├── jobs/             # Cron jobs & Bull queues
│   ├── types/            # TypeScript types
│   └── index.ts          # Entry point
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Database migrations
├── .env                  # Environment variables
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies
```

## Environment Variables

See `.env` file for all required environment variables:

- Database connection
- Redis URL
- JWT secret
- SendGrid API key
- Twilio credentials
- Razorpay keys
- Azure Storage connection
- Unstop API credentials

## API Endpoints

### Health & Info
- `GET /health` - Health check
- `GET /api` - API information

### Teams Management
- `GET /api/teams` - List all teams
- `GET /api/teams/:id` - Get team details
- `PATCH /api/teams/:id/verify` - Verify team
- `GET /api/teams/export` - Export teams data

### Submissions
- `GET /api/submissions` - List submissions
- `GET /api/submissions/:teamId` - Get team submission

### Evaluations
- `GET /api/evaluations` - List evaluations
- `POST /api/evaluations` - Create/Update evaluation
- `POST /api/evaluations/shortlist` - Generate shortlist

### Payments
- `POST /api/payments/invite/:teamId` - Send payment invite
- `POST /api/payments/create-order/:teamId` - Create payment order
- `POST /api/payments/verify` - Verify payment webhook
- `GET /api/payments/:teamId` - Get payment status

### Communications
- `POST /api/communications/send` - Send message
- `POST /api/communications/bulk` - Send bulk messages
- `GET /api/communications/logs` - View logs

## Development

The server runs on `http://localhost:3000` by default.

Visit `http://localhost:3000/health` to check if the server is running.

## Database

Using Prisma ORM with PostgreSQL.

```bash
# View database in browser
pnpm prisma:studio

# Create a new migration
pnpm prisma:migrate

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset
```

## License

ISC
