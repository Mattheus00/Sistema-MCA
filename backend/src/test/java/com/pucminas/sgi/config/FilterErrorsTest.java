package com.pucminas.sgi.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.*;
import com.pucminas.sgi.exception.*;
import com.pucminas.sgi.repository.*;
import com.pucminas.sgi.service.StaffAccessService;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class FilterErrorsTest {
    ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
    JwtTokenProvider jwt = mock(JwtTokenProvider.class);
    UsuarioRepository usuarios = mock(UsuarioRepository.class);
    FilterChain chain = mock(FilterChain.class);
    @AfterEach void limparContexto() { SecurityContextHolder.clearContext(); }

    @Test void usuarioInativoRetorna401SemExecutarController() throws Exception {
        UUID id = UUID.randomUUID();
        when(jwt.getClaims("teste")).thenReturn(new JwtTokenProvider.JwtClaims(id, "login", Perfil.FUNCIONARIO, "Teste"));
        when(usuarios.findById(id)).thenReturn(Optional.of(Usuario.builder().statusUsuario(StatusUsuario.INATIVO).build()));
        MockHttpServletResponse response = new MockHttpServletResponse();
        new JwtAuthenticationFilter(jwt, usuarios, mapper).doFilter(request("/api/clientes", true), response, chain);
        verificar(response, 401, "/api/clientes");
        verifyNoInteractions(chain);
    }
    @Test void erroNoJwtLimpaContextoEDelegaARespostaParaSecurity() throws Exception {
        when(jwt.getClaims("teste")).thenThrow(new IllegalStateException("segredo-interno"));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("antigo", null, List.of()));
        MockHttpServletResponse response = new MockHttpServletResponse();
        new JwtAuthenticationFilter(jwt, usuarios, mapper).doFilter(request("/api/clientes", true), response, chain);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        assertThat(response.getContentAsString()).doesNotContain("segredo-interno", "teste");
        verify(chain).doFilter(any(), any());
    }
    @Test void limiteRetorna429ComErrorResponseCompleto() throws Exception {
        RateLimitFilter filtro = new RateLimitFilter(mapper);
        MockHttpServletResponse response = null;
        for (int i = 0; i < 21; i++) {
            response = new MockHttpServletResponse();
            filtro.doFilter(request("/api/auth/recuperar-senha/solicitar", false), response, chain);
        }
        verificar(response, 429, "/api/auth/recuperar-senha/solicitar");
        verify(chain, times(20)).doFilter(any(), any());
    }
    @Test void interceptorEscapaAspasENovasLinhasComObjectMapper() throws Exception {
        StaffAccessService staff = mock(StaffAccessService.class);
        UUID id = UUID.randomUUID();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(id, null, List.of()));
        String message = "Acesso \"negado\"\nsegunda linha\\teste";
        doThrow(new AccessDeniedBusinessException(message)).when(staff).assertPodeAcessarRota(id, "GET", "/api/clientes");
        MockHttpServletResponse response = new MockHttpServletResponse();
        boolean permitido = new StaffAccessInterceptor(staff, mapper).preHandle(request("/api/clientes", false), response, new Object());
        assertThat(permitido).isFalse();
        verificar(response, 403, "/api/clientes");
        assertThat(mapper.readValue(response.getContentAsString(), ErrorResponse.class).getMessage()).isEqualTo(message);
    }
    @Test void portalComTokenInvalidoRetorna401() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        new PortalJwtAuthenticationFilter(jwt, mock(ClienteRepository.class), mock(ClientePortalCredencialRepository.class), mapper)
                .doFilter(request("/api/portal/documentos", true), response, chain);
        verificar(response, 401, "/api/portal/documentos");
        verifyNoInteractions(chain);
    }
    private MockHttpServletRequest request(String path, boolean bearer) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", path);
        request.setRemoteAddr("127.0.0.10");
        if (bearer) request.addHeader("Authorization", "Bearer teste");
        return request;
    }
    private void verificar(MockHttpServletResponse response, int status, String path) throws Exception {
        assertThat(response.getStatus()).isEqualTo(status);
        ErrorResponse body = mapper.readValue(response.getContentAsString(), ErrorResponse.class);
        assertThat(body.getStatus()).isEqualTo(status);
        assertThat(body.getPath()).isEqualTo(path);
        assertThat(body.getTimestamp()).isNotNull();
        assertThat(body.getMessage()).isNotBlank();
        assertThat(body.getError()).isNotBlank();
    }
}
