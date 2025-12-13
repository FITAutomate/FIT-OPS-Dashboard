export interface Company {
  id: string;
  name: string;
  website: string;
  industry: string;
  companySize: string;
  country: string;
  status: "Prospect" | "Active Client" | "Past Client" | "Partner" | "Internal";
  notes: string;
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

export const airtableService = {
  getCompanies: async (): Promise<Company[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    return MOCK_COMPANIES;
  },
  
  getCompanyById: async (id: string): Promise<Company | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_COMPANIES.find(c => c.id === id);
  }
};
