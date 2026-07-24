import { describe, expect, it, vi } from 'vitest';
import { getServiceWhatsAppHref } from '../whatsappConfirmation';
import { getWhatsAppWebFallbackHref, scheduleWhatsAppWebFallback } from '../whatsappLinks';

const baseWhatsAppHref = 'whatsapp://send?phone=351912345678';

function buildHref(overrides = {}) {
  return getServiceWhatsAppHref({
    enabled: true,
    baseWhatsAppHref,
    phoneCountryCode: 'PT',
    item: {
      serviceType: 'pickup',
      location: 'Aeroporto da Madeira',
      time: '13:00',
      ...overrides
    }
  });
}

function readMessage(href) {
  return new URL(href).searchParams.get('text');
}

const cases = [
  {
    name: 'airport delivery in English',
    item: { serviceType: 'pickup', location: 'Airport' },
    country: 'GB',
    message: `Hello, this is the JustDriveMadeira team 😃

We would like to confirm your vehicle pickup tomorrow at 13:00

We'll send you a video with the location of our meeting point 📹
We'll also be tracking your flight online 🖥️

Once you're done picking your luggage please send us a message and head to the shuttle pickup area you can see in the video 📲

If you have any doubts please just let us know 😊

Have a great trip! 🌴✨`
  },
  {
    name: 'airport delivery in Portuguese',
    item: { serviceType: 'pickup', location: 'Aeroporto da Madeira' },
    country: 'PT',
    message: `Olá! Somos a equipa da JustDriveMadeira 😃

Gostaríamos de confirmar a entrega da sua viatura para amanhã às 13:00.

Vamos enviar-lhe um vídeo com a localização do nosso ponto de encontro 📹 e também iremos acompanhar o seu voo online 🖥️.

Assim que recolher a sua bagagem, por favor envie-nos uma mensagem e dirija-se à zona de recolha do shuttle indicada no vídeo 📲.

Se tiver alguma dúvida, estamos à disposição 😊

Desejamos-lhe uma ótima viagem! 🌴✨`
  },
  {
    name: 'office delivery in English',
    item: { serviceType: 'pickup', location: 'Escritório JustDrive' },
    country: 'FR',
    message: `Hello, good morning 😊

This is the JustDrive Madeira team 🚗

We would like to confirm your vehicle pickup tomorrow at 13:00 at our office ⏰

We'll send you the location so you know exactly how to get here📍

https://maps.app.goo.gl/Hg8S3j1LgpmRFfHB8

See you soon! 🌴✨`
  },
  {
    name: 'office delivery in Portuguese',
    item: { serviceType: 'pickup', location: 'Escritório JustDrive' },
    country: 'PT',
    message: `Olá 😊, somos a equipa da JustDrive Madeira 🚗

Gostaríamos de confirmar o levantamento da sua viatura amanhã às 13:00 no nosso escritório ⏰

Vamos enviar-lhe a localização para que saiba exatamente como chegar até cá 📍

https://maps.app.goo.gl/Hg8S3j1LgpmRFfHB8

Até breve! 🌴✨`
  },
  {
    name: 'airport return in English',
    item: { serviceType: 'return', location: 'Airport' },
    country: 'DE',
    message: `Hello, how are you? 😃

This is the JustDrive Madeira team 🚗
We hope you're enjoying your holiday! 🏝️

☀️ Here's the Google Maps link for the drop-off location:

https://maps.app.goo.gl/Hg8S3j1LgpmRFfHB8

Once you arrive, we'll take you to the airport with our shuttle service. ✈️

We'd also like to confirm your vehicle drop-off tomorrow at 13:00. ⏰✅

If you have any questions, just let us know. 😊

See you tomorrow! 👋`
  },
  {
    name: 'airport return in Portuguese',
    item: { serviceType: 'return', location: 'Aeroporto' },
    country: 'PT',
    message: `Olá! Como está? 😃

Daqui é a equipa da JustDrive Madeira 🚗
Esperamos que esteja a desfrutar das suas férias! 🏝️

☀️ Aqui está o link do Google Maps para o local de entrega da viatura:

https://maps.app.goo.gl/Hg8S3j1LgpmRFfHB8

Após a devolução da sua viatura às 13:00, levamo-lo ao aeroporto no nosso serviço de shuttle. ✈️

Se tiver alguma dúvida, é só dizer. 😊

Até amanhã! 👋`
  },
  {
    name: 'office return in English',
    item: { serviceType: 'return', location: 'Escritório' },
    country: 'US',
    message: `Hello, how are you? 😃

This is the JustDrive Madeira team 🚗
We hope you’re enjoying your holiday 🏝️

We'd like to confirm the vehicle dropoff at 13:00 ⏰ at our office

See you tomorrow! 😊

https://maps.app.goo.gl/tU7LU4q7kA53RCiG7`
  },
  {
    name: 'office return in Portuguese',
    item: { serviceType: 'return', location: 'Escritório' },
    country: 'PT',
    message: `Bom dia! 😃

Aqui é a equipa da JustDrive Madeira 🚗
Esperamos que esteja a aproveitar as suas férias 🏝️

Confirmamos que nos encontraremos amanhã para a recolha da viatura às 13:00 ⏰ no nosso escritório.

Até amanhã! 😊

https://maps.app.goo.gl/tU7LU4q7kA53RCiG7`
  }
];

