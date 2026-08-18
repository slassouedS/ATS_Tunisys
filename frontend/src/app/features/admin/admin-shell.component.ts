import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopbarComponent } from '../../core/layout/topbar.component';
import { SidebarComponent } from '../../core/layout/sidebar.component';
import { AuthStore } from '../../core/auth/auth.store';
import { AuthService } from '../../core/auth/auth.service';
import { SidebarItem } from '../../core/layout/sidebar-item.model';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, TopbarComponent, SidebarComponent],
  template: `
    <app-topbar roleLabel="⚙ Administrateur Système" [initials]="authStore.avatarInitials()"
                (logout)="authService.logout()">
      <button class="nt">Console Admin</button>
    </app-topbar>
    <div class="layout">
      <app-sidebar sectionTitle="Administration" [items]="items"></app-sidebar>
      <main class="main"><router-outlet></router-outlet></main>
    </div>
  `,
  styles: [`
    .layout { display: flex; min-height: calc(100vh - 54px); }
    .main { flex: 1; padding: 22px 26px; overflow-y: auto; }
    .nt { padding: 5px 13px; border: none; background: transparent; font-size: 12.5px; color: var(--gray-500); }
  `],
})
export class AdminShellComponent {
  authStore = inject(AuthStore);
  authService = inject(AuthService);
  items: SidebarItem[] = [
    { label: 'Console', icon: '◈', route: '/admin' },
    { label: 'Utilisateurs (RBAC)', icon: '◉', route: '/admin/users' },
    { label: 'Configuration IA', icon: '⬡', route: '/admin/ia-config' },
    { label: 'Logs & Audit', icon: '◎', route: '/admin/logs' },
    { label: 'Système & DevOps', icon: '◧', route: '/admin/system' },
  ];
}
