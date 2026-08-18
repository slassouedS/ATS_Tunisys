import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../../core/http/api.service';

interface NotificationItem {
  id: number;
  channel: string;
  templateCode: string;
  status: string;
  sentAt?: string;
  createdAt: string;
}

/** Module 9 — Centre de notifications (fidele au template maitre). */
@Component({
  selector: 'app-recruteur-notifications',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="page-hd">
      <div><div class="page-title">Notifications</div><div class="page-sub">Centre de notifications multicanal — Module 9</div></div>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      @if (notifications().length === 0) {
        <p style="font-size:12.5px;color:var(--gray-500);padding:16px">Aucune notification pour le moment.</p>
      }
      @for (n of notifications(); track n.id) {
        <div class="notif-i" [class.unread]="n.status === 'PENDING'">
          <div class="notif-ico" [class]="iconClass(n)">{{ iconFor(n.templateCode) }}</div>
          <div style="flex:1">
            <div class="notif-txt"><strong>{{ labelFor(n.templateCode) }}</strong> · Canal : {{ n.channel }} · Statut : {{ statusLabel(n.status) }}</div>
            <div class="notif-time">{{ n.createdAt | date:'dd/MM/yyyy HH:mm' }}</div>
          </div>
        </div>
      }
    </div>
  `,
})
export class RecruteurNotificationsComponent implements OnInit {
  private readonly api = inject(ApiService);
  notifications = signal<NotificationItem[]>([]);

  ngOnInit(): void {
    this.api.get<NotificationItem[]>('/recruteur/notifications').subscribe(n => this.notifications.set(n));
  }

  iconClass(n: NotificationItem): string {
    if (n.templateCode === 'APPLICATION_RECEIVED') return 'r';
    if (n.status === 'SENT') return 'g';
    return '';
  }

  iconFor(code: string): string {
    const map: Record<string, string> = {
      APPLICATION_RECEIVED: '🤖',
      DEMAND_PENDING_VALIDATION: '🎯',
      DEMAND_DECISION: '🎯',
      INTERVIEW_CONFIRMED: '📅',
      ASSESSMENT_INVITATION: '📧',
    };
    return map[code] ?? '📬';
  }

  labelFor(code: string): string {
    const map: Record<string, string> = {
      APPLICATION_RECEIVED: 'Nouvelle candidature reçue',
      DEMAND_PENDING_VALIDATION: 'Demande en attente de validation',
      DEMAND_DECISION: 'Décision sur une demande',
      INTERVIEW_CONFIRMED: 'Entretien confirmé',
      ASSESSMENT_INVITATION: 'Test envoyé au candidat',
    };
    return map[code] ?? code;
  }

  statusLabel(status: string): string {
    return { PENDING: 'En attente', SENT: 'Envoyée', FAILED: 'Échec', SENT_LOG: 'Journalisée' }[status] ?? status;
  }
}
