import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';
import { ToastService } from '../../../core/toast/toast.service';
import { ScoreCircleComponent } from '../../../shared/components/score-circle/score-circle.component';

interface AppRow {
  id: number;
  currentStage: string;
  aiScore?: number;
  finalDecision?: string;
  candidate?: { firstName: string; lastName: string; email: string };
  offer?: { title: string };
}

/** Module 6/8 — Liste des candidatures (fidele au template : avatar coloré,
 *  cercle de score, statut, actions contextuelles). */
@Component({
  selector: 'app-recruteur-applications',
  standalone: true,
  imports: [ScoreCircleComponent],
  template: `
    <div class="page-hd">
      <div><div class="page-title">Candidatures</div><div class="page-sub">{{ applications().length }} candidature(s) · Gestion et suivi</div></div>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <table class="tbl">
        <thead><tr><th>Candidat</th><th>Poste</th><th>Score IA</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          @for (a of applications(); track a.id) {
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <div class="av" [style.background]="avatarColor(a.id)" style="width:28px;height:28px;font-size:9px">{{ initials(a) }}</div>
                  <div>
                    <div style="font-weight:700">{{ candidateName(a) }}</div>
                    <div style="font-size:10.5px;color:var(--gray-500)">{{ a.candidate?.email }}</div>
                  </div>
                </div>
              </td>
              <td><span class="tag t-b">{{ a.offer?.title }}</span></td>
              <td><app-score-circle [score]="a.aiScore ?? 0"></app-score-circle></td>
              <td><span class="tag" [class]="stageTagClass(a.currentStage)">● {{ stageLabel(a.currentStage) }}</span></td>
              <td>
                @if (a.currentStage === 'SHORTLISTED') {
                  <button class="btn btn-p btn-xs" (click)="sendAssessment(a)" [disabled]="sendingId() === a.id">
                    {{ sendingId() === a.id ? '...' : 'Envoyer test' }}
                  </button>
                }
                @if (a.currentStage === 'SCORED') {
                  <button class="btn btn-grn btn-xs" (click)="shortlist(a)">Valider</button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
      @if (applications().length === 0) {
        <p style="font-size:12.5px;color:var(--gray-500);padding:16px">Aucune candidature pour le moment.</p>
      }
    </div>
  `,
})
export class RecruteurApplicationsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  applications = signal<AppRow[]>([]);
  sendingId = signal<number | null>(null);

  private readonly avatarColors = ['var(--red)', 'var(--blue)', 'var(--green)', 'var(--purple)', 'var(--amber)'];

  ngOnInit(): void {
    this.api.get<AppRow[]>('/recruteur/applications').subscribe(a => this.applications.set(a));
  }

  candidateName(a: AppRow): string {
    return a.candidate ? `${a.candidate.firstName} ${a.candidate.lastName}` : `#${a.id}`;
  }

  initials(a: AppRow): string {
    return a.candidate ? `${a.candidate.firstName[0] ?? ''}${a.candidate.lastName[0] ?? ''}`.toUpperCase() : '?';
  }

  avatarColor(id: number): string {
    return this.avatarColors[id % this.avatarColors.length];
  }

  stageLabel(stage: string): string {
    const map: Record<string, string> = {
      RECEIVED: 'Reçue', SCORED: 'IA Scoring', SHORTLISTED: 'Shortlist',
      ASSESSMENT_SENT: 'Test envoyé', ASSESSMENT_DONE: 'Test complété',
      RH_INTERVIEW: 'Entretien RH', TECH_INTERVIEW: 'Entretien Tech',
      FINAL_REVIEW: 'Décision', HIRED: 'Embauché', REJECTED: 'Rejeté',
    };
    return map[stage] ?? stage;
  }

  stageTagClass(stage: string): string {
    if (stage === 'HIRED') return 't-g';
    if (stage === 'REJECTED') return 't-r';
    if (['SHORTLISTED', 'ASSESSMENT_SENT', 'ASSESSMENT_DONE'].includes(stage)) return 't-a';
    if (['RH_INTERVIEW', 'TECH_INTERVIEW', 'FINAL_REVIEW'].includes(stage)) return 't-r';
    return 't-b';
  }

  shortlist(a: AppRow): void {
    this.api.put(`/recruteur/applications/${a.id}/stage`, { newStage: 'SHORTLISTED' }).subscribe({
      next: () => { this.toast.success('Candidat shortlisté'); this.ngOnInit(); },
      error: (err) => this.toast.error(err?.error?.error ?? 'Erreur'),
    });
  }

  sendAssessment(a: AppRow): void {
    this.sendingId.set(a.id);
    this.api.post(`/recruteur/applications/${a.id}/assessment`, { type: 'TECHNICAL_QCM' }).subscribe({
      next: () => {
        this.sendingId.set(null);
        this.toast.success('Test envoyé au candidat');
        this.ngOnInit();
      },
      error: (err) => {
        this.sendingId.set(null);
        this.toast.error(err?.error?.error ?? 'Erreur');
      },
    });
  }
}
