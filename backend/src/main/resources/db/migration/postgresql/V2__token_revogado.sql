-- Blacklist de JWT (Fase 3). Ausente no schema de produção no momento do baseline.
CREATE TABLE token_revogado (
    jti VARCHAR(36) NOT NULL,
    expira_em TIMESTAMP NOT NULL,
    CONSTRAINT token_revogado_pkey PRIMARY KEY (jti)
);
