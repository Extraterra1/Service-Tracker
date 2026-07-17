import { useId, useMemo, useRef, useState } from 'react';
import { Download, KeyRound, Search, X } from 'lucide-react';
import logoUrl from '../../assets/Logo Base.svg';
import whatsappUrl from '../../assets/whatsapp.svg';
import { A4_SIZE_MM, KEYRING_PDF_LAYOUT, KEYRING_ROWS_PER_PAGE, openKeyringPdf } from './keyringPdf';
import { rankPlateOptions } from './keyringSearch';

function KeyringStripPreview({ plate, rowIndex = 0 }) {
  const top = ((KEYRING_PDF_LAYOUT.strip.top + rowIndex * KEYRING_PDF_LAYOUT.strip.height) / A4_SIZE_MM.height) * 100;
  const height = (KEYRING_PDF_LAYOUT.strip.height / A4_SIZE_MM.height) * 100;
  return (
    <div
      className={`keyring-strip${rowIndex > 0 ? ' is-shared-edge' : ''}`}
      style={{ top: `${top}%`, height: `${height}%` }}
      aria-label={`Pré-visualização do porta-chaves ${plate}`}
    >
      {[0, 1].map((copy) => (
        <div className="keyring-insert" key={copy}>
          <div className="keyring-cell keyring-plate-cell">
            <img src={logoUrl} alt="" />
            <strong>{plate}</strong>
          </div>
          <div className="keyring-cell keyring-phone-cell">
            <img src={whatsappUrl} alt="" />
            <strong>+351927491323</strong>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function KeyringsWorkspace({ plateOptions = [], loading = false, error = '' }) {
  const [query, setQuery] = useState('');
  const [selectedValues, setSelectedValues] = useState([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const pickerRef = useRef(null);
  const listboxId = useId();
  const filteredOptions = useMemo(() => rankPlateOptions(plateOptions, query), [plateOptions, query]);
  const selectedPlates = selectedValues
    .map((value) => plateOptions.find((option) => option.value === value)?.label ?? '')
    .filter(Boolean);
  const pickerDisabled = loading || Boolean(error) || plateOptions.length === 0;
  const activeIndex = filteredOptions.length === 0 ? 0 : Math.min(highlightedIndex, filteredOptions.length - 1);
  const activeOption = filteredOptions[activeIndex];

  const selectPlate = (option) => {
    setSelectedValues((current) => (current.includes(option.value) ? current : [...current, option.value]));
    setQuery(option.label);
    setIsPickerOpen(false);
    setHighlightedIndex(0);
  };

  const handlePickerKeyDown = (event) => {
    if (pickerDisabled) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsPickerOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setIsPickerOpen(true);
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setHighlightedIndex((current) => {
        if (filteredOptions.length === 0) return 0;
        return (current + direction + filteredOptions.length) % filteredOptions.length;
      });
      return;
    }
    if (event.key === 'Enter' && isPickerOpen && activeOption) {
      event.preventDefault();
      selectPlate(activeOption);
    }
  };

  const handleGenerate = async () => {
    if (selectedPlates.length === 0 || generating) return;
    setGenerating(true);
    setGenerationError('');
    try {
      await openKeyringPdf(selectedPlates);
    } catch (nextError) {
      setGenerationError(nextError?.message || 'Não foi possível gerar o PDF. Tenta novamente.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="keyrings-workspace">
      <section className="keyrings-control-panel" aria-labelledby="keyrings-heading">
        <div className="keyrings-kicker">
          <KeyRound aria-hidden="true" /> Impressão
        </div>
        <h2 id="keyrings-heading">Porta-chaves</h2>
        <p className="keyrings-intro">Escolhe uma matrícula e gera a folha pronta para imprimir.</p>

        <div className="keyrings-search-field keyrings-combobox" ref={pickerRef}>
          <label htmlFor={`${listboxId}-input`}>Pesquisar matrícula</label>
          <span className="keyrings-input-shell">
            <Search aria-hidden="true" />
            <input
              id={`${listboxId}-input`}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isPickerOpen}
              aria-controls={listboxId}
              aria-activedescendant={isPickerOpen && activeOption ? `${listboxId}-${activeOption.value}` : undefined}
              value={query}
              disabled={pickerDisabled}
              onFocus={() => setIsPickerOpen(true)}
              onBlur={(event) => {
                if (!pickerRef.current?.contains(event.relatedTarget)) setIsPickerOpen(false);
              }}
              onChange={(event) => {
                setQuery(event.target.value);
                setIsPickerOpen(true);
                setHighlightedIndex(0);
              }}
              onKeyDown={handlePickerKeyDown}
              placeholder="Ex.: BF-07-JZ"
            />
          </span>
          {isPickerOpen && !pickerDisabled ? (
            <div className="keyrings-combobox-results" id={listboxId} role="listbox">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <button
                    type="button"
                    id={`${listboxId}-${option.value}`}
                    role="option"
                    aria-selected={selectedValues.includes(option.value)}
                    className={index === activeIndex ? 'is-highlighted' : ''}
                    key={option.value}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => selectPlate(option)}
                  >
                    {option.label}
                  </button>
                ))
              ) : (
                <p>Sem matrículas correspondentes.</p>
              )}
            </div>
          ) : null}
        </div>

        {selectedPlates.length > 0 ? (
          <div className="keyrings-selected-plates" aria-label="Matrículas selecionadas">
            {selectedPlates.map((plate) => (
              <div className="keyrings-selected-plate" key={plate}>
                <span><small>Selecionada</small><strong>{plate}</strong></span>
                <button
                  type="button"
                  aria-label={`Remover matrícula ${plate}`}
                  onClick={() => {
                    const option = plateOptions.find((item) => item.label === plate);
                    setSelectedValues((current) => current.filter((value) => value !== option?.value));
                    setQuery('');
                    setIsPickerOpen(false);
                    setHighlightedIndex(0);
                  }}
                >
                  <X aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {loading ? (
          <p className="keyrings-state" aria-live="polite">
            A carregar viaturas…
          </p>
        ) : null}
        {!loading && !error && plateOptions.length === 0 ? <p className="keyrings-state">Não foram encontradas viaturas no histórico.</p> : null}
        {error ? (
          <p className="keyrings-error" role="alert">
            {error}
          </p>
        ) : null}
        {generationError ? (
          <p className="keyrings-error" role="alert">
            {generationError}
          </p>
        ) : null}

        <button type="button" className="primary-btn keyrings-generate" onClick={handleGenerate} disabled={selectedPlates.length === 0 || generating}>
          <Download aria-hidden="true" /> {generating ? 'A gerar…' : 'Gerar PDF'}
        </button>
        <p className="keyrings-note">A4 · 9 viaturas por página · 2 cópias por viatura</p>
      </section>

      <section className="keyrings-preview-panel" aria-labelledby="keyrings-preview-heading">
        <div className="keyrings-preview-head">
          <div>
            <span>Pré-visualização</span>
            <h2 id="keyrings-preview-heading">Folha A4</h2>
          </div>
          <span className="keyrings-scale-badge">Escala 1:1 no PDF</span>
        </div>
        <div className="keyrings-preview-pages">
          {selectedPlates.length > 0 ? selectedPlates.reduce((pages, plate, index) => {
            const pageIndex = Math.floor(index / KEYRING_ROWS_PER_PAGE);
            if (!pages[pageIndex]) pages[pageIndex] = [];
            pages[pageIndex].push({ plate, rowIndex: index % KEYRING_ROWS_PER_PAGE });
            return pages;
          }, []).map((rows, pageIndex) => (
            <div className="keyring-page" aria-label={`Pré-visualização da folha A4 ${pageIndex + 1}`} key={pageIndex}>
              {rows.map((row) => <KeyringStripPreview key={row.plate} plate={row.plate} rowIndex={row.rowIndex} />)}
            </div>
          )) : (
            <div className="keyring-page" aria-label="Pré-visualização da folha A4">
              <div className="keyring-page-empty">
                <KeyRound aria-hidden="true" />
                <span>A matrícula aparece aqui</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
