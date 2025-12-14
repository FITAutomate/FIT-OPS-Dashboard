# FIT Ops - Modular Dashboard Application

A modern, service-oriented Operations application integrating **HubSpot** and **Airtable** with a beautiful React frontend.

## 🏗️ Architecture Overview

This project follows a **Service-Oriented Architecture** designed for modularity, maintainability, and clear separation of concerns.

### 1. Frontend Layer (React + Vite)
- **Role**: Handles UI rendering, user interactions, and state management.
- **Tech Stack**: React 19, Tailwind CSS v4, Wouter (Routing), TanStack Query (Data Fetching).
- **Component Structure**:
    - `components/ui`: Low-level, reusable UI atoms (buttons, cards, inputs).
    - `components/layout`: Structural components (Sidebar, Topbar, Layout).
    - `pages`: High-level views that compose components (Dashboard, etc.).
- **Services**: The frontend never calls external APIs directly. It uses typed service modules (`client/src/services/*.ts`) to communicate with the backend API.

### 2. Backend Layer (Node.js + Express)
- **Role**: Acts as the API Gateway and Orchestrator. Securely manages secrets and transforms data.
- **Service Layer** (`server/services/`):
    - `airtable_service.ts`: Encapsulates all logic for reading/writing to Airtable.
    - `hubspot_service.ts`: Encapsulates all logic for HubSpot Deals/Contacts.
    - `config.ts`: Central configuration management for all API keys and field mappings.
- **Endpoints** (`server/routes.ts`): Exposes RESTful endpoints (e.g., `/api/clients`, `/api/deals`) for the frontend to consume.

### 3. External Integrations
- **Airtable**: Acts as the "Single Source of Truth" for Client/Company data.
- **HubSpot**: Manages the Sales Pipeline and Deal stages.
- **Outlook 365**: (Planned) Provides calendar events and scheduling.

```
┌─────────────────┐
│  React Frontend │ 
│  (Port 5000)    │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────────────────────┐
│  Express Backend (Node.js)      │
│  ┌───────────────────────────┐  │
│  │  /api/clients             │  │
│  │  /api/deals               │  │
│  └───────────┬───────────────┘  │
│              │                   │
│  ┌───────────▼───────────────┐  │
│  │  Service Layer            │  │
│  │  • airtable_service.ts    │  │
│  │  • hubspot_service.ts     │  │
│  └───────────┬───────────────┘  │
└──────────────┼───────────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
   Airtable API   HubSpot API
```

---

## 🔐 Environment Variables (Secrets)

To run the application, configure these environment variables in **Replit Secrets**:

| Variable Name | Description | Required |
| :--- | :--- | :---: |
| `HUBSPOT_ACCESS_TOKEN` | Private App Access Token with `crm.objects.deals.read` and `crm.objects.contacts.read` scopes. | ✅ |
| `AIRTABLE_API_KEY` | Personal Access Token (PAT) with `data.records:read` and `data.records:write` scopes. | ✅ |
| `AIRTABLE_BASE_ID` | The ID of the Base containing the 'Companies' table (format: `appXXXXXXXXXXXXXX`). | ✅ |
| `SESSION_SECRET` | Secret key for session management (auto-generated). | ✅ |

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Secrets
Add the required environment variables in the **Replit Secrets** tab.

### 3. Run Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5000`.

---

## 📡 API Endpoints

### GET `/api/clients`
Fetches all company records from Airtable.

**Response:**
```json
[
  {
    "id": "recXXXXXXXXXX",
    "name": "TechFlow Solutions",
    "website": "https://techflow.com",
    "industry": "Software",
    "companySize": "50-200",
    "country": "USA",
    "status": "Active Client",
    "notes": "Key strategic partner.",
    "logo": "https://..."
  }
]
```

### GET `/api/deals`
Fetches all deals from HubSpot CRM.

**Query Parameters:**
- `stage` (optional): Filter by deal stage (e.g., `?stage=Proposal`)

**Response:**
```json
[
  {
    "id": "123456",
    "name": "Q4 Architecture Revamp",
    "amount": 50000,
    "stage": "Proposal",
    "closeDate": "2025-12-15T00:00:00.000Z",
    "companyId": "789"
  }
]
```

### GET `/api/health`
Health check endpoint to verify API server status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-13T03:00:00.000Z",
  "services": {
    "airtable": true,
    "hubspot": true
  }
}
```

---

## 🎨 Design System

### FIT Brand Colors
- **Primary (fit-blue)**: `#007CE8` (Buttons, Links, Accents)
- **Success (fit-green)**: `#1CD000` (Success States, Positive Actions)
- **Dark (fit-dark)**: `#00006C` (Sidebar Background)
- **Light (fit-light)**: `#DBE2E3` (Card Backgrounds)

### Typography
- **Headings**: Montserrat (Bold, Professional)
- **Body**: Open Sans (Clean, Readable)

---

## 📝 Development Guidelines

### Code Quality Standards
- **Backend (TypeScript)**: All functions must include JSDoc comments explaining purpose, parameters, and returns.
- **Frontend (React)**: All major components must have JSDoc-style comments describing props and behavior.
- **Inline Comments**: Use brief inline comments to explain complex logic, particularly in API mapping.

### Service-Oriented Principles
- **Thin Controllers**: API routes in `server/routes.ts` should only handle HTTP concerns (request/response). Business logic lives in service files.
- **Separation of Concerns**: External API logic is entirely contained within dedicated service files.
- **Standardized Responses**: All service functions return standardized TypeScript interfaces, abstracting away vendor-specific formats.

---

## 🔄 Current Status

✅ **Phase 1 Complete**: Visual prototype with FIT branding  
✅ **Phase 2.1 Complete**: Live API integration (HubSpot + Airtable)  
🔜 **Phase 2.2**: Bidirectional sync logic  
🔜 **Phase 3**: Full CRUD operations and conflict resolution  

---

## 📦 Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, TanStack Query, Wouter
- **Backend**: Node.js, Express, TypeScript
- **Integrations**: HubSpot API Client, Airtable.js
- **UI Components**: Radix UI (shadcn/ui), Lucide Icons, Framer Motion

---

## 📄 License

MIT
