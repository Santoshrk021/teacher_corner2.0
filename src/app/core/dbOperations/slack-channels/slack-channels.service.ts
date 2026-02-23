import { Injectable } from '@angular/core';
import { SlackChannelsFirestore } from './slack-channels.firestore';

@Injectable({
  providedIn: 'root'
})
export class SlackChannelsService {

  constructor(
    private slackFirestore: SlackChannelsFirestore
  ) { }

  getChannelByName(channelName: string) {
    return this.slackFirestore.getCollectionQuery('name', channelName);
  }

}
