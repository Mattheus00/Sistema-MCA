package com.pucminas.sgi.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.Connection;

/**
 * Garante tabelas/colunas do portal e documentos no PostgreSQL de produção
 * (complementa ddl-auto=update quando o índice/coluna falhou na criação inicial).
 */
@Component
@Profile("prod")
public class PostgresPortalSchemaBootstrap {

    private static final Logger log = LoggerFactory.getLogger(PostgresPortalSchemaBootstrap.class);

    private final DataSource dataSource;
    private final JdbcTemplate jdbc;

    public PostgresPortalSchemaBootstrap(DataSource dataSource) {
        this.dataSource = dataSource;
        this.jdbc = new JdbcTemplate(dataSource);
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void ensureSchema() {
        try (Connection connection = dataSource.getConnection()) {
            String url = connection.getMetaData().getURL();
            if (url == null || !url.contains("postgresql")) {
                return;
            }
        } catch (Exception e) {
            log.warn("Não foi possível identificar o banco para bootstrap de schema: {}", e.getMessage());
            return;
        }

        try {
            jdbc.execute("ALTER TABLE cliente ADD COLUMN IF NOT EXISTS portal_habilitado BOOLEAN DEFAULT TRUE");
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS documento_cliente (
                        documento_id UUID PRIMARY KEY,
                        cliente_id UUID NOT NULL,
                        divida_id UUID,
                        tipo VARCHAR(50) NOT NULL,
                        nome_original VARCHAR(255) NOT NULL,
                        nome_armazenado VARCHAR(255) NOT NULL,
                        content_type VARCHAR(255) NOT NULL,
                        tamanho_bytes BIGINT NOT NULL,
                        hash_sha256 VARCHAR(64) NOT NULL,
                        observacao_cliente TEXT,
                        resposta_escritorio TEXT,
                        respondido_em TIMESTAMP,
                        respondido_por_id UUID,
                        status VARCHAR(50) NOT NULL,
                        enviado_em TIMESTAMP NOT NULL
                    )
                    """);
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_documento_cliente_cliente ON documento_cliente(cliente_id)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_documento_cliente_divida ON documento_cliente(divida_id)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_documento_cliente_status ON documento_cliente(status)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_documento_cliente_enviado ON documento_cliente(enviado_em)");

            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS cliente_portal_credencial (
                        credencial_id UUID PRIMARY KEY,
                        cliente_id UUID NOT NULL UNIQUE,
                        senha VARCHAR(255) NOT NULL,
                        status VARCHAR(50) NOT NULL,
                        ultimo_acesso TIMESTAMP,
                        criado_em TIMESTAMP NOT NULL
                    )
                    """);
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_portal_credencial_cliente ON cliente_portal_credencial(cliente_id)");

            jdbc.execute("ALTER TABLE notificacao_email ADD COLUMN IF NOT EXISTS corpo_html TEXT");

            // Hibernate cria CHECK do enum na criação da tabela, mas não atualiza ao adicionar valores.
            jdbc.execute("ALTER TABLE usuario DROP CONSTRAINT IF EXISTS usuario_perfil_check");
            jdbc.execute("""
                    ALTER TABLE usuario ADD CONSTRAINT usuario_perfil_check
                    CHECK ((perfil)::text = ANY ((ARRAY[
                        'RESPONSAVEL_FINANCEIRO'::character varying,
                        'PROPRIETARIA'::character varying,
                        'FUNCIONARIO'::character varying
                    ])::text[]))
                    """);

            log.info("Bootstrap de schema Postgres (portal/documentos/perfil) concluído.");
            ensureLivroCaixaSchema();
            ensureTarefasSchema();
        } catch (Exception e) {
            log.error("Falha no bootstrap de schema Postgres: {}", e.getMessage(), e);
        }
    }

