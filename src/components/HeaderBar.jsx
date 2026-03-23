import { formatGeneratedAt } from "../utils/format";

export default function HeaderBar({ cfg, generatedAt, fleetioLoading = false }) {
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
        {fleetioLoading ? (
          <div className="headerStatusBadge">
            <span>Fleetio Loading</span>
            <span className="headerStatusDots" aria-hidden="true">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </div>
        ) : null}
      </div>

      <div className="timestamp">{formatGeneratedAt(generatedAt)}</div>
    </header>
  );
}
