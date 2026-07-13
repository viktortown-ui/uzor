import { ProductShell } from '../../app/ProductShell';
import { useMediaQuery } from '../../app/useMediaQuery';
import { DesktopDeltaCreateFlow } from './DesktopDeltaCreateFlow';
import { MobileDeltaCreateFlow } from './mobile/MobileDeltaCreateFlow';

export function DeltaCreatePage() {
  const isMobile = useMediaQuery('(max-width: 900px)');
  if (isMobile) return <ProductShell mobileDock="hidden" className="mobile-delta-shell"><MobileDeltaCreateFlow mode="production" /></ProductShell>;
  return <DesktopDeltaCreateFlow mode="production" />;
}
