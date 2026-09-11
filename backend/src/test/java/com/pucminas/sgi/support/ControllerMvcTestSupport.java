package com.pucminas.sgi.support;

import com.pucminas.sgi.security.JwtAuthenticationFilter;
import com.pucminas.sgi.security.JwtTokenProvider;
import com.pucminas.sgi.security.PortalJwtAuthenticationFilter;
import com.pucminas.sgi.repository.TokenRevogadoRepository;
import com.pucminas.sgi.repository.UsuarioRepository;
import com.pucminas.sgi.security.StaffAccessService;
import org.springframework.boot.test.mock.mockito.MockBean;

/**
 * Beans de segurança exigidos pelo contexto parcial do {@code @WebMvcTest}.
 */
public abstract class ControllerMvcTestSupport {

    @MockBean
    protected StaffAccessService staffAccessService;

    @MockBean
    protected JwtTokenProvider jwtTokenProvider;

    @MockBean
    protected JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    protected PortalJwtAuthenticationFilter portalJwtAuthenticationFilter;

    @MockBean
    protected UsuarioRepository usuarioRepository;

    @MockBean
    protected TokenRevogadoRepository tokenRevogadoRepository;
}
