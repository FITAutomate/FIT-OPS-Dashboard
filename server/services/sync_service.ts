/**
 * Sync Service Module
 * 
 * Orchestrates the UPSERT logic between HubSpot and Airtable.
 * Handles the business logic for creating and updating records based on webhook events.
 * 
 * Three-Part UPSERT Logic:
 * 1. Company UPSERT: Create/update the company record in Airtable first
 * 2. Contact UPSERT: Create/update the client record with link to company
 * 3. Project UPSERT: Create/update the project record with link to the client
 */

import { config } from './config';
import { 
  getDealWithAssociations, 
  getContactDetails,
  type DealWithAssociations,
  type ContactDetails,
  type CompanyDetails
} from './hubspot_service';
import { 
  findProjectByHubSpotDealId, 
  createProject, 
  updateProject,
  linkProjectToClient,
  linkProjectToCompany,
  findClientByHubSpotContactId,
  createClient,
  updateClient,
  findCompanyByHubSpotId,
  createCompany,
  updateCompany,
  linkContactToCompany,
  type Project,
  type ProjectInput,
  type Client,
  type ClientInput,
  type CompanyRecord,
  type CompanyInput
} from './airtable_service';

/**
 * Result of a sync operation
 */
export interface SyncResult {
  success: boolean;
  action: 'created' | 'updated' | 'skipped' | 'error';
  dealId: string;
  projectId?: string;
  clientId?: string;
  companyId?: string;
  message: string;
}

/**
 * Result of a contact sync operation
 */
export interface ContactSyncResult {
  success: boolean;
  action: 'created' | 'updated' | 'skipped' | 'error';
  contactId: string;
  clientId?: string;
  message: string;
}

/**
 * Result of a company sync operation
 */
