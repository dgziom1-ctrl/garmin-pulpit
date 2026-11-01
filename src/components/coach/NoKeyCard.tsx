import { KeyRound, Sparkles } from 'lucide-react'
import { Card } from '../ui/Card'

export function NoKeyCard({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <Card className="card-pad">
      <div className="flex flex-col items-center px-4 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 text-indigo-300">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-white">Trener AI czeka na klucz</h2>
        <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-400">
          Do generowania planów i rozmowy potrzebny jest darmowy klucz Google AI Studio (Gemini
          2.5 Flash). Klucz jest przechowywany tylko w tej przeglądarce.
        </p>
        <button type="button" onClick={onOpenSettings} className="btn-primary mt-5 text-xs">
          <KeyRound className="h-3.5 w-3.5" />
          Przejdź do ustawień
        </button>
      </div>
    </Card>
  )
}
