import { getServiceLocationKind } from './serviceLocations';

const AIRPORT_MAP_URL = 'https://maps.app.goo.gl/Hg8S3j1LgpmRFfHB8';
const OFFICE_RETURN_MAP_URL = 'https://maps.app.goo.gl/tU7LU4q7kA53RCiG7';

const templates = {
  pickup: {
    airport: {
      en: (time) => `Hello, this is the JustDriveMadeira team 😃

We would like to confirm your vehicle pickup tomorrow at ${time}

We'll send you a video with the location of our meeting point 📹
We'll also be tracking your flight online 🖥️

Once you're done picking your luggage please send us a message and head to the shuttle pickup area you can see in the video 📲

If you have any doubts please just let us know 😊

Have a great trip! 🌴✨`,
      pt: (time) => `Olá! Somos a equipa da JustDriveMadeira 😃

Gostaríamos de confirmar a entrega da sua viatura para amanhã às ${time}.

Vamos enviar-lhe um vídeo com a localização do nosso ponto de encontro 📹 e também iremos acompanhar o seu voo online 🖥️.

Assim que recolher a sua bagagem, por favor envie-nos uma mensagem e dirija-se à zona de recolha do shuttle indicada no vídeo 📲.

Se tiver alguma dúvida, estamos à disposição 😊

Desejamos-lhe uma ótima viagem! 🌴✨`
    },
    office: {
      en: (time) => `Hello, good morning 😊

This is the JustDrive Madeira team 🚗

We would like to confirm your vehicle pickup tomorrow at ${time} at our office ⏰

We'll send you the location so you know exactly how to get here📍

${AIRPORT_MAP_URL}

See you soon! 🌴✨`,
      pt: (time) => `Olá 😊, somos a equipa da JustDrive Madeira 🚗

Gostaríamos de confirmar o levantamento da sua viatura amanhã às ${time} no nosso escritório ⏰

Vamos enviar-lhe a localização para que saiba exatamente como chegar até cá 📍

${AIRPORT_MAP_URL}

Até breve! 🌴✨`
    }
  },
  return: {
    airport: {
      en: (time) => `Hello, how are you? 😃

This is the JustDrive Madeira team 🚗
We hope you're enjoying your holiday! 🏝️

☀️ Here's the Google Maps link for the drop-off location:

${AIRPORT_MAP_URL}

Once you arrive, we'll take you to the airport with our shuttle service. ✈️

We'd also like to confirm your vehicle drop-off tomorrow at ${time}. ⏰✅

If you have any questions, just let us know. 😊

See you tomorrow! 👋`,
      pt: (time) => `Olá! Como está? 😃

Daqui é a equipa da JustDrive Madeira 🚗
Esperamos que esteja a desfrutar das suas férias! 🏝️

☀️ Aqui está o link do Google Maps para o local de entrega da viatura:

${AIRPORT_MAP_URL}

Após a devolução da sua viatura às ${time}, levamo-lo ao aeroporto no nosso serviço de shuttle. ✈️

Se tiver alguma dúvida, é só dizer. 😊

Até amanhã! 👋`
    },
    office: {
      en: (time) => `Hello, how are you? 😃

This is the JustDrive Madeira team 🚗
We hope you’re enjoying your holiday 🏝️

We'd like to confirm the vehicle dropoff at ${time} ⏰ at our office

See you tomorrow! 😊

${OFFICE_RETURN_MAP_URL}`,
      pt: (time) => `Bom dia! 😃

Aqui é a equipa da JustDrive Madeira 🚗
Esperamos que esteja a aproveitar as suas férias 🏝️

Confirmamos que nos encontraremos amanhã para a recolha da viatura às ${time} ⏰ no nosso escritório.

Até amanhã! 😊

${OFFICE_RETURN_MAP_URL}`
    }
  }
};

function getEffectiveTime(item) {
  return [item?.overrideTime, item?.displayTime, item?.time]
    .map((value) => String(value ?? '').trim())
    .find(Boolean) ?? '';
}

function getWhatsAppPhoneDigits(baseWhatsAppHref) {
  try {
    return new URL(baseWhatsAppHref).pathname.replace(/\D/g, '');
  } catch {
    return '';
  }
}

export function getServiceWhatsAppHref({ enabled, baseWhatsAppHref, phoneCountryCode, item }) {
  if (!enabled || !baseWhatsAppHref) return baseWhatsAppHref;

  const serviceType = item?.serviceType === 'return' ? 'return' : item?.serviceType === 'pickup' ? 'pickup' : '';
  const locationKind = getServiceLocationKind(item?.location);
  const time = getEffectiveTime(item);
  const language = phoneCountryCode === 'PT' ? 'pt' : 'en';
  const template = templates[serviceType]?.[locationKind]?.[language];

  if (!template || !time) return baseWhatsAppHref;
  const phoneDigits = getWhatsAppPhoneDigits(baseWhatsAppHref);
  if (!phoneDigits) return baseWhatsAppHref;

  return `https://api.whatsapp.com/send?phone=${phoneDigits}&text=${encodeURIComponent(template(time))}`;
}
