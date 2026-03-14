import Image from 'next/image';
import Link from 'next/link';

export default function LandingNavbar() {
	return (
		<header className="flex items-center justify-between px-8 py-4 border-b border-gray-800">
			<div className="flex items-center space-x-6">
				<Link href="/" className="flex items-center space-x-2">
					<Image
						src="/assets/dist.png"
						alt="AVACX Logo"
						width={20}
						height={20}
						className="rounded-none"
					/>
					<span className="text-xl font-bold tracking-wider">AVACX</span>
				</Link>

				<nav className="hidden md:flex items-center space-x-6 text-sm">
					<Link href="/landing/pricing" className="hover:text-gray-400 transition">PRICING</Link>
					<a href="#" className="hover:text-gray-400 transition">RESOURCES</a>
					<a href="#" className="hover:text-gray-400 transition">CONTRACT</a>
				</nav>
			</div>

			<div>
				<Link href="/auth/avacxAuth" className="bg-white text-black px-4 py-1 hover:bg-gray-200 transition cursor-pointer font-semibold">
					GET STARTED
				</Link>
			</div>
		</header>
	);
}
