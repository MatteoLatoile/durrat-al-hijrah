'use client';

import {useEffect} from 'react';
import {createPortal} from 'react-dom';
import {ChevronLeft, ChevronRight, X} from 'lucide-react';
import './fullscreen-photo-viewer.css';

type Props = {
  photos: string[];
  index: number;
  onChange: (index: number) => void;
  onClose: () => void;
};

export function FullscreenPhotoViewer({
  photos,
  index,
  onChange,
  onClose
}: Props) {

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }

      if (event.key === 'ArrowRight' && photos.length > 1) {
        onChange((index + 1) % photos.length);
      }

      if (event.key === 'ArrowLeft' && photos.length > 1) {
        onChange((index - 1 + photos.length) % photos.length);
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [index, photos.length, onChange, onClose]);

  if (!photos.length) return null;

  const current = ((index % photos.length) + photos.length)
    % photos.length;

  function previous() {
    onChange((current - 1 + photos.length) % photos.length);
  }

  function next() {
    onChange((current + 1) % photos.length);
  }

  return createPortal(
    <div
      className="dh-fullscreen-viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Galerie photos en plein écran"
      onClick={onClose}
    >

      <div className="dh-fullscreen-top">
        <span className="dh-fullscreen-counter">
          {current + 1} / {photos.length}
        </span>

        <button
          type="button"
          className="dh-fullscreen-close"
          onClick={event => {
            event.stopPropagation();
            onClose();
          }}
          aria-label="Fermer"
          title="Fermer (Échap)"
        >
          <X size={26}/>
        </button>
      </div>

      <img
        className="dh-fullscreen-image"
        src={photos[current]}
        alt={`Photo ${current + 1}`}
        onClick={event => event.stopPropagation()}
      />

      {photos.length > 1 && (
        <>
          <button
            type="button"
            className="dh-fullscreen-arrow previous"
            onClick={event => {
              event.stopPropagation();
              previous();
            }}
            aria-label="Photo précédente"
          >
            <ChevronLeft size={30}/>
          </button>

          <button
            type="button"
            className="dh-fullscreen-arrow next"
            onClick={event => {
              event.stopPropagation();
              next();
            }}
            aria-label="Photo suivante"
          >
            <ChevronRight size={30}/>
          </button>
        </>
      )}

      <div className="dh-fullscreen-bottom">
        DURRAT AL HIJRAH
      </div>

    </div>,
    document.body
  );
}