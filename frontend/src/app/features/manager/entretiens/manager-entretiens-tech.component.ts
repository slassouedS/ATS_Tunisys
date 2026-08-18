import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/http/api.service';
import { ToastService } from '../../../core/toast/toast.service';

interface TechApplication {
  id: number;
  currentStage: string;
  aiScore?: number;
  candidate?: { firstName: string; lastName: string };
  offer?: { id: number; title: string };
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

interface InterviewInfo {
  id: number;
  interviewType: string;
  outcome: string;
  slot?: { slotStart: string; mode: string; location?: string };
}


/** Onglet Manager — Entretiens techniques : le compte Responsable Technique
 *  n'etant pas active chez TUNISYS, le Manager assure l'interim (planification
 *  des creneaux, entretien, et verdict GO/NO-GO qui fait avancer le pipeline
 *  vers FINAL_REVIEW). Consomme les memes endpoints /api/technique/** (le
 *  Manager y a acces via SecurityConfig — voir hasAnyRole("TECH", "MANAGER")). */
@Component({
  selector: 'app-manager-entretiens-tech',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, DatePipe],
  template: `
    <div class="page-hd">
      <div><div class="page-title">Mes entretiens</div><div class="page-sub">Candidats en cours d'entretien technique</div></div>
    </div>

    @if (filterOfferId()) {
      <div class="card" style="margin-bottom:16px;background:var(--red-bg);border-color:var(--red-light);display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:12.5px">🔍 Filtré sur l'offre sélectionnée depuis le tableau de bord</span>
        <button class="btn btn-g btn-sm" (click)="clearFilter(); loadApplications()">Voir toutes les offres</button>
      </div>
    }

    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
        <div>
          <h2 style="font-size:16px;font-weight:700">Mes disponibilités</h2>
          <p class="page-sub">Proposez des créneaux pour vos entretiens techniques</p>
        </div>
        <button class="btn btn-p" (click)="showForm.set(!showForm())">+ Proposer un créneau</button>
      </div>

      @if (showForm()) {
        <form [formGroup]="slotForm" (ngSubmit)="createSlot()" style="background:var(--gray-50);border-radius:var(--r-md);padding:16px;margin-bottom:16px">
          <div class="fr">
            <div class="fg" style="flex:1">
              <label class="fl">Début</label>
              <input class="fi" type="datetime-local" formControlName="start">
            </div>
            <div class="fg" style="flex:1">
              <label class="fl">Fin</label>
              <input class="fi" type="datetime-local" formControlName="end">
            </div>
            <div class="fg" style="flex:1">
              <label class="fl">Mode</label>
              <select class="fi" formControlName="mode">
                <option value="VISIO">Visio</option>
                <option value="TEAMS">Teams</option>
                <option value="PRESENTIEL">Présentiel</option>
              </select>
            </div>
          </div>
          <button class="btn btn-p btn-sm" type="submit" [disabled]="slotForm.invalid || creatingSlot()">
            {{ creatingSlot() ? 'Création...' : 'Créer le créneau' }}
          </button>
        </form>
      }

      @if (slots().length === 0) {
        <p style="font-size:12.5px;color:var(--gray-500)">Aucun créneau configuré pour le moment.</p>
      } @else {
        <div class="g3">
          @for (slot of slots(); track slot.id) {
            <div class="card card-sm" style="border-color:var(--red-light)">
              <div style="font-size:18px;font-weight:700">{{ slot.slotStart | date:'HH:mm' }}</div>
              <div style="font-size:11.5px;color:var(--gray-500)">{{ slot.slotStart | date:'EEE d MMM' }} · {{ modeLabel(slot.mode) }}</div>
              <div style="font-size:11.5px;margin-top:4px" [style.color]="slotStatusColor(slot)">
                {{ slotStatusLabel(slot) }}
              </div>
            </div>
          }
        </div>
      }
    </div>

    <div class="card" style="margin-bottom:20px">
      <h2 style="font-size:16px;font-weight:700;margin-bottom:4px">Planifier un entretien technique</h2>
      <p class="page-sub" style="margin-bottom:16px">Candidats validés par le RH — proposez-leur des créneaux</p>

      @if (toScheduleApplications().length === 0) {
        <p style="font-size:12.5px;color:var(--gray-500)">Aucun candidat en attente de planification.</p>
      }
      <div class="gcol">
        @for (a of toScheduleApplications(); track a.id) {
          <div style="border:1px solid var(--border);border-radius:var(--r-lg);padding:16px 18px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px">
              <div style="display:flex;gap:12px;align-items:center">
                <div class="av" style="background:var(--red)">{{ initials(a) }}</div>
                <div>
                  <div style="font-size:14px;font-weight:700">{{ candidateName(a) }}</div>
                  <div style="font-size:12px;color:var(--gray-500)">{{ a.offer?.title }} · Score IA {{ a.aiScore ?? 0 }}%</div>
                </div>
              </div>
              @if (!isExpanded(a.id) && (proposedSlots()[a.id] ?? []).length === 0) {
                <button class="btn btn-p btn-sm" (click)="expand(a.id)">Proposer des créneaux</button>
              }
            </div>

            @if ((proposedSlots()[a.id] ?? []).length > 0) {
              <div style="background:var(--amber-bg);border-radius:var(--r-md);padding:10px 12px;font-size:12.5px">
                ⏳ En attente du choix du candidat parmi {{ (proposedSlots()[a.id] ?? []).length }} créneau(x) proposé(s)
              </div>
            }

            @if (isExpanded(a.id)) {
              <div style="background:var(--gray-50);border-radius:var(--r-md);padding:14px;margin-top:8px">
                @if (proposableSlots().length === 0) {
                  <p style="font-size:12px;color:var(--gray-500)">Aucun créneau libre — créez-en d'abord dans "Mes disponibilités" ci-dessus.</p>
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
                  <button class="btn btn-p btn-sm" (click)="sendInvitation(a)"
                          [disabled]="(selections[a.id]?.size ?? 0) === 0 || sending() === a.id">
                    {{ sending() === a.id ? 'Envoi...' : '📨 Envoyer invitation (' + (selections[a.id]?.size ?? 0) + ')' }}
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>

    @if (interviewApplications().length === 0) {
      <div class="card"><p style="font-size:12.5px;color:var(--gray-500)">Aucun entretien technique confirmé en attente d'évaluation.</p></div>
    }
    <div class="gcol">
      @for (a of interviewApplications(); track a.id) {
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px">
            <div style="display:flex;gap:12px;align-items:center">
              <div class="av" style="background:var(--red)">{{ initials(a) }}</div>
              <div>
                <div style="font-size:14px;font-weight:700">{{ candidateName(a) }}</div>
                <div style="font-size:12px;color:var(--gray-500)">Entretien technique — {{ a.offer?.title }}</div>
                <div style="font-size:12px;color:var(--red);font-weight:600;margin-top:2px">Score IA : {{ a.aiScore ?? 0 }}%</div>
              </div>
            </div>
            @if (techInterview(a.id); as itv) {
              <span class="tag t-g">📅 {{ itv.slot?.slotStart | date:'EEE d MMM, HH:mm' }} · {{ modeLabel(itv.slot?.mode) }}</span>
            }
          </div>

          <div style="background:var(--gray-50);border-radius:var(--r-md);padding:14px;margin-top:10px;text-align:center">
            <p style="font-size:12px;color:var(--gray-500);margin-bottom:10px">
              Une fois l'entretien mené, remplissez la grille d'évaluation détaillée.
            </p>
            <button class="btn btn-p" (click)="openGrid(a)">
              📋 Ouvrir la grille d'évaluation technique →
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ManagerEntretiensTechComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  filterOfferId = signal<number | null>(null);

  slots = signal<InterviewSlot[]>([]);
  proposableSlots = signal<InterviewSlot[]>([]);
  toScheduleApplications = signal<TechApplication[]>([]);
  interviewApplications = signal<TechApplication[]>([]);
  proposedSlots = signal<Record<number, InterviewSlot[]>>({});
  interviews = signal<Record<number, InterviewInfo[]>>({});

  showForm = signal(false);
  creatingSlot = signal(false);
  sending = signal<number | null>(null);
  processingId = signal<number | null>(null);
  expandedId = signal<number | null>(null);

  selections: Record<number, Set<number>> = {};
  reports: Record<number, string> = {};

  slotForm = this.fb.nonNullable.group({
    start: ['', Validators.required],
    end: ['', Validators.required],
    mode: ['VISIO'],
  });

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap.get('offerId');
    if (qp) this.filterOfferId.set(Number(qp));
    this.loadApplications();
    this.loadSlots();
  }

  clearFilter(): void {
    this.filterOfferId.set(null);
  }

  loadApplications(): void {
    this.api.get<TechApplication[]>('/technique/shortlists').subscribe(all => {
      let inTech = all.filter(x => x.currentStage === 'TECH_INTERVIEW');
      const offerId = this.filterOfferId();
      if (offerId) {
        inTech = inTech.filter(x => x.offer?.id === offerId);
      }
      this.toScheduleApplications.set(inTech);
      this.interviewApplications.set([]);
      inTech.forEach(app => {
        this.loadProposedSlots(app.id);
        this.loadInterviews(app.id);
      });
    });
  }

  loadProposedSlots(applicationId: number): void {
    this.api.get<InterviewSlot[]>(`/public/applications/${applicationId}/proposed-slots`).subscribe(list => {
      this.proposedSlots.update(m => ({ ...m, [applicationId]: list }));
    });
  }

  loadInterviews(applicationId: number): void {
    this.api.get<InterviewInfo[]>(`/technique/applications/${applicationId}/interviews`).subscribe(list => {
      this.interviews.update(m => ({ ...m, [applicationId]: list }));
      const hasTechInterview = list.some(i => i.interviewType === 'TECHNIQUE');
      if (hasTechInterview) {
        const app = this.toScheduleApplications().find(a => a.id === applicationId);
        if (app && !this.interviewApplications().some(a => a.id === applicationId)) {
          this.interviewApplications.update(arr => [...arr, app]);
        }
        // Retire ce candidat de la liste "à planifier" — son entretien est deja confirme.
        this.toScheduleApplications.update(arr => arr.filter(a => a.id !== applicationId));
      }
    });
  }

  loadSlots(): void {
    this.api.get<InterviewSlot[]>('/technique/agenda/slots').subscribe(s => this.slots.set(s));
    this.api.get<InterviewSlot[]>('/technique/agenda/slots/proposable').subscribe(s => this.proposableSlots.set(s));
  }

  techInterview(applicationId: number): InterviewInfo | undefined {
    return (this.interviews()[applicationId] ?? []).find(i => i.interviewType === 'TECHNIQUE');
  }

  openGrid(a: TechApplication): void {
    const itv = this.techInterview(a.id);
    this.router.navigate(['/manager/entretiens-techniques', a.id, 'grille'], {
      state: {
        candidateName: this.candidateName(a),
        offerTitle: a.offer?.title,
        aiScore: a.aiScore,
        interviewDate: itv?.slot?.slotStart
          ? new Date(itv.slot.slotStart).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
          : undefined,
      },
    });
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
    this.selections[applicationId] = new Set();
  }
  isSelected(applicationId: number, slotId: number): boolean {
    return this.selections[applicationId]?.has(slotId) ?? false;
  }
  toggleSelect(applicationId: number, slotId: number): void {
    if (!this.selections[applicationId]) this.selections[applicationId] = new Set();
    const set = this.selections[applicationId];
    if (set.has(slotId)) set.delete(slotId); else set.add(slotId);
  }

  sendInvitation(a: TechApplication): void {
    const slotIds = Array.from(this.selections[a.id] ?? []);
    if (slotIds.length === 0) return;
    this.sending.set(a.id);
    this.api.post(`/technique/applications/${a.id}/propose-slots`, {
      slotIds,
      interviewType: 'TECHNIQUE',
    }).subscribe({
      next: () => {
        this.sending.set(null);
        this.expandedId.set(null);
        this.selections[a.id] = new Set();
        this.toast.success('Invitation envoyée', this.candidateName(a));
        this.loadSlots();
        this.loadProposedSlots(a.id);
      },
      error: (err) => {
        this.sending.set(null);
        this.toast.error(err?.error?.error ?? 'Erreur lors de l\'envoi');
      },
    });
  }

  createSlot(): void {
    if (this.slotForm.invalid) return;
    this.creatingSlot.set(true);
    const raw = this.slotForm.getRawValue();
    const params = new URLSearchParams({
      start: new Date(raw.start).toISOString(),
      end: new Date(raw.end).toISOString(),
      mode: raw.mode,
    });
    this.api.post(`/technique/agenda/slots?${params.toString()}`, {}).subscribe({
      next: () => {
        this.creatingSlot.set(false);
        this.showForm.set(false);
        this.toast.success('Créneau créé');
        this.loadSlots();
      },
      error: (err) => {
        this.creatingSlot.set(false);
        this.toast.error(err?.error?.error ?? 'Erreur lors de la création du créneau');
      },
    });
  }

  submitOutcome(a: TechApplication, outcome: 'GO' | 'NO_GO'): void {
    this.processingId.set(a.id);
    this.api.post(`/technique/applications/${a.id}/interview-outcome`, {
      outcome,
      report: this.reports[a.id] ?? '',
    }).subscribe({
      next: () => {
        this.processingId.set(null);
        this.toast.success(outcome === 'GO' ? 'Candidat validé, envoyé en revue finale RH' : 'Candidature rejetée', this.candidateName(a));
        this.loadApplications();
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

  slotStatusLabel(slot: InterviewSlot): string {
    if (slot.isBooked) return '✓ Réservé';
    if (slot.proposedForApplicationId) return '⏳ Proposé, en attente';
    return '● Libre';
  }
  slotStatusColor(slot: InterviewSlot): string {
    if (slot.isBooked) return 'var(--amber)';
    if (slot.proposedForApplicationId) return 'var(--blue, #3b82f6)';
    return 'var(--green)';
  }

  candidateName(a: TechApplication): string {
    return a.candidate ? `${a.candidate.firstName} ${a.candidate.lastName}` : `#${a.id}`;
  }
  initials(a: TechApplication): string {
    return a.candidate ? `${a.candidate.firstName[0] ?? ''}${a.candidate.lastName[0] ?? ''}`.toUpperCase() : '?';
  }
}
