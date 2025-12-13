/**
 * Service for interacting with the Airtable API via the backend.
 * Handles fetching and processing company/client records.
 */
export const airtableService = {
  /**
   * Fetches all companies (clients) from the backend API.
   * 
   * @returns {Promise<Company[]>} A promise that resolves to an array of Company objects.
   * @throws {Error} If the API request fails.
   */
  getCompanies: async (): Promise<Company[]> => {
    // In a real full-stack app, this would be:
    // const response = await fetch('/api/clients');
    // if (!response.ok) throw new Error('Failed to fetch clients');
    // return response.json();

    // MOCK IMPLEMENTATION FOR FRONTEND PROTOTYPE
    await new Promise(resolve => setTimeout(resolve, 800));
    return MOCK_COMPANIES;
  },
  
  /**
   * Fetches a single company by its ID.
   * 
   * @param {string} id - The unique ID of the company record.
   * @returns {Promise<Company | undefined>} A promise that resolves to the Company object or undefined.
   */
  getCompanyById: async (id: string): Promise<Company | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_COMPANIES.find(c => c.id === id);
  }
};

// --- MOCK DATA ---

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
  status: "Prospect" | "Active Client" | "Past Client" | "Partner" | "Internal";
  /** Internal notes or summary */
  notes: string;
  /** URL to the company logo */
  logo?: string;
}

export const MOCK_COMPANIES: Company[] = [
  {
    id: "rec1",
    name: "TechFlow Solutions",
    website: "https://techflow.example.com",
    industry: "Software",
    companySize: "50-200",
    country: "USA",
    status: "Active Client",
    notes: "Key strategic partner for Q3 rollout.",
    logo: "https://ui-avatars.com/api/?name=TechFlow&background=007CE8&color=fff"
  },
  {
    id: "rec2",
    name: "GreenLeaf Energy",
    website: "https://greenleaf.example.com",
    industry: "Renewable Energy",
    companySize: "200-500",
    country: "Germany",
    status: "Prospect",
    notes: "Met at Energy Summit. Interested in automation.",
    logo: "https://ui-avatars.com/api/?name=GreenLeaf&background=1CD000&color=fff"
  },
  {
    id: "rec3",
    name: "Apex Logistics",
    website: "https://apexlogistics.example.com",
    industry: "Logistics",
    companySize: "1000+",
    country: "Singapore",
    status: "Partner",
    notes: "Co-marketing initiative pending.",
    logo: "https://ui-avatars.com/api/?name=Apex&background=00006C&color=fff"
  },
  {
    id: "rec4",
    name: "Quantum Financial",
    website: "https://quantum.example.com",
    industry: "Finance",
    companySize: "500-1000",
    country: "UK",
    status: "Past Client",
    notes: "Contract ended in 2024. Re-engagement campaign scheduled.",
    logo: "https://ui-avatars.com/api/?name=Quantum&background=DBE2E3&color=000"
  },
  {
    id: "rec5",
    name: "FIT Internal",
    website: "https://forwarditthinking.com",
    industry: "Consulting",
    companySize: "10-50",
    country: "USA",
    status: "Internal",
    notes: "Internal operations tracking.",
    logo: "https://ui-avatars.com/api/?name=FIT&background=007CE8&color=fff"
  }
];
