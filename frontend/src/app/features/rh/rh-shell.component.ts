import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopbarComponent } from '../../core/layout/topbar.component';
import { SidebarComponent } from '../../core/layout/sidebar.component';
import { AuthStore } from '../../core/auth/auth.store';
import { AuthService } from '../../core/auth/auth.service';
import { SidebarItem } from '../../core/layout/sidebar-item.model';

@Component({
  selector: 'app-rh-shell',
  standalone: true,
  imports: [RouterOutlet, TopbarComponent, SidebarComponent],
  template: `
    <app-topbar roleLabel="🎯 Responsable RH" [initials]="authStore.avatarInitials()"
                (logout)="authService.logout()">
      <button class="nt">Tableau de bord</button>
    </app-topbar>
    <div class="layout">
      <app-sidebar sectionTitle="Direction RH" [items]="items"></app-sidebar>
      <main class="main"><router-outlet></router-outlet></main>
    </div>
  `,
  styles: [`
    .layout { display: flex; min-height: calc(100vh - 54px); }
    .main { flex: 1; padding: 22px 26px; overflow-y: auto; }
    .nt { padding: 5px 13px; border: none; background: transparent; font-size: 12.5px; color: var(--gray-500); }
  `],
})
export class RhShellComponent {
  authStore = inject(AuthStore);
  authService = inject(AuthService);

  items: SidebarItem[] = [
    { label: "Vue d'ensemble", icon: '◈', route: '/rh' },
    { label: 'Valider demandes', icon: '✚', route: '/rh/demandes' },
    { label: 'Offres à publier', icon: '📢', route: '/rh/offres' },
    { label: 'Pipeline global', icon: '◉', route: '/rh/pipeline' },
    { label: 'CVthèque IA', icon: '🔍', route: '/rh/cvtheque' },
    { label: 'Décisions finales', icon: '⬡', route: '/rh/decisions' },
    { label: 'Analytics RH', icon: '📊', route: '/rh/analytics' },
  ];
}
