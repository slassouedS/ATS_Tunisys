import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../../core/http/api.service';
import { JobOffer } from '../../../shared/models/job-offer.model';
import { CandidateAuthStore } from '../../../core/candidate-auth/candidate-auth.store';

/** Module 4 (Upload CV) + candidature — fidele au template : formulaire,
 *  dropzone, fiche de poste + workflow des etapes en sidebar.
 *  Un compte candidat est desormais OBLIGATOIRE pour postuler (evolution
 *  demandee par rapport au CDC initial "sans compte"), ce qui permet ensuite
 *  au candidat de suivre l'etat de sa candidature dans "Mon espace". */
@Component({
  selector: 'app-offer-apply',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    @if (offer(); as o) {
      <div style="max-width:1000px;margin:26px auto;padding:0 16px">
        <div class="page-hd">
          <div>
            <a routerLink="/portail" style="font-size:11.5px;color:var(--gray-500);text-decoration:none;display:inline-flex;align-items:center;gap:4px;margin-bottom:6px">← Retour aux offres</a>
            <div class="page-title">Postuler — {{ o.title }}</div><div class="page-sub">TUNISYS · {{ o.location }} · {{ o.contractType }}</div>
          </div>
        </div>

        @if (!candidateAuth.isAuthenticated()) {
          <div class="g75">
            <div class="card">
              <div class="card-hd"><span class="ico">🔒</span>Compte candidat requis pour postuler</div>
              <p style="font-size:12.5px;color:var(--gray-700);line-height:1.7;margin-bottom:16px">
                Pour postuler et suivre l'avancement de votre candidature (score IA, entretiens, décision),
                créez d'abord votre espace candidat — ça ne prend qu'une minute.
              </p>
              <div style="display:flex;gap:10px">
                <a [routerLink]="['/portail/inscription']" [queryParams]="{ returnUrl: '/portail/offre/' + o.id }"
                   class="btn btn-p" style="flex:1;justify-content:center">Créer mon compte</a>
                <a [routerLink]="['/portail/connexion']" [queryParams]="{ returnUrl: '/portail/offre/' + o.id }"
                   class="btn btn-g" style="flex:1;justify-content:center">J'ai déjà un compte</a>
              </div>
            </div>
            <div class="gcol">
              <div class="card card-sm">
                <div class="card-hd"><span class="ico">📋</span>Fiche de poste</div>
                <div style="font-size:12px;line-height:1.65;white-space:pre-line">{{ o.description }}</div>
              </div>
            </div>
          </div>
        } @else if (success()) {
          <div class="card" style="max-width:520px;margin:0 auto;text-align:center;padding:40px 32px">
            <div style="font-size:44px;margin-bottom:14px">✅</div>
            <div style="font-family:'DM Serif Display',serif;font-size:20px;margin-bottom:8px">Candidature envoyée avec succès !</div>
            <p style="font-size:13px;color:var(--gray-500);line-height:1.7;margin-bottom:22px">
              Votre CV a été analysé et votre candidature pour <strong>{{ o.title }}</strong> est bien enregistrée.
              Vous pouvez suivre son avancement à tout moment dans votre espace candidat.
            </p>
            <a routerLink="/portail/mon-espace" class="btn btn-p" style="justify-content:center">Suivre ma candidature →</a>
          </div>
        } @else {
          <div class="g75">
            <div>
              <form [formGroup]="form" (ngSubmit)="submit()">
                <div class="card">
                  <div class="card-hd"><span class="ico">👤</span>Vos informations</div>
                  <div style="background:var(--gray-50);border-radius:var(--r-sm);padding:10px 13px;font-size:12.5px;margin-bottom:10px">
                    Connecté en tant que <strong>{{ candidateAuth.displayName() }}</strong> ({{ candidateAuth.candidate()?.email }})
                  </div>
                  <div class="fg"><label class="fl">Téléphone</label><input class="fi" formControlName="phone"></div>
                </div>

                <div class="card" style="margin-top:14px">
                  <div class="card-hd"><span class="ico">📎</span>Documents — Upload CV</div>
                  <div class="drop-z" [class.drag]="dragOver()"
                       (dragover)="onDragOver($event)" (dragleave)="dragOver.set(false)" (drop)="onDrop($event)"
                       (click)="fileInput.click()">
                    <div class="drop-z-ico">📄</div>
                    <div class="drop-z-t">Glissez-déposez votre CV ici</div>
                    <div class="drop-z-s">Formats acceptés : PDF, DOCX · Taille max : 5 Mo</div>
                    <button type="button" class="btn btn-g btn-sm" style="margin-top:10px">Ou cliquez pour sélectionner</button>
                  </div>
                  <input #fileInput type="file" accept=".pdf,.docx" style="display:none" (change)="onFileSelected($event)">
                  @if (cvFileName()) {
                    <div style="margin-top:10px;padding:10px 13px;background:var(--green-bg);border:1px solid var(--green-b);border-radius:var(--r-sm);display:flex;align-items:center;gap:10px">
                      <span style="font-size:16px">📄</span>
                      <div><div style="font-weight:600;font-size:12.5px">{{ cvFileName() }}</div><div style="font-size:11px;color:var(--green)">✓ Chargé</div></div>
                    </div>
                  }
                @if (cvMissingError()) {
                  <div style="margin-top:10px;padding:10px 13px;background:var(--red-bg);border:1px solid var(--red-light);border-radius:var(--r-sm);font-size:12px;color:var(--red)">
                    Veuillez joindre votre CV avant d'envoyer votre candidature.
                  </div>
                }
                </div>

                @if (loading()) {
                  <div style="display:flex;align-items:center;gap:10px;margin-top:14px;padding:12px 14px;background:var(--blue-bg);border-radius:var(--r-sm)">
                    <div class="spinner"></div>
                    <div style="font-size:12.5px;color:var(--blue)">
                      Envoi de votre candidature et analyse du CV en cours... (quelques secondes)
                    </div>
                  </div>
                }
                @if (submitError()) {
                  <div style="margin-top:10px;padding:10px 13px;background:var(--red-bg);border:1px solid var(--red-light);border-radius:var(--r-sm);font-size:12px;color:var(--red)">
                    {{ submitError() }}
                  </div>
                }
                <button class="btn btn-p" type="submit" style="width:100%;justify-content:center;margin-top:14px;font-size:14px;padding:11px"
                        [disabled]="loading()">
                  {{ loading() ? 'Envoi en cours...' : 'Envoyer ma candidature →' }}
                </button>
              </form>
            </div>

            <div class="gcol">
              <div class="card card-sm">
                <div class="card-hd"><span class="ico">📋</span>Fiche de poste</div>
                <div style="font-size:12px;font-weight:700">{{ o.title }}</div>
                <div style="font-size:11.5px;color:var(--gray-500);margin-bottom:9px">{{ o.location }} · {{ o.contractType }}</div>
                <div style="font-size:12px;line-height:1.65;white-space:pre-line">{{ o.description }}</div>
              </div>
              <div class="card card-sm">
                <div class="card-hd"><span class="ico">📍</span>Processus de recrutement</div>
                <div class="wf">
                  <div class="wf-step act"><div class="wf-num">1</div><div class="wf-body"><div class="wf-lbl">Dépôt candidature</div><div class="wf-meta">Vous êtes ici</div></div></div>
                  <div class="wf-step"><div class="wf-num">2</div><div class="wf-body"><div class="wf-lbl">Analyse IA du CV</div><div class="wf-meta">Auto · &lt; 30 secondes</div></div></div>
                  <div class="wf-step"><div class="wf-num">3</div><div class="wf-body"><div class="wf-lbl">Test technique</div><div class="wf-meta">QCM en ligne</div></div></div>
                  <div class="wf-step"><div class="wf-num">4</div><div class="wf-body"><div class="wf-lbl">Entretien RH</div><div class="wf-meta">Visio · 45 min</div></div></div>
                  <div class="wf-step"><div class="wf-num">5</div><div class="wf-body"><div class="wf-lbl">Entretien technique</div><div class="wf-meta">Avec l'équipe</div></div></div>
                  <div class="wf-step"><div class="wf-num">6</div><div class="wf-body"><div class="wf-lbl">Décision finale</div><div class="wf-meta">Sous 2-3 semaines</div></div></div>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .success-box{background:var(--green-bg);color:var(--green);font-size:12px;padding:8px 10px;border-radius:var(--r-sm)}
    .spinner {
      width: 18px; height: 18px; border: 2.5px solid var(--blue-bg);
      border-top-color: var(--blue); border-radius: 50%;
      animation: spin 0.7s linear infinite; flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class OfferApplyComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  candidateAuth = inject(CandidateAuthStore);

  offer = signal<JobOffer | null>(null);
  loading = signal(false);
  success = signal(false);
  dragOver = signal(false);
  cvFileName = signal<string | null>(null);
  cvMissingError = signal(false);
  submitError = signal<string | null>(null);
  private cvFile: File | null = null;

  form = this.fb.nonNullable.group({
    phone: [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.api.get<JobOffer>(`/public/offers/${id}`).subscribe(o => this.offer.set(o));
  }

  onDragOver(e: DragEvent): void { e.preventDefault(); this.dragOver.set(true); }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) { this.cvFile = file; this.cvFileName.set(file.name); }
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file) { this.cvFile = file; this.cvFileName.set(file.name); }
  }

  submit(): void {
    const candidate = this.candidateAuth.candidate();
    if (!this.offer() || !candidate) return;
    if (!this.cvFile) {
      this.cvMissingError.set(true);
      return;
    }
    this.cvMissingError.set(false);
    this.submitError.set(null);
    this.loading.set(true);
    const raw = this.form.getRawValue();
    const formData = new FormData();
    formData.append('offerId', String(this.offer()!.id));
    formData.append('firstName', candidate.firstName);
    formData.append('lastName', candidate.lastName);
    formData.append('email', candidate.email);
    formData.append('phone', raw.phone ?? '');
    formData.append('gdprConsent', 'true'); // deja consenti a l'inscription du compte
    if (this.cvFile) formData.append('cv', this.cvFile);

    this.api.postFormData('/public/applications', formData).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.submitError.set(err?.error?.error ?? "Erreur lors de l'envoi de la candidature. Réessayez.");
      },
    });
  }
}
