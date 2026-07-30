package com.pucminas.sgi.service;

import com.pucminas.sgi.entity.AuditoriaOperacao;
import com.pucminas.sgi.repository.AuditoriaOperacaoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditoriaService {

    public static final String USUARIO_SISTEMA = "SISTEMA";
    private static final Logger log = LoggerFactory.getLogger(AuditoriaService.class);

    private final AuditoriaOperacaoRepository auditoriaRepository;

    public AuditoriaService(AuditoriaOperacaoRepository auditoriaRepository) {
        this.auditoriaRepository = auditoriaRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrar(String acao, String entidade, Object entidadeId, String detalhes) {
        registrarComo(usuarioAtualOuSistema(), acao, entidade, entidadeId, detalhes);
    }

    /**
     * Usa a transação já aberta (evita segunda conexão no SQLite, que causa SQLITE_BUSY_SNAPSHOT).
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void registrarNaTransacaoAtual(String acao, String entidade, Object entidadeId, String detalhes) {
        registrarComo(usuarioAtualOuSistema(), acao, entidade, entidadeId, detalhes);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrarSistema(String acao, String entidade, Object entidadeId, String detalhes) {
        registrarComo(USUARIO_SISTEMA, acao, entidade, entidadeId, detalhes);
    }

    private void registrarComo(String usuario, String acao, String entidade, Object entidadeId, String detalhes) {
        try {
            auditoriaRepository.save(AuditoriaOperacao.builder()
                    .usuario(usuario)
                    .acao(acao)
                    .entidade(entidade)
                    .entidadeId(entidadeId != null ? String.valueOf(entidadeId) : null)
                    .detalhes(detalhes)
                    .build());
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria da ação {}: {}", acao, e.getMessage());
        }
    }

    private String usuarioAtualOuSistema() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            return USUARIO_SISTEMA;
        }
        return String.valueOf(auth.getPrincipal());
    }
}
