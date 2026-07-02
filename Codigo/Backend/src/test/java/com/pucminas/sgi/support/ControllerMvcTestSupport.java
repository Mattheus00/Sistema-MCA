package com.pucminas.sgi.support;

import com.pucminas.sgi.config.JwtAuthenticationFilter;
import com.pucminas.sgi.config.JwtTokenProvider;
import com.pucminas.sgi.repository.UsuarioRepository;
import org.springframework.boot.test.mock.mockito.MockBean;

/**
 * Beans de segurança exigidos pelo contexto parcial do {@code @WebMvcTest}.
 */
public abstract class ControllerMvcTestSupport {

    @MockBean
    protected JwtTokenProvider jwtTokenProvider;

    @MockBean
    protected JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    protected UsuarioRepository usuarioRepository;
}
