// Row interface for spreadsheet data
export interface Row {
  [k: string]: any;
}

// Log entry for tracking message status
export interface MessageLogEntry {
  phone: string;
  params: string[];
  request_id: string;
  status: string;
  failure_reason: string;
  timestamp: string;
}

// Template interface matching Firestore structure
export interface WhatsAppTemplate {
  templateName: string;
  body: string;
  language: string;
  image?: string;
  params?: string[];
  header?: string;
  mediaType?: string;
}

// Batch history entry for storage
export interface BatchHistoryEntry {
  batchId: string;
  templateName: string;
  totalRecipients: number;
  successCount: number;
  failedCount: number;
  createdAt: string;
  createdBy?: string;
  status: 'completed' | 'pending' | 'failed';
  paramFields: string[];
}

// Recipient data for original send list (without request_id)
export interface RecipientEntry {
  phone: string;
  params: string[];
}

// Status result entry (without request_id for display)
export interface StatusResultEntry {
  phone: string;
  params: string[];
  status: string;
  failure_reason: string;
}

// Failed entry for retry download
export interface FailedEntry {
  phone: string;
  params: string[];
}
