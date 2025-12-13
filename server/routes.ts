import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import { getAllClients, getClientById, getAllProjects } from "./services/airtable_service";
import { getAllDeals, getDealsByStage, createDealWebhookSubscription } from "./services/hubspot_service";
import { processBatchWebhook, type HubSpotWebhookPayload } from "./services/sync_service";
import { config } from "./services/config";

/**
 * Verifies the HubSpot webhook signature.
 * 
 * HubSpot signs webhook requests using HMAC-SHA256 with the client secret.
 * The signature is sent in the X-HubSpot-Signature-v3 header.
 * 
 * @param {Request} req - The Express request object
 * @returns {boolean} True if signature is valid
 */
function verifyHubSpotSignature(req: Request): boolean {
  const signature = req.headers['x-hubspot-signature-v3'] as string;
  const timestamp = req.headers['x-hubspot-request-timestamp'] as string;
  
  if (!signature || !timestamp) {
    console.log('[Webhook] Missing signature or timestamp headers');
    return false;
  }

  // Check timestamp is within 5 minutes to prevent replay attacks
  const currentTime = Date.now();
  const requestTime = parseInt(timestamp, 10);
  if (Math.abs(currentTime - requestTime) > 300000) {
    console.log('[Webhook] Request timestamp too old');
    return false;
  }

  const secret = config.webhooks.hubspotSecret;
  if (!secret) {
    console.log('[Webhook] No webhook secret configured - allowing request in development');
    return true; // Allow in development without secret
  }

  // Build the signature base string
  const method = req.method;
  const url = `https://${req.headers.host}${req.originalUrl}`;
  const rawBody = (req as any).rawBody?.toString() || '';
  const signatureBaseString = `${method}${url}${rawBody}${timestamp}`;

  // Calculate expected signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signatureBaseString)
    .digest('base64');

  return signature === expectedSignature;
}

