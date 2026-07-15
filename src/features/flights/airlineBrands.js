import discoverLogo from '../../assets/airlines/discover-airlines.svg'
import finnairLogo from '../../assets/airlines/finnair.svg'
import britishAirwaysLogo from '../../assets/airlines/british-airways.svg'
import airBalticLogo from '../../assets/airlines/airbaltic.svg'
import tuiLogo from '../../assets/airlines/tui.svg'
import norwegianLogo from '../../assets/airlines/norwegian.svg'
import condorLogo from '../../assets/airlines/condor.svg'
import sunclassLogo from '../../assets/airlines/sunclass-airlines.svg'
import easyJetLogo from '../../assets/airlines/easyjet.svg'
import enterAirLogo from '../../assets/airlines/enter-air.svg'
import eurowingsLogo from '../../assets/airlines/eurowings.svg'
import ryanairLogo from '../../assets/airlines/ryanair.svg'
import transaviaLogo from '../../assets/airlines/transavia.svg'
import iberiaLogo from '../../assets/airlines/iberia.svg'
import luxairLogo from '../../assets/airlines/luxair.svg'
import jet2Logo from '../../assets/airlines/jet2.svg'
import binterLogo from '../../assets/airlines/binter.svg'
import austrianLogo from '../../assets/airlines/austrian-airlines.svg'
import smartwingsLogo from '../../assets/airlines/smartwings.svg'
import azoresLogo from '../../assets/airlines/azores-airlines.svg'
import sasLogo from '../../assets/airlines/sas.svg'
import brusselsLogo from '../../assets/airlines/brussels-airlines.svg'
import tapLogo from '../../assets/airlines/tap-air-portugal.svg'
import unitedLogo from '../../assets/airlines/united-airlines.svg'
import wizzLogo from '../../assets/airlines/wizz-air.svg'
import edelweissLogo from '../../assets/airlines/edelweiss-air.svg'
import marabuLogo from '../../assets/airlines/marabu.svg'

const BRAND_BY_IATA = new Map(Object.entries({
  '4Y': { name: 'Discover Airlines', logoUrl: discoverLogo },
  AY: { name: 'Finnair', logoUrl: finnairLogo },
  BA: { name: 'British Airways', logoUrl: britishAirwaysLogo },
  BT: { name: 'airBaltic', logoUrl: airBalticLogo },
  BY: { name: 'TUI Airways', logoUrl: tuiLogo },
  D8: { name: 'Norwegian', logoUrl: norwegianLogo },
  DE: { name: 'Condor', logoUrl: condorLogo },
  DK: { name: 'Sunclass Airlines', logoUrl: sunclassLogo },
  DS: { name: 'easyJet Switzerland', logoUrl: easyJetLogo },
  DY: { name: 'Norwegian', logoUrl: norwegianLogo },
  E4: { name: 'Enter Air', logoUrl: enterAirLogo },
  EW: { name: 'Eurowings', logoUrl: eurowingsLogo },
  FR: { name: 'Ryanair', logoUrl: ryanairLogo },
  HV: { name: 'Transavia', logoUrl: transaviaLogo },
  IB: { name: 'Iberia', logoUrl: iberiaLogo },
  LG: { name: 'Luxair', logoUrl: luxairLogo },
  LS: { name: 'Jet2', logoUrl: jet2Logo },
  NT: { name: 'Binter Canarias', logoUrl: binterLogo },
  OR: { name: 'TUI fly Netherlands', logoUrl: tuiLogo },
  OS: { name: 'Austrian Airlines', logoUrl: austrianLogo },
  QS: { name: 'Smartwings', logoUrl: smartwingsLogo },
  S4: { name: 'Azores Airlines', logoUrl: azoresLogo },
  SK: { name: 'SAS Scandinavian Airlines', logoUrl: sasLogo },
  SN: { name: 'Brussels Airlines', logoUrl: brusselsLogo },
  TB: { name: 'TUI fly Belgium', logoUrl: tuiLogo },
  TO: { name: 'Transavia France', logoUrl: transaviaLogo },
  TP: { name: 'TAP Air Portugal', logoUrl: tapLogo },
  U2: { name: 'easyJet', logoUrl: easyJetLogo },
  UA: { name: 'United Airlines', logoUrl: unitedLogo },
  W4: { name: 'Wizz Air Malta', logoUrl: wizzLogo },
  W6: { name: 'Wizz Air', logoUrl: wizzLogo },
  WK: { name: 'Edelweiss Air', logoUrl: edelweissLogo },
  X3: { name: 'TUIfly Germany', logoUrl: tuiLogo },
  X4: { name: 'Marabu Airlines', logoUrl: marabuLogo },
}))

export function getAirlineBrand(flightNumber) {
  const match = String(flightNumber ?? '').toUpperCase().replace(/\s+/g, '').match(/^([A-Z0-9]{2})(?=\d)/)
  return match ? (BRAND_BY_IATA.get(match[1]) ?? null) : null
}
