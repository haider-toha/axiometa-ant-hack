export interface HistoryEntry {
  id: number;
  heard: string;
  keyword: string;
  reply: string;
}

interface HistoryProps {
  entries: HistoryEntry[];
}

/**
 * On-screen log of completed exchanges (heard message + spoken reply).
 *
 * A plain <ul> — deliberately NOT a live region, so re-rendering it never spams
 * the screen reader / braille display. Newest exchange first so the latest is
 * visible without scrolling. DOM order stays after the caption + cards and above
 * the persistent Speak button (reading order, 1A §C5).
 */
export default function History({ entries }: HistoryProps) {
  if (entries.length === 0) return null;

  return (
    <section className="history" aria-label="Conversation history">
      <h2 className="history__title">History</h2>
      <ul className="history__list">
        {entries
          .slice()
          .reverse()
          .map((entry) => (
            <li key={entry.id} className="history__item">
              {entry.heard ? (
                <p className="history__line history__heard">
                  <span className="history__label">Heard: </span>
                  {entry.heard}
                  {entry.keyword ? ` (buzzed: ${entry.keyword})` : ""}
                </p>
              ) : null}
              <p className="history__line history__reply">
                <span className="history__label">You replied: </span>
                {entry.reply}
              </p>
            </li>
          ))}
      </ul>
    </section>
  );
}
