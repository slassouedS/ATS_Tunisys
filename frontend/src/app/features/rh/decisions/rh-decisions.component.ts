import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/http/api.service';
import { ToastService } from '../../../core/toast/toast.service';

interface DecisionApplication {
  id: number;
  aiScore?: number;
  aiScoreExplanation?: string;
  candidate?: { firstName: string; lastName: string };
  offer?: { title: string };
}

interface AssessmentResult {
  application: { id: number };
  score?: number;
  passingScore?: number;
  completedAt?: string;
}

interface InterviewInfo {
  id: number;
  interviewType: string; // RH, TECHNIQUE, FINAL
  outcome: string; // GO, NO_GO, PENDING
  slot?: { slotStart: string; mode: string; location?: string };
}

interface InterviewSlot {
  id: number;
  slotStart: string;
  slotEnd: string;
  mode: string;
  location?: string;
  isBooked: boolean;
  proposedForApplicationId?: number | null;
}

/** Module 1 (Etape 9) — Decisions finales RH : consolidation des avis reels
 *  (Score IA, Test tech, Avis RH, Avis Tech issus des entretiens), avec la
 *  possibilite de planifier un entretien final optionnel avant de trancher. */
@Component({
  selector: 'app-rh-decisions',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  template: `
    <div class="page-hd">
      <div>
        <div class="page-title">Décisions finales</div>
        <div class="page-sub">Consolidation et décision d'embauche — {{ applications().length }} en attente</div>
      </div>
    </div>

    @if (applications().length === 0) {
      <div class="card"><p style="font-size:12.5px;color:var(--gray-500)">Aucune décision en attente pour le moment.</p></div>
    }

    <div class="gcol">
      @for (a of applications(); track a.id) {
        <div class="card">
          <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:16px">
            <div class="prof-av" style="background:var(--red)">{{ initials(a) }}</div>
            <div style="flex:1">
              <div class="prof-name">{{ candidateName(a) }}</div>
              <div class="prof-sub">{{ a.offer?.title }} · Candidature #{{ a.id }}</div>
            </div>
            <span class="tag t-r" style="font-size:12px">● Décision requise</span>
          </div>

          <div class="g4" style="grid-template-columns:repeat(4,1fr);margin-bottom:14px">
            <div style="text-align:center;padding:12px;background:var(--green-bg);border-radius:var(--r-md)">
              <div style="font-size:20px;font-weight:300;color:var(--green)">{{ a.aiScore ?? 0 }}%</div>
              <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--gray-500)">Score IA</div>
            </div>
            <div style="text-align:center;padding:12px;background:var(--gray-50);border-radius:var(--r-md)">
              @if (testResultFor(a.id); as r) {
                <div style="font-size:20px;font-weight:300" [style.color]="(r.score ?? 0) >= (r.passingScore ?? 50) ? 'var(--green)' : 'var(--red)'">{{ r.score ?? 0 }}%</div>
              } @else {
                <div style="font-size:20px;font-weight:300;color:var(--gray-700)">—</div>
              }
              <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--gray-500)">Test Tech</div>
            </div>
            <div style="text-align:center;padding:12px;background:var(--gray-50);border-radius:var(--r-md)">
              @if (interviewOutcome(a.id, 'RH'); as itv) {
                <div style="font-size:20px;font-weight:300" [style.color]="itv.outcome === 'GO' ? 'var(--green)' : 'var(--red)'">{{ itv.outcome === 'GO' ? 'GO' : 'NO-GO' }}</div>
              } @else {
                <div style="font-size:20px;font-weight:300;color:var(--gray-700)">—</div>
              }
              <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--gray-500)">Avis RH</div>
            </div>
            <div style="text-align:center;padding:12px;background:var(--gray-50);border-radius:var(--r-md)">
              @if (interviewOutcome(a.id, 'TECHNIQUE'); as itv) {
                <div style="font-size:20px;font-weight:300" [style.color]="itv.outcome === 'GO' ? 'var(--green)' : 'var(--red)'">{{ itv.outcome === 'GO' ? 'GO' : 'NO-GO' }}</div>
              } @else {
                <div style="font-size:20px;font-weight:300;color:var(--gray-700)">—</div>
              }
              <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--gray-500)">Avis Tech</div>
              @if (interviewOutcome(a.id, 'TECHNIQUE')) {
                <a [routerLink]="['/rh/decisions', a.id, 'grille-technique']" style="font-size:10px;color:var(--red);display:block;margin-top:4px">
                  Voir la grille détaillée →
                </a>
              }
            </div>
          </div>

          @if (a.aiScoreExplanation) {
            <div style="background:var(--gray-50);border-radius:var(--r-md);padding:12px;margin-bottom:14px;font-size:12.5px;line-height:1.65">
              <strong>Synthèse IA :</strong> {{ a.aiScoreExplanation }}
            </div>
          }

          <!-- Entretien final optionnel -->
          @if (interviewOutcome(a.id, 'FINAL'); as itv) {
            <div style="background:var(--green-bg);border:1px solid var(--green-b);border-radius:var(--r-md);padding:12px;margin-bottom:14px;font-size:12.5px">
              ✓ Entretien final tenu le {{ itv.slot?.slotStart | date:'EEEE d MMMM, HH:mm' }} · {{ modeLabel(itv.slot?.mode) }}
            </div>
          } @else if ((proposedFinalSlots()[a.id] ?? []).length > 0) {
            <div style="background:var(--amber-bg);border-radius:var(--r-md);padding:10px 12px;margin-bottom:14px;font-size:12.5px">
              ⏳ Entretien final proposé au candidat, en attente de son choix
            </div>
          } @else if (!isExpanded(a.id)) {
            <button class="btn btn-g btn-sm" style="margin-bottom:14px" (click)="expand(a.id)">
              📅 Planifier un entretien final (optionnel)
            </button>
          }

          @if (isExpanded(a.id)) {
            <div style="background:var(--gray-50);border-radius:var(--r-md);padding:14px;margin-bottom:14px">
              @if (proposableSlots().length === 0) {
                <p style="font-size:12px;color:var(--gray-500)">Aucun créneau libre. Créez d'abord vos disponibilités.</p>
                <div class="fr" style="margin-top:10px">
                  <div class="fg" style="flex:1"><label class="fl">Début</label><input class="fi" type="datetime-local" [(ngModel)]="newSlotStart" [ngModelOptions]="{standalone:true}"></div>
                  <div class="fg" style="flex:1"><label class="fl">Fin</label><input class="fi" type="datetime-local" [(ngModel)]="newSlotEnd" [ngModelOptions]="{standalone:true}"></div>
                  <div class="fg" style="flex:1">
                    <label class="fl">Mode</label>
                    <select class="fi" [(ngModel)]="newSlotMode" [ngModelOptions]="{standalone:true}">
                      <option value="VISIO">Visio</option>
                      <option value="TEAMS">Teams</option>
                      <option value="PRESENTIEL">Présentiel</option>
                    </select>
                  </div>
                </div>
                <button class="btn btn-p btn-sm" style="margin-top:8px" (click)="createSlot()" [disabled]="creatingSlot()">
                  {{ creatingSlot() ? 'Création...' : 'Créer ce créneau' }}
                </button>
              } @else {
                <div style="font-size:11.5px;font-weight:600;margin-bottom:8px">Sélectionnez un ou plusieurs créneaux à proposer :</div>
                <div class="g3" style="margin-bottom:12px">
                  @for (slot of proposableSlots(); track slot.id) {
                    <label class="card card-sm" style="border-color:var(--red-light);cursor:pointer;display:flex;align-items:flex-start;gap:6px">
                      <input type="checkbox" [checked]="isSelected(a.id, slot.id)" (change)="toggleSelect(a.id, slot.id)" style="margin-top:2px">
                      <div>
                        <div style="font-size:15px;font-weight:700">{{ slot.slotStart | date:'HH:mm' }}</div>
                        <div style="font-size:11px;color:var(--gray-500)">{{ slot.slotStart | date:'EEE d MMM' }} · {{ modeLabel(slot.mode) }}</div>
                      </div>
                    </label>
                  }
                </div>
              }
              <div style="display:flex;gap:8px;justify-content:flex-end">
                <button class="btn btn-g btn-sm" (click)="collapse(a.id)">Annuler</button>
                @if (proposableSlots().length > 0) {
                  <button class="btn btn-p btn-sm" (click)="sendInvitation(a)"
                          [disabled]="(selections[a.id]?.size ?? 0) === 0 || sending() === a.id">
                    {{ sending() === a.id ? 'Envoi...' : '📨 Envoyer invitation (' + (selections[a.id]?.size ?? 0) + ')' }}
                  </button>
                }
              </div>
            </div>
          }

          <div class="fg">
            <label class="fl">Commentaire de décision</label>
            <textarea class="fi fi-ta" [(ngModel)]="comments[a.id]" [ngModelOptions]="{standalone:true}" placeholder="Motif de la décision..."></textarea>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button class="btn btn-grn" (click)="decide(a, 'HIRED')" [disabled]="processingId() === a.id">
              ✓ Confirmer offre d'embauche
            </button>
            <button class="btn btn-dng" (click)="decide(a, 'REJECTED')" [disabled]="processingId() === a.id">
              ✗ Rejeter
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class RhDecisionsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  applications = signal<DecisionApplication[]>([]);
  assessments = signal<AssessmentResult[]>([]);
  interviews = signal<Record<number, InterviewInfo[]>>({});
  proposedFinalSlots = signal<Record<number, InterviewSlot[]>>({});
  proposableSlots = signal<InterviewSlot[]>([]);

  processingId = signal<number | null>(null);
  expandedId = signal<number | null>(null);
  sending = signal<number | null>(null);
  creatingSlot = signal(false);

  comments: Record<number, string> = {};
  selections: Record<number, Set<number>> = {};
  newSlotStart = '';
  newSlotEnd = '';
  newSlotMode = 'VISIO';

  ngOnInit(): void {
    this.load();
    this.api.get<AssessmentResult[]>('/recruteur/assessments').subscribe(a => this.assessments.set(a));
    this.loadProposableSlots();
  }

  testResultFor(applicationId: number): AssessmentResult | undefined {
    return this.assessments().find(r => r.application?.id === applicationId && r.completedAt);
  }

  interviewOutcome(applicationId: number, type: 'RH' | 'TECHNIQUE' | 'FINAL'): InterviewInfo | undefined {
    return (this.interviews()[applicationId] ?? []).find(i => i.interviewType === type && i.outcome !== 'PENDING');
  }

  load(): void {
    this.api.get<DecisionApplication[]>('/rh/applications/final-review').subscribe(a => {
      this.applications.set(a);
      a.forEach(app => {
        this.loadInterviews(app.id);
        this.loadProposedFinalSlots(app.id);
      });
    });
  }

  loadInterviews(applicationId: number): void {
    this.api.get<InterviewInfo[]>(`/rh/applications/${applicationId}/interviews`).subscribe(list => {
      this.interviews.update(m => ({ ...m, [applicationId]: list }));
    });
  }

  loadProposedFinalSlots(applicationId: number): void {
    this.api.get<InterviewSlot[]>(`/public/applications/${applicationId}/proposed-slots`).subscribe(list => {
      this.proposedFinalSlots.update(m => ({ ...m, [applicationId]: list }));
    });
  }

  loadProposableSlots(): void {
    this.api.get<InterviewSlot[]>('/rh/agenda/slots/proposable').subscribe(s => this.proposableSlots.set(s));
  }

  isExpanded(applicationId: number): boolean {
    return this.expandedId() === applicationId;
  }
  expand(applicationId: number): void {
    this.expandedId.set(applicationId);
    if (!this.selections[applicationId]) this.selections[applicationId] = new Set();
  }
  collapse(applicationId: number): void {
    this.expandedId.set(null);
  }
  isSelected(applicationId: number, slotId: number): boolean {
    return this.selections[applicationId]?.has(slotId) ?? false;
  }
  toggleSelect(applicationId: number, slotId: number): void {
    if (!this.selections[applicationId]) this.selections[applicationId] = new Set();
    const set = this.selections[applicationId];
    if (set.has(slotId)) set.delete(slotId); else set.add(slotId);
  }

  createSlot(): void {
    if (!this.newSlotStart || !this.newSlotEnd) return;
    this.creatingSlot.set(true);
    const params = new URLSearchParams({
      start: new Date(this.newSlotStart).toISOString(),
      end: new Date(this.newSlotEnd).toISOString(),
      mode: this.newSlotMode,
    });
    this.api.post(`/rh/agenda/slots?${params.toString()}`, {}).subscribe({
      next: () => {
        this.creatingSlot.set(false);
        this.toast.success('Créneau créé');
        this.loadProposableSlots();
      },
      error: (err) => {
        this.creatingSlot.set(false);
        this.toast.error(err?.error?.error ?? 'Erreur');
      },
    });
  }

  sendInvitation(a: DecisionApplication): void {
    const slotIds = Array.from(this.selections[a.id] ?? []);
    if (slotIds.length === 0) return;
    this.sending.set(a.id);
    this.api.post(`/rh/applications/${a.id}/propose-slots`, {
      slotIds,
      interviewType: 'FINAL',
    }).subscribe({
      next: () => {
        this.sending.set(null);
        this.expandedId.set(null);
        this.selections[a.id] = new Set();
        this.toast.success('Invitation envoyée', this.candidateName(a));
        this.loadProposableSlots();
        this.loadProposedFinalSlots(a.id);
      },
      error: (err) => {
        this.sending.set(null);
        this.toast.error(err?.error?.error ?? "Erreur lors de l'envoi");
      },
    });
  }

  decide(a: DecisionApplication, decision: 'HIRED' | 'REJECTED'): void {
    this.processingId.set(a.id);
    this.api.put(`/recruteur/applications/${a.id}/stage`, {
      newStage: decision,
      comment: this.comments[a.id] ?? '',
    }).subscribe({
      next: () => {
        this.processingId.set(null);
        this.toast.success(decision === 'HIRED' ? 'Candidat embauché !' : 'Candidature rejetée', this.candidateName(a));
        this.load();
      },
      error: (err) => {
        this.processingId.set(null);
        this.toast.error(err?.error?.error ?? 'Erreur');
      },
    });
  }

  modeLabel(mode?: string): string {
    if (mode === 'TEAMS') return 'Teams';
    if (mode === 'PRESENTIEL') return 'Présentiel';
    return 'Visio';
  }

  candidateName(a: DecisionApplication): string {
    return a.candidate ? `${a.candidate.firstName} ${a.candidate.lastName}` : `Candidature #${a.id}`;
  }

  initials(a: DecisionApplication): string {
    if (!a.candidate) return '?';
    return `${a.candidate.firstName[0] ?? ''}${a.candidate.lastName[0] ?? ''}`.toUpperCase();
  }
}
