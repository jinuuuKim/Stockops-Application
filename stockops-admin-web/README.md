# StockOps Web

React + Vite + TypeScript frontend for StockOps inventory management system.

## Overview

StockOps Web is the frontend application for the StockOps smart inventory management system.
It provides a responsive web interface for inventory tracking, purchase order management,
AI-powered demand forecasting, and real-time reporting.

## Features

- 📦 Inventory management with barcode scanning support
- 📊 Real-time dashboards and analytics
- 🤖 AI-powered demand forecasting and reorder recommendations
- 📱 PWA support with offline read-only mode
- 🔐 Scoped authorization (Global/Center/Warehouse)

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Zustand (state management)
- React Query (data fetching)
- Playwright (E2E testing)

## Prerequisites

- Node.js 20+
- npm or yarn

## Installation

```bash
# Install dependencies
npm ci

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your API URL

# Start development server
npm run dev
```

## Build

```bash
npm run build
```

## Test

```bash
# Unit tests
npm run test:run

# E2E tests
npm run test:e2e

# Lint
npm run lint
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:8080` |

## Related Repositories

- [stockops-api](https://github.com/your-org/stockops-api) — Spring Boot backend
- [stockops-legacy](https://github.com/your-org/stockops) — Original monorepo (frozen)

## License

Private — All rights reserved.
