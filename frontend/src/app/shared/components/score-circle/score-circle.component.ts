import { Component, Input, computed } from '@angular/core';

/** Cercle de score SVG compact (utilise dans les tableaux — pattern C24). */
@Component({
  selector: 'app-score-circle',
  standalone: true,
  template: `
    <div style="position:relative;display:inline-block;width:36px;height:36px">
      <svg width="36" height="36">
        <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border)" stroke-width="3"></circle>
        <circle cx="18" cy="18" r="14" fill="none" [attr.stroke]="color()" stroke-width="3"
                [attr.stroke-dasharray]="dashArray()" stroke-linecap="round"
                transform="rotate(-90 18 18)"></circle>
      </svg>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:9px;font-weight:800">
        {{ score }}
      </div>
    </div>
  `,
})
export class ScoreCircleComponent {
  @Input({ required: true }) score = 0;

  dashArray = computed(() => `${(this.score / 100) * 88} 88`);
  color = computed(() => {
    if (this.score >= 85) return 'var(--green)';
    if (this.score >= 70) return 'var(--amber)';
    return 'var(--red)';
  });
}
