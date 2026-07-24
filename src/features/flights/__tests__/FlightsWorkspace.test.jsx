import { readFileSync } from 'node:fs';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchFlightArrivals } = vi.hoisted(() => ({ fetchFlightArrivals: vi.fn() }));
vi.mock('../flightsApi', () => ({ fetchFlightArrivals }));

import FlightsWorkspace from '../FlightsWorkspace';

const appCss = readFileSync('src/App.css', 'utf8');

const services = [
  { serviceType: 'pickup', flightNumber: ' TP 1685 ' },
  { serviceType: 'pickup', flightNumber: 'tp1685' },
  { serviceType: 'return', flightNumber: ' FR 123 ' },
  { serviceType: 'pickup', flightNumber: '\tU2 7654\n' }
];

const response = {
  results: [
    {
      flightNumber: 'TP1685',
      status: 'arrived',
      scheduledArrivalLocal: '2026-07-10T14:20:00',
      estimatedArrivalLocal: '2026-07-10T14:35:00',
      actualArrivalLocal: '2026-07-10T14:31:00',
      sourceUrl: 'https://www.flightview.com/flight-tracker/TP/1685'
    },
    {
      flightNumber: 'U27654',
      status: 'delayed',
      scheduledArrivalLocal: null,
      estimatedArrivalLocal: '',
      actualArrivalLocal: undefined,
      sourceUrl: ''
    }
  ]
};

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('FlightsWorkspace', () => {
  it('uses a pointer cursor for flight numbers linked to FlightRadar24', () => {
    expect(appCss).toMatch(/\.flight-number-link\s*{[^}]*cursor:\s*pointer;/);
  });

  it('uses a pointer cursor for reservation showcase buttons', () => {
    expect(appCss).toMatch(/\.flight-client-reservation\s*{[^}]*cursor:\s*pointer;/);
  });

  it('aligns future reservation time to the inherited flight-time column', () => {
    expect(appCss).toMatch(/\.flight-clients--time-aligned\s*{[^}]*grid-template-columns:\s*subgrid;/);
    expect(appCss).toMatch(/\.flight-client--time-aligned\s*{[^}]*grid-template-columns:\s*subgrid;/);
    expect(appCss).toMatch(/\.flight-client-time\s*{[^}]*grid-column:\s*2;/);
    expect(appCss).toMatch(/\.flight-client-rest\s*{[^}]*grid-column:\s*3\s*\/\s*5;/);
    expect(appCss).toMatch(/\.flight-client--time-aligned \.flight-client-identity\s*{[^}]*padding-left:\s*0\.55rem;/);
    expect(appCss).toMatch(/@media\s*\(max-width:\s*700px\)[\s\S]*\.flight-client--time-aligned\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+max-content;/);
    expect(appCss).toMatch(/@media\s*\(max-width:\s*700px\)[\s\S]*\.flight-client--time-aligned \.flight-client-identity\s*{[^}]*padding-left:\s*0;/);
  });

  beforeEach(() => fetchFlightArrivals.mockReset());
  afterEach(cleanup);

  it('shows a Portuguese empty state without calling the API when pickups have no flights', () => {
    render(<FlightsWorkspace selectedDate="2026-07-10" allServiceItems={[{ serviceType: 'return', flightNumber: 'TP1685' }]} />);

    expect(screen.getByRole('heading', { name: 'Chegadas' })).toBeInTheDocument();
    expect(screen.getByText('Não há voos de recolha para este dia.')).toBeInTheDocument();
    expect(fetchFlightArrivals).not.toHaveBeenCalled();
  });

  it('automatically loads normalized, deduplicated pickup flights for the selected date', async () => {
    fetchFlightArrivals.mockResolvedValue(response);
    render(<FlightsWorkspace selectedDate="2026-07-10" allServiceItems={services} />);

    await waitFor(() =>
      expect(fetchFlightArrivals).toHaveBeenCalledWith({
        arrivalDate: '2026-07-10',
        flightNumbers: ['TP1685', 'U27654']
      })
    );
  });

  it('renders future flights by effective arrival time, earliest first', async () => {
    fetchFlightArrivals.mockResolvedValue({ results: [...response.results].reverse() });
    render(<FlightsWorkspace selectedDate="2026-07-10" allServiceItems={services} />);

    expect((await screen.findAllByRole('article')).map((flight) => flight.getAttribute('aria-label'))).toEqual([
      'Voo TP1685',
      'Voo U27654',
    ]);
  });

  it('links each flight number to its Flightradar24 page', async () => {
    fetchFlightArrivals.mockResolvedValue(response);
    render(<FlightsWorkspace selectedDate="2026-07-10" allServiceItems={services} />);

    const flight = await screen.findByRole('article', { name: 'Voo TP1685' });
    const link = within(flight).getByRole('link', { name: 'Abrir voo TP1685 no Flightradar24 numa nova aba' });
    expect(link).toHaveAttribute('href', 'https://www.flightradar24.com/TP1685');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    const airlineLogo = within(flight).getByRole('img', { name: 'TAP Air Portugal' });
    expect(airlineLogo).toHaveAttribute(
      'src',
      expect.stringMatching(/(?:\.svg$|^data:image\/svg\+xml)/),
    );
    expect(flight.querySelector('.flight-route-mark .lucide-plane-landing')).toBeInTheDocument();
    expect(link.closest('.flight-number-line')).toContainElement(airlineLogo);
  });

  it('shows the normalized flight total and returns to the service list from the header', async () => {
    const user = userEvent.setup();
    const onWorkspaceChange = vi.fn();
    fetchFlightArrivals.mockResolvedValue(response);
    render(<FlightsWorkspace selectedDate="2026-07-10" allServiceItems={services} onWorkspaceChange={onWorkspaceChange} />);

    expect(screen.getByText('2 voos')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voltar à lista de serviços' }));
    expect(onWorkspaceChange).toHaveBeenCalledWith('services');
  });

  it('uses the singular flight count', async () => {
    fetchFlightArrivals.mockResolvedValue({ results: [response.results[0]] });
    render(<FlightsWorkspace selectedDate="2026-07-10" allServiceItems={services.slice(0, 1)} />);

    expect(screen.getByText('1 voo')).toBeInTheDocument();
    await screen.findByRole('article', { name: 'Voo TP1685' });
  });

  it('does not show the prior day flight count while the newly selected day is loading', async () => {
    fetchFlightArrivals.mockResolvedValue(response);
    const { rerender } = render(<FlightsWorkspace selectedDate="2026-07-10" allServiceItems={services} serviceDataReady />);
    expect(screen.getByText('2 voos')).toBeInTheDocument();

    rerender(<FlightsWorkspace selectedDate="2026-07-11" allServiceItems={services} serviceDataLoading serviceDataReady={false} />);

    expect(screen.queryByText('2 voos')).not.toBeInTheDocument();
    expect(screen.getByText('— voos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voltar à lista de serviços' })).toBeInTheDocument();
  });

  it('waits for current service-day data before showing empty state or requesting flights', () => {
    render(<FlightsWorkspace selectedDate="2026-07-11" allServiceItems={[]} serviceDataLoading serviceDataReady={false} />);

    expect(screen.getByRole('status', { name: 'A preparar voos' })).toBeInTheDocument();
    expect(screen.getByTestId('flights-loading-skeleton')).toBeInTheDocument();
    expect(screen.queryByText('Não há voos de recolha para este dia.')).not.toBeInTheDocument();
    expect(fetchFlightArrivals).not.toHaveBeenCalled();
  });

  it('shows the arrivals-board skeleton while live flight results load', async () => {
    const loading = deferred();
    fetchFlightArrivals.mockReturnValue(loading.promise);
    render(<FlightsWorkspace selectedDate="2026-07-10" allServiceItems={services} />);

    expect(screen.getByRole('status', { name: 'A carregar voos' })).toBeInTheDocument();
    expect(screen.getByTestId('flights-loading-skeleton')).toBeInTheDocument();
    expect(screen.getAllByTestId('flight-skeleton-row')).toHaveLength(4);

    loading.resolve(response);
    await screen.findByRole('article', { name: 'Voo TP1685' });
  });

  it('shows an unavailable state with service-data retry after loading ends without a day response', async () => {
    const user = userEvent.setup();
    const onRetryServiceData = vi.fn().mockRejectedValue(new Error('handled by service data state'));
    render(
      <FlightsWorkspace
        selectedDate="2026-07-11"
        allServiceItems={[]}
        serviceDataLoading={false}
        serviceDataReady={false}
        onRetryServiceData={onRetryServiceData}
      />
    );

    expect(screen.queryByText('A preparar dados do dia…')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível obter os serviços deste dia');
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetryServiceData).toHaveBeenCalledTimes(1);
    expect(fetchFlightArrivals).not.toHaveBeenCalled();
  });

  it('invalidates the old date request and waits for ready data before loading the new date flights', async () => {
    const older = deferred();
    fetchFlightArrivals.mockReturnValueOnce(older.promise).mockResolvedValueOnce({
      results: [{ ...response.results[0], flightNumber: 'NEW200' }]
    });
    const { rerender } = render(<FlightsWorkspace selectedDate="2026-07-10" allServiceItems={services.slice(0, 1)} serviceDataReady />);

    rerender(<FlightsWorkspace selectedDate="2026-07-11" allServiceItems={services.slice(0, 1)} serviceDataLoading serviceDataReady={false} />);
    expect(fetchFlightArrivals).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status', { name: 'A preparar voos' })).toBeInTheDocument();
    older.resolve(response);
    await older.promise;
    expect(screen.queryByText('TP1685')).not.toBeInTheDocument();

    rerender(<FlightsWorkspace selectedDate="2026-07-11" allServiceItems={[{ serviceType: 'pickup', flightNumber: ' NEW 200 ' }]} serviceDataReady />);
    expect(await screen.findByRole('article', { name: 'Voo NEW200' })).toBeInTheDocument();
    expect(fetchFlightArrivals).toHaveBeenLastCalledWith({ arrivalDate: '2026-07-11', flightNumbers: ['NEW200'] });
    expect(fetchFlightArrivals).toHaveBeenCalledTimes(2);
  });

  it('announces loading accessibly', async () => {
    const pending = deferred();
    fetchFlightArrivals.mockReturnValue(pending.promise);
    render(<FlightsWorkspace selectedDate="2026-07-10" allServiceItems={services} />);

    expect(screen.getByRole('status')).toHaveTextContent('A carregar voos');
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
    pending.resolve(response);
    await screen.findByRole('article', { name: 'Voo TP1685' });
  });

  it('renders future flights with only their scheduled time and a fixed scheduled status', async () => {
    fetchFlightArrivals.mockResolvedValue(response);
    render(<FlightsWorkspace selectedDate="2026-07-10" allServiceItems={services} />);

    const firstRow = await screen.findByRole('article', { name: 'Voo TP1685' });
    expect(firstRow).toHaveTextContent('TP1685');
    expect(firstRow).toHaveTextContent('Programado14:20');
    expect(firstRow).toHaveTextContent('EstadoProgramado');
    expect(firstRow).not.toHaveTextContent('Chegou');
    expect(firstRow).not.toHaveTextContent('Estimado');
    expect(firstRow).not.toHaveTextContent('Real');
    const source = within(firstRow).getByRole('link', { name: 'Ver TP1685 no FlightView' });
    expect(source).toHaveAttribute('target', '_blank');
    expect(source.getAttribute('rel')).toMatch(/noreferrer/);
    expect(source.getAttribute('rel')).toMatch(/noopener/);

    const secondRow = screen.getByRole('article', { name: 'Voo U27654' });
    expect(secondRow).toHaveTextContent('EstadoProgramado');
    expect(secondRow).not.toHaveTextContent('Atrasado');
    expect(secondRow.querySelector('.flight-times')).toHaveTextContent('Programado--:--');
  });

  it('stacks every pickup client beneath the matching normalized flight', async () => {
    fetchFlightArrivals.mockResolvedValue({ results: [response.results[0]] });
    render(
      <FlightsWorkspace
        selectedDate="2026-07-10"
        allServiceItems={[
          {
            serviceType: 'pickup',
            flightNumber: ' TP 1685 ',
            name: 'Maria Silva',
            time: '09:15',
            car: 'Fiat Panda',
            plate: 'AA-00-AA',
            phone: '+351 912 345 678',
            id: '1001',
            reservationUrl: 'https://reservations.example.com/1001'
          },
          {
            serviceType: 'pickup',
            flightNumber: 'tp1685',
            name: 'John Smith',
            time: '10:30',
            car: 'Renault Clio',
            plate: 'BB-11-BB',
            phone: '+44 7700 900123',
            id: '1002',
            reservationUrl: 'https://reservations.example.com/1002'
          }
        ]}
      />
    );

    const flight = await screen.findByRole('article', { name: 'Voo TP1685' });
    expect(within(flight).getByLabelText('Clientes do voo TP1685')).toHaveClass('flight-clients--time-aligned');
    const clients = within(flight).getAllByTestId('flight-client');
    expect(clients).toHaveLength(2);
    expect(clients[0]).toHaveClass('flight-client--time-aligned');
    expect(within(clients[0]).getByText('Hora').closest('.flight-client-detail')).toHaveClass('flight-client-time');
    expect(clients[0]).toHaveTextContent('Maria Silva');
    expect(clients[0]).toHaveTextContent('Hora09:15');
    expect(clients[0]).toHaveTextContent('Fiat Panda');
    expect(clients[0]).toHaveTextContent('AA-00-AA');
    expect(clients[1]).toHaveTextContent('John Smith');
    expect(clients[1]).toHaveTextContent('Hora10:30');
    expect(clients[1]).toHaveTextContent('Renault Clio');
    expect(clients[1]).toHaveTextContent('BB-11-BB');
  });

  it('links client phones to WhatsApp and opens reservations in the showcase', async () => {
    const user = userEvent.setup();
    const onOpenReservation = vi.fn();
    fetchFlightArrivals.mockResolvedValue({ results: [response.results[0]] });
    render(
      <FlightsWorkspace
        selectedDate="2026-07-10"
        onOpenReservation={onOpenReservation}
        allServiceItems={[
          {
            serviceType: 'pickup',
            flightNumber: 'TP1685',
            name: 'John Smith',
            car: 'Renault Clio',
            plate: 'BB-11-BB',
            phone: '+44 7700 900123',
            id: '1002',
            reservationUrl: 'https://reservations.example.com/1002'
          }
        ]}
      />
    );

    const flight = await screen.findByRole('article', { name: 'Voo TP1685' });
    expect(within(flight).getByTitle('GB')).toBeInTheDocument();
    const whatsappLink = within(flight).getByRole('link', { name: 'WhatsApp +44 7700 900123' });
    expect(whatsappLink).toHaveAttribute('href', 'whatsapp://send?phone=447700900123');
    expect(whatsappLink).not.toHaveAttribute('target');
    const reservation = within(flight).getByRole('button', { name: 'Reservations 1002' });
    await user.click(reservation);
    expect(onOpenReservation).toHaveBeenCalledWith('1002');
    expect(onOpenReservation).toHaveBeenCalledTimes(1);
  });

  it('shows missing client details without using an unsafe backend URL', async () => {
    fetchFlightArrivals.mockResolvedValue({ results: [response.results[0]] });
    render(
      <FlightsWorkspace
        selectedDate="2026-07-10"
        allServiceItems={[
          {
            serviceType: 'pickup',
            flightNumber: 'TP1685',
            name: '',
            car: '',
            plate: '',
            phone: 'invalid',
            id: '1003',
            reservationUrl: 'javascript:alert(1)'
          }
        ]}
      />
    );

    const client = within(await screen.findByRole('article', { name: 'Voo TP1685' })).getByTestId('flight-client');
    expect(client.textContent.match(/—/g)?.length).toBeGreaterThanOrEqual(4);
    expect(within(client).getByRole('button', { name: 'Reservations 1003' })).toBeInTheDocument();
    expect(within(client).queryByRole('link', { name: 'Reservations 1003' })).not.toBeInTheDocument();
    expect(within(client).queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument();
  });

  it('does not render non-http source URLs as links', async () => {
    fetchFlightArrivals.mockResolvedValue({
      results: [{ ...response.results[0], sourceUrl: 'javascript:alert(1)' }]
    });
    render(<FlightsWorkspace selectedDate="2026-07-10" allServiceItems={services.slice(0, 1)} />);

    expect(await screen.findByRole('article', { name: 'Voo TP1685' })).toHaveTextContent('TP1685');
    expect(screen.queryByRole('link', { name: 'Ver TP1685 no FlightView' })).not.toBeInTheDocument();
  });

  it.each(['https://example.com/flight/TP1685', 'http://www.flightview.com/flight-tracker/TP/1685'])(
    'does not link an untrusted FlightView source URL: %s',
    async (sourceUrl) => {
      fetchFlightArrivals.mockResolvedValue({ results: [{ ...response.results[0], sourceUrl }] });
      render(<FlightsWorkspace selectedDate="2026-07-10" allServiceItems={services.slice(0, 1)} />);

      await screen.findByRole('article', { name: 'Voo TP1685' });
      expect(screen.queryByRole('link', { name: 'Ver TP1685 no FlightView' })).not.toBeInTheDocument();
    }
  );

  it('keeps successful flights visible beside localized per-flight failures', async () => {
    fetchFlightArrivals.mockResolvedValue({
      results: [response.results[0], { flightNumber: 'U27654', error: { code: 'not_found', message: 'raw detail' } }]
    });
    render(<FlightsWorkspace selectedDate="2026-07-10" allServiceItems={services} />);

    expect(await screen.findByRole('article', { name: 'Voo TP1685' })).toHaveTextContent('EstadoProgramado');
    expect(screen.getByRole('article', { name: 'Voo U27654' })).toHaveTextContent('Voo não encontrado');
    expect(screen.queryByText('raw detail')).not.toBeInTheDocument();
  });

  it('shows a useful whole-request error and retries the current inputs', async () => {
    const user = userEvent.setup();
    fetchFlightArrivals.mockRejectedValueOnce(new Error('backend internals')).mockResolvedValueOnce(response);
    render(<FlightsWorkspace selectedDate="2026-07-10" allServiceItems={services} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as chegadas');
    expect(screen.queryByText('backend internals')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await screen.findByRole('article', { name: 'Voo TP1685' });
    expect(fetchFlightArrivals).toHaveBeenCalledTimes(2);
  });

  it('ignores an older result after the date changes', async () => {
    const older = deferred();
    const newer = deferred();
    fetchFlightArrivals.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
    const { rerender } = render(<FlightsWorkspace selectedDate="2026-07-10" allServiceItems={services} />);
    rerender(<FlightsWorkspace selectedDate="2026-07-11" allServiceItems={services} />);
    newer.resolve({ results: [{ ...response.results[0], flightNumber: 'NEW200' }] });
    expect(await screen.findByRole('article', { name: 'Voo NEW200' })).toBeInTheDocument();
    older.resolve({ results: [{ ...response.results[0], flightNumber: 'OLD100' }] });
    await waitFor(() => expect(screen.queryByText('OLD100')).not.toBeInTheDocument());
  });

  it('ignores an older result after the normalized pickup flight list changes', async () => {
    const older = deferred();
    const newer = deferred();
    fetchFlightArrivals.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
    const { rerender } = render(<FlightsWorkspace selectedDate="2026-07-10" allServiceItems={services.slice(0, 1)} />);
    rerender(<FlightsWorkspace selectedDate="2026-07-10" allServiceItems={[{ serviceType: 'pickup', flightNumber: 'NEW 200' }]} />);
    newer.resolve({ results: [{ ...response.results[0], flightNumber: 'NEW200' }] });
    expect(await screen.findByText('NEW200')).toBeInTheDocument();
    older.resolve({ results: [{ ...response.results[0], flightNumber: 'OLD100' }] });
    await waitFor(() => expect(screen.queryByText('OLD100')).not.toBeInTheDocument());
  });

  it('starts a fresh loading request when returning from an empty list to identical inputs', async () => {
    fetchFlightArrivals.mockResolvedValueOnce(response);
    const secondRequest = deferred();
    fetchFlightArrivals.mockReturnValueOnce(secondRequest.promise);
    const { rerender } = render(<FlightsWorkspace selectedDate="2026-07-10" allServiceItems={services} />);
    expect(await screen.findByRole('article', { name: 'Voo TP1685' })).toBeInTheDocument();

    rerender(<FlightsWorkspace selectedDate="2026-07-10" allServiceItems={[]} />);
    expect(screen.getByText('Não há voos de recolha para este dia.')).toBeInTheDocument();
    rerender(<FlightsWorkspace selectedDate="2026-07-10" allServiceItems={services} />);

    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('A carregar voos');
    expect(screen.queryByRole('article', { name: 'Voo TP1685' })).not.toBeInTheDocument();
    expect(fetchFlightArrivals).toHaveBeenCalledTimes(2);
    secondRequest.resolve(response);
    expect(await screen.findByRole('article', { name: 'Voo TP1685' })).toBeInTheDocument();
  });

  it('does not apply a response after unmount', async () => {
    const pending = deferred();
    fetchFlightArrivals.mockReturnValue(pending.promise);
    const { unmount } = render(<FlightsWorkspace selectedDate="2026-07-10" allServiceItems={services} />);
    unmount();
    pending.resolve(response);
    await pending.promise;
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
  });
});
