import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-6 animate-entry delay-100">
      <div className="relative flex items-center justify-center">
        {/* Glow behind */}
        <div className="absolute h-24 w-24 rounded-full bg-orange-500/10 blur-xl"></div>
        {/* Ping animation ring */}
        <div className="absolute h-16 w-16 animate-ping rounded-full bg-orange-500/20"></div>
        {/* Main spinner container */}
        <div className="relative flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#0A0A0A] border border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.3)]">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <h3 className="font-bricolage text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white via-orange-200 to-orange-400 tracking-tight">
          Carregando
        </h3>
        <p className="text-sm text-neutral-400 font-sans">
          Sincronizando seus dados financeiros...
        </p>
      </div>
    </div>
  )
}
