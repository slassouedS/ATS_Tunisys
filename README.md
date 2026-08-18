# TUNISYS ATS — Plateforme de Recrutement Intelligent

Stack **100% on-premise** : PostgreSQL, MongoDB, Redis, Elasticsearch, Kafka, et un **LLM local via Ollama** (aucune donnée candidat n'est envoyée à un service tiers).

- Frontend : Angular 19 (Standalone + Signals)
- Backend : Java 21 / Spring Boot 3.3, PostgreSQL
- IA : microservice Python/FastAPI, LLM on-premise (Ollama, modèle `llama3:8b` par défaut)

---

## 0-bis. Alternative : déploiement 100% natif (sans Docker)

Si Docker Desktop est instable sur votre machine (VM/VPS avec virtualisation
capricieuse, plantages répétés), une alternative sans Docker est disponible
dans `windows-installer/` :

1. **`install-native-prerequisites.bat`** — installe Java 21, Maven, Node.js,
   Python, PostgreSQL et Ollama (via winget), crée la base `tunisys_ats` et
   télécharge le modèle LLM. **Lancez-le deux fois** : une première fois pour
   installer les outils, une seconde (après avoir rouvert un terminal) pour
   finir la configuration de la base de données.
2. **`build-and-run-native.bat`** — compile le backend (Maven), installe les
   dépendances Python, compile le frontend (Angular), puis lance les 3
   services chacun dans sa propre fenêtre PowerShell (fermez la fenêtre
   correspondante pour arrêter un service).

**Ce qui n'est pas inclus dans cette version native** : MongoDB, Redis,
Kafka, Elasticsearch, MailHog. Ce n'est pas gênant pour l'usage principal —
ces dépendances sont soit non utilisées par le code actuel, soit gérées avec
dégradation gracieuse (ex : les notifications restent en attente sans Kafka,
la CVthèque renvoie simplement aucun résultat sans Elasticsearch). Si vous
avez besoin de ces fonctionnalités complètes plus tard, repassez sur le
déploiement Docker (section 1 ci-dessous) une fois votre environnement Docker
stabilisé.

---

## 1. Installation ET lancement sur Windows (tout automatique, avec Docker)

Une seule chose à faire à la main : **exécuter le script fourni**. Il installe les
prérequis (WSL2, Docker Desktop) **et déploie la plateforme automatiquement** — vous
n'avez pas besoin de taper `docker compose up` vous-même.

1. Ouvrez le dossier `windows-installer/`
2. Double-cliquez sur `install-docker-prerequisites.bat`
   (ou depuis un terminal : `powershell -ExecutionPolicy Bypass -File .\install-docker-prerequisites.ps1`)
3. Acceptez la fenêtre UAC (droits administrateur nécessaires pour installer un logiciel)
4. Le script :
   - installe `winget` automatiquement s'il est absent
   - active WSL2 si nécessaire (redémarrage automatique proposé si besoin — relancez
     simplement le script après redémarrage, il reprend où il s'était arrêté)
   - installe **Docker Desktop** (via `winget`, avec repli automatique sur l'installeur
     officiel direct si `winget` rencontre un bug)
   - démarre Docker Desktop et attend qu'il soit pleinement opérationnel
   - **copie `.env.example` en `.env`** si absent
   - **lance `docker compose up -d --build`** (premier lancement : 10-20 minutes, le temps
     de construire les images et télécharger le modèle LLM)
   - **ouvre automatiquement votre navigateur** sur http://localhost:4200 une fois prêt

> Si le script s'arrête à une étape (ex: redémarrage Windows requis, ou build qui prend
> plus de 3 minutes), relancez-le simplement une seconde fois : il reprend où il s'était
> arrêté sans tout refaire depuis le début.

> Si votre machine n'a pas `winget` et que l'installation automatique échoue (pare-feu
> d'entreprise), le script vous donne un lien de secours vers le Microsoft Store.

---

## 2. Accès une fois la plateforme démarrée

Si vous avez besoin de relancer manuellement plus tard (redémarrage de PC, etc.), depuis
la racine du projet :

```bash
docker compose up -d
```

### Accès une fois démarré

| Service | URL | Identifiants |
|---|---|---|
| Application (frontend) | http://localhost:4200 | voir comptes de test ci-dessous |
| API backend (Swagger) | http://localhost:8080/swagger-ui.html | — |
| Microservice IA (docs) | http://localhost:8000/docs | — |
| Adminer (admin BDD) | http://localhost:8081 | serveur: `postgres`, user/pwd: cf. `.env` |
| MailHog (emails envoyés) | http://localhost:8025 | — |

### Compte administrateur par défaut

```
Email    : admin@tunisys.com
Mot de passe : Admin@2026
```

⚠️ **Changez ce mot de passe immédiatement** après le premier déploiement (menu Admin →
Utilisateurs, ou directement en base). Ce compte a été inséré par
`backend/src/main/resources/db/init/02-seed.sql`.

Créez les autres comptes (Manager, RH, Recruteur, Technique) depuis la console Admin
une fois connecté.

### Arrêter / réinitialiser

```bash
docker compose down            # arrête les conteneurs (les données persistent)
docker compose down -v         # arrête ET supprime toutes les données (repart de zéro)
```

---

## 3. Structure du dépôt

```
tunisys-ats/
├── docker-compose.yml            # orchestration de toute la stack
├── .env.example                  # variables d'environnement à copier en .env
├── windows-installer/
│   └── install-docker-prerequisites.ps1
├── backend/                      # Core ATS Service (Java 21 / Spring Boot 3.3)
│   ├── src/main/java/com/tunisys/ats/
│   │   ├── domain/                # entités JPA
│   │   ├── repository/            # Spring Data JPA
│   │   ├── service/                # logique métier (demandes, offres, candidatures, scoring...)
│   │   ├── controller/            # endpoints REST par rôle
│   │   ├── security/               # JWT
│   │   └── config/                 # Spring Security, WebClient, Kafka topics
│   └── src/main/resources/
│       ├── application.yml
│       └── db/init/               # schéma SQL + données de référence (exécuté au 1er démarrage)
├── ia-service/                    # Microservice IA (Python/FastAPI)
│   └── app/
│       ├── main.py                 # endpoints /api/parse-cv, /api/score, /api/chatbot
│       ├── parsing.py              # extraction texte PDF/DOCX
│       ├── scoring.py              # embeddings sémantiques (sentence-transformers)
│       └── llm_client.py           # client Ollama (LLM on-premise)
└── frontend/                     # Angular 19
    └── src/app/
        ├── core/                   # auth (JWT, guards, interceptor), http, layout
        ├── shared/                 # composants réutilisés (score-badge, status-tag...)
        └── features/               # un dossier par rôle : manager, rh, recruteur, technique, candidat, admin
```

---

## 4. Ce qui est fonctionnel dans cette version

- Authentification JWT + RBAC (5 rôles + candidat public)
- Module 1 : création de demande (Manager) + validation (RH)
- Module 2 : portail carrière public + candidature avec upload CV
- Module 3 : chatbot d'accueil (LLM on-premise, widget flottant sur le portail candidat)
- Module 4 : parsing CV (PDF/DOCX) via le microservice IA
- Module 5 : CVthèque — recherche avancée (Elasticsearch), indexation automatique
  de chaque candidature
- Module 6 : scoring sémantique (embeddings locaux) + explication qualitative (LLM on-premise)
- Module 7 : E-Assessment — envoi de tests (technique/personnalité) par lien à token
  unique, passation sans compte candidat, correction et scoring automatiques
- Module 8 : création de créneaux d'entretien + réservation avec verrou anti double-booking
- Module 9 : notifications — **envoi réel d'emails** via SMTP (MailHog en dev,
  consultable sur http://localhost:8025 ; branchez un vrai serveur SMTP en prod
  via les variables `SMTP_*` du `.env`). SMS : interface prête (`SmsService.java`)
  mais aucun fournisseur réel branché par défaut (nécessite un compte Twilio/Infobip
  payant) — les SMS sont journalisés en attendant.
- Module 10 : Analytics — tableau de bord RH (offres par statut, candidatures par
  étape, délai moyen d'embauche, classement recruteurs par embauches)
- Pipeline de candidature avec state machine (transitions d'étape validées)
- Audit log de toutes les actions sensibles

## 5. Ce qui reste à compléter avant une mise en production réelle

Ce dépôt est un **MVP fonctionnel de bout en bout couvrant les 10 modules**, pas
encore un produit totalement durci pour la production. À prévoir :

- **SMS réels** : brancher un vrai fournisseur (Twilio, Infobip...) dans
  `backend/.../service/SmsService.java` — l'interface et le point d'injection sont
  prêts, il ne manque que vos identifiants de compte.
- **Stockage réel des CV** : `CandidateService` génère une référence Mongo mais n'écrit
  pas encore le binaire dans MongoDB GridFS (à brancher, cf. commentaire `TODO production`
  dans le code).
- **Génération réelle des liens visio / fichiers .ics** : `InterviewService.generateVideoLink()`
  retourne un lien factice — à remplacer par un vrai appel Microsoft Graph API / Google Meet
  (Adapter Pattern recommandé si vous gardez la possibilité de swap Teams/Meet).
- **Banque de questions E-Assessment** : questions génériques codées en dur
  (`AssessmentQuestionBank.java`) — à migrer vers une table éditable par le RH si vous
  voulez personnaliser les tests par poste.
- Tests automatisés (aucun test n'est fourni dans ce MVP).
- Durcissement sécurité pour la prod (Flyway/Liquibase au lieu de `ddl-auto: update`,
  rotation des secrets, MFA, mapping ES explicite plutôt que dynamique — voir la
  feuille de route technique livrée précédemment).

## 6. Développement local (sans tout Dockeriser)

Backend seul :
```bash
cd backend
mvn spring-boot:run
```

Frontend seul (nécessite Node 22+) :
```bash
cd frontend
npm install
npm start
```

IA service seul (nécessite Python 3.11+ et un Ollama local) :
```bash
cd ia-service
pip install -r requirements.txt
uvicorn app.main:app --reload
```
