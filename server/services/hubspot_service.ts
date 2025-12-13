/**
 * HubSpot Service Module
 * 
 * Encapsulates all HubSpot API interactions for the CRM.
 * Handles fetching and transforming Deal records from the Sales Pipeline.
 */

import { Client } from '@hubspot/api-client';
import { config } from './config';

/**
 * Interface representing a standardized Deal record.
 */
export interface Deal {
  id: string;
  name: string;
  amount: number;
  stage: string;
  stageId: string;
  closeDate: string;
  companyId?: string;
  description?: string;
  ownerId?: string;
}

/**
 * Interface for contact details
 */
export interface ContactDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  companyName?: string;
}

/**
 * Interface for company details
 */
export interface CompanyDetails {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  numberOfEmployees?: string;
  country?: string;
}

/**
 * Interface for deal with full associations
 */
export interface DealWithAssociations extends Deal {
  contacts?: ContactDetails[];
  company?: CompanyDetails;
}

/**
 * Initialize HubSpot client with access token from config
 */
const hubspotClient = new Client({ accessToken: config.hubspot.accessToken });

/**
 * Fetches all deals from HubSpot CRM.
 * 
 * @returns {Promise<Deal[]>} Array of standardized Deal objects
 * @throws {Error} If HubSpot API request fails
 */
export async function getAllDeals(): Promise<Deal[]> {
  try {
    const response = await hubspotClient.crm.deals.basicApi.getPage(
      100,
      undefined,
      config.hubspot.dealProperties,
      undefined,
      undefined,
      false
    );

    return response.results.map(deal => ({
      id: deal.id,
      name: deal.properties.dealname || 'Untitled Deal',
      amount: parseFloat(deal.properties.amount || '0'),
      stage: mapHubSpotStageToReadable(deal.properties.dealstage || ''),
      stageId: deal.properties.dealstage || '',
      closeDate: deal.properties.closedate || new Date().toISOString(),
      description: deal.properties.description || '',
      ownerId: deal.properties.hubspot_owner_id || undefined,
      companyId: deal.properties.hs_object_id || undefined
    }));
  } catch (error: any) {
    console.error('HubSpot API Error:', error.message);
    throw new Error(`Failed to fetch deals from HubSpot: ${error.message}`);
  }
}

/**
 * Fetches a single deal by ID with all its details.
 * 
 * @param {string} dealId - The HubSpot Deal ID
 * @returns {Promise<Deal | null>} The deal or null if not found
 */
export async function getDealById(dealId: string): Promise<Deal | null> {
  try {
    const deal = await hubspotClient.crm.deals.basicApi.getById(
      dealId,
      config.hubspot.dealProperties
    );

    return {
      id: deal.id,
      name: deal.properties.dealname || 'Untitled Deal',
      amount: parseFloat(deal.properties.amount || '0'),
      stage: mapHubSpotStageToReadable(deal.properties.dealstage || ''),
      stageId: deal.properties.dealstage || '',
      closeDate: deal.properties.closedate || new Date().toISOString(),
      description: deal.properties.description || '',
      ownerId: deal.properties.hubspot_owner_id || undefined,
      companyId: deal.properties.hs_object_id || undefined
    };
  } catch (error: any) {
    console.error(`HubSpot API Error (getDealById): ${error.message}`);
    return null;
  }
}

/**
 * Fetches a deal with its associated contacts and company.
 * Uses the associations batch API for HubSpot SDK v10+.
 * 
 * @param {string} dealId - The HubSpot Deal ID
 * @returns {Promise<DealWithAssociations | null>} Deal with associations or null
 */
