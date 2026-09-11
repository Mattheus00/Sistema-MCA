package com.pucminas.sgi.config;

import com.pucminas.sgi.security.PublicRoutes;
import com.pucminas.sgi.security.StaffAccessInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final StaffAccessInterceptor staffAccessInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(staffAccessInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns(PublicRoutes.INTERCEPTOR_EXCLUSIONS);
    }
}
