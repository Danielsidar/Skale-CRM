import { EmailPayload, MailingProvider } from '../types';

export class GHLWebhookProvider implements MailingProvider {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async sendEmail(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: payload.to,
          subject: payload.subject,
          html: payload.html,
          business_id: payload.businessId,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { 
          success: false, 
          error: `GHL Webhook failed: ${response.status} ${errorText}` 
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending GHL webhook:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
