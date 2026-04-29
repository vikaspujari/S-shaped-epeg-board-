import React from 'react';

const BOARD_HOLES = [
  { hole: 1, shape: 'circle', side: 'left' },
  { hole: 2, shape: 'rectangle', side: 'left' },
  { hole: 3, shape: 'square', side: 'left' },
  { hole: 4, shape: 'triangle', side: 'left' },
  { hole: 5, shape: 'square', side: 'right' },
  { hole: 6, shape: 'triangle', side: 'right' },
  { hole: 7, shape: 'rectangle', side: 'right' },
  { hole: 8, shape: 'circle', side: 'right' },
];

const SIDE_COLOR = {
  left: '#3B82F6',
  right: '#F97316',
};

function SmallShapeIcon({ shape }) {
  if (shape === 'circle') {
    return <circle cx="24" cy="24" r="14" />;
  }

  if (shape === 'rectangle') {
    return <rect x="10" y="16" width="28" height="16" rx="3" />;
  }

  if (shape === 'square') {
    return <rect x="13" y="13" width="22" height="22" rx="3" />;
  }

  return <polygon points="24,10 39,37 9,37" />;
}

function LargeTaskShape({ shape, flashClass }) {
  return (
    <svg className={`shape-task-svg ${shape || ''} ${flashClass}`} viewBox="0 0 180 150" role="img" aria-label={`${shape} target`}>
      <defs>
        <radialGradient id="circleGlow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#33ff66" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#33ff66" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="triangleSweep" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#e0f5e8" />
          <stop offset="45%" stopColor="#33ff66" />
          <stop offset="100%" stopColor="#0d9b76" />
        </linearGradient>
      </defs>

      {shape === 'circle' && (
        <g className="circle-mark">
          <circle className="circle-aura" cx="90" cy="75" r="58" fill="url(#circleGlow)" />
          <circle className="circle-ring" cx="90" cy="75" r="45" />
          <circle className="circle-core" cx="90" cy="75" r="31" />
        </g>
      )}

      {shape === 'rectangle' && (
        <g className="rectangle-mark">
          <rect className="shape-main" x="30" y="40" width="120" height="70" rx="10" />
          <path className="corner-ticks" d="M24 52h20M42 34v20M136 34v20M136 52h20M24 98h20M42 96v20M136 96v20M136 98h20" />
        </g>
      )}

      {shape === 'square' && (
        <g className="square-mark">
          <rect className="shape-main" x="45" y="30" width="90" height="90" rx="10" />
          <rect className="square-dash" x="39" y="24" width="102" height="102" rx="14" />
        </g>
      )}

      {shape === 'triangle' && (
        <g className="triangle-mark">
          <polygon className="triangle-fill" points="90,24 143,118 37,118" />
          <polygon className="triangle-outline" points="90,24 143,118 37,118" />
        </g>
      )}
    </svg>
  );
}

