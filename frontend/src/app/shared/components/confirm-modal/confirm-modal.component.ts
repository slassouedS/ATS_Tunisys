import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  template: `
    @if (open) {
      <div class="overlay" (click)="cancel.emit()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-title">{{ title }}</div>
          <div class="modal-body">{{ message }}</div>
          <div class="modal-actions">
            <button class="btn btn-g" (click)="cancel.emit()">Annuler</button>
            <button class="btn btn-p" (click)="confirm.emit()">{{ confirmLabel }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4);
      display: flex; align-items: center; justify-content: center; z-index: 999; }
    .modal { background: #fff; border-radius: var(--r-lg); padding: 22px; width: 380px;
      box-shadow: var(--shadow-lg); }
    .modal-title { font-size: 15px; font-weight: 700; margin-bottom: 8px; }
    .modal-body { font-size: 12.5px; color: var(--gray-700); margin-bottom: 18px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
  `],
})
export class ConfirmModalComponent {
  @Input() open = false;
  @Input() title = 'Confirmer';
  @Input() message = '';
  @Input() confirmLabel = 'Confirmer';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
