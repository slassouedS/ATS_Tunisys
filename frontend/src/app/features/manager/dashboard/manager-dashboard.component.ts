import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/http/api.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { RecruitmentDemand } from '../../../shared/models/demand.model';

interface PublishedOffer {
  id: number;
  demand: { id: number };
}

interface OfferApplication {
  id: number;
  currentStage: string;
}

/** Module 1 — Tableau de bord Manager (pattern fidele au template maitre TUNISYS).
 *  Les etapes 4/5/6 (Candidatures, Entretiens, Decision) refletent le vrai statut
 *  du pipeline a partir des candidatures reelles, et l'etape "Entretiens" est
 *  cliquable pour aller directement traiter les candidats concernes. */
@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="hero">
      <div class="hero-txt">
        <div class="hero-title">Bonjour, {{ firstName() }} 👋</div>
        <div class="hero-sub">
          Vous avez <strong>{{ demands().length }} demande(s)</strong> dans votre suivi.
          @if (pendingCount() > 0) {
            <strong>{{ pendingCount() }}</strong> en attente de validation RH.
          }
        </div>
      </div>
      <div class="hero-kpis">
        <div class="hkpi"><div class="hkpi-n">{{ demands().length }}</div><div class="hkpi-l">Demandes</div></div>
        <div class="hkpi"><div class="hkpi-n">{{ validatedCount() }}</div><div class="hkpi-l">Validées</div></div>
        <div class="hkpi"><div class="hkpi-n">{{ pendingCount() }}</div><div class="hkpi-l">En attente</div></div>
      </div>
    </div>

    <div class="g75" style="margin-top:16px">
      <div class="gcol">
        <div class="card">
          <div class="card-hd">
            <span class="ico">📋</span>Mes demandes
            <a routerLink="/manager/nouvelle-demande" class="btn btn-p btn-sm" style="margin-left:auto">+ Nouvelle</a>
          </div>

          @if (demands().length === 0) {
            <p style="font-size:12.5px;color:var(--gray-500)">Aucune demande pour le moment.</p>
          }

          @for (d of demands(); track d.id) {
            <div class="demand-c" [class.urgent]="d.urgency === 'URGENT'">
              <div class="demand-top">
                <div style="flex:1">
                  <div style="font-size:13px;font-weight:700">{{ d.title }}</div>
                  <div style="font-size:11.5px;color:var(--gray-500);margin-top:2px">
                    Créée le {{ d.createdAt | date:'dd/MM/yyyy' }}
                  </div>
                </div>
                @if (d.urgency === 'URGENT') {
                  <span class="tag t-r">Urgent</span>
                }
              </div>
              <div style="margin:10px 0 0">
                <div class="steps-row">
                  <div class="step-item done"><div class="step-dot">✓</div><div class="step-lbl">Créée</div></div>
                  <div class="step-item" [class.done]="d.status === 'VALIDATED'" [class.act]="d.status === 'PENDING'">
                    <div class="step-dot">{{ d.status === 'VALIDATED' ? '✓' : '2' }}</div>
                    <div class="step-lbl">Validation RH</div>
                  </div>
                  <div class="step-item" [class.done]="isPublished(d.id)" [class.act]="d.status === 'VALIDATED' && !isPublished(d.id)">
                    <div class="step-dot">{{ isPublished(d.id) ? '✓' : '3' }}</div><div class="step-lbl">Publiée</div>
                  </div>
                  <div class="step-item" [class.done]="candidatureCount(d.id) > 0">
                    <div class="step-dot">{{ candidatureCount(d.id) > 0 ? '✓' : '4' }}</div><div class="step-lbl">Candidatures</div>
                  </div>
                  <div class="step-item" [class.done]="interviewsDone(d.id)" [class.act]="interviewsInProgress(d.id)"
                       style="cursor:pointer" (click)="goToInterviews(d.id)">
                    <div class="step-dot">{{ interviewsDone(d.id) ? '✓' : '5' }}</div><div class="step-lbl">Entretiens</div>
                  </div>
                  <div class="step-item" [class.done]="decisionCount(d.id) > 0" [class.act]="finalReviewCount(d.id) > 0">
                    <div class="step-dot">{{ decisionCount(d.id) > 0 ? '✓' : '6' }}</div><div class="step-lbl">Décision</div>
                  </div>
                </div>
              </div>
              <div class="demand-status">
                @if (d.status === 'PENDING') {
                  <span class="tag t-a">● En attente de validation RH</span>
                } @else if (d.status === 'VALIDATED' && !isPublished(d.id)) {
                  <span class="tag t-g">● Validée — en attente de publication de l'offre par le RH</span>
                } @else if (techInterviewWaitingCount(d.id) > 0) {
                  <span class="tag t-r" style="cursor:pointer" (click)="goToInterviews(d.id)">
                    ● {{ techInterviewWaitingCount(d.id) }} candidat(s) en attente d'entretien technique →
                  </span>
                } @else if (isPublished(d.id)) {
                  <span class="tag t-g">● Offre publiée sur le portail</span>
                } @else if (d.status === 'REJECTED') {
                  <span class="tag t-r">● Refusée par le RH</span>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <div class="gcol">
        <div class="card">
          <div class="card-hd"><span class="ico">⬡</span>Aide-mémoire<div class="ai-b" style="margin-left:auto">IA ✦</div></div>
          <p style="font-size:12px;color:var(--gray-700);line-height:1.7">
            Une fois votre demande validée par le RH et l'offre publiée, l'IA présélectionnera
            automatiquement les meilleurs profils. Dès qu'un candidat réussit le test technique
            et l'entretien RH, il apparaît dans
            <a routerLink="/manager/entretiens-techniques" style="color:var(--red);font-weight:600">Entretiens techniques</a>
            pour planification et avis GO / NO-GO.
          </p>
        </div>
      </div>
    </div>
  `,
})
export class ManagerDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  demands = signal<RecruitmentDemand[]>([]);
  offers = signal<PublishedOffer[]>([]);
  applicationsByOffer = signal<Record<number, OfferApplication[]>>({});

  firstName = () => this.authStore.user()?.firstName ?? '';
  pendingCount = () => this.demands().filter(d => d.status === 'PENDING').length;
  validatedCount = () => this.demands().filter(d => d.status === 'VALIDATED').length;

  isPublished(demandId: number): boolean {
    return this.offers().some(o => o.demand?.id === demandId);
  }

  private offerIdFor(demandId: number): number | undefined {
    return this.offers().find(o => o.demand?.id === demandId)?.id;
  }

  private applicationsFor(demandId: number): OfferApplication[] {
    const offerId = this.offerIdFor(demandId);
    return offerId ? (this.applicationsByOffer()[offerId] ?? []) : [];
  }

  candidatureCount(demandId: number): number {
    return this.applicationsFor(demandId).length;
  }

  interviewsInProgress(demandId: number): boolean {
    return this.applicationsFor(demandId).some(a =>
      ['ASSESSMENT_DONE', 'RH_INTERVIEW', 'TECH_INTERVIEW'].includes(a.currentStage));
  }

  interviewsDone(demandId: number): boolean {
    const apps = this.applicationsFor(demandId);
    return apps.length > 0 && apps.some(a => ['FINAL_REVIEW', 'HIRED', 'REJECTED'].includes(a.currentStage));
  }

  finalReviewCount(demandId: number): number {
    return this.applicationsFor(demandId).filter(a => a.currentStage === 'FINAL_REVIEW').length;
  }

  decisionCount(demandId: number): number {
    return this.applicationsFor(demandId).filter(a => ['HIRED', 'REJECTED'].includes(a.currentStage)).length;
  }

  /** Nombre de candidats de cette offre actuellement en TECH_INTERVIEW — c'est
   *  precisement ceux que le Manager doit traiter dans "Entretiens techniques". */
  techInterviewWaitingCount(demandId: number): number {
    return this.applicationsFor(demandId).filter(a => a.currentStage === 'TECH_INTERVIEW').length;
  }

  goToInterviews(demandId: number): void {
    const offerId = this.offerIdFor(demandId);
    if (offerId) {
      this.router.navigate(['/manager/entretiens-techniques'], { queryParams: { offerId } });
    } else {
      this.router.navigate(['/manager/entretiens-techniques']);
    }
  }

  ngOnInit(): void {
    this.api.get<RecruitmentDemand[]>('/manager/demands').subscribe(d => this.demands.set(d));
    this.api.get<PublishedOffer[]>('/public/offers').subscribe(offers => {
      this.offers.set(offers);
      offers.forEach(o => {
        this.api.get<OfferApplication[]>(`/manager/applications/offer/${o.id}`).subscribe(apps => {
          this.applicationsByOffer.update(m => ({ ...m, [o.id]: apps }));
        });
      });
    });
  }
}
