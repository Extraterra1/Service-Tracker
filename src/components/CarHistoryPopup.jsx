import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';
import { normalizePlate } from '../lib/plates';
import { getTodayDate } from '../lib/date';

const HISTORY_SKELETON_ROWS = [0, 1, 2];
const DATE_VALUE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function getServiceLabel(serviceType) {
  return serviceType === 'return' ? 'Recolha' : 'Entrega';
}

function matchesPlateOption(option, query) {
  const normalizedQuery = normalizePlate(query);
  if (!normalizedQuery) {
    return true;
  }

  const candidate = normalizePlate(option.label || option.value);
  let queryIndex = 0;

  for (const character of candidate) {
    if (character === normalizedQuery[queryIndex]) {
      queryIndex += 1;
      if (queryIndex >= normalizedQuery.length) {
        return true;
      }
    }
  }

  return false;
}

function isCompleteDateValue(value) {
  return DATE_VALUE_PATTERN.test(String(value ?? '').trim());
}

function CarHistoryPopup({ loading, error, plateOptions, entriesByPlate, rangeStart, rangeEnd, onApplyDateRange, onClose, initialPlateKey = '' }) {
  const [selectedPlateKeyState, setSelectedPlateKeyState] = useState('');
  const [searchValueState, setSearchValueState] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSearchPristine, setIsSearchPristine] = useState(true);
  const [highlightedIndexState, setHighlightedIndexState] = useState(0);
  const [animatedPlateKeyState, setAnimatedPlateKeyState] = useState('');
  const [isPlateSwitchingState, setIsPlateSwitchingState] = useState(false);
  const normalizedInitialPlateKeyRef = useRef('');
  const [draftRangeState, setDraftRangeState] = useState({
    sourceKey: '',
    rangeStart: '',
    rangeEnd: ''
  });
  const pickerRef = useRef(null);
  const listboxId = useId();
  const appliedRangeKey = `${rangeStart}:${rangeEnd}`;
  const selectedPlateKey = useMemo(() => {
    if (plateOptions.some((option) => option.value === selectedPlateKeyState)) {
      return selectedPlateKeyState;
    }

    return '';
  }, [plateOptions, selectedPlateKeyState]);
  const selectedPlateLabel = plateOptions.find((option) => option.value === selectedPlateKey)?.label ?? selectedPlateKey;
  const searchValue = isPickerOpen ? searchValueState : selectedPlateLabel;
  const deferredSearchValue = useDeferredValue(searchValue);
  const effectiveSearchValue = isPickerOpen && isSearchPristine ? '' : deferredSearchValue;
  const filteredPlateOptions = useMemo(
    () => plateOptions.filter((option) => matchesPlateOption(option, effectiveSearchValue)),
    [effectiveSearchValue, plateOptions]
  );
  const selectedEntries = animatedPlateKeyState ? entriesByPlate[animatedPlateKeyState] ?? [] : [];
  const draftRange =
    draftRangeState.sourceKey === appliedRangeKey
      ? draftRangeState
      : {
          sourceKey: appliedRangeKey,
          rangeStart,
          rangeEnd
        };
  const highlightedIndex = filteredPlateOptions.length > 0 ? Math.min(highlightedIndexState, filteredPlateOptions.length - 1) : 0;
  const activeOption = isPickerOpen ? filteredPlateOptions[highlightedIndex] ?? filteredPlateOptions[0] : null;
  const canAutoApplyDateRange =
    isCompleteDateValue(draftRange.rangeStart) &&
    isCompleteDateValue(draftRange.rangeEnd) &&
    draftRange.rangeStart <= draftRange.rangeEnd &&
    (draftRange.rangeStart !== rangeStart || draftRange.rangeEnd !== rangeEnd);
  const showRangeControls = Boolean(rangeStart || rangeEnd || plateOptions.length > 0 || error || loading);
  const todayDate = getTodayDate();

  useEffect(() => {
    const nextPlateKey = normalizePlate(initialPlateKey);

    if (!nextPlateKey) {
      normalizedInitialPlateKeyRef.current = '';
      setSelectedPlateKeyState('');
      setSearchValueState('');
      setIsPickerOpen(false);
      setIsSearchPristine(true);
      setHighlightedIndexState(0);
      return;
    }

    if (nextPlateKey !== normalizedInitialPlateKeyRef.current) {
      normalizedInitialPlateKeyRef.current = nextPlateKey;
    }

    const matchingOption = plateOptions.find((option) => option.value === nextPlateKey);
    if (!matchingOption) {
      return;
    }

    setSelectedPlateKeyState(nextPlateKey);
    setSearchValueState(matchingOption.label);
    setIsPickerOpen(false);
    setIsSearchPristine(true);
    setHighlightedIndexState(0);
  }, [initialPlateKey, plateOptions]);

  useEffect(() => {
    if (!selectedPlateKey) {
      setAnimatedPlateKeyState('');
      setIsPlateSwitchingState(false);
      return;
    }

    if (!animatedPlateKeyState) {
      setAnimatedPlateKeyState(selectedPlateKey);
      return;
    }

    if (selectedPlateKey === animatedPlateKeyState) {
      return;
    }

    setIsPlateSwitchingState(true);
    const timeoutId = window.setTimeout(() => {
      setAnimatedPlateKeyState(selectedPlateKey);
      setIsPlateSwitchingState(false);
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [selectedPlateKey, animatedPlateKeyState]);

  useEffect(() => {
    if (!canAutoApplyDateRange) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      onApplyDateRange({
        rangeStart: draftRange.rangeStart,
        rangeEnd: draftRange.rangeEnd
      });
    }, 220);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [canAutoApplyDateRange, draftRange.rangeEnd, draftRange.rangeStart, onApplyDateRange]);

  function openPicker() {
    setIsPickerOpen(true);
    setIsSearchPristine(true);
    setSearchValueState(selectedPlateLabel);
    setHighlightedIndexState(0);
  }

  function closePicker() {
    setIsPickerOpen(false);
    setIsSearchPristine(true);
    setHighlightedIndexState(0);
  }

  function selectPlateOption(option) {
    setSelectedPlateKeyState(option.value);
    setSearchValueState(option.label);
    setIsPickerOpen(false);
    setIsSearchPristine(true);
    setHighlightedIndexState(0);
    normalizedInitialPlateKeyRef.current = '';
  }

  function updateDraftRange(field, value) {
    setDraftRangeState({
      sourceKey: appliedRangeKey,
      rangeStart: field === 'rangeStart' ? value : draftRange.rangeStart,
      rangeEnd: field === 'rangeEnd' ? value : draftRange.rangeEnd
    });
  }

  return (
    <div
      className="car-history-popup-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="car-history-popup" role="dialog" aria-modal="true" aria-label="Histórico de viaturas">
        <header className="car-history-popup-header">
          <div className="car-history-popup-header-copy">
            <p className="car-history-popup-kicker">Histórico de Viaturas</p>
            <h3>{selectedPlateLabel || 'Selecionar matrícula'}</h3>
          </div>
          <button type="button" className="car-history-popup-close" onClick={onClose} aria-label="Fechar histórico de viaturas">
            ✕
          </button>
        </header>

        {showRangeControls ? (
          <div className="car-history-popup-content">
            <div className="car-history-popup-controls" data-testid="car-history-controls">
              <div className="car-history-popup-range">
                <p className="car-history-popup-hint car-history-popup-range-label">Janela do histórico</p>
                <div className="car-history-popup-range-controls">
                  <label className="field-inline field-inline-date" htmlFor="car-history-range-start">
                    <span>Data inicial</span>
                    <input
                      id="car-history-range-start"
                      type="date"
                      value={draftRange.rangeStart}
                      onChange={(event) => updateDraftRange('rangeStart', event.target.value)}
                    />
                  </label>
                  <label className="field-inline field-inline-date" htmlFor="car-history-range-end">
                    <span>Data final</span>
                    <input
                      id="car-history-range-end"
                      type="date"
                      value={draftRange.rangeEnd}
                      onChange={(event) => updateDraftRange('rangeEnd', event.target.value)}
                    />
                  </label>
                </div>
              </div>

              {!loading && !error && plateOptions.length > 0 ? (
                <>
                  <label className="sr-only" htmlFor="car-history-plate-search">
                    Selecionar matrícula
                  </label>
                  <div
                    ref={pickerRef}
                    className="car-history-popup-picker"
                    onBlur={() => {
                      requestAnimationFrame(() => {
                        if (pickerRef.current?.contains(document.activeElement)) {
                          return;
                        }
                        closePicker();
                      });
                    }}
                  >
                    <input
                      id="car-history-plate-search"
                      className="car-history-popup-search"
                      type="text"
                      role="combobox"
                      value={searchValue}
                      onFocus={openPicker}
                      onChange={(event) => {
                        setSearchValueState(event.target.value);
                        setIsPickerOpen(true);
                        setIsSearchPristine(false);
                        setHighlightedIndexState(0);
                      }}
                      onClick={() => {
                        if (!isPickerOpen) {
                          openPicker();
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowDown') {
                          event.preventDefault();
                          if (!isPickerOpen) {
                            openPicker();
                            return;
                          }
                          setHighlightedIndexState((currentIndex) => {
                            if (filteredPlateOptions.length === 0) {
                              return 0;
                            }
                            return Math.min(currentIndex + 1, filteredPlateOptions.length - 1);
                          });
                        }

                        if (event.key === 'ArrowUp') {
                          event.preventDefault();
                          if (!isPickerOpen) {
                            openPicker();
                            return;
                          }
                          setHighlightedIndexState((currentIndex) => Math.max(currentIndex - 1, 0));
                        }

                        if (event.key === 'Enter' && isPickerOpen && activeOption) {
                          event.preventDefault();
                          selectPlateOption(activeOption);
                        }

                        if (event.key === 'Escape') {
                          event.preventDefault();
                          closePicker();
                        }
                      }}
                      aria-label="Selecionar matrícula"
                      aria-autocomplete="list"
                      aria-expanded={isPickerOpen ? 'true' : 'false'}
                      aria-controls={listboxId}
                      aria-activedescendant={activeOption ? `${listboxId}-${activeOption.value}` : undefined}
                      autoComplete="off"
                      spellCheck="false"
                      placeholder="Pesquisar matrícula"
                    />

                    {isPickerOpen ? (
                      filteredPlateOptions.length > 0 ? (
                        <ul id={listboxId} className="car-history-popup-options" role="listbox" aria-label="Resultados de matrículas">
                          {filteredPlateOptions.map((option, optionIndex) => (
                            <li
                              key={option.value}
                              id={`${listboxId}-${option.value}`}
                              className={`car-history-popup-option${optionIndex === highlightedIndex ? ' is-highlighted' : ''}`}
                              role="option"
                              aria-selected={option.value === selectedPlateKey}
                              onMouseDown={(event) => {
                                event.preventDefault();
                              }}
                              onClick={() => selectPlateOption(option)}
                            >
                              {option.label}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="car-history-popup-search-empty">Sem matrículas correspondentes.</p>
                      )
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>

            <div className="car-history-popup-results" data-testid="car-history-results">
              {loading ? (
                <>
                  <p className="sr-only" role="status">
                    A carregar histórico...
                  </p>
                  <div className="car-history-popup-skeleton" data-testid="car-history-loading-skeleton" aria-hidden="true">
                    {HISTORY_SKELETON_ROWS.map((rowIndex) => (
                      <div key={`history-skeleton-${rowIndex}`} className="car-history-popup-skeleton-item">
                        <div className="car-history-popup-skeleton-row car-history-popup-skeleton-row-head">
                          <span className="car-history-popup-skeleton-chip is-wide" />
                          <span className="car-history-popup-skeleton-chip is-tag" />
                          <span className="car-history-popup-skeleton-chip is-time" />
                        </div>
                        <div className="car-history-popup-skeleton-row car-history-popup-skeleton-row-body">
                          <span className="car-history-popup-skeleton-chip is-client" />
                          <span className="car-history-popup-skeleton-chip is-reservation" />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : error ? (
                <p className="helper-text">{error}</p>
              ) : plateOptions.length === 0 ? (
                <p className="helper-text">Sem histórico de viaturas para esta janela.</p>
              ) : animatedPlateKeyState ? (
                <ul key={animatedPlateKeyState} className={`car-history-popup-list${isPlateSwitchingState ? ' is-fading' : ''}`}>
                  {selectedEntries.map((entry) => {
                    const isToday = entry.date === todayDate;

                    return (
                      <li key={entry.id} className={`car-history-popup-item${isToday ? ' is-today' : ''}`}>
                        <div className="car-history-popup-row car-history-popup-row-head">
                          <span className="car-history-popup-date">{entry.date}</span>
                          <span className="car-history-popup-pill-group">
                            <span className={`car-history-popup-service is-${entry.serviceType === 'return' ? 'return' : 'pickup'}`}>
                              {getServiceLabel(entry.serviceType)}
                            </span>
                            {isToday ? <span className="car-history-popup-today-pill">Hoje</span> : null}
                          </span>
                          <span className="car-history-popup-time">{entry.effectiveTime}</span>
                        </div>
                        <div className="car-history-popup-row car-history-popup-row-body">
                          <span className="car-history-popup-client">{entry.clientName}</span>
                          <span className="car-history-popup-reservation">{entry.reservationId}</span>
                          <span className="car-history-popup-location">{entry.location}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="helper-text">Pesquisa uma matrícula para ver o histórico.</p>
              )}
            </div>
          </div>
        ) : loading ? (
          <p className="helper-text">A carregar histórico...</p>
        ) : (
          <p className="car-history-popup-hint">Janela: --</p>
        )}
      </section>
    </div>
  );
}

export default CarHistoryPopup;
