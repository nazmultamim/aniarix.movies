'use client';

import { useEffect } from 'react';

function isBlockedShortcut(event) {
  const key = String(event.key || '').toLowerCase();
  const ctrlOrMeta = event.ctrlKey || event.metaKey;
  const shift = event.shiftKey;

  if (key === 'f12') return true;

  if (ctrlOrMeta && shift && ['i', 'j', 'c'].includes(key)) return true;

  if (ctrlOrMeta && ['u', 's', 'p'].includes(key)) return true;

  if (ctrlOrMeta && shift && key === 'k') return true;

  return false;
}

export default function AntiInspectGuard() {
  useEffect(() => {
    const handleContextMenu = (event) => {
      event.preventDefault();
    };

    const handleKeyDown = (event) => {
      if (!isBlockedShortcut(event)) return;
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  return null;
}
