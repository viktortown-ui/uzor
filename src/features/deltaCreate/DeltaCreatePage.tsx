import { ProductShell } from '../../app/ProductShell';
import { useMediaQuery } from '../../app/useMediaQuery';
import { DesktopDeltaCreateFlow } from './DesktopDeltaCreateFlow';
import { MobileDeltaCreateErrorBoundary } from './mobile/MobileDeltaCreateErrorBoundary';
import { MobileDeltaCreateFlow } from './mobile/MobileDeltaCreateFlow';

export function DeltaCreatePage() {
  const isMobile = useMediaQuery('(max-width: 900px)');
  if (isMobile) return <ProductShell mobileDock="hidden" className="mobile-delta-shell"><MobileDeltaCreateErrorBoundary><MobileDeltaCreateFlow mode="production" /></MobileDeltaCreateErrorBoundary></ProductShell>;
  return <DesktopDeltaCreateFlow mode="production" />;
}
