/**
 * Central Configuration Management
 * 
 * Defines all external API configurations, table names, field mappings,
 * and webhook settings. All sensitive keys are loaded from environment variables.
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
    clientSecret: process.env.HUBSPOT_CLIENT_SECRET || '', // For webhook signature verification
    appId: process.env.HUBSPOT_APP_ID || '',
    pipelines: {
      sales: 'default',
      stages: {
        new: 'appointmentscheduled',
        discovery: 'qualifiedtobuy',
        proposal: 'presentationscheduled',
        negotiation: 'decisionmakerboughtin',
        contractSent: 'contractsent',
        closedWon: 'closedwon',
        closedLost: 'closedlost'
      }
    },
    /**
     * Deal properties to fetch for sync operations
     */
    dealProperties: [
      'dealname',
      'amount',
      'dealstage',
      'closedate',
      'pipeline',
      'hs_object_id',
      'hubspot_owner_id',
      'description',
      'notes_last_updated'
    ],
    /**
     * Contact properties to fetch for sync operations
     */
    contactProperties: [
      'firstname',
      'lastname',
      'email',
      'phone',
      'jobtitle',
      'company',
      'hs_object_id'
    ],
    /**
     * Properties that trigger a sync when changed
     */
    syncTriggerProperties: [
      'dealname',
      'amount',
      'dealstage',
      'closedate'
    ]
  },

  /**
   * Webhook Configuration
   */
  webhooks: {
    /**
     * Secret for verifying HubSpot webhook signatures
     * HubSpot signs webhooks using the client secret
     */
    hubspotSecret: process.env.HUBSPOT_CLIENT_SECRET || '',
    /**
     * Stages that should trigger a project creation in Airtable
     */
    projectCreationStages: ['closedwon'],
    /**
     * Whether to update existing records on webhook
     */
    enableUpdates: true
  },

  /**
   * Field Mapping between Airtable and HubSpot
   * Maps HubSpot property names to Airtable field names for synchronization
   */
  fieldMapping: {
    /**
     * Deal -> Project field mapping
     * Key: HubSpot property | Value: Airtable field name
     */
    dealToProject: {
      dealname: 'Project Name',
      amount: 'Budget',
      closedate: 'Start Date',
      description: 'Description'
    },
    /**
     * Contact -> Client field mapping
     * Key: HubSpot property | Value: Airtable field name
     */
    contactToClient: {
      firstname: 'First Name',
      lastname: 'Last Name',
      email: 'Email',
      phone: 'Phone',
      jobtitle: 'Job Title',
      company: 'Company Name'
    },
    /**
     * Fields that are "syncable" - can be updated on existing records
     */
    syncableFields: [
      'dealname',
      'amount',
      'closedate',
      'description'
    ],
    /**
     * Contact fields that are "syncable" - can be updated on existing client records
     */
    syncableContactFields: [
      'firstname',
      'lastname',
      'email',
      'phone',
      'jobtitle',
      'company'
    ],
    /**
     * Read-only fields in Airtable (never updated by sync)
     */
    readOnlyFields: [
      'HubSpot Deal ID', // The linking field - never changed
      'HubSpot Contact ID',
      'Created Date'
    ]
  },

  /**
   * Project Status Mapping
   * Maps HubSpot deal stages to Airtable project statuses
   */
  projectStatusMapping: {
    closedwon: 'Active',
    contractsent: 'Pending Approval',
    decisionmakerboughtin: 'Negotiation',
    presentationscheduled: 'Proposal',
    qualifiedtobuy: 'Discovery',
    appointmentscheduled: 'New',
    closedlost: 'Cancelled'
  } as Record<string, string>
};
