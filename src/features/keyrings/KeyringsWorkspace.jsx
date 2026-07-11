import { useId, useMemo, useRef, useState } from 'react';
import { Download, KeyRound, Search, X } from 'lucide-react';
import logoUrl from '../../assets/Logo Base.svg';
import whatsappUrl from '../../assets/whatsapp.svg';
import { downloadKeyringPdf } from './keyringPdf';
import { rankPlateOptions } from './keyringSearch';

function KeyringStripPreview({ plate }) {
  return (
    <div className="keyring-strip" aria-label={`Pré-visualização do porta-chaves ${plate}`}>
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
  const [selectedValue, setSelectedValue] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const pickerRef = useRef(null);
  const listboxId = useId();
  const filteredOptions = useMemo(() => rankPlateOptions(plateOptions, query), [plateOptions, query]);
  const selectedPlate = plateOptions.find((option) => option.value === selectedValue)?.label ?? '';
  const pickerDisabled = loading || Boolean(error) || plateOptions.length === 0;
  const activeIndex = filteredOptions.length === 0 ? 0 : Math.min(highlightedIndex, filteredOptions.length - 1);
  const activeOption = filteredOptions[activeIndex];

  const selectPlate = (option) => {
    setSelectedValue(option.value);
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
    if (!selectedPlate || generating) return;
    setGenerating(true);
    setGenerationError('');
    try {
      await downloadKeyringPdf(selectedPlate);
    } catch (nextError) {
      setGenerationError(nextError?.message || 'Não foi possível gerar o PDF. Tenta novamente.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="keyrings-workspace">
      <section className="keyrings-control-panel" aria-labelledby="keyrings-heading">
        <div className="keyrings-kicker"><KeyRound aria-hidden="true" /> Oficina de impressão</div>
        <h2 id="keyrings-heading">Porta-chaves da viatura</h2>
        <p className="keyrings-intro">Escolhe uma matrícula e descarrega a folha A4 pronta para imprimir à escala real.</p>

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
              {filteredOptions.length > 0 ? filteredOptions.map((option, index) => (
                <button
                  type="button"
                  id={`${listboxId}-${option.value}`}
                  role="option"
                  aria-selected={option.value === selectedValue}
                  className={index === activeIndex ? 'is-highlighted' : ''}
                  key={option.value}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => selectPlate(option)}
                >
                  {option.label}
                </button>
              )) : <p>Sem matrículas correspondentes.</p>}
            </div>
          ) : null}
        </div>

        {selectedPlate ? (
          <div className="keyrings-selected-plate">
            <span><small>Viatura selecionada</small><strong>{selectedPlate}</strong></span>
            <button
              type="button"
              aria-label={`Limpar matrícula ${selectedPlate}`}
              onClick={() => {
                setSelectedValue('');
                setQuery('');
                setIsPickerOpen(false);
                setHighlightedIndex(0);
              }}
            >
              <X aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {loading ? <p className="keyrings-state" aria-live="polite">A carregar viaturas…</p> : null}
        {!loading && !error && plateOptions.length === 0 ? <p className="keyrings-state">Não foram encontradas viaturas no histórico.</p> : null}
        {error ? <p className="keyrings-error" role="alert">{error}</p> : null}
        {generationError ? <p className="keyrings-error" role="alert">{generationError}</p> : null}

        <button type="button" className="primary-btn keyrings-generate" onClick={handleGenerate} disabled={!selectedPlate || generating}>
          <Download aria-hidden="true" /> {generating ? 'A gerar…' : 'Gerar PDF'}
        </button>
        <p className="keyrings-note">A4 · 2 cópias · +351 927 491 323</p>
      </section>

      <section className="keyrings-preview-panel" aria-labelledby="keyrings-preview-heading">
        <div className="keyrings-preview-head"><div><span>Pré-visualização</span><h2 id="keyrings-preview-heading">Folha A4</h2></div><span className="keyrings-scale-badge">Escala 1:1 no PDF</span></div>
        <div className="keyring-page" aria-label="Pré-visualização da folha A4">
          {selectedPlate ? <KeyringStripPreview plate={selectedPlate} /> : <div className="keyring-page-empty"><KeyRound aria-hidden="true" /><span>A matrícula aparece aqui</span></div>}
        </div>
      </section>
    </main>
  );
}
