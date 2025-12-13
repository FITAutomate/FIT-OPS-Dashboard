/**
 * Airtable Service Module
 * 
 * Encapsulates all Airtable API interactions for the CRM.
 * Handles fetching, creating, and updating company and project records.
 */

import Airtable from 'airtable';
import { config } from './config';

/**
 * Interface representing a standardized Company record.
 */
export interface Company {
  id: string;
  name: string;
  website: string;
  industry: string;
  companySize: string;
  country: string;
  status: string;
  notes: string;
  logo?: string;
}

/**
 * Interface representing a Project record in Airtable.
 */
export interface Project {
  id: string;
  name: string;
  hubspotDealId: string;
  budget: number;
  status: string;
  startDate: string;
  description: string;
  companyId?: string;
}

/**
 * Interface for creating/updating a project
 */
export interface ProjectInput {
  name: string;
  hubspotDealId: string;
  budget?: number;
  status?: string;
  startDate?: string;
  description?: string;
  companyId?: string;
  clientId?: string; // Linked record to Clients table
}

/**
 * Interface representing a Client record in Airtable (Contacts table).
 */
export interface Client {
  id: string;
  hubspotContactId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  companyName?: string;
}

/**
 * Interface for creating/updating a client
 */
export interface ClientInput {
  hubspotContactId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  companyName?: string;
}

/**
 * Initialize Airtable client with API key from config
 */
const base = new Airtable({ apiKey: config.airtable.apiKey }).base(config.airtable.baseId);

// ============================================
// COMPANY OPERATIONS
// ============================================

/**
 * Fetches all company records from the Airtable 'Companies' table.
 * 
 * @returns {Promise<Company[]>} Array of standardized Company objects
 * @throws {Error} If Airtable API request fails
 */
export async function getAllClients(): Promise<Company[]> {
  try {
    const records = await base(config.airtable.tables.companies)
      .select({
        view: 'Grid view',
        maxRecords: 100
      })
      .all();

    return records.map(record => ({
      id: record.id,
      name: (record.get('Company Name') as string) || '',
      website: (record.get('Website') as string) || '',
      industry: (record.get('Industry') as string) || '',
      companySize: (record.get('Company Size') as string) || '',
      country: (record.get('Country / Region') as string) || '',
      status: (record.get('Status') as string) || 'Prospect',
      notes: (record.get('Notes') as string) || '',
      logo: record.get('Logo') 
        ? (record.get('Logo') as any[])[0]?.url 
        : `https://ui-avatars.com/api/?name=${encodeURIComponent((record.get('Company Name') as string) || 'Company')}&background=007CE8&color=fff`
    }));
  } catch (error: any) {
    console.error('Airtable API Error:', error.message);
    throw new Error(`Failed to fetch clients from Airtable: ${error.message}`);
  }
}

/**
 * Fetches a single company record by ID.
 * 
 * @param {string} id - The Airtable record ID
 * @returns {Promise<Company | null>} The company object or null if not found
 */
export async function getClientById(id: string): Promise<Company | null> {
  try {
    const record = await base(config.airtable.tables.companies).find(id);
    
    return {
      id: record.id,
      name: (record.get('Company Name') as string) || '',
      website: (record.get('Website') as string) || '',
      industry: (record.get('Industry') as string) || '',
      companySize: (record.get('Company Size') as string) || '',
      country: (record.get('Country / Region') as string) || '',
      status: (record.get('Status') as string) || 'Prospect',
      notes: (record.get('Notes') as string) || '',
      logo: record.get('Logo') 
        ? (record.get('Logo') as any[])[0]?.url 
        : `https://ui-avatars.com/api/?name=${encodeURIComponent((record.get('Company Name') as string) || 'Company')}&background=007CE8&color=fff`
    };
  } catch (error: any) {
    console.error(`Airtable API Error (getClientById): ${error.message}`);
    return null;
  }
}

