package com.pucminas.sgi.controller;

import com.pucminas.sgi.config.WebMvcConfig;
import com.pucminas.sgi.repository.*;
import com.pucminas.sgi.security.JwtAuthenticationFilter;
import com.pucminas.sgi.security.JwtTokenProvider;
import com.pucminas.sgi.security.PortalJwtAuthenticationFilter;
import com.pucminas.sgi.security.SecurityConfig;
import com.pucminas.sgi.security.StaffAccessInterceptor;
import com.pucminas.sgi.security.StaffAccessService;
import com.pucminas.sgi.service.*;
import com.pucminas.sgi.dto.response.MensagemResponseDTO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, WebMvcConfig.class, JwtAuthenticationFilter.class, PortalJwtAuthenticationFilter.class})
class AuthRecoveryMvcTest {
    @Autowired MockMvc mvc;
    @MockBean AuthService authService;
    @MockBean UsuarioService usuarioService;
    @MockBean JwtTokenProvider jwtTokenProvider;
    @MockBean TokenRevogadoRepository tokenRevogadoRepository;
    @MockBean UsuarioRepository usuarioRepository;
    @MockBean ClienteRepository clienteRepository;
    @MockBean ClientePortalCredencialRepository credencialRepository;
    @MockBean StaffAccessService staffAccessService;
    @MockBean StaffAccessInterceptor staffAccessInterceptor;

    @Test void solicitarSemAutenticacaoRetornaMensagemNeutra() throws Exception {
        when(authService.solicitarRecuperacaoSenha(any())).thenReturn(
                MensagemResponseDTO.builder().mensagem(AuthService.MENSAGEM_RECUPERACAO).build());
        mvc.perform(post("/api/auth/recuperar-senha/solicitar").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"login\":\"teste\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.mensagem").value(AuthService.MENSAGEM_RECUPERACAO));
    }
    @Test void recuperarContinuaPublicoComJwtAntigoNoHeader() throws Exception {
        when(authService.solicitarRecuperacaoSenha(any())).thenReturn(
                MensagemResponseDTO.builder().mensagem(AuthService.MENSAGEM_RECUPERACAO).build());
        mvc.perform(post("/api/auth/recuperar-senha/solicitar").header("Authorization", "Bearer expirado")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"login\":\"teste\"}"))
                .andExpect(status().isOk());
    }
    @Test void excecaoNoJwtUsaEntryPoint401SemDetalheInterno() throws Exception {
        when(jwtTokenProvider.getClaims("com-erro")).thenThrow(new IllegalStateException("segredo-interno"));
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer com-erro"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.status").value(401))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("segredo-interno"))));
    }
    @Test void redefinirComTokenSemJwtEhPublico() throws Exception {
        mvc.perform(post("/api/auth/recuperar-senha/redefinir").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"token-teste\",\"novaSenha\":\"nova123\",\"confirmarSenha\":\"nova123\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.mensagem").value("Senha alterada com sucesso."));
        verify(authService).redefinirSenhaComToken(any());
    }
    @Test void dtoInvalidoEh400() throws Exception {
        mvc.perform(post("/api/auth/recuperar-senha/solicitar").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400));
        verifyNoInteractions(authService);
    }
    @Test void faltaDeJwtTemCorpo401() throws Exception {
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401)).andExpect(jsonPath("$.path").value("/api/auth/me"));
    }
    @Test void jwtInvalidoTemCorpo401() throws Exception {
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer token-invalido"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.status").value(401));
    }
    @Test void portalSemJwtTemCorpo401() throws Exception {
        mvc.perform(get("/api/portal/documentos")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401)).andExpect(jsonPath("$.path").value("/api/portal/documentos"));
    }
}
