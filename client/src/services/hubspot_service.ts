export interface Deal {
  id: string;
  name: string;
  amount: number;
  stage: "New" | "Discovery" | "Proposal" | "Negotiation" | "Closed Won" | "Closed Lost";
  closeDate: string;
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

export const hubspotService = {
  getDeals: async (): Promise<Deal[]> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return MOCK_DEALS;
  },

  getDealsByStage: async (stage: string): Promise<Deal[]> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    return MOCK_DEALS.filter(d => d.stage === stage);
  }
};
