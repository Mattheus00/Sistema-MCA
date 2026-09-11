package com.pucminas.sgi.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

import java.time.Clock;
import java.time.YearMonth;

@Service
@Slf4j
@RequiredArgsConstructor
public class CobrancaSchedulerService {

    @Value("${scheduler.enabled:true}")
    private boolean schedulerEnabled;

    private final GeracaoCobrancaRecorrenteService geracaoService;
    private final Clock clock;


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
