"use client";

import { CheckCircle2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import LandingNavbar from '../navbar';
import { Tomorrow } from 'next/font/google';
import { useState } from 'react';

type Plan = {
  name: string;
  price: string;
  billing: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
};

const plans: Plan[] = [
  {
    name: 'Pro',
    price: '$10',
    billing: '/month',
    description: 'Everything you need to start exploring AVACX without commitment.',
    features: ['Team workspaces', 'Essential detectors', 'Security Code Access'],
    cta: 'Get Pro'
  },
  {
    name: 'Professional',
    price: '$40',
    billing: '/month',
    description: 'Deeper analysis, automation, and CI checks wrapped in one.',
    features: ['Priority support', 'Threat Intelligence', 'Automated vulnerability detection'],
    cta: 'Get Professional',
    // highlighted: true
  },
  {
    name: 'Ultimate',
    price: '$60',
    billing: '/month',
    description: 'Collaborative tooling, governance, and enterprise-grade insights.',
    features: ['Risk Management', 'Role-based access', 'Dedicated security advisor'],
    cta: 'Get Ultimate'
  }
];

const enterprisePlans: Plan[] = [
  {
    name: 'Enterprise',
    price: '$100',
    billing: '/month',
    description: 'Enterprise-grade access with extra governance and support.',
    features: ['Advanced governance', 'SLA-backed support', 'Security insights for larger teams'],
    cta: 'Get Enterprise'
  },
  {
    name: 'Enterprise+',
    price: '$150',
    billing: '/month',
    description: 'Maximum coverage for high-scale orgs and regulated workflows.',
    features: ['Premium support', 'Enhanced compliance', 'Priority onboarding'],
    cta: 'Get Enterprise+'
  }
];

// const guarantees = [
//   'TEXT',
//   'TEXT',
//   'TEXT'
// ];

const tomorrow = Tomorrow({ subsets: ['latin'], weight: ['400','500','600','700','800'], display: 'swap' });

type PricingTrack = 'general' | 'enterprise';

export default function PricingPage() {
  const [track, setTrack] = useState<PricingTrack>('general');
  const activePlans = track === 'enterprise' ? enterprisePlans : plans;
  const gridColsClass = track === 'enterprise' ? 'md:grid-cols-2' : 'md:grid-cols-3';

  return (
    <div className={`${tomorrow.className} min-h-full w-full bg-black text-white overflow-hidden flex flex-col`}>
      <LandingNavbar />
      <main className="flex-1 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <section id="pricing" className="w-full bg-black px-6 py-20">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
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
                      className={`rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition ${
                        track === 'general' ? 'bg-lime-400 text-black' : 'text-white/60 hover:text-white'
                      }`}
                      aria-pressed={track === 'general'}
                    >
                      General
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrack('enterprise')}
                      className={`rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition ${
                        track === 'enterprise' ? 'bg-lime-400 text-black' : 'text-white/60 hover:text-white'
                      }`}
                      aria-pressed={track === 'enterprise'}
                    >
                      Enterprise
                    </button>
                  </div>
                </div>
                {/* <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                  {guarantees.map((item) => (
                    <span key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />
                      {item}
                    </span>
                  ))}
                </div> */}
              </div>

              <div className={`mt-12 grid grid-cols-1 ${gridColsClass} gap-6`}>
                {activePlans.map((plan) => {
                  const highlightClass = plan.highlighted
                    ? 'border border-lime-400 bg-[#0b0f0a] shadow-[0_0_60px_rgba(163,230,53,0.12)]'
                    : 'border border-gray-800 bg-[#050505]';
                  const metaColor = plan.highlighted ? 'text-white/70' : 'text-gray-400';
                  const featureColor = plan.highlighted ? 'text-white/80' : 'text-gray-300';
                  const iconColor = 'text-lime-400';
                  const buttonColor = plan.highlighted
                    ? 'border-lime-400 bg-lime-400 text-black hover:bg-lime-300'
                    : 'border-[#2a2a2a] text-white hover:bg-[#0d0d0d]';

                  return (
                    <div key={plan.name} className={`${highlightClass} p-6 flex flex-col h-full`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm tracking-wide ${metaColor}`}>{plan.name}</p>
                          <div className="flex items-baseline gap-2 mt-3">
                            <span className="text-4xl font-bold">{plan.price}</span>
                            <span className={`text-[10px] tracking-[0.3em] ${metaColor}`}>{plan.billing}</span>
                          </div>
                        </div>
                        {plan.highlighted && (
                          <span className="text-[10px] font-semibold tracking-[0.3em] text-lime-300">POPULAR</span>
                        )}
                      </div>

                      <p className={`text-sm mt-4 ${metaColor}`}>
                        {plan.description}
                      </p>

                      <ul className="mt-6 space-y-3 text-sm">
                        {plan.features.map((feature) => (
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
                })}
              </div>

              <div className="mt-16 flex flex-col gap-4 md:flex-row md:items-center md:justify-between text-sm text-gray-400">
                <div className="flex items-center gap-2 text-gray-200">
                  <Sparkles className="w-4 h-4 text-lime-400" />
                  Offensive testing without procurement delays.
                </div>
                <div className="rounded-full border border-[#1f2326] bg-[#141719] px-4 py-1 text-[11px] text-white/50">Cancel anytime · No setup fees</div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
