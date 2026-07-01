import { X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import ReactCountryFlag from 'react-country-flag';
import { formatReservationField, getReservationCountryCode } from './reservationDisplay';

const currency = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
const countryNames = new Intl.DisplayNames(['pt-PT'], { type: 'region' });

const FIELD_GROUPS = [
  {
    title: 'Cliente',
    fields: [
      ['customer', 'Nome'],
      ['clientPhone', 'Telefone'],
      ['clientEmail', 'Email']
    ]
  },
  {
    title: 'Reserva',
    fields: [
      ['reference', 'ID'],
      ['origin', 'Origem'],
      ['status', 'Estado']
    ]
  },
  {
    title: 'Percurso',
    fields: [
      ['pickupAt', 'Entrega'],
      ['pickupStation', 'Local de entrega'],
      ['returnAt', 'Recolha'],
      ['returnStation', 'Local de recolha'],
      ['arrivalFlight', 'Voo de chegada']
    ]
  },
  {
    title: 'Viatura',
    fields: [
      ['vehicleGroup', 'Grupo'],
      ['licensePlate', 'Matrícula']
    ]
  },
  {
    title: 'Comercial',
    fields: [['manualValue', 'Valor']]
  },
  {
    title: 'Notas',
    fields: [
      ['deliveryComments', 'Comentários da entrega'],
      ['returnComments', 'Comentários da recolha']
    ]
  }
];

const KNOWN_FIELDS = new Set(['id', 'country', 'countryCode', ...FIELD_GROUPS.flatMap((group) => group.fields.map(([key]) => key))]);

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function formatValue(key, value) {
  if (key === 'manualValue') return currency.format(Number(value || 0));
  if (typeof value === 'object') return JSON.stringify(value);
  return String(formatReservationField(key, value));
}

function humanizeKey(key) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function DetailGroup({ title, fields, action = null, countryCode = '', countryName = '' }) {
  if (!fields.length) return null;
  return (
    <section className="reservation-details-group">
      <h3>{title}</h3>
      <dl>
        {fields.map(({ key, label, value }) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>
              {key === 'customer' && countryCode ? (
                <span className="reservation-details-client-name">
                  <ReactCountryFlag countryCode={countryCode} svg title={countryName} />
                  <span>{formatValue(key, value)}</span>
                </span>
              ) : (
                formatValue(key, value)
              )}
            </dd>
          </div>
        ))}
      </dl>
      {action}
    </section>
  );
}

export default function ReservationDetailsPopup({ reservation, onClose }) {
  const closeButtonRef = useRef(null);
  const groups = useMemo(
    () =>
      FIELD_GROUPS.map((group) => ({
        ...group,
        fields: group.fields.filter(([key]) => hasValue(reservation[key])).map(([key, label]) => ({ key, label, value: reservation[key] }))
      })),
    [reservation]
  );
  const extraFields = useMemo(
    () =>
      Object.entries(reservation)
        .filter(([key, value]) => !KNOWN_FIELDS.has(key) && hasValue(value))
        .map(([key, value]) => ({ key, label: humanizeKey(key), value })),
    [reservation]
  );
  const legacyReservationId = String(reservation.id ?? '').trim();
  const legacyReservationUrl = legacyReservationId
    ? `https://reservations.justdrivemadeira.com/index.php?controller=pjAdminBookings&action=pjActionUpdate&id=${encodeURIComponent(legacyReservationId)}`
    : '';
  const countryCode = getReservationCountryCode(reservation);
  const countryName = countryCode ? countryNames.of(countryCode) : '';

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="reservation-details-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <article className="reservation-details-popup" role="dialog" aria-modal="true" aria-labelledby="reservation-details-title">
        <header className="reservation-details-header">
          <div>
            <span>Ficha</span>
            <h2 id="reservation-details-title">Reserva {reservation.reference || reservation.id || ''}</h2>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Fechar detalhes da reserva">
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="reservation-details-content">
          {groups.map((group) => (
            <DetailGroup
              key={group.title}
              {...group}
              countryCode={countryCode}
              countryName={countryName}
              action={
                group.title === 'Reserva' && legacyReservationUrl ? (
                  <a className="reservation-details-legacy-link" href={legacyReservationUrl} target="_blank" rel="noreferrer">
                    Ver no Reservations
                  </a>
                ) : null
              }
            />
          ))}
          <DetailGroup title="Informação adicional" fields={extraFields} />
        </div>
      </article>
    </div>
  );
}
