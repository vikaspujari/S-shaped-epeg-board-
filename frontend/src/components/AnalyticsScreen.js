import React from 'react';

export default function AnalyticsScreen({ summary, onRestart }) {
  if (!summary) return null;

  const {
    total_time = 0,
    avg_time = 0,
    difficulty = 'N/A',
    suggested_difficulty = 'N/A',
    slowest_hole = 0,
    improvement_vs_last = 0,
  } = summary;

  const improvementClass =
    improvement_vs_last > 0
      ? 'positive'
      : improvement_vs_last < 0
      ? 'negative'
      : 'neutral';

  const improvementText =
    improvement_vs_last > 0
      ? `↑ ${improvement_vs_last.toFixed(2)}s faster`
      : improvement_vs_last < 0
      ? `↓ ${Math.abs(improvement_vs_last).toFixed(2)}s slower`
      : '— First Mission';

  const suggestion = getSuggestionMessage(difficulty, suggested_difficulty, improvement_vs_last);

  return (
    <div className="analytics-overlay" id="analytics-screen">
      <div className="analytics-header">
        <span className="trophy">🎖️</span>
        <h1>Mission Complete</h1>
        <p>Debrief — performance analysis below</p>
      </div>

      <div className="analytics-grid">
        {/* Total Time */}
        <div className="stat-card" id="stat-total-time">
          <span className="stat-icon">⏱️</span>
          <div className="stat-label">Total Time</div>
          <div className="stat-value cyan">{total_time.toFixed(1)}s</div>
        </div>

        {/* Avg Time per Hole */}
        <div className="stat-card" id="stat-avg-time">
          <span className="stat-icon">📊</span>
          <div className="stat-label">Avg / Hole</div>
          <div className="stat-value blue">{avg_time.toFixed(2)}s</div>
        </div>

        {/* Current Difficulty */}
        <div className="stat-card" id="stat-difficulty">
          <span className="stat-icon">🎯</span>
          <div className="stat-label">Difficulty</div>
          <div className="stat-value purple">{difficulty}</div>
        </div>

        {/* Suggested Difficulty */}
        <div className="stat-card" id="stat-suggested">
          <span className="stat-icon">💡</span>
          <div className="stat-label">Recommended</div>
          <div className="stat-value orange">{suggested_difficulty}</div>
        </div>

        {/* Slowest Hole */}
        <div className="stat-card" id="stat-slowest">
          <span className="stat-icon">🐌</span>
          <div className="stat-label">Slowest Obj.</div>
          <div className="stat-value pink">Hole {slowest_hole}</div>
        </div>

        {/* Improvement */}
        <div className="stat-card" id="stat-improvement">
          <span className="stat-icon">📈</span>
          <div className="stat-label">vs Last Mission</div>
          <div className={`stat-value ${improvementClass}`}>
            {improvementText}
          </div>
        </div>
      </div>

      <div className="suggestion-banner" id="suggestion-banner">
        <span className="suggestion-icon">🧠</span>
        <div className="suggestion-text" dangerouslySetInnerHTML={{ __html: suggestion }} />
      </div>

      <button className="restart-btn" id="restart-btn" onClick={onRestart}>
        New Mission
      </button>
    </div>
  );
}

function getSuggestionMessage(difficulty, suggested, improvement) {
  if (difficulty === 'Easy' && suggested === 'Medium') {
    return "Good start, soldier. Ready to advance to <strong>Medium difficulty</strong> — tighter timing will sharpen your reflexes.";
  }
  if (difficulty === 'Medium' && suggested === 'Hard') {
    return "Impressive coordination. You're cleared for <strong>Hard difficulty</strong>. Focus on smooth, controlled movements through the course.";
  }
  if (difficulty === 'Hard') {
    return "Elite performance. You're operating at <strong>peak level</strong>. Maintain consistency and push for even faster transitions.";
  }
  if (improvement > 0) {
    return `You improved by <strong>${improvement.toFixed(2)}s per objective</strong> vs your last mission — outstanding progress. Keep the momentum going.`;
  }
  if (improvement < 0) {
    return "Slower run this time — that's okay. Recovery sessions build endurance. <strong>Stay disciplined</strong> and you'll push through.";
  }
  return "First mission logged. <strong>Keep training regularly</strong> to track your tactical improvement over time.";
}
