import { useId } from "react";
import { EyeIcon, EyeOffIcon, LockIcon } from "@/components/auth/LoginIcons";

type CampoSenhaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  disabled?: boolean;
  ariaLabel: string;
  visivel: boolean;
  onToggleVisivel: () => void;
};

export default function CampoSenha({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
  ariaLabel,
  visivel,
  onToggleVisivel,
}: CampoSenhaProps) {
  const inputId = useId();

  return (
    <div className="page-login__field">
      <label className="page-login__label" htmlFor={inputId}>
        {label}
      </label>
      <div className="page-login__input-wrap page-login__input-wrap--senha">
        <span className="page-login__input-icon" aria-hidden="true">
          <LockIcon />
        </span>
        <input
          id={inputId}
          type={visivel ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="page-login__input"
          disabled={disabled}
          aria-label={ariaLabel}
        />
        <button
          type="button"
          className="page-login__toggle-senha"
          onClick={onToggleVisivel}
          disabled={disabled}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visivel}
        >
          {visivel ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}
