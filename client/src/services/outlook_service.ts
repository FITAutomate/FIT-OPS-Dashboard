/**
 * Service for interacting with the Microsoft Graph API via the backend.
 * Handles fetching calendar events.
 */
export const outlookService = {
  /**
   * Fetches upcoming calendar events.
   * 
   * @returns {Promise<CalendarEvent[]>} A promise that resolves to an array of CalendarEvent objects.
   * @throws {Error} If the API request fails.
   */
  getCalendarEvents: async (): Promise<CalendarEvent[]> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1200));
    return MOCK_EVENTS;
  },

  /**
   * Creates a new calendar event.
   * 
   * @param {Omit<CalendarEvent, "id">} event - The event data to create.
   * @returns {Promise<CalendarEvent>} A promise that resolves to the created event with an ID.
   */
  createEvent: async (event: Omit<CalendarEvent, "id">): Promise<CalendarEvent> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const newEvent = { ...event, id: `evt${Math.random().toString(36).substr(2, 9)}` };
    MOCK_EVENTS.push(newEvent);
    return newEvent;
  }
};

// --- MOCK DATA ---

/**
 * Interface representing a Calendar Event from Outlook/Exchange.
 */
export interface CalendarEvent {
  /** Unique identifier for the event */
  id: string;
  /** Subject/Title of the event */
  subject: string;
  /** Start date-time (ISO string) */
  start: string;
  /** End date-time (ISO string) */
  end: string;
  /** Event location or meeting link */
  location: string;
  /** List of attendee email addresses */
  attendees: string[];
  /** Classification of the event type */
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
