import GamGateSlot from "@/components/ads/GamGateSlot";

export default function GamTestPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0F] px-4 py-8 text-white">
      <div className="mx-auto max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">GAM Test</h1>
          <p className="text-sm text-neutral-400">
            Halaman ini khusus untuk test slot Google Ad Manager, terpisah dari
            flow mini app aktif.
          </p>
        </div>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-base font-semibold">player_gate_portrait</h2>
          <GamGateSlot />
        </section>
      </div>
    </main>
  );
}