export default function ShapeDisplay({ shape, side, targetHole, lastPegResult }) {
  if (!shape) return null;

  const sideColor = SIDE_COLOR[side] || '#33ff66';
  const flashClass = lastPegResult
    ? lastPegResult.correct
      ? 'shape-flash-correct'
      : 'shape-flash-wrong'
    : '';

  return (
    <section className="shape-display" style={{ '--side-color': sideColor }}>
      <style>{styles}</style>

      <div className="shape-task-card">
        <div className="shape-task-copy">
          <div className="shape-kicker">Target Shape</div>
          <h1>{shape}</h1>
          <div className={`side-command ${side}`}>
            <span className="side-arrow">{side === 'left' ? '<-' : '->'}</span>
            INSERT {side?.toUpperCase()}
          </div>
          <p>Use hole {targetHole}. Match both the shape and the side.</p>
        </div>

        <LargeTaskShape shape={shape} flashClass={flashClass} />
      </div>

      <div className="board-shell">
        <div className={`side-zone left ${side === 'left' ? 'active' : ''}`}>LEFT</div>
        <div className={`side-zone right ${side === 'right' ? 'active' : ''}`}>RIGHT</div>

        <div className="board-track">
          {BOARD_HOLES.map((item) => {
            const isTarget = item.hole === targetHole;
            const isWrongHit = lastPegResult && !lastPegResult.correct && lastPegResult.hole_id === item.hole;
            const isCorrectHit = lastPegResult && lastPegResult.correct && lastPegResult.hole_id === item.hole;

            return (
              <div
                key={item.hole}
                className={`board-slot ${item.side} ${isTarget ? 'target' : ''} ${isWrongHit ? 'wrong-hit' : ''} ${isCorrectHit ? 'correct-hit' : ''}`}
              >
                <div className="hole-number">{item.hole}</div>
                <svg viewBox="0 0 48 48" className={`slot-icon ${item.shape}`} aria-label={`hole ${item.hole} ${item.shape}`}>
                  <SmallShapeIcon shape={item.shape} />
                </svg>
                <div className="hole-side">{item.side}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const styles = `
.shape-display {
  position: absolute;
  inset: 92px 20px auto 20px;
  z-index: 18;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  pointer-events: none;
}

.shape-task-card {
  width: min(760px, 94vw);
  min-height: 190px;
  display: grid;
  grid-template-columns: 1fr 230px;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(5, 10, 6, 0.9), rgba(12, 45, 33, 0.82));
  border: 1px solid color-mix(in srgb, var(--side-color), transparent 35%);
  border-radius: 18px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42), 0 0 40px color-mix(in srgb, var(--side-color), transparent 78%);
  overflow: hidden;
  position: relative;
}

.shape-task-card::before {
  content: '';
  position: absolute;
  inset: -40%;
  background: radial-gradient(circle at 75% 45%, color-mix(in srgb, var(--side-color), transparent 76%), transparent 34%);
  animation: target-breathe 2.8s ease-in-out infinite;
}

.shape-task-copy,
.shape-task-svg {
  position: relative;
  z-index: 1;
}

.shape-kicker {
  font-family: var(--font-stencil);
  color: var(--text-muted);
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.shape-task-copy h1 {
  font-family: var(--font-stencil);
  font-size: clamp(34px, 6vw, 64px);
  line-height: 0.95;
  text-transform: uppercase;
  color: var(--text-primary);
  text-shadow: 0 0 20px rgba(51, 255, 102, 0.18);
}

.side-command {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  margin-top: 12px;
  padding: 8px 16px;
  border-radius: 999px;
  color: var(--side-color);
  background: color-mix(in srgb, var(--side-color), transparent 88%);
  border: 1px solid color-mix(in srgb, var(--side-color), transparent 45%);
  font-family: var(--font-stencil);
  font-size: 18px;
  letter-spacing: 1px;
}

.side-arrow {
  display: inline-block;
  font-family: var(--font-mono);
  animation: arrow-left 0.8s ease-in-out infinite alternate;
}

.side-command.right .side-arrow {
  animation-name: arrow-right;
}

.shape-task-copy p {
  margin-top: 10px;
  color: var(--text-secondary);
  font-size: 15px;
}

.shape-task-svg {
  width: 220px;
  max-width: 100%;
  filter: drop-shadow(0 0 22px rgba(51, 255, 102, 0.28));
  transform-origin: center;
}

.circle-aura { animation: radial-glow 1.8s ease-in-out infinite; }
.circle-ring { fill: none; stroke: #33ff66; stroke-width: 8; animation: neon-ring 1.1s ease-in-out infinite; }
.circle-core { fill: rgba(224, 245, 232, 0.92); stroke: #06120a; stroke-width: 4; }
.shape-main { fill: rgba(224, 245, 232, 0.9); stroke: #33ff66; stroke-width: 6; }
.corner-ticks { fill: none; stroke: var(--side-color); stroke-width: 6; stroke-linecap: round; }
.square-dash { fill: none; stroke: var(--side-color); stroke-width: 5; stroke-dasharray: 12 10; animation: rotate-dash 3s linear infinite; transform-origin: 90px 75px; }
.triangle-fill { fill: url(#triangleSweep); animation: fill-sweep 1.6s ease-in-out infinite; }
.triangle-outline { fill: none; stroke: #e0f5e8; stroke-width: 6; stroke-linejoin: round; }

.board-shell {
  width: min(920px, 96vw);
  padding: 28px 18px 18px;
  border-radius: 18px;
  background: rgba(5, 10, 6, 0.82);
  border: 1px solid rgba(51, 255, 102, 0.14);
  box-shadow: 0 18px 56px rgba(0, 0, 0, 0.36);
  position: relative;
}

.side-zone {
  position: absolute;
  top: 7px;
  width: calc(50% - 20px);
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: rgba(224, 245, 232, 0.45);
  font-family: var(--font-stencil);
  font-size: 10px;
  letter-spacing: 2px;
}

.side-zone.left { left: 14px; background: rgba(59, 130, 246, 0.08); }
.side-zone.right { right: 14px; background: rgba(249, 115, 22, 0.08); }
.side-zone.active { color: #fff; background: color-mix(in srgb, var(--side-color), transparent 65%); box-shadow: 0 0 22px color-mix(in srgb, var(--side-color), transparent 70%); }

.board-track {
  display: grid;
  grid-template-columns: repeat(8, minmax(66px, 1fr));
  gap: 10px;
}

.board-slot {
  min-height: 92px;
  border-radius: 14px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  justify-items: center;
  align-items: center;
  padding: 8px 6px;
  background: linear-gradient(180deg, rgba(224, 245, 232, 0.08), rgba(224, 245, 232, 0.03));
  border: 1px solid rgba(224, 245, 232, 0.1);
  color: var(--text-secondary);
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.board-slot.target {
  transform: translateY(-6px) scale(1.05);
  border-color: var(--side-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--side-color), transparent 70%), 0 0 28px color-mix(in srgb, var(--side-color), transparent 54%);
  animation: target-pulse 1s ease-in-out infinite;
}

.board-slot.wrong-hit { animation: slot-wrong 0.3s ease; border-color: #ef4444; }
.board-slot.correct-hit { animation: slot-correct 0.4s ease; border-color: #33ff66; }

.hole-number,
.hole-side {
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
}

.slot-icon {
  width: 48px;
  height: 48px;
  fill: rgba(224, 245, 232, 0.9);
  stroke: rgba(51, 255, 102, 0.8);
  stroke-width: 2;
}

.shape-flash-correct { animation: shape-correct 0.4s ease; }
.shape-flash-wrong { animation: shape-wrong 0.3s ease; }

@keyframes target-breathe { 0%, 100% { transform: scale(1); opacity: 0.75; } 50% { transform: scale(1.08); opacity: 1; } }
@keyframes arrow-left { from { transform: translateX(6px); } to { transform: translateX(-8px); } }
@keyframes arrow-right { from { transform: translateX(-6px); } to { transform: translateX(8px); } }
@keyframes radial-glow { 0%, 100% { opacity: 0.35; transform: scale(0.95); transform-origin: center; } 50% { opacity: 0.9; transform: scale(1.08); } }
@keyframes neon-ring { 0%, 100% { stroke-width: 6; opacity: 0.75; } 50% { stroke-width: 10; opacity: 1; } }
@keyframes rotate-dash { to { transform: rotate(360deg); } }
@keyframes fill-sweep { 0%, 100% { opacity: 0.58; } 50% { opacity: 1; } }
@keyframes target-pulse { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.45); } }
@keyframes shape-correct { 0% { transform: scale(1); } 45% { transform: scale(1.2); filter: drop-shadow(0 0 34px #33ff66); } 100% { transform: scale(1); } }
@keyframes shape-wrong { 0%, 100% { transform: translateX(0); filter: drop-shadow(0 0 20px #ef4444); } 25% { transform: translateX(-10px); } 50% { transform: translateX(8px); } 75% { transform: translateX(-5px); } }
@keyframes slot-wrong { 0%, 100% { transform: translateX(0); } 33% { transform: translateX(-6px); } 66% { transform: translateX(6px); } }
@keyframes slot-correct { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.14); } }

@media (max-width: 720px) {
  .shape-display { inset: 82px 10px auto 10px; }
  .shape-task-card { grid-template-columns: 1fr; text-align: center; padding: 16px; }
  .shape-task-svg { width: 160px; justify-self: center; }
  .board-track { grid-template-columns: repeat(4, minmax(62px, 1fr)); }
  .side-zone { display: none; }
}
`;
