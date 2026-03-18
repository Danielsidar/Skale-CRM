export interface EmailRecipient {
  email: string;
  fullName?: string;
  metadata?: Record<string, any>;
}

export interface EmailPayload {
  to: EmailRecipient[];
  subject: string;
  html: string;
  businessId: string;
}

export interface MailingProvider {
  sendEmail(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }>;
}
