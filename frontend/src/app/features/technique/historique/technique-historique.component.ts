import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';

interface TechApplication {
  id: number;
  currentStage: string;
  finalDecision?: string;
  aiScore?: number;
  candidate?: { firstName: string; lastName: string };
  offer?: { title: string };
}

/** Historique des avis techniques deja rendus (GO/NO GO/decision finale). */
@Component({
  selector: 'app-technique-historique',
  standalone: true,
  imports: [],
  template: `
    <div class="page-hd">
      <div><div class="page-title">Historique des avis</div><div class="page-sub">{{ decided().length }} décision(s) rendue(s)</div></div>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      @if (decided().length === 0) {
        <p style="font-size:12.5px;color:var(--gray-500);padding:16px">Aucun avis rendu pour le moment.</p>
      }
      <table class="tbl">
        <thead><tr><th>Candidat</th><th>Poste</th><th>Score IA</th><th>Décision</th></tr></thead>
        <tbody>
          @for (a of decided(); track a.id) {
            <tr>
              <td style="font-weight:700">{{ candidateName(a) }}</td>
              <td><span class="tag t-b">{{ a.offer?.title }}</span></td>
              <td><span class="cscore cs-h">⚡ {{ a.aiScore ?? 0 }}%</span></td>
              <td>
                @if (a.currentStage === 'REJECTED') {
                  <span class="tag t-r">✗ NO GO</span>
                } @else {
                  <span class="tag t-g">✓ GO</span>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class TechniqueHistoriqueComponent implements OnInit {
  private readonly api = inject(ApiService);
  applications = signal<TechApplication[]>([]);

  ngOnInit(): void {
    this.api.get<TechApplication[]>('/technique/shortlists').subscribe(a => this.applications.set(a));
  }

  decided() {
    return this.applications().filter(a => ['FINAL_REVIEW', 'HIRED', 'REJECTED'].includes(a.currentStage));
  }

  candidateName(a: TechApplication): string {
    return a.candidate ? `${a.candidate.firstName} ${a.candidate.lastName}` : `#${a.id}`;
  }
}
