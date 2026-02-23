import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

export interface RemoteEvent {
  id?: string;                 // Firestore docId
  macId: string;
  button: string;              // character/string
  clientTimestampMs: number;
  serverReceiveMs: number;
  latencyMs: number;
  serverTimestamp?: any;
  updatedAt?: any;
}

@Injectable({ providedIn: 'root' })
export class RemoteEventsService {
  private latestEvents$?: Observable<RemoteEvent[]>;

  constructor(private afs: AngularFirestore) {}

  /**
   * Shared realtime stream of latest events.
   * - One Firestore listener shared across all subscribers
   * - New subscribers immediately get last emitted value
   */
  getLatestEvents$(limitCount = 50, collectionName: string = 'SnappyRemoteEvents'): Observable<RemoteEvent[]> {
    // If you want separate cache per limit/collection, we can key by params.
    // For now, keep it simple: one shared stream.
    if (!this.latestEvents$) {
      this.latestEvents$ = this.afs
        .collection<RemoteEvent>(collectionName, ref =>
          ref.orderBy('serverReceiveMs', 'desc').limit(limitCount)
        )
        .snapshotChanges()
        .pipe(
          map(actions =>
            actions.map(a => ({
              id: a.payload.doc.id,
              ...(a.payload.doc.data() as RemoteEvent),
            }))
          ),
          // ✅ share the same Firestore subscription across all components
          shareReplay({ bufferSize: 1, refCount: true })
        );
    }

    return this.latestEvents$;
  }

  /**
   * Fresh realtime stream of latest events (not cached).
   * Use this when you need a new subscription that doesn't share state.
   */
  getFreshLatestEvents$(limitCount = 50, collectionName: string = 'SnappyRemoteEvents'): Observable<RemoteEvent[]> {
    return this.afs
      .collection<RemoteEvent>(collectionName, ref =>
        ref.orderBy('serverReceiveMs', 'desc').limit(limitCount)
      )
      .snapshotChanges()
      .pipe(
        map(actions =>
          actions.map(a => ({
            id: a.payload.doc.id,
            ...(a.payload.doc.data() as RemoteEvent),
          }))
        )
      );
  }
}
