import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

/** Conteneur global des toasts — a placer une seule fois dans AppComponent. */
@Component({
  selector: 'app-toast-container',
  standalone: true,
  template: `
    <div class="toast-stack">
      @for (t of toastService.toasts(); track t.id) {
        <div class="toast" (click)="toastService.dismiss(t.id)">
          <div class="ico" [class]="'ico-' + t.variant">{{ iconFor(t.variant) }}</div>
          <div>
            <div class="msg">{{ t.message }}</div>
            @if (t.detail) { <div class="detail">{{ t.detail }}</div> }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed; bottom: 20px; left: 20px; z-index: 1000;
      display: flex; flex-direction: column; gap: 10px;
    }
    .toast {
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-md); padding: 12px 16px;
      display: flex; align-items: center; gap: 12px;
      box-shadow: var(--shadow-lg); min-width: 280px; cursor: pointer;
      animation: toast-in 200ms ease-out;
    }
    @keyframes toast-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .ico { width: 24px; height: 24px; border-radius: 50%; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; flex-shrink: 0; }
    .ico-success { background: var(--green); }
    .ico-error { background: var(--red); }
    .ico-info { background: var(--blue); }
    .ico-warning { background: var(--amber); }
    .msg { font-size: 12.5px; font-weight: 600; }
    .detail { font-size: 11px; color: var(--gray-500); }
  `],
})
export class ToastContainerComponent {
  toastService = inject(ToastService);

  iconFor(variant: string): string {
    return { success: '✓', error: '✕', info: 'i', warning: '!' }[variant] ?? '';
  }
}
