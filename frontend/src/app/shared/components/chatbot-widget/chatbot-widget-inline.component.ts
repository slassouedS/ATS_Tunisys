import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  time: string;
}

/** Module 3 — Chatbot d'accueil, version carte inline (fidele au template :
 *  bulles de conversation, reponses rapides, saisie en bas). */
@Component({
  selector: 'app-chatbot-widget-inline',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="card" style="padding:0;display:flex;flex-direction:column">
      <div style="padding:12px 15px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:9px">
        <div style="width:30px;height:30px;background:var(--red);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px">🤖</div>
        <div>
          <div style="font-size:13px;font-weight:700">Assistant TUNISYS</div>
          <div style="font-size:11px;color:var(--green)">● En ligne 24/7</div>
        </div>
        <div class="ai-b" style="margin-left:auto">IA ✦</div>
      </div>
      <div class="chat-wrap">
        <div class="chat-msgs">
          @if (messages().length === 0) {
            <div class="cm b">
              <div class="cb">Bonjour ! 👋 Je suis l'assistant IA TUNISYS. Je peux vous aider à trouver l'offre idéale ou suivre votre candidature. Comment puis-je vous aider ?</div>
              <div class="ct">{{ now() }}</div>
            </div>
          }
          @for (m of messages(); track $index) {
            <div class="cm" [class.b]="m.role === 'bot'" [class.u]="m.role === 'user'">
              <div class="cb">{{ m.text }}</div>
              <div class="ct">{{ m.time }}</div>
            </div>
          }
          @if (loading()) { <div class="cm b"><div class="cb">…</div></div> }
        </div>
        <div style="padding:7px 10px;background:var(--gray-50);border-top:1px solid var(--border)">
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            <button class="btn btn-g btn-xs" (click)="quickSend('Quelles sont les offres disponibles ?')">Voir les offres</button>
            <button class="btn btn-g btn-xs" (click)="quickSend('Comment se déroule le processus de recrutement ?')">Processus ?</button>
          </div>
        </div>
        <div class="chat-inp-r">
          <input class="c-inp" [(ngModel)]="draft" placeholder="Écrire un message..." (keydown.enter)="send()">
          <button class="c-send" (click)="send()">➤</button>
        </div>
      </div>
    </div>
  `,
})
export class ChatbotWidgetInlineComponent {
  private readonly http = inject(HttpClient);

  messages = signal<ChatMessage[]>([]);
  loading = signal(false);
  draft = '';

  now(): string {
    return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  quickSend(text: string): void {
    this.draft = text;
    this.send();
  }

  send(): void {
    const text = this.draft.trim();
    if (!text) return;
    this.messages.update(m => [...m, { role: 'user', text, time: this.now() }]);
    this.draft = '';
    this.loading.set(true);

    this.http.post<{ reply: string }>(`${environment.apiBaseUrl}/public/chatbot`, { message: text }).subscribe({
      next: (res) => {
        this.messages.update(m => [...m, { role: 'bot', text: res.reply, time: this.now() }]);
        this.loading.set(false);
      },
      error: () => {
        this.messages.update(m => [...m, { role: 'bot', text: 'Désolé, une erreur est survenue.', time: this.now() }]);
        this.loading.set(false);
      },
    });
  }
}
