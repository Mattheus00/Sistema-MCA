import { useCallback, useEffect, useState } from "react";
import {
  baixarDocumento,
  fetchPortalDividas,
  getApiErrorMessage,
  listarDocumentos,
  uploadDocumento,
} from "@/lib/portalApi";
import {
  formatarDataPortal,
  labelStatusDocumento,
  labelTipoDocumento,
  classeBadgeStatusDocumentoPortal,
} from "@/lib/portalUtils";
import type { PortalDivida, PortalDocumento, TipoDocumentoCliente } from "@/types/api";

const TIPOS: { value: TipoDocumentoCliente; label: string }[] = [
  { value: "COMPROVANTE", label: "Comprovante" },
  { value: "NOTA_FISCAL", label: "Nota fiscal" },
  { value: "CONTRATO", label: "Contrato" },
  { value: "DECLARACAO", label: "Declaração" },
  { value: "OUTRO", label: "Outro" },
];

export default function PortalDocumentos() {
  const [documentos, setDocumentos] = useState<PortalDocumento[]>([]);
  const [dividas, setDividas] = useState<PortalDivida[]>([]);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [tipo, setTipo] = useState<TipoDocumentoCliente>("COMPROVANTE");
  const [dividaId, setDividaId] = useState("");
  const [observacao, setObservacao] = useState("");
  const [dragAtivo, setDragAtivo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [erroListagem, setErroListagem] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      setErroListagem(null);
      const [docs, divs] = await Promise.all([listarDocumentos(), fetchPortalDividas("abertas")]);
      setDocumentos(docs);
      setDividas(divs);
    } catch (e: unknown) {
      setErroListagem(getApiErrorMessage(e, "Não foi possível carregar os documentos enviados."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (!sucesso) return;
    const t = setTimeout(() => setSucesso(null), 5000);
    return () => clearTimeout(t);
  }, [sucesso]);

  function selecionarArquivo(file: File | null) {
    if (!file) return;
    setArquivo(file);
    setErroEnvio(null);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo) {
      setErroEnvio("Selecione um arquivo para enviar.");
      return;
    }
    try {
      setEnviando(true);
      setErroEnvio(null);
      const novo = await uploadDocumento({
        arquivo,
        tipo,
        dividaId: dividaId || undefined,
        observacao,
      });
      setArquivo(null);
      setObservacao("");
      setDividaId("");
      setSucesso("Documento enviado com sucesso.");
      setDocumentos((lista) => [novo, ...lista.filter((d) => d.id !== novo.id)]);
      await carregar();
    } catch (err: unknown) {
      setErroEnvio(getApiErrorMessage(err, "Falha ao enviar o documento."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="portal-page">
      <section className="portal-panel portal-panel--documentos">
      <header className="portal-page__head">
        <h1 className="portal-page__titulo">Documentos</h1>
        <p className="portal-page__subtitulo">Envie comprovantes e outros arquivos para o escritório.</p>
      </header>

      {sucesso && <p className="portal-toast portal-toast--sucesso">{sucesso}</p>}
      {erroEnvio && (
        <p className="portal-auth__erro" role="alert">
          {erroEnvio}
        </p>
      )}

      <form className="portal-upload" onSubmit={enviar}>
        <div
          className={`portal-upload__dropzone ${dragAtivo ? "portal-upload__dropzone--ativo" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragAtivo(true);
          }}
          onDragLeave={() => setDragAtivo(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragAtivo(false);
            const f = e.dataTransfer.files?.[0];
            if (f) selecionarArquivo(f);
          }}
        >
          <p className="portal-upload__texto">Toque para escolher ou arraste um arquivo aqui</p>
          <input
            type="file"
            className="portal-upload__input"
            onChange={(e) => selecionarArquivo(e.target.files?.[0] ?? null)}
          />
          {arquivo && <p className="portal-upload__arquivo">{arquivo.name}</p>}
        </div>

        <div className="portal-upload__campos">
          <label className="portal-field">
            <span className="portal-field__label">Tipo do documento</span>
            <select className="portal-field__input" value={tipo} onChange={(e) => setTipo(e.target.value as TipoDocumentoCliente)}>
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="portal-field">
            <span className="portal-field__label">Vincular à dívida (opcional)</span>
            <select className="portal-field__input" value={dividaId} onChange={(e) => setDividaId(e.target.value)}>
              <option value="">Nenhuma</option>
              {dividas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.protocolo ? `${d.protocolo} — ` : ""}
                  {d.descricao ?? d.id}
                </option>
              ))}
            </select>
          </label>

          <label className="portal-field">
            <span className="portal-field__label">Observação (opcional)</span>
            <textarea
              className="portal-field__input portal-field__textarea"
              rows={3}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex.: comprovante de pagamento referente a honorários de março"
            />
          </label>
        </div>

        <button type="submit" className="portal-btn portal-btn--primary portal-upload__submit" disabled={enviando || !arquivo}>
          {enviando ? "Enviando…" : "Enviar documento"}
        </button>
      </form>

      <section className="portal-secao">
        <h2 className="portal-secao__titulo">Documentos enviados</h2>
        {loading ? (
          <p className="portal-empty" role="status">
            Carregando…
          </p>
        ) : erroListagem ? (
          <p className="portal-auth__erro" role="alert">
            {erroListagem}
          </p>
        ) : documentos.length === 0 ? (
          <p className="portal-empty" role="status">
            Nenhum documento enviado.
          </p>
        ) : (
          <>
            <ul className="portal-item-list portal-item-list--mobile">
              {documentos.map((doc) => (
                <li key={doc.id} className="portal-item-card">
                  <div className="portal-item-card__top">
                    <div className="portal-item-card__titulo-wrap">
                      <p className="portal-item-card__titulo">{doc.nomeArquivo ?? "Documento"}</p>
                      <p className="portal-item-card__meta-linha">{labelTipoDocumento(doc.tipo)}</p>
                    </div>
                    <span className={`portal-badge ${classeBadgeStatusDocumentoPortal(doc.status)}`}>
                      {labelStatusDocumento(doc.status)}
                    </span>
                  </div>
                  <p className="portal-item-card__meta-linha">Enviado em {formatarDataPortal(doc.criadoEm)}</p>
                  {doc.observacao?.trim() ? (
                    <p className="portal-doc-observacao">
                      <strong>Sua mensagem:</strong> {doc.observacao}
                    </p>
                  ) : null}
                  {doc.respostaEscritorio?.trim() ? (
                    <div className="portal-doc-resposta">
                      <p className="portal-doc-resposta__titulo">Resposta do escritório</p>
                      <p className="portal-doc-resposta__texto">{doc.respostaEscritorio}</p>
                      <p className="portal-doc-resposta__meta">
                        {formatarDataPortal(doc.respondidoEm)}
                        {doc.respondidoPorNome ? ` · ${doc.respondidoPorNome}` : ""}
                      </p>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="portal-btn portal-btn--secondary portal-item-card__acao"
                    onClick={() => baixarDocumento(doc.id, doc.nomeArquivo)}
                  >
                    Baixar
                  </button>
                </li>
              ))}
            </ul>

            <div className="portal-tabela-wrap portal-only-desktop">
              <table className="portal-tabela">
                <thead>
                  <tr>
                    <th>Arquivo</th>
                    <th>Tipo</th>
                    <th>Status</th>
                    <th>Enviado em</th>
                    <th>Observação</th>
                    <th>Resposta do escritório</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {documentos.map((doc) => (
                    <tr key={doc.id}>
                      <td>{doc.nomeArquivo ?? "—"}</td>
                      <td>{labelTipoDocumento(doc.tipo)}</td>
                      <td>
                        <span className={`portal-badge ${classeBadgeStatusDocumentoPortal(doc.status)}`}>
                          {labelStatusDocumento(doc.status)}
                        </span>
                      </td>
                      <td>{formatarDataPortal(doc.criadoEm)}</td>
                      <td className="portal-doc-observacao-celula">{doc.observacao?.trim() || "—"}</td>
                      <td className="portal-doc-resposta-celula">
                        {doc.respostaEscritorio?.trim() ? (
                          <>
                            <p className="portal-doc-resposta-celula__texto">{doc.respostaEscritorio}</p>
                            <p className="portal-doc-resposta-celula__meta">
                              {formatarDataPortal(doc.respondidoEm)}
                              {doc.respondidoPorNome ? ` · ${doc.respondidoPorNome}` : ""}
                            </p>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="portal-link portal-link--btn"
                          onClick={() => baixarDocumento(doc.id, doc.nomeArquivo)}
                        >
                          Baixar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      </section>
    </div>
  );
}
