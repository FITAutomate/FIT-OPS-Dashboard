/**
 * Service for interacting with the Airtable API via the backend.
 * Handles fetching and processing company/client records.
 */

/**
 * Interface representing a Company/Client record.
 * Matches the structure returned by the /api/clients endpoint.
 */
export interface Company {
  /** Unique identifier for the record */
  id: string;
  /** Name of the company */
  name: string;
  /** Website URL */
  website: string;
  /** Industry sector */
  industry: string;
  /** Size bracket of the company */
  companySize: string;
  /** Country or region */
  country: string;
  /** Current relationship status */
  status: "Prospect" | "Active Client" | "Past Client" | "Partner" | "Internal" | string;
  /** Internal notes or summary */
  notes: string;
  /** URL to the company logo */
  logo?: string;
}

export const airtableService = {
  /**
   * Fetches all companies (clients) from the backend API.
   * 
   * @returns {Promise<Company[]>} A promise that resolves to an array of Company objects.
   * @throws {Error} If the API request fails.
   */
  getCompanies: async (): Promise<Company[]> => {
    const response = await fetch('/api/clients');
    if (!response.ok) {
      throw new Error(`Failed to fetch clients: ${response.statusText}`);
    }
    return response.json();
  },
  
  /**
   * Fetches a single company by its ID.
   * 
   * @param {string} id - The unique ID of the company record.
   * @returns {Promise<Company | undefined>} A promise that resolves to the Company object or undefined.
   */
  getCompanyById: async (id: string): Promise<Company | undefined> => {
    const response = await fetch(`/api/clients/${id}`);
    if (!response.ok) {
      if (response.status === 404) return undefined;
      throw new Error(`Failed to fetch client: ${response.statusText}`);
    }
    return response.json();
  }
};
