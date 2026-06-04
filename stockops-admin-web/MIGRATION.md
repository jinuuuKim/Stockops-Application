# Repository Migration Guide

## History

This repository was extracted from the [StockOps monorepo](https://github.com/your-org/stockops)
on 2026-05-11 using `git filter-branch`.

## What Changed

- Extracted `front_web/` directory to repository root
- Preserved all git history (71 commits)
- Added standalone `.gitignore`, `.env.example`, and CI/CD configuration
- Removed Pi-specific deployment files

## Local Development Setup

### 1. Clone this repository

```bash
git clone https://github.com/your-org/stockops-admin-web.git
cd stockops-admin-web
```

### 2. Install dependencies

```bash
npm ci
```

### 3. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local with your backend API URL
```

### 4. Start development server

```bash
npm run dev
```

### 5. Start backend (in separate terminal)

```bash
git clone https://github.com/your-org/stockops-api.git
cd stockops-api
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

## Migration from Monorepo

If you were working in the monorepo:

1. Your frontend code is now here
2. Update any relative imports (none should be affected)
3. API endpoints remain the same (`/api/v1/...`)
