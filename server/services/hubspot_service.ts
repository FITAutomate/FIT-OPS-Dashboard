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
  closeDate: string;
  companyId?: string;
}

/**
 * Initialize HubSpot client with access token from config
 */
const hubspotClient = new Client({ accessToken: config.hubspot.accessToken });

/**
 * Fetches all deals from HubSpot CRM.
 * 
 * Retrieves key deal properties including name, amount, stage, and close date.
 * 
 * @returns {Promise<Deal[]>} Array of standardized Deal objects
 * @throws {Error} If HubSpot API request fails
 */
export async function getAllDeals(): Promise<Deal[]> {
  try {
    const response = await hubspotClient.crm.deals.basicApi.getPage(
      100, // limit
      undefined, // after (pagination cursor)
      [
        'dealname',
        'amount',
        'dealstage',
        'closedate',
        'pipeline',
        'hs_object_id'
      ],
      undefined,
      undefined,
      false // archived
    );

    // Transform HubSpot deals into standardized format
    return response.results.map(deal => ({
      id: deal.id,
      name: deal.properties.dealname || 'Untitled Deal',
      amount: parseFloat(deal.properties.amount || '0'),
      stage: mapHubSpotStageToReadable(deal.properties.dealstage || ''),
      closeDate: deal.properties.closedate || new Date().toISOString(),
      companyId: deal.properties.hs_object_id || undefined
    }));
  } catch (error: any) {
    console.error('HubSpot API Error:', error.message);
    throw new Error(`Failed to fetch deals from HubSpot: ${error.message}`);
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
 * Maps HubSpot internal stage IDs to human-readable stage names.
 * 
 * @param {string} hubspotStage - The HubSpot stage identifier
 * @returns {string} Readable stage name
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
