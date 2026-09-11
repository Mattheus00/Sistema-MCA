-- Baseline do schema PostgreSQL de produção (Render).
-- Gerado a partir de information_schema; não recria dados.
-- Em bancos já existentes o Flyway apenas registra esta versão (baseline-on-migrate).

CREATE TABLE usuario (
    usuario_id UUID NOT NULL,
    criado_em TIMESTAMP NOT NULL,
    nome VARCHAR(255) NOT NULL,
    perfil VARCHAR(255) NOT NULL,
    senha VARCHAR(255) NOT NULL,
    status_usuario VARCHAR(255) NOT NULL,
    telefone VARCHAR(255) NOT NULL,
    ultimo_acesso TIMESTAMP,
    email VARCHAR(255),
    CONSTRAINT usuario_pkey PRIMARY KEY (usuario_id)
);

CREATE TABLE cliente (
    cliente_id UUID NOT NULL,
    atualizado_em TIMESTAMP,
    celular VARCHAR(255),
    codigo VARCHAR(255),
    cpf_cnpj VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP NOT NULL,
    email VARCHAR(255),
    endereco VARCHAR(255),
    nome VARCHAR(255) NOT NULL,
    saldo_devedor NUMERIC(19,0) NOT NULL,
    status_cliente VARCHAR(255) NOT NULL,
    telefone VARCHAR(255),
    portal_habilitado BOOLEAN DEFAULT TRUE,
    CONSTRAINT cliente_pkey PRIMARY KEY (cliente_id)
);

CREATE TABLE servico (
    servico_id UUID NOT NULL,
    ativo BOOLEAN NOT NULL,
    descricao VARCHAR(500),
    nome VARCHAR(200) NOT NULL,
    valor_padrao NUMERIC(19,0),
    CONSTRAINT servico_pkey PRIMARY KEY (servico_id)
);

CREATE TABLE juros_config (
    id UUID NOT NULL,
    atualizado_em TIMESTAMP,
    cap_multa_percentual NUMERIC(10,4) NOT NULL,
    juros_mensal NUMERIC(10,4) NOT NULL,
    multa_diaria NUMERIC(10,4) NOT NULL,
    CONSTRAINT juros_config_pkey PRIMARY KEY (id)
);

CREATE TABLE email_config (
    config_id UUID NOT NULL,
    ativo BOOLEAN NOT NULL,
    atualizado_em TIMESTAMP,
    email_remetente VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    nome_remetente VARCHAR(255),
    porta INTEGER NOT NULL,
    senha VARCHAR(255),
    usartls BOOLEAN NOT NULL,
    usuario VARCHAR(255),
    CONSTRAINT email_config_pkey PRIMARY KEY (config_id)
);

CREATE TABLE auditoria_operacao (
    auditoria_id UUID NOT NULL,
    acao VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP NOT NULL,
    detalhes VARCHAR(1000),
    entidade VARCHAR(255) NOT NULL,
    entidade_id VARCHAR(255),
    usuario VARCHAR(255) NOT NULL,
    CONSTRAINT auditoria_operacao_pkey PRIMARY KEY (auditoria_id)
);

CREATE TABLE agendamento_notificacao (
    agendamento_id UUID NOT NULL,
    ativo BOOLEAN NOT NULL,
    criado_em TIMESTAMP NOT NULL,
    criterio_atraso INTEGER NOT NULL,
    descricao VARCHAR(255),
    nome VARCHAR(255) NOT NULL,
    periodicidade VARCHAR(255) NOT NULL,
    proxima_execucao TIMESTAMP,
    ultima_execucao TIMESTAMP,
    CONSTRAINT agendamento_notificacao_pkey PRIMARY KEY (agendamento_id)
);

CREATE TABLE divida (
    divida_id UUID NOT NULL,
    atualizado_em TIMESTAMP,
    criado_em TIMESTAMP NOT NULL,
    descricao VARCHAR(255),
    protocolo VARCHAR(255) NOT NULL,
    status_divida VARCHAR(255) NOT NULL,
    valor_devedor NUMERIC(19,0) NOT NULL,
    valor_original NUMERIC(19,0) NOT NULL,
    vencimento DATE NOT NULL,
    cliente_id UUID NOT NULL,
    ano_taxa_balanco INTEGER,
    competencia VARCHAR(7),
    gerada_automaticamente BOOLEAN,
    origem_cobranca VARCHAR(50),
    tipo_cobranca VARCHAR(255),
    CONSTRAINT divida_pkey PRIMARY KEY (divida_id)
);

