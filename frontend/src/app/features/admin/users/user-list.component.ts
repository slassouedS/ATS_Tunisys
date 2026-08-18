import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../../core/http/api.service';
import { ToastService } from '../../../core/toast/toast.service';

interface AdminUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLoginAt?: string;
  role: { code: string };
}

/** Module 13 — Gestion des utilisateurs RBAC (fidele au template : tableau
 *  riche avec role, dernier acces, statut, actions). */
@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <div class="page-hd">
      <div><div class="page-title">Gestion des utilisateurs — RBAC</div><div class="page-sub">Contrôle d'accès basé sur les rôles · {{ users().length }} compte(s)</div></div>
      <div class="page-actions"><button class="btn btn-p" (click)="showForm.set(!showForm())">+ Ajouter utilisateur</button></div>
    </div>

    @if (showForm()) {
      <div class="card" style="max-width:520px;margin-bottom:16px">
        <div class="card-hd">Créer un utilisateur</div>
        <form [formGroup]="form" (ngSubmit)="create()">
          <div class="fr">
            <div class="fg" style="flex:1"><label class="fl">Prénom</label><input class="fi" formControlName="firstName"></div>
            <div class="fg" style="flex:1"><label class="fl">Nom</label><input class="fi" formControlName="lastName"></div>
          </div>
          <div class="fg"><label class="fl">Email</label><input class="fi" type="email" formControlName="email"></div>
          <div class="fg"><label class="fl">Mot de passe temporaire</label><input class="fi" type="password" formControlName="password"></div>
          <div class="fg">
            <label class="fl">Rôle</label>
            <select class="fi fi-sel" formControlName="roleCode">
              <option value="MANAGER">Manager</option>
              <option value="RH">Responsable RH</option>
              <option value="RECRUTEUR">Chargé de Recrutement</option>
              <option value="TECH">Responsable Technique</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </div>
          <button class="btn btn-p" type="submit" [disabled]="form.invalid">Créer</button>
        </form>
      </div>
    }

    <div class="card" style="padding:0;overflow:hidden">
      <table class="tbl">
        <thead><tr><th>Utilisateur</th><th>Rôle</th><th>Dernier accès</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          @for (u of users(); track u.id) {
            <tr>
              <td><div style="font-weight:700">{{ u.firstName }} {{ u.lastName }}</div><div style="font-size:11px;color:var(--gray-500)">{{ u.email }}</div></td>
              <td><span class="tag" [class]="roleTagClass(u.role.code)">{{ roleLabel(u.role.code) }}</span></td>
              <td style="font-size:11.5px;color:var(--gray-500)">{{ u.lastLoginAt ? (u.lastLoginAt | date:'dd/MM/yyyy HH:mm') : 'Jamais connecté' }}</td>
              <td>
                @if (u.isActive) { <span class="tag t-g">● Actif</span> }
                @else { <span class="tag t-r">● Désactivé</span> }
              </td>
              <td>
                @if (u.isActive) {
                  <button class="btn btn-dng btn-xs" (click)="deactivate(u)">Désactiver</button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class UserListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  users = signal<AdminUser[]>([]);
  showForm = signal(false);

  form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    roleCode: ['RECRUTEUR', Validators.required],
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.get<AdminUser[]>('/admin/users').subscribe(u => this.users.set(u));
  }

  roleLabel(code: string): string {
    const map: Record<string, string> = {
      MANAGER: 'Manager', RH: 'Responsable RH', RECRUTEUR: 'Chargé Recrutement',
      TECH: 'Responsable Technique', ADMIN: 'Administrateur',
    };
    return map[code] ?? code;
  }

  roleTagClass(code: string): string {
    const map: Record<string, string> = { MANAGER: 't-b', RH: 't-p', RECRUTEUR: 't-r', TECH: 't-b', ADMIN: 't-gr' };
    return map[code] ?? 't-gr';
  }

  create(): void {
    if (this.form.invalid) return;
    this.api.post('/admin/users', this.form.getRawValue()).subscribe({
      next: () => {
        this.form.reset({ roleCode: 'RECRUTEUR' });
        this.showForm.set(false);
        this.toast.success('Utilisateur créé');
        this.load();
      },
      error: (err) => this.toast.error(err?.error?.error ?? 'Erreur'),
    });
  }

  deactivate(u: AdminUser): void {
    this.api.put(`/admin/users/${u.id}/deactivate`, {}).subscribe({
      next: () => { this.toast.info('Utilisateur désactivé', `${u.firstName} ${u.lastName}`); this.load(); },
      error: (err) => this.toast.error(err?.error?.error ?? 'Erreur'),
    });
  }
}
