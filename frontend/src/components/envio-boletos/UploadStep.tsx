import { useRef } from "react";
import { UploadIcon } from "@/components/envio-boletos/EnvioBoletosIcons";
import { formatarTamanhoArquivo } from "@/lib/envioBoletosUtils";

type UploadStepProps = {
  dragAtivo: boolean;
  setDragAtivo: (ativo: boolean) => void;
  arquivos: File[];
  loading: boolean;
  adicionarArquivos: (lista: FileList | File[]) => void;
  removerArquivo: (idx: number) => void;
  enviarUpload: () => void;
};

export default function UploadStep({
  dragAtivo,
  setDragAtivo,
  arquivos,
  loading,
  adicionarArquivos,
  removerArquivo,
  enviarUpload,
}: UploadStepProps) {
  const inputArquivosRef = useRef<HTMLInputElement>(null);
  const inputPastaRef = useRef<HTMLInputElement>(null);

  return (
    <section className="page-envio-boletos__upload">
      <div
        className={`page-envio-boletos__dropzone ${dragAtivo ? "page-envio-boletos__dropzone--ativo" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragAtivo(true);
        }}
        onDragLeave={() => setDragAtivo(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragAtivo(false);
          if (e.dataTransfer.files?.length) adicionarArquivos(e.dataTransfer.files);
        }}
      >
        <UploadIcon />
        <p>Arraste PDFs aqui ou selecione arquivos / pasta</p>
        <div className="page-envio-boletos__upload-acoes">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => inputArquivosRef.current?.click()}
          >
            Selecionar PDFs
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => inputPastaRef.current?.click()}
          >
            Selecionar pasta
          </button>
        </div>
        <input
          ref={inputArquivosRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) adicionarArquivos(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={inputPastaRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          hidden
          {...{ webkitdirectory: "", directory: "" }}
          onChange={(e) => {
            const pdfs = Array.from(e.target.files ?? []).filter((f) =>
              f.name.toLowerCase().endsWith(".pdf"),
            );
            if (pdfs.length) adicionarArquivos(pdfs);
            e.target.value = "";
          }}
        />
      </div>

      {arquivos.length > 0 && (
        <>
          <p className="page-envio-boletos__contagem">
            {arquivos.length} arquivo{arquivos.length !== 1 ? "s" : ""} selecionado
            {arquivos.length !== 1 ? "s" : ""}
          </p>
          <ul className="page-envio-boletos__lista-arquivos">
            {arquivos.map((arquivo, idx) => (
              <li key={`${arquivo.name}-${arquivo.size}-${idx}`}>
                <span className="page-envio-boletos__arquivo-nome">{arquivo.name}</span>
                <span className="page-envio-boletos__arquivo-tamanho">
                  {formatarTamanhoArquivo(arquivo.size)}
                </span>
                <button
                  type="button"
                  className="page-envio-boletos__remover"
                  onClick={() => removerArquivo(idx)}
                  aria-label={`Remover ${arquivo.name}`}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="page-envio-boletos__acoes-principais">
        <button
          type="button"
          className="btn btn--primary"
          disabled={loading || arquivos.length === 0}
          onClick={enviarUpload}
        >
          {loading ? "Enviando..." : "Analisar arquivos"}
        </button>
      </div>

      <div className="page-envio-boletos__ajuda" role="note">
        <p>
          Renomeie os PDFs antes do upload:{" "}
          <strong>{"{código} {nome igual ao cadastro}.pdf"}</strong>
        </p>
        <p>
          Exemplos: <code>4 ANA CLAUDIA DE CARVALHO BOTELHO.pdf</code> · <code>14.pdf</code> ·{" "}
          <code>27383573000106.pdf</code> (CNPJ)
        </p>
        <p>
          O e-mail vem do cadastro do cliente. Se aparecer &quot;E-mail não encontrado&quot;,
          cadastre o e-mail em Clientes.
        </p>
      </div>
    </section>
  );
}
