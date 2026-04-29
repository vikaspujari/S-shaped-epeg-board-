import React from 'react';

function formatSeconds(value) {
  return `${Number(value || 0).toFixed(1)}s`;
}

function isSameRound(row, summaryRound) {
  return Boolean(
    summaryRound &&
      row.shape === summaryRound.shape &&
      row.side === summaryRound.side &&
      Number(row.time_taken) === Number(summaryRound.time_taken)
  );
}

function getTotalTime(analytics, perRound) {
  if (typeof analytics.total_time === 'number') {
    return analytics.total_time;
  }
  return perRound.reduce((total, row) => total + Number(row.time_taken || 0), 0);
}

function getLevel(totalTime, analytics) {
  if (analytics.current_level) {
    return analytics.current_level;
  }
  if (totalTime < 60) return 'Hard';
  if (totalTime < 90) return 'Medium';
  return 'Easy';
}

function getRecommendation(level, analytics) {
  if (analytics.difficulty_recommendation) {
    return analytics.difficulty_recommendation;
  }
  if (level === 'Hard') return 'Increase difficulty for the next session';
  if (level === 'Medium') return 'Keep the current difficulty';
  return 'Reduce difficulty for the next session';
}

export default function AnalyticsPanel({ analytics, onRestart }) {
  if (!analytics) return null;

  const perRound = analytics.per_round || [];
  const totalTime = getTotalTime(analytics, perRound);
  const currentLevel = getLevel(totalTime, analytics);
  const recommendation = getRecommendation(currentLevel, analytics);

  return (
    <div className="analytics-panel-overlay">
      <style>{styles}</style>

      <section className="analytics-panel" aria-label="Game analytics">
        <div className="analytics-panel-header">
          <div className="analytics-eyebrow">Training Complete</div>
          <h1>Shape Mission Debrief</h1>
          <p>Eight shape-and-side combinations completed.</p>
        </div>

        <div className="analytics-summary-grid">
          <div className="analytics-summary-card">
            <span>Total Rounds</span>
            <strong>{analytics.total_rounds || perRound.length}</strong>
          </div>
          <div className="analytics-summary-card">
            <span>Total Time</span>
            <strong>{formatSeconds(totalTime)}</strong>
          </div>
          <div className="analytics-summary-card">
            <span>Average Time</span>
            <strong>{formatSeconds(analytics.avg_time_per_round)}</strong>
          </div>
          <div className={`analytics-summary-card level level-${currentLevel.toLowerCase()}`}>
            <span>Current Level</span>
            <strong>{currentLevel}</strong>
          </div>
          <div className="analytics-summary-card hardest">
            <span>Hardest Shape</span>
            <strong>{analytics.hardest_shape || 'N/A'}</strong>
          </div>
        </div>

        <div className="analytics-highlights">
          <div>
            <span>Fastest</span>
            <strong>
              {analytics.fastest_round
                ? `${analytics.fastest_round.shape} ${analytics.fastest_round.side} - ${formatSeconds(analytics.fastest_round.time_taken)}`
                : 'N/A'}
            </strong>
          </div>
          <div>
            <span>Slowest</span>
            <strong>
              {analytics.slowest_round
                ? `${analytics.slowest_round.shape} ${analytics.slowest_round.side} - ${formatSeconds(analytics.slowest_round.time_taken)}`
                : 'N/A'}
            </strong>
          </div>
        </div>

        <div className="difficulty-recommendation">
          <span>Difficulty Recommendation</span>
          <strong>{recommendation}</strong>
        </div>

        <div className="analytics-table-wrap">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Shape</th>
                <th>Side</th>
                <th>Hole</th>
                <th>Time</th>
                <th>Wrong Attempts</th>
              </tr>
            </thead>
            <tbody>
              {perRound.map((row, index) => {
                const fastest = isSameRound(row, analytics.fastest_round);
                const slowest = isSameRound(row, analytics.slowest_round);
                return (
                  <tr key={`${row.shape}-${row.side}-${row.hole_id}-${index}`} className={`${fastest ? 'fastest' : ''} ${slowest ? 'slowest' : ''}`}>
                    <td>{row.shape}</td>
                    <td>{row.side}</td>
                    <td>{row.hole_id}</td>
                    <td>{formatSeconds(row.time_taken)}</td>
                    <td>{row.wrong_attempts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button className="analytics-play-again" onClick={onRestart}>Play Again</button>
      </section>
    </div>
  );
}

const styles = `
.analytics-panel-overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  padding: 28px;
  background:
    radial-gradient(circle at 20% 10%, rgba(51, 255, 102, 0.14), transparent 30%),
    radial-gradient(circle at 80% 20%, rgba(249, 115, 22, 0.14), transparent 26%),
    rgba(5, 10, 6, 0.94);
  overflow-y: auto;
  animation: analytics-fade 0.45s ease-out;
}

.analytics-panel {
  width: min(980px, 96vw);
  max-height: calc(100vh - 56px);
  overflow-y: auto;
  background: linear-gradient(145deg, rgba(8, 18, 10, 0.96), rgba(14, 42, 26, 0.9));
  border: 1px solid rgba(51, 255, 102, 0.22);
  border-radius: 22px;
  box-shadow: 0 24px 90px rgba(0, 0, 0, 0.55), 0 0 50px rgba(51, 255, 102, 0.12);
  padding: 28px;
}

.analytics-panel-header {
  text-align: center;
  margin-bottom: 24px;
}

.analytics-eyebrow {
  font-family: var(--font-stencil);
  font-size: 11px;
  text-transform: uppercase;
  color: var(--accent-amber);
  letter-spacing: 2px;
}

.analytics-panel-header h1 {
  margin-top: 6px;
  font-family: var(--font-stencil);
  font-size: clamp(28px, 5vw, 46px);
  color: var(--accent-green);
  letter-spacing: 2px;
  text-transform: uppercase;
}

.analytics-panel-header p {
  margin-top: 6px;
  color: var(--text-secondary);
}

.analytics-summary-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
  margin-bottom: 16px;
}

.analytics-summary-card,
.analytics-highlights > div,
.difficulty-recommendation {
  background: rgba(224, 245, 232, 0.06);
  border: 1px solid rgba(224, 245, 232, 0.12);
  border-radius: 14px;
  padding: 16px;
}

.analytics-summary-card span,
.analytics-highlights span,
.difficulty-recommendation span {
  display: block;
  margin-bottom: 5px;
  font-family: var(--font-stencil);
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.analytics-summary-card strong,
.analytics-highlights strong,
.difficulty-recommendation strong {
  font-family: var(--font-mono);
  font-size: 25px;
  color: var(--text-primary);
  text-transform: capitalize;
}

.analytics-summary-card.hardest strong {
  color: var(--accent-amber);
}

.analytics-summary-card.level-hard strong {
  color: var(--accent-red);
}

.analytics-summary-card.level-medium strong {
  color: var(--accent-amber);
}

.analytics-summary-card.level-easy strong {
  color: var(--accent-green);
}

.analytics-highlights {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-bottom: 16px;
}

.analytics-highlights strong {
  font-size: 17px;
}

.difficulty-recommendation {
  margin-bottom: 16px;
  border-color: rgba(51, 255, 102, 0.22);
  background: linear-gradient(135deg, rgba(51, 255, 102, 0.08), rgba(245, 158, 11, 0.06));
}

.difficulty-recommendation strong {
  display: block;
  font-size: 18px;
  line-height: 1.4;
}

.analytics-table-wrap {
  overflow-x: auto;
  border-radius: 14px;
  border: 1px solid rgba(224, 245, 232, 0.12);
}

.analytics-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 650px;
  background: rgba(0, 0, 0, 0.16);
}

.analytics-table th,
.analytics-table td {
  padding: 12px 14px;
  text-align: left;
  border-bottom: 1px solid rgba(224, 245, 232, 0.08);
}

.analytics-table th {
  font-family: var(--font-stencil);
  color: var(--text-muted);
  font-size: 10px;
  letter-spacing: 1.4px;
  text-transform: uppercase;
}

.analytics-table td {
  font-family: var(--font-mono);
  color: var(--text-primary);
  text-transform: capitalize;
}

.analytics-table tr.fastest td {
  background: rgba(51, 255, 102, 0.1);
  color: #b9ffd0;
}

.analytics-table tr.slowest td {
  background: rgba(245, 158, 11, 0.1);
  color: #ffd999;
}

.analytics-play-again {
  display: block;
  margin: 22px auto 0;
  padding: 13px 44px;
  border-radius: 999px;
  border: 2px solid var(--accent-green);
  background: var(--accent-green);
  color: #041006;
  cursor: pointer;
  font-family: var(--font-stencil);
  font-size: 14px;
  letter-spacing: 2px;
  text-transform: uppercase;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.analytics-play-again:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 24px rgba(51, 255, 102, 0.35);
}

@keyframes analytics-fade {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}

@media (max-width: 720px) {
  .analytics-panel-overlay { padding: 14px; }
  .analytics-panel { padding: 18px; }
  .analytics-summary-grid,
  .analytics-highlights { grid-template-columns: 1fr; }
}
`;
