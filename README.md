# FIT CRM - Architecture & Setup

## Architecture Overview

This project follows a **Service-Oriented Architecture** designed for modularity, maintainability, and clear separation of concerns.

### 1. Frontend Layer (React + Vite)
- **Role**: Handles UI rendering, user interactions, and state management.
- **Tech Stack**: React 18, Tailwind CSS v4, Wouter (Routing), TanStack Query (Data Fetching).
- **Component Structure**:
    - `components/ui`: Low-level, reusable UI atoms (buttons, cards, inputs).
    - `components/layout`: Structural components (Sidebar, Topbar).
    - `pages`: High-level views that compose components.
- **Services**: The frontend never calls external APIs directly. It uses typed service modules (`client/src/services/*.ts`) to communicate with the backend Flask API.

### 2. Backend Layer (Python + Flask) [Planned]
- **Role**: Acts as the API Gateway and Orchestrator. Securely manages secrets and transforms data.
- **Service Layer**:
    - `airtable_service.py`: Encapsulates all logic for reading/writing to Airtable.
    - `hubspot_service.py`: Encapsulates all logic for HubSpot Deals/Contacts.
    - `outlook_service.py`: Handles Microsoft Graph API interactions.
- **Endpoints**: Exposes RESTful endpoints (e.g., `/api/clients`, `/api/deals`) for the frontend to consume.

### 3. External Integrations
- **Airtable**: Acts as the "Single Source of Truth" for Client data.
- **HubSpot**: Manages the Sales Pipeline and Deal stages.
- **Outlook 365**: Provides calendar events and scheduling.

---

## Environment Variables (Secrets)

To run the backend services, the following environment variables must be configured in Replit Secrets:

| Variable Name | Description |
| :--- | :--- |
| `HUBSPOT_ACCESS_TOKEN` | Private App Access Token with `crm.objects.deals.read` and `crm.objects.contacts.read` scopes. |
| `AIRTABLE_API_KEY` | Personal Access Token (PAT) with `data.records:read` and `data.records:write` scopes. |
| `AIRTABLE_BASE_ID` | The ID of the Base containing the 'Companies' table. |
| `OUTLOOK_CLIENT_ID` | (Future) Azure AD Application Client ID. |
| `OUTLOOK_CLIENT_SECRET`| (Future) Azure AD Application Client Secret. |

---

## Development Guidelines

- **Frontend Mock Mode**: Currently, the frontend services in `client/src/services/` are using mock data to simulate the API response. When the backend is ready, uncomment the `fetch` calls.
- **Code Quality**: All functions must include JSDoc (Frontend) or Docstrings (Backend).
