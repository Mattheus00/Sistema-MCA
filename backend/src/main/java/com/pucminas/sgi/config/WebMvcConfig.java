package com.pucminas.sgi.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final StaffAccessInterceptor staffAccessInterceptor;

    public WebMvcConfig(StaffAccessInterceptor staffAccessInterceptor) {
        this.staffAccessInterceptor = staffAccessInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(staffAccessInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns(
                        "/api/portal/**",
                        "/api/auth/login",
                        "/api/auth/register",
                        "/api/auth/validar-login-recuperacao",
                        "/api/auth/redefinir-senha",
                        "/api/sicoob/webhook/**"
                );
    }
}