CREATE TABLE divida_item_servico (
    divida_servico_id UUID NOT NULL,
    valor NUMERIC(19,0) NOT NULL,
    divida_id UUID NOT NULL,
    servico_id UUID NOT NULL,
    CONSTRAINT divida_item_servico_pkey PRIMARY KEY (divida_servico_id)
);

CREATE TABLE pagamento (
    pagamento_id UUID NOT NULL,
    comprovante VARCHAR(255),
    criado_em TIMESTAMP NOT NULL,
    data_pagamento DATE NOT NULL,
    divida_id UUID,
    metodo_pagamento VARCHAR(255),
    valor_pago NUMERIC(19,0) NOT NULL,
    CONSTRAINT pagamento_pkey PRIMARY KEY (pagamento_id)
);

CREATE TABLE honorario_cliente (
    honorario_id UUID NOT NULL,
    ativo BOOLEAN NOT NULL,
    criado_em TIMESTAMP NOT NULL,
    criado_por VARCHAR(255),
    data_fim_vigencia DATE,
    data_inicio_vigencia DATE NOT NULL,
    observacao VARCHAR(500),
    percentual_reajuste NUMERIC(9,4),
    valor NUMERIC(19,0) NOT NULL,
    cliente_id UUID NOT NULL,
    CONSTRAINT honorario_cliente_pkey PRIMARY KEY (honorario_id)
);

CREATE TABLE configuracao_cobranca (
    configuracao_id UUID NOT NULL,
    atualizado_em TIMESTAMP,
    cobranca_recorrente_ativa BOOLEAN NOT NULL,
    criado_em TIMESTAMP NOT NULL,
    dia_vencimento INTEGER NOT NULL,
    taxa_balanco_ativa BOOLEAN NOT NULL,
    cliente_id UUID NOT NULL,
    CONSTRAINT configuracao_cobranca_pkey PRIMARY KEY (configuracao_id)
);

CREATE TABLE cobranca_sicoob (
    cobranca_id UUID NOT NULL,
    atualizado_em TIMESTAMP,
    boleto_codigo_barras TEXT,
    boleto_linha_digitavel TEXT,
    boleto_nosso_numero VARCHAR(255),
    criado_em TIMESTAMP NOT NULL,
    mensagem_erro TEXT,
    pago_em TIMESTAMP,
    pix_copiaecola TEXT,
    pix_qr_code TEXT,
    pix_txid VARCHAR(255),
    status VARCHAR(255) NOT NULL,
    tipo VARCHAR(255) NOT NULL,
    valor_centavos NUMERIC(19,0) NOT NULL,
    divida_id UUID NOT NULL,
    CONSTRAINT cobranca_sicoob_pkey PRIMARY KEY (cobranca_id)
);

CREATE TABLE cliente_portal_credencial (
    credencial_id UUID NOT NULL,
    criado_em TIMESTAMP NOT NULL,
    senha VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL,
    ultimo_acesso TIMESTAMP,
    cliente_id UUID NOT NULL,
    CONSTRAINT cliente_portal_credencial_pkey PRIMARY KEY (credencial_id)
);

CREATE TABLE documento_cliente (
    documento_id UUID NOT NULL,
    content_type VARCHAR(255) NOT NULL,
    enviado_em TIMESTAMP NOT NULL,
    hash_sha256 VARCHAR(64) NOT NULL,
    nome_armazenado VARCHAR(255) NOT NULL,
    nome_original VARCHAR(255) NOT NULL,
    observacao_cliente TEXT,
    respondido_em TIMESTAMP,
    resposta_escritorio TEXT,
    status VARCHAR(255) NOT NULL,
    tamanho_bytes BIGINT NOT NULL,
    tipo VARCHAR(255) NOT NULL,
    cliente_id UUID NOT NULL,
    divida_id UUID,
    respondido_por_id UUID,
    CONSTRAINT documento_cliente_pkey PRIMARY KEY (documento_id)
);

