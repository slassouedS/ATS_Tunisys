import { Component, Input, computed } from '@angular/core';

/** Cercle de score IA — 90+ vert, 70-89 ambre, <70 rouge (cf. PROJECT_MAP score-color.pipe). */
@Component({
  selector: 'app-score-badge',
  standalone: true,
  template: `
    <div class="score-circle" [style.--score-color]="color()">
      <svg viewBox="0 0 36 36">
        <path class="bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        <path class="fg" [style.strokeDasharray]="score + ', 100'"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
      </svg>
      <span class="score-label">{{ score }}%</span>
    </div>
  `,
  styles: [`
    .score-circle { position: relative; width: 44px; height: 44px; }
    svg { width: 100%; height: 100%; transform: rotate(-90deg); }
    .bg { fill: none; stroke: var(--gray-100); stroke-width: 3.2; }
    .fg { fill: none; stroke: var(--score-color); stroke-width: 3.2; stroke-linecap: round; }
    .score-label { position: absolute; inset: 0; display: flex; align-items: center;
      justify-content: center; font-size: 10.5px; font-weight: 700; }
  `],
})
export class ScoreBadgeComponent {
  @Input({ required: true }) score = 0;

  color = computed(() => {
    if (this.score >= 90) return 'var(--green)';
    if (this.score >= 70) return 'var(--amber)';
    return 'var(--red)';
  });
}
