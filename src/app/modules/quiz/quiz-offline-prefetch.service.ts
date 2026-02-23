import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class QuizOfflinePrefetchService {
  async prefetch(urls: string[]) {
    if (!('caches' in window)) return;
    const cache = await caches.open('quiz-assets');
    await cache.addAll(urls.filter(Boolean));
  }
}
