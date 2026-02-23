// ============================================================
// ENVIRONMENT CONFIGURATION TEMPLATE
// ============================================================
// Copy this file and rename it to create your environment files:
//   - environment.ts (default/dev switch)
//   - environment.dev.ts (development/sandbox)
//   - environment.prod.ts (production)
//   - environment.jigyaasa.ts (jigyaasa variant)
//
// Replace all placeholder values with your actual credentials.
// NEVER commit real credentials to version control.
// ============================================================

export const environment = {
    production: false,

    // Firebase Configuration
    firebase: {
        apiKey: 'YOUR_FIREBASE_API_KEY',
        authDomain: 'your-project.firebaseapp.com',
        projectId: 'your-project-id',
        storageBucket: 'your-project.appspot.com',
        messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
        appId: 'YOUR_APP_ID',
        measurementId: 'YOUR_MEASUREMENT_ID',
    },

    // Google Maps
    gmapApiKey: 'YOUR_GOOGLE_MAPS_API_KEY',

    // Default IDs (Firestore document IDs)
    defaultInstitutionId: 'YOUR_DEFAULT_INSTITUTION_ID',
    defaultAnnualsProgrammeIds: [],
    defaultProgrammeIds: {},
    defaultProgrammeNames: ['Science Demo Grade', 'Math Demo Grade'],

    // Branding / Logos
    whiteBackgroundLogos: [
        {
            alt: 'Logo',
            class: 'mx-auto',
            src: 'assets/images/logo/your-logo.svg',
        }
    ],
    blueBackgroundLogos: [
        {
            alt: 'Logo',
            class: 'w-30 mx-auto',
            src: 'assets/images/logo/your-logo-white.svg',
        }
    ],

    // WhatsApp (Freshchat) Integration
    whatsAppToken: 'YOUR_FRESHCHAT_JWT_TOKEN',
    whatsAppNamespace: 'YOUR_WHATSAPP_NAMESPACE',
    whatsAppSender: 'YOUR_WHATSAPP_SENDER_NUMBER',
    whatsAppUrl: 'https://api.in.freshchat.com/v2/outbound-messages/whatsapp',
    whatsAppApiKey: '',
    whatsAppApiSecret: '',
    whatsAppTemplates: {
        approvalAdminNotification: { templateName: 'your_template_name', headerImage: '' },
        approvalConfirmation: { templateName: 'your_template_name', headerImage: '' },
        approvalRejection: { templateName: 'your_template_name', headerImage: '' },
        approvalRequest: { templateName: 'your_template_name', headerImage: '' },
        authenticationOtp: { templateName: 'your_template_name', headerImage: undefined },
        classroomCreation: { templateName: 'your_template_name', headerImage: undefined },
        eventSubmissionConfirmation: { templateName: 'your_template_name', headerImage: '' },
        firstTimeGreetingTeacherCorner: { templateName: 'your_template_name', headerImage: '' },
        firstTimeGreetingUnlab: { templateName: 'your_template_name', headerImage: '' },
        institutionCreation: { templateName: 'your_template_name', headerImage: undefined },
        nominationAlertStudent: { templateName: 'your_template_name', headerImage: undefined },
        nominationAlertTeacher: { templateName: 'your_template_name', headerImage: undefined },
        studentClassroomAddition: { templateName: 'your_template_name', headerImage: undefined },
        studentStemClubAddition: { templateName: 'your_template_name', headerImage: '' },
        teacherClassroomAddition: { templateName: 'your_template_name', headerImage: undefined },
        teacherStemClubAddition: { templateName: 'your_template_name', headerImage: '' },
        studentCredentialPdf: { templateName: 'your_template_name' },
        contestEachSubmissionConfirmation: { templateName: 'your_template_name', headerImage: '' },
        contestFinalSubmissionConfirmation: { templateName: 'your_template_name', headerImage: '' },
        contestRegistrationConfirmationForStudent: { templateName: 'your_template_name', headerImage: '' },
    },

    // Slack Notifications
    slackNotifications: {
        luResourceManagement: { slackChannels: ['your-channel'], slackBearerToken: 'xoxb-YOUR_SLACK_TOKEN' },
        workflowSet: { slackChannels: ['your-channel'], slackBearerToken: 'xoxb-YOUR_SLACK_TOKEN' },
        newInstitution: { slackChannels: ['your-channel'], slackBearerToken: 'xoxb-YOUR_SLACK_TOKEN' },
        outreachQRCode: { slackChannels: ['your-channel'], slackBearerToken: 'xoxb-YOUR_SLACK_TOKEN' },
    },

    // Exotel SMS Configuration
    exotelAuthKey: 'YOUR_EXOTEL_AUTH_KEY',
    exotelAuthToken: 'YOUR_EXOTEL_AUTH_TOKEN',
    exotelAccountSid: 'YOUR_EXOTEL_ACCOUNT_SID',
    exotelEntityId: 'YOUR_EXOTEL_ENTITY_ID',
    exotelSender: 'YOUR_SENDER_ID',

    // Platform Configuration
    platformName: 'Teacher Corner',
    platformUrl: 'https://your-platform-url.com',
    projectName: 'YourProject',
    emailSender: 'info@your-domain.com',

    // OTP Templates
    createOtpBody: '{{otp}} is your OTP to log in to the {{platformName}} platform. Your OTP is valid for {{timeout}} minutes.',
    createOtpTemplateId: 'YOUR_OTP_TEMPLATE_ID',
    createOtpTimeout: 5,
    changeMobileNumberOtpBody: '{{otp}} is your OTP to change your number to {{newMobileNumber}} on the {{platformName}} platform. Your OTP is valid for {{timeout}} minutes.',
    changeMobileNumberOtpTemplateId: 'YOUR_TEMPLATE_ID',
    changeMobileNumberTimeout: 5,
    changeMobileNumberSuccessBody: 'Dear {{name}}, Your mobile number on the {{platformName}} platform has been updated to {{newMobileNumber}}. Please login using the new number at {{url}}.',
    changeMobileNumberSuccessTemplateId: 'YOUR_TEMPLATE_ID',

    // MailJet Email
    mailJetApiKey: 'YOUR_MAILJET_API_KEY',
    mailJetSecret: 'YOUR_MAILJET_SECRET',

    // Consent & Landing Page
    consentText: 'By proceeding, I agree to receive notifications and communications.',
    landingPageTagline1: 'Your platform tagline here.',
    landingPageTagline2: 'Your secondary tagline here.',
    landingPageSubheading: 'Welcome to Teacher Corner',

    // Misc
    optionsToHide: [],
    pdfPlatformUrl: 'your-platform.com',
    pdfPlatformImages: ['assets/images/logo/your-logo.svg'],
    validationException: [],
    splashScreenLogos: {
        titlebarLogo: 'assets/icons/your-logo.png',
        splashLogo: '<div><img src="assets/images/logo/your-logo-white.svg" alt="Logo" /></div>',
    },
    mentorEdPlatformUrl: 'https://mentored.your-domain.com',
    routesWithoutBreadcrumbs: [
        'assignments', 'classrooms', 'components', 'contests',
        'events-admin', 'institutions-list', 'learning-units', 'manage',
        'nomination-dashboard', 'partner-list', 'programme-templates',
        'programmes', 'quiz-submissions', 'quizzer', 'remote-pannel',
        'stem-clubs', 'student-manager', 'upload-submissions', 'vendor-list',
        'visit-list', 'workflow-templates', 'master-manager', 'whatsapp-manager',
        'kit-manager'
    ],
};
