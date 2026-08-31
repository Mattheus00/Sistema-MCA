package com.pucminas.sgi.service;

import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.Perfil;
import com.pucminas.sgi.enums.StatusUsuario;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import static org.springframework.http.HttpStatus.FORBIDDEN;

/**
 * Regras de acesso do escritório por perfil (inclui FUNCIONARIO limitado).
 */
@Service
public class StaffAccessService {

    private static final String UUID_RE =
            "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

    private static final Set<Perfil> PERFIS_FINANCEIRO_COMPLETO = Set.of(
            Perfil.PROPRIETARIA,
            Perfil.RESPONSAVEL_FINANCEIRO
    );

    private static final Set<Perfil> PERFIS_COBRANCA = Set.of(
            Perfil.PROPRIETARIA,
            Perfil.RESPONSAVEL_FINANCEIRO,
            Perfil.FUNCIONARIO
    );

    private final UsuarioRepository usuarioRepository;

    public StaffAccessService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    public Usuario requireUsuarioAtivo(UUID usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", usuarioId));
        if (usuario.getStatusUsuario() != StatusUsuario.ATIVO) {
            throw new ResponseStatusException(FORBIDDEN, "Usuário inativo.");
        }
        return usuario;
    }

    public Usuario assertStaff(UUID usuarioId) {
        Usuario usuario = requireUsuarioAtivo(usuarioId);
        if (usuario.getPerfil() == null) {
            throw new ResponseStatusException(FORBIDDEN, "Perfil sem permissão.");
        }
        return usuario;
    }

    public Usuario assertPodeOperarCobranca(UUID usuarioId) {
        Usuario usuario = assertStaff(usuarioId);
        if (!PERFIS_COBRANCA.contains(usuario.getPerfil())) {
            throw new ResponseStatusException(FORBIDDEN, "Perfil sem permissão para cobrança.");
        }
        return usuario;
    }

    public Usuario assertPodeGerenciarClientesCompleto(UUID usuarioId) {
        Usuario usuario = assertStaff(usuarioId);
        if (!PERFIS_FINANCEIRO_COMPLETO.contains(usuario.getPerfil())) {
            throw new ResponseStatusException(FORBIDDEN, "Perfil sem permissão para esta operação de clientes.");
        }
        return usuario;
    }

    public Usuario assertPodeAcessoFinanceiroCompleto(UUID usuarioId) {
        Usuario usuario = assertStaff(usuarioId);
        if (!PERFIS_FINANCEIRO_COMPLETO.contains(usuario.getPerfil())) {
            throw new ResponseStatusException(FORBIDDEN, "Perfil sem permissão para esta área.");
        }
        return usuario;
    }

    /** Livro Caixa: somente proprietária e responsável financeiro. */
    public Usuario assertPodeAcessarLivroCaixa(UUID usuarioId) {
        return assertPodeAcessoFinanceiroCompleto(usuarioId);
    }

    public Usuario assertPodeAdmin(UUID usuarioId) {
        Usuario usuario = assertStaff(usuarioId);
        if (usuario.getPerfil() != Perfil.PROPRIETARIA) {
            throw new ResponseStatusException(FORBIDDEN, "Apenas a proprietária pode realizar esta operação.");
        }
        return usuario;
    }

    /**
     * Para FUNCIONARIO, só libera rotas de clientes (sem delete/ranking/docs) e cobrança.
     * Demais perfis de escritório não são restringidos aqui.
     */
    public void assertPodeAcessarRota(UUID usuarioId, String httpMethod, String requestUri) {
        Usuario usuario = assertStaff(usuarioId);
        if (usuario.getPerfil() != Perfil.FUNCIONARIO) {
            return;
        }
        if (!isRotaPermitidaParaFuncionario(httpMethod, requestUri)) {
            throw new ResponseStatusException(FORBIDDEN, "Perfil Funcionário sem permissão para esta área.");
        }
    }

    public boolean isRotaPermitidaParaFuncionario(String httpMethod, String requestUri) {
        String method = httpMethod == null ? "" : httpMethod.toUpperCase(Locale.ROOT);
        String path = normalizePath(requestUri);

        if (path.startsWith("/api/auth/")) {
            return true;
        }

        if (path.equals("/api/clientes") || path.startsWith("/api/clientes/")) {
            if (path.contains("/documentos")) {
                return false;
            }
            if (path.equals("/api/clientes/ranking-devedores")) {
                return false;
            }
            if (path.matches("/api/clientes/" + UUID_RE + "/honorarios(/atual)?")) {
                return "GET".equals(method);
            }
            if ("DELETE".equals(method)) {
                return false;
            }
            return Set.of("GET", "POST", "PUT", "PATCH").contains(method);
        }

        if (path.startsWith("/api/inadimplentes")) {
            return true;
        }
        if (path.startsWith("/api/pagamentos")) {
            return true;
        }
        if (path.startsWith("/api/dividas")) {
            return true;
        }

        if (path.equals("/api/notificacoes/enviar-aviso-pendencia") && "POST".equals(method)) {
            return true;
        }
        if (path.matches("/api/notificacoes/cliente/" + UUID_RE) && "GET".equals(method)) {
            return true;
        }

        if (path.equals("/api/config/juros") && "GET".equals(method)) {
            return true;
        }

        if ("GET".equals(method) && (path.equals("/api/servicos") || path.equals("/api/servicos/todos")
                || path.matches("/api/servicos/" + UUID_RE))) {
            return true;
        }

        return false;
    }

    private static String normalizePath(String requestUri) {
        if (requestUri == null || requestUri.isBlank()) {
            return "";
        }
        String path = requestUri;
        int q = path.indexOf('?');
        if (q >= 0) {
            path = path.substring(0, q);
        }
        if (path.length() > 1 && path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }
        return path;
    }
}
