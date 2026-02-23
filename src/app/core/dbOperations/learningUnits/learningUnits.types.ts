import firebase from 'firebase/compat/app';

export interface tactivity {
  docId: string;
  // code: string,
  // displayName: string,
  headlineImage: string;
  isoCode: string;
  status: string;
  tacArchitect: string;
  tacMentor: string;
  tacOwner: string;
  version: string;
  creationDate: Date;
  masterDocId?: string;
  learningUnitCode?: string;
  learningUnitName?: string;
}

export interface LearningUnit {
  // creationDate: Date;
  Maturity: string;
  additionalResources: Array<any>;
  alternateLongDescription: string;
  alternateShortDescription: string;
  associatedLearningUnits: Array<any>;
  compositeCode: string;
  creationDate?: firebase.firestore.Timestamp;
  difficultyLevel: number | string;
  docId: string;
  domain: string;
  domainCode: string;
  domainName: string;
  exploreTime: number | string;
  firstLiveDate: string;
  isoCode: string;
  learnTime: number | string;
  learningUnitCode: string;
  learningUnitDisplayName: string;
  learningUnitId: string;
  learningUnitImage: string;
  learningUnitName: string;
  learningUnitPreviewImage: string;
  longDescription: string;
  makingTime: number | string;
  masterDocId: string;
  numberOfTemplates: string;
  observationTime: number | string;
  prerequisiteLearningUnits: Array<any>;
  replacementLearningUnits: Array<any>;
  resources: {
    guidePath: string;
    materialPath: string;
    observationPath: string;
    otherImagePath: string;
    qrCodeImagePath: string;
    templatePath: string;
    topicGuidePath: string;
    topicVideoUrl: string;
    varGuidePath: string;
    varVideoUrl: string;
    videoUrl: string;
    diamond?: string;
    gold?: string;
    platinum?: string;
    silver?: string;
  };
  samples: string;
  shortDescription: string;
  similarLearningUnits: Array<any>;
  status: string;
  subDomainCode: string;
  subDomainName: string;
  subjectCode: string;
  subjectName: string;
  tacArchitectName: string;
  tacArchitectCountryCode: string;
  tacArchitectPhoneNumber: string;
  tacMentorName: string;
  tacMentorCountryCode: string;
  tacMentorPhoneNumber: string;
  tacOwnerName: string;
  tacOwnerCountryCode: string;
  tacOwnerPhoneNumber: string;
  tags: Array<any>;
  tools: string;
  topicCodes: string;
  totalTime: number | string;
  totalViews: number | string;
  type: string;
  typeCode: string;
  updatedAt?: firebase.firestore.Timestamp;
  userFeedback: string;
  version: string;
  versionNotes: string;
  containsResources: boolean;
}

export interface LearningUnitMaster extends Omit<LearningUnit,
  'additionalResources' |
  'alternateLongDescription' |
  'alternateShortDescription' |
  'associatedLearningUnits' |
  'domain' |
  'firstLiveDate' |
  'learningUnitImage' |
  'learnTime' |
  'longDescription' |
  'masterDocId' |
  'numberOfTemplates' |
  'prerequisiteLearningUnits' |
  'replacementLearningUnits' |
  'resources' |
  'samples' |
  'shortDescription' |
  'similarLearningUnits' |
  'tags' |
  'tools' |
  'topicCodes' |
  'totalViews' |
  'userFeedback' |
  'versionNotes' |
  'containsResources'
> {
  containsResources: boolean; // Add the containsResources field here

}



