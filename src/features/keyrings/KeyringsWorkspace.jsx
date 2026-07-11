import { useMemo, useState } from 'react';
import { Download, KeyRound, Search } from 'lucide-react';
import logoUrl from '../../assets/Logo Base.svg';
import whatsappUrl from '../../assets/whatsapp.svg';
import { downloadKeyringPdf } from './keyringPdf';

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
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!normalizedQuery) return plateOptions;
    return plateOptions.filter((option) => `${option.value}${option.label}`.toUpperCase().replace(/[^A-Z0-9]/g, '').includes(normalizedQuery));
  }, [plateOptions, query]);
  const selectedPlate = plateOptions.find((option) => option.value === selectedValue)?.label ?? '';

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

        <label className="keyrings-search-field">
          <span>Pesquisar matrícula</span>
          <span className="keyrings-input-shell"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex.: BF-07-JZ" /></span>
        </label>

        <label className="keyrings-select-field">
          <span>Selecionar viatura</span>
          <select value={selectedValue} onChange={(event) => setSelectedValue(event.target.value)} disabled={loading || Boolean(error) || plateOptions.length === 0}>
            <option value="">Escolhe uma matrícula</option>
            {filteredOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>

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
