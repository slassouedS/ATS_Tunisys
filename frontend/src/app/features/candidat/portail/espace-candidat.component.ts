import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/http/api.service';
import { CandidateAuthStore } from '../../../core/candidate-auth/candidate-auth.store';

interface TrackedApplication {
  id: number;
  currentStage: string;
  aiScore?: number;
  aiScoreExplanation?: string;
  offer?: { title: string; location?: string; contractType?: string };
}

interface AssessmentLinkInfo {
  available: boolean;
  completed?: boolean;
  url?: string;
  score?: number;
  passingScore?: number;
}

interface InterviewSlot {
  id: number;
  slotStart: string;
  slotEnd: string;
  mode: string;
  location?: string;
  isBooked: boolean;
}

interface InterviewInfo {
  id: number;
  interviewType: string;
  outcome: string;
  slot?: { slotStart: string; mode: string; location?: string };
}

/** Module 2 — "Mon espace candidat" : suivi de candidature par email
 *  (pas de compte candidat dans le systeme, cf. CDC). Fidele au template :
 *  steps-row, score IA, prochaines etapes, choix parmi les creneaux
 *  proposes par le RH/Recruteur/Technique (planification dirigee). */
@Component({
  selector: 'app-espace-candidat',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <div style="max-width:900px;margin:26px auto;padding:0 16px">
      <div class="page-hd">
        <div>
          <a routerLink="/portail" style="font-size:11.5px;color:var(--gray-500);text-decoration:none;display:inline-flex;align-items:center;gap:4px;margin-bottom:6px">← Retour aux offres</a>
          <div class="page-title">Mon espace candidat</div>
          <div class="page-sub">Suivi de vos candidatures</div>
        </div>
        @if (candidateAuth.isAuthenticated()) {
          <div class="page-actions">
            <span style="font-size:12px;color:var(--gray-500)">Connecté : {{ candidateAuth.displayName() }}</span>
            <button class="btn btn-g btn-sm" (click)="logout()">Déconnexion</button>
          </div>
        }
      </div>

      @if (!candidateAuth.isAuthenticated() && !applications()) {
        <div class="card" style="max-width:420px;margin-bottom:16px">
          <div class="card-hd"><span class="ico">👤</span>Vous avez un compte ?</div>
          <p style="font-size:12px;color:var(--gray-500);margin-bottom:10px">
            Connectez-vous pour retrouver vos candidatures automatiquement.
          </p>
          <a routerLink="/portail/connexion" class="btn btn-p" style="width:100%;justify-content:center">Se connecter</a>
        </div>
      }

      @if (!applications()) {
        <div class="card" style="max-width:420px">
          <div class="card-hd"><span class="ico">🔎</span>Ou retrouver par email</div>
          <div class="fg">
            <label class="fl">Email utilisé lors de votre candidature</label>
            <input class="fi" type="email" [(ngModel)]="email" placeholder="vous@email.com" (keydown.enter)="search()">
          </div>
          <button class="btn btn-p" (click)="search()" [disabled]="loading()">
            {{ loading() ? 'Recherche...' : 'Voir mes candidatures' }}
          </button>
        </div>
      } @else {
        @if (applications()!.length === 0) {
          <div class="card"><p style="font-size:12.5px;color:var(--gray-500)">Aucune candidature trouvée pour cet email.</p></div>
        }
        <div class="gcol">
          @for (a of applications(); track a.id) {
            <div class="card">
              <div class="card-hd"><span class="ico">📍</span>{{ a.offer?.title }}</div>
              @if ((a.aiScore ?? 0) >= 70) {
                <div style="background:var(--green-bg);border:1px solid var(--green-b);border-radius:var(--r-md);padding:12px;margin-bottom:14px;display:flex;align-items:center;gap:12px">
                  <div style="font-size:20px">🎉</div>
                  <div>
                    <div style="font-weight:700;color:var(--green);font-size:13px">Félicitations ! Vous êtes présélectionné(e)</div>
                    <div style="font-size:12px;color:var(--green)">Score IA : {{ a.aiScore }}% (seuil requis : 70%)</div>
                  </div>
                </div>
              }
              @if (a.currentStage === 'REJECTED') {
                <div style="background:var(--gray-50);border:1px solid var(--border);border-radius:var(--r-md);padding:16px;text-align:center">
                  <div style="font-size:22px;margin-bottom:8px">💙</div>
                  <div style="font-weight:600;font-size:13px;color:var(--gray-700);margin-bottom:6px">
                    Votre candidature n'a pas été retenue pour la suite du processus cette fois-ci
                  </div>
                  @if (assessmentResult(a.id); as r) {
                    <div style="font-size:11.5px;color:var(--gray-500);margin-bottom:10px">
                      Score au test technique : {{ r.score ?? 0 }}% (seuil requis : {{ r.passingScore ?? 50 }}%)
                    </div>
                  }
                  <p style="font-size:12px;color:var(--gray-500);line-height:1.6;max-width:480px;margin:0 auto">
                    Ne vous découragez pas — chaque candidature est une expérience précieuse. N'hésitez pas à
                    postuler à d'autres offres qui correspondent à votre profil : de nouvelles opportunités
                    s'ouvrent régulièrement chez TUNISYS.
                  </p>
                </div>
              } @else if (a.currentStage === 'HIRED') {
                <div style="background:var(--green-bg);border:1px solid var(--green-b);border-radius:var(--r-md);padding:16px;text-align:center">
                  <div style="font-size:26px;margin-bottom:8px">🎉</div>
                  <div style="font-weight:700;font-size:14px;color:var(--green);margin-bottom:6px">
                    Félicitations, vous avez été retenu(e) pour ce poste !
                  </div>
                  <p style="font-size:12px;color:var(--gray-700);line-height:1.6;max-width:480px;margin:0 auto">
                    Notre équipe RH revient vers vous très prochainement avec les détails de votre embauche.
                    Bienvenue chez TUNISYS !
                  </p>
                </div>
              } @else {
                <div class="steps-row">
                  <div class="step-item" [class.done]="stageIndex(a) >= 0"><div class="step-dot">✓</div><div class="step-lbl">Reçue</div></div>
                  <div class="step-item" [class.done]="stageIndex(a) >= 1" [class.act]="stageIndex(a) === 1"><div class="step-dot">{{ stageIndex(a) >= 1 ? '✓' : '2' }}</div><div class="step-lbl">Analysée IA</div></div>
                  <div class="step-item" [class.done]="stageIndex(a) >= 3" [class.act]="stageIndex(a) === 2 || stageIndex(a) === 3"><div class="step-dot">{{ stageIndex(a) >= 3 ? '✓' : '3' }}</div><div class="step-lbl">Test tech.</div></div>
                  <div class="step-item" [class.done]="stageIndex(a) >= 5" [class.act]="stageIndex(a) === 4 || stageIndex(a) === 5"><div class="step-dot">{{ stageIndex(a) >= 5 ? '✓' : '4' }}</div><div class="step-lbl">Entretien</div></div>
                  <div class="step-item" [class.done]="stageIndex(a) >= 7" [class.act]="stageIndex(a) === 6 || stageIndex(a) === 7"><div class="step-dot">{{ stageIndex(a) >= 7 ? '✓' : '5' }}</div><div class="step-lbl">Décision</div></div>
                </div>
              }

              @if (a.currentStage === 'ASSESSMENT_SENT' || a.currentStage === 'ASSESSMENT_DONE') {
                <div style="margin-top:16px;padding:14px;background:var(--amber-bg);border:1px solid var(--amber-b);border-radius:var(--r-md)">
                  @if (a.currentStage === 'ASSESSMENT_DONE') {
                    <div style="font-weight:600;color:var(--green);font-size:12.5px;margin-bottom:6px">✓ Test technique complété — merci !</div>
                    @if (assessmentResult(a.id); as r) {
                      <span class="tag" [class]="(r.score ?? 0) >= (r.passingScore ?? 50) ? 't-g' : 't-r'">
                        Votre score : {{ r.score ?? 0 }}% {{ (r.score ?? 0) >= (r.passingScore ?? 50) ? '✓ Admis' : '✗ En dessous du seuil requis' }}
                      </span>
                    }
                  } @else {
                    <div style="font-weight:600;font-size:12.5px;margin-bottom:8px">📝 Un test technique vous a été envoyé</div>
                    <button class="btn btn-p btn-sm" (click)="openAssessment(a.id)" [disabled]="loadingAssessment() === a.id">
                      {{ loadingAssessment() === a.id ? 'Chargement...' : 'Passer le test maintenant →' }}
                    </button>
                  }
                </div>
              }

              <!-- Entretien RH : creneaux proposes par le recruteur, ou confirmation si deja choisi -->
              @if (a.currentStage === 'ASSESSMENT_DONE' || a.currentStage === 'RH_INTERVIEW') {
                @if (bookedInterview(a.id, 'RH'); as itv) {
                  <div style="margin-top:16px;padding:14px;background:var(--green-bg);border:1px solid var(--green-b);border-radius:var(--r-md)">
                    <div style="font-weight:600;font-size:12.5px;color:var(--green);margin-bottom:4px">✓ Entretien RH confirmé</div>
                    <div style="font-size:12.5px;color:var(--gray-700)">
                      📅 {{ itv.slot?.slotStart | date:'EEEE d MMMM, HH:mm' }} · {{ modeLabel(itv.slot?.mode) }}
                      @if (itv.slot?.location) { · {{ itv.slot?.location }} }
                    </div>
                  </div>
                } @else if ((proposedSlots()[a.id] ?? []).length > 0) {
                  <div style="margin-top:16px;padding:14px;background:var(--gray-50);border-radius:var(--r-md)">
                    <div style="font-weight:600;font-size:12.5px;margin-bottom:8px">📅 Un entretien RH vous a été proposé — choisissez un créneau</div>
                    <div class="g3">
                      @for (slot of proposedSlots()[a.id]; track slot.id) {
                        <button class="card card-sm" style="border-color:var(--red-light);cursor:pointer;text-align:left"
                                (click)="bookSlot(a.id, slot.id, 'RH')" [disabled]="booking()">
                          <div style="font-size:16px;font-weight:700">{{ slot.slotStart | date:'HH:mm' }}</div>
                          <div style="font-size:11px;color:var(--gray-500)">{{ slot.slotStart | date:'EEE d MMM' }} · {{ modeLabel(slot.mode) }}</div>
                          @if (slot.location) { <div style="font-size:10.5px;color:var(--gray-400)">{{ slot.location }}</div> }
                        </button>
                      }
                    </div>
                  </div>
                } @else if (a.currentStage === 'ASSESSMENT_DONE') {
                  <div style="margin-top:16px;padding:14px;background:var(--gray-50);border-radius:var(--r-md);text-align:center">
                    <p style="font-size:12px;color:var(--gray-500)">⏳ Notre équipe RH va bientôt vous proposer des créneaux d'entretien.</p>
                  </div>
                }
              }

              <!-- Entretien technique : creneaux proposes par le resp. technique -->
              @if (a.currentStage === 'TECH_INTERVIEW') {
                @if (bookedInterview(a.id, 'TECHNIQUE'); as itv) {
                  <div style="margin-top:16px;padding:14px;background:var(--green-bg);border:1px solid var(--green-b);border-radius:var(--r-md)">
                    <div style="font-weight:600;font-size:12.5px;color:var(--green);margin-bottom:4px">✓ Entretien technique confirmé</div>
                    <div style="font-size:12.5px;color:var(--gray-700)">
                      📅 {{ itv.slot?.slotStart | date:'EEEE d MMMM, HH:mm' }} · {{ modeLabel(itv.slot?.mode) }}
                      @if (itv.slot?.location) { · {{ itv.slot?.location }} }
                    </div>
                  </div>
                } @else if ((proposedSlots()[a.id] ?? []).length > 0) {
                  <div style="margin-top:16px;padding:14px;background:var(--gray-50);border-radius:var(--r-md)">
                    <div style="font-weight:600;font-size:12.5px;color:var(--green);margin-bottom:8px">✓ Entretien RH validé — un entretien technique vous a été proposé</div>
                    <div class="g3">
                      @for (slot of proposedSlots()[a.id]; track slot.id) {
                        <button class="card card-sm" style="border-color:var(--red-light);cursor:pointer;text-align:left"
                                (click)="bookSlot(a.id, slot.id, 'TECHNIQUE')" [disabled]="booking()">
                          <div style="font-size:16px;font-weight:700">{{ slot.slotStart | date:'HH:mm' }}</div>
                          <div style="font-size:11px;color:var(--gray-500)">{{ slot.slotStart | date:'EEE d MMM' }} · {{ modeLabel(slot.mode) }}</div>
                          @if (slot.location) { <div style="font-size:10.5px;color:var(--gray-400)">{{ slot.location }}</div> }
                        </button>
                      }
                    </div>
                  </div>
                } @else {
                  <div style="margin-top:16px;padding:14px;background:var(--gray-50);border-radius:var(--r-md);text-align:center">
                    <p style="font-size:12px;color:var(--gray-500)">⏳ Notre responsable technique va bientôt vous proposer des créneaux d'entretien.</p>
                  </div>
                }
              }

              @if (a.currentStage === 'FINAL_REVIEW') {
                @if (bookedInterview(a.id, 'FINAL'); as itv) {
                  <div style="margin-top:16px;padding:14px;background:var(--green-bg);border:1px solid var(--green-b);border-radius:var(--r-md)">
                    <div style="font-weight:600;font-size:12.5px;color:var(--green);margin-bottom:4px">✓ Entretien final confirmé</div>
                    <div style="font-size:12.5px;color:var(--gray-700)">
                      📅 {{ itv.slot?.slotStart | date:'EEEE d MMMM, HH:mm' }} · {{ modeLabel(itv.slot?.mode) }}
                      @if (itv.slot?.location) { · {{ itv.slot?.location }} }
                    </div>
                  </div>
                } @else if ((proposedSlots()[a.id] ?? []).length > 0) {
                  <div style="margin-top:16px;padding:14px;background:var(--gray-50);border-radius:var(--r-md)">
                    <div style="font-weight:600;font-size:12.5px;margin-bottom:8px">📅 Notre équipe RH souhaite un dernier échange — choisissez un créneau</div>
                    <div class="g3">
                      @for (slot of proposedSlots()[a.id]; track slot.id) {
                        <button class="card card-sm" style="border-color:var(--red-light);cursor:pointer;text-align:left"
                                (click)="bookSlot(a.id, slot.id, 'FINAL')" [disabled]="booking()">
                          <div style="font-size:16px;font-weight:700">{{ slot.slotStart | date:'HH:mm' }}</div>
                          <div style="font-size:11px;color:var(--gray-500)">{{ slot.slotStart | date:'EEE d MMM' }} · {{ modeLabel(slot.mode) }}</div>
                          @if (slot.location) { <div style="font-size:10.5px;color:var(--gray-400)">{{ slot.location }}</div> }
                        </button>
                      }
                    </div>
                  </div>
                } @else {
                  <div style="margin-top:16px;padding:14px;background:var(--amber-bg);border:1px solid var(--amber-b);border-radius:var(--r-md);text-align:center">
                    <div style="font-weight:600;font-size:12.5px">⏳ Votre dossier est en revue finale par notre équipe RH</div>
                  </div>
                }
              }

              @if (a.aiScoreExplanation) {
                <div class="ai-b" style="margin-top:16px;margin-bottom:8px">Analyse IA ✦</div>
                <div style="display:flex;gap:16px;align-items:center">
                  <div style="text-align:center;padding:16px;background:var(--green-bg);border-radius:var(--r-lg);min-width:80px">
                    <div style="font-size:28px;font-weight:300;color:var(--green)">{{ a.aiScore ?? 0 }}<span style="font-size:14px">%</span></div>
                    <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--green)">Score IA</div>
                  </div>
                  <div style="flex:1;font-size:12.5px;line-height:1.65;color:var(--gray-700)">{{ a.aiScoreExplanation }}</div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class EspaceCandidatComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  candidateAuth = inject(CandidateAuthStore);

  email = '';
  loading = signal(false);
  loadingAssessment = signal<number | null>(null);
  booking = signal(false);
  applications = signal<TrackedApplication[] | null>(null);
  assessmentResults = signal<Record<number, AssessmentLinkInfo>>({});
  interviews = signal<Record<number, InterviewInfo[]>>({});
  proposedSlots = signal<Record<number, InterviewSlot[]>>({});

  private readonly stageOrder = [
    'RECEIVED', 'SCORED', 'SHORTLISTED', 'ASSESSMENT_SENT', 'ASSESSMENT_DONE',
    'RH_INTERVIEW', 'TECH_INTERVIEW', 'FINAL_REVIEW', 'HIRED',
  ];

  ngOnInit(): void {
    if (this.candidateAuth.isAuthenticated()) {
      this.loadAuthenticated();
      return;
    }
    const qpEmail = this.route.snapshot.queryParamMap.get('email');
    if (qpEmail) { this.email = qpEmail; this.search(); }
  }

  loadAuthenticated(): void {
    this.loading.set(true);
    this.api.get<TrackedApplication[]>('/candidate/me/applications').subscribe({
      next: (apps) => {
        this.applications.set(apps);
        this.loading.set(false);
        this.afterApplicationsLoaded(apps);
      },
      error: () => { this.applications.set([]); this.loading.set(false); },
    });
  }

  private afterApplicationsLoaded(apps: TrackedApplication[]): void {
    apps.filter(a => ['ASSESSMENT_DONE', 'REJECTED'].includes(a.currentStage)).forEach(a => this.fetchResult(a.id));
    apps.filter(a => ['ASSESSMENT_DONE', 'RH_INTERVIEW', 'TECH_INTERVIEW', 'FINAL_REVIEW', 'HIRED'].includes(a.currentStage))
        .forEach(a => this.fetchInterviews(a.id));
    apps.filter(a => ['ASSESSMENT_DONE', 'RH_INTERVIEW', 'TECH_INTERVIEW', 'FINAL_REVIEW'].includes(a.currentStage))
        .forEach(a => this.fetchProposedSlots(a.id));
  }

  private fetchResult(applicationId: number): void {
    this.api.get<AssessmentLinkInfo>(`/candidate/me/applications/${applicationId}/assessment-link`).subscribe(info => {
      this.assessmentResults.update(m => ({ ...m, [applicationId]: info }));
    });
  }

  private fetchInterviews(applicationId: number): void {
    this.api.get<InterviewInfo[]>(`/public/applications/${applicationId}/interviews`).subscribe(list => {
      this.interviews.update(m => ({ ...m, [applicationId]: list }));
    });
  }

  private fetchProposedSlots(applicationId: number): void {
    this.api.get<InterviewSlot[]>(`/public/applications/${applicationId}/proposed-slots`).subscribe(list => {
      this.proposedSlots.update(m => ({ ...m, [applicationId]: list }));
    });
  }

  assessmentResult(applicationId: number): AssessmentLinkInfo | undefined {
    return this.assessmentResults()[applicationId];
  }

  bookedInterview(applicationId: number, type: 'RH' | 'TECHNIQUE' | 'FINAL'): InterviewInfo | undefined {
    return (this.interviews()[applicationId] ?? []).find(i => i.interviewType === type);
  }

  bookSlot(applicationId: number, slotId: number, interviewType: 'RH' | 'TECHNIQUE' | 'FINAL'): void {
    this.booking.set(true);
    const params = new URLSearchParams({ applicationId: String(applicationId), interviewType });
    this.api.post(`/public/interviews/book/${slotId}?${params.toString()}`, {}).subscribe({
      next: () => {
        this.booking.set(false);
        this.fetchInterviews(applicationId);
        this.fetchProposedSlots(applicationId);
        if (this.candidateAuth.isAuthenticated()) {
          this.loadAuthenticated();
        } else {
          this.search();
        }
      },
      error: (err) => {
        this.booking.set(false);
        alert(err?.error?.error ?? "Ce créneau vient d'être réservé, merci de recharger la page.");
        this.fetchProposedSlots(applicationId);
      },
    });
  }

  modeLabel(mode?: string): string {
    if (mode === 'TEAMS') return 'Teams';
    if (mode === 'PRESENTIEL') return 'Présentiel';
    return 'Visio';
  }

  logout(): void {
    this.candidateAuth.clear();
    this.applications.set(null);
  }

  openAssessment(applicationId: number): void {
    this.loadingAssessment.set(applicationId);
    this.api.get<AssessmentLinkInfo>(`/candidate/me/applications/${applicationId}/assessment-link`).subscribe({
      next: (info) => {
        this.loadingAssessment.set(null);
        if (info.available && info.url) {
          window.open(info.url, '_blank');
        }
      },
      error: () => this.loadingAssessment.set(null),
    });
  }

  search(): void {
    if (!this.email.trim()) return;
    this.loading.set(true);
    this.api.get<TrackedApplication[]>('/public/track', { email: this.email }).subscribe({
      next: (apps) => {
        this.applications.set(apps);
        this.loading.set(false);
        this.afterApplicationsLoaded(apps);
      },
      error: () => { this.applications.set([]); this.loading.set(false); },
    });
  }

  stageIndex(a: TrackedApplication): number {
    return this.stageOrder.indexOf(a.currentStage);
  }
}