// ============================================
// PROJECT OPERATIONS (UPSERT SUPPORT)
// ============================================

/**
 * Finds a project record by its associated HubSpot Deal ID.
 * 
 * This is the key lookup function for UPSERT operations:
 * - If found: Existing record should be updated
 * - If not found: New record should be created
 * 
 * @param {string} hubspotDealId - The HubSpot Deal ID to search for
 * @returns {Promise<Project | null>} The project if found, null otherwise
 */
export async function findProjectByHubSpotDealId(hubspotDealId: string): Promise<Project | null> {
  try {
    const records = await base(config.airtable.tables.projects)
      .select({
        filterByFormula: `{HubSpot Deal ID} = '${hubspotDealId}'`,
        maxRecords: 1
      })
      .firstPage();

    if (records.length === 0) {
      return null;
    }

    const record = records[0];
    return {
      id: record.id,
      name: (record.get('Project Name') as string) || '',
      hubspotDealId: (record.get('HubSpot Deal ID') as string) || '',
      budget: 0,
      status: (record.get('Status') as string) || 'Active',
      startDate: (record.get('Start Date') as string) || '',
      description: (record.get('Description') as string) || '',
      companyId: (record.get('Company') as string[])?.join(',') || undefined
    };
  } catch (error: any) {
    console.error(`Airtable API Error (findProjectByHubSpotDealId): ${error.message}`);
    return null;
  }
}

/**
 * Creates a new project record in Airtable.
 * 
 * Called when a HubSpot deal is "Closed Won" and no corresponding
 * project exists in Airtable (INSERT case).
 * 
 * @param {ProjectInput} project - The project data to create
 * @returns {Promise<Project>} The created project with its Airtable ID
 * @throws {Error} If creation fails
 */
export async function createProject(project: ProjectInput): Promise<Project> {
  try {
    const fields: Record<string, any> = {
      'Project Name': project.name,
      'HubSpot Deal ID': project.hubspotDealId
    };

    // Note: Budget not synced - Airtable has 'Budget Hours' which is different from deal amount
    if (project.status) {
      fields['Status'] = project.status;
    }
    if (project.startDate) {
      fields['Start Date'] = project.startDate;
    }
    if (project.description) {
      fields['Description'] = project.description;
    }
    // Link to company if provided
    if (project.companyId) {
      fields['Company'] = [project.companyId];
    }
    // Link to contact if provided (Airtable field is 'Contacts')
    if (project.clientId) {
      fields['Contacts'] = [project.clientId];
    }

    const record = await base(config.airtable.tables.projects).create(fields);

    console.log(`[Airtable] Created project: ${project.name} (HubSpot ID: ${project.hubspotDealId})`);

    return {
      id: record.id,
      name: project.name,
      hubspotDealId: project.hubspotDealId,
      budget: project.budget || 0,
      status: project.status || 'Active',
      startDate: project.startDate || '',
      description: project.description || '',
      companyId: project.companyId
    };
  } catch (error: any) {
    console.error(`Airtable API Error (createProject): ${error.message}`);
    throw new Error(`Failed to create project in Airtable: ${error.message}`);
  }
}

/**
 * Updates an existing project record in Airtable.
 * 
 * Only updates fields that are marked as "syncable" in the config.
 * This prevents overwriting read-only or manually-edited fields.
 * 
 * @param {string} recordId - The Airtable record ID to update
 * @param {Partial<ProjectInput>} updates - The fields to update
 * @returns {Promise<Project>} The updated project
 * @throws {Error} If update fails
 */
