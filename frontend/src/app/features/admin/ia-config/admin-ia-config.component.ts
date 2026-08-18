import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../../core/http/api.service';
import { ToastService } from '../../../core/toast/toast.service';

interface AiConfig {
  defaultAiScoreThreshold: number;
  llmModel: string;
  availableModels: string[];
  embeddingsEngine: string;
}

/** Module Admin — Configuration IA : seuil de score + choix du modele LLM
 *  on-premise, tous deux persistes en base et reellement appliques. */
@Component({
  selector: 'app-admin-ia-config',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page-hd">
      <div><div class="page-title">Configuration IA</div><div class="page-sub">Paramètres du scoring et du modèle LLM on-premise</div></div>
    </div>

    <div class="g2">
      <div class="card">
        <div class="card-hd"><span class="ico">⚙</span>Paramètres de scoring</div>
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="fg">
            <label class="fl">Seuil minimum score IA (%)</label>
            <input class="fi" type="number" min="0" max="100" formControlName="defaultAiScoreThreshold">
            <div style="font-size:11px;color:var(--gray-500);margin-top:3px">
              Valeur appliquée par défaut à toute nouvelle offre publiée (modifiable individuellement par offre).
            </div>
          </div>

          <div class="fg">
            <label class="fl">Modèle LLM (on-premise, via Ollama)</label>
            @if (config()?.availableModels?.length) {
              <select class="fi fi-sel" formControlName="llmModel">
                @for (m of config()!.availableModels; track m) {
                  <option [value]="m">{{ m }}</option>
                }
              </select>
              <div style="font-size:11px;color:var(--gray-500);margin-top:3px">
                Liste des modèles réellement téléchargés dans Ollama sur ce serveur.
              </div>
            } @else {
              <input class="fi" formControlName="llmModel" placeholder="ex: llama3.2:3b">
              <div style="font-size:11px;color:var(--amber);margin-top:3px">
                ⚠ Impossible de récupérer la liste des modèles installés (Ollama/ia-service indisponible) —
                saisissez le nom exact du modèle déjà téléchargé (<code>ollama pull &lt;modèle&gt;</code>).
              </div>
            }
          </div>

          @if (saved()) { <div class="success-box" style="margin-bottom:10px">Configuration enregistrée ✔</div> }
          <button class="btn btn-p" type="submit" style="width:100%;justify-content:center" [disabled]="form.invalid || saving()">
            {{ saving() ? 'Enregistrement...' : 'Sauvegarder configuration' }}
          </button>
        </form>
      </div>

      <div class="card">
        <div class="card-hd"><span class="ico">🤖</span>Moteurs IA actifs</div>
        @if (config(); as c) {
          <div style="display:flex;flex-direction:column;gap:10px;font-size:12.5px">
            <div style="display:flex;justify-content:space-between;padding:9px 11px;background:var(--gray-50);border-radius:var(--r-sm)">
              <span>Modèle LLM actuel</span><strong>{{ c.llmModel }}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;padding:9px 11px;background:var(--gray-50);border-radius:var(--r-sm)">
              <span>Moteur d'embeddings</span><strong>{{ c.embeddingsEngine }}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;padding:9px 11px;background:var(--gray-50);border-radius:var(--r-sm)">
              <span>Modèles disponibles</span><strong>{{ c.availableModels.length }}</strong>
            </div>
          </div>
          <div style="padding:10px 12px;background:var(--green-bg);border-radius:var(--r-sm);font-size:12px;color:var(--green);margin-top:10px">
            ✓ Fonctionnement 100% on-premise — aucune donnée candidat transmise à un service tiers.
          </div>
        }
        <div style="margin-top:10px;padding:9px 11px;background:var(--blue-bg);border-radius:var(--r-sm);font-size:11.5px;color:var(--blue)">
          Pour ajouter un nouveau modèle : <code>ollama pull &lt;nom-du-modèle&gt;</code> sur le serveur,
          puis rafraîchissez cette page — il apparaîtra dans la liste ci-dessus.
        </div>
      </div>
    </div>
  `,
  styles: [`.success-box{background:var(--green-bg);color:var(--green);font-size:12px;padding:8px 10px;border-radius:var(--r-sm)}`],
})
export class AdminIaConfigComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  config = signal<AiConfig | null>(null);
  saving = signal(false);
  saved = signal(false);

  form = this.fb.nonNullable.group({
    defaultAiScoreThreshold: [70, [Validators.required, Validators.min(0), Validators.max(100)]],
    llmModel: ['llama3.2:3b', Validators.required],
  });

  ngOnInit(): void {
    this.api.get<AiConfig>('/admin/ai-config').subscribe(c => {
      this.config.set(c);
      this.form.patchValue({
        defaultAiScoreThreshold: c.defaultAiScoreThreshold,
        llmModel: c.llmModel,
      });
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.api.put<AiConfig>('/admin/ai-config', this.form.getRawValue()).subscribe({
      next: (c) => {
        this.config.set(c);
        this.saving.set(false);
        this.saved.set(true);
        this.toast.success('Configuration IA mise à jour');
        setTimeout(() => this.saved.set(false), 3000);
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.error ?? 'Erreur');
      },
    });
  }
}
