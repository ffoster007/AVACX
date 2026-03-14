import { Boxes, Search, Github } from 'lucide-react';
import LandingNavbar from './landing/navbar';
import { Tomorrow } from 'next/font/google';

const tomorrow = Tomorrow({
  subsets: ['latin'],
  weight: ['400','500','600','700','800'],
  display: 'swap'
});

export default function CyberSecurityLanding() {
  return (
    <div
      className={`${tomorrow.className} relative min-h-screen w-full bg-black text-white overflow-hidden`}
      style={{
        backgroundImage: "url('/assets/GREEN_EARTH.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Layered overlays keep text readable on top of the vivid background */}
      <div className="absolute inset-0 bg-black/70" aria-hidden="true" />
      {/* transparent or emerald-900/40  */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/40 via-black/60 to-black/90" aria-hidden="true" />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <LandingNavbar />

        {/* Main Content */}
        <main className="flex-1 flex flex-col justify-center px-8 relative">
          {/* Hero Section */}
          <div className="max-w-6xl mx-auto w-full grid grid-cols-2 gap-12 items-center">
            {/* Left Side - Hero Text */}
            <div>
              <h1 className="text-4xl font-bold leading-tight mb-4">
                NO NEED FOR EXPERTISE<br />
                BUT IT CAN BE DONE
              </h1>
              <p className="text-gray-400 mb-6 text-sm">
                SECURE WHAT MATTERS. NOTHING MORE.
              </p>
              <div className="flex space-x-4">
                <button className="bg-white text-black px-6 py-2 text-sm font-semibold hover:bg-gray-200 transition cursor-pointer">
                  DOWNLOAD
                </button>
                <button className="border border-white px-6 py-2 text-sm font-semibold hover:bg-white hover:text-black transition cursor-pointer">
                  WATCHING VIDEO
                </button>
              </div>
            </div>

            {/* Right Side - Services Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-3 border border-gray-800 p-4 hover:border-white transition cursor-pointer">
                <Boxes className="w-8 h-8 mb-3" />
                <h3 className="font-bold mb-1 text-sm">OFFENSIVE SECURITY TESTING</h3>
                <p className="text-xs text-gray-400">
                  Security testing to uncover vulnerabilities like  BAC, and CSPM risks.
                </p>
              </div>
              <div className="col-span-3 border border-gray-800 p-4 hover:border-white transition cursor-pointer">
                <Search className="w-8 h-8 mb-3" />
                <h3 className="font-bold mb-1 text-xs">VULNERABILITY DETECTION</h3>
                <p className="text-xs text-gray-400">
                  Assessing vulnerabilities in your packages and code.
                </p>
              </div>
              {/* <div className="border border-gray-800 p-4 hover:border-white transition cursor-pointer">
                <AlertTriangle className="w-8 h-8 mb-3" />
                <h3 className="font-bold mb-1 text-xs">FORENSICS</h3>
                <p className="text-xs text-gray-400">
                  In-depth investigations.
                </p>
              </div>
              <div className="border border-gray-800 p-4 hover:border-white transition col-span-1 cursor-pointer">
                <div className="text-2xl font-bold">99.9%</div>
                <p className="text-xs text-gray-400 mt-1">Protection Rate</p>
              </div> */}
            </div>
          </div>

          {/* Bottom Section - Mission & Vision */}
          <div className="max-w-6xl mx-auto w-full mt-12 grid grid-cols-2 gap-8">
            <div className="border-t border-gray-800 pt-4">
              <h2 className="text-xl font-bold mb-3">OUR GOAL</h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                OFFENSIVE SECURITY BY EMPOWERING EVERYONE TO TEST THEIR OWN SYSTEMS 
                WITHOUT REQUIRING DEEP TECHNICAL EXPERTISE OR CYBERSECURITY KNOWLEDGE.
              </p>
            </div>
            <div className="border-t border-gray-800 pt-4">
              <h2 className="text-xl font-bold mb-3">VISION</h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                SECURITY TESTING IS ACCESSIBLE TO ALL DEVELOPER, ENABLING BUSINESSES OF ANY SIZE 
                TO PROACTIVELY DISCOVER AND FIX VULNERABILITIES BEFORE ATTACKERS EXPLOIT THEM.
              </p>
            </div>
          </div>
        </main>

        {/* pricing moved to a dedicated page at /landing/pricing */}

        { <footer className="px-8 py-4 border-t border-gray-800">
            <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500">
              <div className="flex gap-4">
                <span className="hover:text-white transition cursor-pointer">TRUST</span>
                <span className="hover:text-white transition cursor-pointer">INTEGRITY</span>
                <span className="hover:text-white transition cursor-pointer">INNOVATION</span>
                <span className="hover:text-white transition cursor-pointer">SECURITY</span>
              </div>


                {/* Social Icons */}
              <div className="flex items-center gap-4">
                <a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="text-gray-400 hover:text-white transition">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden>
                    <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.9 3.5 12 3.5 12 3.5s-7.9 0-9.4.6A3 3 0 00.5 6.2 31.7 31.7 0 000 12a31.7 31.7 0 00.5 5.8 3 3 0 002.1 2.1C4.1 20.5 12 20.5 12 20.5s7.9 0 9.4-.6a3 3 0 002.1-2.1A31.7 31.7 0 0024 12a31.7 31.7 0 00-.5-5.8zM9.5 15.5v-7l6 3.5-6 3.5z" />
                  </svg>
                </a>

                <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-gray-400 hover:text-white transition">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden>
                    <path d="M22 12a10 10 0 10-11.5 9.9v-7h-2.3V12h2.3V9.7c0-2.3 1.4-3.6 3.4-3.6.98 0 2 .18 2 .18v2.2h-1.12c-1.1 0-1.44.68-1.44 1.38V12h2.46l-.39 2.9h-2.07v7A10 10 0 0022 12z" />
                  </svg>
                </a>

                <a href="https://github.com/Fyron-Industries" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="text-gray-400 hover:text-white transition">
                  <Github className="w-5 h-5" />
                </a>
              </div>
            </div>
        </footer> }
      </div>
    </div>
  );
}