package com.pucminas.sgi.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.YearMonth;

@Service
public class CobrancaSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(CobrancaSchedulerService.class);

    @Value("${scheduler.enabled:true}")
    private boolean schedulerEnabled;

    private final GeracaoCobrancaRecorrenteService geracaoService;
    private final Clock clock;

    public CobrancaSchedulerService(GeracaoCobrancaRecorrenteService geracaoService, Clock clock) {
        this.geracaoService = geracaoService;
        this.clock = clock;
    }

    @Scheduled(cron = "${scheduler.cobrancas-recorrentes.cron:0 0 6 1 * *}", zone = "America/Sao_Paulo")
    public void gerarCobrancasRecorrentes() {
        if (!schedulerEnabled) return;
        YearMonth competencia = YearMonth.now(clock);
        try {
            geracaoService.gerarMensalComTaxaSeDezembro(competencia, true);
        } catch (Exception e) {
            log.error("Erro na rotina de cobranças recorrentes da competência {}: {}", competencia, e.getMessage());
        }
    }
}
