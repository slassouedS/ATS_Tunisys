import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../../core/http/api.service';
import { ToastService } from '../../../core/toast/toast.service';
import { RecruitmentDemand } from '../../../shared/models/demand.model';

/** Module 1 — Validation des demandes RH (fidele au template : carte demande
 *  avec urgence, actions Valider/Modifier/Refuser, encart analyse IA). */
@Component({
  selector: 'app-rh-demands',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="page-hd">
      <div>
        <div class="page-title">Validation des demandes</div>
        <div class="page-sub">{{ demands().length }} demande(s) en attente de votre décision</div>
      </div>
    </div>

    <div class="gcol">
      @if (demands().length === 0) {
        <div class="card"><p style="font-size:12.5px;color:var(--gray-500)">Aucune demande en attente 🎉</p></div>
      }
      @for (d of demands(); track d.id) {
        <div class="demand-c" [class.urgent]="d.urgency === 'URGENT'">
          <div style="display:flex;align-items:flex-start;gap:14px">
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <div style="font-size:14px;font-weight:700">{{ d.title }}</div>
                @if (d.urgency === 'URGENT') { <span class="tag t-r">Urgent</span> }
              </div>
              <div style="font-size:12px;color:var(--gray-500)">Créée le {{ d.createdAt | date:'dd/MM/yyyy' }}</div>
              @if (d.profileDesc) {
                <div style="font-size:12px;margin-top:6px;line-height:1.6;color:var(--gray-700);white-space:pre-line">{{ d.profileDesc }}</div>
              }
              @if (d.budget) {
                <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:7px">
                  <span class="tag t-gr">Budget : {{ d.budget }} TND</span>
                </div>
              }
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
              <button class="btn btn-grn" (click)="approve(d)" [disabled]="processingId() === d.id">
                {{ processingId() === d.id ? '...' : '✓ Valider' }}
              </button>
              <button class="btn btn-dng btn-sm" (click)="openReject(d)">✗ Refuser</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class RhDemandsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  demands = signal<RecruitmentDemand[]>([]);
  processingId = signal<number | null>(null);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.get<RecruitmentDemand[]>('/rh/demands/pending').subscribe(d => this.demands.set(d));
  }

  approve(d: RecruitmentDemand): void {
    this.processingId.set(d.id);
    this.api.put(`/rh/demands/${d.id}/validate`, { approve: true }).subscribe({
      next: () => {
        this.processingId.set(null);
        this.toast.success('Demande validée', d.title);
        this.load();
      },
      error: (err) => {
        this.processingId.set(null);
        this.toast.error(err?.error?.error ?? 'Erreur');
      },
    });
  }

  openReject(d: RecruitmentDemand): void {
    const reason = window.prompt('Motif du refus :', 'Non prioritaire pour le moment');
    if (reason === null) return;
    this.processingId.set(d.id);
    this.api.put(`/rh/demands/${d.id}/validate`, { approve: false, rejectionReason: reason }).subscribe({
      next: () => {
        this.processingId.set(null);
        this.toast.info('Demande refusée', d.title);
        this.load();
      },
      error: (err) => {
        this.processingId.set(null);
        this.toast.error(err?.error?.error ?? 'Erreur');
      },
    });
  }
}
