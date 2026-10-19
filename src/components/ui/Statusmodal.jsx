'use client';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import { WATCH_STATUSES } from '@/lib/watchStatus';
import { updateWatchStatus } from '@/lib/action/watchstatus.action';

const PANEL_WIDTH = 190; // matches the minWidth applied to the panel below
const VIEWPORT_MARGIN = 8;

export default function StatusModal({
  mediaType,
  tmdbId,
  seasonNumber = null,
  episodeNumber = null,
  title,
  poster,
  currentStatus = 'watching',
  onStatusChange,
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false); // drives the fade/slide-in
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => setMounted(true), []);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    // Clamp so the panel never spills past the right (or left) edge of the
    // viewport — important on mobile where the trigger sits near the edge.
    const panelWidth = Math.max(rect.width, PANEL_WIDTH);
    const maxLeft = window.innerWidth - panelWidth - VIEWPORT_MARGIN;
    const left = Math.max(VIEWPORT_MARGIN, Math.min(rect.left, maxLeft));

    setCoords({ top: rect.bottom + 8, left, width: rect.width });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    setError('');
    const t = setTimeout(() => setVisible(true), 10);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  const closeDropdown = useCallback(() => {
    setVisible(false);
    setTimeout(() => setOpen(false), 120);
  }, []);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e) {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        closeDropdown();
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') closeDropdown();
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, closeDropdown]);

  async function handleSelect(status) {
    setSaving(true);
    setError('');

    const result = await updateWatchStatus({
      mediaType, tmdbId, seasonNumber, episodeNumber, title, poster, status,
    });

    setSaving(false);

    if (result?.error) {
      setError(
        result.error === 'Not authenticated.'
          ? 'Log in to add this to your list.'
          : result.error
      );
      return;
    }

    onStatusChange?.(status);
    closeDropdown();
  }

  const activeOption = WATCH_STATUSES.find((s) => s.value === currentStatus) || WATCH_STATUSES[0];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? closeDropdown() : setOpen(true))}
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
          open
            ? 'border-orange-500/30 bg-orange-500/15 text-orange-300'
            : 'border-transparent text-muted-foreground/70 hover:bg-white/[0.06] hover:text-white'
        }`}
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activeOption.color }} />
        <span className="hidden sm:inline">{activeOption.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {mounted && open && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            minWidth: Math.max(coords.width, PANEL_WIDTH),
          }}
          className={`z-[9999] rounded-2xl border border-white/[0.08] bg-[#150f0f]/98 backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.03)] p-1.5 transition-all duration-150 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
          }`}
        >
          {error && (
            <p className="px-3 pt-1.5 pb-2 text-[11px] text-red-400">{error}</p>
          )}
          {WATCH_STATUSES.map((option) => {
            const isActive = currentStatus === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                disabled={saving}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                  isActive
                    ? 'bg-white/[0.07] text-white'
                    : 'text-muted-foreground/70 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: option.color }} />
                <span className="flex-1 text-left">{option.label}</span>
                {isActive && (
                  saving
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                    : <Check className="w-3.5 h-3.5 text-orange-400" />
                )}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
