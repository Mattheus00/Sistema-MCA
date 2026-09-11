package com.pucminas.sgi.support;

import com.pucminas.sgi.security.JwtAuthenticationFilter;
import com.pucminas.sgi.security.JwtTokenProvider;
import com.pucminas.sgi.security.PortalJwtAuthenticationFilter;
import com.pucminas.sgi.repository.TokenRevogadoRepository;
import com.pucminas.sgi.repository.UsuarioRepository;
import com.pucminas.sgi.security.StaffAccessService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/**
 * Beans de segurança exigidos pelo contexto parcial do {@code @WebMvcTest}.
 */
public abstract class ControllerMvcTestSupport {

    @MockitoBean
    protected StaffAccessService staffAccessService;

    @MockitoBean
    protected JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    protected JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    protected PortalJwtAuthenticationFilter portalJwtAuthenticationFilter;

    @MockitoBean
    protected UsuarioRepository usuarioRepository;

    @MockitoBean
    protected TokenRevogadoRepository tokenRevogadoRepository;
}
