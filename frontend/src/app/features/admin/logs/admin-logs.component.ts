import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../../core/http/api.service';

interface AuditEntry {
  id: number;
  action: string;
  entityType?: string;
  entityId?: number;
  details?: string;
  createdAt: string;
  actorUser?: { firstName: string; lastName: string };
}

interface AuditPage { content: AuditEntry[]; totalElements: number }

/** Module 14 — Logs & Audit (donnees reelles de la table audit_log). */
@Component({
  selector: 'app-admin-logs',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="page-hd">
      <div><div class="page-title">Logs & Audit</div><div class="page-sub">Traçabilité complète — {{ total() }} action(s) enregistrée(s)</div></div>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <table class="tbl">
        <thead><tr><th>Horodatage</th><th>Acteur</th><th>Action</th><th>Entité</th><th>Détails</th></tr></thead>
        <tbody>
          @for (log of logs(); track log.id) {
            <tr>
              <td style="font-size:11px;font-weight:600;font-family:monospace">{{ log.createdAt | date:'dd/MM/yyyy HH:mm:ss' }}</td>
              <td style="font-size:11.5px">{{ log.actorUser ? (log.actorUser.firstName + ' ' + log.actorUser.lastName) : 'Système' }}</td>
              <td><span class="tag t-b">{{ log.action }}</span></td>
              <td style="font-size:11.5px">{{ log.entityType }} @if (log.entityId) { #{{ log.entityId }} }</td>
              <td style="font-size:11.5px;color:var(--gray-500);max-width:280px">{{ log.details }}</td>
            </tr>
          }
        </tbody>
      </table>
      @if (logs().length === 0) {
        <p style="font-size:12.5px;color:var(--gray-500);padding:16px">Aucune action enregistrée pour le moment.</p>
      }
    </div>
  `,
})
export class AdminLogsComponent implements OnInit {
  private readonly api = inject(ApiService);
  logs = signal<AuditEntry[]>([]);
  total = signal(0);

  ngOnInit(): void {
    this.api.get<AuditPage>('/admin/logs', { page: 0, size: 50 }).subscribe(p => {
      this.logs.set(p.content ?? []);
      this.total.set(p.totalElements ?? 0);
    });
  }
}
