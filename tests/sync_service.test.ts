/**
 * Sync Service Unit Tests
 * 
 * Tests the UPSERT logic for syncing HubSpot deals to Airtable projects.
 * 
 * Test Cases:
 * A: Successful INSERT - "Closed Won" webhook creates new project
 * B: Duplicate Prevention - Same webhook twice only creates one project
 * C: Selective UPDATE - Existing project gets updated, not recreated
 * D: Contact Creation & Linking - Contact is created and linked to project
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncDealToProject, processBatchWebhook, syncContactToClient } from '../server/services/sync_service';
import type { DealWithAssociations, ContactDetails } from '../server/services/hubspot_service';
import type { Project, Client } from '../server/services/airtable_service';

// Mock the airtable_service module
vi.mock('../server/services/airtable_service', () => ({
  findProjectByHubSpotDealId: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  linkProjectToClient: vi.fn(),
  findClientByHubSpotContactId: vi.fn(),
  createClient: vi.fn(),
  updateClient: vi.fn()
}));

// Mock the hubspot_service module
vi.mock('../server/services/hubspot_service', () => ({
  getDealWithAssociations: vi.fn(),
  getContactDetails: vi.fn()
}));

// Mock the config module
vi.mock('../server/services/config', () => ({
  config: {
    webhooks: {
      projectCreationStages: ['closedwon'],
      enableUpdates: true
    },
    fieldMapping: {
      dealToProject: {
        dealname: 'Project Name',
        amount: 'Budget',
        closedate: 'Start Date',
        description: 'Description'
      },
      contactToClient: {
        firstname: 'First Name',
        lastname: 'Last Name',
        email: 'Email',
        phone: 'Phone',
        jobtitle: 'Job Title'
      },
      syncableFields: ['dealname', 'amount', 'closedate', 'description'],
      syncableContactFields: ['firstname', 'lastname', 'email', 'phone', 'jobtitle']
    },
    projectStatusMapping: {
      closedwon: 'Active',
      contractsent: 'Pending Approval'
    }
  }
}));

// Import mocked functions after mocking
import { 
  findProjectByHubSpotDealId, 
  createProject, 
  updateProject,
  linkProjectToClient,
  findClientByHubSpotContactId,
  createClient,
  updateClient
} from '../server/services/airtable_service';
import { getDealWithAssociations, getContactDetails } from '../server/services/hubspot_service';

// Cast to mocked types for type safety
const mockFindProjectByHubSpotDealId = findProjectByHubSpotDealId as ReturnType<typeof vi.fn>;
const mockCreateProject = createProject as ReturnType<typeof vi.fn>;
const mockUpdateProject = updateProject as ReturnType<typeof vi.fn>;
const mockLinkProjectToClient = linkProjectToClient as ReturnType<typeof vi.fn>;
const mockFindClientByHubSpotContactId = findClientByHubSpotContactId as ReturnType<typeof vi.fn>;
const mockCreateClient = createClient as ReturnType<typeof vi.fn>;
const mockUpdateClient = updateClient as ReturnType<typeof vi.fn>;
const mockGetDealWithAssociations = getDealWithAssociations as ReturnType<typeof vi.fn>;
const mockGetContactDetails = getContactDetails as ReturnType<typeof vi.fn>;

// Test fixtures
const mockContact: ContactDetails = {
  id: 'c1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+1-555-0123',
  jobTitle: 'CEO',
  companyName: 'Acme Corp'
};

const mockDeal: DealWithAssociations = {
  id: '12345',
  name: 'Test Deal - Enterprise License',
  amount: 50000,
  stage: 'Closed Won',
  stageId: 'closedwon',
  closeDate: '2024-12-15T00:00:00.000Z',
  description: 'Annual enterprise license deal',
  contacts: [mockContact],
  company: { id: 'comp1', name: 'Acme Corp' }
};

const mockExistingProject: Project = {
  id: 'rec123ABC',
  name: 'Test Deal - Enterprise License',
  hubspotDealId: '12345',
  budget: 50000,
  status: 'Active',
  startDate: '2024-12-15',
  description: 'Annual enterprise license deal'
};

const mockExistingClient: Client = {
  id: 'recCLIENT123',
  hubspotContactId: 'c1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+1-555-0123',
  jobTitle: 'CEO'
};

describe('Sync Service - UPSERT Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no existing client
    mockFindClientByHubSpotContactId.mockResolvedValue(null);
    mockGetContactDetails.mockResolvedValue(mockContact);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Test Case A: Successful INSERT', () => {
    it('should create a new project when deal is Closed Won and no existing record exists', async () => {
      // Arrange
      mockGetDealWithAssociations.mockResolvedValue(mockDeal);
      mockFindProjectByHubSpotDealId.mockResolvedValue(null);
      mockCreateClient.mockResolvedValue({ ...mockExistingClient, id: 'recNEWCLIENT' });
      mockCreateProject.mockResolvedValue({
        id: 'recNEW123',
        name: mockDeal.name,
        hubspotDealId: mockDeal.id,
        budget: mockDeal.amount,
        status: 'Active',
        startDate: '2024-12-15',
        description: mockDeal.description
      });

      // Act
      const result = await syncDealToProject('12345');

      // Assert
      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
      expect(result.dealId).toBe('12345');
      expect(result.projectId).toBe('recNEW123');
      expect(mockCreateProject).toHaveBeenCalledTimes(1);
      expect(mockUpdateProject).not.toHaveBeenCalled();
    });

    it('should skip creation when deal stage is not in projectCreationStages', async () => {
      const nonClosedDeal = { ...mockDeal, stageId: 'qualifiedtobuy', stage: 'Discovery' };
      mockGetDealWithAssociations.mockResolvedValue(nonClosedDeal);
      mockFindProjectByHubSpotDealId.mockResolvedValue(null);

      const result = await syncDealToProject('12345');

      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
      expect(mockCreateProject).not.toHaveBeenCalled();
    });
  });

  describe('Test Case B: Duplicate Prevention', () => {
    it('should only create project once when same webhook fires twice', async () => {
      mockGetDealWithAssociations.mockResolvedValue(mockDeal);
      mockCreateClient.mockResolvedValue({ ...mockExistingClient, id: 'recNEWCLIENT' });
      
      // First call: no project found
      mockFindProjectByHubSpotDealId.mockResolvedValueOnce(null);
      mockCreateProject.mockResolvedValueOnce({
        id: 'recNEW123',
        name: mockDeal.name,
        hubspotDealId: mockDeal.id,
        budget: mockDeal.amount,
        status: 'Active',
        startDate: '2024-12-15',
        description: mockDeal.description
      });

      // Second call: project now exists
      mockFindProjectByHubSpotDealId.mockResolvedValueOnce({
        id: 'recNEW123',
        name: mockDeal.name,
        hubspotDealId: mockDeal.id,
        budget: mockDeal.amount,
        status: 'Active',
        startDate: '2024-12-15',
        description: mockDeal.description
      });
      mockFindClientByHubSpotContactId.mockResolvedValueOnce({ ...mockExistingClient, id: 'recNEWCLIENT' });

      const result1 = await syncDealToProject('12345');
      const result2 = await syncDealToProject('12345');

      expect(result1.action).toBe('created');
      expect(result2.action).toBe('skipped');
      expect(mockCreateProject).toHaveBeenCalledTimes(1);
    });

    it('should deduplicate batch webhook payloads with same dealId', async () => {
      mockGetDealWithAssociations.mockResolvedValue(mockDeal);
      mockFindProjectByHubSpotDealId.mockResolvedValue(null);
      mockCreateClient.mockResolvedValue({ ...mockExistingClient, id: 'recNEWCLIENT' });
      mockCreateProject.mockResolvedValue({
        id: 'recNEW123',
        name: mockDeal.name,
        hubspotDealId: mockDeal.id,
        budget: mockDeal.amount,
        status: 'Active',
        startDate: '2024-12-15',
        description: mockDeal.description
      });

      const batchPayloads = [
        { objectId: 12345, propertyName: 'dealstage', eventId: 1, subscriptionId: 1, portalId: 1, appId: 1, occurredAt: Date.now(), subscriptionType: 'deal.propertyChange', attemptNumber: 0 },
        { objectId: 12345, propertyName: 'amount', eventId: 2, subscriptionId: 1, portalId: 1, appId: 1, occurredAt: Date.now(), subscriptionType: 'deal.propertyChange', attemptNumber: 0 },
        { objectId: 12345, propertyName: 'dealname', eventId: 3, subscriptionId: 1, portalId: 1, appId: 1, occurredAt: Date.now(), subscriptionType: 'deal.propertyChange', attemptNumber: 0 }
      ];

      const results = await processBatchWebhook(batchPayloads);

      expect(results).toHaveLength(1);
      expect(mockGetDealWithAssociations).toHaveBeenCalledTimes(1);
      expect(mockCreateProject).toHaveBeenCalledTimes(1);
    });
  });

  describe('Test Case C: Selective UPDATE', () => {
    it('should update existing project instead of creating new one', async () => {
      const updatedDeal = { ...mockDeal, amount: 75000 };
      mockGetDealWithAssociations.mockResolvedValue(updatedDeal);
      mockFindProjectByHubSpotDealId.mockResolvedValue(mockExistingProject);
      mockFindClientByHubSpotContactId.mockResolvedValue(mockExistingClient);
      mockUpdateProject.mockResolvedValue({ ...mockExistingProject, budget: 75000 });

      const result = await syncDealToProject('12345');

      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');
      expect(result.projectId).toBe('rec123ABC');
      expect(mockUpdateProject).toHaveBeenCalledTimes(1);
      expect(mockUpdateProject).toHaveBeenCalledWith('rec123ABC', expect.objectContaining({ budget: 75000 }));
      expect(mockCreateProject).not.toHaveBeenCalled();
    });

    it('should skip update when no syncable fields have changed', async () => {
      mockGetDealWithAssociations.mockResolvedValue(mockDeal);
      mockFindProjectByHubSpotDealId.mockResolvedValue(mockExistingProject);
      mockFindClientByHubSpotContactId.mockResolvedValue(mockExistingClient);

      const result = await syncDealToProject('12345');

      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
      expect(result.message).toContain('No syncable fields changed');
      expect(mockUpdateProject).not.toHaveBeenCalled();
      expect(mockCreateProject).not.toHaveBeenCalled();
    });

    it('should update project when deal name changes', async () => {
      const renamedDeal = { ...mockDeal, name: 'Updated Deal Name' };
      mockGetDealWithAssociations.mockResolvedValue(renamedDeal);
      mockFindProjectByHubSpotDealId.mockResolvedValue(mockExistingProject);
      mockFindClientByHubSpotContactId.mockResolvedValue(mockExistingClient);
      mockUpdateProject.mockResolvedValue({ ...mockExistingProject, name: 'Updated Deal Name' });

      const result = await syncDealToProject('12345');

      expect(result.action).toBe('updated');
      expect(mockUpdateProject).toHaveBeenCalledWith('rec123ABC', expect.objectContaining({ name: 'Updated Deal Name' }));
    });
  });

  describe('Test Case D: Contact Creation and Linking', () => {
    it('should create contact and link to project during Closed Won event', async () => {
      // Arrange: No existing client, no existing project
      mockGetDealWithAssociations.mockResolvedValue(mockDeal);
      mockGetContactDetails.mockResolvedValue(mockContact);
      mockFindClientByHubSpotContactId.mockResolvedValue(null);
      mockFindProjectByHubSpotDealId.mockResolvedValue(null);
      
      const newClient = { ...mockExistingClient, id: 'recNEWCLIENT456' };
      mockCreateClient.mockResolvedValue(newClient);
      mockCreateProject.mockResolvedValue({
        id: 'recNEWPROJECT789',
        name: mockDeal.name,
        hubspotDealId: mockDeal.id,
        budget: mockDeal.amount,
        status: 'Active',
        startDate: '2024-12-15',
        description: mockDeal.description
      });

      // Act
      const result = await syncDealToProject('12345');

      // Assert
      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
      expect(result.clientId).toBe('recNEWCLIENT456');
      expect(result.projectId).toBe('recNEWPROJECT789');
      
      // Verify contact was created
      expect(mockCreateClient).toHaveBeenCalledTimes(1);
      expect(mockCreateClient).toHaveBeenCalledWith(
        expect.objectContaining({
          hubspotContactId: 'c1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com'
        })
      );
      
      // Verify project was created with clientId
      expect(mockCreateProject).toHaveBeenCalledTimes(1);
      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'recNEWCLIENT456'
        })
      );
    });

    it('should update existing contact and link to existing project', async () => {
      // Arrange: Existing client with changed email, existing project
      const updatedContact = { ...mockContact, email: 'john.new@example.com' };
      const existingClientWithOldEmail = { ...mockExistingClient, email: 'john@example.com' };
      
      mockGetDealWithAssociations.mockResolvedValue({ ...mockDeal, contacts: [updatedContact] });
      mockGetContactDetails.mockResolvedValue(updatedContact);
      mockFindClientByHubSpotContactId.mockResolvedValue(existingClientWithOldEmail);
      mockFindProjectByHubSpotDealId.mockResolvedValue(mockExistingProject);
      mockUpdateClient.mockResolvedValue({ ...existingClientWithOldEmail, email: 'john.new@example.com' });

      // Act
      const result = await syncDealToProject('12345');

      // Assert
      expect(result.success).toBe(true);
      expect(result.clientId).toBe('recCLIENT123');
      
      // Verify contact was updated (not created)
      expect(mockUpdateClient).toHaveBeenCalledTimes(1);
      expect(mockUpdateClient).toHaveBeenCalledWith(
        'recCLIENT123',
        expect.objectContaining({ email: 'john.new@example.com' })
      );
      expect(mockCreateClient).not.toHaveBeenCalled();
    });

    it('should handle deals without contacts gracefully', async () => {
      // Arrange: Deal has no contacts
      const dealWithoutContacts = { ...mockDeal, contacts: [] };
      mockGetDealWithAssociations.mockResolvedValue(dealWithoutContacts);
      mockFindProjectByHubSpotDealId.mockResolvedValue(null);
      mockCreateProject.mockResolvedValue({
        id: 'recNEW123',
        name: mockDeal.name,
        hubspotDealId: mockDeal.id,
        budget: mockDeal.amount,
        status: 'Active',
        startDate: '2024-12-15',
        description: mockDeal.description
      });

      // Act
      const result = await syncDealToProject('12345');

      // Assert
      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
      expect(result.clientId).toBeUndefined();
      expect(mockCreateClient).not.toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: undefined })
      );
    });
  });

  describe('Contact Sync - Direct', () => {
    it('should create new client when contact does not exist', async () => {
      mockGetContactDetails.mockResolvedValue(mockContact);
      mockFindClientByHubSpotContactId.mockResolvedValue(null);
      mockCreateClient.mockResolvedValue({ ...mockExistingClient, id: 'recNEWCLIENT' });

      const result = await syncContactToClient('c1');

      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
      expect(result.clientId).toBe('recNEWCLIENT');
      expect(mockCreateClient).toHaveBeenCalledTimes(1);
    });

    it('should update existing client when contact exists', async () => {
      const updatedContact = { ...mockContact, phone: '+1-555-9999' };
      mockGetContactDetails.mockResolvedValue(updatedContact);
      mockFindClientByHubSpotContactId.mockResolvedValue(mockExistingClient);
      mockUpdateClient.mockResolvedValue({ ...mockExistingClient, phone: '+1-555-9999' });

      const result = await syncContactToClient('c1');

      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');
      expect(mockUpdateClient).toHaveBeenCalledTimes(1);
      expect(mockCreateClient).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should return error when deal not found in HubSpot', async () => {
      mockGetDealWithAssociations.mockResolvedValue(null);

      const result = await syncDealToProject('99999');

      expect(result.success).toBe(false);
      expect(result.action).toBe('error');
      expect(result.message).toContain('not found in HubSpot');
    });

    it('should handle HubSpot API errors gracefully', async () => {
      mockGetDealWithAssociations.mockRejectedValue(new Error('HubSpot API rate limit exceeded'));

      const result = await syncDealToProject('12345');

      expect(result.success).toBe(false);
      expect(result.action).toBe('error');
      expect(result.message).toContain('rate limit');
    });

    it('should handle Airtable creation errors gracefully', async () => {
      mockGetDealWithAssociations.mockResolvedValue(mockDeal);
      mockFindProjectByHubSpotDealId.mockResolvedValue(null);
      mockCreateClient.mockResolvedValue({ ...mockExistingClient, id: 'recNEWCLIENT' });
      mockCreateProject.mockRejectedValue(new Error('Airtable field validation failed'));

      const result = await syncDealToProject('12345');

      expect(result.success).toBe(false);
      expect(result.action).toBe('error');
      expect(result.message).toContain('validation failed');
    });
  });
});
