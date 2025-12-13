/**
 * Sync Service Module
 * 
 * Orchestrates the UPSERT logic between HubSpot and Airtable.
 * Handles the business logic for creating and updating records based on webhook events.
 */

import { config } from './config';
import { getDealWithAssociations, type DealWithAssociations } from './hubspot_service';
import { 
  findProjectByHubSpotDealId, 
  createProject, 
  updateProject,
  type Project,
  type ProjectInput 
} from './airtable_service';

/**
 * Result of a sync operation
 */
export interface SyncResult {
  success: boolean;
  action: 'created' | 'updated' | 'skipped' | 'error';
  dealId: string;
  projectId?: string;
  message: string;
}

/**
 * HubSpot webhook payload structure
 */
export interface HubSpotWebhookPayload {
  objectId: number;
  propertyName?: string;
  propertyValue?: string;
  changeSource?: string;
  eventId: number;
  subscriptionId: number;
  portalId: number;
  appId: number;
  occurredAt: number;
  subscriptionType: string;
  attemptNumber: number;
  objectTypeId?: string;
}

/**
 * Main UPSERT function for syncing HubSpot deals to Airtable projects.
 * 
 * Logic:
 * - CASE A (Insert): Deal is "Closed Won" and no Airtable record exists -> Create new project
 * - CASE B (Update): Airtable record exists -> Update with syncable fields only
 * 
 * @param {string} hubspotDealId - The HubSpot Deal ID from the webhook
 * @param {string} propertyChanged - The property that triggered the webhook (optional)
 * @returns {Promise<SyncResult>} The result of the sync operation
 */
export async function syncDealToProject(
  hubspotDealId: string,
  propertyChanged?: string
): Promise<SyncResult> {
  try {
    console.log(`[Sync] Starting sync for HubSpot Deal ID: ${hubspotDealId}`);

    // Step 1: Fetch the deal with all its associations from HubSpot
    const deal = await getDealWithAssociations(hubspotDealId);
    
    if (!deal) {
      return {
        success: false,
        action: 'error',
        dealId: hubspotDealId,
        message: `Deal ${hubspotDealId} not found in HubSpot`
      };
    }

    console.log(`[Sync] Found deal: ${deal.name} (Stage: ${deal.stageId})`);

    // Step 2: Check if project already exists in Airtable
    const existingProject = await findProjectByHubSpotDealId(hubspotDealId);

    if (existingProject) {
      // CASE B: Record exists - perform UPDATE
      console.log(`[Sync] Existing project found: ${existingProject.id}`);
      
      if (!config.webhooks.enableUpdates) {
        return {
          success: true,
          action: 'skipped',
          dealId: hubspotDealId,
          projectId: existingProject.id,
          message: 'Updates disabled in config'
        };
      }

      // Build update payload with only syncable fields
      const updates = buildProjectUpdates(deal, existingProject);
      
      if (Object.keys(updates).length === 0) {
        return {
          success: true,
          action: 'skipped',
          dealId: hubspotDealId,
          projectId: existingProject.id,
          message: 'No syncable fields changed'
        };
      }

      const updatedProject = await updateProject(existingProject.id, updates);
      
      return {
        success: true,
        action: 'updated',
        dealId: hubspotDealId,
        projectId: updatedProject.id,
        message: `Updated project with fields: ${Object.keys(updates).join(', ')}`
      };

    } else {
      // CASE A: No record exists - check if we should CREATE
      const stageId = deal.stageId.toLowerCase();
      const shouldCreate = config.webhooks.projectCreationStages.includes(stageId);

      if (!shouldCreate) {
        return {
          success: true,
          action: 'skipped',
          dealId: hubspotDealId,
          message: `Deal stage '${deal.stage}' does not trigger project creation`
        };
      }

      // Build project from deal data
      const projectInput = buildProjectFromDeal(deal);
      const newProject = await createProject(projectInput);

      return {
        success: true,
        action: 'created',
        dealId: hubspotDealId,
        projectId: newProject.id,
        message: `Created new project: ${newProject.name}`
      };
    }
  } catch (error: any) {
    console.error(`[Sync] Error syncing deal ${hubspotDealId}:`, error.message);
    return {
      success: false,
      action: 'error',
      dealId: hubspotDealId,
      message: error.message
    };
  }
}

