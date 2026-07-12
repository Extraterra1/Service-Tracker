import { Building2, CalendarArrowDown, CalendarArrowUp, CarFront, Clock3, ExternalLink, MapPinned, Plane, RectangleHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import ReactCountryFlag from 'react-country-flag';
import { FaWhatsapp } from 'react-icons/fa';
import { getWhatsAppHref } from '../../lib/phone';
import { formatReservationField, getReservationCountryCode } from './reservationDisplay';

const currency = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
const countryNames = new Intl.DisplayNames(['pt-PT'], { type: 'region' });
const IMT_DAILY_FEE = 2;
const IMT_MAX_DAYS = 10;
const DISCOUNT_FIELD_KEYS = [
  'discount',
  'discountPercent',
  'discountPercentage',
  'discountRate',
  'discountValue',
  'partnerDiscount',
  'promoDiscount',
  'couponDiscount'
];

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
    title: 'Condutor',
    fields: [
      ['driverLicenseNumber', 'Carta de condução'],
      ['accommodationAddress', 'Morada do alojamento']
    ]
  },
  {
    title: 'Percurso',
    fields: [
      ['pickupAt', 'Entrega'],
      ['returnAt', 'Recolha'],
      ['pickupStation', 'Local de entrega'],
      ['returnStation', 'Local de recolha'],
      ['durationDays', 'Duração'],
      ['arrivalFlight', 'Voo de chegada']
    ]
  },
  {
    title: 'Viatura',
    fields: [
      ['carModel', 'Modelo'],
      ['licensePlate', 'Matrícula'],
      ['vehicleGroup', 'Grupo']
    ]
  },
  {
    title: 'Comercial',
    fields: [
      ['baseValue', 'Valor base'],
      ['usageFee', 'Taxa'],
      ['manualValue', 'Valor total']
    ]
  },
  {
    title: 'Extras',
    fields: []
  },
  {
    title: 'Notas',
    fields: [
      ['deliveryNote', 'Comentários da entrega'],
      ['customerNote', 'Notas do cliente'],
      ['serviceNote', 'Notas do serviço'],
      ['returnComments', 'Comentários da recolha']
    ]
  },
  {
    title: 'Reserva',
    fields: [['origin', 'Origem']]
  }
];

