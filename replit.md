# FIT CRM - Replit Agent Guide

## Overview

FIT CRM is a modular Customer Relationship Management application that integrates HubSpot (sales pipeline/deals) and Airtable (client/company data) with a React frontend. The system follows a service-oriented architecture where the Express backend acts as an API gateway, and the frontend communicates exclusively through typed service modules. The application is designed for a consulting or professional services firm, featuring a custom design system with specific brand colors and typography.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 19 with Vite bundler
- **Styling**: Tailwind CSS v4 with custom FIT Design System (brand colors: fit-blue #007CE8, fit-green #1CD000, fit-dark #00006C)
- **Routing**: Wouter (lightweight React router)
- **Data Fetching**: TanStack Query for server state management
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Typography**: Montserrat (headings) and Open Sans (body) via Google Fonts

### Component Organization
- `components/ui/`: Reusable UI atoms (buttons, cards, inputs) from shadcn/ui
- `components/layout/`: Structural components (Sidebar, Topbar, Layout wrapper)
- `pages/`: High-level page views (Dashboard, etc.)
- `services/`: Typed client-side API service modules that call backend endpoints

### Backend Architecture
- **Runtime**: Node.js with Express
- **Role**: API Gateway and data orchestrator - handles secrets, transforms data between services
- **Service Layer** (`server/services/`):
  - `airtable_service.ts`: CRUD operations for Companies and Projects in Airtable
  - `hubspot_service.ts`: Deal management and pipeline operations via HubSpot API
  - `sync_service.ts`: Orchestrates UPSERT logic between HubSpot and Airtable via webhooks
  - `config.ts`: Centralized configuration for API keys, table names, field mappings

### Data Flow Pattern
1. Frontend services call backend `/api/*` endpoints
2. Backend routes delegate to appropriate service modules
3. Services interact with external APIs (HubSpot, Airtable)
4. Responses are transformed and returned to frontend

### Database
- PostgreSQL with Drizzle ORM for local data (users table currently)
- Schema defined in `shared/schema.ts`
- Migrations in `/migrations` directory
- Primary data storage is external (Airtable for clients, HubSpot for deals)

### Webhook Integration
- HubSpot webhooks trigger sync operations to Airtable
- HMAC-SHA256 signature verification for security
- Batch processing support for multiple webhook events

## External Dependencies

### Third-Party Services
- **Airtable**: Client/Company data storage (via `airtable` npm package)
  - Environment variables: `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`
  - Tables: Companies, Contacts, Deals/Engagements, Projects, Meetings

- **HubSpot**: Sales pipeline and deal management (via `@hubspot/api-client`)
  - Environment variables: `HUBSPOT_ACCESS_TOKEN`, `HUBSPOT_CLIENT_SECRET`, `HUBSPOT_APP_ID`
  - Webhook secret for signature verification

- **Microsoft Outlook 365**: Calendar integration (planned, currently using mock data)
  - Placeholder service implemented in `outlook_service.ts`

### Database
- PostgreSQL via `DATABASE_URL` environment variable
- Used with Drizzle ORM and `connect-pg-simple` for session storage

### Key NPM Packages
- `@tanstack/react-query`: Server state management
- `drizzle-orm` / `drizzle-zod`: Database ORM and validation
- `framer-motion`: Animations (used in Dashboard)
- `date-fns`: Date formatting utilities
- Full shadcn/ui component set via Radix UI primitives