import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  detail?: string;
  variant: 'success' | 'error' | 'info' | 'warning';
}

/** Service global de toasts (pattern C15 du design system TUNISYS). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();
  private nextId = 1;

  private push(message: string, variant: Toast['variant'], detail?: string): void {
    const id = this.nextId++;
    this._toasts.update(t => [...t, { id, message, detail, variant }]);
    setTimeout(() => this.dismiss(id), 4500);
  }

  success(message: string, detail?: string): void { this.push(message, 'success', detail); }
  error(message: string, detail?: string): void { this.push(message, 'error', detail); }
  info(message: string, detail?: string): void { this.push(message, 'info', detail); }
  warning(message: string, detail?: string): void { this.push(message, 'warning', detail); }

  dismiss(id: number): void {
    this._toasts.update(t => t.filter(x => x.id !== id));
  }
}
