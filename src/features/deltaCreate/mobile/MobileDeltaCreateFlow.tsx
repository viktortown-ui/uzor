import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { isDemoMode } from '../../../app/appMode';
import { createDelta, getDeltaCard, loadDeltaCategories, reactToDelta } from '../../deltas/deltaApi';
import type { DeltaCard, DeltaCategory, DeltaEffect, ReactToDeltaResult } from '../../deltas/deltaTypes';
import { demoCard, demoDeltaMapData } from '../../deltaMap/demoDeltaMapData';
import { loadDeltaMapContext } from '../../deltaMap/deltaMapLogic';
import { createEmptyDeltaDraft, resetDependentFields, restoreDeltaDraft, serializeDeltaDraft, validateDeltaStep } from '../deltaCreateLogic';
import {
  buildCreateDeltaInput,
  canPublishSeparate,
  createDemoDeltaResult,
  createDemoReactionResult,
  DELTA_CREATE_PRODUCTION_STORAGE_KEY,
  mapDeltaPublishError,
  resetProductionDraftAfterSuccess,
  shareDeltaPayload,
} from '../deltaCreateProductionLogic';
import { DELTA_CREATE_CATEGORIES, type DeltaCreateDraft } from '../deltaCreateTypes';
import { isLocationComplete, isWithinPermMvpArea, PERM_MVP_AREA_ERROR, shouldResetSimilarDecision } from '../deltaGeoLogic';
import { MobileDeltaChangeScreen } from './MobileDeltaChangeScreen';
import { MobileDeltaCreateResult } from './MobileDeltaCreateResult';
import { MobileDeltaLocationScreen } from './MobileDeltaLocationScreen';
import { MobileDeltaReviewScreen } from './MobileDeltaReviewScreen';
import './mobileDeltaCreate.css';

type Stage = 'change' | 'location' | 'review';
type FailedAction = { kind: 'create' } | { kind: 'confirm'; deltaId: string } | null;

type HeaderProps = {
  stage: Stage;
  onBack: () => void;
};

function MobileDeltaHeader({ stage, onBack }: HeaderProps) {
  const meta = stage === 'change' ? ['Новая Дельта', '1/3'] : stage === 'location' ? ['Место', '2/3'] : ['Проверка', '3/3'];
  return (
    <header className="mobile-delta-header">
      <button aria-label={stage === 'change' ? 'Закрыть создание Дельты' : 'Назад'} onClick={onBack}>
        {stage === 'change' ? (
          <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
        ) : (
          <svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" /></svg>
        )}
      </button>
      <span>{meta[0]}</span>
      <small>{meta[1]}</small>
    </header>
  );
}

function isChangeComplete(draft: DeltaCreateDraft) {
  return validateDeltaStep(draft, 2).concat(validateDeltaStep(draft, 3)).length === 0;
}

function isLocationStageComplete(draft: DeltaCreateDraft) {
  return isLocationComplete(draft) && isWithinPermMvpArea(draft.lat, draft.lng);
}

function deriveStage(draft: DeltaCreateDraft): Stage {
  if (!isChangeComplete(draft)) return 'change';
  if (!isLocationStageComplete(draft)) return 'location';
  return 'review';
}

function fallbackDeltaCard(id: string, draft: DeltaCreateDraft, categories: DeltaCategory[], reaction: ReactToDeltaResult): DeltaCard {
  const category = categories.find((item) => item.slug === draft.categorySlug) ?? {
    slug: draft.categorySlug || 'other',
    title: 'Категория',
    iconKey: draft.categorySlug || 'other',
  };
  const now = new Date().toISOString();
  return {
    id,
    statement: draft.statement,
    category,
    direction: draft.direction || 'positive',
    subject: draft.subject,
    changeType: draft.changeType || 'other',
    details: draft.details || null,
    observedWindow: draft.observedWindow || 'today',
    impactLevel: draft.impactLevel || 'noticeable',
    status: reaction.delta.status,
    moderationState: 'visible',
    confirmCount: reaction.delta.confirmCount,
    disconfirmCount: reaction.delta.disconfirmCount,
    confirmationTarget: reaction.delta.confirmationTarget,
    location: { lat: draft.lat ?? 0, lng: draft.lng ?? 0, label: draft.locationLabel || 'Место' },
    priorityScore: 0,
    createdAt: now,
    lastActivityAt: now,
    expiresAt: now,
  };
}

