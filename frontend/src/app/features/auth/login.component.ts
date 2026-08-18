import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">
          <img src="/assets/logo-tunisys.png" alt="TUNISYS" class="logo-img">
        </div>
        <div class="login-title">Plateforme de Recrutement Intelligent</div>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="fg">
            <label class="fl">Email professionnel</label>
            <input class="fi" type="email" formControlName="email" placeholder="prenom.nom@tunisys.com">
          </div>
          <div class="fg">
            <label class="fl">Mot de passe</label>
            <input class="fi" type="password" formControlName="password">
          </div>
          @if (error()) {
            <div class="error-box">{{ error() }}</div>
          }
          <button class="btn btn-p" type="submit" style="width:100%; justify-content:center; margin-top:8px;"
                  [disabled]="form.invalid || loading()">
            {{ loading() ? 'Connexion...' : 'Se connecter' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, var(--red-bg) 0%, var(--gray-50) 100%); }
    .login-card { background: #fff; border-radius: var(--r-xl); padding: 36px 32px;
      width: 360px; box-shadow: var(--shadow-lg); }
    .login-logo { display: flex; align-items: center; margin-bottom: 18px; }
    .logo-img { height: 34px; width: auto; }
    .login-title { font-size: 13px; color: var(--gray-500); margin-bottom: 22px; }
    .error-box { background: var(--red-bg); color: var(--red); font-size: 12px;
      padding: 8px 10px; border-radius: var(--r-sm); margin-bottom: 8px; }
  `],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.authService.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.authService.redirectAfterLogin();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error ?? 'Identifiants invalides');
      },
    });
  }
}