describe('service WhatsApp confirmation links', () => {
  it.each(cases)('selects $name from service, location, and country', ({ item, country, message }) => {
    const href = getServiceWhatsAppHref({
      enabled: true,
      baseWhatsAppHref,
      phoneCountryCode: country,
      item: { ...item, time: '13:00' }
    });

    expect(readMessage(href)).toBe(message);
  });

  it('uses an override time before the original service time', () => {
    expect(readMessage(buildHref({ time: '09:00', overrideTime: '18:45' }))).toContain('18:45');
  });

  it('uses the native WhatsApp app link for emoji messages', () => {
    const url = new URL(buildHref());

    expect(url.protocol).toBe('whatsapp:');
    expect(url.hostname).toBe('send');
    expect(url.searchParams.get('phone')).toBe('351912345678');
    expect(url.searchParams.get('text')).toContain('😃');
    expect(url.searchParams.get('text')).not.toContain('�');
  });

  it('builds an HTTPS fallback with the same phone and message', () => {
    const fallback = new URL(getWhatsAppWebFallbackHref(buildHref()));

    expect(fallback.origin + fallback.pathname).toBe('https://api.whatsapp.com/send');
    expect(fallback.searchParams.get('phone')).toBe('351912345678');
    expect(fallback.searchParams.get('text')).toContain('😃');
  });

  it('uses the web fallback when the native app does not hide the page', () => {
    vi.useFakeTimers();
    const navigate = vi.fn();
    const documentObject = new EventTarget();
    Object.defineProperty(documentObject, 'visibilityState', { value: 'visible', configurable: true });
    const windowObject = new EventTarget();

    scheduleWhatsAppWebFallback({
      fallbackHref: 'https://api.whatsapp.com/send?phone=351912345678',
      navigate,
      documentObject,
      windowObject,
      delayMs: 1200
    });
    vi.advanceTimersByTime(1200);

    expect(navigate).toHaveBeenCalledWith('https://api.whatsapp.com/send?phone=351912345678');
    vi.useRealTimers();
  });

  it('cancels the web fallback when the native app hides the page', () => {
    vi.useFakeTimers();
    const navigate = vi.fn();
    const documentObject = new EventTarget();
    Object.defineProperty(documentObject, 'visibilityState', { value: 'hidden', configurable: true });
    const windowObject = new EventTarget();

    scheduleWhatsAppWebFallback({ fallbackHref: 'https://api.whatsapp.com/send', navigate, documentObject, windowObject, delayMs: 1200 });
    documentObject.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(1200);

    expect(navigate).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('cancels the web fallback when the desktop app blurs the browser window', () => {
    vi.useFakeTimers();
    const navigate = vi.fn();
    const documentObject = new EventTarget();
    Object.defineProperty(documentObject, 'visibilityState', { value: 'visible', configurable: true });
    const windowObject = new EventTarget();

    scheduleWhatsAppWebFallback({ fallbackHref: 'https://api.whatsapp.com/send', navigate, documentObject, windowObject, delayMs: 1200 });
    windowObject.dispatchEvent(new Event('blur'));
    vi.advanceTimersByTime(1200);

    expect(navigate).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('falls back past empty override fields to the original service time', () => {
    expect(readMessage(buildHref({ time: '09:00', displayTime: '', overrideTime: '' }))).toContain('09:00');
  });

  it('uses English for an unknown phone country', () => {
    const href = getServiceWhatsAppHref({
      enabled: true,
      baseWhatsAppHref,
      phoneCountryCode: undefined,
      item: { serviceType: 'pickup', location: 'Airport', time: '13:00' }
    });

    expect(readMessage(href)).toContain('Hello, this is');
  });

  it('keeps the base link while confirmation mode is off', () => {
    expect(getServiceWhatsAppHref({ enabled: false, baseWhatsAppHref, phoneCountryCode: 'PT', item: {} })).toBe(baseWhatsAppHref);
  });

  it('keeps the base link for unsupported locations or missing times', () => {
    expect(buildHref({ location: 'Hotel no Funchal' })).toBe(baseWhatsAppHref);
    expect(buildHref({ time: '', displayTime: '', overrideTime: '' })).toBe(baseWhatsAppHref);
  });
});
