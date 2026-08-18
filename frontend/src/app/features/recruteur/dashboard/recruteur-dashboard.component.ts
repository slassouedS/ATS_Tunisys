import { Component, OnInit, inject, signal } from '@angular/core';
import { AuthStore } from '../../../core/auth/auth.store';
import { ApiService } from '../../../core/http/api.service';
import { ToastService } from '../../../core/toast/toast.service';
import { ScoreCircleComponent } from '../../../shared/components/score-circle/score-circle.component';

interface DashApplication {
  id: number;
  currentStage: string;
  aiScore?: number;
  aiScoreExplanation?: string;
  candidate?: { firstName: string; lastName: string };
  offer?: { title: string };
}

/** Module 6/8 — Mon bureau (dashboard recruteur), fidele au template maitre :
 *  hero, presélections IA a valider, KPIs personnels. */
@Component({
  selector: 'app-recruteur-dashboard',
  standalone: true,
  imports: [ScoreCircleComponent],
  template: `
    <div class="hero">
      <div class="hero-txt">
        <div class="hero-title">Bonjour {{ authStore.displayName() }} 👋</div>
        <div class="hero-sub">
          <strong>{{ toValidate().length }} candidature(s)</strong> présélectionnée(s) par l'IA en attente de votre validation.
        </div>
      </div>
      <div class="hero-kpis">
        <div class="hkpi"><div class="hkpi-n">{{ applications().length }}</div><div class="hkpi-l">À traiter</div></div>
        <div class="hkpi"><div class="hkpi-n">{{ toValidate().length }}</div><div class="hkpi-l">Présélectionnés</div></div>
        <div class="hkpi"><div class="hkpi-n">{{ hiredCount() }}</div><div class="hkpi-l">Recrutés</div></div>
      </div>
    </div>

    <div class="g75" style="margin-top:16px">
      <div class="gcol">
        <div class="card">
          <div class="card-hd"><span class="ico">🤖</span>Présélections IA — Action requise
            <div class="ai-b" style="margin-left:auto">IA ✦</div>
          </div>
          @if (toValidate().length === 0) {
            <p style="font-size:12.5px;color:var(--gray-500)">Aucune candidature en attente de validation.</p>
          }
          <table class="tbl">
            <thead><tr><th>Candidat</th><th>Poste</th><th>Score IA</th><th>Résumé IA</th><th>Actions</th></tr></thead>
            <tbody>
              @for (a of toValidate(); track a.id) {
                <tr>
                  <td><div style="font-weight:700">{{ candidateName(a) }}</div></td>
                  <td><span class="tag t-b">{{ a.offer?.title }}</span></td>
                  <td><app-score-circle [score]="a.aiScore ?? 0"></app-score-circle></td>
                  <td style="font-size:11.5px;max-width:200px;color:var(--gray-700)">{{ a.aiScoreExplanation }}</td>
                  <td>
                    <div style="display:flex;gap:5px">
                      <button class="btn btn-grn btn-xs" (click)="shortlist(a)">✓ Valider</button>
                      <button class="btn btn-dng btn-xs" (click)="reject(a)">✗</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="gcol">
        <div class="card card-sm">
          <div class="card-hd"><span class="ico">📊</span>Mes KPIs</div>
          <div class="kpi-row" style="grid-template-columns:1fr 1fr">
            <div class="kpi-c"><div class="kpi-lbl">Candidatures</div><div class="kpi-v" style="color:var(--green)">{{ applications().length }}</div></div>
            <div class="kpi-c"><div class="kpi-lbl">Présélectionnés</div><div class="kpi-v">{{ toValidate().length }}</div></div>
            <div class="kpi-c"><div class="kpi-lbl">Recrutés</div><div class="kpi-v" style="color:var(--green)">{{ hiredCount() }}</div></div>
            <div class="kpi-c"><div class="kpi-lbl">Rejetés</div><div class="kpi-v">{{ rejectedCount() }}</div></div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class RecruteurDashboardComponent implements OnInit {
  authStore = inject(AuthStore);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  applications = signal<DashApplication[]>([]);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.get<DashApplication[]>('/recruteur/applications').subscribe(a => this.applications.set(a));
  }

  toValidate() { return this.applications().filter(a => a.currentStage === 'SCORED'); }
  hiredCount() { return this.applications().filter(a => a.currentStage === 'HIRED').length; }
  rejectedCount() { return this.applications().filter(a => a.currentStage === 'REJECTED').length; }

  candidateName(a: DashApplication): string {
    return a.candidate ? `${a.candidate.firstName} ${a.candidate.lastName}` : `#${a.id}`;
  }

  shortlist(a: DashApplication): void {
    this.api.put(`/recruteur/applications/${a.id}/stage`, { newStage: 'SHORTLISTED' }).subscribe({
      next: () => { this.toast.success('Candidat shortlisté', this.candidateName(a)); this.load(); },
      error: (err) => this.toast.error(err?.error?.error ?? 'Erreur'),
    });
  }

  reject(a: DashApplication): void {
    this.api.put(`/recruteur/applications/${a.id}/stage`, { newStage: 'REJECTED' }).subscribe({
      next: () => { this.toast.info('Candidature rejetée', this.candidateName(a)); this.load(); },
      error: (err) => this.toast.error(err?.error?.error ?? 'Erreur'),
    });
  }
}
