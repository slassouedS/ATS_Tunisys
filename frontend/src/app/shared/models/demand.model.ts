export interface RecruitmentDemand {
  id: number;
  title: string;
  status: 'PENDING' | 'VALIDATED' | 'REJECTED';
  urgency: 'NORMAL' | 'URGENT';
  profileDesc?: string;
  budget?: number;
  createdAt: string;
}