CREATE TABLE lote_envio_boleto (
    lote_id UUID NOT NULL,
    atualizado_em TIMESTAMP,
    criado_em TIMESTAMP NOT NULL,
    data_confirmacao TIMESTAMP,
    data_finalizacao TIMESTAMP,
    quantidade_com_erro INTEGER NOT NULL,
    quantidade_enviada INTEGER NOT NULL,
    quantidade_identificada INTEGER NOT NULL,
    quantidade_pendente INTEGER NOT NULL,
    quantidade_total INTEGER NOT NULL,
    status VARCHAR(255) NOT NULL,
    version BIGINT,
    usuario_responsavel_id UUID NOT NULL,
    CONSTRAINT lote_envio_boleto_pkey PRIMARY KEY (lote_id)
);

CREATE TABLE envio_boleto (
    envio_boleto_id UUID NOT NULL,
    atualizado_em TIMESTAMP,
    confianca_identificacao VARCHAR(255) NOT NULL,
    confirmado_pelo_usuario BOOLEAN NOT NULL,
    content_type VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP NOT NULL,
    data_envio TIMESTAMP,
    email_destinatario VARCHAR(255),
    hash_arquivo VARCHAR(64) NOT NULL,
    mensagem_erro VARCHAR(255),
    metodo_identificacao VARCHAR(255) NOT NULL,
    nome_arquivo_armazenado VARCHAR(255) NOT NULL,
    nome_arquivo_original VARCHAR(255) NOT NULL,
    possivel_duplicidade BOOLEAN NOT NULL,
    quantidade_tentativas INTEGER NOT NULL,
    reenvio BOOLEAN NOT NULL,
    simulado BOOLEAN NOT NULL,
    status VARCHAR(255) NOT NULL,
    tamanho_arquivo BIGINT NOT NULL,
    cliente_id UUID,
    enviado_por_id UUID,
    lote_id UUID NOT NULL,
    CONSTRAINT envio_boleto_pkey PRIMARY KEY (envio_boleto_id)
);

CREATE TABLE notificacao_email (
    notificacao_id UUID NOT NULL,
    assunto VARCHAR(255) NOT NULL,
    cliente_id UUID NOT NULL,
    corpo_email TEXT NOT NULL,
    corpo_html TEXT,
    criado_em TIMESTAMP NOT NULL,
    data_envio TIMESTAMP,
    divida_id UUID,
    email_destino VARCHAR(255) NOT NULL,
    mensagem_erro VARCHAR(255),
    proxima_tentativa TIMESTAMP,
    status_envio VARCHAR(255) NOT NULL,
    tentativas INTEGER NOT NULL,
    tipo VARCHAR(255) NOT NULL,
    valor_comunicado NUMERIC(19,0) NOT NULL,
    CONSTRAINT notificacao_email_pkey PRIMARY KEY (notificacao_id)
);

CREATE TABLE livro_caixa_categoria (
    id UUID NOT NULL,
    ativo BOOLEAN NOT NULL,
    criado_em TIMESTAMP NOT NULL,
    nome VARCHAR(120) NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    CONSTRAINT livro_caixa_categoria_pkey PRIMARY KEY (id)
);

CREATE TABLE conta_financeira (
    id UUID NOT NULL,
    ativo BOOLEAN NOT NULL,
    criado_em TIMESTAMP NOT NULL,
    nome VARCHAR(120) NOT NULL,
    saldo_inicial_centavos NUMERIC(19,0) NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    CONSTRAINT conta_financeira_pkey PRIMARY KEY (id)
);

CREATE TABLE livro_caixa_recorrencia (
    id UUID NOT NULL,
    ativo BOOLEAN NOT NULL,
    criado_em TIMESTAMP NOT NULL,
    criado_por VARCHAR(80) NOT NULL,
    data_fim DATE,
    data_inicio DATE NOT NULL,
    descricao VARCHAR(300) NOT NULL,
    forma_pagamento VARCHAR(30),
    fornecedor VARCHAR(200),
    intervalo_dias INTEGER,
    observacao VARCHAR(2000),
    proxima_geracao DATE NOT NULL,
    recorrencia VARCHAR(20) NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    valor_centavos NUMERIC(19,0) NOT NULL,
    categoria_id UUID NOT NULL,
    cliente_id UUID,
    conta_id UUID,
    CONSTRAINT livro_caixa_recorrencia_pkey PRIMARY KEY (id)
);