/**
 * Register all API routes for the FIT CRM application.
 */
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ============================================
  // CLIENT/COMPANY ENDPOINTS
  // ============================================

  /**
   * GET /api/clients
   * Fetches all company/client records from Airtable.
   */
  app.get('/api/clients', async (req: Request, res: Response) => {
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
   * Fetches a single client by their Airtable record ID.
   */
  app.get('/api/clients/:id', async (req: Request, res: Response) => {
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

  // ============================================
  // DEAL ENDPOINTS
  // ============================================

  /**
   * GET /api/deals
   * Fetches all deal records from HubSpot CRM.
   */
  app.get('/api/deals', async (req: Request, res: Response) => {
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

  // ============================================
  // PROJECT ENDPOINTS
  // ============================================

  /**
   * GET /api/projects
   * Fetches all project records from Airtable.
   */
  app.get('/api/projects', async (req: Request, res: Response) => {
    try {
      const projects = await getAllProjects();
      res.json(projects);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ 
        error: 'Failed to fetch projects', 
        message: error.message 
      });
    }
  });

  // ============================================
  // WEBHOOK ENDPOINTS
  // ============================================

  /**
   * POST /api/webhooks/hubspot/deal_status
   * 
   * Receives HubSpot webhook notifications when deal properties change.
   * Implements the UPSERT logic to sync deals to Airtable projects.
   * 
   * Security: Verifies HubSpot request signature before processing.
   */
  app.post('/api/webhooks/hubspot/deal_status', async (req: Request, res: Response) => {
    console.log('[Webhook] *** INCOMING REQUEST ***');
    console.log('[Webhook] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('[Webhook] Body:', JSON.stringify(req.body, null, 2));
    
    try {
      // Verify HubSpot signature
      if (!verifyHubSpotSignature(req)) {
        console.log('[Webhook] Invalid signature - rejecting request');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      console.log('[Webhook] Signature verified - processing webhook');

      // HubSpot sends an array of events
      const payloads: HubSpotWebhookPayload[] = Array.isArray(req.body) 
        ? req.body 
        : [req.body];

      if (payloads.length === 0) {
        return res.status(200).json({ message: 'No events to process' });
      }

      // Process the webhook events
      const results = await processBatchWebhook(payloads);

      // Log summary
      const created = results.filter(r => r.action === 'created').length;
      const updated = results.filter(r => r.action === 'updated').length;
      const skipped = results.filter(r => r.action === 'skipped').length;
      const errors = results.filter(r => r.action === 'error').length;

      console.log(`[Webhook] Processed: ${created} created, ${updated} updated, ${skipped} skipped, ${errors} errors`);

      res.status(200).json({
        success: true,
        processed: results.length,
        summary: { created, updated, skipped, errors },
        results
      });
    } catch (error: any) {
      console.error('[Webhook] Error processing webhook:', error);
      res.status(500).json({ 
        error: 'Webhook processing failed', 
        message: error.message 
      });
    }
  });

  /**
   * POST /api/webhooks/hubspot/test/:dealId
   * 
   * Manual test endpoint to trigger sync for a specific deal.
   * Used for debugging - bypasses HubSpot webhook.
   */
  app.post('/api/webhooks/hubspot/test/:dealId', async (req: Request, res: Response) => {
    try {
      const { dealId } = req.params;
      console.log(`[Test] Manual sync triggered for deal: ${dealId}`);
      
      const { syncDealToProject } = await import('./services/sync_service');
      const result = await syncDealToProject(dealId);
      
      console.log(`[Test] Sync result:`, JSON.stringify(result, null, 2));
      res.json(result);
    } catch (error: any) {
      console.error('[Test] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/webhooks/hubspot/setup
   * 
   * Returns the webhook URL and setup instructions for HubSpot configuration.
   */
  app.get('/api/webhooks/hubspot/setup', async (req: Request, res: Response) => {
    try {
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host;
      const webhookUrl = `${protocol}://${host}/api/webhooks/hubspot/deal_status`;

      const result = await createDealWebhookSubscription(webhookUrl);

      res.json({
        webhookUrl,
        ...result,
        instructions: [
          '1. Go to HubSpot Developer Account > Your Apps',
          '2. Select your app and navigate to Webhooks',
          '3. Create a new subscription:',
          '   - Object: deals',
          '   - Event: propertyChange',
          '   - Properties: dealstage, dealname, amount, closedate',
          `4. Set the target URL to: ${webhookUrl}`,
          '5. Save and activate the subscription'
        ],
        requiredSecrets: {
          HUBSPOT_CLIENT_SECRET: !!config.webhooks.hubspotSecret
        }
      });
    } catch (error: any) {
      console.error('Error in webhook setup:', error);
      res.status(500).json({ 
        error: 'Webhook setup failed', 
        message: error.message 
      });
    }
  });

  // ============================================
  // HEALTH CHECK
  // ============================================

  /**
   * GET /api/health
   * Verifies that the API server is running and services are configured.
   */
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      services: {
        airtable: !!process.env.AIRTABLE_API_KEY && !!process.env.AIRTABLE_BASE_ID,
        hubspot: !!process.env.HUBSPOT_ACCESS_TOKEN,
        webhooks: !!config.webhooks.hubspotSecret
      }
    });
  });

  // ============================================
  // SEED DEMO DATA
  // ============================================

  /**
   * POST /api/seed/demo
   * Seeds Airtable with demo companies, contacts, and projects.
   */
  app.post('/api/seed/demo', async (req: Request, res: Response) => {
    try {
      console.log('[Seed] Starting demo data seeding...');
      const { seedDemoData } = await import('./services/seed_service');
      const result = await seedDemoData();
      
      console.log('[Seed] Complete:', JSON.stringify(result, null, 2));
      res.json({
        success: true,
        summary: {
          companies: result.companies,
          contacts: result.contacts,
          projects: result.projects
        },
        logs: result.logs
      });
    } catch (error: any) {
      console.error('[Seed] Error:', error);
      res.status(500).json({ 
        error: 'Seeding failed', 
        message: error.message 
      });
    }
  });

  return httpServer;
}
