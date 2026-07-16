import { describe, expect, it } from 'vitest';
import { buildDeltaStatement, createEmptyDeltaDraft, getChangeTypeOptions, resetDependentFields, restoreDeltaDraft, serializeDeltaDraft, validateDeltaDraft, validateDeltaStep, validateMobileDeltaStep } from './deltaCreateLogic';
import type { DeltaCreateDraft } from './deltaCreateTypes';

const valid = (direction: 'positive' | 'negative' = 'positive'): DeltaCreateDraft => ({ ...createEmptyDeltaDraft(), currentStep: 4, districtCode: 'leninsky', districtLabel: 'Ленинский район', direction, categorySlug: 'transport', changeType: direction === 'positive' ? 'faster' : 'slower', subject: 'ожидание автобуса вечером', statement: direction === 'positive' ? 'Ожидание автобуса вечером стало быстрее' : 'Ожидание автобуса вечером стало медленнее', observedWindow: 'today', impactLevel: 'noticeable' });

describe('delta create logic', () => {
  it('positive возвращает только positive change types', () => expect(getChangeTypeOptions('positive').map((o) => o.value)).toEqual(['faster','cheaper','more_available','more','appeared','improved','other']));
  it('negative возвращает только negative change types', () => expect(getChangeTypeOptions('negative').map((o) => o.value)).toEqual(['slower','more_expensive','less_available','less','disappeared','worsened','other']));
  it('смена direction сбрасывает несовместимый changeType', () => expect(resetDependentFields({ ...valid('positive'), direction: 'negative' }, 'direction').changeType).toBe(''));
  it('faster строит естественный statement', () => expect(buildDeltaStatement({ direction: 'positive', changeType: 'faster', subject: 'дорога до центра' })).toBe('Дорога до центра стало быстрее'));
  it('slower строит естественный statement', () => expect(buildDeltaStatement({ direction: 'negative', changeType: 'slower', subject: 'ожидание автобуса вечером' })).toBe('Ожидание автобуса вечером стало медленнее'));
  it('cheaper строит естественный statement', () => expect(buildDeltaStatement({ direction: 'positive', changeType: 'cheaper', subject: 'стоимость поездки' })).toBe('Стоимость поездки стала ниже'));
  it('more_expensive строит естественный statement', () => expect(buildDeltaStatement({ direction: 'negative', changeType: 'more_expensive', subject: 'стоимость поездки' })).toBe('Стоимость поездки стала выше'));
  it('more_available строит естественный statement', () => expect(buildDeltaStatement({ direction: 'positive', changeType: 'more_available', subject: 'запись к специалисту' })).toBe('Запись к специалисту стала доступнее'));
  it('less_available строит естественный statement', () => expect(buildDeltaStatement({ direction: 'negative', changeType: 'less_available', subject: 'запись к врачу' })).toBe('Запись к врачу стала менее доступной'));
  it('improved строит естественный statement', () => expect(buildDeltaStatement({ direction: 'positive', changeType: 'improved', subject: 'освещение возле остановки' })).toBe('Освещение возле остановки стало лучше'));
  it('worsened строит естественный statement', () => expect(buildDeltaStatement({ direction: 'negative', changeType: 'worsened', subject: 'переход у школы' })).toBe('Переход у школы стало хуже'));
  it('пустой district блокирует шаг 1', () => expect(validateDeltaStep({ ...valid(), districtCode: '', districtLabel: '' }, 1)).toContain('Выберите район или территорию'));
  it('locationHint не обязателен', () => expect(validateDeltaStep({ ...valid(), locationHint: '' }, 1)).toEqual([]));
  it('пустой direction блокирует шаг 2', () => expect(validateDeltaStep({ ...valid(), direction: '' }, 2)).toContain('Выберите: стало лучше или хуже'));
  it('пустая category блокирует шаг 2', () => expect(validateDeltaStep({ ...valid(), categorySlug: '' }, 2)).toContain('Выберите категорию'));
  it('пустой changeType блокирует шаг 2', () => expect(validateDeltaStep({ ...valid(), changeType: '' }, 2)).toContain('Выберите тип изменения'));
  it('desktop требует subject', () => expect(validateDeltaStep({ ...valid(), subject: '', statement: '' }, 2)).toContain('Коротко опишите изменение'));
  it('mobile позволяет пустой subject для конкретного типа изменения', () => expect(validateMobileDeltaStep({ ...valid(), subject: '', statement: '', statementMode: 'auto' }, 2)).toEqual([]));
  it('mobile other требует текст', () => expect(validateMobileDeltaStep({ ...valid(), changeType: 'other', subject: '', statement: '', statementMode: 'auto' }, 2)).toContain('Для варианта «Другое» коротко опишите изменение'));
  it('statement короче 8 символов блокируется', () => expect(validateDeltaStep({ ...valid(), categorySlug: '', subject: '', statement: '' }, 2)).toContain('Формулировка слишком короткая'));
  it('period обязателен', () => expect(validateDeltaStep({ ...valid(), observedWindow: '' }, 3)).toContain('Выберите период'));
  it('impact обязателен', () => expect(validateDeltaStep({ ...valid(), impactLevel: '' }, 3)).toContain('Укажите степень влияния'));
  it('details больше 500 символов блокируется', () => expect(validateDeltaStep({ ...valid(), details: 'а'.repeat(501) }, 3)).toContain('Пояснение не должно превышать 500 символов'));
  it('positive и negative проходят одинаковую структурную валидацию', () => { expect(validateDeltaDraft(valid('positive'))).toEqual([]); expect(validateDeltaDraft(valid('negative'))).toEqual([]); });
  it('draft сериализуется', () => expect(serializeDeltaDraft(valid())).toContain('Ленинский район'));
  it('draft восстанавливается', () => expect(restoreDeltaDraft(serializeDeltaDraft(valid()))?.districtCode).toBe('leninsky'));
  it('повреждённый JSON безопасно игнорируется', () => expect(restoreDeltaDraft('{bad')).toBeNull());
  it('неизвестные enum-значения не восстанавливаются', () => expect(restoreDeltaDraft(JSON.stringify({ ...valid(), direction: 'neutral' }))).toBeNull());
  it('manual statement не перезаписывается автоматически', () => expect(resetDependentFields({ ...valid(), statementMode: 'manual', statement: 'Моя точная формулировка', subject: 'новый предмет' }, 'subject').statement).toBe('Моя точная формулировка'));
  it('auto statement обновляется после изменения subject', () => expect(resetDependentFields({ ...valid(), subject: 'очередь в отделении', changeType: 'less', statementMode: 'auto' }, 'subject').statement).toBe('Очередь в отделении стала меньше'));
});
