import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import "@/styles.css";

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "#sobre", label: "Quem somos" },
  { href: "#solucoes", label: "Soluções" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#contato", label: "Contato" },
];

const STATS: { value: string; label: string }[] = [
  { value: "+200", label: "clientes atendidos" },
  { value: "+20", label: "anos de experiência" },
  { value: "+130", label: "empresas ativas" },
];

const QUEM_ATENDEMOS: string[] = [
  "Pequenos, médios e grandes empresários",
  "Profissionais autônomos",
  "Produtores rurais",
  "Associações e cooperativas",
  "Segmentos de serviços públicos",
  "Pessoas físicas",
];

const SOLUCOES: { titulo: string; desc: string; icon: string }[] = [
  {
    titulo: "Contabilidade consultiva",
    desc: "Números e indicadores traduzidos em orientação prática para o dia a dia da sua gestão.",
    icon: "chart",
  },
  {
    titulo: "Fiscal e tributário",
    desc: "Conformidade com a legislação e planejamento que reduz riscos e surpresas.",
    icon: "doc",
  },
  {
    titulo: "Departamento pessoal",
    desc: "Folha, obrigações trabalhistas e eSocial alinhados à rotina do seu time.",
    icon: "people",
  },
  {
    titulo: "Abertura e regularização",
    desc: "Da abertura do CNPJ à regularização de pendências, com clareza em cada etapa.",
    icon: "building",
  },
];

const URL_WHATSAPP_ESCRITORIO =
  "https://api.whatsapp.com/send/?phone=%2B5531998211343&text&type=phone_number&app_absent=0";

const COMO_FUNCIONA: { passo: string; titulo: string; texto: string }[] = [
  {
    passo: "1",
    titulo: "Diagnóstico do momento da empresa",
    texto: "Entendemos a realidade do seu negócio, gargalos e prioridades fiscais e contábeis.",
  },
  {
    passo: "2",
    titulo: "Plano de ação claro e personalizado",
    texto: "Entregamos um roteiro objetivo, alinhado ao tamanho e ao setor da sua empresa.",
  },
  {
    passo: "3",
    titulo: "Acompanhamento constante",
    texto: "Revisões periódicas e canal aberto para dúvidas, com respostas em linguagem simples.",
  },
];

function IconChart() {
  return (
    <svg
      className="landing-card__icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden
    >
      <path d="M4 20V10M10 20V4M16 20v-6M22 20V8" />
    </svg>
  );
}

function IconDoc() {
  return (
    <svg
      className="landing-card__icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </svg>
  );
}

function IconPeople() {
  return (
    <svg
      className="landing-card__icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg
      className="landing-card__icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden
    >
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22V12h6v10M9 6h.01M12 6h.01M15 6h.01M9 9h.01M12 9h.01M15 9h.01" />
    </svg>
  );
}

const SOLUCOES_ICONS: Record<string, ReactNode> = {
  chart: <IconChart />,
  doc: <IconDoc />,
  people: <IconPeople />,
  building: <IconBuilding />,
};

function IconCheck() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function revealDelay(index: number): CSSProperties {
  return { "--reveal-delay": `${index * 90}ms` } as CSSProperties;
}