export interface CompanySyncResult {
  success: boolean;
  action: 'created' | 'updated' | 'skipped' | 'error';
  hubspotCompanyId: string;
  airtableCompanyId?: string;
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
 * Syncs a HubSpot contact to an Airtable client record.
 * 
 * @param {string} hubspotContactId - The HubSpot Contact ID
 * @returns {Promise<ContactSyncResult>} The result of the contact sync
 */
export async function syncContactToClient(
  hubspotContactId: string
): Promise<ContactSyncResult> {
  try {
    console.log(`[Sync] Starting contact sync for HubSpot Contact ID: ${hubspotContactId}`);

    // Fetch full contact details from HubSpot
    const contact = await getContactDetails(hubspotContactId);
    
    if (!contact) {
      return {
        success: false,
        action: 'error',
        contactId: hubspotContactId,
        message: `Contact ${hubspotContactId} not found in HubSpot`
      };
    }

    console.log(`[Sync] Found contact: ${contact.firstName} ${contact.lastName}`);

    // Check if client already exists in Airtable
    const existingClient = await findClientByHubSpotContactId(hubspotContactId);

    if (existingClient) {
      // UPDATE existing client
      console.log(`[Sync] Existing client found: ${existingClient.id}`);
      
      const updates = buildClientUpdates(contact, existingClient);
      
      if (Object.keys(updates).length === 0) {
        return {
          success: true,
          action: 'skipped',
          contactId: hubspotContactId,
          clientId: existingClient.id,
          message: 'No contact fields changed'
        };
      }

      const updatedClient = await updateClient(existingClient.id, updates);
      
      return {
        success: true,
        action: 'updated',
        contactId: hubspotContactId,
        clientId: updatedClient.id,
        message: `Updated client with fields: ${Object.keys(updates).join(', ')}`
      };
    } else {
      // CREATE new client
      const clientInput = buildClientFromContact(contact);
      const newClient = await createClient(clientInput);

      return {
        success: true,
        action: 'created',
        contactId: hubspotContactId,
        clientId: newClient.id,
        message: `Created new client: ${newClient.firstName} ${newClient.lastName}`
      };
    }
  } catch (error: any) {
    console.error(`[Sync] Error syncing contact ${hubspotContactId}:`, error.message);
    return {
      success: false,
      action: 'error',
      contactId: hubspotContactId,
      message: error.message
    };
  }
}

/**
 * Builds a ClientInput object from HubSpot contact details.
 */
function buildClientFromContact(contact: ContactDetails): ClientInput {
  return {
    hubspotContactId: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    jobTitle: contact.jobTitle,
    companyName: contact.companyName
  };
}

/**
 * Builds client updates by comparing HubSpot contact with existing client.
 */
function buildClientUpdates(
  contact: ContactDetails,
  existingClient: Client
): Partial<ClientInput> {
  const updates: Partial<ClientInput> = {};
  const syncableFields = config.fieldMapping.syncableContactFields;

  if (syncableFields.includes('firstname') && contact.firstName !== existingClient.firstName) {
    updates.firstName = contact.firstName;
  }
  if (syncableFields.includes('lastname') && contact.lastName !== existingClient.lastName) {
    updates.lastName = contact.lastName;
  }
  if (syncableFields.includes('email') && contact.email !== existingClient.email) {
    updates.email = contact.email;
  }
  if (syncableFields.includes('phone') && contact.phone !== existingClient.phone) {
    updates.phone = contact.phone;
  }
  if (syncableFields.includes('jobtitle') && contact.jobTitle !== existingClient.jobTitle) {
    updates.jobTitle = contact.jobTitle;
  }
  if (syncableFields.includes('company') && contact.companyName !== existingClient.companyName) {
    updates.companyName = contact.companyName;
  }

  return updates;
}

/**
 * Syncs a HubSpot company to an Airtable company record.
 * 
 * @param {CompanyDetails} company - The HubSpot Company details
 * @returns {Promise<CompanySyncResult>} The result of the company sync
 */
export async function syncCompanyToAirtable(
  company: CompanyDetails
): Promise<CompanySyncResult> {
  try {
    console.log(`[Sync] Starting company sync for HubSpot Company ID: ${company.id}`);

    const existingCompany = await findCompanyByHubSpotId(company.id);

    if (existingCompany) {
      console.log(`[Sync] Existing company found: ${existingCompany.id}`);
      
      const updates = buildCompanyUpdates(company, existingCompany);
      
      if (Object.keys(updates).length === 0) {
        return {
          success: true,
          action: 'skipped',
          hubspotCompanyId: company.id,
          airtableCompanyId: existingCompany.id,
          message: 'No company fields changed'
        };
      }

      const updatedCompany = await updateCompany(existingCompany.id, updates);
      
      return {
        success: true,
        action: 'updated',
        hubspotCompanyId: company.id,
        airtableCompanyId: updatedCompany.id,
        message: `Updated company with fields: ${Object.keys(updates).join(', ')}`
      };
    } else {
      const companyInput = buildCompanyFromHubSpot(company);
      const newCompany = await createCompany(companyInput);

      return {
        success: true,
        action: 'created',
        hubspotCompanyId: company.id,
        airtableCompanyId: newCompany.id,
        message: `Created new company: ${newCompany.name}`
      };
    }
  } catch (error: any) {
    console.error(`[Sync] Error syncing company ${company.id}:`, error.message);
    return {
      success: false,
      action: 'error',
      hubspotCompanyId: company.id,
      message: error.message
    };
  }
}

/**
 * Builds a CompanyInput object from HubSpot company details.
 */
function buildCompanyFromHubSpot(company: CompanyDetails): CompanyInput {
  return {
    hubspotCompanyId: company.id,
    name: company.name,
    website: company.domain,
    industry: company.industry,
    companySize: company.numberOfEmployees,
    country: company.country
  };
}

/**
 * Builds company updates by comparing HubSpot company with existing Airtable record.
 */
function buildCompanyUpdates(
  company: CompanyDetails,
  existingCompany: CompanyRecord
): Partial<CompanyInput> {
  const updates: Partial<CompanyInput> = {};
  const syncableFields = config.fieldMapping.syncableCompanyFields;

  if (syncableFields.includes('name') && company.name !== existingCompany.name) {
    updates.name = company.name;
  }
  if (syncableFields.includes('domain') && company.domain !== existingCompany.website) {
    updates.website = company.domain;
  }
  if (syncableFields.includes('industry') && company.industry !== existingCompany.industry) {
    updates.industry = company.industry;
  }
  if (syncableFields.includes('numberofemployees') && company.numberOfEmployees !== existingCompany.companySize) {
    updates.companySize = company.numberOfEmployees;
  }
  if (syncableFields.includes('country') && company.country !== existingCompany.country) {
    updates.country = company.country;
  }

  return updates;
}

/**
 * Main UPSERT function for syncing HubSpot deals to Airtable projects.
 * 
 * THREE-PART LOGIC:
 * 1. COMPANY UPSERT (First): Process associated company, create/update in Airtable
 * 2. CONTACT UPSERT (Second): Process associated contacts, create/update and link to company
 * 3. PROJECT UPSERT (Third): Create/update project with link to the client
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
        companyId: undefined,
        message: `Deal ${hubspotDealId} not found in HubSpot`
      };
    }

    console.log(`[Sync] Found deal: ${deal.name} (Stage: ${deal.stageId})`);

    // ==========================================
    // PART A: COMPANY UPSERT (First)
    // ==========================================
    let linkedCompanyId: string | undefined;
    
    if (deal.company) {
      console.log(`[Sync] Processing company: ${deal.company.name}`);
      
      const companyResult = await syncCompanyToAirtable(deal.company);
      
      if (companyResult.success && companyResult.airtableCompanyId) {
        linkedCompanyId = companyResult.airtableCompanyId;
        console.log(`[Sync] Company synced successfully, companyId: ${linkedCompanyId}`);
      } else {
        console.log(`[Sync] Company sync ${companyResult.action}: ${companyResult.message}`);
      }
    }

    // ==========================================
    // PART B: CONTACT UPSERT (Second - Link to Company)
    // ==========================================
    let linkedClientId: string | undefined;
    
    if (deal.contacts && deal.contacts.length > 0) {
      const primaryContact = deal.contacts[0];
      console.log(`[Sync] Processing primary contact: ${primaryContact.firstName} ${primaryContact.lastName}`);
      
      const contactResult = await syncContactToClient(primaryContact.id);
      
      if (contactResult.success && contactResult.clientId) {
        linkedClientId = contactResult.clientId;
        console.log(`[Sync] Contact synced successfully, clientId: ${linkedClientId}`);
        
        // Link contact to company if both exist
        if (linkedCompanyId) {
          try {
            await linkContactToCompany(linkedClientId, linkedCompanyId);
            console.log(`[Sync] Linked contact ${linkedClientId} to company ${linkedCompanyId}`);
          } catch (e: any) {
            console.log(`[Sync] Contact-Company link may already exist or failed: ${e.message}`);
          }
        }
      } else {
        console.log(`[Sync] Contact sync ${contactResult.action}: ${contactResult.message}`);
      }
    }

    // ==========================================
    // PART C: PROJECT UPSERT (Third - Link to Client)
    // ==========================================
    
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
          clientId: linkedClientId,
          companyId: linkedCompanyId,
          message: 'Updates disabled in config'
        };
      }

      // Build update payload with only syncable fields
      const updates = buildProjectUpdates(deal, existingProject);
      
      // Link client to project if not already linked
      if (linkedClientId) {
        try {
          await linkProjectToClient(existingProject.id, linkedClientId);
        } catch (e) {
          console.log(`[Sync] Client link may already exist or failed`);
        }
      }
      
      // Link company to project if not already linked
      if (linkedCompanyId) {
        try {
          await linkProjectToCompany(existingProject.id, linkedCompanyId);
        } catch (e) {
          console.log(`[Sync] Company link may already exist or failed`);
        }
      }
      
      if (Object.keys(updates).length === 0) {
        return {
          success: true,
          action: 'skipped',
          dealId: hubspotDealId,
          projectId: existingProject.id,
          clientId: linkedClientId,
          companyId: linkedCompanyId,
          message: 'No syncable fields changed'
        };
      }

      const updatedProject = await updateProject(existingProject.id, updates);
      
      return {
        success: true,
        action: 'updated',
        dealId: hubspotDealId,
        projectId: updatedProject.id,
        clientId: linkedClientId,
        companyId: linkedCompanyId,
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
          clientId: linkedClientId,
          companyId: linkedCompanyId,
          message: `Deal stage '${deal.stage}' does not trigger project creation`
        };
      }

      // Build project from deal data WITH client and company links
      const projectInput = buildProjectFromDeal(deal, linkedClientId, linkedCompanyId);
      const newProject = await createProject(projectInput);

      return {
        success: true,
        action: 'created',
        dealId: hubspotDealId,
        projectId: newProject.id,
        clientId: linkedClientId,
        companyId: linkedCompanyId,
        message: `Created new project: ${newProject.name}` + (linkedClientId ? ` (linked to client ${linkedClientId})` : '') + (linkedCompanyId ? ` (company ${linkedCompanyId})` : '')
      };
    }
  } catch (error: any) {
    console.error(`[Sync] Error syncing deal ${hubspotDealId}:`, error.message);
    return {
      success: false,
      action: 'error',
      dealId: hubspotDealId,
      companyId: undefined,
      message: error.message
    };
  }
}

/**
 * Builds a ProjectInput object from a HubSpot deal for creation.
 * Uses the field mapping from config to translate properties.
 * 
 * @param {DealWithAssociations} deal - The HubSpot deal with associations
 * @param {string} clientId - Optional Airtable client ID to link
 * @param {string} companyId - Optional Airtable company ID to link
 * @returns {ProjectInput} The project input ready for Airtable creation
 */
function buildProjectFromDeal(deal: DealWithAssociations, clientId?: string, companyId?: string): ProjectInput {
  const stageId = deal.stageId.toLowerCase();
  const status = config.projectStatusMapping[stageId] || 'Active';

  return {
    name: deal.name.trim(),
    hubspotDealId: deal.id,
    budget: deal.amount || 0,
    status: status,
    startDate: deal.closeDate ? deal.closeDate.split('T')[0] : undefined,
    description: deal.description || buildProjectDescription(deal),
    clientId: clientId,
    companyId: companyId
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
