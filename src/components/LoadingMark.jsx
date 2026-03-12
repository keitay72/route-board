function wheel(cx, cy, r, spin) {
  return (
    <g
      className={`wheel ${spin ? "wheelSpin" : ""}`}
      style={
        spin
          ? {
              transformOrigin: `${cx}px ${cy}px`,
              transformBox: "view-box",
            }
          : undefined
      }
    >
      <circle cx={cx} cy={cy} r={r} fill="#111418" />
      <circle cx={cx} cy={cy} r={r - 18} fill="url(#rimGrad)" />
      <circle cx={cx} cy={cy} r="6" fill="#7d8794" />
      <path
        d={`M${cx} ${cy - r + 6} V${cy + r - 6} M${cx - r + 6} ${cy} H${cx + r - 6}`}
        stroke="rgba(0,0,0,.25)"
        strokeWidth="2"
      />
    </g>
  );
}

export default function LoadingMark({ variant, tagline }) {
  const isMhd = variant === "mhd";

  return (
    <main className="loaderStage">
      <svg
        className="loaderTruck"
        viewBox="0 0 900 260"
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        role="img"
        aria-label="Loading"
      >
        <defs>
          <linearGradient id="green" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#7ad100" />
            <stop offset="1" stopColor="#57b100" />
          </linearGradient>

          <linearGradient id="darkMetal" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#3a4047" />
            <stop offset="1" stopColor="#15181c" />
          </linearGradient>

          <linearGradient id="cabGray" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#f7f9fb" />
            <stop offset="1" stopColor="#dfe4ea" />
          </linearGradient>

          <linearGradient id="engineGray" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#6b7280" />
            <stop offset="1" stopColor="#3f444a" />
          </linearGradient>

          <linearGradient id="glass" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="rgba(120,180,195,.55)" />
            <stop offset="1" stopColor="rgba(44,124,138,.45)" />
          </linearGradient>

          <radialGradient id="rimGrad" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#f4f7fb" />
            <stop offset="55%" stopColor="#cfd6dd" />
            <stop offset="100%" stopColor="#8a939c" />
          </radialGradient>
        </defs>

        <ellipse cx="450" cy="210" rx="380" ry="18" fill="rgba(0,0,0,.15)" />

        <rect
          x="170"
          y="175"
          width="540"
          height="16"
          rx="6"
          fill="url(#darkMetal)"
        />

        <g id="truck" className="truckBody">
          <g id="rear">
            <g id="body">
              <rect
                x="150"
                y="30"
                width="400"
                height="150"
                rx="5"
                fill="url(#green)"
                stroke="rgba(0,0,0,.2)"
                strokeWidth="2"
              />

              {isMhd ? (
                <image
                  href="/mhd-logo.png"
                  xlinkHref="/mhd-logo.png"
                  x="235"
                  y="40"
                  height="110"
                  preserveAspectRatio="xMidYMid meet"
                />
              ) : (
                <image
                  href="/kcd-truck-logo.png"
                  xlinkHref="/kcd-truck-logo.png"
                  x="150"
                  y="55"
                  width="300"
                  height="150"
                  preserveAspectRatio="xMidYMid meet"
                />
              )}

              <path
                d="M150 30 L150 180 L135 180 C95 165, 95 45, 135 30 L150 30 Z"
                fill="url(#green)"
                stroke="rgba(0,0,0,.2)"
                strokeWidth="2"
              />
            </g>

            <g
              id="arm"
              className="loaderArm"
              style={{
                transformOrigin: "458px 172px",
                transformBox: "view-box",
              }}
            >
              <rect
                x="440"
                y="35"
                width="22"
                height="180"
                rx="9"
                fill="url(#darkMetal)"
              />
              <circle cx="451" cy="30" r="18" fill="url(#darkMetal)" />

              <path
                d="M458 70 C500 95, 525 125, 525 165 C525 195, 495 210, 455 210"
                fill="none"
                stroke="url(#darkMetal)"
                strokeWidth="10"
                strokeLinecap="round"
              />

              <path
                d="M456 78 C490 105, 510 135, 510 168 C510 195, 485 210, 450 210"
                fill="none"
                stroke="#0b0e12"
                strokeWidth="7"
                strokeLinecap="round"
                opacity=".95"
              />
            </g>

            <g id="rearWheels">
              {wheel(260, 190, 34, true)}
              {wheel(345, 190, 34, true)}
            </g>
          </g>

          <g id="front" transform="translate(50,0)">
            <g id="engine">
              <rect
                x="505"
                y="85"
                width="50"
                height="90"
                rx="5"
                fill="url(#engineGray)"
                stroke="rgba(0,0,0,.2)"
                strokeWidth="2"
              />
            </g>

            <g id="cab">
              <path
                d="M560 60 H640 Q650 60 655 68 L680 130 Q685 140 680 150 V190 Q680 200 670 200 H615 Q605 150 560 150 Z"
                fill="url(#cabGray)"
                stroke="rgba(0,0,0,.2)"
                strokeWidth="2"
              />

              <text
                x="658"
                y="143"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize="10"
                letterSpacing="1"
                fill="none"
                stroke="#000"
                strokeWidth=".8"
              >
                {isMhd ? "608" : "825"}
              </text>

              <text
                x={isMhd ? "595" : "605"}
                y="155"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize="10"
                letterSpacing="1"
                fill="none"
                stroke="#000"
                strokeWidth=".8"
              >
                {isMhd ? "Mountain High" : "KC Disposal"}
              </text>

              {isMhd ? (
                <>
                  <text
                    x="613"
                    y="168"
                    fontFamily="Arial, Helvetica, sans-serif"
                    fontSize="10"
                    letterSpacing="1"
                    fill="none"
                    stroke="#000"
                    strokeWidth=".8"
                  >
                    Disposal
                  </text>
                  <text
                    x="613"
                    y="180"
                    fontFamily="Arial, Helvetica, sans-serif"
                    fontSize="5.8"
                    letterSpacing="1"
                    fill="none"
                    stroke="#000"
                    strokeWidth=".8"
                  >
                    (970) 834-1144
                  </text>
                </>
              ) : (
                <text
                  x="613"
                  y="165"
                  fontFamily="Arial, Helvetica, sans-serif"
                  fontSize="5.8"
                  letterSpacing="1"
                  fill="none"
                  stroke="#000"
                  strokeWidth=".8"
                >
                  816-388-9739
                </text>
              )}

              <path
                d="M580 75 L645 75 L667 130 L580 130 Z"
                fill="url(#glass)"
                stroke="rgba(0,0,0,.18)"
                strokeWidth="2"
              />

              <rect
                x="670"
                y="168"
                width="20"
                height="22"
                rx="5"
                fill="url(#darkMetal)"
              />
            </g>

            <g id="frontWheel">{wheel(570, 190, 34, true)}</g>
          </g>
        </g>
      </svg>

      <div className="loaderTagline">{tagline}</div>
    </main>
  );
}
