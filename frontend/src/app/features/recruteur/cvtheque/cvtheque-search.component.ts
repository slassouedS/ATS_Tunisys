import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/http/api.service';
import { ToastService } from '../../../core/toast/toast.service';
import {
  CandidateProfileModalComponent, CandidateProfileData,
} from '../../../shared/components/candidate-profile-modal/candidate-profile-modal.component';

interface CvSearchResult {
  candidateName: string;
  candidateEmail: string;
  offerTitle: string;
  aiScore?: number;
  currentStage: string;
  _score: number;
}

/** Module 5 — CVthèque IA : recherche sémantique (pattern 6.4 du design system). */
@Component({
  selector: 'app-cvtheque-search',
  standalone: true,
  imports: [FormsModule, CandidateProfileModalComponent],
  template: `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
        <div>
          <h2 style="font-size:16px;font-weight:700">CVthèque IA — Moteur de recherche sémantique</h2>
          <p class="page-sub">Module 5 · Recherche parmi les candidatures indexées</p>
        </div>
      </div>

      <div style="display:flex;background:var(--gray-50);border:1px solid var(--border);border-radius:var(--r-md);padding:10px 14px;gap:8px;margin-bottom:12px">
        <span style="font-size:16px">🔍</span>
        <input style="border:none;background:transparent;outline:none;flex:1;font-size:13px"
               placeholder='Ex: "développeur java avec expérience spring"'
               [(ngModel)]="query" (keydown.enter)="search()">
        <button class="btn btn-p btn-sm" (click)="search()" [disabled]="loading()">
          {{ loading() ? 'Recherche...' : 'Rechercher' }}
        </button>
      </div>

      @if (searched()) {
        <div style="display:flex;margin-bottom:16px;font-size:12px;color:var(--gray-500);gap:8px;align-items:center">
          <span>{{ results().length }} résultat(s) pour "{{ lastQuery() }}"</span>
        </div>
      }

      <div style="display:flex;flex-direction:column;gap:8px">
        @for (r of results(); track r.candidateEmail + r.offerTitle) {
          <div class="card card-sm">
            <div style="display:flex;gap:12px">
              <div class="av av-lg av-pink">{{ initials(r.candidateName) }}</div>
              <div style="flex:1">
                <div style="display:flex;justify-content:space-between">
                  <div>
                    <div style="display:flex;gap:6px;align-items:center">
                      <b style="font-size:14px">{{ r.candidateName }}</b>
                      <span class="tag t-b">{{ r.offerTitle }}</span>
                    </div>
                    <div style="font-size:11.5px;color:var(--gray-500);margin-top:2px">
                      {{ r.candidateEmail }} · Étape : {{ r.currentStage }}
                    </div>
                  </div>
                  <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
                    <span style="font-size:22px;font-weight:700;line-height:1"
                          [style.color]="(r.aiScore ?? 0) >= 80 ? 'var(--red)' : 'var(--amber)'">
                      {{ r.aiScore ?? 0 }}%
                    </span>
                    <span style="font-size:10.5px;color:var(--gray-500)">Score IA</span>
                  </div>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
                <button class="btn btn-g btn-sm" (click)="openProfile(r)">👁 Profil</button>
              </div>
            </div>
          </div>
        }
      </div>

      @if (searched() && results().length === 0) {
        <p style="font-size:12.5px;color:var(--gray-500)">Aucun résultat pour "{{ lastQuery() }}".</p>
      }
      @if (!searched()) {
        <p style="font-size:12.5px;color:var(--gray-500)">
          Recherchez par compétence, poste visé, ou mot-clé du CV.
        </p>
      }
    </div>

    <app-candidate-profile-modal
      [open]="profileOpen()"
      [data]="profileData()"
      [showActions]="false"
      (close)="profileOpen.set(false)">
    </app-candidate-profile-modal>
  `,
})
export class CvthequeSearchComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  query = '';
  results = signal<CvSearchResult[]>([]);
  loading = signal(false);
  searched = signal(false);
  lastQuery = signal('');
  profileOpen = signal(false);
  profileData = signal<CandidateProfileData | null>(null);

  search(): void {
    if (!this.query.trim()) return;
    this.loading.set(true);
    this.lastQuery.set(this.query);
    this.api.get<CvSearchResult[]>('/recruteur/cvtheque/search', { q: this.query }).subscribe({
      next: (res) => {
        this.results.set(res);
        this.loading.set(false);
        this.searched.set(true);
      },
      error: () => {
        this.toast.error('Recherche indisponible', 'Le moteur Elasticsearch est peut-être encore en cours de démarrage');
        this.loading.set(false);
        this.searched.set(true);
      },
    });
  }

  initials(name: string): string {
    const parts = name.trim().split(' ');
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  openProfile(r: CvSearchResult): void {
    this.profileData.set({
      fullName: r.candidateName,
      initials: this.initials(r.candidateName),
      score: r.aiScore ?? 0,
      role: r.offerTitle,
      skills: [],
      experiences: [],
    });
    this.profileOpen.set(true);
  }
}
