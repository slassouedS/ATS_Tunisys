import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopbarComponent } from '../../core/layout/topbar.component';
import { SidebarComponent } from '../../core/layout/sidebar.component';
import { AuthStore } from '../../core/auth/auth.store';
import { AuthService } from '../../core/auth/auth.service';
import { SidebarItem } from '../../core/layout/sidebar-item.model';

@Component({
  selector: 'app-technique-shell',
  standalone: true,
  imports: [RouterOutlet, TopbarComponent, SidebarComponent],
  template: `
    <app-topbar roleLabel="💻 Responsable Technique" [initials]="authStore.avatarInitials()"
                (logout)="authService.logout()">
      <button class="nt">Mon espace</button>
    </app-topbar>
    <div class="layout">
      <app-sidebar sectionTitle="Évaluation" [items]="items"></app-sidebar>
      <main class="main"><router-outlet></router-outlet></main>
    </div>
  `,
  styles: [`
    .layout { display: flex; min-height: calc(100vh - 54px); }
    .main { flex: 1; padding: 22px 26px; overflow-y: auto; }
    .nt { padding: 5px 13px; border: none; background: transparent; font-size: 12.5px; color: var(--gray-500); }
  `],
})
export class TechniqueShellComponent {
  authStore = inject(AuthStore);
  authService = inject(AuthService);
  items: SidebarItem[] = [
    { label: 'Mon espace', icon: '◈', route: '/technique' },
    { label: 'Shortlists à valider', icon: '⬡', route: '/technique/shortlists' },
    { label: 'Mes entretiens', icon: '◷', route: '/technique/entretiens' },
    { label: 'Historique avis', icon: '◧', route: '/technique/historique' },
  ];
}