const KNOWN_FIELDS = new Set(['id', 'reference', 'status', 'country', 'countryCode', 'carMake', 'extras', 'deliveryComments', ...FIELD_GROUPS.flatMap((group) => group.fields.map(([key]) => key))]);

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function formatValue(key, value) {
  if (!hasValue(value)) return '—';
  if (key === 'manualValue' || key === 'baseValue' || key === 'usageFee') return currency.format(Number(value || 0));
  if (key === 'durationDays') {
    const days = Number(value || 0);
    return `${days} ${days === 1 ? 'dia' : 'dias'}`;
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(formatReservationField(key, value));
}

function formatImtAmount(value, language) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString(language === 'pt' ? 'pt-PT' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}€`;
}

function parseNumberLike(value) {
  const normalized = String(value ?? '')
    .trim()
    .replace('%', '')
    .replace(/\s/g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getReservationDiscountPercent(reservation) {
  for (const key of DISCOUNT_FIELD_KEYS) {
    const discount = parseNumberLike(reservation[key]);
    if (discount > 0 && discount < 100) return discount;
  }

  const text = Object.values(reservation).map((value) => String(value ?? '')).join('\n');
  const discountMatch = text.match(/\b(?:desconto|discount)\s+(\d+(?:[.,]\d+)?)\s*%/i);
  if (discountMatch) {
    const discount = parseNumberLike(discountMatch[1]);
    if (discount > 0 && discount < 100) return discount;
  }

  return 0;
}

function getImtFeeAmount(reservation) {
  const days = getRentalDays(reservation);
  const feeDays = Math.min(Math.max(days, 0), IMT_MAX_DAYS);
  return feeDays * IMT_DAILY_FEE;
}

function getPostImtPreDiscountFinalPrice(reservation) {
  const finalPriceAfterImt = Number(reservation.manualValue || 0) + getImtFeeAmount(reservation);
  if (!Number.isFinite(finalPriceAfterImt) || finalPriceAfterImt <= 0) return 0;

  const discountPercent = getReservationDiscountPercent(reservation);
  if (!discountPercent) return finalPriceAfterImt;

  return finalPriceAfterImt / (1 - discountPercent / 100);
}

function formatClipboardAmount(value) {
  const amount = Number(value || 0);
  return amount.toFixed(2);
}

function parseReservationDate(value) {
  const normalized = String(value ?? '').trim().replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getRentalDays(reservation) {
  const explicitDays = Number(reservation.durationDays);
  if (Number.isFinite(explicitDays) && explicitDays > 0) return Math.ceil(explicitDays);

  const pickupAt = parseReservationDate(reservation.pickupAt);
  const returnAt = parseReservationDate(reservation.returnAt);
  if (!pickupAt || !returnAt || returnAt <= pickupAt) return 0;

  return Math.max(Math.ceil((returnAt.getTime() - pickupAt.getTime()) / 86_400_000), 1);
}

function buildImtMessage({ reservation, countryCode }) {
  const days = getRentalDays(reservation);
  const initialAmount = Number(reservation.manualValue || 0);
  const totalAmount = initialAmount + getImtFeeAmount(reservation);
  const language = String(countryCode ?? '').toUpperCase() === 'PT' ? 'pt' : 'en';
  const initialText = formatImtAmount(initialAmount, language);
  const totalText = formatImtAmount(totalAmount, language);

  if (language === 'pt') {
    return [
      'Informamos os nossos clientes que, de acordo com a nova legislação em vigor na Região Autónoma da Madeira, a partir do dia 1 de junho de 2026, passou a ser aplicada uma taxa regional obrigatória aos contratos de aluguer de viaturas rent-a-car.',
      '',
      'Assim, para além do valor final apresentado para o aluguer da viatura, será acrescentada a respetiva taxa regional obrigatória de 2€ por dia por viatura;',
      '',
      'Esta taxa é aplicada até ao máximo de 10 dias por contrato, conforme definido pela legislação regional em vigor.',
      '',
      `No seu caso, como são ${days} ${days === 1 ? 'dia' : 'dias'} de aluguer, ao valor inicialmente apresentado de ${initialText} será acrescentado o valor da taxa, passando o total para ${totalText}.`,
      '',
      'Por favor, confirme.'
    ].join('\n');
  }

  return [
    'Hello!',
    'JustDrive Team here.',
    '',
    'We would like to inform you that, according to the new legislation in force in the Autonomous Region of Madeira, from June 1st, 2026, a mandatory regional fee applies to all car rental agreements.',
    '',
    'Therefore, in addition to the final rental price presented for the vehicle, an extra mandatory regional fee of €2 per day per vehicle will be added.',
    '',
    'This fee is applied for a maximum of 10 days per contract, as established by the regional legislation currently in force.',
    '',
    `In your case, as the rental period is ${days} ${days === 1 ? 'day' : 'days'}, the initially quoted amount of ${initialText} will have the additional fee applied, bringing the total amount to ${totalText}.`,
    '',
    "Sadly there's nothing we can do. Please let us know if this is okay for you."
  ].join('\n');
}

function getImtWhatsAppHref({ reservation, countryCode }) {
  const message = encodeURIComponent(buildImtMessage({ reservation, countryCode }));
  const whatsappHref = getWhatsAppHref(reservation.clientPhone);
  if (whatsappHref) return `${whatsappHref}?text=${message}`;
  return `https://wa.me/?text=${message}`;
}

function copyImtPriceToClipboard(reservation) {
  const clipboard = window?.navigator?.clipboard;
  if (!clipboard?.writeText) return;
  void clipboard.writeText(formatClipboardAmount(getPostImtPreDiscountFinalPrice(reservation)));
}

function humanizeKey(key) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function getFieldValue(reservation, key) {
  if (key !== 'carModel') return reservation[key];

  const make = String(reservation.carMake ?? '').trim();
  const model = String(reservation.carModel ?? '').trim();
  if (make && model.toLocaleLowerCase().startsWith(make.toLocaleLowerCase())) return model;
  return [make, model].filter(Boolean).join(' ');
}

