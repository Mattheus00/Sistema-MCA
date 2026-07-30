package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.response.GeracaoCobrancaItemDTO;
import com.pucminas.sgi.dto.response.GeracaoCobrancaResultadoDTO;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.ConfiguracaoCobranca;
import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.entity.HonorarioCliente;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.enums.StatusDivida;
import com.pucminas.sgi.enums.TipoCobranca;
import com.pucminas.sgi.event.ClienteStatusUpdateEvent;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.repository.ConfiguracaoCobrancaRepository;
import com.pucminas.sgi.repository.DividaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class GeracaoCobrancaRecorrenteService {

    private static final Logger log = LoggerFactory.getLogger(GeracaoCobrancaRecorrenteService.class);
    private static final DateTimeFormatter COMPETENCIA_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");

    private final ConfiguracaoCobrancaRepository configuracaoRepository;
    private final DividaRepository dividaRepository;
    private final HonorarioClienteService honorarioService;
    private final AuditoriaService auditoriaService;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;

    public GeracaoCobrancaRecorrenteService(ConfiguracaoCobrancaRepository configuracaoRepository,
                                            DividaRepository dividaRepository,
                                            HonorarioClienteService honorarioService,
                                            AuditoriaService auditoriaService,
                                            ApplicationEventPublisher eventPublisher,
                                            Clock clock) {
        this.configuracaoRepository = configuracaoRepository;
        this.dividaRepository = dividaRepository;
        this.honorarioService = honorarioService;
        this.auditoriaService = auditoriaService;
        this.eventPublisher = eventPublisher;
        this.clock = clock;
    }

    @Transactional
    public GeracaoCobrancaResultadoDTO gerarMensalComTaxaSeDezembro(YearMonth competencia, boolean automatico) {
        GeracaoCobrancaResultadoDTO mensal = gerarHonorariosMensais(competencia, automatico);
        if (competencia.getMonthValue() == 12) {
            GeracaoCobrancaResultadoDTO taxa = gerarTaxasBalanco(competencia.getYear(), automatico);
            List<GeracaoCobrancaItemDTO> detalhes = new ArrayList<>(mensal.getDetalhes());
            detalhes.addAll(taxa.getDetalhes());
            return GeracaoCobrancaResultadoDTO.builder()
                    .competencia(formatar(competencia))
                    .clientesAnalisados(mensal.getClientesAnalisados() + taxa.getClientesAnalisados())
                    .cobrancasMensaisCriadas(mensal.getCobrancasMensaisCriadas())
                    .taxasBalancoCriadas(taxa.getTaxasBalancoCriadas())
                    .duplicidadesIgnoradas(mensal.getDuplicidadesIgnoradas() + taxa.getDuplicidadesIgnoradas())
                    .erros(mensal.getErros() + taxa.getErros())
                    .detalhes(detalhes)
                    .build();
        }
        return mensal;
    }

    @Transactional
    public GeracaoCobrancaResultadoDTO gerarHonorariosMensais(YearMonth competencia, boolean automatico) {
        List<ConfiguracaoCobranca> configs = configuracaoRepository.findAtivasParaClientesComStatus(StatusCliente.ATIVO);
        ResultadoAcumulado acc = new ResultadoAcumulado(formatar(competencia));
        for (ConfiguracaoCobranca cfg : configs) {
            acc.clientesAnalisados++;
            processarCobranca(cfg, competencia, TipoCobranca.HONORARIO_MENSAL, automatico, acc);
        }
        log.info("Geração mensal {}: analisados={}, criadas={}, duplicadas={}, erros={}",
                acc.competencia, acc.clientesAnalisados, acc.cobrancasMensaisCriadas, acc.duplicidadesIgnoradas, acc.erros);
        return acc.toDto();
    }

    @Transactional
    public GeracaoCobrancaResultadoDTO gerarTaxasBalanco(int ano, boolean automatico) {
        YearMonth competencia = YearMonth.of(ano, 12);
        List<ConfiguracaoCobranca> configs = configuracaoRepository.findTaxaBalancoAtivasParaClientesComStatus(StatusCliente.ATIVO);
        ResultadoAcumulado acc = new ResultadoAcumulado(formatar(competencia));
        for (ConfiguracaoCobranca cfg : configs) {
            acc.clientesAnalisados++;
            processarCobranca(cfg, competencia, TipoCobranca.TAXA_BALANCO, automatico, acc);
        }
        log.info("Geração taxa balanço {}: analisados={}, criadas={}, duplicadas={}, erros={}",
                ano, acc.clientesAnalisados, acc.taxasBalancoCriadas, acc.duplicidadesIgnoradas, acc.erros);
        return acc.toDto();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void processarCobranca(ConfiguracaoCobranca cfg,
                                  YearMonth competencia,
                                  TipoCobranca tipo,
                                  boolean automatico,
                                  ResultadoAcumulado acc) {
        Cliente cliente = cfg.getCliente();
        String competenciaTexto = formatar(competencia);
        try {
            if (dividaRepository.existsByCliente_ClienteIdAndTipoCobrancaAndCompetencia(
                    cliente.getClienteId(), tipo, competenciaTexto)) {
                acc.duplicidade(cliente, tipo, competenciaTexto);
                return;
            }
            HonorarioCliente honorario = honorarioService.buscarVigente(cliente.getClienteId(), competencia.atDay(1));
            LocalDate vencimento = competencia.atDay(Math.min(cfg.getDiaVencimento(), competencia.lengthOfMonth()));
            Divida divida = Divida.builder()
                    .cliente(cliente)
                    .valorOriginal(honorario.getValor())
                    .valorDevedor(honorario.getValor())
                    .vencimento(vencimento)
                    .descricao(descricao(tipo, competencia))
                    .tipoCobranca(tipo)
                    .competencia(competenciaTexto)
                    .geradaAutomaticamente(automatico)
                    .origemCobranca(automatico ? AuditoriaService.USUARIO_SISTEMA : "MANUAL")
                    .anoTaxaBalanco(tipo == TipoCobranca.TAXA_BALANCO ? competencia.getYear() : null)
                    .statusDivida(LocalDate.now(clock).isAfter(vencimento) ? StatusDivida.VENCIDA : StatusDivida.EM_ABERTO)
                    .protocolo(gerarProtocolo())
                    .build();
            divida = dividaRepository.saveAndFlush(divida);
            eventPublisher.publishEvent(new ClienteStatusUpdateEvent(cliente.getClienteId()));
            if (tipo == TipoCobranca.TAXA_BALANCO) {
                acc.taxasBalancoCriadas++;
            } else {
                acc.cobrancasMensaisCriadas++;
            }
            acc.ok(cliente, tipo, competenciaTexto, divida.getDividaId());
            auditoriaService.registrarSistema(acaoCriacao(tipo), "Divida", divida.getDividaId(),
                    "clienteId=" + cliente.getClienteId() + ", competencia=" + competenciaTexto);
        } catch (DataIntegrityViolationException e) {
            acc.duplicidade(cliente, tipo, competenciaTexto);
        } catch (Exception e) {
            acc.erro(cliente, tipo, competenciaTexto, e.getMessage());
            auditoriaService.registrarSistema("ERRO_GERACAO_COBRANCA", "Cliente", cliente.getClienteId(),
                    "tipo=" + tipo + ", competencia=" + competenciaTexto + ", erro=" + e.getMessage());
        }
    }

    public YearMonth parseCompetencia(String competencia) {
        try {
            if (competencia == null || competencia.isBlank()) {
                return YearMonth.now(clock);
            }
            return YearMonth.parse(competencia, COMPETENCIA_FORMATTER);
        } catch (DateTimeParseException e) {
            throw new BusinessRuleException("Competência inválida. Use o formato yyyy-MM.");
        }
    }

    private static String formatar(YearMonth competencia) {
        return competencia.format(COMPETENCIA_FORMATTER);
    }

    private static String descricao(TipoCobranca tipo, YearMonth competencia) {
        if (tipo == TipoCobranca.TAXA_BALANCO) {
            return "Taxa de Balanço - " + competencia.getYear();
        }
        return "Honorário mensal referente à competência "
                + String.format("%02d/%d", competencia.getMonthValue(), competencia.getYear());
    }

    private static String acaoCriacao(TipoCobranca tipo) {
        return tipo == TipoCobranca.TAXA_BALANCO ? "TAXA_BALANCO_GERADA" : "COBRANCA_MENSAL_GERADA";
    }

    private static String gerarProtocolo() {
        String data = LocalDate.now().format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE);
        String uuidCurto = UUID.randomUUID().toString().substring(0, 8).toUpperCase().replace("-", "");
        return "DIV-" + data + "-" + uuidCurto;
    }

    static class ResultadoAcumulado {
        private final String competencia;
        private int clientesAnalisados;
        private int cobrancasMensaisCriadas;
        private int taxasBalancoCriadas;
        private int duplicidadesIgnoradas;
        private int erros;
        private final List<GeracaoCobrancaItemDTO> detalhes = new ArrayList<>();

        ResultadoAcumulado(String competencia) {
            this.competencia = competencia;
        }

        void ok(Cliente cliente, TipoCobranca tipo, String competencia, UUID dividaId) {
            detalhes.add(item(cliente, tipo, competencia, dividaId, "CRIADA", "Cobrança criada."));
        }

        void duplicidade(Cliente cliente, TipoCobranca tipo, String competencia) {
            duplicidadesIgnoradas++;
            detalhes.add(item(cliente, tipo, competencia, null, "DUPLICADA", "Cobrança já existente."));
        }

        void erro(Cliente cliente, TipoCobranca tipo, String competencia, String mensagem) {
            erros++;
            detalhes.add(item(cliente, tipo, competencia, null, "ERRO", mensagem));
        }

        private GeracaoCobrancaItemDTO item(Cliente cliente, TipoCobranca tipo, String competencia,
                                            UUID dividaId, String status, String mensagem) {
            return GeracaoCobrancaItemDTO.builder()
                    .clienteId(cliente.getClienteId())
                    .clienteNome(cliente.getNome())
                    .tipoCobranca(tipo)
                    .competencia(competencia)
                    .dividaId(dividaId)
                    .status(status)
                    .mensagem(mensagem)
                    .build();
        }

        GeracaoCobrancaResultadoDTO toDto() {
            return GeracaoCobrancaResultadoDTO.builder()
                    .competencia(competencia)
                    .clientesAnalisados(clientesAnalisados)
                    .cobrancasMensaisCriadas(cobrancasMensaisCriadas)
                    .taxasBalancoCriadas(taxasBalancoCriadas)
                    .duplicidadesIgnoradas(duplicidadesIgnoradas)
                    .erros(erros)
                    .detalhes(detalhes)
                    .build();
        }
    }
}
