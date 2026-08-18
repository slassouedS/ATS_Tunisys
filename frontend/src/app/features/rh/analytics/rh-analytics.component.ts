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

/** Module 10 — Tableau de bord & analytics RH (pattern 6.3 du design system). */
@Component({
  selector: 'app-rh-analytics',
  standalone: true,
  imports: [],
  template: `
    <div class="page-hd" style="flex-direction:column;align-items:flex-start;gap:2px">
      <h1 style="font-size:20px;font-weight:700">Analytics RH — Tableau de bord</h1>
      <p class="page-sub">Pilotage de la performance recrutement</p>
    </div>

    @if (data(); as d) {
      <div class="g4" style="margin-bottom:20px">
        <div class="kpi">
          <div class="kpi-l">Offres publiées</div>
          <div class="kpi-v">{{ d.totalOffers }}</div>
        </div>
        <div class="kpi">
          <div class="kpi-l">Pipeline candidats</div>
          <div class="kpi-v">{{ d.totalApplications }}</div>
        </div>
        <div class="kpi">
          <div class="kpi-l">Délai moyen d'embauche</div>
          <div class="kpi-v">{{ d.averageTimeToHireDays ?? '—' }}<span style="font-size:16px;color:var(--gray-500)">j</span></div>
        </div>
        <div class="kpi">
          <div class="kpi-l">Recruteurs actifs</div>
          <div class="kpi-v">{{ d.topRecruiters.length }}</div>
        </div>
      </div>

      <div class="g2" style="margin-bottom:20px">
        <div class="card">
          <div style="display:flex;justify-content:space-between;margin-bottom:12px">
            <h3>Offres par statut</h3>
          </div>
          @for (entry of objectEntries(d.offersByStatus); track entry[0]) {
            <div class="bar-row">
              <span class="bar-label">{{ entry[0] }}</span>
              <div class="bar-track"><div class="bar-fill" [style.width.%]="pct(entry[1], d.totalOffers)"></div></div>
              <span class="bar-value">{{ entry[1] }}</span>
            </div>
          }
        </div>

        <div class="card">
          <h3 style="margin-bottom:12px">Candidatures par étape</h3>
          @for (entry of objectEntries(d.applicationsByStage); track entry[0]) {
            <div class="bar-row">
              <span class="bar-label">{{ entry[0] }}</span>
              <div class="bar-track"><div class="bar-fill bar-fill-blue" [style.width.%]="pct(entry[1], d.totalApplications)"></div></div>
              <span class="bar-value">{{ entry[1] }}</span>
            </div>
          }
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:12px">Performance recruteurs — embauches</h3>
        @if (d.topRecruiters.length === 0) {
          <p style="font-size:12.5px;color:var(--gray-500)">Pas encore de données.</p>
        }
        <table class="tbl">
          <thead><tr><th>Recruteur</th><th>Embauches</th></tr></thead>
          <tbody>
            @for (r of d.topRecruiters; track r.recruiterName) {
              <tr><td class="col-name">{{ r.recruiterName }}</td><td>{{ r.hires }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    .bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 12px; }
    .bar-label { width: 140px; flex-shrink: 0; color: var(--gray-700); }
    .bar-track { flex: 1; height: 8px; background: var(--gray-100); border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; background: var(--red); border-radius: 4px; }
    .bar-fill-blue { background: var(--blue); }
    .bar-value { width: 28px; text-align: right; font-weight: 600; }
  `],
})
export class RhAnalyticsComponent implements OnInit {
  private readonly api = inject(ApiService);
  data = signal<AnalyticsOverview | null>(null);

  ngOnInit(): void {
    this.api.get<AnalyticsOverview>('/rh/analytics/overview').subscribe(d => this.data.set(d));
  }

  objectEntries(obj: Record<string, number>): [string, number][] {
    return Object.entries(obj ?? {});
  }

  pct(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }
}
