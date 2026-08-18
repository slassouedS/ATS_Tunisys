import { Component, OnInit, inject, signal } from '@angular/core';
import { AuthStore } from '../../../core/auth/auth.store';
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

/** Module 6/8 — Tableau de bord Responsable Technique (fidele au template :
 *  hero bleu, stats, profils urgents a valider). */
@Component({
  selector: 'app-technique-dashboard',
  standalone: true,
  imports: [],
  template: `
    <div class="hero" style="background:var(--blue)">
      <div class="hero-txt">
        <div class="hero-title">Bonjour {{ authStore.displayName() }} 👨‍💻</div>
        <div class="hero-sub">
          <strong>{{ toValidate().length }} profil(s)</strong> en attente de votre validation technique
          @if (inInterview().length > 0) {
            · <strong>{{ inInterview().length }}</strong> entretien(s) technique(s) planifié(s)
          }
        </div>
      </div>
      <div class="hero-kpis">
        <div class="hkpi"><div class="hkpi-n">{{ toValidate().length }}</div><div class="hkpi-l">À valider</div></div>
        <div class="hkpi"><div class="hkpi-n">{{ inInterview().length }}</div><div class="hkpi-l">Entretiens</div></div>
        <div class="hkpi"><div class="hkpi-n">{{ goRate() }}%</div><div class="hkpi-l">Taux GO</div></div>
      </div>
    </div>

    <div class="g4" style="margin-top:16px">
      <div class="stat-c">
        <div class="stat-ico">⏳</div><div class="stat-lbl">Shortlists à valider</div>
        <div class="stat-num" style="color:var(--amber)">{{ toValidate().length }}</div>
      </div>
      <div class="stat-c">
        <div class="stat-ico">📅</div><div class="stat-lbl">Entretiens planifiés</div>
        <div class="stat-num" style="color:var(--blue)">{{ inInterview().length }}</div>
      </div>
      <div class="stat-c red">
        <div class="stat-ico">✅</div><div class="stat-lbl">Avis soumis</div>
        <div class="stat-num">{{ decided().length }}</div>
      </div>
      <div class="stat-c">
        <div class="stat-ico">🎯</div><div class="stat-lbl">Taux GO technique</div>
        <div class="stat-num" style="color:var(--green)">{{ goRate() }}%</div>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="card-hd"><span class="ico">⚡</span>Profils urgents — validation technique requise
        <div class="ai-b" style="margin-left:auto">IA ✦ Pré-analysé</div>
      </div>
      @if (toValidate().length === 0) {
        <p style="font-size:12.5px;color:var(--gray-500)">Aucun profil en attente de validation pour le moment.</p>
      }
      <div style="display:flex;flex-direction:column;gap:9px">
        @for (a of toValidate(); track a.id) {
          <div style="border:1px solid var(--border);border-radius:var(--r-lg);padding:14px 16px;background:var(--white)">
            <div style="display:flex;gap:12px;align-items:flex-start">
              <div class="av" style="background:var(--blue);width:38px;height:38px;font-size:13px">{{ initials(a) }}</div>
              <div style="flex:1">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px">
                  <div style="font-size:13px;font-weight:700">{{ candidateName(a) }}</div>
                  <span class="cscore cs-h" style="margin-left:auto">⚡ {{ a.aiScore ?? 0 }}%</span>
                </div>
                <div style="font-size:11.5px;color:var(--gray-500);margin-bottom:8px">{{ a.offer?.title }}</div>
                @if (a.aiScoreExplanation) {
                  <div style="background:var(--gray-50);border-radius:var(--r-sm);padding:8px 10px;font-size:12px;margin-bottom:8px;line-height:1.6">
                    {{ a.aiScoreExplanation }}
                  </div>
                }
                <div style="display:flex;gap:7px">
                  <button class="btn btn-grn btn-sm" (click)="decide(a, 'FINAL_REVIEW')">✓ GO Technique</button>
                  <button class="btn btn-dng btn-sm" (click)="decide(a, 'REJECTED')">✗ NO GO</button>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class TechniqueDashboardComponent implements OnInit {
  authStore = inject(AuthStore);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  applications = signal<TechApplication[]>([]);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.get<TechApplication[]>('/technique/shortlists').subscribe(a => this.applications.set(a));
  }

  toValidate() { return this.applications().filter(a => a.currentStage === 'TECH_INTERVIEW'); }
  inInterview() { return this.applications().filter(a => a.currentStage === 'TECH_INTERVIEW'); }
  decided() { return this.applications().filter(a => ['FINAL_REVIEW', 'HIRED', 'REJECTED'].includes(a.currentStage)); }
  goRate(): number {
    const d = this.decided();
    if (d.length === 0) return 0;
    const go = d.filter(a => a.currentStage !== 'REJECTED').length;
    return Math.round((go / d.length) * 100);
  }

  candidateName(a: TechApplication): string {
    return a.candidate ? `${a.candidate.firstName} ${a.candidate.lastName}` : `#${a.id}`;
  }
  initials(a: TechApplication): string {
    return a.candidate ? `${a.candidate.firstName[0] ?? ''}${a.candidate.lastName[0] ?? ''}`.toUpperCase() : '?';
  }

  decide(a: TechApplication, stage: string): void {
    this.api.put(`/technique/applications/${a.id}/stage`, { newStage: stage }).subscribe({
      next: () => {
        this.toast.success(stage === 'REJECTED' ? 'Avis NO GO enregistré' : 'Avis GO enregistré', this.candidateName(a));
        this.load();
      },
      error: (err) => this.toast.error(err?.error?.error ?? 'Erreur'),
    });
  }
}
