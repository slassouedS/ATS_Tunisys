-- ═══════════════════════════════════════════════════════════════
-- TUNISYS ATS — Schéma PostgreSQL
-- Exécuté automatiquement par le conteneur postgres au premier démarrage
-- (Hibernate ddl-auto=update complètera les colonnes ajoutées côté code,
--  mais la structure de base et les données de référence sont créées ici)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS departments (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    manager_id      BIGINT
);

CREATE TABLE IF NOT EXISTS roles (
    id              BIGSERIAL PRIMARY KEY,
    code            VARCHAR(30) NOT NULL UNIQUE,
    label           VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    role_id         BIGINT NOT NULL REFERENCES roles(id),
    department_id   BIGINT REFERENCES departments(id),
    is_active       BOOLEAN DEFAULT TRUE,
    mfa_enabled     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at   TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

ALTER TABLE departments ADD CONSTRAINT fk_dept_manager
    FOREIGN KEY (manager_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE IF NOT EXISTS recruitment_demands (
    id               BIGSERIAL PRIMARY KEY,
    title            VARCHAR(200) NOT NULL,
    department_id    BIGINT NOT NULL REFERENCES departments(id),
    requested_by     BIGINT NOT NULL REFERENCES users(id),
    profile_desc     TEXT,
    budget           NUMERIC(10,2),
    urgency          VARCHAR(20) DEFAULT 'NORMAL',
    status           VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    validated_by     BIGINT REFERENCES users(id),
    validated_at     TIMESTAMP,
    rejection_reason VARCHAR(500),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_demands_status ON recruitment_demands(status);
CREATE INDEX IF NOT EXISTS idx_demands_requester ON recruitment_demands(requested_by);

CREATE TABLE IF NOT EXISTS job_offers (
    id                  BIGSERIAL PRIMARY KEY,
    demand_id           BIGINT NOT NULL REFERENCES recruitment_demands(id),
    title               VARCHAR(200) NOT NULL,
    description         TEXT NOT NULL,
    requirements        TEXT,
    location            VARCHAR(150),
    contract_type       VARCHAR(30),
    ai_score_threshold  NUMERIC(5,2) DEFAULT 70.00,
    status              VARCHAR(20) DEFAULT 'DRAFT',
    published_at        TIMESTAMP,
    closed_at           TIMESTAMP,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_offers_status ON job_offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_demand ON job_offers(demand_id);

CREATE TABLE IF NOT EXISTS candidates (
    id               BIGSERIAL PRIMARY KEY,
    email            VARCHAR(150) NOT NULL UNIQUE,
    phone            VARCHAR(30),
    first_name       VARCHAR(100) NOT NULL,
    last_name        VARCHAR(100) NOT NULL,
    linkedin_url     VARCHAR(255),
    gdpr_consent_at  TIMESTAMP,
    data_retention_until DATE,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);

CREATE TABLE IF NOT EXISTS cv_documents (
    id               BIGSERIAL PRIMARY KEY,
    candidate_id     BIGINT NOT NULL REFERENCES candidates(id),
    mongo_ref_id     VARCHAR(64) NOT NULL,
    file_name        VARCHAR(255),
    file_format      VARCHAR(10),
    parsing_status   VARCHAR(20) DEFAULT 'PENDING',
    uploaded_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cv_candidate ON cv_documents(candidate_id);

CREATE TABLE IF NOT EXISTS applications (
    id                     BIGSERIAL PRIMARY KEY,
    candidate_id           BIGINT NOT NULL REFERENCES candidates(id),
    offer_id               BIGINT NOT NULL REFERENCES job_offers(id),
    cv_document_id         BIGINT REFERENCES cv_documents(id),
    ai_score               NUMERIC(5,2),
    ai_score_explanation   TEXT,
    current_stage          VARCHAR(30) NOT NULL DEFAULT 'RECEIVED',
    assigned_recruiter_id  BIGINT REFERENCES users(id),
    assigned_technical_id  BIGINT REFERENCES users(id),
    final_decision         VARCHAR(20),
    decision_by            BIGINT REFERENCES users(id),
    decision_at            TIMESTAMP,
    version                INTEGER DEFAULT 0,
    created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (candidate_id, offer_id)
);
CREATE INDEX IF NOT EXISTS idx_app_offer_stage ON applications(offer_id, current_stage);
CREATE INDEX IF NOT EXISTS idx_app_candidate ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_app_score ON applications(ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_app_recruiter ON applications(assigned_recruiter_id);

CREATE TABLE IF NOT EXISTS application_stage_history (
    id              BIGSERIAL PRIMARY KEY,
    application_id  BIGINT NOT NULL REFERENCES applications(id),
    from_stage      VARCHAR(30),
    to_stage        VARCHAR(30) NOT NULL,
    changed_by      BIGINT REFERENCES users(id),
    comment         VARCHAR(1000),
    changed_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_stage_hist_app ON application_stage_history(application_id);

CREATE TABLE IF NOT EXISTS assessments (
    id              BIGSERIAL PRIMARY KEY,
    application_id  BIGINT NOT NULL REFERENCES applications(id),
    type            VARCHAR(20) NOT NULL,
    sent_at         TIMESTAMP,
    completed_at    TIMESTAMP,
    score           NUMERIC(5,2),
    passing_score   NUMERIC(5,2),
    result_json     TEXT
);
CREATE INDEX IF NOT EXISTS idx_assessment_app ON assessments(application_id);

CREATE TABLE IF NOT EXISTS interview_slots (
    id              BIGSERIAL PRIMARY KEY,
    interviewer_id  BIGINT NOT NULL REFERENCES users(id),
    slot_start      TIMESTAMP NOT NULL,
    slot_end        TIMESTAMP NOT NULL,
    mode            VARCHAR(20) DEFAULT 'VISIO',
    location        VARCHAR(150),
    is_booked       BOOLEAN DEFAULT FALSE,
    version         INTEGER DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_slot_interviewer_time ON interview_slots(interviewer_id, slot_start);

CREATE TABLE IF NOT EXISTS interviews (
    id              BIGSERIAL PRIMARY KEY,
    application_id  BIGINT NOT NULL REFERENCES applications(id),
    slot_id         BIGINT NOT NULL REFERENCES interview_slots(id),
    interview_type  VARCHAR(20) NOT NULL,
    video_link      VARCHAR(500),
    ics_generated   BOOLEAN DEFAULT FALSE,
    outcome         VARCHAR(20),
    report          TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_interview_app ON interviews(application_id);

CREATE TABLE IF NOT EXISTS notifications (
    id              BIGSERIAL PRIMARY KEY,
    recipient_type  VARCHAR(20) NOT NULL,
    recipient_id    BIGINT NOT NULL,
    channel         VARCHAR(10) NOT NULL,
    template_code   VARCHAR(50),
    payload         TEXT,
    status          VARCHAR(20) DEFAULT 'PENDING',
    sent_at         TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications(recipient_type, recipient_id);

CREATE TABLE IF NOT EXISTS audit_log (
    id              BIGSERIAL PRIMARY KEY,
    actor_user_id   BIGINT REFERENCES users(id),
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(50),
    entity_id       BIGINT,
    details         TEXT,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(created_at DESC);
