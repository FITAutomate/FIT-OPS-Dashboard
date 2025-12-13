/**
 * Service for interacting with the HubSpot API via the backend.
 * Handles fetching and processing Deal records.
 */
export const hubspotService = {
  /**
   * Fetches all deals from the backend API.
   * 
   * @returns {Promise<Deal[]>} A promise that resolves to an array of Deal objects.
   * @throws {Error} If the API request fails.
   */
  getDeals: async (): Promise<Deal[]> => {
    // In a real full-stack app, this would be:
    // const response = await fetch('/api/deals');
    // if (!response.ok) throw new Error('Failed to fetch deals');
    // return response.json();

    // MOCK IMPLEMENTATION FOR FRONTEND PROTOTYPE
    await new Promise(resolve => setTimeout(resolve, 1000));
    return MOCK_DEALS;
  },

  /**
   * Fetches deals filtered by a specific stage.
   * 
   * @param {string} stage - The deal stage to filter by.
   * @returns {Promise<Deal[]>} A promise that resolves to an array of filtered Deal objects.
   */
  getDealsByStage: async (stage: string): Promise<Deal[]> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    return MOCK_DEALS.filter(d => d.stage === stage);
  }
};

// --- MOCK DATA ---

/**
 * Interface representing a Deal record from HubSpot.
 */
export interface Deal {
  /** Unique identifier for the deal */
  id: string;
  /** Name of the deal */
  name: string;
  /** Monetary value of the deal */
  amount: number;
  /** Current stage in the pipeline */
  stage: "New" | "Discovery" | "Proposal" | "Negotiation" | "Closed Won" | "Closed Lost";
  /** Expected or actual close date (ISO string) */
  closeDate: string;
  /** ID of the associated company */
  companyId: string;
}

export const MOCK_DEALS: Deal[] = [
  {
    id: "deal1",
    name: "Q4 Architecture Revamp",
    amount: 50000,
    stage: "Proposal",
    closeDate: "2025-12-15",
    companyId: "rec1"
  },
  {
    id: "deal2",
    name: "Automation Implementation",
    amount: 25000,
    stage: "Discovery",
    closeDate: "2026-01-20",
    companyId: "rec2"
  },
  {
    id: "deal3",
    name: "Annual Maintenance Contract",
    amount: 15000,
    stage: "Negotiation",
    closeDate: "2025-11-30",
    companyId: "rec3"
  },
  {
    id: "deal4",
    name: "Cloud Migration Strategy",
    amount: 120000,
    stage: "Closed Won",
    closeDate: "2025-10-15",
    companyId: "rec1"
  },
  {
    id: "deal5",
    name: "Legacy System Audit",
    amount: 8000,
    stage: "New",
    closeDate: "2026-02-10",
    companyId: "rec5"
  }
];