function getDetailIcon(key, value) {
  if (key === 'pickupAt') return <CalendarArrowUp aria-hidden="true" />;
  if (key === 'returnAt') return <CalendarArrowDown aria-hidden="true" />;
  if (key === 'durationDays') return <Clock3 aria-hidden="true" />;
  if (key === 'carModel') return <CarFront aria-hidden="true" />;
  if (key === 'licensePlate') return <RectangleHorizontal aria-hidden="true" />;

  if (key === 'pickupStation' || key === 'returnStation') {
    const location = String(formatReservationField(key, value) ?? '').trim().toLocaleLowerCase('pt-PT');
    if (/\b(aeroporto|airport)\b/i.test(location)) return <Plane aria-hidden="true" />;
    if (location === 'office' || location === 'sede') return <Building2 aria-hidden="true" />;
    return <MapPinned aria-hidden="true" />;
  }

  return null;
}

function parseDeliveryComments(value) {
  const sections = {
    extras: [],
    deliveryNote: [],
    customerNote: [],
    serviceNote: []
  };
  let activeSection = 'deliveryNote';

  String(value ?? '').split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;

    const marker = line.match(/^(Extras|Notas Cliente|Notas Serviço):\s*(.*)$/i);
    if (marker) {
      const markerName = marker[1].toLocaleLowerCase('pt-PT');
      activeSection = markerName === 'extras' ? 'extras' : markerName === 'notas cliente' ? 'customerNote' : 'serviceNote';
      if (marker[2]) sections[activeSection].push(marker[2]);
      return;
    }

    sections[activeSection].push(line);
  });

  return sections;
}

function normalizeExtras(value) {
  const values = Array.isArray(value) ? value : String(value ?? '').split(/\r?\n|\|\|\|EXTRA\|\|\|/);
  return values.map((entry) => String(entry ?? '').trim()).filter(Boolean);
}

function buildReservationDetails(reservation) {
  const parsed = parseDeliveryComments(reservation.deliveryComments);
  const extras = [...new Set([...normalizeExtras(reservation.extras), ...parsed.extras])];

  return {
    values: {
      ...reservation,
      deliveryNote: parsed.deliveryNote.join('\n'),
      customerNote: parsed.customerNote.join('\n'),
      serviceNote: parsed.serviceNote.join('\n')
    },
    extras
  };
}

function DetailValue({ fieldKey, value, countryCode, countryName }) {
  const whatsappHref = fieldKey === 'clientPhone' ? getWhatsAppHref(value) : '';
  if (whatsappHref) {
    return (
      <a
        className="reservation-details-whatsapp-link"
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        aria-label={`Abrir conversa no WhatsApp para ${value}`}
      >
        <span>{formatValue(fieldKey, value)}</span>
        <FaWhatsapp aria-hidden="true" />
      </a>
    );
  }

  if (fieldKey === 'customer' && countryCode && hasValue(value)) {
    return (
      <span className="reservation-details-client-name">
        <ReactCountryFlag countryCode={countryCode} svg title={countryName} />
        <span>{formatValue(fieldKey, value)}</span>
      </span>
    );
  }

  const icon = hasValue(value) ? getDetailIcon(fieldKey, value) : null;
  if (icon) {
    return (
      <span className="reservation-details-value-with-icon">
        {icon}
        <span>{formatValue(fieldKey, value)}</span>
      </span>
    );
  }

  return formatValue(fieldKey, value);
}

