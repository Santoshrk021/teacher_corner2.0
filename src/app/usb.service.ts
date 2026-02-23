import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import init, { decrypt } from 'snappy-remote';

interface Remote {
  mac: string;
  name: string;
  isTeacher: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsbService {
  private device: USBDevice | null = null;
  private serialNumber: Uint8Array | null = null;
  private knownRemotes: Remote[] = [];
  private seenMACs = new Set<string>();
  private remotesSubject = new BehaviorSubject<Remote[]>([]);
  private remoteSignalSubject = new Subject<{ MAC: string; value: number; KEY?: string }>();
  private connectedSubject = new BehaviorSubject<boolean>(false);

  private isListening = false;

  remotes$ = this.remotesSubject.asObservable();
  remoteSignal$: Observable<{ MAC: string; value: number; KEY?: string }> = this.remoteSignalSubject.asObservable();
  connected$ = this.connectedSubject.asObservable();

  /** Check if USB receiver is currently connected */
  get isConnected(): boolean {
    return this.connectedSubject.getValue();
  }

  constructor(private afs: AngularFirestore, private afAuth: AngularFireAuth) {
    this.initWasm();
  }

  async initWasm() {
    await init('/assets/snappy_bg.wasm');
  }

  resetRemotes() {
    this.knownRemotes = [];
    this.seenMACs.clear();
  }

  removeRemoteByMac(mac: string) {
    const wasTeacher = this.knownRemotes.find(r => r.mac === mac)?.isTeacher;
    this.knownRemotes = this.knownRemotes.filter(r => r.mac !== mac);
    this.seenMACs.delete(mac);

    if (wasTeacher && this.knownRemotes.length > 0) {
      this.knownRemotes[0].isTeacher = true;
      this.knownRemotes[0].name = 'Teacher';
    }

    this.remotesSubject.next([...this.knownRemotes]);
  }

  getConnectedRemotes(): Remote[] {
    return [...this.knownRemotes];
  }

  getOS(): 'windows' | 'mac' | 'unknown' {
    const platform = window.navigator.platform;
    const userAgent = window.navigator.userAgent;
    const mac = ['Macintosh', 'MacIntel'].includes(platform) || /Mac OS X/.test(userAgent);
    const win = ['Win32', 'Win64', 'Windows'].includes(platform);
    return mac ? 'mac' : win ? 'windows' : 'unknown';
  }

  private readonly VENDOR_ID = 0xB1B0;
  private readonly PRODUCT_ID = 0x8055;

  /**
   * Try to auto-reconnect to a previously paired device (no popup required)
   * Returns true if successfully reconnected, false if user action needed
   */
  async tryAutoReconnect(): Promise<boolean> {
    // If already connected, return true
    if (this.isConnected && this.device) {
      return true;
    }

    try {
      if (!('usb' in navigator)) return false;
      const usb: USB = (navigator as any).usb;

      // Get list of previously paired devices (no popup)
      const devices = await usb.getDevices();

      // Find our SNAPPY DONGLE
      const snappyDevice = devices.find(
        d => d.vendorId === this.VENDOR_ID && d.productId === this.PRODUCT_ID
      );

      if (!snappyDevice) {
        // No previously paired device found, user action required
        return false;
      }

      // Found a previously paired device, try to connect
      this.device = snappyDevice;

      // Setup and start listening
      const setupOk = await this.setupReceiver();
      if (setupOk) {
        this.resetRemotes();
        this.startListening();
        return true;
      }

      return false;
    } catch (err) {
      console.error('Auto-reconnect failed:', err);
      return false;
    }
  }

  // usb.service.ts
  async requestReceiverFromUser(): Promise<boolean> {
    try {
      if (!('usb' in navigator)) throw new Error('WebUSB not supported');
      const usb: USB = (navigator as any).usb;

      // ❗ MUST be first awaited call after the user's click
      this.device = await usb.requestDevice({ filters: [{ vendorId: this.VENDOR_ID, productId: this.PRODUCT_ID }] });
      return true;
    } catch (err) {
      console.error('❌ requestDevice failed:', err);
      this.device = null;
      return false;
    }
  }

  async setupReceiver(): Promise<boolean> {
    try {
      if (!this.device) throw new Error('No device selected');

      await this.device.open();
      if (this.device.configuration == null) {
        await this.device.selectConfiguration(1);
      }

      // Claim interfaces as needed (keep try/catch for 0, required 1)
      try { await this.device.claimInterface(0); } catch { }
      await this.device.claimInterface(1);

      const os = this.getOS();
      if (os === 'windows') {
        const result = await this.device.controlTransferIn(
          {
            requestType: 'standard',
            recipient: 'device',
            request: 0x06,
            value: (0x03 << 8) | 3,
            index: 0x0409
          },
          255
        );
        if (!result.data) throw new Error('No descriptor data returned');
        const raw = new Uint8Array(result.data.buffer);
        const extracted: number[] = [];
        for (let i = 2; i < raw.length; i += 2) extracted.push(raw[i]);
        this.serialNumber = new Uint8Array(extracted);
      } else {
        const sn = this.device.serialNumber || '';
        this.serialNumber = new Uint8Array([...sn].map(c => c.charCodeAt(0)));
      }

      // Send start command
      const command = new TextEncoder().encode('START\n');
      // NOTE: endpoint "2" must match your OUT endpoint on the claimed interface
      await this.device.transferOut(2, command);

      this.connectedSubject.next(true);
      return true;
    } catch (error) {
      console.error('❌ Receiver setup failed:', error);
      this.connectedSubject.next(false);
      return false;
    }
  }


  async startListening() {
    if (this.isListening || !this.device || !this.serialNumber) return;

    this.isListening = true;
    // console.log('🔄 Starting remote listening loop...');

    while (this.isListening) {
      try {
        const result = await this.device.transferIn(2, 32);

        if (result?.status === 'ok' && result.data) {
          const raw = new Uint8Array(result.data.buffer);

          for (let i = 0; i <= raw.length - 17; i++) {
            const chunk = raw.slice(i, i + 17);
            try {
              const decrypted = decrypt(this.serialNumber, chunk);
              if (typeof decrypted === 'string' && decrypted.trim().startsWith('{')) {
                const json = JSON.parse(decrypted);
                const mac = json.MAC;

                if (!this.seenMACs.has(mac)) {
                  const isFirst = this.knownRemotes.length === 0;
                  this.knownRemotes.push({
                    mac,
                    name: isFirst ? 'Teacher' : 'Student',
                    isTeacher: isFirst
                  });
                  this.seenMACs.add(mac);
                  this.remotesSubject.next([...this.knownRemotes]);
                }

                // Broadcast the signal
                this.remoteSignalSubject.next(json);
                break;
              }
            } catch (err) {
              console.warn('Failed to decrypt at offset', i, err);
            }
          }
        }
      } catch (e) {
        console.error('❌ Listening failed:', e);
        this.isListening = false;
      }
    }
  }
}
