"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Sparkles, X as XIcon } from 'lucide-react';
import { Tomorrow } from 'next/font/google';
import Navbar from '../../toolbar';

type PricingTrack = 'general' | 'enterprise';

type GeneralPlanId = 'pro' | 'professional' | 'ultimate';
type EnterprisePlanId = 'enterprise' | 'enterprisePlus';

type PlanId = GeneralPlanId | EnterprisePlanId;

type CompareTier = GeneralPlanId;

interface Feature {
	label: string;
	plans: Partial<Record<CompareTier, boolean | string>>;
}

interface Plan {
	id: PlanId;
	name: string;
	price: string;
	billing: string;
	description: string;
	features: string[];
	cta: string;
	highlighted?: boolean;
}

const GENERAL_PLANS: Plan[] = [
	{
		id: 'pro',
		name: 'Pro',
		price: '$10',
		billing: '/month',
		description: 'Everything you need to start exploring AVACX without commitment.',
		features: ['Team workspaces', 'Essential detectors', 'Security Code Access'],
		cta: 'Get Pro',
	},
	{
		id: 'professional',
		name: 'Professional',
		price: '$40',
		billing: '/month',
		description: 'Deeper analysis, automation, and CI checks wrapped in one.',
		features: ['Priority support', 'Threat Intelligence', 'Automated vulnerability detection'],
		cta: 'Get Professional',
	},
	{
		id: 'ultimate',
		name: 'Ultimate',
		price: '$60',
		billing: '/month',
		description: 'Collaborative tooling, governance, and enterprise-grade insights.',
		features: ['Risk Management', 'Role-based access', 'Dedicated security advisor'],
		cta: 'Get Ultimate',
	},
];

const ENTERPRISE_PLANS: Plan[] = [
	{
		id: 'enterprise',
		name: 'Enterprise',
		price: '$100',
		billing: '/month',
		description: 'Enterprise-grade access with extra governance and support.',
		features: ['Advanced governance', 'SLA-backed support', 'Security insights for larger teams'],
		cta: 'Get Enterprise',
	},
	{
		id: 'enterprisePlus',
		name: 'Enterprise+',
		price: '$150',
		billing: '/month',
		description: 'Maximum coverage for high-scale orgs and regulated workflows.',
		features: ['Premium support', 'Enhanced compliance', 'Priority onboarding'],
		cta: 'Get Enterprise+',
	},
];

const FEATURES: Feature[] = [
	{ label: 'Security Code Access', plans: { pro: true, professional: true, ultimate: true } },
	{ label: 'Local vulnerability scanning', plans: { pro: 'Limited', professional: true, ultimate: true } },
	{ label: 'Cloud dashboards & history', plans: { pro: false, professional: true, ultimate: true } },
	{ label: 'Team collaboration', plans: { pro: false, professional: 'Guests', ultimate: 'Unlimited' } },
	{ label: 'Compliance reporting', plans: { pro: false, professional: 'Basic', ultimate: 'Advanced' } },
];

const TIERS: CompareTier[] = ['pro', 'professional', 'ultimate'];

// const guarantees = ['Cancel anytime', 'No setup fees', 'Greenline support from Lite'];

const tomorrow = Tomorrow({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], display: 'swap' });

const PlanCard: React.FC<{ plan: Plan }> = ({ plan }) => {
	const highlightClass = plan.highlighted
		? 'border border-lime-400 bg-[#0b0f0a] shadow-[0_0_60px_rgba(163,230,53,0.12)]'
		: 'border border-gray-800 bg-[#050505]';
	const metaColor = plan.highlighted ? 'text-white/70' : 'text-gray-400';
	const featureColor = plan.highlighted ? 'text-white/80' : 'text-gray-300';
	const iconColor = 'text-lime-400';
	const buttonColor = plan.highlighted
		? 'border-lime-400 bg-lime-400 text-black hover:bg-lime-300'
		: ' text-white hover:bg-[#0d0d0d]';

	return (
		<div className={`${highlightClass} p-6 flex flex-col h-full`}>
			<div className="flex items-center justify-between">
				<div>
					<p className={`text-sm tracking-wide ${metaColor}`}>{plan.name}</p>
					<div className="flex items-baseline gap-2 mt-3">
						<span className="text-4xl font-bold">{plan.price}</span>
						<span className={`text-[10px] tracking-[0.3em] ${metaColor}`}>{plan.billing}</span>
					</div>
				</div>
				{/* {plan.highlighted && <span className="text-[10px] font-semibold tracking-[0.3em] text-lime-300">POPULAR</span>} */}
			</div>

			<p className={`text-sm mt-4 ${metaColor}`}>{plan.description}</p>

			<ul className="mt-6 space-y-3 text-sm">
				{plan.features.map(feature => (
					<li key={feature} className="flex items-start gap-2">
						<CheckCircle2 className={`w-4 h-4 mt-0.5 ${iconColor}`} />
						<span className={featureColor}>{feature}</span>
					</li>
				))}
			</ul>

			<Link
				href="/auth/avacxAuth"
				className={`mt-8 inline-flex items-center justify-center border px-4 py-2 text-sm font-semibold tracking-wide transition ${buttonColor}`}
			>
				{plan.cta}
			</Link>
		</div>
	);
};

