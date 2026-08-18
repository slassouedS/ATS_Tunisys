import { Component, OnInit, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/http/api.service';
import { JobOffer } from '../../../shared/models/job-offer.model';
import { ChatbotWidgetInlineComponent } from '../../../shared/components/chatbot-widget/chatbot-widget-inline.component';
import { CandidateAuthStore } from '../../../core/candidate-auth/candidate-auth.store';

/** Module 2 — Portail Carrière Interne (fidele au template maitre : hero sombre,
 *  liste d'offres + chatbot inline en g75). Accès public, compte optionnel. */
@Component({
  selector: 'app-portail-home',
  standalone: true,
  imports: [RouterLink, SlicePipe, ChatbotWidgetInlineComponent],
  template: `
    <div class="portail-hero">
      <div style="position:relative;z-index:1">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
          <img src="/assets/logo-tunisys.png" alt="TUNISYS" style="height:26px;filter:brightness(0) invert(1)">
          <div style="margin-left:auto;display:flex;gap:8px">
            @if (candidateAuth.isAuthenticated()) {
              <a routerLink="/portail/mon-espace" class="btn btn-g" style="color:#fff;border-color:rgba(255,255,255,.25);background:transparent">
                {{ candidateAuth.displayName() }} →
              </a>
            } @else {
              <a routerLink="/portail/connexion" class="btn btn-g" style="color:#fff;border-color:rgba(255,255,255,.25);background:transparent">Se connecter</a>
              <a routerLink="/portail/inscription" class="btn btn-p">Créer un compte</a>
            }
          </div>
        </div>
        <div style="display:flex;gap:28px;align-items:center;flex-wrap:wrap">
          <div style="flex:1;min-width:280px">
            <div style="font-family:'DM Serif Display',serif;font-size:26px;font-weight:400;line-height:1.2;margin-bottom:10px">
              Construisez votre futur<br><em style="color:var(--red);font-style:normal">avec TUNISYS.</em>
            </div>
            <div style="font-size:13px;opacity:.75;line-height:1.65;max-width:460px">
              Leader tunisien de la cybersécurité et de l'intégration de systèmes. Rejoignez-nous.
            </div>
            <div style="display:flex;gap:10px;margin-top:16px">
              <button class="btn btn-p" (click)="scrollToOffers()">Voir les {{ offers().length }} offres →</button>
            </div>
          </div>
          <div style="display:flex;gap:20px">
            <div style="text-align:center"><div style="font-size:28px;font-weight:300;color:var(--red)">{{ offers().length }}</div><div style="font-size:10px;opacity:.6;text-transform:uppercase;letter-spacing:.5px">Offres actives</div></div>
          </div>
        </div>
      </div>
    </div>

    <div style="padding:22px 24px;background:var(--gray-50)">
      <div class="g75" id="offers-list">
        <div class="gcol">
          <div style="display:flex;gap:9px">
            <input class="fi" placeholder="🔍 Rechercher un poste, une compétence..." style="flex:1">
            <button class="btn btn-p">Rechercher</button>
          </div>
          @for (offer of offers(); track offer.id) {
            <div class="job-card" [routerLink]="['/portail/offre', offer.id]" style="background:var(--white)">
              <div style="display:flex;gap:12px;align-items:flex-start">
                <div style="width:40px;height:40px;background:var(--red-bg);border-radius:var(--r-sm);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">💼</div>
                <div style="flex:1">
                  <div class="title">{{ offer.title }}</div>
                  <div class="meta"><span>📍 {{ offer.location || 'Tunis' }}</span><span>· {{ offer.contractType || 'CDI' }}</span></div>
                  <p style="font-size:11.5px;color:var(--gray-500)">{{ offer.description | slice:0:100 }}…</p>
                </div>
                <button class="btn btn-p btn-sm">Postuler →</button>
              </div>
            </div>
          }
          @if (offers().length === 0) {
            <p style="font-size:12.5px;color:var(--gray-500)">Aucune offre publiée pour le moment.</p>
          }
        </div>
        <app-chatbot-widget-inline></app-chatbot-widget-inline>
      </div>
    </div>
  `,
})
export class PortailHomeComponent implements OnInit {
  private readonly api = inject(ApiService);
  candidateAuth = inject(CandidateAuthStore);
  offers = signal<JobOffer[]>([]);

  ngOnInit(): void {
    this.api.get<JobOffer[]>('/public/offers').subscribe(o => this.offers.set(o));
  }

  scrollToOffers(): void {
    document.getElementById('offers-list')?.scrollIntoView({ behavior: 'smooth' });
  }
}