function DetailGroup({ title, fields, countryCode = '', countryName = '', emptyLabel = '', hideWhenEmpty = false }) {
  const isEmpty = fields.every(({ value }) => !hasValue(value));
  if (hideWhenEmpty && isEmpty) return null;

  return (
    <section className="reservation-details-group">
      <h3>{title}</h3>
      {emptyLabel && isEmpty ? <p className="reservation-details-empty-section">{emptyLabel}</p> : (
        <dl>
          {fields.map(({ key, label, value }) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd>
                <DetailValue fieldKey={key} value={value} countryCode={countryCode} countryName={countryName} />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function ExtrasGroup({ extras }) {
  const contractPatterns = [
    /protecao total/,
    /condutor adicional/,
    /(?:baby seat|cadeira (?:de )?bebe)/,
    /\bgps\b/,
  ];
  const normalizeExtra = (extra) => extra
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const rankedExtras = extras.map((extra, sourceIndex) => ({
    extra,
    sourceIndex,
    contractRank: contractPatterns.findIndex((pattern) => pattern.test(normalizeExtra(extra))),
  }));
  const contractExtras = rankedExtras
    .filter(({ contractRank }) => contractRank >= 0)
    .sort((first, second) => first.contractRank - second.contractRank || first.sourceIndex - second.sourceIndex);
  const otherExtras = rankedExtras.filter(({ contractRank }) => contractRank < 0);

  return (
    <section className="reservation-details-group reservation-details-extras">
      <h3>Extras</h3>
      {extras.length ? (
        <div className="reservation-details-extra-groups">
          {contractExtras.length ? (
            <div className="reservation-details-extra-group">
              <h4>Contrato</h4>
              <ul>{contractExtras.map(({ extra }) => <li key={extra}>{extra}</li>)}</ul>
            </div>
          ) : null}
          {otherExtras.length ? (
            <div className="reservation-details-extra-group">
              <h4>Outros</h4>
              <ul>{otherExtras.map(({ extra }) => <li key={extra}>{extra}</li>)}</ul>
            </div>
          ) : null}
        </div>
      ) : <p className="reservation-details-empty-section">Sem extras</p>}
    </section>
  );
}

export default function ReservationDetailsPopup({ reservation, onClose, canManageAccess = false }) {
  const closeButtonRef = useRef(null);
  const reservationDetails = useMemo(() => buildReservationDetails(reservation), [reservation]);
  const hasImtExtra = reservationDetails.extras.some((extra) => /imt/i.test(extra));
  const groups = useMemo(
    () =>
      FIELD_GROUPS.map((group) => {
        const fieldDefinitions = group.title === 'Comercial' && !hasImtExtra
          ? group.fields.filter(([key]) => key === 'manualValue')
          : group.fields;

        return {
          ...group,
          fields: fieldDefinitions.map(([key, label]) => ({ key, label, value: getFieldValue(reservationDetails.values, key) }))
        };
      }),
    [hasImtExtra, reservationDetails.values]
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
  const status = String(reservation.status ?? '').trim().toLowerCase();
  const imtWhatsAppHref = canManageAccess && !hasImtExtra ? getImtWhatsAppHref({ reservation, countryCode }) : '';
  const imtClipboardPrice = formatClipboardAmount(getPostImtPreDiscountFinalPrice(reservation));

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
          <div className="reservation-details-heading">
            <span className="reservation-details-kicker">Ficha</span>
            <div className="reservation-details-title-row">
              <h2 id="reservation-details-title">Reserva {reservation.reference || reservation.id || ''}</h2>
              {status ? (
                <span className={`reservation-status is-${status}`}>{formatReservationField('status', reservation.status)}</span>
              ) : null}
              {!hasImtExtra ? (
                imtWhatsAppHref ? (
                  <a
                    className="reservation-status reservation-imt-warning reservation-imt-warning-link"
                    href={imtWhatsAppHref}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Enviar mensagem IMT por WhatsApp"
                    data-clipboard-price={imtClipboardPrice}
                    onMouseDown={() => copyImtPriceToClipboard(reservation)}
                    onClick={() => copyImtPriceToClipboard(reservation)}
                    onTouchStart={() => copyImtPriceToClipboard(reservation)}
                  >
                    Não tem taxa IMT
                  </a>
                ) : (
                  <span className="reservation-status reservation-imt-warning">Não tem taxa IMT</span>
                )
              ) : null}
            </div>
          </div>
          <div className="reservation-details-header-actions">
            {legacyReservationUrl ? (
              <a
                className="reservation-details-legacy-link reservation-details-header-link"
                href={legacyReservationUrl}
                target="_blank"
                rel="noreferrer"
              >
                <span>Ver no Reservations</span>
                <ExternalLink aria-hidden="true" />
              </a>
            ) : null}
            <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Fechar detalhes da reserva">
              <X aria-hidden="true" />
            </button>
          </div>
        </header>
        <div className="reservation-details-content">
          {groups.map((group) => group.title === 'Extras' ? (
            <ExtrasGroup key={group.title} extras={reservationDetails.extras} />
          ) : (
            <DetailGroup
              key={group.title}
              {...group}
              countryCode={countryCode}
              countryName={countryName}
              emptyLabel={group.title === 'Notas' ? 'Sem notas' : ''}
            />
          ))}
          <DetailGroup title="Informação adicional" fields={extraFields} hideWhenEmpty />
        </div>
      </article>
    </div>
  );
}
