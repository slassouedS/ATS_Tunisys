import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../../core/http/api.service';
import { ToastService } from '../../../core/toast/toast.service';

interface Demand {
  id: number;
  title: string;
  status: string;
  profileDesc?: string;
  budget?: number;
  urgency: string;
  createdAt: string;
}

interface Offer {
  id: number;
  title: string;
  status: string;
  demand: { id: number };
  publishedAt?: string;
}

/** Module 2 (Etape 3) — Creation et publication des offres, a partir des
 *  demandes validees. Cet ecran manquait : c'est lui qui fait apparaitre
 *  les offres sur le portail public une fois publiees. */
@Component({
  selector: 'app-rh-offers',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <div class="page-hd">
      <div><div class="page-title">Offres — Création & Publication</div><div class="page-sub">Demandes validées en attente de publication sur le portail</div></div>
    </div>

    <div class="gcol">
      @if (validatedDemands().length === 0) {
        <div class="card"><p style="font-size:12.5px;color:var(--gray-500)">Aucune demande validée en attente d'offre pour le moment.</p></div>
      }

      @for (d of validatedDemands(); track d.id) {
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:8px">
                <div style="font-size:14px;font-weight:700">{{ d.title }}</div>
                @if (d.urgency === 'URGENT') { <span class="tag t-r">Urgent</span> }
                @if (offerFor(d.id); as o) {
                  @if (o.status === 'PUBLISHED') {
                    <span class="tag t-g">✓ Publiée</span>
                  } @else {
                    <span class="tag t-a">● Brouillon (non publiée)</span>
                  }
                }
              </div>
              <div style="font-size:11.5px;color:var(--gray-500);margin-top:2px">Validée le {{ d.createdAt | date:'dd/MM/yyyy' }}</div>
            </div>

            @if (!offerFor(d.id)) {
              <button class="btn btn-p" (click)="openForm(d)">+ Créer l'offre</button>
            } @else if (offerFor(d.id)!.status !== 'PUBLISHED') {
              <button class="btn btn-grn" (click)="publish(offerFor(d.id)!)" [disabled]="publishingId() === offerFor(d.id)!.id">
                {{ publishingId() === offerFor(d.id)!.id ? '...' : '📢 Publier sur le portail' }}
              </button>
            }
          </div>

          @if (formOpenFor() === d.id) {
            <form [formGroup]="form" (ngSubmit)="createOffer(d)" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
              <div class="fg"><label class="fl">Titre de l'offre</label><input class="fi" formControlName="title"></div>
              <div class="fg"><label class="fl">Description</label><textarea class="fi fi-ta" formControlName="description"></textarea></div>
              <div class="fg"><label class="fl">Compétences requises</label><textarea class="fi fi-ta" formControlName="requirements"></textarea></div>
              <div class="fr">
                <div class="fg" style="flex:1"><label class="fl">Lieu</label><input class="fi" formControlName="location"></div>
                <div class="fg" style="flex:1">
                  <label class="fl">Type de contrat</label>
                  <select class="fi fi-sel" formControlName="contractType">
                    <option value="CDI">CDI</option><option value="CDD">CDD</option>
                    <option value="Stage">Stage</option><option value="Freelance">Freelance</option>
                  </select>
                </div>
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn btn-p" type="submit" [disabled]="form.invalid || creating()">
                  {{ creating() ? 'Création...' : "Créer l'offre (brouillon)" }}
                </button>
                <button class="btn btn-g" type="button" (click)="formOpenFor.set(null)">Annuler</button>
              </div>
            </form>
          }
        </div>
      }
    </div>
  `,
})
export class RhOffersComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  validatedDemands = signal<Demand[]>([]);
  offers = signal<Offer[]>([]);
  formOpenFor = signal<number | null>(null);
  creating = signal(false);
  publishingId = signal<number | null>(null);

  form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: ['', Validators.required],
    requirements: [''],
    location: ['Tunis'],
    contractType: ['CDI'],
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.get<Demand[]>('/rh/demands/validated').subscribe(d => this.validatedDemands.set(d));
    this.api.get<Offer[]>('/rh/offers').subscribe(o => this.offers.set(o));
  }

  offerFor(demandId: number): Offer | undefined {
    return this.offers().find(o => o.demand?.id === demandId);
  }

  openForm(d: Demand): void {
    this.form.patchValue({ title: d.title, description: d.profileDesc ?? '' });
    this.formOpenFor.set(d.id);
  }

  createOffer(d: Demand): void {
    if (this.form.invalid) return;
    this.creating.set(true);
    this.api.post('/rh/offers', { demandId: d.id, ...this.form.getRawValue() }).subscribe({
      next: () => {
        this.creating.set(false);
        this.formOpenFor.set(null);
        this.toast.success("Offre créée en brouillon — cliquez sur \"Publier\" pour la rendre visible");
        this.load();
      },
      error: (err) => {
        this.creating.set(false);
        this.toast.error(err?.error?.error ?? 'Erreur');
      },
    });
  }

  publish(o: Offer): void {
    this.publishingId.set(o.id);
    this.api.put(`/rh/offers/${o.id}/publish`, {}).subscribe({
      next: () => {
        this.publishingId.set(null);
        this.toast.success('Offre publiée sur le portail candidat !');
        this.load();
      },
      error: (err) => {
        this.publishingId.set(null);
        this.toast.error(err?.error?.error ?? 'Erreur');
      },
    });
  }
}
