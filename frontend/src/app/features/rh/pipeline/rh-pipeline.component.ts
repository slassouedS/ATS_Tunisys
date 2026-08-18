import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';
import {
  CandidateProfileModalComponent, CandidateProfileData,
} from '../../../shared/components/candidate-profile-modal/candidate-profile-modal.component';

interface PipelineApplication {
  id: number;
  currentStage: string;
  aiScore?: number;
  aiScoreExplanation?: string;
  candidate?: { firstName: string; lastName: string };
  offer?: { title: string };
}

interface KbColumn {
  stage: string;
  label: string;
  dotColor: string;
  items: PipelineApplication[];
}

/** Module 6/8/10 — Pipeline global RH (vue Kanban en lecture seule sur toutes
 *  les offres, fidele au template maitre : kb-col/kb-card). */
@Component({
  selector: 'app-rh-pipeline',
  standalone: true,
  imports: [CandidateProfileModalComponent],
  template: `
    <div class="page-hd">
      <div><div class="page-title">Pipeline global</div><div class="page-sub">Tous les recrutements en cours</div></div>
    </div>

    <div class="kb"><div class="kb-inner">
      @for (col of columns(); track col.stage) {
        <div class="kb-col">
          <div class="kb-col-hd">
            <div class="pipe-dot" [style.background]="col.dotColor"></div>
            <div class="kb-col-title">{{ col.label }}</div>
            <div class="kb-col-n">{{ col.items.length }}</div>
          </div>
          <div class="kb-col-body">
            @for (a of col.items; track a.id) {
              <div class="kb-card" (click)="openProfile(a)">
                <div class="kb-card-name">{{ candidateName(a) }}</div>
                <div class="kb-card-role">{{ a.offer?.title }}</div>
                <div class="kb-card-bottom">
                  <span class="cscore" [class]="scoreClass(a.aiScore)">{{ a.aiScore ?? 0 }}%</span>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div></div>

    <app-candidate-profile-modal
      [open]="profileOpen()"
      [data]="profileData()"
      [showActions]="false"
      (close)="profileOpen.set(false)">
    </app-candidate-profile-modal>
  `,
})
export class RhPipelineComponent implements OnInit {
  private readonly api = inject(ApiService);

  private applications = signal<PipelineApplication[]>([]);
  profileOpen = signal(false);
  profileData = signal<CandidateProfileData | null>(null);

  private readonly columnDefs = [
    { stage: 'RECEIVED', label: 'Reçues', dotColor: '#888' },
    { stage: 'SCORED', label: 'Scorées IA', dotColor: 'var(--blue)' },
    { stage: 'SHORTLISTED', label: 'Shortlist', dotColor: 'var(--amber)' },
    { stage: 'ASSESSMENT_SENT', label: 'Test envoyé', dotColor: 'var(--amber)' },
    { stage: 'ASSESSMENT_DONE', label: 'Assessment', dotColor: 'var(--amber)' },
    { stage: 'RH_INTERVIEW', label: 'Entretien RH', dotColor: 'var(--red)' },
    { stage: 'TECH_INTERVIEW', label: 'Entretien Tech', dotColor: 'var(--red)' },
    { stage: 'FINAL_REVIEW', label: 'Décision', dotColor: 'var(--green)' },
    { stage: 'HIRED', label: 'Recrutés', dotColor: '#333' },
  ];

  columns = computed<KbColumn[]>(() => {
    const apps = this.applications();
    return this.columnDefs.map(def => ({ ...def, items: apps.filter(a => a.currentStage === def.stage) }));
  });

  ngOnInit(): void {
    this.api.get<PipelineApplication[]>('/rh/pipeline').subscribe(a => this.applications.set(a));
  }

  candidateName(a: PipelineApplication): string {
    return a.candidate ? `${a.candidate.firstName} ${a.candidate.lastName}` : `#${a.id}`;
  }

  scoreClass(score?: number): string {
    const s = score ?? 0;
    if (s >= 85) return 'cs-h';
    if (s >= 70) return 'cs-m';
    return 'cs-l';
  }

  openProfile(a: PipelineApplication): void {
    const initials = a.candidate
      ? `${a.candidate.firstName[0] ?? ''}${a.candidate.lastName[0] ?? ''}`.toUpperCase()
      : '?';
    this.profileData.set({
      fullName: this.candidateName(a),
      initials,
      score: a.aiScore ?? 0,
      role: a.offer?.title ?? '',
      aiSummary: a.aiScoreExplanation,
      skills: [],
      experiences: [],
    });
    this.profileOpen.set(true);
  }
}
