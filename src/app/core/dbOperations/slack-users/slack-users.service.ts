import { Injectable } from '@angular/core';
import { SlackUsersFirestore } from './slack-users.firestore';

@Injectable({
  providedIn: 'root'
})
export class SlackUsersService {

  constructor(
    private slackUsersFirestore: SlackUsersFirestore,
  ) { }

  getSlackUserByKekaName(kekaName: string) {
    return this.slackUsersFirestore.getCollectionQuery('profile.display_name', kekaName);
  }

}
