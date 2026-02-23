/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class DomainService {

    constructor() { }
    getDomain() {
        const parsedUrl = new URL(window.location.href);
        const baseUrl = parsedUrl.origin;
        const domain = baseUrl?.split('//')[1];
        // console.log(domain);

        return domain || 'localhost';
    }

    isRamanDomain() {
        const domain = this.getDomain();
        return domain.includes('raman');
    }

    isUnLabDomain() {
        const domain = this.getDomain();
        return domain.includes('unlab');

    }
    isLocalHost() {
        const domain = this.getDomain();
        return domain.includes('localhost');
    }
}
