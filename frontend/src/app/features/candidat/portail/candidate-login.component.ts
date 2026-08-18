import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/http/api.service';
import { CandidateAuthStore } from '../../../core/candidate-auth/candidate-auth.store';

/** Connexion candidat (compte optionnel). */
@Component({
  selector: 'app-candidate-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo"><img src="/assets/logo-tunisys.png" alt="TUNISYS" class="logo-img"></div>
        <div class="login-title">Mon espace candidat</div>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="fg"><label class="fl">Email</label><input class="fi" type="email" formControlName="email"></div>
          <div class="fg"><label class="fl">Mot de passe</label><input class="fi" type="password" formControlName="password"></div>
          @if (error()) { <div class="error-box">{{ error() }}</div> }
          <button class="btn btn-p" type="submit" style="width:100%;justify-content:center;margin-top:8px" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Connexion...' : 'Se connecter' }}
          </button>
        </form>
        <div style="text-align:center;margin-top:14px;font-size:12px;color:var(--gray-500)">
          Pas encore de compte ? <a routerLink="/portail/inscription" style="color:var(--red);font-weight:600">Créer un compte</a>
        </div>
        <div style="text-align:center;margin-top:6px;font-size:11.5px;color:var(--gray-500)">
          Ou <a routerLink="/portail/mon-espace" style="color:var(--gray-700)">suivre une candidature sans compte</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, var(--red-bg) 0%, var(--gray-50) 100%); }
    .login-card { background: #fff; border-radius: var(--r-xl); padding: 36px 32px; width: 380px; box-shadow: var(--shadow-lg); }
    .login-logo { margin-bottom: 18px; }
    .logo-img { height: 30px; }
    .login-title { font-size: 15px; font-weight: 700; margin-bottom: 20px; }
    .error-box { background: var(--red-bg); color: var(--red); font-size: 12px; padding: 8px 10px; border-radius: var(--r-sm); margin-bottom: 8px; }
  `],
})
export class CandidateLoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly candidateAuth = inject(CandidateAuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  loading = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.post<any>('/public/candidate/login', this.form.getRawValue()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.candidateAuth.setSession(res);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(returnUrl ?? '/portail/mon-espace');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error ?? 'Identifiants invalides');
      },
    });
  }
}
