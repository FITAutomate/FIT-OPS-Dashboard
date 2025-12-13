/**
 * Airtable Service Module
 * 
 * Encapsulates all Airtable API interactions for the CRM.
 * Handles fetching and transforming company/client records.
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
 * Initialize Airtable client with API key from config
 */
const base = new Airtable({ apiKey: config.airtable.apiKey }).base(config.airtable.baseId);

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
        view: 'Grid view', // Default view
        maxRecords: 100
      })
      .all();

    // Transform Airtable records into standardized format
    return records.map(record => ({
      id: record.id,
      name: (record.get('Company Name') as string) || '',
      website: (record.get('Website') as string) || '',
      industry: (record.get('Industry') as string) || '',
      companySize: (record.get('Company Size') as string) || '',
      country: (record.get('Country / Region') as string) || '',
      status: (record.get('Status') as string) || 'Prospect',
      notes: (record.get('Notes') as string) || '',
      // Extract logo URL from attachments array if exists
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
