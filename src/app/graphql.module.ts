import {NgModule} from '@angular/core';
import {ApolloModule, APOLLO_OPTIONS} from 'apollo-angular';
import {ApolloClientOptions, from, InMemoryCache} from '@apollo/client/core';
import {HttpLink} from 'apollo-angular/http';
import { setContext } from '@apollo/client/link/context';
import { HttpHeaders } from '@angular/common/http';

const uri = 'https://tactileducation.myshopify.com/api/2023-01/graphql.json'; // <-- add the URL of the GraphQL server here
export function createApollo(httpLink: HttpLink): ApolloClientOptions<any> {
  const authAPIKey = setContext(() => ({ headers: new HttpHeaders().set('X-Shopify-Storefront-Access-Token', 'd57db6ce653947798fd03b39d443fb57') }));
  const URI = httpLink.create({ uri });

  return {
    // link: httpLink.create({uri}),
    link: from([authAPIKey, URI]),
    cache: new InMemoryCache(),
  };
}

@NgModule({
  exports: [ApolloModule],
  providers: [
    {
      provide: APOLLO_OPTIONS,
      useFactory: createApollo,
      deps: [HttpLink],
    },
  ],
})
export class GraphQLModule {}
