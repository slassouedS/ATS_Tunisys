import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
}

/** Module 3 — Chatbot d'accueil flottant (portail candidat public). */
@Component({
  selector: 'app-chatbot-widget',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (!open()) {
      <button class="bubble" (click)="open.set(true)" aria-label="Ouvrir l'assistant">💬</button>
    } @else {
      <div class="panel">
        <div class="panel-hd">
          <span>Assistant TUNISYS</span>
          <button class="close-btn" (click)="open.set(false)">✕</button>
        </div>
        <div class="panel-body">
          @if (messages().length === 0) {
            <div class="msg bot">Bonjour ! Je peux répondre à vos questions sur nos offres,
              le processus de recrutement, ou la culture TUNISYS. Comment puis-je vous aider ?</div>
          }
          @for (m of messages(); track $index) {
            <div class="msg" [class.bot]="m.role === 'bot'" [class.user]="m.role === 'user'">{{ m.text }}</div>
          }
          @if (loading()) { <div class="msg bot">…</div> }
        </div>
        <form class="panel-input" (ngSubmit)="send()">
          <input [(ngModel)]="draft" name="draft" placeholder="Votre question..." [disabled]="loading()">
          <button type="submit" class="btn btn-p btn-sm" [disabled]="!draft.trim() || loading()">Envoyer</button>
        </form>
      </div>
    }
  `,
  styles: [`
    :host { position: fixed; bottom: 20px; right: 20px; z-index: 500; }
    .bubble { width: 52px; height: 52px; border-radius: 50%; background: var(--red);
      border: none; font-size: 22px; box-shadow: var(--shadow-lg); }
    .panel { width: 320px; height: 420px; background: #fff; border-radius: var(--r-lg);
      box-shadow: var(--shadow-lg); display: flex; flex-direction: column; overflow: hidden; }
    .panel-hd { background: var(--red); color: #fff; padding: 10px 14px; font-size: 13px;
      font-weight: 700; display: flex; justify-content: space-between; align-items: center; }
    .close-btn { background: none; border: none; color: #fff; font-size: 14px; }
    .panel-body { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
    .msg { font-size: 12.5px; padding: 8px 10px; border-radius: var(--r-sm); max-width: 85%; }
    .msg.bot { background: var(--gray-100); align-self: flex-start; }
    .msg.user { background: var(--red-bg); color: var(--red-dark); align-self: flex-end; }
    .panel-input { display: flex; gap: 6px; padding: 10px; border-top: 1px solid var(--border); }
    .panel-input input { flex: 1; padding: 7px 9px; border: 1px solid var(--border); border-radius: var(--r-sm); font-size: 12.5px; }
  `],
})
export class ChatbotWidgetComponent {
  private readonly http = inject(HttpClient);

  open = signal(false);
  messages = signal<ChatMessage[]>([]);
  loading = signal(false);
  draft = '';

  send(): void {
    const text = this.draft.trim();
    if (!text) return;
    this.messages.update(m => [...m, { role: 'user', text }]);
    this.draft = '';
    this.loading.set(true);

    this.http.post<{ reply: string }>(`${environment.apiBaseUrl}/public/chatbot`, { message: text })
      .subscribe({
        next: (res) => {
          this.messages.update(m => [...m, { role: 'bot', text: res.reply }]);
          this.loading.set(false);
        },
        error: () => {
          this.messages.update(m => [...m, { role: 'bot', text: "Désolé, une erreur est survenue." }]);
          this.loading.set(false);
        },
      });
  }
}
