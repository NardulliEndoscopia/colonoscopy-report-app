export type Language = 'es' | 'en' | 'fr' | 'it' | 'pt' | 'de' | 'nl' | 'pl' | 'ro' | 'ar' | 'ru' | 'zh';

export type ColonSegment =
  | 'terminal_ileum' | 'cecum' | 'ascending_colon' | 'hepatic_flexure'
  | 'transverse_colon' | 'splenic_flexure' | 'descending_colon'
  | 'sigmoid_colon' | 'rectum' | 'anal_canal' | 'multiple' | 'unspecified';

export interface FindingExplanation {
  what_is: string;
  implications: string;
  follow_up: string;
}

export interface Finding {
  id: string;
  medical_name: string;
  medical_name_translated?: string;
  location: ColonSegment;
  explanation: FindingExplanation;
  overall_finding_type?: string;
}

export interface DoctorDiagnosisConfig {
  custom_explanation_es?: FindingExplanation;
  photo_urls?: (string | null)[];  // hasta 4 fotos por diagnóstico
  video_url?: string;              // clip de video local/blob
  youtube_url?: string;            // URL YouTube para videos largos
  label?: string;
}

export type DoctorConfig = Record<string, DoctorDiagnosisConfig>;

export interface AnalysisResult {
  findings: Finding[];
  overall_summary: string;
  report_date?: string | null;
}