CREATE TABLE livro_caixa_movimentacao (
    id UUID NOT NULL,
    atualizado_em TIMESTAMP,
    atualizado_por VARCHAR(80),
    cancelado_em TIMESTAMP,
    categoria_id UUID NOT NULL,
    cliente_id UUID,
    conta_id UUID,
    criado_em TIMESTAMP NOT NULL,
    criado_por VARCHAR(80) NOT NULL,
    data_movimentacao DATE NOT NULL,
    data_pagamento DATE,
    data_vencimento DATE,
    descricao VARCHAR(300) NOT NULL,
    forma_pagamento VARCHAR(30),
    fornecedor VARCHAR(200),
    observacao VARCHAR(2000),
    origem VARCHAR(20) NOT NULL,
    origem_id UUID,
    recorrencia_id UUID,
    status VARCHAR(20) NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    valor_centavos NUMERIC(19,0) NOT NULL,
    CONSTRAINT livro_caixa_movimentacao_pkey PRIMARY KEY (id)
);

CREATE TABLE livro_caixa_anexo (
    id UUID NOT NULL,
    content_type VARCHAR(120) NOT NULL,
    criado_em TIMESTAMP NOT NULL,
    enviado_por VARCHAR(80) NOT NULL,
    hash_sha256 VARCHAR(64) NOT NULL,
    movimentacao_id UUID,
    nome_armazenado VARCHAR(255) NOT NULL,
    nome_original VARCHAR(255) NOT NULL,
    tamanho_bytes BIGINT NOT NULL,
    CONSTRAINT livro_caixa_anexo_pkey PRIMARY KEY (id)
);

CREATE TABLE livro_caixa_historico (
    id UUID NOT NULL,
    campo VARCHAR(80) NOT NULL,
    criado_em TIMESTAMP NOT NULL,
    detalhes VARCHAR(1000),
    usuario VARCHAR(80) NOT NULL,
    valor_anterior VARCHAR(500),
    valor_novo VARCHAR(500),
    movimentacao_id UUID NOT NULL,
    CONSTRAINT livro_caixa_historico_pkey PRIMARY KEY (id)
);

CREATE TABLE tarefa (
    id UUID NOT NULL,
    atualizado_em TIMESTAMP,
    categoria VARCHAR(120),
    concluido_em TIMESTAMP,
    criado_em TIMESTAMP NOT NULL,
    criado_por_id UUID NOT NULL,
    data_inicio DATE,
    data_vencimento DATE,
    descricao VARCHAR(4000),
    observacoes VARCHAR(2000),
    ordem_kanban INTEGER NOT NULL DEFAULT 0,
    prioridade VARCHAR(20) NOT NULL,
    responsavel_id UUID NOT NULL,
    status VARCHAR(30) NOT NULL,
    titulo VARCHAR(300) NOT NULL,
    CONSTRAINT tarefa_pkey PRIMARY KEY (id)
);

CREATE TABLE tarefa_checklist (
    id UUID NOT NULL,
    atualizado_em TIMESTAMP,
    concluido BOOLEAN NOT NULL,
    criado_em TIMESTAMP NOT NULL,
    descricao VARCHAR(500) NOT NULL,
    ordem INTEGER NOT NULL,
    tarefa_id UUID NOT NULL,
    CONSTRAINT tarefa_checklist_pkey PRIMARY KEY (id)
);

CREATE TABLE tarefa_historico (
    id UUID NOT NULL,
    acao VARCHAR(80) NOT NULL,
    criado_em TIMESTAMP NOT NULL,
    descricao VARCHAR(1000) NOT NULL,
    tarefa_id UUID NOT NULL,
    usuario_id UUID,
    CONSTRAINT tarefa_historico_pkey PRIMARY KEY (id)
);

CREATE TABLE token_recuperacao_senha (
    id UUID NOT NULL,
    expira_em TIMESTAMP NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    usado_em TIMESTAMP,
    usuario_id UUID NOT NULL,
    CONSTRAINT token_recuperacao_senha_pkey PRIMARY KEY (id)
);

