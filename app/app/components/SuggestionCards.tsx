interface SuggestionCardsProps {
  replies: string[];
  onSelect: (index: number, text: string) => void;
}

/**
 * Up to three suggested replies as a labelled list of real <button>s (1A §C3).
 *
 *  - Container is a <ul aria-label="Suggested replies"> with an explicit
 *    role="list" (belt-and-braces in case CSS `list-style:none` strips list
 *    semantics in some engines). Screen reader announces "Suggested replies,
 *    list, N items".
 *  - Each card's accessible name is the FULL reply text (no truncation).
 *  - Focus is deliberately NOT moved here on appearance — the user may still be
 *    reading the caption on their braille display. Arrival is announced once,
 *    politely, via the status region in the parent.
 */
export default function SuggestionCards({
  replies,
  onSelect,
}: SuggestionCardsProps) {
  if (replies.length === 0) return null;

  return (
    <section aria-labelledby="cards-heading">
      <h2 id="cards-heading" className="cards__heading">
        Suggested replies
      </h2>
      <ul className="cards" role="list" aria-label="Suggested replies">
        {replies.slice(0, 3).map((text, index) => (
          <li key={`${index}-${text}`}>
            <button
              type="button"
              className="card"
              onClick={() => onSelect(index, text)}
            >
              {text}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
