export interface JobOffer {
  id: number;
  title: string;
  description: string;
  requirements?: string;
  location?: string;
  contractType?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
  aiScoreThreshold: number;
}
