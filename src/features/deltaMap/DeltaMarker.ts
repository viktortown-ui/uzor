import type { DeltaMapItem } from '../deltas/deltaTypes';
import { getDeltaMarkerVisual } from './deltaMapLogic';
export function createDeltaMarkerElement(delta: DeltaMapItem, onSelect: (delta: DeltaMapItem) => void, highlight = false): HTMLElement {
  const visual = getDeltaMarkerVisual(delta);
  const button = document.createElement('button');
  button.type = 'button'; button.className = `delta-marker core-${visual.coreTone} ring-${visual.ringTone}${visual.pulse ? ' is-pulsing' : ''}${highlight ? ' is-highlighted' : ''}`;
  button.style.setProperty('--marker-size', `${Math.max(24, visual.size)}px`);
  button.setAttribute('aria-label', `${delta.statement}. ${visual.statusLabel}`);
  button.innerHTML = `<span class="delta-marker__visual" aria-hidden="true"><span class="delta-marker__mast"></span><span class="delta-marker__flag"></span><span class="delta-marker__status"></span>${visual.ringTone === 'fork' ? '<span class="delta-marker__flag delta-marker__flag--fork"></span>' : ''}</span>`;
  button.addEventListener('click', () => onSelect(delta));
  button.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(delta); } });
  return button;
}
