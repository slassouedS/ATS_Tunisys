import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SidebarItem } from './sidebar-item.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <div class="sb-section">{{ sectionTitle }}</div>
      @for (item of items; track item.route) {
        <a class="sb-item" [routerLink]="item.route" routerLinkActive="act">
          <span class="ico">{{ item.icon }}</span>{{ item.label }}
          @if (item.badge) { <span class="sb-badge">{{ item.badge }}</span> }
        </a>
      }
    </aside>
  `,
  styles: [`
    .sidebar { width: 220px; background: var(--white); border-right: 1px solid var(--border);
      padding: 16px 10px; flex-shrink: 0; }
    .sb-section { font-size: 10.5px; text-transform: uppercase; letter-spacing: .5px;
      color: var(--gray-500); font-weight: 700; padding: 10px 10px 6px; }
    .sb-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px;
      border-radius: var(--r-sm); font-size: 12.5px; font-weight: 500; color: var(--gray-700);
      text-decoration: none; cursor: pointer; }
    .sb-item:hover { background: var(--gray-100); }
    .sb-item.act { background: var(--red-bg); color: var(--red); font-weight: 600; }
    .ico { width: 16px; text-align: center; }
    .sb-badge { margin-left: auto; background: var(--red); color: #fff; font-size: 10px;
      padding: 1px 6px; border-radius: 10px; }
  `],
})
export class SidebarComponent {
  @Input() sectionTitle = 'Menu';
  @Input() items: SidebarItem[] = [];
}