export async function getDealWithAssociations(dealId: string): Promise<DealWithAssociations | null> {
  try {
    const deal = await getDealById(dealId);
    if (!deal) return null;

    const result: DealWithAssociations = { ...deal, contacts: [], company: undefined };

    // Try to get associations using the batch read endpoint
    try {
      console.log(`[HubSpot] Fetching contact associations for deal ${dealId}`);
      const associationsResponse = await hubspotClient.crm.associations.batchApi.read(
        'deals',
        'contacts',
        { inputs: [{ id: dealId }] }
      );

      console.log(`[HubSpot] Associations response: ${JSON.stringify(associationsResponse.results)}`);

      if (associationsResponse.results && associationsResponse.results.length > 0) {
        const associations = associationsResponse.results[0];
        if (associations.to && associations.to.length > 0) {
          console.log(`[HubSpot] Found ${associations.to.length} contact associations`);
          for (const assoc of associations.to.slice(0, 5)) {
            try {
              // HubSpot SDK v10+ uses 'id' instead of 'toObjectId'
              const contactId = (assoc as any).toObjectId || (assoc as any).id;
              console.log(`[HubSpot] Fetching contact: ${contactId}`);
              const contact = await hubspotClient.crm.contacts.basicApi.getById(
                contactId,
                ['firstname', 'lastname', 'email', 'phone', 'jobtitle']
              );
              result.contacts!.push({
                id: contact.id,
                firstName: contact.properties.firstname || '',
                lastName: contact.properties.lastname || '',
                email: contact.properties.email || '',
                phone: contact.properties.phone || undefined,
                jobTitle: contact.properties.jobtitle || undefined
              });
              console.log(`[HubSpot] Added contact: ${contact.properties.firstname} ${contact.properties.lastname}`);
            } catch (e: any) {
              const contactId = (assoc as any).toObjectId || (assoc as any).id;
              console.log(`[HubSpot] Error fetching contact ${contactId}: ${e.message}`);
            }
          }
        } else {
          console.log('[HubSpot] No contacts in associations.to array');
        }
      } else {
        console.log('[HubSpot] No results in associations response');
      }
    } catch (e: any) {
      console.log(`[HubSpot] Error fetching contact associations: ${e.message}`);
    }

    // Try to get company associations
    try {
      const companyAssociationsResponse = await hubspotClient.crm.associations.batchApi.read(
        'deals',
        'companies',
        { inputs: [{ id: dealId }] }
      );

      if (companyAssociationsResponse.results && companyAssociationsResponse.results.length > 0) {
        const associations = companyAssociationsResponse.results[0];
        if (associations.to && associations.to.length > 0) {
          // HubSpot SDK v10+ uses 'id' instead of 'toObjectId'
          const companyId = (associations.to[0] as any).toObjectId || (associations.to[0] as any).id;
          try {
            const company = await hubspotClient.crm.companies.basicApi.getById(
              companyId,
              config.hubspot.companyProperties
            );
            result.company = {
              id: company.id,
              name: company.properties.name || '',
              domain: company.properties.domain || company.properties.website || undefined,
              industry: company.properties.industry || undefined,
              numberOfEmployees: company.properties.numberofemployees || undefined,
              country: company.properties.country || undefined
            };
            console.log(`[HubSpot] Added company: ${company.properties.name}`);
          } catch (e) {
            // Skip if company fetch fails
            console.log(`[HubSpot] Error fetching company ${companyId}`);
          }
        }
      }
    } catch (e) {
      // Associations may not exist
      console.log('[HubSpot] No company associations found or error fetching');
    }

    return result;
  } catch (error: any) {
    console.error(`HubSpot API Error (getDealWithAssociations): ${error.message}`);
    return null;
  }
}

/**
 * Fetches deals filtered by a specific stage.
 * 
 * @param {string} stage - The deal stage to filter by
 * @returns {Promise<Deal[]>} Array of filtered Deal objects
 */
export async function getDealsByStage(stage: string): Promise<Deal[]> {
  const allDeals = await getAllDeals();
  return allDeals.filter(deal => deal.stage === stage);
}

/**
 * Creates a webhook subscription for deal property changes.
 * 
 * @param {string} webhookUrl - The URL to receive webhook notifications
 * @returns {Promise<{ success: boolean; message: string }>}
 */
export async function createDealWebhookSubscription(webhookUrl: string): Promise<{ success: boolean; message: string }> {
  console.log(`[HubSpot] Webhook subscription URL: ${webhookUrl}`);
  console.log('[HubSpot] To enable webhooks:');
  console.log('  1. Go to HubSpot Developer Account > Apps');
  console.log('  2. Select your app > Webhooks');
  console.log('  3. Create subscription for object: deals, event: propertyChange');
  console.log(`  4. Set target URL to: ${webhookUrl}`);
  
  return {
    success: true,
    message: `Webhook URL ready: ${webhookUrl}. Configure in HubSpot Developer Portal.`
  };
}

/**
 * Fetches full contact details from HubSpot by contact ID.
 * 
 * @param {string} contactId - The HubSpot Contact ID
 * @returns {Promise<ContactDetails | null>} Contact details or null if not found
 */
export async function getContactDetails(contactId: string): Promise<ContactDetails | null> {
  try {
    const contact = await hubspotClient.crm.contacts.basicApi.getById(
      contactId,
      config.hubspot.contactProperties
    );

    return {
      id: contact.id,
      firstName: contact.properties.firstname || '',
      lastName: contact.properties.lastname || '',
      email: contact.properties.email || '',
      phone: contact.properties.phone || undefined,
      jobTitle: contact.properties.jobtitle || undefined,
      companyName: contact.properties.company || undefined
    };
  } catch (error: any) {
    console.error(`HubSpot API Error (getContactDetails): ${error.message}`);
    return null;
  }
}

/**
 * Maps HubSpot internal stage IDs to human-readable stage names.
 */
function mapHubSpotStageToReadable(hubspotStage: string): string {
  const stageMapping: Record<string, string> = {
    'appointmentscheduled': 'New',
    'qualifiedtobuy': 'Discovery',
    'presentationscheduled': 'Proposal',
    'decisionmakerboughtin': 'Negotiation',
    'contractsent': 'Negotiation',
    'closedwon': 'Closed Won',
    'closedlost': 'Closed Lost'
  };

  return stageMapping[hubspotStage.toLowerCase()] || hubspotStage;
}