-- Foreign keys
ALTER TABLE divida ADD CONSTRAINT fk_divida_cliente_id FOREIGN KEY (cliente_id) REFERENCES cliente(cliente_id);
ALTER TABLE divida_item_servico ADD CONSTRAINT fk_divida_item_servico_divida_id FOREIGN KEY (divida_id) REFERENCES divida(divida_id);
ALTER TABLE divida_item_servico ADD CONSTRAINT fk_divida_item_servico_servico_id FOREIGN KEY (servico_id) REFERENCES servico(servico_id);
ALTER TABLE pagamento ADD CONSTRAINT fk_pagamento_divida_id FOREIGN KEY (divida_id) REFERENCES divida(divida_id);
ALTER TABLE honorario_cliente ADD CONSTRAINT fk_honorario_cliente_cliente_id FOREIGN KEY (cliente_id) REFERENCES cliente(cliente_id);
ALTER TABLE configuracao_cobranca ADD CONSTRAINT fk_configuracao_cobranca_cliente_id FOREIGN KEY (cliente_id) REFERENCES cliente(cliente_id);
ALTER TABLE cobranca_sicoob ADD CONSTRAINT fk_cobranca_sicoob_divida_id FOREIGN KEY (divida_id) REFERENCES divida(divida_id);
ALTER TABLE cliente_portal_credencial ADD CONSTRAINT fk_cliente_portal_credencial_cliente_id FOREIGN KEY (cliente_id) REFERENCES cliente(cliente_id);
ALTER TABLE documento_cliente ADD CONSTRAINT fk_documento_cliente_cliente_id FOREIGN KEY (cliente_id) REFERENCES cliente(cliente_id);
ALTER TABLE documento_cliente ADD CONSTRAINT fk_documento_cliente_divida_id FOREIGN KEY (divida_id) REFERENCES divida(divida_id);
ALTER TABLE documento_cliente ADD CONSTRAINT fk_documento_cliente_respondido_por_id FOREIGN KEY (respondido_por_id) REFERENCES usuario(usuario_id);
ALTER TABLE lote_envio_boleto ADD CONSTRAINT fk_lote_envio_boleto_usuario_responsavel_id FOREIGN KEY (usuario_responsavel_id) REFERENCES usuario(usuario_id);
ALTER TABLE envio_boleto ADD CONSTRAINT fk_envio_boleto_cliente_id FOREIGN KEY (cliente_id) REFERENCES cliente(cliente_id);
ALTER TABLE envio_boleto ADD CONSTRAINT fk_envio_boleto_enviado_por_id FOREIGN KEY (enviado_por_id) REFERENCES usuario(usuario_id);
ALTER TABLE envio_boleto ADD CONSTRAINT fk_envio_boleto_lote_id FOREIGN KEY (lote_id) REFERENCES lote_envio_boleto(lote_id);
ALTER TABLE livro_caixa_recorrencia ADD CONSTRAINT fk_livro_caixa_recorrencia_categoria_id FOREIGN KEY (categoria_id) REFERENCES livro_caixa_categoria(id);
ALTER TABLE livro_caixa_recorrencia ADD CONSTRAINT fk_livro_caixa_recorrencia_conta_id FOREIGN KEY (conta_id) REFERENCES conta_financeira(id);
ALTER TABLE livro_caixa_recorrencia ADD CONSTRAINT fk_livro_caixa_recorrencia_cliente_id FOREIGN KEY (cliente_id) REFERENCES cliente(cliente_id);
ALTER TABLE livro_caixa_movimentacao ADD CONSTRAINT fk_livro_caixa_movimentacao_categoria_id FOREIGN KEY (categoria_id) REFERENCES livro_caixa_categoria(id);
ALTER TABLE livro_caixa_movimentacao ADD CONSTRAINT fk_livro_caixa_movimentacao_conta_id FOREIGN KEY (conta_id) REFERENCES conta_financeira(id);
ALTER TABLE livro_caixa_movimentacao ADD CONSTRAINT fk_livro_caixa_movimentacao_cliente_id FOREIGN KEY (cliente_id) REFERENCES cliente(cliente_id);
ALTER TABLE livro_caixa_movimentacao ADD CONSTRAINT fk_livro_caixa_movimentacao_recorrencia_id FOREIGN KEY (recorrencia_id) REFERENCES livro_caixa_recorrencia(id);
ALTER TABLE livro_caixa_anexo ADD CONSTRAINT fk_livro_caixa_anexo_movimentacao_id FOREIGN KEY (movimentacao_id) REFERENCES livro_caixa_movimentacao(id);
ALTER TABLE livro_caixa_historico ADD CONSTRAINT fk_livro_caixa_historico_movimentacao_id FOREIGN KEY (movimentacao_id) REFERENCES livro_caixa_movimentacao(id);
ALTER TABLE tarefa ADD CONSTRAINT fk_tarefa_responsavel_id FOREIGN KEY (responsavel_id) REFERENCES usuario(usuario_id);
ALTER TABLE tarefa ADD CONSTRAINT fk_tarefa_criado_por_id FOREIGN KEY (criado_por_id) REFERENCES usuario(usuario_id);
ALTER TABLE tarefa_checklist ADD CONSTRAINT fk_tarefa_checklist_tarefa_id FOREIGN KEY (tarefa_id) REFERENCES tarefa(id);
ALTER TABLE tarefa_historico ADD CONSTRAINT fk_tarefa_historico_tarefa_id FOREIGN KEY (tarefa_id) REFERENCES tarefa(id);
ALTER TABLE tarefa_historico ADD CONSTRAINT fk_tarefa_historico_usuario_id FOREIGN KEY (usuario_id) REFERENCES usuario(usuario_id);
ALTER TABLE token_recuperacao_senha ADD CONSTRAINT fk_token_recuperacao_senha_usuario_id FOREIGN KEY (usuario_id) REFERENCES usuario(usuario_id);

