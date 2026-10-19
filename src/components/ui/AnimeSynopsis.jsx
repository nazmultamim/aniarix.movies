'use client';

import { useEffect, useRef, useState } from 'react';

export default function AnimeSynopsis({ synopsis }) {
  const [expanded, setExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef(null);

  useEffect(() => {
    const el = textRef.current;
    if (el) {
      // Measured while collapsed (line-clamp-3 applied on mount),
      // so this accurately tells us if there's hidden overflow text.
      setIsTruncated(el.scrollHeight > el.clientHeight + 1);
    }
  }, [synopsis]);

  return (
    <div className="mt-5 rounded-lg border border-white/[0.04] bg-white/[0.02] p-3.5 text-[12.5px] leading-relaxed text-[#b8b8c0] sm:p-4 sm:text-[13.5px]">
      <p ref={textRef} className={expanded ? '' : 'line-clamp-3'}>
        {synopsis}
      </p>
      {isTruncated && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-1.5 font-semibold text-white transition-colors hover:text-orange-400"
        >
          {expanded ? 'Show less' : '...see more'}
        </button>
      )}
    </div>
  );
}