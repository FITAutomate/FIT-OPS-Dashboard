/**
 * Central Configuration Management
 * 
 * Defines all external API configurations, table names, and field mappings.
 * All sensitive keys are loaded from environment variables.
 */

export const config = {
  /**
   * Airtable Configuration
   */
  airtable: {
    apiKey: process.env.AIRTABLE_API_KEY || '',
    baseId: process.env.AIRTABLE_BASE_ID || '',
    tables: {
      companies: 'Companies',
      contacts: 'Contacts',
      deals: 'Deals / Engagements',
      projects: 'Projects',
      meetings: 'Meetings / Discovery Calls'
    }
  },

  /**
   * HubSpot Configuration
   */
  hubspot: {
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN || '',
    pipelines: {
      sales: 'default', // Default pipeline
      stages: [
        'New',
        'Discovery',
        'Proposal',
        'Negotiation',
        'Closed Won',
        'Closed Lost'
      ]
    }
  },

  /**
   * Field Mapping between Airtable and HubSpot
   * Maps Airtable field names to HubSpot property names for synchronization
   */
  fieldMapping: {
    company: {
      airtable: {
        name: 'Company Name',
        website: 'Website',
        industry: 'Industry',
        size: 'Company Size',
        country: 'Country / Region',
        status: 'Status'
      },
      hubspot: {
        name: 'name',
        website: 'website',
        industry: 'industry',
        size: 'numberofemployees',
        country: 'country',
        status: 'lifecyclestage'
      }
    },
    deal: {
      airtable: {
        name: 'Deal Name',
        amount: 'Deal Value',
        stage: 'Stage',
        closeDate: 'Close Date'
      },
      hubspot: {
        name: 'dealname',
        amount: 'amount',
        stage: 'dealstage',
        closeDate: 'closedate'
      }
    }
  }
};
