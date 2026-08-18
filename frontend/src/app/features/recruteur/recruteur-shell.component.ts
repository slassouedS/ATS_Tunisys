import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopbarComponent } from '../../core/layout/topbar.component';
import { SidebarComponent } from '../../core/layout/sidebar.component';
import { AuthStore } from '../../core/auth/auth.store';
import { AuthService } from '../../core/auth/auth.service';
import { SidebarItem } from '../../core/layout/sidebar-item.model';

@Component({
  selector: 'app-recruteur-shell',
  standalone: true,
  imports: [RouterOutlet, TopbarComponent, SidebarComponent],
  template: `
    <app-topbar roleLabel="📋 Chargé(e) de Recrutement" [initials]="authStore.avatarInitials()"
                (logout)="authService.logout()">
      <button class="nt">Mon bureau</button>
    </app-topbar>
    <div class="layout">
      <app-sidebar sectionTitle="Opérations" [items]="items"></app-sidebar>
      <main class="main"><router-outlet></router-outlet></main>
    </div>
  `,
  styles: [`
    .layout { display: flex; min-height: calc(100vh - 54px); }
    .main { flex: 1; padding: 22px 26px; overflow-y: auto; }
    .nt { padding: 5px 13px; border: none; background: transparent; font-size: 12.5px; color: var(--gray-500); }
  `],
})
export class RecruteurShellComponent {
  authStore = inject(AuthStore);
  authService = inject(AuthService);
  items: SidebarItem[] = [
    { label: 'Mon bureau', icon: '◈', route: '/recruteur' },
    { label: 'Candidatures', icon: '◉', route: '/recruteur/candidatures' },
    { label: 'Pipeline (Kanban)', icon: '⬡', route: '/recruteur/pipeline' },
    { label: 'CVthèque IA', icon: '🔍', route: '/recruteur/cvtheque' },
    { label: 'E-Assessment', icon: '◎', route: '/recruteur/assessment' },
    { label: 'Agenda', icon: '📅', route: '/recruteur/agenda' },
    { label: 'Notifications', icon: '◻', route: '/recruteur/notifications' },
  ];
}
