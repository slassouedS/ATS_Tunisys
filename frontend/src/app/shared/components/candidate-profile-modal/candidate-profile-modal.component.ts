import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface CandidateSkill {
  name: string;
  percent: number;
}

export interface CandidateExperience {
  title: string;
  company: string;
  period: string;
  location?: string;
}

export interface CandidateProfileData {
  fullName: string;
  initials: string;
  score: number;
  role: string;
  experienceYears?: number;
  location?: string;
  seniority?: string;
  aiSummary?: string;
  skills: CandidateSkill[];
  experiences: CandidateExperience[];
}

/** Modal "Profil candidat rapide" (pattern 7.2 du design system) — reutilisable
 *  depuis le Kanban, les shortlists, la CVtheque, etc. */
@Component({
  selector: 'app-candidate-profile-modal',
  standalone: true,
  template: `
    @if (open && data) {
      <div class="modal-ov" (click)="close.emit()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-hd">
            <div class="av av-lg av-pink">{{ data.initials }}</div>
            <div style="flex:1">
              <div class="row" style="display:flex;gap:8px;align-items:center">
                <div class="modal-t">{{ data.fullName }}</div>
                <span style="font-size:18px;font-weight:700;color:var(--red)">{{ data.score }}%</span>
              </div>
              <div style="font-size:12px;color:var(--gray-500)">
                {{ data.role }}
                @if (data.experienceYears) { · {{ data.experienceYears }} ans }
                @if (data.location) { · {{ data.location }} }
                @if (data.seniority) { · {{ data.seniority }} }
              </div>
            </div>
            <button class="btn btn-g btn-sm" (click)="close.emit()">✕</button>
          </div>
          <div class="modal-bd">
            @if (data.aiSummary) {
              <div class="ai-box" style="margin-bottom:16px">
                <div class="ico">✦</div>
                <div>
                  <div class="t">Résumé IA</div>
                  <div class="c">{{ data.aiSummary }}</div>
                </div>
              </div>
            }
            @if (data.skills.length > 0) {
              <h4 style="margin-bottom:8px">Compétences</h4>
              @for (s of data.skills; track s.name) {
                <div class="sk-i">
                  <div class="sk-n">{{ s.name }}</div>
                  <div class="sk-tr"><div class="sk-fi" [style.width.%]="s.percent"></div></div>
                  <div class="sk-p">{{ s.percent }}%</div>
                </div>
              }
            }
            @if (data.experiences.length > 0) {
              <h4 style="margin:16px 0 8px">Expériences</h4>
              <div style="font-size:12.5px;color:var(--gray-700);line-height:1.9">
                @for (e of data.experiences; track e.title + e.company) {
                  • <b>{{ e.title }}</b> chez {{ e.company }} ({{ e.period }})
                  @if (e.location) { · {{ e.location }} }
                  <br>
                }
              </div>
            }
          </div>
          <div class="modal-ft">
            <button class="btn btn-g" (click)="close.emit()">Fermer</button>
            @if (showActions) {
              <button class="btn btn-d" (click)="reject.emit()">✕ Rejeter</button>
              <button class="btn btn-p" (click)="shortlist.emit()">⭐ Shortlister</button>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class CandidateProfileModalComponent {
  @Input() open = false;
  @Input() data: CandidateProfileData | null = null;
  @Input() showActions = true;
  @Output() close = new EventEmitter<void>();
  @Output() reject = new EventEmitter<void>();
  @Output() shortlist = new EventEmitter<void>();
}
