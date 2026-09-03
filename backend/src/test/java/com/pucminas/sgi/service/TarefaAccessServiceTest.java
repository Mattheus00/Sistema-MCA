package com.pucminas.sgi.service;

import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.Perfil;
import com.pucminas.sgi.enums.StatusUsuario;
import com.pucminas.sgi.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TarefaAccessServiceTest {

    private static final UUID ID_FUNC = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID ID_PROP = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID ID_RESP = UUID.fromString("33333333-3333-3333-3333-333333333333");

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private StaffAccessService staffAccessService;

    @BeforeEach
    void stub() {
        // no-op; each test stubs what it needs
    }

    @Test
    @DisplayName("FUNCIONARIO pode acessar rotas de /api/tarefas")
    void funcionarioPodeAcessarRotasTarefas() {
        assertTrue(staffAccessService.isRotaPermitidaParaFuncionario("GET", "/api/tarefas"));
        assertTrue(staffAccessService.isRotaPermitidaParaFuncionario("POST", "/api/tarefas"));
        assertTrue(staffAccessService.isRotaPermitidaParaFuncionario("PATCH",
                "/api/tarefas/" + ID_FUNC + "/mover"));
        assertTrue(staffAccessService.isRotaPermitidaParaFuncionario("DELETE",
                "/api/tarefas/" + ID_FUNC));
    }

    @Test
    @DisplayName("podeGerenciarEquipeTarefas: PROP e RESP_FIN sim, FUNCIONARIO não")
    void podeGerenciarEquipe() {
        assertTrue(staffAccessService.podeGerenciarEquipeTarefas(usuario(ID_PROP, Perfil.PROPRIETARIA)));
        assertTrue(staffAccessService.podeGerenciarEquipeTarefas(usuario(ID_RESP, Perfil.RESPONSAVEL_FINANCEIRO)));
        assertFalse(staffAccessService.podeGerenciarEquipeTarefas(usuario(ID_FUNC, Perfil.FUNCIONARIO)));
    }

    @Test
    @DisplayName("assertPodeAcessarTarefas libera FUNCIONARIO ativo")
    void assertTarefasFuncionarioOk() {
        when(usuarioRepository.findById(ID_FUNC)).thenReturn(Optional.of(usuario(ID_FUNC, Perfil.FUNCIONARIO)));
        assertDoesNotThrow(() -> staffAccessService.assertPodeAcessarTarefas(ID_FUNC));
    }

    @Test
    @DisplayName("assertPodeAcessarRota: FUNCIONARIO em tarefas não toma 403")
    void assertRotaTarefasOk() {
        when(usuarioRepository.findById(ID_FUNC)).thenReturn(Optional.of(usuario(ID_FUNC, Perfil.FUNCIONARIO)));
        assertDoesNotThrow(() -> staffAccessService.assertPodeAcessarRota(ID_FUNC, "GET", "/api/tarefas"));
    }

    @Test
    @DisplayName("assertPodeAcessarRota: FUNCIONARIO em livro-caixa toma 403")
    void assertLivroCaixaAinda403() {
        when(usuarioRepository.findById(ID_FUNC)).thenReturn(Optional.of(usuario(ID_FUNC, Perfil.FUNCIONARIO)));
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> staffAccessService.assertPodeAcessarRota(ID_FUNC, "GET", "/api/livro-caixa/dashboard"));
        assertEquals(403, ex.getStatusCode().value());
    }

    private static Usuario usuario(UUID id, Perfil perfil) {
        return Usuario.builder()
                .usuarioId(id)
                .telefone("user" + id.toString().substring(0, 8))
                .senha("x")
                .nome("User")
                .perfil(perfil)
                .statusUsuario(StatusUsuario.ATIVO)
                .build();
    }
}