    private void ensureLivroCaixaSchema() {
        try {
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS livro_caixa_categoria (
                        id UUID PRIMARY KEY,
                        nome VARCHAR(120) NOT NULL,
                        tipo VARCHAR(20) NOT NULL,
                        ativo BOOLEAN NOT NULL DEFAULT TRUE,
                        criado_em TIMESTAMP NOT NULL
                    )
                    """);
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS conta_financeira (
                        id UUID PRIMARY KEY,
                        nome VARCHAR(120) NOT NULL,
                        tipo VARCHAR(30) NOT NULL,
                        saldo_inicial_centavos NUMERIC(19,0) NOT NULL DEFAULT 0,
                        ativo BOOLEAN NOT NULL DEFAULT TRUE,
                        criado_em TIMESTAMP NOT NULL
                    )
                    """);
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS livro_caixa_recorrencia (
                        id UUID PRIMARY KEY,
                        descricao VARCHAR(300) NOT NULL,
                        tipo VARCHAR(20) NOT NULL,
                        valor_centavos NUMERIC(19,0) NOT NULL,
                        categoria_id UUID NOT NULL,
                        conta_id UUID,
                        cliente_id UUID,
                        fornecedor VARCHAR(200),
                        forma_pagamento VARCHAR(30),
                        recorrencia VARCHAR(20) NOT NULL,
                        intervalo_dias INTEGER,
                        data_inicio DATE NOT NULL,
                        data_fim DATE,
                        proxima_geracao DATE NOT NULL,
                        ativo BOOLEAN NOT NULL DEFAULT TRUE,
                        observacao VARCHAR(2000),
                        criado_por VARCHAR(80) NOT NULL,
                        criado_em TIMESTAMP NOT NULL
                    )
                    """);
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS livro_caixa_movimentacao (
                        id UUID PRIMARY KEY,
                        tipo VARCHAR(20) NOT NULL,
                        descricao VARCHAR(300) NOT NULL,
                        valor_centavos NUMERIC(19,0) NOT NULL,
                        categoria_id UUID NOT NULL,
                        cliente_id UUID,
                        data_movimentacao DATE NOT NULL,
                        data_vencimento DATE,
                        data_pagamento DATE,
                        status VARCHAR(20) NOT NULL,
                        forma_pagamento VARCHAR(30),
                        conta_id UUID,
                        observacao VARCHAR(2000),
                        fornecedor VARCHAR(200),
                        origem VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
                        origem_id UUID,
                        recorrencia_id UUID,
                        criado_por VARCHAR(80) NOT NULL,
                        atualizado_por VARCHAR(80),
                        criado_em TIMESTAMP NOT NULL,
                        atualizado_em TIMESTAMP,
                        cancelado_em TIMESTAMP,
                        CONSTRAINT uk_lc_mov_origem UNIQUE (origem, origem_id)
                    )
                    """);
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS livro_caixa_anexo (
                        id UUID PRIMARY KEY,
                        movimentacao_id UUID NOT NULL,
                        nome_original VARCHAR(255) NOT NULL,
                        nome_armazenado VARCHAR(255) NOT NULL,
                        hash_sha256 VARCHAR(64) NOT NULL,
                        tamanho_bytes BIGINT NOT NULL,
                        content_type VARCHAR(120) NOT NULL,
                        enviado_por VARCHAR(80) NOT NULL,
                        criado_em TIMESTAMP NOT NULL
                    )
                    """);
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS livro_caixa_historico (
                        id UUID PRIMARY KEY,
                        movimentacao_id UUID NOT NULL,
                        usuario VARCHAR(80) NOT NULL,
                        campo VARCHAR(80) NOT NULL,
                        valor_anterior VARCHAR(500),
                        valor_novo VARCHAR(500),
                        detalhes VARCHAR(1000),
                        criado_em TIMESTAMP NOT NULL
                    )
                    """);
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_lc_mov_tipo ON livro_caixa_movimentacao(tipo)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_lc_mov_status ON livro_caixa_movimentacao(status)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_lc_mov_data ON livro_caixa_movimentacao(data_movimentacao)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_lc_categoria_tipo ON livro_caixa_categoria(tipo)");
            log.info("Bootstrap de schema Postgres (Livro Caixa) concluído.");
        } catch (Exception e) {
            log.error("Falha no bootstrap Livro Caixa Postgres: {}", e.getMessage(), e);
        }
    }

    private void ensureTarefasSchema() {
        try {
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS tarefa (
                        id UUID PRIMARY KEY,
                        titulo VARCHAR(300) NOT NULL,
                        descricao VARCHAR(4000),
                        status VARCHAR(30) NOT NULL,
                        prioridade VARCHAR(20) NOT NULL,
                        responsavel_id UUID NOT NULL,
                        criado_por_id UUID NOT NULL,
                        data_inicio DATE,
                        data_vencimento DATE,
                        categoria VARCHAR(120),
                        ordem_kanban INTEGER NOT NULL DEFAULT 0,
                        observacoes VARCHAR(2000),
                        concluido_em TIMESTAMP,
                        criado_em TIMESTAMP NOT NULL,
                        atualizado_em TIMESTAMP
                    )
                    """);
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS tarefa_checklist (
                        id UUID PRIMARY KEY,
                        tarefa_id UUID NOT NULL,
                        descricao VARCHAR(500) NOT NULL,
                        concluido BOOLEAN NOT NULL DEFAULT FALSE,
                        ordem INTEGER NOT NULL DEFAULT 0,
                        criado_em TIMESTAMP NOT NULL,
                        atualizado_em TIMESTAMP
                    )
                    """);
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS tarefa_historico (
                        id UUID PRIMARY KEY,
                        tarefa_id UUID NOT NULL,
                        usuario_id UUID,
                        acao VARCHAR(80) NOT NULL,
                        descricao VARCHAR(1000) NOT NULL,
                        criado_em TIMESTAMP NOT NULL
                    )
                    """);
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_tarefa_responsavel ON tarefa(responsavel_id)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_tarefa_status ON tarefa(status)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_tarefa_prioridade ON tarefa(prioridade)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_tarefa_vencimento ON tarefa(data_vencimento)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_tarefa_checklist_tarefa ON tarefa_checklist(tarefa_id)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_tarefa_historico_tarefa ON tarefa_historico(tarefa_id)");
            log.info("Bootstrap de schema Postgres (Gestão de Tarefas) concluído.");
        } catch (Exception e) {
            log.error("Falha no bootstrap Gestão de Tarefas Postgres: {}", e.getMessage(), e);
        }
    }
}
