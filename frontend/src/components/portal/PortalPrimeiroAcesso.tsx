import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PortalAuthShell from "./PortalAuthShell";
import { ativarPortal, getApiErrorMessage } from "@/lib/portalApi";
import { maskCpfCnpj } from "@/lib/portalUtils";

function CampoSenha({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [visivel, setVisivel] = useState(false);
  return (
    <label className="portal-field" htmlFor={id}>
      <span className="portal-field__label">{label}</span>
      <div className="portal-field__senha">
        <input
          id={id}
          type={visivel ? "text" : "password"}
          className="portal-field__input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={6}
        />
        <button type="button" className="portal-field__toggle-senha" onClick={() => setVisivel((v) => !v)}>
          {visivel ? "Ocultar" : "Mostrar"}
        </button>
      </div>
    </label>
  );
}

export default function PortalPrimeiroAcesso() {
  const navigate = useNavigate();
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha !== confirmarSenha) {
      setErro("As senhas não conferem.");
      return;
    }
    if (senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    try {
      setLoading(true);
      await ativarPortal(cpfCnpj, email, senha, confirmarSenha);
      navigate("/portal/inicio", { replace: true });
    } catch (err: unknown) {
      setErro(getApiErrorMessage(err, "Não foi possível ativar o acesso. Verifique os dados informados."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PortalAuthShell
      titulo="Primeiro acesso"
      subtitulo="Informe o CPF/CNPJ cadastrado no escritório, o e-mail registrado e crie sua senha."
      heroTitulo="Bem-vindo"
      heroSubtitulo="Ative seu acesso e acompanhe suas pendências online."
    >
        {erro && (
          <p className="portal-auth__erro" role="alert">
            {erro}
          </p>
        )}

        <form className="portal-auth__form" onSubmit={handleSubmit}>
          <label className="portal-field" htmlFor="ativar-cpf">
            <span className="portal-field__label">CPF ou CNPJ</span>
            <input
              id="ativar-cpf"
              type="text"
              className="portal-field__input"
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(maskCpfCnpj(e.target.value))}
              required
            />
          </label>
          <label className="portal-field" htmlFor="ativar-email">
            <span className="portal-field__label">E-mail cadastrado</span>
            <input
              id="ativar-email"
              type="email"
              className="portal-field__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <CampoSenha id="ativar-senha" label="Nova senha" value={senha} onChange={setSenha} />
          <CampoSenha id="ativar-confirmar" label="Confirmar senha" value={confirmarSenha} onChange={setConfirmarSenha} />
          <button type="submit" className="portal-btn portal-btn--primary portal-auth__submit" disabled={loading}>
            {loading ? "Ativando…" : "Ativar acesso"}
          </button>
        </form>

        <div className="portal-auth__links">
          <Link to="/portal/login">Já tenho senha</Link>
          <Link to="/">Voltar ao site</Link>
        </div>
    </PortalAuthShell>
  );
}
