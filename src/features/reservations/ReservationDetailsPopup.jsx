import { X } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { formatReservationField } from './reservationDisplay'

const currency = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })

const FIELD_GROUPS = [
  {
    title: 'Cliente',
    fields: [
      ['customer', 'Nome'], ['country', 'País'], ['countryCode', 'Código do país'],
      ['clientPhone', 'Telefone'], ['clientEmail', 'Email'],
    ],
  },
  {
    title: 'Reserva',
    fields: [
      ['reference', 'Referência'], ['id', 'ID'], ['status', 'Estado'], ['origin', 'Origem'],
    ],
  },
  {
    title: 'Percurso',
    fields: [
      ['pickupAt', 'Entrega'], ['pickupStation', 'Local de entrega'],
      ['returnAt', 'Recolha'], ['returnStation', 'Local de recolha'], ['arrivalFlight', 'Voo de chegada'],
    ],
  },
  {
    title: 'Viatura',
    fields: [['vehicleGroup', 'Grupo'], ['licensePlate', 'Matrícula']],
  },
  {
    title: 'Comercial',
    fields: [['manualValue', 'Valor manual']],
  },
  {
    title: 'Notas',
    fields: [['deliveryComments', 'Comentários da entrega'], ['returnComments', 'Comentários da recolha']],
  },
]

const KNOWN_FIELDS = new Set(FIELD_GROUPS.flatMap((group) => group.fields.map(([key]) => key)))

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== ''
}

function formatValue(key, value) {
  if (key === 'manualValue') return currency.format(Number(value || 0))
  if (typeof value === 'object') return JSON.stringify(value)
  return String(formatReservationField(key, value))
}

function humanizeKey(key) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase())
}

function DetailGroup({ title, fields }) {
  if (!fields.length) return null
  return (
    <section className="reservation-details-group">
      <h3>{title}</h3>
      <dl>
        {fields.map(({ key, label, value }) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>{formatValue(key, value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default function ReservationDetailsPopup({ reservation, onClose }) {
  const closeButtonRef = useRef(null)
  const groups = useMemo(() => FIELD_GROUPS.map((group) => ({
    ...group,
    fields: group.fields
      .filter(([key]) => hasValue(reservation[key]))
      .map(([key, label]) => ({ key, label, value: reservation[key] })),
  })), [reservation])
  const extraFields = useMemo(() => Object.entries(reservation)
    .filter(([key, value]) => !KNOWN_FIELDS.has(key) && hasValue(value))
    .map(([key, value]) => ({ key, label: humanizeKey(key), value })), [reservation])

  useEffect(() => {
    closeButtonRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="reservation-details-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <article
        className="reservation-details-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-details-title"
      >
        <header className="reservation-details-header">
          <div>
            <span>Ficha completa</span>
            <h2 id="reservation-details-title">Reserva {reservation.reference || reservation.id || ''}</h2>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Fechar detalhes da reserva">
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="reservation-details-content">
          {groups.map((group) => <DetailGroup key={group.title} {...group} />)}
          <DetailGroup title="Informação adicional" fields={extraFields} />
        </div>
      </article>
    </div>
  )
}
