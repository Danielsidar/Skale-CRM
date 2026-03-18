import { SupabaseClient } from '@supabase/supabase-js';
import { EmailPayload, MailingProvider } from '../types';
import { GHLWebhookProvider } from './ghl-webhook';

export class MailingService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Get the mailing provider for a business.
   * Currently only supports GHL Webhook.
   */
  private async getProvider(businessId: string): Promise<MailingProvider> {
    const { data: business, error } = await this.supabase
      .from('businesses')
      .select('ghl_webhook_url')
      .eq('id', businessId)
      .single();

    if (error || !business?.ghl_webhook_url) {
      throw new Error(`Business ${businessId} has no GHL Webhook URL configured.`);
    }

    return new GHLWebhookProvider(business.ghl_webhook_url);
  }

  /**
   * Send a manual campaign to one or more mailing lists.
   */
  async sendCampaign(params: {
    businessId: string;
    name: string;
    subject: string;
    contentHtml: string;
    listIds: string[];
  }) {
    // 1. Get the provider
    const provider = await this.getProvider(params.businessId);

    // 2. Fetch all unique contacts from the specified lists
    const { data: contacts, error: contactsError } = await this.supabase
      .from('mailing_list_contacts')
      .select(`
        contact_id,
        contacts (
          email,
          full_name
        )
      `)
      .in('list_id', params.listIds);

    if (contactsError) throw contactsError;

    // Filter unique emails and prepare recipients
    const recipientsMap = new Map<string, { email: string; fullName?: string }>();
    for (const row of (contacts as any[])) {
      const contact = row.contacts;
      if (contact?.email) {
        recipientsMap.set(contact.email, {
          email: contact.email,
          fullName: contact.full_name,
        });
      }
    }

    const recipients = Array.from(recipientsMap.values());
    if (recipients.length === 0) {
      return { success: false, error: 'No recipients found in the selected lists.' };
    }

    // 3. Send via provider
    const result = await provider.sendEmail({
      to: recipients,
      subject: params.subject,
      html: params.contentHtml,
      businessId: params.businessId,
    });

    // 4. Log the campaign
    const { data: campaign, error: campaignError } = await this.supabase
      .from('email_campaigns')
      .insert({
        business_id: params.businessId,
        name: params.name,
        subject: params.subject,
        content_html: params.contentHtml,
        status: result.success ? 'sent' : 'failed',
        provider_type: 'ghl_webhook',
      })
      .select('id')
      .single();

    if (campaignError) throw campaignError;

    // 5. Link campaign to lists
    if (campaign) {
      const campaignLists = params.listIds.map(listId => ({
        campaign_id: campaign.id,
        list_id: listId,
      }));

      await this.supabase.from('email_campaign_lists').insert(campaignLists);
    }

    return result;
  }

  /**
   * Send a single email (usually for automations).
   */
  async sendSingleEmail(params: {
    businessId: string;
    to: string;
    fullName?: string;
    subject: string;
    html: string;
    metadata?: Record<string, any>;
  }) {
    const provider = await this.getProvider(params.businessId);

    return provider.sendEmail({
      to: [{ email: params.to, fullName: params.fullName, metadata: params.metadata }],
      subject: params.subject,
      html: params.html,
      businessId: params.businessId,
    });
  }
}
