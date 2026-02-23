import { Injectable } from '@angular/core';
import { getFunctions, httpsCallable } from 'firebase/functions';

@Injectable({
  providedIn: 'root'
})
export class WhatsappSenderService {

  constructor() {}

  /**
   * Enqueue a bulk WhatsApp message batch to Cloud Function
   * @param payload Batch data (recipients, template info, schedule)
   * @returns Promise resolving to function response
   */
  async enqueueBatch(payload: any): Promise<any> {
    try {
      const functions = getFunctions();
      const enqueue = httpsCallable(functions, 'enqueueBulkWhatsapp');
      const result = await enqueue(payload);
      console.log('Batch enqueued successfully:', result.data);
      return result;
    } catch (error) {
      console.error('Error enqueuing WhatsApp batch:', error);
      throw error;
    }
  }

  /**
   * (Optional) helper to send a single WhatsApp message instantly
   */
  async sendSingleMessage(payload: any): Promise<any> {
    try {
      const functions = getFunctions();
      const send = httpsCallable(functions, 'sendSingleWhatsapp');
      const result = await send(payload);
      return result;
    } catch (error) {
      console.error('Error sending single message:', error);
      throw error;
    }
  }
}
