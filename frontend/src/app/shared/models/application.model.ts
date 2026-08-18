export type ApplicationStage =
  | 'RECEIVED' | 'SCORED' | 'SHORTLISTED' | 'ASSESSMENT_SENT' | 'ASSESSMENT_DONE'
  | 'RH_INTERVIEW' | 'TECH_INTERVIEW' | 'FINAL_REVIEW' | 'HIRED' | 'REJECTED';

export interface CandidateApplication {
  id: number;
  currentStage: ApplicationStage;
  aiScore?: number;
  aiScoreExplanation?: string;
  finalDecision?: 'HIRED' | 'REJECTED';
  candidate?: { id: number; firstName: string; lastName: string; email: string };
  offer?: { id: number; title: string };
}
