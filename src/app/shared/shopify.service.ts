import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ShopifyService {
  environment = environment;
  constructor(
    private http: HttpClient
  ) { }

  // getAllActiveProducts() {
  //   const url = 'https://berrygoodmedia.herokuapp.com/https://tactileducation.myshopify.com/admin/api/2023-01/products.json?status=active';
  //   // let url = 'https://tactileducation.myshopify.com/admin/api/2023-01/products.json?status=active';
  //   const headers: any = new HttpHeaders()
  //     .set('X-Shopify-Access-Token', 'YOUR_SHOPIFY_ACCESS_TOKEN')
  //     .set('Content-Type', 'application/json')
  //     .set('Access-Control-Allow-Origin', '*')
  //     .set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
  //     .set('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Access-Token, Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers')
  //     .set('Access-Control-Allow-Credentials', 'true')
  //     .set('Access-Control-Allow-Origin', '*');

  //   const requestOptions = { headers: headers };
  //   return this.http.get(url, requestOptions);
  // }

  getAllActiveProducts() {
    // let url = 'http://localhost:5000/backup-collection/asia-south1/getAllShopifyProducts';
    let url = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/getAllShopifyProducts`;
    return this.http.get(url);
  }

  getAllStates() {
    const url = 'https://berrygoodmedia.herokuapp.com/https://www.universal-tutorial.com/api/states/India';
    const headers: any = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Access-Control-Allow-Origin', '*')
      .set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
      .set('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Access-Token, Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers')
      .set('Access-Control-Allow-Credentials', 'true')
      .set('Access-Control-Allow-Origin', '*')
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7InVzZXJfZW1haWwiOiJjaGFuZHJhc2hla2hhci5hQGludGVybi50aGlua3RhYy5jb20iLCJhcGlfdG9rZW4iOiJHS3pFVmJlS2NvNkRLenRUV1NXOHI2TmRLbVEyQVVBNnR6ejF6QWRqeld6WVp1RzFtWW1lbG1xdEsxanBGV3JPejVBIn0sImV4cCI6MTY4MDM0MDE2OX0.OtyGsJ517IfVnXGAvcj6hs2_pCdhnWJHx261ALsWtmA');

    const requestOptions = { headers: headers };
    return this.http.get(url, requestOptions);
  }

}
