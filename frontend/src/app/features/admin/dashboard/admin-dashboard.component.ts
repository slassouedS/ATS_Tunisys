import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/http/api.service';

interface AdminUser { id: number; isActive: boolean; role: { code: string } }

/** Console Admin — statistiques reelles (pas de metriques infra fictives). */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [],
  template: `
    <div class="page-hd">
      <div><div class="page-title">Console Admin</div><div class="page-sub">Vue d'ensemble de la plateforme</div></div>
    </div>

    <div class="g4">
      <div class="stat-c">
        <div class="stat-ico">👥</div><div class="stat-lbl">Utilisateurs actifs</div>
        <div class="stat-num">{{ activeCount() }}</div>
        <div class="stat-d">{{ users().length }} comptes au total</div>
      </div>
      <div class="stat-c">
        <div class="stat-ico">👔</div><div class="stat-lbl">Managers</div>
        <div class="stat-num" style="color:var(--blue)">{{ countByRole('MANAGER') }}</div>
      </div>
      <div class="stat-c red">
        <div class="stat-ico">🎯</div><div class="stat-lbl">RH</div>
        <div class="stat-num">{{ countByRole('RH') }}</div>
      </div>
      <div class="stat-c">
        <div class="stat-ico">📋</div><div class="stat-lbl">Recruteurs</div>
        <div class="stat-num" style="color:var(--green)">{{ countByRole('RECRUTEUR') }}</div>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="card-hd"><span class="ico">ℹ</span>Architecture on-premise</div>
      <p style="font-size:12.5px;color:var(--gray-700);line-height:1.8">
        Cette plateforme fonctionne <strong>entièrement on-premise</strong> : base de données PostgreSQL,
        LLM local via Ollama (aucune donnée candidat transmise à un tiers), stockage documentaire MongoDB,
        recherche Elasticsearch, notifications via Kafka. Pour l'état détaillé de chaque service,
        consultez la page <strong>Système</strong>.
      </p>
    </div>
  `,
})
export class AdminDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  users = signal<AdminUser[]>([]);

  ngOnInit(): void {
    this.api.get<AdminUser[]>('/admin/users').subscribe(u => this.users.set(u));
  }

  activeCount(): number { return this.users().filter(u => u.isActive).length; }
  countByRole(code: string): number { return this.users().filter(u => u.role?.code === code).length; }
}
