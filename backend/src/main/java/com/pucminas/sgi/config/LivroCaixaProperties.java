package com.pucminas.sgi.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "sgi.livro-caixa")
public class LivroCaixaProperties {

    private String storagePath = "./data/livro-caixa-anexos";
    private long maxFileSizeBytes = 10_485_760L;
    private String allowedContentTypes = "application/pdf,image/jpeg,image/png";
}
