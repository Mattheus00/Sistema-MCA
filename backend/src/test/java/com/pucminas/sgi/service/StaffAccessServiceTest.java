package com.pucminas.sgi.service;

import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.Perfil;
import com.pucminas.sgi.enums.StatusUsuario;
import com.pucminas.sgi.repository.UsuarioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@DisplayName("StaffAccessService")
@ExtendWith(MockitoExtension.class)
class StaffAccessServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private StaffAccessService staffAccessService;

    private static final UUID ID_FUNC = UUID.fromString("00000000-0000-0000-0000-000000000010");
    private static final UUID ID_PROP = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Test
    @DisplayName("FUNCIONARIO pode listar clientes e inadimplentes")
    void funcionarioRotasPermitidas() {
        assertTrue(staffAccessService.isRotaPermitidaParaFuncionario("GET", "/api/clientes"));
        assertTrue(staffAccessService.isRotaPermitidaParaFuncionario("POST", "/api/clientes"));
        assertTrue(staffAccessService.isRotaPermitidaParaFuncionario("PATCH", "/api/clientes/" + ID_FUNC));
        assertTrue(staffAccessService.isRotaPermitidaParaFuncionario("GET", "/api/inadimplentes"));
        assertTrue(staffAccessService.isRotaPermitidaParaFuncionario("POST", "/api/pagamentos"));
        assertTrue(staffAccessService.isRotaPermitidaParaFuncionario("POST", "/api/notificacoes/enviar-aviso-pendencia"));
        assertTrue(staffAccessService.isRotaPermitidaParaFuncionario("GET",
                "/api/clientes/" + ID_FUNC + "/honorarios"));
        assertTrue(staffAccessService.isRotaPermitidaParaFuncionario("GET", "/api/servicos"));
        assertTrue(staffAccessService.isRotaPermitidaParaFuncionario("GET", "/api/config/juros"));
    }

    @Test
    @DisplayName("FUNCIONARIO bloqueado em admin, delete cliente, honorario POST e boletos")
    void funcionarioRotasBloqueadas() {
        assertFalse(staffAccessService.isRotaPermitidaParaFuncionario("DELETE", "/api/clientes/" + ID_FUNC));
        assertFalse(staffAccessService.isRotaPermitidaParaFuncionario("GET", "/api/relatorios/resumo"));
        assertFalse(staffAccessService.isRotaPermitidaParaFuncionario("GET", "/api/lotes-envio-boletos"));
        assertFalse(staffAccessService.isRotaPermitidaParaFuncionario("GET", "/api/documentos-clientes"));
        assertFalse(staffAccessService.isRotaPermitidaParaFuncionario("PUT", "/api/config/juros"));
        assertFalse(staffAccessService.isRotaPermitidaParaFuncionario("POST",
                "/api/clientes/" + ID_FUNC + "/honorarios"));
        assertFalse(staffAccessService.isRotaPermitidaParaFuncionario("GET", "/api/clientes/ranking-devedores"));
        assertFalse(staffAccessService.isRotaPermitidaParaFuncionario("POST", "/api/honorarios/reajustes/simular"));
        assertFalse(staffAccessService.isRotaPermitidaParaFuncionario("GET", "/api/usuarios/ativos"));
    }

    @Test
    @DisplayName("assertPodeAcessarRota: FUNCIONARIO recebe 403 em relatorios")
    void assertFuncionarioRelatorios403() {
        when(usuarioRepository.findById(ID_FUNC)).thenReturn(Optional.of(
                usuario(ID_FUNC, Perfil.FUNCIONARIO)));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> staffAccessService.assertPodeAcessarRota(ID_FUNC, "GET", "/api/relatorios/resumo"));
        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    @DisplayName("assertPodeAcessarRota: PROPRIETARIA nao e restringida")
    void assertProprietariaLivre() {
        when(usuarioRepository.findById(ID_PROP)).thenReturn(Optional.of(
                usuario(ID_PROP, Perfil.PROPRIETARIA)));

        staffAccessService.assertPodeAcessarRota(ID_PROP, "GET", "/api/relatorios/resumo");
    }

    private static Usuario usuario(UUID id, Perfil perfil) {
        return Usuario.builder()
                .usuarioId(id)
                .telefone("31999999999")
                .senha("hash")
                .nome("Nome")
                .perfil(perfil)
                .statusUsuario(StatusUsuario.ATIVO)
                .build();
    }
}
