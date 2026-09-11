package com.pucminas.sgi.mapper;

import com.pucminas.sgi.dto.response.JurosConfigDTO;
import com.pucminas.sgi.entity.JurosConfig;
import org.springframework.stereotype.Component;

@Component
public class JurosConfigMapper {

    public JurosConfigDTO toDto(JurosConfig cfg) {
        return JurosConfigDTO.builder()
                .multaDiaria(cfg.getMultaDiaria())
                .capMultaPercentual(cfg.getCapMultaPercentual())
                .jurosMensal(cfg.getJurosMensal())
                .build();
    }
}
