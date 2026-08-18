import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../../core/http/api.service';
import { ToastService } from '../../../core/toast/toast.service';

interface InterviewSlot {
  id: number;
  slotStart: string;
  slotEnd: string;
  mode: string;
  location?: string;
  isBooked: boolean;
  proposedForApplicationId?: number | null;
}

interface RhApplication {
  id: number;
  currentStage: string;
  aiScore?: number;
  candidate?: { firstName: string; lastName: string };
  offer?: { title: string };
}

interface InterviewInfo {
  id: number;
  interviewType: string;
  outcome: string;
  slot?: { slotStart: string; mode: string; location?: string };
}

/** Module 8 — Agenda & Planification (pattern 6.5 du design system) :
 *  configuration des disponibilites, proposition dirigee de creneaux a un
 *  candidat precis (Etape 7 du CDC), et verdict GO/NO-GO des entretiens RH. */
@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, DatePipe],
  template: `
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
        <div>
          <h2 style="font-size:16px;font-weight:700">Agenda &amp; Planification</h2>
          <p class="page-sub">Module 8 · Configuration de vos disponibilités</p>
        </div>
        <button class="btn btn-p" (click)="showForm.set(!showForm())">+ Bloquer un créneau</button>
      </div>

      @if (showForm()) {
        <form [formGroup]="form" (ngSubmit)="createSlot()" style="background:var(--gray-50);border-radius:var(--r-md);padding:16px;margin-bottom:20px">
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
          <button class="btn btn-p btn-sm" type="submit" [disabled]="form.invalid || creating()">
            {{ creating() ? 'Création...' : 'Créer le créneau' }}
          </button>
        </form>
      }

      <h3 style="margin-bottom:12px">Mes créneaux</h3>
      @if (slots().length === 0) {
        <p style="font-size:12.5px;color:var(--gray-500)">Aucun créneau configuré pour le moment.</p>
      }
      <div class="g3">
        @for (slot of slots(); track slot.id) {
          <div class="card card-sm" style="border-color:var(--red-light)">
            <div style="font-size:18px;font-weight:700;color:var(--gray-900)">
              {{ slot.slotStart | date:'HH:mm' }}
            </div>
            <div style="font-size:11.5px;color:var(--gray-500)">
              {{ slot.slotStart | date:'EEE d MMM' }} · {{ modeLabel(slot.mode) }}
            </div>
            <div style="font-size:11.5px;margin-top:4px" [style.color]="slotStatusColor(slot)">
              {{ slotStatusLabel(slot) }}
            </div>
          </div>
        }
      </div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <h2 style="font-size:16px;font-weight:700;margin-bottom:4px">Planifier un entretien RH</h2>
      <p class="page-sub" style="margin-bottom:16px">Candidats ayant réussi le test technique — proposez-leur des créneaux</p>

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
                  <p style="font-size:12px;color:var(--gray-500)">Aucun créneau libre — créez-en d'abord dans "Mes créneaux" ci-dessus.</p>
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

    <div class="card">
      <h2 style="font-size:16px;font-weight:700;margin-bottom:4px">Entretiens RH à évaluer</h2>
      <p class="page-sub" style="margin-bottom:16px">Candidats ayant confirmé un créneau — donnez votre avis GO / NO-GO</p>

      @if (rhInterviewApplications().length === 0) {
        <p style="font-size:12.5px;color:var(--gray-500)">Aucun entretien RH en attente d'évaluation.</p>
      }
      <div class="gcol">
        @for (a of rhInterviewApplications(); track a.id) {
          <div style="border:1px solid var(--border);border-radius:var(--r-lg);padding:16px 18px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px">
              <div style="display:flex;gap:12px;align-items:center">
                <div class="av" style="background:var(--red)">{{ initials(a) }}</div>
                <div>
                  <div style="font-size:14px;font-weight:700">{{ candidateName(a) }}</div>
                  <div style="font-size:12px;color:var(--gray-500)">Entretien RH — {{ a.offer?.title }}</div>
                </div>
              </div>
              @if (rhInterview(a.id); as itv) {
                <span class="tag t-g">📅 {{ itv.slot?.slotStart | date:'EEE d MMM, HH:mm' }} · {{ modeLabel(itv.slot?.mode) }}</span>
              }
            </div>

            <div class="fg">
              <label class="fl">Compte-rendu de l'entretien RH</label>
              <textarea class="fi fi-ta" [(ngModel)]="reports[a.id]" [ngModelOptions]="{standalone:true}"
                        placeholder="Cultural fit, motivation, cohérence du parcours..."></textarea>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end">
              <button class="btn btn-grn" (click)="submitOutcome(a, 'GO')" [disabled]="processingId() === a.id">
                ✓ GO — Vers entretien technique
              </button>
              <button class="btn btn-dng" (click)="submitOutcome(a, 'NO_GO')" [disabled]="processingId() === a.id">
                ✗ NO-GO — Rejeter
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class AgendaComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  slots = signal<InterviewSlot[]>([]);
  proposableSlots = signal<InterviewSlot[]>([]);
  toScheduleApplications = signal<RhApplication[]>([]);
  rhInterviewApplications = signal<RhApplication[]>([]);
  proposedSlots = signal<Record<number, InterviewSlot[]>>({});
  interviews = signal<Record<number, InterviewInfo[]>>({});

  showForm = signal(false);
  creating = signal(false);
  sending = signal<number | null>(null);
  processingId = signal<number | null>(null);
  expandedId = signal<number | null>(null);

  selections: Record<number, Set<number>> = {};
  reports: Record<number, string> = {};

  form = this.fb.nonNullable.group({
    start: ['', Validators.required],
    end: ['', Validators.required],
    mode: ['VISIO'],
  });

  ngOnInit(): void {
    this.load();
    this.loadApplications();
  }

  load(): void {
    this.api.get<InterviewSlot[]>('/recruteur/agenda/slots').subscribe(s => this.slots.set(s));
    this.api.get<InterviewSlot[]>('/recruteur/agenda/slots/proposable').subscribe(s => this.proposableSlots.set(s));
  }

  loadApplications(): void {
    this.api.get<RhApplication[]>('/recruteur/applications').subscribe(all => {
      const toSchedule = all.filter(x => x.currentStage === 'ASSESSMENT_DONE');
      const inRh = all.filter(x => x.currentStage === 'RH_INTERVIEW');
      this.toScheduleApplications.set(toSchedule);
      this.rhInterviewApplications.set(inRh);
      toSchedule.forEach(app => this.loadProposedSlots(app.id));
      inRh.forEach(app => this.loadInterviews(app.id));
    });
  }

  loadProposedSlots(applicationId: number): void {
    this.api.get<InterviewSlot[]>(`/public/applications/${applicationId}/proposed-slots`).subscribe(list => {
      this.proposedSlots.update(m => ({ ...m, [applicationId]: list }));
    });
  }

  loadInterviews(applicationId: number): void {
    this.api.get<InterviewInfo[]>(`/recruteur/applications/${applicationId}/interviews`).subscribe(list => {
      this.interviews.update(m => ({ ...m, [applicationId]: list }));
    });
  }

  rhInterview(applicationId: number): InterviewInfo | undefined {
    return (this.interviews()[applicationId] ?? []).find(i => i.interviewType === 'RH');
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

  sendInvitation(a: RhApplication): void {
    const slotIds = Array.from(this.selections[a.id] ?? []);
    if (slotIds.length === 0) return;
    this.sending.set(a.id);
    this.api.post(`/recruteur/applications/${a.id}/propose-slots`, {
      slotIds,
      interviewType: 'RH',
    }).subscribe({
      next: () => {
        this.sending.set(null);
        this.expandedId.set(null);
        this.selections[a.id] = new Set();
        this.toast.success('Invitation envoyée', this.candidateName(a));
        this.load();
        this.loadProposedSlots(a.id);
      },
      error: (err) => {
        this.sending.set(null);
        this.toast.error(err?.error?.error ?? 'Erreur lors de l\'envoi');
      },
    });
  }

  createSlot(): void {
    if (this.form.invalid) return;
    this.creating.set(true);
    const raw = this.form.getRawValue();
    const params = new URLSearchParams({
      start: new Date(raw.start).toISOString(),
      end: new Date(raw.end).toISOString(),
      mode: raw.mode,
    });
    this.api.post(`/recruteur/agenda/slots?${params.toString()}`, {}).subscribe({
      next: () => {
        this.creating.set(false);
        this.showForm.set(false);
        this.toast.success('Créneau créé');
        this.load();
      },
      error: (err) => {
        this.creating.set(false);
        this.toast.error(err?.error?.error ?? 'Erreur lors de la création du créneau');
      },
    });
  }

  submitOutcome(a: RhApplication, outcome: 'GO' | 'NO_GO'): void {
    this.processingId.set(a.id);
    this.api.post(`/recruteur/applications/${a.id}/interview-outcome`, {
      outcome,
      report: this.reports[a.id] ?? '',
    }).subscribe({
      next: () => {
        this.processingId.set(null);
        this.toast.success(outcome === 'GO' ? 'Candidat envoyé en entretien technique' : 'Candidature rejetée', this.candidateName(a));
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

  candidateName(a: RhApplication): string {
    return a.candidate ? `${a.candidate.firstName} ${a.candidate.lastName}` : `#${a.id}`;
  }
  initials(a: RhApplication): string {
    return a.candidate ? `${a.candidate.firstName[0] ?? ''}${a.candidate.lastName[0] ?? ''}`.toUpperCase() : '?';
  }
}
