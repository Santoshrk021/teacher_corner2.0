import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { gql, Apollo } from 'apollo-angular';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { ShopifyService } from 'app/shared/shopify.service';

@Component({
  selector: 'app-checkout-cart',
  templateUrl: './checkout-cart.component.html',
  styleUrls: ['./checkout-cart.component.scss']
})
export class CheckoutCartComponent implements OnInit {

  checkOutForm: FormGroup;
  quantity = 1;
  states: any;
  constructor(
    public dialog: MatDialog,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpClient,
    private apollo: Apollo,
    private userService: UserService,
    private shopifyService: ShopifyService,
  ) { }

  ngOnInit(): void {
    this.setForm();
    // this.getAllStates();
  }

  setForm() {
    this.checkOutForm = this.fb.group({
      email: ['', [Validators.required, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      address1: ['', [Validators.required]],
      address2: [''],
      city: ['', [Validators.required]],
      // state: ['', [Validators.required]],
      // pin: ['', [Validators.required, Validators.pattern("^[0-9]{6}")]]
      pin: ['', [Validators.required, Validators.pattern('^\\d{4,6}|[\\w\\d]+( )|( - )[\\w\\d]+$')]]
    });
  }

  // getAllStates(){
  //   this.shopifyService.getAllStates().subscribe((res)=>{
  //     this.states=res;
  //   });
  // }
  onSubmit(form) {
    this.apolloMutation();

  }

  quantityCounter(boolean) {
    if (boolean) {
      this.quantity++;
    }

    if (!boolean && this.quantity != 1) {
      this.quantity--;
    }
  }


  async apolloMutation() {
    const form = this.checkOutForm.value;
    const mutate = gql`mutation checkoutCreate($input: CheckoutCreateInput!) {
      checkoutCreate(input: $input) {
       checkout {
        id
        webUrl
      }
      checkoutUserErrors {
      code
      field
      message
        }

       }
      }`;

    const variable = {
      'input': {
        'allowPartialAddresses': true,
        'lineItems': [
          {
            'quantity': this.quantity,
            'variantId': this.data?.variants[0]?.admin_graphql_api_id
            // "variantId": "gid://shopify/ProductVariant/43117231997172"
          }
        ],
        'email': form.email,
        'shippingAddress': {
          'address1': form.address1,
          'address2': form.address2 || '',
          'city': form.city,
          'country': 'india',
          'firstName': form.firstName,
          'lastName': form.lastName,
          'phone': (await this.userService.getPhone()).countryCode + (await this.userService.getPhone()).phoneNumber,
          // "province": form.state,
          'zip': form.pin
        }
      }
    };
    console.log(variable);

    this.apollo.mutate({
      mutation: mutate,
      variables: variable
    }).subscribe((res: any) => {
      const url = res.data.checkoutCreate.checkout.webUrl;
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.click();

      this.dialog.closeAll();
    });
  }
}