export async function updateProject(recordId: string, updates: Partial<ProjectInput>): Promise<Project> {
  try {
    const fields: Record<string, any> = {};

    // Map input fields to Airtable field names
    // Only include syncable fields from config
    const syncableFields = config.fieldMapping.syncableFields;
    const fieldMap = config.fieldMapping.dealToProject;

    if (updates.name && syncableFields.includes('dealname')) {
      fields['Project Name'] = updates.name;
    }
    // Note: Budget not synced - Airtable has 'Budget Hours' which is different from deal amount
    if (updates.startDate && syncableFields.includes('closedate')) {
      fields['Start Date'] = updates.startDate;
    }
    if (updates.description && syncableFields.includes('description')) {
      fields['Description'] = updates.description;
    }
    if (updates.status) {
      fields['Status'] = updates.status;
    }

    const record = await base(config.airtable.tables.projects).update(recordId, fields);

    console.log(`[Airtable] Updated project: ${recordId}`);

    return {
      id: record.id,
      name: (record.get('Project Name') as string) || '',
      hubspotDealId: (record.get('HubSpot Deal ID') as string) || '',
      budget: 0,
      status: (record.get('Status') as string) || 'Active',
      startDate: (record.get('Start Date') as string) || '',
      description: (record.get('Description') as string) || '',
      companyId: (record.get('Company') as string[])?.join(',') || undefined
    };
  } catch (error: any) {
    console.error(`Airtable API Error (updateProject): ${error.message}`);
    throw new Error(`Failed to update project in Airtable: ${error.message}`);
  }
}

/**
 * Updates an existing project with a client link.
 * 
 * @param {string} projectId - The Airtable project record ID
 * @param {string} clientId - The Airtable client record ID to link
 * @returns {Promise<Project>} The updated project
 */
export async function linkProjectToClient(projectId: string, clientId: string): Promise<Project> {
  try {
    const record = await base(config.airtable.tables.projects).update(projectId, {
      'Contacts': [clientId]
    });

    console.log(`[Airtable] Linked project ${projectId} to contact ${clientId}`);

    return {
      id: record.id,
      name: (record.get('Project Name') as string) || '',
      hubspotDealId: (record.get('HubSpot Deal ID') as string) || '',
      budget: 0,
      status: (record.get('Status') as string) || 'Active',
      startDate: (record.get('Start Date') as string) || '',
      description: (record.get('Description') as string) || '',
      companyId: (record.get('Company') as string[])?.join(',') || undefined
    };
  } catch (error: any) {
    console.error(`Airtable API Error (linkProjectToClient): ${error.message}`);
    throw new Error(`Failed to link project to client: ${error.message}`);
  }
}

// ============================================
// CLIENT/CONTACT OPERATIONS (UPSERT SUPPORT)
// ============================================

/**
 * Finds a client record by its associated HubSpot Contact ID.
 * 
 * @param {string} hubspotContactId - The HubSpot Contact ID to search for
 * @returns {Promise<Client | null>} The client if found, null otherwise
 */
export async function findClientByHubSpotContactId(hubspotContactId: string): Promise<Client | null> {
  try {
    const records = await base(config.airtable.tables.contacts)
      .select({
        filterByFormula: `{HubSpot Contact ID} = '${hubspotContactId}'`,
        maxRecords: 1
      })
      .firstPage();

    if (records.length === 0) {
      return null;
    }

    const record = records[0];
    return {
      id: record.id,
      hubspotContactId: (record.get('HubSpot Contact ID') as string) || '',
      firstName: (record.get('First Name') as string) || '',
      lastName: (record.get('Last Name') as string) || '',
      email: (record.get('Email') as string) || '',
      phone: (record.get('Phone') as string) || undefined,
      jobTitle: (record.get('Role / Title') as string) || undefined,
      companyName: undefined // Company is a linked record, not synced directly
    };
  } catch (error: any) {
    console.error(`Airtable API Error (findClientByHubSpotContactId): ${error.message}`);
    return null;
  }
}

/**
 * Creates a new client record in Airtable's Contacts table.
 * 
 * @param {ClientInput} client - The client data to create
 * @returns {Promise<Client>} The created client with its Airtable ID
 * @throws {Error} If creation fails
 */