const FeatureRow: React.FC<{ feature: Feature }> = ({ feature }) => (
	<div className="rounded-md border border-[#1f2326] bg-[#050505] p-4">
		<div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:items-center">
			<div className="text-xs font-medium text-white/80 md:col-span-1">{feature.label}</div>
			{TIERS.map(tier => {
				const value = feature.plans[tier];
				const isBoolean = typeof value === 'boolean';
				return (
					<div key={tier} className="flex items-center justify-between rounded-sm bg-[#0d0d0d] px-3 py-1.5 text-xs text-white/65 md:justify-center md:bg-transparent md:px-0 md:py-0">
						<span className="font-semibold uppercase text-white/35 md:hidden">{tier}</span>
						{isBoolean ? (
							value ? <CheckCircle2 className="w-4 h-4 text-lime-400" /> : <XIcon className="w-4 h-4 text-white/30" />
						) : (
							<span>{String(value)}</span>
						)}
					</div>
				);
			})}
		</div>
	</div>
);

// Token purchasing UI removed — tokens are no longer offered in the Billing UI.

const Billing: React.FC = () => {
	const [track, setTrack] = useState<PricingTrack>('general');
	const activePlans = track === 'enterprise' ? ENTERPRISE_PLANS : GENERAL_PLANS;
	const gridColsClass = track === 'enterprise' ? 'md:grid-cols-2' : 'md:grid-cols-3';

	return (
		<div className={`${tomorrow.className} relative min-h-screen bg-black text-white`}>
			<Navbar />
			<main className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pb-20 pt-12">
				<section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
					<div>
						<span className="inline-flex items-center rounded-full border border-[#1f2326] bg-[#141719] px-3 py-1 text-[11px] uppercase tracking-wide text-white/50">Pricing</span>
						<h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">Choose your plan</h1>
						<p className="text-sm text-gray-400 mt-4 max-w-lg">Choose a plan that matches your needs — start small and scale up when you&apos;re ready.</p>
					</div>
					<div className="flex items-center justify-start md:justify-end">
						<div className="inline-flex items-center rounded-full border border-[#1f2326] bg-[#141719] p-1">
							<button
								type="button"
								onClick={() => setTrack('general')}
								className={`rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition cursor-pointer ${track === 'general' ? 'bg-lime-400 text-black' : 'text-white/60 hover:text-white'}`}
								aria-pressed={track === 'general'}
							>
								General
							</button>
							<button
								type="button"
								onClick={() => setTrack('enterprise')}
								className={`rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition cursor-pointer ${track === 'enterprise' ? 'bg-lime-400 text-black' : 'text-white/60 hover:text-white'}`}
								aria-pressed={track === 'enterprise'}
							>
								Enterprise
							</button>
						</div>
					</div>
					{/* <div className="flex flex-wrap gap-3 text-xs text-gray-400">
						{guarantees.map(item => (
							<span key={item} className="flex items-center gap-2">
								<CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />
								{item}
							</span>
						))}
					</div> */}
				</section>
				<section className={`grid grid-cols-1 gap-6 ${gridColsClass}`}>
					{activePlans.map(plan => (
						<PlanCard key={plan.id} plan={plan} />
					))}
				</section>
				<section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between text-sm text-gray-400">
					<div className="flex items-center gap-2 text-gray-200">
						<Sparkles className="w-4 h-4 text-lime-400" />
						Offensive testing without procurement delays.
					</div>
					<div className="rounded-full border border-[#1f2326] bg-[#141719] px-4 py-1 text-[11px] text-white/50">Cancel anytime · No setup fees</div>
				</section>
				{track === 'general' && (
					<section className="space-y-6">
						<header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
							<div>
								<h2 className="text-base font-semibold text-white/85">Detailed comparison</h2>
								<p className="text-xs text-white/55">Know exactly what you get on each plan before you commit.</p>
							</div>
							<div className="rounded-full border border-[#1f2326] bg-[#141719] px-4 py-1 text-[11px] text-white/50">Single GitHub sign-on · Enterprise ready</div>
						</header>
						<div className="hidden rounded-md bg-[#050505] px-6 py-3 text-[11px] uppercase tracking-wide text-white/45 md:grid md:grid-cols-4">
							<span>Feature</span>
							<span className="text-center">Free</span>
							<span className="text-center">Lite</span>
							<span className="text-center">Pro</span>
						</div>
						<div className="space-y-3">
							{FEATURES.map(feature => (
								<FeatureRow key={feature.label} feature={feature} />
							))}
						</div>
					</section>
				)}
			</main>
		</div>
	);
};

export default Billing;

