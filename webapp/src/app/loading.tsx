import Image from "next/image";
import { Loader2 } from "lucide-react";

export default function Loading() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#0e0e10] via-[#121213] to-[#0a0a0b] text-gray-300">
			<div className="relative mb-8 flex h-28 w-28 items-center justify-center rounded-full border border-[#1f1f22] bg-[#141416] shadow-[0_0_40px_-15px_rgba(99,164,255,0.8)]">
				<div className="absolute inset-3 rounded-full border border-[#26262a]" />
				<div className="absolute inset-5 rounded-full border border-[#202022]" />
				<Loader2 className="h-10 w-10 animate-spin text-[#63a4ff]" strokeWidth={2.5} />
			</div>
			<div className="flex items-center gap-3 text-sm text-gray-400">
				<Image src="/assets/avacx.png" width={28} height={28} alt="AVACX" className="rounded" priority />
				<span className="tracking-wide text-gray-300">Loading</span>
			</div>
			<p className="mt-3 text-xs text-gray-500">Syncing tools and preferences...</p>
		</div>
	);
}
