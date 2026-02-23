export interface CaseStudyMedia {
  
  storagePath: string;
  filename: string;
   order: number;
  type: 'image' | 'pdf';
}

export interface CaseStudy {

  title?: string;
  description?: string;
  images?: CaseStudyMedia[];
}