export default function LandingPage() {
  const landingRef = useRef<HTMLDivElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    document.title = "Contabilidade São Judas Tadeu";
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (navOpen) document.body.classList.add("landing-nav-open");
    else document.body.classList.remove("landing-nav-open");

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && navOpen) {
        setNavOpen(false);
        menuToggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("landing-nav-open");
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [navOpen]);

  useEffect(() => {
    const root = landingRef.current;
    if (!root || !("IntersectionObserver" in window)) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;

    const observeSections = () => {
      observer?.disconnect();
      root.classList.toggle("landing-motion", !motionPreference.matches);
      if (motionPreference.matches) return;

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -24px 0px" },
      );
      root.querySelectorAll("[data-reveal]").forEach((element) => observer?.observe(element));
    };

    observeSections();
    motionPreference.addEventListener("change", observeSections);
    return () => {
      observer?.disconnect();
      motionPreference.removeEventListener("change", observeSections);
      root.classList.remove("landing-motion");
    };
  }, []);

  function scrollToId(id: string) {
    setNavOpen(false);
    const el = document.querySelector(id);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth", block: "start" });
  }

  return (
    <div className="landing" ref={landingRef}>
      <header className={`landing-header ${scrolled ? "landing-header--scrolled" : ""}`}>
        <div className="landing-header__inner">
          <a
            href="#inicio"
            className="landing-logo"
            onClick={(e) => {
              e.preventDefault();
              scrollToId("#inicio");
            }}
          >
            <span className="landing-logo__main">CONTABILIDADE</span>
            <span className="landing-logo__sub">São Judas Tadeu</span>
          </a>

          <button
            ref={menuToggleRef}
            type="button"
            className="landing-nav__toggle"
            aria-label={navOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={navOpen}
            aria-controls="landing-nav"
            onClick={() => setNavOpen((o) => !o)}
          >
            <span className="landing-nav__toggle-bar" aria-hidden="true" />
            <span className="landing-nav__toggle-bar" aria-hidden="true" />
            <span className="landing-nav__toggle-bar" aria-hidden="true" />
          </button>

          <nav
            id="landing-nav"
            className={`landing-nav ${navOpen ? "landing-nav--open" : ""}`}
            aria-label="Principal"
          >
            <ul className="landing-nav__list">
              {NAV_LINKS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="landing-nav__link"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToId(item.href);
                    }}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="landing-header__actions">
              <Link
                to="/portal/login"
                className="landing-btn landing-btn--ghost"
                onClick={() => setNavOpen(false)}
              >
                Área do Cliente
              </Link>
              <button
                type="button"
                className="landing-btn landing-btn--ghost"
                onClick={() => scrollToId("#contato")}
              >
                Solicitar proposta
              </button>
              <Link
                to="/login"
                className="landing-btn landing-btn--primary"
                onClick={() => setNavOpen(false)}
              >
                Área do funcionário
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main>
        <section id="inicio" className="landing-hero">
          <div className="landing-hero__bg" aria-hidden />
          <div className="landing-container landing-hero__grid">
            <div className="landing-hero__content">
              <p className="landing-eyebrow" data-reveal>
                <span className="landing-eyebrow__line" aria-hidden="true" />
                Escritório de contabilidade
              </p>
              <h1 className="landing-hero__title" data-reveal style={revealDelay(1)}>
                Assessoria contábil moderna para empresas que querem{" "}
                <span>crescer com tranquilidade.</span>
              </h1>
              <p className="landing-hero__lead" data-reveal style={revealDelay(2)}>
                Organização fiscal, contábil e trabalhista para você focar no que importa. Menos
                improviso, mais previsibilidade e suporte de quem acompanha o seu negócio de perto.
              </p>
              <div className="landing-hero__ctas" data-reveal style={revealDelay(3)}>
                <button
                  type="button"
                  className="landing-btn landing-btn--primary landing-btn--lg"
                  onClick={() => scrollToId("#solucoes")}
                >
                  Conhecer soluções
                </button>
                <button
                  type="button"
                  className="landing-btn landing-btn--outline landing-btn--lg"
                  onClick={() => scrollToId("#sobre")}
                >
                  Saber mais
                </button>
              </div>
              <div className="landing-hero__signature" data-reveal style={revealDelay(4)}>
                <span className="landing-hero__signature-icon">
                  <IconPeople />
                </span>
                <span>
                  Atendimento próximo.
                  <br />
                  <strong>Em cada etapa do seu negócio.</strong>
                </span>
              </div>
            </div>
            <div className="landing-hero__aside" data-reveal style={revealDelay(2)}>
              <div className="landing-growth">
                <div className="landing-growth__topline">
                  <span>
                    Clareza para
                    <br />
                    <strong>crescer.</strong>
                  </span>
                </div>
                <div className="landing-growth__art" aria-hidden="true">
                  <div className="landing-growth__orbit landing-growth__orbit--outer" />
                  <div className="landing-growth__orbit landing-growth__orbit--inner" />
                  <div className="landing-growth__bars">
                    {[0, 1, 2, 3, 4].map((bar) => (
                      <span key={bar} style={{ "--bar-index": bar } as CSSProperties} />
                    ))}
                  </div>
                  <svg className="landing-growth__curve" viewBox="0 0 400 280" fill="none">
                    <path
                      className="landing-growth__curve-line"
                      d="M25 236C88 234 108 171 175 164S271 144 341 38"
                      pathLength="1"
                    />
                    <path className="landing-growth__curve-tip" d="m319 42 25-9 3 26" />
                  </svg>
                </div>
              </div>
              <div className="landing-floating landing-floating--strategy">
                <span className="landing-floating__icon">
                  <IconChart />
                </span>
                <div>
                  <h2>Atendimento estratégico</h2>
                  <p>Decisões com base em dados</p>
                </div>
              </div>
              <div className="landing-floating landing-floating--routine">
                <span className="landing-floating__icon landing-floating__icon--check">
                  <IconCheck />
                </span>
                <div>
                  <h2>Rotina em dia</h2>
                  <p>Obrigações acompanhadas de perto</p>
                </div>
              </div>
              <div className="landing-floating landing-floating--satisfaction">
                <div className="landing-satisfaction__ring">
                  <span>
                    98<small>%</small>
                  </span>
                </div>
                <div>
                  <h2>Satisfação</h2>
                  <p>
                    Clientes que
                    <br />
                    recomendam
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="landing-container landing-hero__bottom" aria-hidden="true">
            <span>Confiança que acompanha o seu crescimento</span>
            <span className="landing-scroll-cue">
              Explore <span>↓</span>
            </span>
          </div>
        </section>

        <section className="landing-stats" aria-label="Números">
          <div className="landing-container landing-stats__grid">
            {STATS.map((s, i) => (
              <div key={s.label} className="landing-stat" data-reveal style={revealDelay(i)}>
                <span className="landing-stat__value">{s.value}</span>
                <span className="landing-stat__label">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section
          id="sobre"
          className="landing-section landing-about"
          aria-labelledby="quem-somos-titulo"
        >
          <div className="landing-container">
            <div className="landing-about__grid">
              <div className="landing-about__visual" data-reveal>
                <div className="landing-about__rings" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <span className="landing-about__label">Contabilidade São Judas Tadeu</span>
                <div className="landing-about__experience">
                  <span>+20</span>
                  <p>
                    anos sob a liderança
                    <br />
                    de Cláudia Pereira e Silva
                  </p>
                </div>
                <div className="landing-about__note">
                  <span className="landing-about__spark" aria-hidden="true">
                    ✳
                  </span>
                  <p>
                    Uma história construída em
                    <br />
                    <strong>Conceição do Mato Dentro.</strong>
                  </p>
                </div>
              </div>
              <div className="landing-about__content">
                <div className="landing-section__head" data-reveal>
                  <p className="landing-eyebrow">
                    <span className="landing-section__index">01 /</span> Nossa história
                  </p>
                  <h2 id="quem-somos-titulo" className="landing-section__title">
                    Quem somos
                  </h2>
                  <p className="landing-about__lead">
                    Dedicação à contabilidade.
                    <br />
                    <span>Compromisso com as pessoas.</span>
                  </p>
                </div>
                <div className="landing-about__story">
                  <p data-reveal>
                    A Contabilidade São Judas Tadeu nasceu como um pequeno escritório de Lúcio dos
                    Santos, com a missão de oferecer suporte financeiro e contábil a pequenos
                    empresários e profissionais autônomos de Conceição do Mato Dentro.
                  </p>
                  <p data-reveal>
                    Em 2003, Cláudia Pereira e Silva enxergou o potencial do escritório e iniciou as
                    negociações para sua aquisição. Itabirana e vinda de uma família ligada à
                    contabilidade, Cláudia acumula quase 30 anos de atuação na área e está à frente
                    do escritório há mais de duas décadas.
                  </p>
                  <p data-reveal>
                    Com dedicação e uma visão voltada à solução de problemas, o escritório ampliou
                    sua estrutura e sua atuação na cidade e na região. Hoje, conta com 10
                    colaboradores que compartilham o compromisso de facilitar a vida financeira dos
                    clientes, com organização, ética e seriedade.
                  </p>
                </div>
                <p className="landing-about__commitment" data-reveal>
                  O aprendizado contínuo e a busca por melhorias fazem parte dessa trajetória,
                  acompanhando a evolução da contabilidade para ajudar empresas e profissionais a
                  alcançarem seus objetivos.
                </p>
              </div>
            </div>
            <div className="landing-about__audience" data-reveal>
              <div className="landing-about__audience-heading">
                <p className="landing-eyebrow">Quem atendemos</p>
                <h3>
                  Ao lado de quem faz
                  <br />
                  <span>a nossa região crescer.</span>
                </h3>
              </div>
              <div className="landing-about__audience-content">
                <ul className="landing-about__audience-list" aria-label="Públicos atendidos">
                  {QUEM_ATENDEMOS.map((item) => (
                    <li key={item}>
                      <IconCheck />
                      {item}
                    </li>
                  ))}
                </ul>
                <p>
                  Também atuamos como certificadora digital e auxiliamos a população na declaração
                  do Imposto de Renda e na emissão de guias de contribuição previdenciária, impostos
                  e tributos.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="solucoes" className="landing-section landing-section--muted">
          <div className="landing-container">
            <div className="landing-section__head landing-section__head--split" data-reveal>
              <div>
                <p className="landing-eyebrow">
                  <span className="landing-section__index">02 /</span> Soluções
                </p>
                <h2 className="landing-section__title">
                  O que podemos fazer
                  <br />
                  <span>pelo seu negócio.</span>
                </h2>
              </div>
              <p className="landing-section__subtitle">
                Rotina contábil, fiscal e trabalhista integrada para você focar no que importa.
              </p>
            </div>
            <div className="landing-cards">
              {SOLUCOES.map((s, i) => (
                <article key={s.titulo} className="landing-card" data-reveal style={revealDelay(i)}>
                  <span className="landing-card__number" aria-hidden="true">
                    0{i + 1}
                  </span>
                  <div className="landing-card__icon">{SOLUCOES_ICONS[s.icon]}</div>
                  <h3 className="landing-card__title">{s.titulo}</h3>
                  <p className="landing-card__text">{s.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="landing-section landing-process">
          <div className="landing-container">
            <div className="landing-section__head landing-section__head--center" data-reveal>
              <p className="landing-eyebrow">
                <span className="landing-section__index">03 /</span> Como funciona
              </p>
              <h2 className="landing-section__title">
                Um caminho simples.
                <br />
                <span>Um acompanhamento próximo.</span>
              </h2>
              <p className="landing-section__subtitle">
                Três etapas para alinhar expectativas e entregar resultados
              </p>
            </div>
            <ol className="landing-steps">
              {COMO_FUNCIONA.map((step, i) => (
                <li key={step.passo} className="landing-step" data-reveal style={revealDelay(i)}>
                  <span className="landing-step__num">0{step.passo}</span>
                  <div>
                    <h3 className="landing-step__title">{step.titulo}</h3>
                    <p className="landing-step__text">{step.texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="contato" className="landing-cta">
          <div className="landing-container">
            <div className="landing-cta__panel" data-reveal>
              <div className="landing-cta__rings" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="landing-cta__inner">
                <p className="landing-eyebrow">Vamos conversar</p>
                <h2 className="landing-cta__title">Pronto para organizar a sua contabilidade?</h2>
                <p className="landing-cta__text">
                  Fale com o escritório e receba uma proposta alinhada à realidade da sua empresa.
                </p>
                <div className="landing-cta__btns">
                  <a
                    className="landing-btn landing-btn--light landing-btn--lg"
                    href={URL_WHATSAPP_ESCRITORIO}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Falar com o escritório
                  </a>
                  <button
                    type="button"
                    className="landing-btn landing-btn--outline landing-btn--lg landing-btn--on-dark"
                    onClick={() => scrollToId("#inicio")}
                  >
                    Voltar ao topo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer__inner">
          <div className="landing-logo landing-footer__brand">
            <span className="landing-logo__main">CONTABILIDADE</span>
            <span className="landing-logo__sub">São Judas Tadeu</span>
          </div>
          <div className="landing-footer__links">
            <Link to="/portal/login" className="landing-footer__link">
              Área do Cliente
            </Link>
            <Link to="/login" className="landing-footer__link">
              Acesso do funcionário
            </Link>
          </div>
        </div>
        <div className="landing-container landing-footer__legal">
          <p>
            MCA-Serviços Contábeis Ltda - CNPJ 07.797.964/0001-51 | MCA-Serviços Contábeis Ltda •{" "}
            {new Date().getFullYear()} Todos os Direitos Reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
