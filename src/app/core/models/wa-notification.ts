export interface WANotification {
    // isUnlabLanding?: boolean;
    /*  phoneNumber: "+918003555725",
     tmeplateName: "institution_added_en",
     params: ["Manzoor", "Test Institute"], */
    phoneNumber: string;
    // tmeplateName: string,
    templateName: string;
    whatsAppSender: string;
    whatsAppNamespace: string;
    whatsAppToken: string;
    whatsAppUrl: string;
    params: string[];
    // whatsAppImageHeader?: string;
    whatsAppImageHeader: string | any | undefined;
    mediaType: string | undefined;
    urlRoute: string | undefined;
}
