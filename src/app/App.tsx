import { Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { isDemoMode } from './appMode';
const legacyRoutes = () => import('../features/legacyCircle/LegacyCircleRoutes');
const LegacyJoin = lazy(() => legacyRoutes().then(module => ({ default: module.Join })));
const LegacyContribute = lazy(() => legacyRoutes().then(module => ({ default: module.Contribute })));
const LegacyBranch = lazy(() => legacyRoutes().then(module => ({ default: module.Branch })));
const LegacyCurator = lazy(() => legacyRoutes().then(module => ({ default: module.Curator })));
const LegacyCuratorOverview = lazy(() => legacyRoutes().then(module => ({ default: module.CuratorOverview })));
const LegacyField = lazy(() => legacyRoutes().then(module => ({ default: module.Field })));

const WrappedPage = lazy(() => import('../features/wrapped/WrappedPage').then(module => ({ default: module.WrappedPage })));





const MobilePulsePage = lazy(() => import('../features/mobilePulse/MobilePulsePage').then(module => ({ default: module.MobilePulsePage })));


import { useMediaQuery } from './useMediaQuery';
import { AuthProvider } from '../features/auth/AuthProvider';
import { AuthPage } from '../features/auth/AuthPage';
import { AuthenticatedRoute, OpenCityRoute } from '../features/auth/ProtectedRoute';

import { AboutPage } from '../features/guide/AboutPage';

import { Onboarding } from '../features/guide/Onboarding';
const DeltaCreatePage = lazy(() => import('../features/deltaCreate/DeltaCreatePage').then(module => ({ default: module.DeltaCreatePage })));
const DeltaCreateLabPage = lazy(() => import('../features/deltaCreate/DeltaCreateLabPage').then(module => ({ default: module.DeltaCreateLabPage })));
const DeltaCreateGeoLabPage = lazy(() => import('../features/deltaCreate/DeltaCreateGeoLabPage').then(module => ({ default: module.DeltaCreateGeoLabPage })));
const LabShell = lazy(() => import('../lab/LabShell').then(module => ({ default: module.LabShell })));
const LabV4Shell = lazy(() => import('../lab/v4/LabV4Shell').then(module => ({ default: module.LabV4Shell })));
const WrappedReferencePage = lazy(() => import('../lab/wrappedReference/WrappedReferencePage').then(module => ({ default: module.WrappedReferencePage })));
const WrappedReferenceV2Page = lazy(() => import('../lab/wrappedReferenceV2/WrappedReferenceV2Page').then(module => ({ default: module.WrappedReferenceV2Page })));
const DeltaMapPage = lazy(() => import('../features/deltaMap/DeltaMapPage').then(module => ({ default: module.DeltaMapPage })));
const ForecastPage = lazy(() => import('../features/forecasting/ui/ForecastPage').then(module => ({ default: module.ForecastPage })));
const ForecastProposalForm = lazy(() => import('../features/forecastQuestions/ui/ForecastProposalForm').then(m => ({default:m.ForecastProposalForm})));
const ForecastProposalMinePage = lazy(() => import('../features/forecastQuestions/ui/ForecastProposalMinePage').then(m => ({default:m.ForecastProposalMinePage})));
const ForecastQuestionAdminPage = lazy(() => import('../features/forecastQuestions/ui/ForecastQuestionAdminPage').then(m => ({default:m.ForecastQuestionAdminPage})));
const ForecastResolverPage = lazy(() => import('../features/forecasting/ui/ForecastResolverPage').then(module => ({ default: module.ForecastResolverPage })));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then(module => ({ default: module.SettingsPage })));

function ResponsiveHomeRedirect() { const isMobile = useMediaQuery('(max-width: 900px)'); return <Navigate replace to={isMobile ? '/pulse' : '/wrapped'} />; }
function DesktopPulseRedirect() { const isMobile = useMediaQuery('(max-width: 900px)'); return isMobile ? <MobilePulsePage /> : <Navigate replace to="/wrapped" />; }
function AuthGate({ children }: { children: React.ReactNode }) { return isDemoMode ? children : <AuthenticatedRoute>{children}</AuthenticatedRoute>; }
function CityGate({ children }: { children: React.ReactNode }) { return isDemoMode ? children : <OpenCityRoute>{children}</OpenCityRoute>; }
function AppRoutes() { return <Suspense fallback={<div className="route-loading" role="status">Загружаем раздел…</div>}><Routes><Route path="/" element={<ResponsiveHomeRedirect />} /><Route path="/auth" element={<AuthPage />} /><Route path="/about" element={<AboutPage />} /><Route path="/join" element={<AuthGate><LegacyJoin /></AuthGate>} /><Route path="/contribute" element={<CityGate><DeltaCreatePage /></CityGate>} /><Route path="/lab/old-contribute" element={<LegacyContribute />} /><Route path="/branch/:id" element={<AuthGate><LegacyBranch /></AuthGate>} /><Route path="/curator" element={<AuthGate><LegacyCurator /></AuthGate>} /><Route path="/curator/overview" element={<AuthGate><LegacyCuratorOverview /></AuthGate>} /><Route path="/demo" element={<LegacyField />} /><Route path="/lab/old-home" element={<LegacyField />} /><Route path="/lab" element={<LabShell />} /><Route path="/lab/v4" element={<LabV4Shell />} /><Route path="/wrapped" element={<CityGate><WrappedPage /></CityGate>} /><Route path="/pulse" element={<CityGate><DesktopPulseRedirect /></CityGate>} /><Route path="/forecast" element={<AuthGate><ForecastPage /></AuthGate>} /><Route path="/forecast/propose" element={<CityGate><ForecastProposalForm /></CityGate>} /><Route path="/forecast/mine" element={<CityGate><ForecastProposalMinePage /></CityGate>} /><Route path="/forecast/admin/questions" element={<AuthGate><ForecastQuestionAdminPage /></AuthGate>} /><Route path="/forecast/resolve" element={<AuthGate><ForecastResolverPage /></AuthGate>} /><Route path="/map" element={<CityGate><DeltaMapPage /></CityGate>} /><Route path="/settings" element={<AuthGate><SettingsPage /></AuthGate>} /><Route path="/lab/delta-create-core" element={<DeltaCreateLabPage />} /><Route path="/lab/delta-create-geo" element={<DeltaCreateGeoLabPage />} /><Route path="/lab/wrapped-reference" element={<WrappedReferencePage />} /><Route path="/lab/wrapped-reference-v2" element={<WrappedReferenceV2Page />} /></Routes></Suspense>; }
export function App() { return <AuthProvider><AppRoutes /><Onboarding /></AuthProvider>; }
