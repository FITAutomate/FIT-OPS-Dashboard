/**
 * Service for interacting with the HubSpot API via the backend.
 * Handles fetching and processing Deal records.
 */

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
  stage: "New" | "Discovery" | "Proposal" | "Negotiation" | "Closed Won" | "Closed Lost" | string;
  /** Expected or actual close date (ISO string) */
  closeDate: string;
  /** ID of the associated company */
  companyId?: string;
}

export const hubspotService = {
  /**
   * Fetches all deals from the backend API.
   * 
   * @returns {Promise<Deal[]>} A promise that resolves to an array of Deal objects.
   * @throws {Error} If the API request fails.
   */
  getDeals: async (): Promise<Deal[]> => {
    const response = await fetch('/api/deals');
    if (!response.ok) {
      throw new Error(`Failed to fetch deals: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Fetches deals filtered by a specific stage.
   * 
   * @param {string} stage - The deal stage to filter by.
   * @returns {Promise<Deal[]>} A promise that resolves to an array of filtered Deal objects.
   */
  getDealsByStage: async (stage: string): Promise<Deal[]> => {
    const response = await fetch(`/api/deals?stage=${encodeURIComponent(stage)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch deals by stage: ${response.statusText}`);
    }
    return response.json();
  }
};
