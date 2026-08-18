-- Rôles de référence (RBAC — cf. matrice de permissions de la feuille de route)
INSERT INTO roles (code, label) VALUES
    ('MANAGER',   'Manager / Chef de Projet'),
    ('RH',        'Responsable RH'),
    ('RECRUTEUR', 'Chargé de Recrutement'),
    ('TECH',      'Responsable Technique'),
    ('ADMIN',     'Administrateur Système')
ON CONFLICT (code) DO NOTHING;

-- Département par défaut
INSERT INTO departments (name) VALUES ('Direction Digital')
ON CONFLICT DO NOTHING;

-- Compte admin par défaut — mot de passe : "Admin@2026" (BCrypt)
-- ⚠️ À CHANGER IMMÉDIATEMENT après le premier déploiement.
INSERT INTO users (email, password_hash, first_name, last_name, role_id, is_active)
SELECT 'admin@tunisys.com',
       '$2b$10$nhKWEB4Fy8bKXGjbocVYu.taSeLp.5WAKk8Tg9YBDZKtW.I3EZRAq',
       'Admin', 'Systeme',
       (SELECT id FROM roles WHERE code = 'ADMIN'),
       TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@tunisys.com');
