import { Component, Input, computed } from '@angular/core';

/** Tag coloré générique — utilisé dans toutes les features (cf. PROJECT_MAP). */
@Component({
  selector: 'app-status-tag',
  standalone: true,
  template: `<span class="tag" [class]="cssClass()">{{ label }}</span>`,
})
export class StatusTagComponent {
  @Input() label = '';
  @Input() variant: 'success' | 'error' | 'warning' | 'info' | 'neutral' = 'neutral';

  cssClass = computed(() => {
    switch (this.variant) {
      case 'success': return 't-g';
      case 'error': return 't-r';
      case 'warning': return 't-a';
      case 'info': return 't-b';
      default: return 't-p';
    }
  });
}