export function MobileDeltaCreateFlow({ mode }: { mode: 'production' | 'geo-lab' }) {
  const production = mode === 'production';
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const requestedStage = (params.get('stage') as Stage | null) || 'change';
  const activeStage: Stage = requestedStage === 'review' ? 'review' : requestedStage === 'location' ? 'location' : 'change';
  const screenHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const [draft, setDraft] = useState(createEmptyDeltaDraft);
  const [pending, setPending] = useState<DeltaCreateDraft | null>(() => restoreDeltaDraft(localStorage.getItem(DELTA_CREATE_PRODUCTION_STORAGE_KEY)));
  const [errors, setErrors] = useState<string[]>([]);
  const [locationError, setLocationError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const [categories, setCategories] = useState<DeltaCategory[]>(isDemoMode ? DELTA_CREATE_CATEGORIES : []);
  const [catStatus, setCatStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>(isDemoMode ? 'ready' : 'loading');
  const [circleState, setCircleState] = useState<'loading' | 'ready' | 'no-circle' | 'error'>(isDemoMode || !production ? 'ready' : 'loading');
  const [circleContext, setCircleContext] = useState<{ circleId: string; citySlug: string } | null>(isDemoMode || !production ? { circleId: 'demo-circle', citySlug: 'perm' } : null);

  const [result, setResult] = useState<{ mode: 'created_new' | 'confirmed_existing'; delta: DeltaCard; reaction?: ReactToDeltaResult; effect?: DeltaEffect } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const publishingRef = useRef(false);
  const [failedAction, setFailedAction] = useState<FailedAction>(null);
  const [publishError, setPublishError] = useState('');
  const [authorLocked, setAuthorLocked] = useState(false);
  const [shareStatus, setShareStatus] = useState('');

  const retryCategories = useCallback(() => {
    if (isDemoMode) return;
    setCatStatus('loading');
    loadDeltaCategories()
      .then((items) => {
        setCategories(items);
        setCatStatus(items.length ? 'ready' : 'empty');
      })
      .catch(() => setCatStatus('error'));
  }, []);

  useEffect(() => {
    const id = window.setTimeout(retryCategories, 0);
    return () => window.clearTimeout(id);
  }, [retryCategories]);

  const loadCircle = useCallback(() => {
    if (!production || isDemoMode) return;
    setCircleState('loading');
    loadDeltaMapContext()
      .then((context) => {
        setCircleContext(context);
        setCircleState(context ? 'ready' : 'no-circle');
      })
      .catch(() => setCircleState('error'));
  }, [production]);

  useEffect(() => {
    const id = window.setTimeout(loadCircle, 0);
    return () => window.clearTimeout(id);
  }, [loadCircle]);

  const update = useCallback((patch: Partial<DeltaCreateDraft>, changed?: string) => {
    setDraft((current) => {
      let next = { ...current, ...patch };
      if (changed === 'direction' || changed === 'subject' || changed === 'changeType') next = resetDependentFields(next, changed);
      if (changed && shouldResetSimilarDecision(changed)) next = { ...next, selectedSimilarDeltaId: null, similarDecision: null };
      return next;
    });
  }, []);

  useEffect(() => {
    const hasDraftData = Boolean(
      draft.direction
      || draft.categorySlug
      || draft.changeType
      || draft.subject.trim()
      || draft.statement.trim()
      || draft.observedWindow
      || draft.impactLevel
      || draft.details.trim()
      || draft.lat != null
      || draft.lng != null
      || draft.locationLabel.trim(),
    );
    if (!hasDraftData) return undefined;
    const id = window.setTimeout(() => {
      localStorage.setItem(DELTA_CREATE_PRODUCTION_STORAGE_KEY, serializeDeltaDraft(draft));
    }, 200);
    return () => window.clearTimeout(id);
  }, [draft]);

  useEffect(() => {
    const allowedStage = deriveStage(draft);
    if (activeStage === 'review' && allowedStage !== 'review') {
      setParams(allowedStage === 'location' ? { stage: 'location' } : {}, { replace: true });
    }
    if (activeStage === 'location' && allowedStage === 'change') {
      setParams({}, { replace: true });
    }
  }, [activeStage, draft, setParams]);

  useEffect(() => {
    const id = window.setTimeout(() => screenHeadingRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [activeStage]);

  const goStage = (stage: Stage, replace = false, from: Stage = activeStage) => {
    const search = stage === 'change' ? '' : `?stage=${stage}`;
    navigate({ pathname: location.pathname, search }, { replace, state: { deltaFlowFrom: from } });
  };

  const handleHeaderBack = () => {
    if (activeStage === 'change') {
      navigate('/pulse');
      return;
    }
    const expectedPrevious = activeStage === 'review' ? 'location' : 'change';
    const state = location.state as { deltaFlowFrom?: Stage } | null;
    if (state?.deltaFlowFrom === expectedPrevious) {
      navigate(-1);
      return;
    }
    goStage(expectedPrevious, true, activeStage);
  };

  const continueChange = () => {
    const nextErrors = [...validateDeltaStep(draft, 2), ...validateDeltaStep(draft, 3)];
    setErrors(nextErrors);
    if (nextErrors.length) {
      document.querySelector('.mobile-delta-alert')?.scrollIntoView({ block: 'center' });
      return;
    }
    goStage('location');
  };

  const continueLocation = () => {
    if (!isLocationStageComplete(draft)) {
      setLocationError(!isWithinPermMvpArea(draft.lat, draft.lng) ? PERM_MVP_AREA_ERROR : 'Выберите точку');
      return;
    }
    setLocationError('');
    goStage('review');
  };

  const beginPublish = (action: FailedAction) => {
    if (publishingRef.current) return false;
    publishingRef.current = true;
    setPublishing(true);
    setFailedAction(action);
    setPublishError('');
    setAuthorLocked(false);
    return true;
  };

  const finishPublish = () => {
    publishingRef.current = false;
    setPublishing(false);
  };

  const createSeparate = useCallback(async () => {
    if (!beginPublish({ kind: 'create' })) return;
    try {
      if (!canPublishSeparate(draft)) throw new Error('invalid_delta_payload');
      if (isDemoMode) {
        const demoResult = createDemoDeltaResult(draft);
        localStorage.removeItem(DELTA_CREATE_PRODUCTION_STORAGE_KEY);
        setResult({ mode: 'created_new', delta: demoResult.delta, effect: demoResult.effect });
        return;
      }
      if (!circleContext) throw new Error('not_circle_member');
      const created = await createDelta(buildCreateDeltaInput(draft, circleContext.circleId));
      localStorage.removeItem(DELTA_CREATE_PRODUCTION_STORAGE_KEY);
      setResult({ mode: 'created_new', delta: created.delta, effect: created.effect });
    } catch (caught) {
      setPublishError(mapDeltaPublishError(caught));
    } finally {
      finishPublish();
    }
  }, [circleContext, draft]);

  const confirmExisting = useCallback(async (id: string) => {
    if (!beginPublish({ kind: 'confirm', deltaId: id })) return;
    try {
      if (isDemoMode) {
        const card = demoCard(id) ?? demoCard(demoDeltaMapData[0].id);
        if (!card) throw new Error('delta_not_found');
        const reaction = createDemoReactionResult(card);
        localStorage.removeItem(DELTA_CREATE_PRODUCTION_STORAGE_KEY);
        setResult({ mode: 'confirmed_existing', delta: card, reaction });
        return;
      }
      const reaction = await reactToDelta(id, 'confirm');
      const card = await getDeltaCard(id).catch(() => fallbackDeltaCard(id, draft, categories, reaction));
      localStorage.removeItem(DELTA_CREATE_PRODUCTION_STORAGE_KEY);
      setResult({ mode: 'confirmed_existing', delta: card, reaction });
    } catch (caught) {
      const message = mapDeltaPublishError(caught);
      if (message === 'Первая отметка автора уже закреплена.') setAuthorLocked(true);
      else setPublishError(message);
    } finally {
      finishPublish();
    }
  }, [categories, draft]);

  const retryFailed = () => {
    if (failedAction?.kind === 'confirm') void confirmExisting(failedAction.deltaId);
    if (failedAction?.kind === 'create') void createSeparate();
  };

  const clearAll = () => {
    localStorage.removeItem(DELTA_CREATE_PRODUCTION_STORAGE_KEY);
    setDraft(createEmptyDeltaDraft());
    setPending(null);
    setConfirmReset(false);
    setResult(null);
    goStage('change', true);
  };

  if (result) {
    return (
      <MobileDeltaCreateResult
        mode={result.mode}
        delta={result.delta}
        reaction={result.reaction}
        effect={result.effect}
        onReset={() => {
          clearAll();
          setDraft(resetProductionDraftAfterSuccess());
        }}
        onShare={async (payload) => setShareStatus(await shareDeltaPayload(payload))}
        shareStatus={shareStatus}
      />
    );
  }

  if (circleState === 'loading') return <section className="mobile-delta-flow"><h1>Проверяем доступ к кругу</h1></section>;
  if (circleState === 'error') {
    return (
      <section className="mobile-delta-flow mobile-delta-state">
        <h1>Не удалось проверить доступ к кругу</h1>
        <button type="button" onClick={loadCircle}>Повторить</button>
        <Link to="/pulse">Вернуться в Пульс</Link>
      </section>
    );
  }
  if (circleState === 'no-circle') {
    return (
      <section className="mobile-delta-flow mobile-delta-state">
        <h1>Нужно войти в круг</h1>
        <p>Добавлять и проверять Дельты могут участники круга.</p>
        <Link className="mobile-delta-primary" to="/join">Войти в круг</Link>
        <Link to="/pulse">Вернуться в Пульс</Link>
      </section>
    );
  }

  if (pending) {
    return (
      <section className="mobile-delta-flow">
        <div className="mobile-delta-resume">
          <h1>Продолжить Дельту?</h1>
          <p>Черновик сохранён автоматически.</p>
          {(pending.statement || pending.subject) && <strong>{pending.statement || pending.subject}</strong>}
          {pending.locationLabel && <p>{pending.locationLabel}</p>}
          <button
            className="mobile-delta-primary"
            type="button"
            onClick={() => {
              setDraft(pending);
              setPending(null);
              goStage(deriveStage(pending));
            }}
          >
            Продолжить
          </button>
          <button type="button" onClick={() => setConfirmReset(true)}>Начать заново</button>
          {confirmReset && (
            <div role="alertdialog" className="mobile-delta-alert">
              <h2>Очистить черновик?</h2>
              <button type="button" onClick={() => setConfirmReset(false)}>Отмена</button>
              <button type="button" onClick={clearAll}>Да, очистить</button>
            </div>
          )}
        </div>
      </section>
    );
  }

  const action = activeStage === 'change'
    ? <button className="mobile-delta-primary" type="button" onClick={continueChange}>Продолжить</button>
    : activeStage === 'location'
      ? <button className="mobile-delta-primary" type="button" disabled={!isLocationStageComplete(draft)} onClick={continueLocation}>{isLocationStageComplete(draft) ? 'Подтвердить место' : 'Выберите точку'}</button>
      : null;

  return (
    <section className={`mobile-delta-flow${activeStage === 'location' ? ' mobile-delta-flow--location' : ''}`}>
      <MobileDeltaHeader stage={activeStage} onBack={handleHeaderBack} />
      <div className="mobile-delta-content">
        {activeStage === 'change' && (
          <MobileDeltaChangeScreen
            headingRef={screenHeadingRef}
            draft={draft}
            update={update}
            categories={categories}
            catStatus={catStatus}
            retry={retryCategories}
            errors={errors}
          />
        )}
        {activeStage === 'location' && (
          <MobileDeltaLocationScreen headingRef={screenHeadingRef} draft={draft} update={update} error={locationError} />
        )}
        {activeStage === 'review' && (
          <MobileDeltaReviewScreen
            headingRef={screenHeadingRef}
            draft={draft}
            update={(patch) => {
              if (patch.currentStep === 1) goStage('location');
              else if (patch.currentStep === 2) goStage('change');
              else update(patch);
            }}
            categories={categories}
            circleContext={circleContext}
            publishing={publishing}
            onCreateSeparate={createSeparate}
            onConfirmExisting={confirmExisting}
            publishError={publishError}
            authorLocked={authorLocked}
            onRetryFailed={retryFailed}
          />
        )}
      </div>
      {action && <div className="mobile-delta-actionbar">{action}</div>}
    </section>
  );
}
