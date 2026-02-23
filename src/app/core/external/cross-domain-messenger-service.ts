import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CrossDomainMessengerService {
  private intervalId: any;
  private timeoutId: any;

  constructor() {}

  /**
   * Opens a new window and sends a postMessage repeatedly until timeout.
   * @param url The URL to open in a new window (target).
   * @param payload The data to send (email, password etc.)
   * @param targetOrigin The allowed origin (eg. https://mentored.thinktac.com)
   * @param options Optional settings
   */
  openAndPostMessage(
    url: string,
    payload: any,
    targetOrigin: string,
    options?: { intervalMs?: number; timeoutMs?: number }
  ) {
    const intervalMs = options?.intervalMs ?? 2000;  // default every 2s
    const timeoutMs = options?.timeoutMs ?? 10000;   // default 10s max

    const targetWindow = window.open(url, '_blank');

    if (!targetWindow) {
      console.error('Failed to open window. Maybe popup blocked?');
      return;
    }

    const sendMessage = () => {
        targetWindow.postMessage(payload, targetOrigin);
    };

    try {
      setTimeout(() => {
        sendMessage();
      }, 2000);
      console.log(`Successfully attempted post message`);
    } catch (error) {
      console.error('Error attempting post message:', error);
      // Start sending after a little delay to allow window to load
      setTimeout(() => {
        sendMessage();
        this.intervalId = setInterval(sendMessage, intervalMs);

        // Stop sending after timeout
        this.timeoutId = setTimeout(() => {
          clearInterval(this.intervalId);
          console.log('Stopped sending messages after timeout');
        }, timeoutMs);
      }, 2000);
    }
  }

  /**
   * Optionally manually stop sending messages
   */
  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.timeoutId) clearTimeout(this.timeoutId);
  }
}
