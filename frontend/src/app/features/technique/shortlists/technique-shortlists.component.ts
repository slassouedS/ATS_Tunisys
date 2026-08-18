import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/http/api.service';
import { ToastService } from '../../../core/toast/toast.service';

interface TechApplication {
  id: number;
  currentStage: string;
  aiScore?: number;
  aiScoreExplanation?: string;
  candidate?: { firstName: string; lastName: string };
  offer?: { title: string };
}

/** Module 6 — Shortlists completes en attente de validation technique. */
@Component({
  selector: 'app-technique-shortlists',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-hd">
      <div>
        <div class="page-title">Shortlists — Validation technique</div>
        <div class="page-sub">{{ toValidate().length }} profil(s) présélectionné(s) par l'IA en attente de votre avis</div>
      </div>
      <div class="page-actions"><div class="ai-b">✦ Scorés par IA</div></div>
    </div>

    <div style="display:flex;flex-direction:column;gap:12px">
      @if (toValidate().length === 0) {
        <div class="card"><p style="font-size:12.5px;color:var(--gray-500)">Aucun profil en attente pour le moment.</p></div>
      }
      @for (a of toValidate(); track a.id) {
        <div class="card">
          <div style="display:flex;gap:14px;align-items:flex-start">
            <div class="av" style="background:var(--blue);width:48px;height:48px;font-size:17px">{{ initials(a) }}</div>
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:6px">
                <div style="font-size:14.5px;font-weight:700">{{ candidateName(a) }}</div>
                <span class="cscore cs-h">⚡ {{ a.aiScore ?? 0 }}%</span>
              </div>
              <div style="font-size:12px;color:var(--gray-500);margin-bottom:10px">{{ a.offer?.title }}</div>

              @if (a.aiScoreExplanation) {
                <div style="background:var(--blue-bg);border-radius:var(--r-md);padding:11px 13px;margin-bottom:10px;font-size:12.5px;line-height:1.65">
                  <strong style="color:var(--blue)">✦ Synthèse IA :</strong> {{ a.aiScoreExplanation }}
                </div>
              }

              <div class="fg" style="margin-bottom:10px">
                <label class="fl">Commentaire technique</label>
                <textarea class="fi fi-ta" [(ngModel)]="comments[a.id]" placeholder="Votre avis détaillé sur ce profil..."></textarea>
              </div>

              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn btn-grn" (click)="decide(a, 'FINAL_REVIEW')">✓ GO — Valider profil</button>
                <button class="btn btn-dng" (click)="decide(a, 'REJECTED')">✗ NO GO</button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class TechniqueShortlistsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  applications = signal<TechApplication[]>([]);
  comments: Record<number, string> = {};

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.get<TechApplication[]>('/technique/shortlists').subscribe(a => this.applications.set(a));
  }

  toValidate() { return this.applications().filter(a => a.currentStage === 'TECH_INTERVIEW'); }

  candidateName(a: TechApplication): string {
    return a.candidate ? `${a.candidate.firstName} ${a.candidate.lastName}` : `#${a.id}`;
  }
  initials(a: TechApplication): string {
    return a.candidate ? `${a.candidate.firstName[0] ?? ''}${a.candidate.lastName[0] ?? ''}`.toUpperCase() : '?';
  }

  decide(a: TechApplication, stage: string): void {
    this.api.put(`/technique/applications/${a.id}/stage`, {
      newStage: stage,
      comment: this.comments[a.id] ?? '',
    }).subscribe({
      next: () => {
        this.toast.success(stage === 'REJECTED' ? 'Avis NO GO enregistré' : 'Avis GO enregistré', this.candidateName(a));
        this.load();
      },
      error: (err) => this.toast.error(err?.error?.error ?? 'Erreur'),
    });
  }
}
