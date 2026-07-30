import { useRef, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import { confirmarItemEnvioBoleto, criarLoteEnvioBoletos, enviarLoteEnvioBoletos, ignorarItemEnvioBoleto } from "@/lib/envioBoletosApi";
import type { ItemEnvioBoleto, LoteEnvioBoletos } from "@/types/api";

const LABEL_STATUS: Record<ItemEnvioBoleto["status"], string> = {
  PENDENTE_ANALISE: "Pendente", AGUARDANDO_CORRECAO: "Aguardando correção", PRONTO_PARA_ENVIO: "Pronto para envio",
  ENVIANDO: "Enviando", ENVIADO: "Enviado", ERRO: "Erro", IGNORADO: "Ignorado", CANCELADO: "Cancelado",
};

function somentePdfs(files: FileList | null) {
  return Array.from(files ?? []).filter((file) => file.name.toLowerCase().endsWith(".pdf"));
}

export default function WebEnvioBoletos() {
  const arquivosRef = useRef<HTMLInputElement>(null);
  const pastaRef = useRef<HTMLInputElement>(null);
  const [lote, setLote] = useState<LoteEnvioBoletos | null>(null);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  function selecionar(files: FileList | null) {
    const pdfs = somentePdfs(files);
    setArquivos(pdfs);
    setErro(pdfs.length ? null : "Selecione pelo menos um arquivo PDF.");
  }

  async function enviarUpload() {
    if (!arquivos.length) return setErro("Selecione os PDFs antes de criar o lote.");
    try {
      setCarregando(true); setErro(null); setSucesso(null);
      setLote(await criarLoteEnvioBoletos(arquivos));
      setSucesso("Lote analisado. Confira os destinatários antes de enviar.");
    } catch (e) { setErro(getApiErrorMessage(e, "Não foi possível analisar os boletos.")); }
    finally { setCarregando(false); }
  }

  async function atualizarItem(acao: "confirmar" | "ignorar", itemId: string) {
    if (!lote) return;
    try {
      setCarregando(true); setErro(null);
      setLote(acao === "confirmar" ? await confirmarItemEnvioBoleto(lote.loteId, itemId) : await ignorarItemEnvioBoleto(lote.loteId, itemId));
    } catch (e) { setErro(getApiErrorMessage(e, "Não foi possível atualizar o item.")); }
    finally { setCarregando(false); }
  }

  async function enviarEmails() {
    if (!lote) return;
    try {
      setCarregando(true); setErro(null);
      await enviarLoteEnvioBoletos(lote.loteId);
      setLote((atual) => atual ? { ...atual, itens: atual.itens.map((item) => item.status === "PRONTO_PARA_ENVIO" ? { ...item, status: "ENVIADO" } : item) } : atual);
      setSucesso("Solicitação de envio concluída. Consulte o status dos itens abaixo.");
    } catch (e) { setErro(getApiErrorMessage(e, "Não foi possível enviar os e-mails.")); }
    finally { setCarregando(false); }
  }

  const prontos = lote?.itens.filter((item) => item.status === "PRONTO_PARA_ENVIO").length ?? 0;
  return <div className="page-clientes">
    <header className="page-clientes__header"><div><h1 className="page-clientes__title">Envio de boletos</h1><p className="page-clientes__subtitle">Envie PDFs do Sicoob e confira os destinatários antes do disparo.</p></div></header>
    {erro && <p className="page-clientes__erro">{erro}</p>}{sucesso && <p className="toast toast--sucesso">{sucesso}</p>}
    <div className="page-clientes__header-acoes">
      <input ref={arquivosRef} type="file" accept=".pdf" multiple hidden onChange={(e) => selecionar(e.target.files)} />
      <input ref={pastaRef} type="file" multiple hidden {...({ webkitdirectory: "" } as Record<string, string>)} onChange={(e) => selecionar(e.target.files)} />
      <button type="button" className="btn btn--secondary" onClick={() => arquivosRef.current?.click()} disabled={carregando}>Selecionar PDFs</button>
      <button type="button" className="btn btn--secondary" onClick={() => pastaRef.current?.click()} disabled={carregando}>Selecionar pasta</button>
      <button type="button" className="btn btn--primary" onClick={enviarUpload} disabled={carregando || !arquivos.length}>{carregando ? "Analisando..." : `Analisar ${arquivos.length || ""} PDF${arquivos.length === 1 ? "" : "s"}`}</button>
    </div>
    {lote && <>
      <div className="page-clientes__header-acoes" style={{ marginTop: 20 }}><strong>{lote.quantidadeTotal} arquivo(s) no lote · {prontos} pronto(s) para envio</strong><button type="button" className="btn btn--primary" disabled={carregando || !prontos} onClick={enviarEmails}>Enviar e-mails</button></div>
      <div className="page-clientes__tabela-wrap" style={{ marginTop: 16 }}><table className="page-clientes__tabela"><thead><tr><th>Arquivo</th><th>Cliente</th><th>CPF/CNPJ</th><th>E-mail</th><th>Método</th><th>Confiança</th><th>Status</th><th>Ação</th></tr></thead><tbody>{lote.itens.map((item) => <tr key={item.envioBoletoId}><td>{item.nomeArquivoOriginal || "—"}</td><td>{item.clienteNome || "—"}</td><td>{item.documentoMascarado || "—"}</td><td>{item.emailDestinatario || "—"}</td><td>{item.metodoIdentificacao}</td><td>{item.confiancaIdentificacao}</td><td>{LABEL_STATUS[item.status]}</td><td><div className="page-clientes__acoes">{item.status === "AGUARDANDO_CORRECAO" || item.confiancaIdentificacao === "BAIXA" ? <button className="btn btn--small btn--secondary" disabled={carregando} onClick={() => atualizarItem("confirmar", item.envioBoletoId)}>Confirmar</button> : null}{item.status !== "IGNORADO" && item.status !== "ENVIADO" ? <button className="btn btn--small btn--secondary" disabled={carregando} onClick={() => atualizarItem("ignorar", item.envioBoletoId)}>Ignorar</button> : null}</div></td></tr>)}</tbody></table></div>
    </>}
  </div>;
}
