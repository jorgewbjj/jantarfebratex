import React from "react";
import { trpc } from "@/lib/trpc";
import SeatingManager from "./SeatingManager";
import { SeatingProvider } from "@/contexts/SeatingContext";

export default function Home() {
  const { data: event, isLoading, error } = trpc.event.getDefault.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f5ef] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#c8bfb0] border-t-[#1c1917] rounded-full animate-spin mx-auto mb-6" />
          <p className="font-display text-2xl italic text-[#8a7f72]">Carregando evento...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#f8f5ef] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="font-serif text-2xl font-bold text-[#1c1917] mb-2">Erro ao carregar</p>
          <p className="text-sm text-[#8a7f72]">{error?.message ?? "Evento não encontrado"}</p>
        </div>
      </div>
    );
  }

  return (
    <SeatingProvider>
      <div className="h-screen flex flex-col bg-[#f8f5ef] overflow-hidden">
        {/* Editorial header */}
        <header className="shrink-0 border-b border-[#e0d9d0] bg-[#f8f5ef]">
          <div className="px-6 py-4 flex items-end justify-between gap-4">
            {/* Left: event name + label */}
            <div className="flex items-end gap-6">
              <div>
                <p className="editorial-label text-[#b0a89e] mb-1">Layout Corporativo</p>
                <h1 className="editorial-headline text-4xl md:text-5xl text-[#1c1917] leading-none">
                  {event.name}
                </h1>
              </div>
              <div className="hidden md:block pb-1">
                <div className="rule-line w-16 mb-1" />
                <p className="font-display text-base italic text-[#8a7f72]">
                  Gerenciador de Assentos
                </p>
              </div>
            </div>

            {/* Right: fine details */}
            <div className="text-right hidden sm:block">
              <p className="editorial-label text-[#b0a89e]">70 Mesas</p>
              <p className="font-display text-sm italic text-[#8a7f72]">
                Mesas 10 &amp; 44 — 20 lugares
              </p>
            </div>
          </div>

          {/* Geometric rule */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#c8bfb0] to-transparent" />
        </header>

        {/* Main content */}
        <SeatingManager eventId={event.id} />
      </div>
    </SeatingProvider>
  );
}
