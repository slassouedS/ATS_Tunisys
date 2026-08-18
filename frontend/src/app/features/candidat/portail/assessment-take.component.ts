import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/http/api.service';

interface AssessmentQuestion {
  id: string;
  text: string;
  options: string[];
}

interface AssessmentPublicView {
  assessmentId: number;
  type: string;
  alreadyCompleted: boolean;
  questions: AssessmentQuestion[];
}

/** Module 7 — E-Assessment : le candidat passe son test via un lien à token unique. */
@Component({
  selector: 'app-assessment-take',
  standalone: true,
  imports: [],
  template: `
    <div class="assessment-page">
      @if (loading()) {
        <p>Chargement du test...</p>
      } @else if (errorMsg()) {
        <div class="card"><p style="color:var(--red)">{{ errorMsg() }}</p></div>
      } @else if (view()?.alreadyCompleted) {
        <div class="card">
          <div class="card-hd">Test déjà complété</div>
          <p style="font-size:12.5px">Vous avez déjà répondu à ce test. Merci !</p>
        </div>
      } @else if (submitted()) {
        <div class="card">
          <div class="card-hd">Merci !</div>
          <p style="font-size:12.5px">Vos réponses ont bien été envoyées. Notre équipe RH reviendra vers vous prochainement.</p>
        </div>
      } @else {
        @if (view(); as v) {
          <div class="card">
            <div class="card-hd">{{ v.type === 'PERSONALITY' ? 'Test de personnalité' : 'Test technique' }}</div>
            <p style="font-size:12px;color:var(--gray-500);margin-bottom:16px">
              Répondez à toutes les questions puis validez en bas de page.
            </p>
            @for (q of v.questions; track q.id) {
              <div class="question-block">
                <div class="question-text">{{ q.text }}</div>
                @for (opt of q.options; track $index) {
                  <label class="option-row">
                    <input type="radio" [name]="q.id" [value]="$index"
                           (change)="setAnswer(q.id, $index)">
                    {{ opt }}
                  </label>
                }
              </div>
            }
            @if (submitError()) { <div class="error-box">{{ submitError() }}</div> }
            <button class="btn btn-p" (click)="submit()" [disabled]="submitting()">
              {{ submitting() ? 'Envoi...' : 'Valider mes réponses' }}
            </button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .assessment-page { max-width: 640px; margin: 26px auto; padding: 0 16px; }
    .question-block { margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid var(--border); }
    .question-text { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
    .option-row { display: flex; align-items: center; gap: 8px; font-size: 12.5px;
      padding: 6px 0; cursor: pointer; }
    .error-box { background: var(--red-bg); color: var(--red); font-size: 12px;
      padding: 8px 10px; border-radius: var(--r-sm); margin-bottom: 10px; }
  `],
})
export class AssessmentTakeComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);

  view = signal<AssessmentPublicView | null>(null);
  loading = signal(true);
  errorMsg = signal<string | null>(null);
  submitting = signal(false);
  submitError = signal<string | null>(null);
  submitted = signal(false);

  private token = '';
  private answers: Record<string, number> = {};

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    this.api.get<AssessmentPublicView>(`/public/assessments/${this.token}`).subscribe({
      next: (v) => { this.view.set(v); this.loading.set(false); },
      error: (err) => {
        this.errorMsg.set(err?.error?.error ?? 'Lien invalide ou expiré.');
        this.loading.set(false);
      },
    });
  }

  setAnswer(questionId: string, optionIndex: number): void {
    this.answers[questionId] = optionIndex;
  }

  submit(): void {
    const v = this.view();
    if (!v) return;
    if (Object.keys(this.answers).length < v.questions.length) {
      this.submitError.set('Merci de répondre à toutes les questions avant de valider.');
      return;
    }
    this.submitting.set(true);
    this.submitError.set(null);
    this.api.post(`/public/assessments/${this.token}/submit`, { answers: this.answers }).subscribe({
      next: () => { this.submitting.set(false); this.submitted.set(true); },
      error: (err) => {
        this.submitting.set(false);
        this.submitError.set(err?.error?.error ?? "Erreur lors de l'envoi.");
      },
    });
  }
}