export async function createClient(client: ClientInput): Promise<Client> {
  try {
    const fields: Record<string, any> = {
      'HubSpot Contact ID': client.hubspotContactId,
      'First Name': client.firstName,
      'Last Name': client.lastName,
      'Email': client.email
    };

    // Add optional fields if provided
    if (client.phone) {
      fields['Phone'] = client.phone;
    }
    if (client.jobTitle) {
      fields['Role / Title'] = client.jobTitle;
    }
    // Note: Company is a linked record field in Airtable, not synced directly

    const record = await base(config.airtable.tables.contacts).create(fields);

    console.log(`[Airtable] Created client: ${client.firstName} ${client.lastName} (HubSpot ID: ${client.hubspotContactId})`);

    return {
      id: record.id,
      hubspotContactId: client.hubspotContactId,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      jobTitle: client.jobTitle,
      companyName: client.companyName
    };
  } catch (error: any) {
    console.error(`Airtable API Error (createClient): ${error.message}`);
    throw new Error(`Failed to create client in Airtable: ${error.message}`);
  }
}

/**
 * Updates an existing client record in Airtable.
 * 
 * @param {string} recordId - The Airtable record ID to update
 * @param {Partial<ClientInput>} updates - The fields to update
 * @returns {Promise<Client>} The updated client
 * @throws {Error} If update fails
 */
export async function updateClient(recordId: string, updates: Partial<ClientInput>): Promise<Client> {
  try {
    const fields: Record<string, any> = {};
    const syncableFields = config.fieldMapping.syncableContactFields;

    // Map input fields to Airtable field names (only syncable fields)
    if (updates.firstName && syncableFields.includes('firstname')) {
      fields['First Name'] = updates.firstName;
    }
    if (updates.lastName && syncableFields.includes('lastname')) {
      fields['Last Name'] = updates.lastName;
    }
    if (updates.email && syncableFields.includes('email')) {
      fields['Email'] = updates.email;
    }
    if (updates.phone && syncableFields.includes('phone')) {
      fields['Phone'] = updates.phone;
    }
    if (updates.jobTitle && syncableFields.includes('jobtitle')) {
      fields['Role / Title'] = updates.jobTitle;
    }
    // Note: Company is a linked record field, not synced directly

    const record = await base(config.airtable.tables.contacts).update(recordId, fields);

    console.log(`[Airtable] Updated client: ${recordId}`);

    return {
      id: record.id,
      hubspotContactId: (record.get('HubSpot Contact ID') as string) || '',
      firstName: (record.get('First Name') as string) || '',
      lastName: (record.get('Last Name') as string) || '',
      email: (record.get('Email') as string) || '',
      phone: (record.get('Phone') as string) || undefined,
      jobTitle: (record.get('Role / Title') as string) || undefined,
      companyName: undefined // Company is a linked record, not synced directly
    };
  } catch (error: any) {
    console.error(`Airtable API Error (updateClient): ${error.message}`);
    throw new Error(`Failed to update client in Airtable: ${error.message}`);
  }
}

/**
 * Fetches all project records from Airtable.
 * 
 * @returns {Promise<Project[]>} Array of project objects
 */
export async function getAllProjects(): Promise<Project[]> {
  try {
    const records = await base(config.airtable.tables.projects)
      .select({
        view: 'Grid view',
        maxRecords: 100
      })
      .all();

    return records.map(record => ({
      id: record.id,
      name: (record.get('Project Name') as string) || '',
      hubspotDealId: (record.get('HubSpot Deal ID') as string) || '',
      budget: 0,
      status: (record.get('Status') as string) || 'Active',
      startDate: (record.get('Start Date') as string) || '',
      description: (record.get('Description') as string) || '',
      companyId: (record.get('Company') as string[])?.join(',') || undefined
    }));
  } catch (error: any) {
    console.error(`Airtable API Error (getAllProjects): ${error.message}`);
    throw new Error(`Failed to fetch projects from Airtable: ${error.message}`);
  }
}
