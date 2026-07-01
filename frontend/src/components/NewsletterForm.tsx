'use client';

import { useState } from 'react';

/** Nyhedsbrev-tilmelding i footeren (demo: gemmer intet, viser bare kvittering). */
export function NewsletterForm() {
  const [done, setDone] = useState(false);

  if (done) {
    return <p className="mt-2 text-sm text-brand-green">Tak — du er tilmeldt! ✓</p>;
  }

  return (
    <form
      className="mt-2 flex overflow-hidden rounded"
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true);
      }}
    >
      <input
        type="email"
        required
        placeholder="Din email"
        className="flex-1 px-3 py-2 text-sm text-gray-800 focus:outline-none"
      />
      <button className="bg-brand-red px-4 text-white hover:bg-brand-red-dark" aria-label="Tilmeld">
        ➤
      </button>
    </form>
  );
}
