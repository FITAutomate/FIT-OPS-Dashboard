/**
 * Airtable Demo Data Seeding Service
 * 
 * Creates demo data for testing the CRM:
 * - 5 Demo Companies
 * - 15 Demo Contacts (linked to companies)
 * - 10 Demo Projects (linked to contacts)
 */

import Airtable from 'airtable';
import { config } from './config';

const base = new Airtable({ apiKey: config.airtable.apiKey }).base(config.airtable.baseId);

const DEMO_COMPANIES = [
  { name: 'Acme Corp', website: 'https://acme.example.com', industry: 'Technology', size: '51-200', country: 'US', status: 'Active Client' },
  { name: 'Globex Systems', website: 'https://globex.example.com', industry: 'Finance', size: '201-500', country: 'US', status: 'Active Client' },
  { name: 'Automate This', website: 'https://automatethis.example.com', industry: 'Software', size: '11-50', country: 'CA', status: 'Prospect' },
  { name: 'Initech Solutions', website: 'https://initech.example.com', industry: 'Consulting', size: '51-200', country: 'UK', status: 'Active Client' },
  { name: 'Umbrella Industries', website: 'https://umbrella.example.com', industry: 'Healthcare', size: '501-1000', country: 'US', status: 'Prospect' }
];

const DEMO_CONTACTS = [
  { firstName: 'Alice', lastName: 'Johnson', email: 'alice.johnson@acme.example.com', phone: '+1-555-0101', title: 'CEO', companyIndex: 0 },
  { firstName: 'Bob', lastName: 'Smith', email: 'bob.smith@acme.example.com', phone: '+1-555-0102', title: 'CTO', companyIndex: 0 },
  { firstName: 'Carol', lastName: 'Williams', email: 'carol.williams@acme.example.com', phone: '+1-555-0103', title: 'Project Manager', companyIndex: 0 },
  { firstName: 'David', lastName: 'Brown', email: 'david.brown@globex.example.com', phone: '+1-555-0201', title: 'CFO', companyIndex: 1 },
  { firstName: 'Emma', lastName: 'Davis', email: 'emma.davis@globex.example.com', phone: '+1-555-0202', title: 'VP Operations', companyIndex: 1 },
  { firstName: 'Frank', lastName: 'Miller', email: 'frank.miller@globex.example.com', phone: '+1-555-0203', title: 'Director', companyIndex: 1 },
  { firstName: 'Grace', lastName: 'Wilson', email: 'grace.wilson@automatethis.example.com', phone: '+1-555-0301', title: 'Founder', companyIndex: 2 },
  { firstName: 'Henry', lastName: 'Moore', email: 'henry.moore@automatethis.example.com', phone: '+1-555-0302', title: 'Lead Developer', companyIndex: 2 },
  { firstName: 'Ivy', lastName: 'Taylor', email: 'ivy.taylor@automatethis.example.com', phone: '+1-555-0303', title: 'Product Manager', companyIndex: 2 },
  { firstName: 'Jack', lastName: 'Anderson', email: 'jack.anderson@initech.example.com', phone: '+1-555-0401', title: 'Managing Partner', companyIndex: 3 },
  { firstName: 'Karen', lastName: 'Thomas', email: 'karen.thomas@initech.example.com', phone: '+1-555-0402', title: 'Senior Consultant', companyIndex: 3 },
  { firstName: 'Leo', lastName: 'Jackson', email: 'leo.jackson@initech.example.com', phone: '+1-555-0403', title: 'Analyst', companyIndex: 3 },
  { firstName: 'Mia', lastName: 'White', email: 'mia.white@umbrella.example.com', phone: '+1-555-0501', title: 'COO', companyIndex: 4 },
  { firstName: 'Nathan', lastName: 'Harris', email: 'nathan.harris@umbrella.example.com', phone: '+1-555-0502', title: 'VP Research', companyIndex: 4 },
  { firstName: 'Olivia', lastName: 'Martin', email: 'olivia.martin@umbrella.example.com', phone: '+1-555-0503', title: 'Program Director', companyIndex: 4 }
];

const DEMO_PROJECTS = [
  { name: 'Digital Transformation Initiative', status: 'Active', budget: 150000, startDate: '2025-01-15', contactIndex: 0 },
  { name: 'Cloud Migration Phase 1', status: 'Active', budget: 85000, startDate: '2025-02-01', contactIndex: 1 },
  { name: 'Financial Systems Upgrade', status: 'Planning', budget: 200000, startDate: '2025-03-01', contactIndex: 3 },
  { name: 'Process Automation Suite', status: 'Active', budget: 120000, startDate: '2025-01-20', contactIndex: 6 },
  { name: 'Data Analytics Platform', status: 'Completed', budget: 95000, startDate: '2024-10-01', contactIndex: 4 },
  { name: 'Customer Portal Development', status: 'Active', budget: 175000, startDate: '2025-02-15', contactIndex: 9 },
  { name: 'Security Compliance Audit', status: 'Planning', budget: 45000, startDate: '2025-04-01', contactIndex: 10 },
  { name: 'Mobile App Development', status: 'Active', budget: 130000, startDate: '2025-01-10', contactIndex: 7 },
  { name: 'Research Data Management', status: 'Planning', budget: 180000, startDate: '2025-05-01', contactIndex: 12 },
  { name: 'Integration Platform Build', status: 'Active', budget: 110000, startDate: '2025-02-20', contactIndex: 2 }
];

