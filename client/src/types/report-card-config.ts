export interface ReportCardConfig {
  id: string;
  schoolId: string;
  template: 'classic' | 'modern' | 'detailed' | 'primary';
  accentColor: string;
  motto?: string;
  principalName?: string;
  principalSignature?: string;
  schoolStamp?: string;
  showRanking: boolean;
  showCumulative: boolean;
  showAffective: boolean;
  showPsychomotor: boolean;
  showTeacherRemark: boolean;
  showPrincipalRemark: boolean;
  showResumptionDate: boolean;
  showStamp: boolean;
  showPoweredBy: boolean;
  affectiveTraits?: string[];
  psychomotorTraits?: string[];
  footerText?: string;
  nextTermDate?: string;
}

export interface UpdateReportCardConfigDto {
  template?: string;
  accentColor?: string;
  motto?: string;
  principalName?: string;
  showRanking?: boolean;
  showCumulative?: boolean;
  showAffective?: boolean;
  showPsychomotor?: boolean;
  showTeacherRemark?: boolean;
  showPrincipalRemark?: boolean;
  showResumptionDate?: boolean;
  showStamp?: boolean;
  showPoweredBy?: boolean;
  affectiveTraits?: string[];
  psychomotorTraits?: string[];
  footerText?: string;
  nextTermDate?: string;
}