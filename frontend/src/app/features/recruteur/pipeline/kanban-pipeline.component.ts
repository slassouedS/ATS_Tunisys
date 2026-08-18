import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { ApiService } from '../../../core/http/api.service';
import { ToastService } from '../../../core/toast/toast.service';
import { CandidateApplication, ApplicationStage } from '../../../shared/models/application.model';
import {
  CandidateProfileModalComponent, CandidateProfileData,
} from '../../../shared/components/candidate-profile-modal/candidate-profile-modal.component';

interface KanbanColumn {
  stage: ApplicationStage;
  label: string;
  tagVariant: 'neutral' | 'success' | 'error' | 'warning' | 'info';
  items: CandidateApplication[];
}

/** Module 6/8 — Pipeline de candidatures en Kanban (pattern 7.1 du design system),
 *  drag & drop via Angular CDK. Chaque déplacement appelle la state machine
 *  backend (ApplicationService.changeStage) ; un déplacement invalide est
 *  automatiquement annulé visuellement avec un toast d'erreur. */
@Component({
  selector: 'app-kanban-pipeline',
  standalone: true,
  imports: [DragDropModule, CandidateProfileModalComponent],
  template: `
    <div class="page-hd"><div class="page-title">Pipeline de candidatures</div></div>

    <div class="kanban" cdkDropListGroup>
      @for (col of columns(); track col.stage) {
        <div class="kan-col">
          <div class="kan-hd">{{ col.label }} <span class="ct">{{ col.items.length }}</span></div>
          <div
            cdkDropList
            [cdkDropListData]="col.items"
            [id]="col.stage"
            (cdkDropListDropped)="onDrop($event, col.stage)"
            style="min-height:40px"
          >
            @for (app of col.items; track app.id) {
              <div class="kan-card" cdkDrag (click)="openProfile(app)">
                <div class="name">{{ candidateName(app) }}</div>
                <div class="meta">{{ app.offer?.title }} · Score {{ app.aiScore ?? 0 }}%</div>
                <div class="foot">
                  <span class="tag" [class]="tagClass(col.tagVariant)">{{ col.label }}</span>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>

    <app-candidate-profile-modal
      [open]="profileOpen()"
      [data]="profileData()"
      [showActions]="false"
      (close)="profileOpen.set(false)">
    </app-candidate-profile-modal>
  `,
})
export class KanbanPipelineComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  private applications = signal<CandidateApplication[]>([]);
  profileOpen = signal(false);
  profileData = signal<CandidateProfileData | null>(null);

  private readonly columnDefs: { stage: ApplicationStage; label: string; tagVariant: KanbanColumn['tagVariant'] }[] = [
    { stage: 'RECEIVED', label: 'Reçues', tagVariant: 'neutral' },
    { stage: 'SCORED', label: 'Présélection IA', tagVariant: 'neutral' },
    { stage: 'SHORTLISTED', label: 'Shortlist', tagVariant: 'warning' },
    { stage: 'ASSESSMENT_SENT', label: 'Test envoyé', tagVariant: 'warning' },
    { stage: 'ASSESSMENT_DONE', label: 'Test complété', tagVariant: 'warning' },
    { stage: 'RH_INTERVIEW', label: 'Entretien RH', tagVariant: 'info' },
    { stage: 'TECH_INTERVIEW', label: 'Entretien Tech', tagVariant: 'info' },
    { stage: 'FINAL_REVIEW', label: 'Décision finale', tagVariant: 'info' },
    { stage: 'HIRED', label: 'Embauché', tagVariant: 'success' },
  ];

  columns = computed<KanbanColumn[]>(() => {
    const apps = this.applications();
    return this.columnDefs.map(def => ({
      ...def,
      items: apps.filter(a => a.currentStage === def.stage),
    }));
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.get<CandidateApplication[]>('/recruteur/applications').subscribe(a => this.applications.set(a));
  }

  candidateName(app: CandidateApplication): string {
    return app.candidate ? `${app.candidate.firstName} ${app.candidate.lastName}` : `Candidature #${app.id}`;
  }

  tagClass(variant: KanbanColumn['tagVariant']): string {
    return { neutral: 't-gr', success: 't-g', error: 't-r', warning: 't-amber', info: 't-b' }[variant];
  }

  onDrop(event: CdkDragDrop<CandidateApplication[]>, targetStage: ApplicationStage): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    const app = event.previousContainer.data[event.previousIndex];
    const fromStage = app.currentStage;

    // Deplacement optimiste dans l'UI
    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    this.applications.update(list =>
      list.map(a => a.id === app.id ? { ...a, currentStage: targetStage } : a));

    this.api.put(`/recruteur/applications/${app.id}/stage`, { newStage: targetStage }).subscribe({
      next: () => this.toast.success(`${this.candidateName(app)} déplacé(e) vers "${this.labelFor(targetStage)}"`),
      error: (err) => {
        // Rollback si la transition est invalide côté backend (state machine)
        this.applications.update(list =>
          list.map(a => a.id === app.id ? { ...a, currentStage: fromStage } : a));
        this.toast.error(
          err?.error?.error ?? 'Transition invalide',
          `${fromStage} → ${targetStage} non autorisé`
        );
      },
    });
  }

  private labelFor(stage: ApplicationStage): string {
    return this.columnDefs.find(c => c.stage === stage)?.label ?? stage;
  }

  openProfile(app: CandidateApplication): void {
    const name = this.candidateName(app);
    const initials = app.candidate
      ? `${app.candidate.firstName[0] ?? ''}${app.candidate.lastName[0] ?? ''}`.toUpperCase()
      : '?';
    this.profileData.set({
      fullName: name,
      initials,
      score: app.aiScore ?? 0,
      role: app.offer?.title ?? '',
      aiSummary: app.aiScoreExplanation,
      skills: [],
      experiences: [],
    });
    this.profileOpen.set(true);
  }
}