interface CreatedRecord {
  id: string;
  name: string;
}

interface SeedResult {
  companies: { created: number; skipped: number };
  contacts: { created: number; skipped: number };
  projects: { created: number; skipped: number };
  logs: string[];
}

interface SeedStats {
  records: CreatedRecord[];
  created: number;
  skipped: number;
}

async function seedCompanies(logs: string[]): Promise<SeedStats> {
  logs.push('Creating Companies...');
  const records: CreatedRecord[] = [];
  let created = 0;
  let skipped = 0;

  for (const company of DEMO_COMPANIES) {
    try {
      const existing = await base('Companies')
        .select({ filterByFormula: `{Company Name} = '${company.name}'`, maxRecords: 1 })
        .firstPage();

      if (existing.length > 0) {
        logs.push(`  Skipped: "${company.name}" already exists`);
        records.push({ id: existing[0].id, name: company.name });
        skipped++;
        continue;
      }

      const record = await base('Companies').create({
        'Company Name': company.name,
        'Website': company.website,
        'Industry': company.industry,
        'Company Size': company.size,
        'Country / Region': company.country,
        'Status': company.status
      });

      logs.push(`  Created: ${company.name}`);
      records.push({ id: record.id, name: company.name });
      created++;
    } catch (error: any) {
      const statusCode = error.statusCode || error.status || 'unknown';
      const errorType = error.error || error.type || 'unknown';
      logs.push(`  Error creating ${company.name}: [${statusCode}] ${error.message}`);
      if (error.data) {
        logs.push(`    Details: ${JSON.stringify(error.data)}`);
      }
    }
  }

  return { records, created, skipped };
}

async function seedContacts(companyIds: CreatedRecord[], logs: string[]): Promise<SeedStats> {
  logs.push('Creating Contacts...');
  const records: CreatedRecord[] = [];
  let created = 0;
  let skipped = 0;

  for (const contact of DEMO_CONTACTS) {
    try {
      const existing = await base('Contacts')
        .select({ filterByFormula: `{Email} = '${contact.email}'`, maxRecords: 1 })
        .firstPage();

      if (existing.length > 0) {
        logs.push(`  Skipped: "${contact.firstName} ${contact.lastName}" already exists`);
        records.push({ id: existing[0].id, name: `${contact.firstName} ${contact.lastName}` });
        skipped++;
        continue;
      }

      const companyId = companyIds[contact.companyIndex]?.id;
      const fields: Record<string, any> = {
        'First Name': contact.firstName,
        'Last Name': contact.lastName,
        'Email': contact.email,
        'Phone': contact.phone,
        'Role / Title': contact.title
      };

      if (companyId) {
        fields['Company'] = [companyId];
      }

      const record = await base('Contacts').create(fields);

      logs.push(`  Created: ${contact.firstName} ${contact.lastName}`);
      records.push({ id: record.id, name: `${contact.firstName} ${contact.lastName}` });
      created++;
    } catch (error: any) {
      const statusCode = error.statusCode || error.status || 'unknown';
      logs.push(`  Error creating ${contact.firstName} ${contact.lastName}: [${statusCode}] ${error.message}`);
      if (error.data) {
        logs.push(`    Details: ${JSON.stringify(error.data)}`);
      }
    }
  }

  return { records, created, skipped };
}

async function seedProjects(contactIds: CreatedRecord[], logs: string[]): Promise<{ created: number; skipped: number }> {
  logs.push('Creating Projects...');
  let created = 0;
  let skipped = 0;

  for (const project of DEMO_PROJECTS) {
    try {
      const existing = await base('Projects')
        .select({ filterByFormula: `{Project Name} = '${project.name}'`, maxRecords: 1 })
        .firstPage();

      if (existing.length > 0) {
        logs.push(`  Skipped: "${project.name}" already exists`);
        skipped++;
        continue;
      }

      const contactId = contactIds[project.contactIndex]?.id;
      const fields: Record<string, any> = {
        'Project Name': project.name,
        'Start Date': project.startDate,
        'Description': `Demo project: ${project.name}`
      };

      if (contactId) {
        fields['Contacts'] = [contactId];
      }

      await base('Projects').create(fields);

      logs.push(`  Created: ${project.name}`);
      created++;
    } catch (error: any) {
      const statusCode = error.statusCode || error.status || 'unknown';
      logs.push(`  Error creating ${project.name}: [${statusCode}] ${error.message}`);
      if (error.data) {
        logs.push(`    Details: ${JSON.stringify(error.data)}`);
      }
    }
  }

  return { created, skipped };
}

export async function seedDemoData(): Promise<SeedResult> {
  const logs: string[] = ['Starting Airtable Demo Data Seeding...'];

  const companyStats = await seedCompanies(logs);
  const contactStats = await seedContacts(companyStats.records, logs);
  const projectStats = await seedProjects(contactStats.records, logs);

  logs.push('Seeding complete!');

  return {
    companies: { created: companyStats.created, skipped: companyStats.skipped },
    contacts: { created: contactStats.created, skipped: contactStats.skipped },
    projects: projectStats,
    logs
  };
}
