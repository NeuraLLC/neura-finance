# NeuraPay Merchant Dashboard

Beautiful Apple-inspired merchant dashboard for NeuraPay payment platform.

## Features

- 🎨 **Apple Design Language** - Clean, minimalist UI inspired by apple.com
- 📊 **Real-time Analytics** - Monitor payments, revenue, and performance
- 💳 **Transaction Management** - View and manage all transactions
- 🔗 **Payment Links** - Create and manage white-labeled payment links
- 💰 **Refund Management** - Process full and partial refunds
- 🔐 **Secure Authentication** - API key + HMAC signature authentication
- ⚡ **Fast & Responsive** - Built with Next.js 14 and React 18

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Charts:** Recharts
- **State Management:** Zustand
- **Data Fetching:** SWR

## Getting Started

### Prerequisites

- Node.js 18+ or Bun 1.0+
- NeuraPay backend API running on `http://localhost:3000`

### Installation

```bash
# Navigate to merchant-client directory
cd merchant-client

# Install dependencies with Bun
bun install

# Or with npm
npm install
```

### Environment Variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=NeuraPay
```

### Development

```bash
# Start development server (runs on port 3001)
bun run dev

# Or with npm
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

### Build for Production

```bash
# Build the application
bun run build

# Start production server
bun run start
```

## Project Structure

```
merchant-client/
├── src/
│   ├── app/
│   │   ├── dashboard/          # Dashboard pages
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Login page
│   ├── components/             # Reusable components
│   │   └── Sidebar.tsx         # Dashboard sidebar
│   ├── lib/
│   │   ├── api.ts             # API client
│   │   └── utils.ts           # Utility functions
│   ├── hooks/                  # Custom React hooks
│   └── types/                  # TypeScript types
├── public/                     # Static assets
├── tailwind.config.ts         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
└── next.config.mjs            # Next.js configuration
```

## Design System

### Colors

- **Primary:** Black (#000000)
- **Secondary:** Gray (#86868b)
- **Accent:** Blue (#0071e3)
- **Success:** Green (#30d158)
- **Warning:** Orange (#ff9f0a)
- **Error:** Red (#ff3b30)

### Typography

- **Font Family:** SF Pro (Apple system fonts)
- **Letter Spacing:** Tight for headings, normal for body
- **Line Height:** 1.5 for readability

### Components

All components follow Apple's design principles:
- Minimalist and clean
- Subtle shadows and borders
- Smooth transitions (200-300ms)
- Rounded corners (apple, apple-sm, apple-lg)
- Focus on content, not chrome

## Authentication

The dashboard uses API key authentication with HMAC signatures:

1. Merchant provides API key and secret on login
2. Each request includes:
   - `X-API-Key`: Merchant's API key
   - `X-Signature`: HMAC-SHA256 signature
   - `X-Timestamp`: Unix timestamp

This ensures secure, stateless authentication.

## Features Roadmap

### ✅ Implemented
- Login/authentication
- Dashboard overview
- Transaction listing
- Basic stats and metrics

### 🚧 In Progress
- Payment links management
- Refund processing
- Stripe Connect onboarding

### 📋 Planned
- Advanced analytics with charts
- Customer management
- Webhook configuration
- Invoice generation
- Export transactions (CSV, PDF)
- Dark mode support
- Multi-language support

## Contributing

This is part of the NeuraPay platform. See main repository for contribution guidelines.

## License

Proprietary - NeuraPay
