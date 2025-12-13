/**
 * Sync Service Unit Tests
 * 
 * Tests the UPSERT logic for syncing HubSpot deals to Airtable projects.
 * 
 * Test Cases:
 * A: Successful INSERT - "Closed Won" webhook creates new project
 * B: Duplicate Prevention - Same webhook twice only creates one project
 * C: Selective UPDATE - Existing project gets updated, not recreated
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncDealToProject, processBatchWebhook } from '../server/services/sync_service';
import type { DealWithAssociations } from '../server/services/hubspot_service';
import type { Project, ProjectInput } from '../server/services/airtable_service';

// Mock the airtable_service module
vi.mock('../server/services/airtable_service', () => ({
  findProjectByHubSpotDealId: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn()
}));

// Mock the hubspot_service module
vi.mock('../server/services/hubspot_service', () => ({
  getDealWithAssociations: vi.fn()
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
      syncableFields: ['dealname', 'amount', 'closedate', 'description']
    },
    projectStatusMapping: {
      closedwon: 'Active',
      contractsent: 'Pending Approval'
    }
  }
}));

// Import mocked functions after mocking
import { findProjectByHubSpotDealId, createProject, updateProject } from '../server/services/airtable_service';
import { getDealWithAssociations } from '../server/services/hubspot_service';

// Cast to mocked types for type safety
const mockFindProjectByHubSpotDealId = findProjectByHubSpotDealId as ReturnType<typeof vi.fn>;
const mockCreateProject = createProject as ReturnType<typeof vi.fn>;
const mockUpdateProject = updateProject as ReturnType<typeof vi.fn>;
const mockGetDealWithAssociations = getDealWithAssociations as ReturnType<typeof vi.fn>;

// Test fixtures
const mockDeal: DealWithAssociations = {
  id: '12345',
  name: 'Test Deal - Enterprise License',
  amount: 50000,
  stage: 'Closed Won',
  stageId: 'closedwon',
  closeDate: '2024-12-15T00:00:00.000Z',
  description: 'Annual enterprise license deal',
  contacts: [
    { id: 'c1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' }
  ],
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

describe('Sync Service - UPSERT Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Test Case A: Successful INSERT', () => {
    it('should create a new project when deal is Closed Won and no existing record exists', async () => {
      // Arrange: Deal exists in HubSpot, but no corresponding project in Airtable
      mockGetDealWithAssociations.mockResolvedValue(mockDeal);
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
      expect(result.dealId).toBe('12345');
      expect(result.projectId).toBe('recNEW123');
      
      // Verify createProject was called exactly once
      expect(mockCreateProject).toHaveBeenCalledTimes(1);
      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Deal - Enterprise License',
          hubspotDealId: '12345',
          budget: 50000,
          status: 'Active'
        })
      );
      
      // Verify updateProject was NOT called
      expect(mockUpdateProject).not.toHaveBeenCalled();
    });

    it('should skip creation when deal stage is not in projectCreationStages', async () => {
      // Arrange: Deal is not "Closed Won"
      const nonClosedDeal = { ...mockDeal, stageId: 'qualifiedtobuy', stage: 'Discovery' };
      mockGetDealWithAssociations.mockResolvedValue(nonClosedDeal);
      mockFindProjectByHubSpotDealId.mockResolvedValue(null);

      // Act
      const result = await syncDealToProject('12345');

      // Assert
      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockUpdateProject).not.toHaveBeenCalled();
    });
  });

  describe('Test Case B: Duplicate Prevention', () => {
    it('should only create project once when same webhook fires twice', async () => {
      // Arrange: First call - no existing project
      mockGetDealWithAssociations.mockResolvedValue(mockDeal);
      
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
      mockUpdateProject.mockResolvedValueOnce({
        id: 'recNEW123',
        name: mockDeal.name,
        hubspotDealId: mockDeal.id,
        budget: mockDeal.amount,
        status: 'Active',
        startDate: '2024-12-15',
        description: mockDeal.description
      });

      // Act: Simulate two webhook calls
      const result1 = await syncDealToProject('12345');
      const result2 = await syncDealToProject('12345');

      // Assert
      expect(result1.action).toBe('created');
      expect(result2.action).toBe('skipped'); // Should skip because no fields changed
      
      // createProject should only be called ONCE
      expect(mockCreateProject).toHaveBeenCalledTimes(1);
    });

    it('should deduplicate batch webhook payloads with same dealId', async () => {
      // Arrange: Multiple webhook events for same deal
      mockGetDealWithAssociations.mockResolvedValue(mockDeal);
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

      const batchPayloads = [
        { objectId: 12345, propertyName: 'dealstage', eventId: 1, subscriptionId: 1, portalId: 1, appId: 1, occurredAt: Date.now(), subscriptionType: 'deal.propertyChange', attemptNumber: 0 },
        { objectId: 12345, propertyName: 'amount', eventId: 2, subscriptionId: 1, portalId: 1, appId: 1, occurredAt: Date.now(), subscriptionType: 'deal.propertyChange', attemptNumber: 0 },
        { objectId: 12345, propertyName: 'dealname', eventId: 3, subscriptionId: 1, portalId: 1, appId: 1, occurredAt: Date.now(), subscriptionType: 'deal.propertyChange', attemptNumber: 0 }
      ];

      // Act
      const results = await processBatchWebhook(batchPayloads);

      // Assert: Should only process once despite 3 events
      expect(results).toHaveLength(1);
      expect(mockGetDealWithAssociations).toHaveBeenCalledTimes(1);
      expect(mockCreateProject).toHaveBeenCalledTimes(1);
    });
  });

  describe('Test Case C: Selective UPDATE', () => {
    it('should update existing project instead of creating new one', async () => {
      // Arrange: Project already exists, deal has updated amount
      const updatedDeal = { ...mockDeal, amount: 75000 };
      mockGetDealWithAssociations.mockResolvedValue(updatedDeal);
      mockFindProjectByHubSpotDealId.mockResolvedValue(mockExistingProject);
      mockUpdateProject.mockResolvedValue({
        ...mockExistingProject,
        budget: 75000
      });

      // Act
      const result = await syncDealToProject('12345');

      // Assert
      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');
      expect(result.projectId).toBe('rec123ABC');
      
      // Verify updateProject was called
      expect(mockUpdateProject).toHaveBeenCalledTimes(1);
      expect(mockUpdateProject).toHaveBeenCalledWith(
        'rec123ABC',
        expect.objectContaining({ budget: 75000 })
      );
      
      // Verify createProject was NOT called
      expect(mockCreateProject).not.toHaveBeenCalled();
    });

    it('should skip update when no syncable fields have changed', async () => {
      // Arrange: Deal has same values as existing project
      mockGetDealWithAssociations.mockResolvedValue(mockDeal);
      mockFindProjectByHubSpotDealId.mockResolvedValue(mockExistingProject);

      // Act
      const result = await syncDealToProject('12345');

      // Assert
      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
      expect(result.message).toContain('No syncable fields changed');
      
      expect(mockUpdateProject).not.toHaveBeenCalled();
      expect(mockCreateProject).not.toHaveBeenCalled();
    });

    it('should update project when deal name changes', async () => {
      // Arrange: Deal name changed
      const renamedDeal = { ...mockDeal, name: 'Updated Deal Name' };
      mockGetDealWithAssociations.mockResolvedValue(renamedDeal);
      mockFindProjectByHubSpotDealId.mockResolvedValue(mockExistingProject);
      mockUpdateProject.mockResolvedValue({
        ...mockExistingProject,
        name: 'Updated Deal Name'
      });

      // Act
      const result = await syncDealToProject('12345');

      // Assert
      expect(result.action).toBe('updated');
      expect(mockUpdateProject).toHaveBeenCalledWith(
        'rec123ABC',
        expect.objectContaining({ name: 'Updated Deal Name' })
      );
    });
  });

  describe('Error Handling', () => {
    it('should return error when deal not found in HubSpot', async () => {
      // Arrange
      mockGetDealWithAssociations.mockResolvedValue(null);

      // Act
      const result = await syncDealToProject('99999');

      // Assert
      expect(result.success).toBe(false);
      expect(result.action).toBe('error');
      expect(result.message).toContain('not found in HubSpot');
    });

    it('should handle HubSpot API errors gracefully', async () => {
      // Arrange
      mockGetDealWithAssociations.mockRejectedValue(new Error('HubSpot API rate limit exceeded'));

      // Act
      const result = await syncDealToProject('12345');

      // Assert
      expect(result.success).toBe(false);
      expect(result.action).toBe('error');
      expect(result.message).toContain('rate limit');
    });

    it('should handle Airtable creation errors gracefully', async () => {
      // Arrange
      mockGetDealWithAssociations.mockResolvedValue(mockDeal);
      mockFindProjectByHubSpotDealId.mockResolvedValue(null);
      mockCreateProject.mockRejectedValue(new Error('Airtable field validation failed'));

      // Act
      const result = await syncDealToProject('12345');

      // Assert
      expect(result.success).toBe(false);
      expect(result.action).toBe('error');
      expect(result.message).toContain('validation failed');
    });
  });
});
