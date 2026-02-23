import { environment } from "environments/environment.dev";

// import { environment } from 'environments/environment';
export type TemplateKey = keyof typeof environment.whatsAppTemplates;
export type ParamSchema = { key: string; label: string; required?: boolean; hint?: string }[];

const ParamSchemas: Record<string, ParamSchema> = {
  authenticationOtp: [
    { key: 'otp', label: 'OTP', required: true },
    { key: 'platformName', label: 'Platform Name', required: true },
    { key: 'timeout', label: 'Timeout (mins)', required: true },
  ],
  changeMobileNumberSuccess: [
    { key: 'name', label: 'Name', required: true },
    { key: 'platformName', label: 'Platform Name', required: true },
    { key: 'newMobileNumber', label: 'New Mobile Number', required: true },
    { key: 'url', label: 'URL', required: true },
  ],
  approvalRequest: [{ key: 'name', label: 'Name' }, { key: 'code', label: 'Code' }],
  firstTimeGreetingTeacherCorner: [{ key: 'name', label: 'Name' }],
  firstTimeGreetingUnlab: [{ key: 'name', label: 'Name' }],
  // add more when you confirm placeholders for each template
};

export interface TemplateOption {
  key: TemplateKey;
  templateName: string;
  headerImage?: string;
  params: ParamSchema;
}

export function buildTemplateOptions(): TemplateOption[] {
  const defs = environment.whatsAppTemplates as Record<string, { templateName: string; headerImage?: string }>;
  return (Object.keys(defs) as TemplateKey[]).map((k) => ({
    key: k,
    templateName: defs[k].templateName,
    headerImage: defs[k].headerImage,
    params: ParamSchemas[k as string] || [],   // only use params if schema exists
  }));
}

// Optional helper if you ever need params for a specific env key
export function getParamsFor(key: TemplateKey): ParamSchema {
  return ParamSchemas[key as string] || [];
}
