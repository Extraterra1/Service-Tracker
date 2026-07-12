import { Plane } from 'lucide-react'

export default function FlightsComingSoonWorkspace() {
  return (
    <main className="flights-coming-soon" aria-labelledby="flights-coming-soon-title">
      <div className="flights-coming-soon-mark" aria-hidden="true">
        <Plane />
      </div>
      <div>
        <p className="flights-coming-soon-label">Proximamente</p>
        <h1 id="flights-coming-soon-title">Voos</h1>
        <p>A informação de voos estará disponível aqui numa próxima atualização.</p>
      </div>
    </main>
  )
}
