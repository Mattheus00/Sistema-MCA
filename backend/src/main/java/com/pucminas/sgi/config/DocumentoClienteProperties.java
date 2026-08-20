package com.pucminas.sgi.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "sgi.documentos")
public class DocumentoClienteProperties {

    private String storagePath = "./data/documentos-clientes";
    private long maxFileSizeBytes = 10_485_760L;
    private String allowedContentTypes =
            "application/pdf,image/jpeg,image/png,image/webp,"
                    + "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}
