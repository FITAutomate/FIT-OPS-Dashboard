import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getAllClients, getClientById } from "./services/airtable_service";
import { getAllDeals, getDealsByStage } from "./services/hubspot_service";

/**
 * Register all API routes for the FIT CRM application.
 * 
 * All routes are prefixed with /api for clear separation between API and frontend.
 * 
 * @param {Server} httpServer - The HTTP server instance
 * @param {Express} app - The Express application instance
 * @returns {Promise<Server>} The configured HTTP server
 */
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  /**
   * GET /api/clients
   * 
   * Fetches all company/client records from Airtable.
   * Returns a standardized list of companies with their metadata.
   */
  app.get('/api/clients', async (req, res) => {
    try {
      const clients = await getAllClients();
      res.json(clients);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ 
        error: 'Failed to fetch clients', 
        message: error.message 
      });
    }
  });

  /**
   * GET /api/clients/:id
   * 
   * Fetches a single client by their Airtable record ID.
   */
  app.get('/api/clients/:id', async (req, res) => {
    try {
      const client = await getClientById(req.params.id);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      res.json(client);
    } catch (error: any) {
      console.error('Error fetching client:', error);
      res.status(500).json({ 
        error: 'Failed to fetch client', 
        message: error.message 
      });
    }
  });

  /**
   * GET /api/deals
   * 
   * Fetches all deal records from HubSpot CRM.
   * Optionally filter by stage using query parameter: ?stage=Proposal
   */
  app.get('/api/deals', async (req, res) => {
    try {
      const { stage } = req.query;
      
      const deals = stage && typeof stage === 'string'
        ? await getDealsByStage(stage)
        : await getAllDeals();
      
      res.json(deals);
    } catch (error: any) {
      console.error('Error fetching deals:', error);
      res.status(500).json({ 
        error: 'Failed to fetch deals', 
        message: error.message 
      });
    }
  });

  /**
   * Health check endpoint
   * Verifies that the API server is running
   */
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      services: {
        airtable: !!process.env.AIRTABLE_API_KEY,
        hubspot: !!process.env.HUBSPOT_ACCESS_TOKEN
      }
    });
  });

  return httpServer;
}
