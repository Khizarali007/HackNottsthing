import { useState } from 'react';

export default function RepoPicker({ value, onSubmit }) {
  // STATE: Local scratchpad for what's currently typed in the box
  const [draft, setDraft] = useState(value);

  // HANDLER: Runs when the user hits Load or presses Enter
  function handleSubmit(event) {
    event.preventDefault();               // Stops the page from refreshing
    const cleaned = draft.trim();         // Removes accidental trailing spaces
    onSubmit(cleaned);                    // Hands the URL up to App
  }

  // RENDER: The visual form
  return (
    <form onSubmit={handleSubmit} className="xp-repo-picker">
    <label htmlFor="repo-url">Address:</label>
    <input
        id="repo-url"
        className="xp-input"
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="https://github.com/owner/repo (blank = default)"
    />
    <button type="submit" className="xp-button">Go</button>
    </form>
  );
}