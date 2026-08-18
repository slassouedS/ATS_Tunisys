import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';

interface AnalyticsOverview {
  totalOffers: number;
  offersByStatus: Record<string, number>;
  totalApplications: number;
  applicationsByStage: Record<string, number>;
  averageTimeToHireDays: number | null;
  topRecruiters: { recruiterName: string; hires: number }[];
}

/** Module 10 — Tableau de bord RH (fidele au template maitre : hero violet,
 *  stat-c, barres de progression pipeline, KPIs par recruteur). */
@Component({
  selector: 'app-rh-dashboard',
  standalone: true,
  imports: [],
  template: `
    <div class="hero" style="background:var(--purple);padding:26px 30px">
      <div class="hero-txt">
        <div class="hero-title">Pilotage RH Global</div>
        <div class="hero-sub">
          @if (data(); as d) {
            <strong>{{ d.totalApplications }}</strong> candidatures au total ·
            Délai moyen d'embauche : <strong>{{ d.averageTimeToHireDays ?? '—' }} jours</strong>
          }
        </div>
      </div>
      @if (data(); as d) {
        <div class="hero-kpis">
          <div class="hkpi"><div class="hkpi-n">{{ d.totalApplications }}</div><div class="hkpi-l">Candidatures</div></div>
          <div class="hkpi"><div class="hkpi-n">{{ hiredCount(d) }}</div><div class="hkpi-l">Recrutés</div></div>
          <div class="hkpi"><div class="hkpi-n">{{ d.averageTimeToHireDays ?? '—' }}j</div><div class="hkpi-l">Time-to-hire</div></div>
        </div>
      }
    </div>

    @if (data(); as d) {
      <div class="g4" style="margin-top:16px">
        <div class="stat-c">
          <div class="stat-ico">📥</div><div class="stat-lbl">Offres publiées</div>
          <div class="stat-num" style="color:var(--red)">{{ d.offersByStatus['PUBLISHED'] ?? 0 }}</div>
        </div>
        <div class="stat-c">
          <div class="stat-ico">📋</div><div class="stat-lbl">Total candidatures</div>
          <div class="stat-num" style="color:var(--amber)">{{ d.totalApplications }}</div>
        </div>
        <div class="stat-c red">
          <div class="stat-ico">✅</div><div class="stat-lbl">Recrutés</div>
          <div class="stat-num">{{ hiredCount(d) }}</div>
        </div>
        <div class="stat-c">
          <div class="stat-ico">⏱</div><div class="stat-lbl">Time-to-hire</div>
          <div class="stat-num" style="color:var(--green)">{{ d.averageTimeToHireDays ?? '—' }}j</div>
        </div>
      </div>

      <div class="g2" style="margin-top:16px">
        <div class="card">
          <div class="card-hd"><span class="ico">📊</span>Pipeline global — état actuel</div>
          @for (entry of stageEntries(d); track entry[0]) {
            <div class="prog-item">
              <div class="prog-top"><span>{{ entry[0] }}</span><span style="font-weight:700">{{ entry[1] }}</span></div>
              <div class="prog-tr"><div class="prog-fi" [style.width.%]="pct(entry[1], d.totalApplications)" style="background:var(--blue)"></div></div>
            </div>
          }
        </div>
        <div class="card">
          <div class="card-hd"><span class="ico">📈</span>Efficacité par recruteur</div>
          @if (d.topRecruiters.length === 0) {
            <p style="font-size:12px;color:var(--gray-500)">Pas encore de données.</p>
          }
          @for (r of d.topRecruiters; track r.recruiterName) {
            <div class="sk-i">
              <div class="sk-n">{{ r.recruiterName }}</div>
              <div class="sk-tr"><div class="sk-fi" [style.width.%]="pctOfMax(r.hires, d.topRecruiters)"></div></div>
              <div class="sk-p">{{ r.hires }}</div>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class RhDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  data = signal<AnalyticsOverview | null>(null);

  ngOnInit(): void {
    this.api.get<AnalyticsOverview>('/rh/analytics/overview').subscribe(d => this.data.set(d));
  }

  hiredCount(d: AnalyticsOverview): number {
    return d.applicationsByStage['HIRED'] ?? 0;
  }

  stageEntries(d: AnalyticsOverview): [string, number][] {
    return Object.entries(d.applicationsByStage ?? {});
  }

  pct(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  pctOfMax(value: number, list: { hires: number }[]): number {
    const max = Math.max(...list.map(r => r.hires), 1);
    return Math.round((value / max) * 100);
  }
}
