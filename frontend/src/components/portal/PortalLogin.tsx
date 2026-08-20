import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PortalAuthShell from "./PortalAuthShell";
import { getApiErrorMessage, loginPortal } from "@/lib/portalApi";
import { maskCpfCnpj } from "@/lib/portalUtils";

function CampoSenha({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
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
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          className="portal-field__toggle-senha"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
        >
          {visivel ? "Ocultar" : "Mostrar"}
        </button>
      </div>
    </label>
  );
}

export default function PortalLogin() {
  const navigate = useNavigate();
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    try {
      setLoading(true);
      await loginPortal(cpfCnpj, senha);
      navigate("/portal/inicio", { replace: true });
    } catch (err: unknown) {
      setErro(getApiErrorMessage(err, "Não foi possível entrar. Verifique CPF/CNPJ e senha."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PortalAuthShell titulo="Entrar">
        {erro && (
          <p className="portal-auth__erro" role="alert">
            {erro}
          </p>
        )}

        <form className="portal-auth__form" onSubmit={handleSubmit}>
          <label className="portal-field" htmlFor="portal-cpf">
            <span className="portal-field__label">CPF ou CNPJ</span>
            <input
              id="portal-cpf"
              type="text"
              className="portal-field__input"
              inputMode="numeric"
              autoComplete="username"
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(maskCpfCnpj(e.target.value))}
              placeholder="000.000.000-00"
              required
            />
          </label>
          <CampoSenha id="portal-senha" label="Senha" value={senha} onChange={setSenha} autoComplete="current-password" />
          <button type="submit" className="portal-btn portal-btn--primary portal-auth__submit" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <div className="portal-auth__links">
          <Link to="/portal/primeiro-acesso">Primeiro acesso</Link>
          <Link to="/portal/recuperar-senha">Esqueci minha senha</Link>
          <Link to="/">Voltar ao site</Link>
        </div>
    </PortalAuthShell>
  );
}
