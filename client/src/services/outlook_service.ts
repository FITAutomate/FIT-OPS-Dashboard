export interface CalendarEvent {
  id: string;
  subject: string;
  start: string;
  end: string;
  location: string;
  attendees: string[];
  type: "meeting" | "call" | "deadline";
}

export const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: "evt1",
    subject: "TechFlow Implementation Kickoff",
    start: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    end: new Date(Date.now() + 90000000).toISOString(),
    location: "Zoom",
    attendees: ["john@techflow.com", "sarah@fit.com"],
    type: "meeting"
  },
  {
    id: "evt2",
    subject: "GreenLeaf Discovery Call",
    start: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
    end: new Date(Date.now() + 176400000).toISOString(),
    location: "Microsoft Teams",
    attendees: ["mike@greenleaf.com", "david@fit.com"],
    type: "call"
  },
  {
    id: "evt3",
    subject: "Proposal Review: Apex Logistics",
    start: new Date(Date.now() + 259200000).toISOString(), // 3 days later
    end: new Date(Date.now() + 262800000).toISOString(),
    location: "Conference Room A",
    attendees: ["internal-team@fit.com"],
    type: "meeting"
  },
  {
    id: "evt4",
    subject: "Q4 Revenue Report Due",
    start: new Date(Date.now() + 432000000).toISOString(), // 5 days later
    end: new Date(Date.now() + 432000000).toISOString(),
    location: "N/A",
    attendees: ["finance@fit.com"],
    type: "deadline"
  }
];

// Placeholder service for Microsoft Graph API
// To implement real auth:
// 1. Register app in Azure AD
// 2. Request scopes: Calendars.Read, Calendars.ReadWrite
// 3. Use MSAL.js for OAuth 2.0 flow
export const outlookService = {
  getCalendarEvents: async (): Promise<CalendarEvent[]> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1200));
    return MOCK_EVENTS;
  },

  createEvent: async (event: Omit<CalendarEvent, "id">): Promise<CalendarEvent> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const newEvent = { ...event, id: `evt${Math.random().toString(36).substr(2, 9)}` };
    MOCK_EVENTS.push(newEvent);
    return newEvent;
  }
};
