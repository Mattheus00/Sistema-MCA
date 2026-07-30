package com.pucminas.sgi.service;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.enums.ConfiancaIdentificacaoBoleto;
import com.pucminas.sgi.enums.MetodoIdentificacaoBoleto;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.util.DocumentoUtil;
import com.pucminas.sgi.util.NomeArquivoUtil;
import com.pucminas.sgi.util.TextoIdentificacaoUtil;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ClienteIdentificacaoBoletoService {

    private static final double LIMIAR_AMBIGUIDADE = 0.15;
    private static final double LIMIAR_VENCEDOR_CLARO = 0.82;
    private static final double LIMIAR_SEGUNDO_DISTANTE = 0.65;
    private static final Pattern PREFIXO_CODIGO_NOME = Pattern.compile("^(\\d{1,6})\\s+.+");

    private final ClienteRepository clienteRepository;

    public ClienteIdentificacaoBoletoService(ClienteRepository clienteRepository) {
        this.clienteRepository = clienteRepository;
    }

    public record ResultadoIdentificacao(
            Cliente cliente,
            MetodoIdentificacaoBoleto metodo,
            ConfiancaIdentificacaoBoleto confianca,
            String mensagem
    ) {
    }

    public ResultadoIdentificacao identificar(String nomeArquivo, List<Cliente> cacheClientes) {
        String nomeBase = NomeArquivoUtil.extrairNomeBase(nomeArquivo);
        if (nomeBase == null || nomeBase.isBlank()) {
            return naoIdentificado("Nome do arquivo vazio.");
        }

        String semExtensao = nomeBase.replaceAll("(?i)\\.pdf$", "").trim();
        Optional<ResultadoIdentificacao> porCodigo = identificarPorCodigoNoNome(semExtensao, cacheClientes);
        if (porCodigo.isPresent()) {
            return porCodigo.get();
        }

        List<String> documentos = DocumentoUtil.extrairDocumentosDoTexto(nomeBase);
        for (String doc : documentos) {
            Optional<Cliente> porDoc = cacheClientes.stream()
                    .filter(c -> doc.equals(DocumentoUtil.normalizarDocumento(c.getCpfCnpj())))
                    .findFirst();
            if (porDoc.isEmpty()) {
                porDoc = clienteRepository.findByCpfCnpj(doc);
            }
            if (porDoc.isPresent()) {
                return new ResultadoIdentificacao(
                        porDoc.get(),
                        MetodoIdentificacaoBoleto.CPF_CNPJ,
                        ConfiancaIdentificacaoBoleto.ALTA,
                        "Documento encontrado no nome do arquivo.");
            }
        }

        String nomeNormalizado = TextoIdentificacaoUtil.normalizarParaComparacao(nomeBase);
        if (nomeNormalizado.isBlank()) {
            return naoIdentificado("Nenhum documento ou nome utilizável no arquivo.");
        }

        List<Cliente> porPrefixo = cacheClientes.stream()
                .filter(c -> {
                    String nomeCliente = TextoIdentificacaoUtil.normalizarParaComparacao(c.getNome());
                    return !nomeCliente.isBlank()
                            && (nomeCliente.startsWith(nomeNormalizado) || nomeNormalizado.startsWith(nomeCliente));
                })
                .toList();
        if (porPrefixo.size() == 1) {
            Cliente unico = porPrefixo.get(0);
            String nomeCliente = TextoIdentificacaoUtil.normalizarParaComparacao(unico.getNome());
            boolean exato = nomeNormalizado.equals(nomeCliente);
            return new ResultadoIdentificacao(
                    unico,
                    exato ? MetodoIdentificacaoBoleto.NOME_EXATO : MetodoIdentificacaoBoleto.NOME_APROXIMADO,
                    exato ? ConfiancaIdentificacaoBoleto.ALTA : ConfiancaIdentificacaoBoleto.MEDIA,
                    exato ? "Nome exato no arquivo." : "Nome parcial corresponde ao cadastro do cliente.");
        }

        List<Candidato> candidatos = new ArrayList<>();
        for (Cliente cliente : cacheClientes) {
            String nomeCliente = TextoIdentificacaoUtil.normalizarParaComparacao(cliente.getNome());
            if (nomeCliente.isBlank()) {
                continue;
            }
            double score = TextoIdentificacaoUtil.similaridadeToken(nomeNormalizado, nomeCliente);
            if (score >= 0.5) {
                candidatos.add(new Candidato(cliente, score));
            }
        }
        candidatos.sort(Comparator.comparingDouble(Candidato::score).reversed());

        if (candidatos.isEmpty()) {
            return naoIdentificado("Nenhum cliente correspondente encontrado.");
        }

        Candidato melhor = candidatos.get(0);
        if (candidatos.size() >= 2) {
            double diff = melhor.score() - candidatos.get(1).score();
            boolean vencedorClaro = melhor.score() >= LIMIAR_VENCEDOR_CLARO
                    && candidatos.get(1).score() < LIMIAR_SEGUNDO_DISTANTE;
            if (diff < LIMIAR_AMBIGUIDADE && !vencedorClaro) {
                return new ResultadoIdentificacao(
                        null,
                        MetodoIdentificacaoBoleto.NAO_IDENTIFICADO,
                        ConfiancaIdentificacaoBoleto.BAIXA,
                        "Múltiplos clientes com correspondência semelhante. Selecione manualmente.");
            }
        }

        if (melhor.score() >= 0.99) {
            return new ResultadoIdentificacao(
                    melhor.cliente(),
                    MetodoIdentificacaoBoleto.NOME_EXATO,
                    ConfiancaIdentificacaoBoleto.ALTA,
                    "Nome exato no arquivo.");
        }

        if (melhor.score() >= 0.75) {
            return new ResultadoIdentificacao(
                    melhor.cliente(),
                    MetodoIdentificacaoBoleto.NOME_APROXIMADO,
                    ConfiancaIdentificacaoBoleto.MEDIA,
                    "Correspondência aproximada por nome.");
        }

        return new ResultadoIdentificacao(
                null,
                MetodoIdentificacaoBoleto.NAO_IDENTIFICADO,
                ConfiancaIdentificacaoBoleto.BAIXA,
                "Correspondência fraca. Confirme ou corrija o cliente.");
    }

    public List<Cliente> carregarClientesAtivos() {
        return clienteRepository.findByStatusCliente(StatusCliente.ATIVO);
    }

    private Optional<ResultadoIdentificacao> identificarPorCodigoNoNome(String semExtensao, List<Cliente> cacheClientes) {
        String codigo = extrairCodigoDoNome(semExtensao);
        if (codigo == null) {
            return Optional.empty();
        }
        return cacheClientes.stream()
                .filter(c -> codigo.equals(c.getCodigo()))
                .findFirst()
                .map(cliente -> new ResultadoIdentificacao(
                        cliente,
                        MetodoIdentificacaoBoleto.CODIGO_CLIENTE,
                        ConfiancaIdentificacaoBoleto.ALTA,
                        "Código do cliente no nome do arquivo."));
    }

    private static String extrairCodigoDoNome(String semExtensao) {
        if (semExtensao.matches("\\d{1,6}")) {
            return semExtensao;
        }
        Matcher matcher = PREFIXO_CODIGO_NOME.matcher(semExtensao);
        if (matcher.matches()) {
            return matcher.group(1);
        }
        return null;
    }

    private static ResultadoIdentificacao naoIdentificado(String mensagem) {
        return new ResultadoIdentificacao(
                null,
                MetodoIdentificacaoBoleto.NAO_IDENTIFICADO,
                ConfiancaIdentificacaoBoleto.NAO_IDENTIFICADO,
                mensagem);
    }

    private record Candidato(Cliente cliente, double score) {
    }
}
