import { Component } from '@angular/core';

/** Infrastructure & DevOps — informations honnetes sur la stack reellement
 *  deployee (pas de fausses metriques d'infra que le backend ne mesure pas). */
@Component({
  selector: 'app-admin-system',
  standalone: true,
  imports: [],
  template: `
    <div class="page-hd">
      <div><div class="page-title">Infrastructure & DevOps</div><div class="page-sub">Stack technique — déploiement on-premise</div></div>
    </div>
    <div class="g3">
      <div class="card card-sm">
        <div class="card-hd"><span class="ico">🗄</span>Bases de données</div>
        <div style="display:flex;flex-direction:column;gap:6px;font-size:12px">
          <div style="display:flex;justify-content:space-between"><span>PostgreSQL</span><span class="tag t-g" style="font-size:10px">Relationnelle</span></div>
          <div style="display:flex;justify-content:space-between"><span>MongoDB</span><span class="tag t-b" style="font-size:10px">Documents (CV)</span></div>
          <div style="display:flex;justify-content:space-between"><span>Elasticsearch</span><span class="tag t-b" style="font-size:10px">Recherche CVthèque</span></div>
          <div style="display:flex;justify-content:space-between"><span>Redis</span><span class="tag t-gr" style="font-size:10px">Cache/sessions</span></div>
        </div>
      </div>
      <div class="card card-sm">
        <div class="card-hd"><span class="ico">🤖</span>Intelligence artificielle</div>
        <div style="display:flex;flex-direction:column;gap:6px;font-size:12px">
          <div style="display:flex;justify-content:space-between"><span>LLM</span><span class="tag t-g" style="font-size:10px">On-premise (Ollama)</span></div>
          <div style="display:flex;justify-content:space-between"><span>Embeddings</span><span class="tag t-b" style="font-size:10px">Sentence-Transformers</span></div>
          <div style="display:flex;justify-content:space-between"><span>Confidentialité</span><span class="tag t-g" style="font-size:10px">100% local</span></div>
        </div>
        <div style="margin-top:8px;padding:7px 9px;background:var(--green-bg);border-radius:var(--r-sm);font-size:11.5px;color:var(--green)">
          ✓ Aucune donnée candidat transmise à un service tiers
        </div>
      </div>
      <div class="card card-sm">
        <div class="card-hd"><span class="ico">🔌</span>Notifications & événements</div>
        <div style="display:flex;flex-direction:column;gap:6px;font-size:12px">
          <div style="display:flex;justify-content:space-between"><span>Apache Kafka</span><span class="tag t-b" style="font-size:10px">Événements</span></div>
          <div style="display:flex;justify-content:space-between"><span>Email (SMTP)</span><span class="tag t-gr" style="font-size:10px">Configurable</span></div>
          <div style="display:flex;justify-content:space-between"><span>SMS</span><span class="tag t-gr" style="font-size:10px">À configurer</span></div>
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-hd"><span class="ico">ℹ</span>À propos de cette page</div>
      <p style="font-size:12.5px;color:var(--gray-700);line-height:1.7">
        Cette page présente la stack technique configurée, sans métriques de supervision en temps réel
        (CPU, RAM, uptime) — leur ajout nécessiterait une intégration avec un outil de monitoring
        (Prometheus/Grafana par exemple), non branchée dans cette version.
      </p>
    </div>
  `,
})
export class AdminSystemComponent {}
