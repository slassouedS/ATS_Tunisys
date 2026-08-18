import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/http/api.service';
import { ToastService } from '../../../core/toast/toast.service';

interface WizardStep {
  key: string;
  label: string;
}

/** Module 1 — Wizard "Nouvelle demande" en 6 étapes (pattern 6.1 du design system). */
@Component({
  selector: 'app-demand-create',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="card" style="max-width:680px">
      <div class="row" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h2 style="font-size:18px;font-weight:700">Nouvelle demande de recrutement</h2>
      </div>

      <div class="stepper">
        @for (s of steps; track s.key; let i = $index) {
          <div class="step-item" [class.done]="i < currentStep()" [class.act]="i === currentStep()">
            <div class="step-dot" [class.done]="i < currentStep()" [class.act]="i === currentStep()">
              {{ i < currentStep() ? '✓' : i + 1 }}
            </div>
            <div class="step-lbl">{{ s.label }}</div>
          </div>
          @if (i < steps.length - 1) {
            <div class="step-line" [class.done]="i < currentStep()"></div>
          }
        }
      </div>

      <div class="wiz-step">
        <form [formGroup]="form">
          <!-- Étape 1 : Titre -->
          @if (currentStep() === 0) {
            <h3 style="margin-bottom:8px">Étape 1/6 — Intitulé du poste</h3>
            <p style="font-size:12px;color:var(--gray-500);margin-bottom:16px">Le titre exact qui apparaîtra sur le portail carrière.</p>
            <div class="fg">
              <label class="fl">Intitulé du poste *</label>
              <input class="fi" formControlName="title" placeholder="ex: Lead Développeur Angular">
            </div>
            <div class="fg">
              <label class="fl">Département</label>
              <select class="fi fi-sel" formControlName="departmentId">
                @for (d of departments(); track d.id) {
                  <option [value]="d.id">{{ d.name }}</option>
                }
              </select>
            </div>
          }

          <!-- Étape 2 : Contrat -->
          @if (currentStep() === 1) {
            <h3 style="margin-bottom:8px">Étape 2/6 — Type de contrat</h3>
            <div class="fg">
              <label class="fl">Type de contrat</label>
              <select class="fi" formControlName="contractType">
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="Stage">Stage</option>
                <option value="Freelance">Freelance</option>
              </select>
            </div>
            <div class="fg">
              <label class="fl">Urgence</label>
              <select class="fi" formControlName="urgency">
                <option value="NORMAL">Normal</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          }

          <!-- Étape 3 : Missions -->
          @if (currentStep() === 2) {
            <h3 style="margin-bottom:8px">Étape 3/6 — Missions</h3>
            <p style="font-size:12px;color:var(--gray-500);margin-bottom:16px">Décrivez les missions principales du poste.</p>
            <div class="fg">
              <label class="fl">Missions</label>
              <textarea class="fi" rows="5" formControlName="missions"
                placeholder="ex: Concevoir et développer les interfaces Angular, encadrer une équipe de 3 développeurs..."></textarea>
            </div>
          }

          <!-- Étape 4 : Skills -->
          @if (currentStep() === 3) {
            <h3 style="margin-bottom:8px">Étape 4/6 — Compétences requises</h3>
            <p style="font-size:12px;color:var(--gray-500);margin-bottom:16px">
              Sélectionnez les compétences essentielles. Notre IA les utilisera pour le scoring.
            </p>
            <div class="fg">
              <label class="fl">Compétences techniques</label>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
                @for (skill of techSkills(); track skill) {
                  <span class="tag t-b">{{ skill }} <span style="cursor:pointer" (click)="removeSkill(skill)">✕</span></span>
                }
              </div>
              <input class="fi" placeholder="Tapez une compétence et Entrée..."
                     (keydown.enter)="addSkill($event)">
            </div>
            <div class="fg">
              <label class="fl">Années d'expérience minimum</label>
              <input class="fi" type="number" formControlName="minExperience" style="width:120px">
            </div>
            <div class="ai-box" style="margin-top:16px">
              <div class="ico">✦</div>
              <div>
                <div class="t">Suggestion IA</div>
                <div class="c">Pensez aussi à des compétences complémentaires comme l'architecture logicielle,
                  la performance web, ou le travail en méthodologie agile selon le poste.</div>
              </div>
            </div>
          }

          <!-- Étape 5 : Salaire -->
          @if (currentStep() === 4) {
            <h3 style="margin-bottom:8px">Étape 5/6 — Budget</h3>
            <div class="fg">
              <label class="fl">Budget (TND / mois)</label>
              <input class="fi" type="number" formControlName="budget" style="width:200px">
            </div>
          }

          <!-- Étape 6 : Validation -->
          @if (currentStep() === 5) {
            <h3 style="margin-bottom:8px">Étape 6/6 — Validation</h3>
            <p style="font-size:12px;color:var(--gray-500);margin-bottom:16px">Vérifiez les informations avant envoi au RH.</p>
            <div style="font-size:12.5px;line-height:2;color:var(--gray-700)">
              <div><b>Titre :</b> {{ form.value.title }}</div>
              <div><b>Contrat :</b> {{ form.value.contractType }} · {{ form.value.urgency === 'URGENT' ? 'Urgent' : 'Normal' }}</div>
              <div><b>Compétences :</b> {{ techSkills().join(', ') || '—' }}</div>
              <div><b>Expérience min. :</b> {{ form.value.minExperience || 0 }} ans</div>
              <div><b>Budget :</b> {{ form.value.budget || '—' }} TND/mois</div>
            </div>
            @if (success()) { <div class="success-box" style="margin-top:16px">Demande envoyée pour validation RH ✔</div> }
          }
        </form>

        <div style="display:flex;justify-content:space-between;margin-top:20px">
          <button class="btn btn-g" (click)="prev()" [disabled]="currentStep() === 0">← Précédent</button>
          @if (currentStep() < steps.length - 1) {
            <button class="btn btn-p" (click)="next()">Suivant →</button>
          } @else {
            <button class="btn btn-p" (click)="submit()" [disabled]="form.invalid || loading()">
              {{ loading() ? 'Envoi...' : 'Envoyer au RH ✓' }}
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`.success-box{background:var(--green-bg);color:var(--green);font-size:12px;padding:8px 10px;border-radius:var(--r-sm)}`],
})
export class DemandCreateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  steps: WizardStep[] = [
    { key: 'title', label: 'Titre' },
    { key: 'contract', label: 'Contrat' },
    { key: 'missions', label: 'Missions' },
    { key: 'skills', label: 'Skills' },
    { key: 'budget', label: 'Salaire' },
    { key: 'review', label: 'Validation' },
  ];

  currentStep = signal(0);
  loading = signal(false);
  success = signal(false);
  techSkills = signal<string[]>([]);
  departments = signal<{ id: number; name: string }[]>([]);

  form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    departmentId: [null as number | null, Validators.required],
    contractType: ['CDI'],
    urgency: ['NORMAL'],
    missions: [''],
    minExperience: [0],
    budget: [null as number | null],
  });

  ngOnInit(): void {
    this.api.get<{ id: number; name: string }[]>('/manager/departments').subscribe(depts => {
      this.departments.set(depts);
      if (depts.length > 0) this.form.patchValue({ departmentId: depts[0].id });
    });
  }

  next(): void {
    if (this.currentStep() < this.steps.length - 1) this.currentStep.update(s => s + 1);
  }

  prev(): void {
    if (this.currentStep() > 0) this.currentStep.update(s => s - 1);
  }

  addSkill(event: Event): void {
    event.preventDefault();
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();
    if (value && !this.techSkills().includes(value)) {
      this.techSkills.update(s => [...s, value]);
    }
    input.value = '';
  }

  removeSkill(skill: string): void {
    this.techSkills.update(s => s.filter(x => x !== skill));
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    const raw = this.form.getRawValue();

    // Assemble les infos du wizard dans profileDesc (le backend actuel n'a pas
    // de champs dedies contrat/missions/skills — evite une modification API
    // pour rester compatible avec le backend deploye).
    const profileDesc = [
      `Type de contrat : ${raw.contractType}`,
      raw.missions ? `Missions : ${raw.missions}` : '',
      this.techSkills().length ? `Compétences requises : ${this.techSkills().join(', ')}` : '',
      raw.minExperience ? `Expérience minimum : ${raw.minExperience} ans` : '',
    ].filter(Boolean).join('\n');

    this.api.post('/manager/demands', {
      title: raw.title,
      departmentId: raw.departmentId,
      profileDesc,
      budget: raw.budget,
      urgency: raw.urgency,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
        this.toast.success('Demande envoyée', 'En attente de validation RH');
        setTimeout(() => this.router.navigate(['/manager']), 1200);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.error ?? "Erreur lors de l'envoi");
      },
    });
  }
}
