package com.pucminas.sgi.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "sgi.boletos")
public class BoletoEnvioProperties {

    private String storagePath = "./data/boletos-temp";
    private long maxFileSizeBytes = 10_485_760L;
    private String allowedContentTypes = "application/pdf";
    private int maxFilesPerLote = 100;
    private String nomeEscritorio = "Contabilidade São Judas Tadeu";
}
