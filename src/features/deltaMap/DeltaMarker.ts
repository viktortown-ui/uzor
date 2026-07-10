import type { DeltaMapItem } from '../deltas/deltaTypes';
import { getDeltaMarkerVisual } from './deltaMapLogic';
export function createDeltaMarkerElement(delta: DeltaMapItem, onSelect: (delta: DeltaMapItem) => void, highlight = false): HTMLElement {
  const visual = getDeltaMarkerVisual(delta);
  const button = document.createElement('button');
  button.type = 'button'; button.className = `delta-marker core-${visual.coreTone} ring-${visual.ringTone}${visual.pulse ? ' is-pulsing' : ''}${highlight ? ' is-highlighted' : ''}`;
  button.style.setProperty('--marker-size', `${visual.size}px`);
  button.setAttribute('aria-label', `${delta.statement}. ${visual.statusLabel}`);
  button.innerHTML = `<span class="delta-marker__ring"></span><span class="delta-marker__core"><span class="delta-marker__icon delta-marker__icon--${visual.categoryIcon}" aria-hidden="true"></span></span>`;
  button.addEventListener('click', () => onSelect(delta));
  button.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(delta); } });
  return button;
}
