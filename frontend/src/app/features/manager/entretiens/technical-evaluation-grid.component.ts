import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/http/api.service';
import { ToastService } from '../../../core/toast/toast.service';

interface Subcriterion { id: string; label: string; }
interface Category { label: string; coefficient: number; subcriteria: Subcriterion[]; }

interface CandidateNavState {
  candidateName?: string;
  offerTitle?: string;
  aiScore?: number;
  interviewDate?: string;
}

interface ExistingEvaluation {
  ratingsJson: string;
  weightedScore: number;
  pointsForts?: string;
  pointsAmelioration?: string;
  niveauPropose?: string;
  decision: string;
  submittedAt?: string;
}

/** Module 8 — Grille d'evaluation technique (Etape 8 du CDC). Composant partage
 *  entre le Manager (edition + soumission) et la RH (lecture seule pour
 *  consolider la decision finale) — le mode est determine par les donnees de
 *  route (voir manager.routes.ts / rh.routes.ts). */
@Component({
  selector: 'app-technical-evaluation-grid',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <div class="page-hd">
      <div>
        <div class="page-title">Grille d'évaluation technique</div>
        <div class="page-sub">
          {{ nav.candidateName ?? 'Candidat #' + applicationId() }}
          @if (nav.offerTitle) { · {{ nav.offerTitle }} }
        </div>
      </div>
      <div class="page-actions">
        <a [routerLink]="backLink" class="btn btn-g btn-sm">← Retour</a>
      </div>
    </div>

    <div class="g75">
      <div class="gcol">
        <div class="card">
          <div class="card-hd"><span class="ico">🎯</span>Évaluation des compétences techniques</div>

          @for (cat of categories; track cat.label) {
            <div style="margin-bottom:18px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <span class="tag t-b">{{ cat.label }}</span>
                <span style="font-size:11px;color:var(--gray-500)">Coefficient {{ (cat.coefficient * 100).toFixed(0) }}%</span>
              </div>
              @for (sc of cat.subcriteria; track sc.id) {
                <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--gray-100)">
                  <span style="font-size:12.5px;flex:1">{{ sc.label }}</span>
                  <div style="display:flex;gap:3px">
                    @for (star of [1,2,3,4,5]; track star) {
                      <span (click)="!readOnly() && setRating(sc.id, star)"
                            [style.cursor]="readOnly() ? 'default' : 'pointer'"
                            [style.color]="(ratings[sc.id] ?? 0) >= star ? 'var(--red)' : 'var(--gray-200)'"
                            style="font-size:18px">★</span>
                    }
                    <span style="font-size:11px;color:var(--gray-500);margin-left:4px;width:70px">
                      {{ ratingLabel(ratings[sc.id]) }}
                    </span>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <div class="card">
          <div class="card-hd"><span class="ico">📝</span>Avis narratif du responsable technique</div>
          <div class="fg">
            <label class="fl">Points forts observés</label>
            <textarea class="fi fi-ta" [(ngModel)]="pointsForts" [readonly]="readOnly()"
                      placeholder="Maîtrise architecturale, aisance technique..."></textarea>
          </div>
          <div class="fg">
            <label class="fl">Points d'amélioration / réserves</label>
            <textarea class="fi fi-ta" [(ngModel)]="pointsAmelioration" [readonly]="readOnly()"
                      placeholder="Points de vigilance, axes de progression..."></textarea>
          </div>
          <div class="fr">
            <div class="fg" style="flex:1">
              <label class="fl">Décision technique</label>
              <select class="fi fi-sel" [(ngModel)]="decision" [disabled]="readOnly()">
                <option value="">— Sélectionner —</option>
                <option value="GO">✓ GO — Profil validé techniquement</option>
                <option value="NO_GO">✗ NO-GO — Profil non retenu</option>
              </select>
            </div>
            <div class="fg" style="flex:1">
              <label class="fl">Niveau proposé</label>
              <input class="fi" [(ngModel)]="niveauPropose" [readonly]="readOnly()" placeholder="Ex: Expert confirmé (E4)">
            </div>
          </div>

          @if (!readOnly()) {
            <div style="background:var(--gray-50);border-radius:var(--r-md);padding:10px 12px;font-size:12px;color:var(--gray-500);margin-bottom:12px">
              ✦ Votre avis technique sera transmis à la Responsable RH pour consolidation avec l'avis RH avant la décision finale.
            </div>
            <button class="btn btn-p" style="width:100%;justify-content:center"
                    (click)="submit()" [disabled]="submitting() || !decision">
              {{ submitting() ? 'Envoi...' : "Soumettre l'avis technique final →" }}
            </button>
          } @else if (existing()) {
            <div style="background:var(--green-bg);border:1px solid var(--green-b);border-radius:var(--r-md);padding:10px 12px;font-size:12px;color:var(--green)">
              ✓ Avis soumis {{ existing()?.submittedAt ? ('le ' + (existing()!.submittedAt | date:'dd/MM/yyyy à HH:mm')) : '' }}
            </div>
          }
        </div>
      </div>

      <div class="gcol">
        <div class="card">
          <div class="card-hd"><span class="ico">📊</span>Score calculé en temps réel</div>
          <div style="text-align:center;padding:16px 0">
            <div style="font-size:42px;font-weight:300;color:var(--red)">
              {{ liveScore() }}<span style="font-size:18px">/100</span>
            </div>
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--gray-500)">Note technique globale</div>
            @if (decision === 'GO') {
              <span class="tag t-g" style="margin-top:8px">✓ GO Technique — Validé</span>
            } @else if (decision === 'NO_GO') {
              <span class="tag t-r" style="margin-top:8px">✗ NO-GO Technique</span>
            }
          </div>
          @for (cat of categories; track cat.label) {
            <div style="margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:4px">
                <span>{{ cat.label }} (×{{ (cat.coefficient * 100).toFixed(0) }}%)</span>
                <span style="font-weight:700">{{ categoryScore(cat).toFixed(1) }}/5</span>
              </div>
              <div style="height:6px;background:var(--gray-100);border-radius:4px;overflow:hidden">
                <div style="height:100%;background:var(--red)" [style.width.%]="categoryScore(cat) / 5 * 100"></div>
              </div>
            </div>
          }
        </div>

        @if (nav.aiScore !== undefined) {
          <div class="card">
            <div class="card-hd"><span class="ico">✦</span>Votre avis vs Score IA</div>
            <div style="display:flex;gap:10px">
              <div style="flex:1;text-align:center;padding:14px;background:var(--gray-50);border-radius:var(--r-md)">
                <div style="font-size:24px;font-weight:300">{{ nav.aiScore }}%</div>
                <div style="font-size:10px;color:var(--gray-500);text-transform:uppercase">Score IA</div>
              </div>
              <div style="flex:1;text-align:center;padding:14px;background:var(--green-bg);border-radius:var(--r-md)">
                <div style="font-size:24px;font-weight:300;color:var(--green)">{{ liveScore() }}%</div>
                <div style="font-size:10px;color:var(--green);text-transform:uppercase">Votre note</div>
              </div>
            </div>
          </div>
        }

        <div class="card">
          <div class="card-hd"><span class="ico">📋</span>Rappel dossier candidat</div>
          <div style="font-size:12.5px;line-height:2">
            @if (nav.offerTitle) { <div><strong>Poste :</strong> {{ nav.offerTitle }}</div> }
            @if (nav.aiScore !== undefined) { <div><strong>Score IA :</strong> {{ nav.aiScore }}%</div> }
            @if (nav.interviewDate) { <div><strong>Entretien :</strong> {{ nav.interviewDate }}</div> }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class TechnicalEvaluationGridComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  categories: Category[] = [
    { label: 'Architecture & Conception', coefficient: 0.30, subcriteria: [
      { id: 'arch_microservices', label: 'Conception architectures distribuées / microservices' },
      { id: 'arch_patterns', label: 'Design patterns (CQRS, Event Sourcing, Saga)' },
      { id: 'arch_api', label: 'API Design (REST, gRPC, GraphQL)' },
    ]},
    { label: 'Java / Spring Boot', coefficient: 0.25, subcriteria: [
      { id: 'java_17', label: 'Java 17+ (records, sealed classes, virtual threads)' },
      { id: 'spring_boot', label: 'Spring Boot 3.x / Spring Cloud' },
      { id: 'java_tests', label: 'Tests unitaires & intégration (JUnit 5, Testcontainers)' },
    ]},
    { label: 'DevOps / Cloud / K8s', coefficient: 0.20, subcriteria: [
      { id: 'devops_k8s', label: 'Kubernetes avancé (Operator, HPA, KEDA, Istio)' },
      { id: 'devops_cicd', label: 'CI/CD (GitLab, Argo CD, GitHub Actions)' },
      { id: 'devops_observability', label: 'Observabilité (Prometheus, Grafana, Jaeger)' },
    ]},
    { label: 'Leadership & Communication', coefficient: 0.25, subcriteria: [
      { id: 'lead_mentoring', label: 'Capacité à faire monter en compétences une équipe' },
      { id: 'lead_conflicts', label: 'Gestion de conflits techniques' },
      { id: 'lead_clarity', label: 'Clarté de présentation / pédagogie' },
    ]},
  ];

  ratings: Record<string, number> = {};
  pointsForts = '';
  pointsAmelioration = '';
  niveauPropose = '';
  decision: '' | 'GO' | 'NO_GO' = '';

  applicationId = signal<number>(0);
  submitting = signal(false);
  existing = signal<ExistingEvaluation | null>(null);
  forceReadOnly = false;
  apiBase = '/manager';
  backLink = '/manager/entretiens-techniques';
  nav: CandidateNavState = {};

  readOnly = computed(() => this.forceReadOnly || this.existing() !== null);

  liveScore(): number {
    let total = 0;
    for (const cat of this.categories) {
      total += (this.categoryScore(cat) / 5) * cat.coefficient;
    }
    return Math.round(total * 1000) / 10;
  }

  categoryScore(cat: Category): number {
    const values = cat.subcriteria.map(sc => this.ratings[sc.id] ?? 0).filter(v => v > 0);
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  setRating(id: string, value: number): void {
    this.ratings[id] = value;
  }

  ratingLabel(value?: number): string {
    switch (value) {
      case 5: return 'Excellent (5)';
      case 4: return 'Très bien (4)';
      case 3: return 'Bien (3)';
      case 2: return 'Passable (2)';
      case 1: return 'Insuffisant (1)';
      default: return '—';
    }
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.applicationId.set(Number(idParam));

    const data = this.route.snapshot.data;
    this.apiBase = (data['apiBase'] as string) ?? '/manager';
    this.forceReadOnly = !!data['readOnly'];
    this.backLink = (data['backLink'] as string) ?? '/manager/entretiens-techniques';

    const state = this.router.getCurrentNavigation()?.extras.state
      ?? (history.state as CandidateNavState | undefined);
    if (state) this.nav = state;

    this.api.get<ExistingEvaluation>(`${this.apiBase}/applications/${this.applicationId()}/technical-evaluation`)
      .subscribe(ev => {
        if (ev) {
          this.existing.set(ev);
          try {
            this.ratings = JSON.parse(ev.ratingsJson);
          } catch { /* ignore */ }
          this.pointsForts = ev.pointsForts ?? '';
          this.pointsAmelioration = ev.pointsAmelioration ?? '';
          this.niveauPropose = ev.niveauPropose ?? '';
          this.decision = (ev.decision as 'GO' | 'NO_GO') ?? '';
        }
      });
  }

  submit(): void {
    if (!this.decision) return;
    this.submitting.set(true);
    this.api.post(`${this.apiBase}/applications/${this.applicationId()}/technical-evaluation`, {
      ratings: this.ratings,
      pointsForts: this.pointsForts,
      pointsAmelioration: this.pointsAmelioration,
      niveauPropose: this.niveauPropose,
      decision: this.decision,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.success('Avis technique soumis', 'Transmis à la RH pour décision finale');
        this.router.navigate([this.backLink]);
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(err?.error?.error ?? 'Erreur lors de la soumission');
      },
    });
  }
}