-- Índices (nomes alinhados à produção; UNIQUE de token_hash com nome estável)
CREATE INDEX idx_agendamento_ativo_proxima ON agendamento_notificacao (ativo, proxima_execucao);
CREATE INDEX idx_auditoria_acao ON auditoria_operacao (acao);
CREATE INDEX idx_auditoria_criado_em ON auditoria_operacao (criado_em);
CREATE INDEX idx_auditoria_entidade ON auditoria_operacao (entidade, entidade_id);
CREATE INDEX idx_cliente_codigo ON cliente (codigo);
CREATE INDEX idx_cliente_cpf_cnpj ON cliente (cpf_cnpj);
CREATE INDEX idx_cliente_email ON cliente (email);
CREATE INDEX idx_cliente_status ON cliente (status_cliente);
CREATE UNIQUE INDEX idx_portal_credencial_cliente ON cliente_portal_credencial (cliente_id);
CREATE INDEX idx_cobranca_sicoob_divida ON cobranca_sicoob (divida_id);
CREATE INDEX idx_cobranca_sicoob_nosso_numero ON cobranca_sicoob (boleto_nosso_numero);
CREATE UNIQUE INDEX idx_cobranca_sicoob_txid ON cobranca_sicoob (pix_txid);
CREATE UNIQUE INDEX idx_config_cobranca_cliente ON configuracao_cobranca (cliente_id);
CREATE INDEX idx_config_cobranca_recorrente ON configuracao_cobranca (cobranca_recorrente_ativa);
CREATE INDEX idx_config_taxa_balanco ON configuracao_cobranca (taxa_balanco_ativa);
CREATE INDEX idx_conta_financeira_ativo ON conta_financeira (ativo);
CREATE INDEX idx_divida_cliente ON divida (cliente_id);
CREATE UNIQUE INDEX idx_divida_protocolo ON divida (protocolo);
CREATE INDEX idx_divida_status ON divida (status_divida);
CREATE INDEX idx_divida_tipo_competencia ON divida (tipo_cobranca, competencia);
CREATE INDEX idx_divida_vencimento ON divida (vencimento);
CREATE INDEX idx_divida_item_divida ON divida_item_servico (divida_id);
CREATE INDEX idx_divida_item_servico ON divida_item_servico (servico_id);
CREATE INDEX idx_documento_cliente_cliente ON documento_cliente (cliente_id);
CREATE INDEX idx_documento_cliente_divida ON documento_cliente (divida_id);
CREATE INDEX idx_documento_cliente_enviado ON documento_cliente (enviado_em);
CREATE INDEX idx_documento_cliente_status ON documento_cliente (status);
CREATE INDEX idx_email_config_ativo ON email_config (ativo);
CREATE INDEX idx_envio_boleto_cliente ON envio_boleto (cliente_id);
CREATE INDEX idx_envio_boleto_data_envio ON envio_boleto (data_envio);
CREATE INDEX idx_envio_boleto_hash ON envio_boleto (hash_arquivo);
CREATE INDEX idx_envio_boleto_lote ON envio_boleto (lote_id);
CREATE INDEX idx_envio_boleto_status ON envio_boleto (status);
CREATE INDEX idx_honorario_cliente_ativo ON honorario_cliente (cliente_id, ativo);
CREATE INDEX idx_honorario_cliente_vigencia ON honorario_cliente (cliente_id, data_inicio_vigencia, data_fim_vigencia);
CREATE INDEX idx_lc_anexo_mov ON livro_caixa_anexo (movimentacao_id);
CREATE INDEX idx_lc_categoria_ativo ON livro_caixa_categoria (ativo);
CREATE INDEX idx_lc_categoria_tipo ON livro_caixa_categoria (tipo);
CREATE INDEX idx_lc_hist_criado ON livro_caixa_historico (criado_em);
CREATE INDEX idx_lc_hist_mov ON livro_caixa_historico (movimentacao_id);
CREATE INDEX idx_lc_mov_cliente ON livro_caixa_movimentacao (cliente_id);
CREATE INDEX idx_lc_mov_data ON livro_caixa_movimentacao (data_movimentacao);
CREATE INDEX idx_lc_mov_origem ON livro_caixa_movimentacao (origem, origem_id);
CREATE INDEX idx_lc_mov_status ON livro_caixa_movimentacao (status);
CREATE INDEX idx_lc_mov_tipo ON livro_caixa_movimentacao (tipo);
CREATE INDEX idx_lc_mov_vencimento ON livro_caixa_movimentacao (data_vencimento);
CREATE UNIQUE INDEX uk_lc_mov_origem ON livro_caixa_movimentacao (origem, origem_id);
CREATE INDEX idx_lc_rec_ativo ON livro_caixa_recorrencia (ativo);
CREATE INDEX idx_lc_rec_proxima ON livro_caixa_recorrencia (proxima_geracao);
CREATE INDEX idx_lote_boleto_criado ON lote_envio_boleto (criado_em);
CREATE INDEX idx_lote_boleto_status ON lote_envio_boleto (status);
CREATE INDEX idx_lote_boleto_usuario ON lote_envio_boleto (usuario_responsavel_id);
CREATE INDEX idx_notif_cliente ON notificacao_email (cliente_id);
CREATE INDEX idx_notif_divida ON notificacao_email (divida_id);
CREATE INDEX idx_notif_proxima_tentativa ON notificacao_email (status_envio, proxima_tentativa);
CREATE INDEX idx_notif_status ON notificacao_email (status_envio);
CREATE INDEX idx_pagamento_data ON pagamento (data_pagamento);
CREATE INDEX idx_pagamento_divida ON pagamento (divida_id);
CREATE INDEX idx_servico_ativo ON servico (ativo);
CREATE INDEX idx_tarefa_ordem ON tarefa (status, ordem_kanban);
CREATE INDEX idx_tarefa_prioridade ON tarefa (prioridade);
CREATE INDEX idx_tarefa_responsavel ON tarefa (responsavel_id);
CREATE INDEX idx_tarefa_status ON tarefa (status);
CREATE INDEX idx_tarefa_vencimento ON tarefa (data_vencimento);
CREATE INDEX idx_tarefa_checklist_tarefa ON tarefa_checklist (tarefa_id);
CREATE INDEX idx_tarefa_historico_criado ON tarefa_historico (criado_em);
CREATE INDEX idx_tarefa_historico_tarefa ON tarefa_historico (tarefa_id);
CREATE INDEX idx_token_recup_expira ON token_recuperacao_senha (expira_em);
CREATE INDEX idx_token_recup_usuario ON token_recuperacao_senha (usuario_id);
CREATE UNIQUE INDEX uk_token_recup_hash ON token_recuperacao_senha (token_hash);
CREATE UNIQUE INDEX idx_usuario_telefone ON usuario (telefone);