/**
 * Builds a ProjectInput object from a HubSpot deal for creation.
 * Uses the field mapping from config to translate properties.
 * 
 * @param {DealWithAssociations} deal - The HubSpot deal with associations
 * @returns {ProjectInput} The project input ready for Airtable creation
 */
function buildProjectFromDeal(deal: DealWithAssociations): ProjectInput {
  const stageId = deal.stageId.toLowerCase();
  const status = config.projectStatusMapping[stageId] || 'Active';

  return {
    name: deal.name.trim(),
    hubspotDealId: deal.id,
    budget: deal.amount || 0,
    status: status,
    startDate: deal.closeDate ? deal.closeDate.split('T')[0] : undefined,
    description: deal.description || buildProjectDescription(deal)
  };
}

/**
 * Builds a description for the project from deal associations.
 * 
 * @param {DealWithAssociations} deal - The deal with associations
 * @returns {string} A formatted description
 */
function buildProjectDescription(deal: DealWithAssociations): string {
  const parts: string[] = [];
  
  if (deal.company) {
    parts.push(`Company: ${deal.company.name}`);
  }
  
  if (deal.contacts && deal.contacts.length > 0) {
    const primaryContact = deal.contacts[0];
    parts.push(`Primary Contact: ${primaryContact.firstName} ${primaryContact.lastName} (${primaryContact.email})`);
  }
  
  parts.push(`Synced from HubSpot on ${new Date().toISOString().split('T')[0]}`);
  
  return parts.join('\n');
}

/**
 * Builds a partial update object for an existing project.
 * Only includes fields that are syncable and have actually changed.
 * 
 * @param {DealWithAssociations} deal - The HubSpot deal
 * @param {Project} existingProject - The existing Airtable project
 * @returns {Partial<ProjectInput>} Fields to update
 */
function buildProjectUpdates(
  deal: DealWithAssociations, 
  existingProject: Project
): Partial<ProjectInput> {
  const updates: Partial<ProjectInput> = {};
  const syncableFields = config.fieldMapping.syncableFields;

  // Check each syncable field for changes
  if (syncableFields.includes('dealname')) {
    const newName = deal.name.trim();
    if (newName !== existingProject.name) {
      updates.name = newName;
    }
  }

  if (syncableFields.includes('amount')) {
    if (deal.amount !== existingProject.budget) {
      updates.budget = deal.amount;
    }
  }

  if (syncableFields.includes('closedate') && deal.closeDate) {
    const newStartDate = deal.closeDate.split('T')[0];
    if (newStartDate !== existingProject.startDate) {
      updates.startDate = newStartDate;
    }
  }

  if (syncableFields.includes('description') && deal.description) {
    if (deal.description !== existingProject.description) {
      updates.description = deal.description;
    }
  }

  // Always update status based on stage
  const stageId = deal.stageId.toLowerCase();
  const newStatus = config.projectStatusMapping[stageId];
  if (newStatus && newStatus !== existingProject.status) {
    updates.status = newStatus;
  }

  return updates;
}

/**
 * Processes a batch of webhook payloads.
 * HubSpot may send multiple events in a single request.
 * 
 * @param {HubSpotWebhookPayload[]} payloads - Array of webhook events
 * @returns {Promise<SyncResult[]>} Results for each processed event
 */
export async function processBatchWebhook(
  payloads: HubSpotWebhookPayload[]
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  
  // Deduplicate by objectId to avoid processing the same deal multiple times
  const uniqueDeals = new Map<number, HubSpotWebhookPayload>();
  for (const payload of payloads) {
    uniqueDeals.set(payload.objectId, payload);
  }

  console.log(`[Sync] Processing ${uniqueDeals.size} unique deals from ${payloads.length} webhook events`);

  for (const [objectId, payload] of uniqueDeals) {
    const result = await syncDealToProject(
      String(objectId),
      payload.propertyName
    );
    results.push(result);
  }

  return results;
}
