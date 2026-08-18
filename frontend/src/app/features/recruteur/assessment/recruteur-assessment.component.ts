import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/http/api.service';
import { ToastService } from '../../../core/toast/toast.service';

interface AssessmentApp {
  id: number;
  currentStage: string;
  aiScore?: number;
  candidate?: { firstName: string; lastName: string };
  offer?: { title: string };
}

interface AssessmentResult {
  id: number;
  application: { id: number };
  score?: number;
  passingScore?: number;
  completedAt?: string;
}

/** Module 7 — E-Assessment (fidele au template : envoi de test + suivi des résultats). */
@Component({
  selector: 'app-recruteur-assessment',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-hd">
      <div><div class="page-title">E-Assessment</div><div class="page-sub">Gestion des tests en ligne — Module 7</div></div>
    </div>

    <div class="g2">
      <div class="card">
        <div class="card-hd"><span class="ico">📤</span>Envoyer un test</div>
        @if (shortlisted().length === 0) {
          <p style="font-size:12.5px;color:var(--gray-500)">Aucun candidat shortlisté en attente de test pour le moment.</p>
        }
        @for (a of shortlisted(); track a.id) {
          <div style="background:var(--gray-50);border-radius:var(--r-md);padding:14px 16px;margin-bottom:12px">
            <div style="display:flex;gap:11px;align-items:center;margin-bottom:12px">
              <div class="prof-av" style="background:var(--blue);width:38px;height:38px;font-size:14px">{{ initials(a) }}</div>
              <div style="flex:1">
                <div style="font-weight:700">{{ candidateName(a) }}</div>
                <div style="font-size:11.5px;color:var(--gray-500)">{{ a.offer?.title }} · Score IA : {{ a.aiScore ?? 0 }}%</div>
              </div>
            </div>
            <div class="fg">
              <label class="fl">Test à envoyer</label>
              <select class="fi fi-sel" [(ngModel)]="testType[a.id]" [ngModelOptions]="{standalone: true}">
                <option value="TECHNICAL_QCM">QCM Technique — Développement (5 questions)</option>
                <option value="PERSONALITY">Test comportemental — Soft skills (3 questions)</option>
              </select>
            </div>
            <button class="btn btn-p btn-sm" style="width:100%;justify-content:center" (click)="sendTest(a, testType[a.id] ?? 'TECHNICAL_QCM')" [disabled]="sendingId() === a.id">
              {{ sendingId() === a.id ? 'Envoi...' : 'Envoyer le test' }}
            </button>
          </div>
        }
      </div>

      <div class="card">
        <div class="card-hd"><span class="ico">📊</span>Tests en cours</div>
        @if (inAssessment().length === 0) {
          <p style="font-size:12.5px;color:var(--gray-500)">Aucun test en cours actuellement.</p>
        }
        @for (a of inAssessment(); track a.id) {
          <div [style]="assessmentBoxStyle(a)">
            <div>
              <div style="font-weight:700;font-size:12.5px">{{ candidateName(a) }}</div>
              <div style="font-size:11.5px" [style.color]="a.currentStage === 'ASSESSMENT_DONE' ? 'var(--green)' : 'var(--amber)'">
                {{ a.currentStage === 'ASSESSMENT_DONE' ? '✓ Complété' : '⏱ En cours' }} · {{ a.offer?.title }}
              </div>
            </div>
            @if (a.currentStage === 'ASSESSMENT_DONE') {
              @if (resultFor(a.id); as r) {
                <span class="tag" [class]="(r.score ?? 0) >= (r.passingScore ?? 50) ? 't-g' : 't-r'">
                  {{ r.score ?? 0 }}% {{ (r.score ?? 0) >= (r.passingScore ?? 50) ? '✓ Admis' : '✗ Insuffisant' }}
                </span>
              }
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class RecruteurAssessmentComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  applications = signal<AssessmentApp[]>([]);
  assessments = signal<AssessmentResult[]>([]);
  sendingId = signal<number | null>(null);
  testType: Record<number, string> = {};

  ngOnInit(): void {
    this.load();
    this.api.get<AssessmentResult[]>('/recruteur/assessments').subscribe(a => this.assessments.set(a));
  }

  resultFor(applicationId: number): AssessmentResult | undefined {
    return this.assessments().find(r => r.application?.id === applicationId);
  }

  load(): void {
    this.api.get<AssessmentApp[]>('/recruteur/applications').subscribe(a => this.applications.set(a));
  }

  shortlisted() { return this.applications().filter(a => a.currentStage === 'SHORTLISTED'); }
  inAssessment() { return this.applications().filter(a => ['ASSESSMENT_SENT', 'ASSESSMENT_DONE'].includes(a.currentStage)); }

  candidateName(a: AssessmentApp): string {
    return a.candidate ? `${a.candidate.firstName} ${a.candidate.lastName}` : `#${a.id}`;
  }

  initials(a: AssessmentApp): string {
    return a.candidate ? `${a.candidate.firstName[0] ?? ''}${a.candidate.lastName[0] ?? ''}`.toUpperCase() : '?';
  }

  assessmentBoxStyle(a: AssessmentApp): string {
    const done = a.currentStage === 'ASSESSMENT_DONE';
    return `border:1px solid ${done ? 'var(--green-b)' : 'var(--amber-b)'};background:${done ? 'var(--green-bg)' : 'var(--amber-bg)'};` +
      'border-radius:var(--r-md);padding:11px;display:flex;justify-content:space-between;align-items:center;margin-bottom:9px';
  }

  sendTest(a: AssessmentApp, type: string): void {
    this.sendingId.set(a.id);
    this.api.post(`/recruteur/applications/${a.id}/assessment`, { type }).subscribe({
      next: () => {
        this.sendingId.set(null);
        this.toast.success('Test envoyé', this.candidateName(a));
        this.load();
      },
      error: (err) => {
        this.sendingId.set(null);
        this.toast.error(err?.error?.error ?? 'Erreur');
      },
    });
  }
}
