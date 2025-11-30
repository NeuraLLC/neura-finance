# NeuraPay - AI-Powered Payment Service Provider

Enterprise-grade payment processing platform built for banks, airlines, and high-volume businesses.

## Features

- **Multi-channel payments**: Card and Crypto (via Stripe)
- **Stripe Connect**: Split payments with automated bookkeeping
- **Server-to-server payments**: Secure API for backend integrations
- **Whitelabeled payment links**: Branded payment pages for your business
- **Real-time dashboard**: Live transaction monitoring and analytics
- **Batch processing**: Redis-powered queue for high-volume operations
- **Enterprise security**: PCI-DSS ready, HMAC authentication, encryption

## Tech Stack

- **Framework**: NestJS (Node.js + TypeScript)
- **Database**: Supabase (PostgreSQL)
- **Cache/Queue**: Redis Cloud + BullMQ
- **Payment Processor**: Stripe (Cards + Crypto)
- **Monitoring**: Sentry
- **Real-time**: Supabase Realtime

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Redis Cloud account
- Stripe account with Atlas (Connect enabled)
- Sentry account (optional)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Configure your .env file with your credentials

# Run database migrations
npm run migrate

# Start development server
npm run start:dev
```

### Environment Setup

1. **Supabase**: Create a project at [supabase.com](https://supabase.com)
2. **Redis Cloud**: Create a free database at [redis.com](https://redis.com/try-free/)
3. **Stripe**: Get your API keys from [dashboard.stripe.com](https://dashboard.stripe.com)
4. **Sentry**: Create a project at [sentry.io](https://sentry.io)

## API Documentation

Once running, visit:
- Swagger API Docs: `http://localhost:3000/api/docs`
- Health Check: `http://localhost:3000/health`

## Project Structure

```
neura-pay/
├── src/
│   ├── modules/
│   │   ├── payments/        # Payment processing
│   │   ├── merchants/       # Merchant management
│   │   ├── webhooks/        # Webhook system
│   │   ├── auth/           # Authentication
│   │   └── analytics/      # Analytics & reporting
│   ├── common/
│   │   ├── guards/         # Auth guards
│   │   ├── interceptors/   # Logging, transformation
│   │   ├── decorators/     # Custom decorators
│   │   └── filters/        # Exception filters
│   ├── database/
│   │   ├── migrations/     # Database migrations
│   │   └── schemas/        # Database schemas
│   ├── config/            # Configuration
│   └── main.ts            # Application entry point
├── test/                  # E2E tests
└── package.json
```

## Security

- HMAC signature verification for all API requests
- Idempotency keys to prevent duplicate payments
- Row-level security in PostgreSQL
- Encrypted sensitive data at rest
- Rate limiting on all endpoints
- Webhook signature verification

## Compliance Roadmap

- [ ] PCI-DSS Level 1
- [ ] SOC 2 Type II
- [ ] ISO 27001
- [ ] GDPR compliance
- [ ] Regional certifications

## License

Proprietary - All rights reserved
