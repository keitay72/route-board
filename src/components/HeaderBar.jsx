import { formatGeneratedAt } from "../utils/format";

export default function HeaderBar({ cfg, generatedAt }) {
  return (
    <header className="header">
      <div className="headerLeft">
        <img
          src={cfg.logoSrc}
          alt={cfg.logoAlt}
          className="headerLogo"
          draggable="false"
        />
        {cfg.title ? <div className="headerTitle">{cfg.title}</div> : null}
      </div>

      <div className="timestamp">{formatGeneratedAt(generatedAt)}</div>
    </header>
  );
}
