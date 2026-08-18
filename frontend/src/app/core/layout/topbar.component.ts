import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-topbar',
  standalone: true,
  template: `
    <div class="topbar">
      <div class="topbar-logo">
        <img src="/assets/logo-tunisys.png" alt="TUNISYS" class="logo-img">
      </div>
      <div class="nav-tabs"><ng-content></ng-content></div>
      <div class="topbar-right">
        <span class="role-badge">{{ roleLabel }}</span>
        <button class="btn btn-g btn-sm" (click)="logout.emit()">Déconnexion</button>
        <div class="av">{{ initials }}</div>
      </div>
    </div>
  `,
  styles: [`
    .topbar { background: var(--white); border-bottom: 1px solid var(--border); height: 54px;
      display: flex; align-items: center; padding: 0 20px; gap: 6px; position: sticky; top: 0; z-index: 200; }
    .topbar-logo { display: flex; align-items: center; margin-right: 12px; }
    .logo-img { height: 26px; width: auto; }
    .nav-tabs { display: flex; gap: 2px; flex: 1; }
    .topbar-right { display: flex; align-items: center; gap: 10px; }
    .role-badge { font-size: 11.5px; font-weight: 600; color: var(--gray-700);
      background: var(--gray-100); padding: 4px 10px; border-radius: 20px; }
    .av { width: 30px; height: 30px; border-radius: 50%; background: var(--red);
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; }
  `],
})
export class TopbarComponent {
  @Input() roleLabel = '';
  @Input() initials = '';
  @Output() logout = new EventEmitter<void>();
}
