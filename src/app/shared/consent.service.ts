/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/quotes */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ConsentService {

    constructor(private http: HttpClient) { }

    postRegWhatsappMsg(countryCodePlusTenDigitNumber) {
        const url = 'https://asia-south1-tactile-education-services-pvt.cloudfunctions.net/sendRaWaNotification';
        // const url = `http://localhost:5000/tactile-education-services-pvt/asia-south1/sendRaWaNotification`;
        const postData = {
            nums: [
                {
                    'phone_number': '+' + countryCodePlusTenDigitNumber
                }
            ],
            // template : "raman_awards_activity"
        };
        const result = this.http.post(url, postData);
        return lastValueFrom(result).then((data) => {
        }).catch(er => console.error(er));
    }


}
