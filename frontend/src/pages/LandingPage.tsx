import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Boxes,
  Fingerprint,
  Landmark,
  SearchCheck,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const copyrightYear = new Date().getFullYear();

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const dashboardUrl =
    user?.role === 'ADMIN' || user?.role === 'AUTHENTICATOR'
      ? '/institution/dashboard'
      : '/collector/dashboard';

  useEffect(() => {
    if (!loading && user) navigate(dashboardUrl, { replace: true });
  }, [dashboardUrl, loading, navigate, user]);

  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading || user) return null;

  return (
    <div className="landing-page min-h-screen text-[#09090B] dark:text-[#F8FAFC]">
      <Navbar />

      <main>
        <section id="hero" className="landing-hero scroll-mt-24 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:pb-28">
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 lg:grid-cols-12">
            <div className="relative z-10 min-w-0 lg:col-span-7">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#EAE6DF] bg-white/80 px-3.5 py-2 text-xs font-semibold tracking-wide text-[#52525B] shadow-sm">
                <Landmark className="h-4 w-4 text-[#E06D1B]" aria-hidden="true" />
                Institutional Art Provenance
              </span>
              <h1 className="mt-7 max-w-3xl text-4xl font-bold leading-[1.04] tracking-[-0.06em] text-[#09090B] sm:text-5xl lg:text-6xl dark:text-[#F8FAFC]">
                Art provenance for
                <span className="mt-2 block font-serif font-medium italic tracking-[-0.035em] text-[#9C3D00] dark:text-[#F27A24]">
                  institutions &amp; collectors.
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-[#52525B] sm:text-lg">
                A considered record for art institutions and collectors to register, authenticate, and follow each work through custody.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className="group inline-flex min-h-11 items-center justify-between gap-5 rounded-full bg-[#D95D0B] py-1.5 pl-6 pr-2 text-sm font-bold text-[#09090B] shadow-sm transition hover:bg-[#bd4d08] hover:shadow-md dark:bg-[#F27A24] dark:hover:bg-[#ff9445]"
                >
                  Create an account
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#9C3D00] transition group-hover:translate-x-0.5 dark:text-[#9C3D00]">
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </Link>
                <Link
                  to="/verify"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#09090B] px-6 py-3.5 text-sm font-semibold text-[#09090B] transition hover:border-[#9C3D00] hover:text-[#9C3D00] dark:border-[#F8FAFC] dark:text-[#F8FAFC] dark:hover:border-[#F27A24] dark:hover:text-[#F27A24]"
                >
                  Verify an artwork
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-[#EAE6DF] pt-6 text-xs font-medium text-[#52525B]">
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#1E3A2F]" />Institutional review</span>
                <span className="inline-flex items-center gap-2"><Fingerprint className="h-4 w-4 text-[#1E3A2F]" />Tamper-evident records</span>
              </div>
            </div>

            <div className="relative mx-auto w-full min-w-0 max-w-[31rem] lg:col-span-5">
              <div className="absolute -right-4 top-8 z-20 hidden rounded-full bg-[#1E3A2F] px-4 py-2.5 text-xs font-semibold text-white shadow-lg sm:flex sm:items-center sm:gap-2">
                <BadgeCheck className="h-4 w-4 text-[#F4A922]" /> Verification interface preview
              </div>
              <div className="absolute -bottom-4 left-0 z-20 rounded-full border border-[#EAE6DF] bg-white px-4 py-2.5 text-xs font-semibold text-[#09090B] shadow-md dark:text-[#F8FAFC] sm:-left-5">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#F4A922]" /> Immutable ledger
              </div>
              <div className="rotate-0 rounded-[2rem] border border-[#EAE6DF] bg-[#FDF6EC] p-3 shadow-[0_30px_90px_-40px_rgba(20,43,34,.25)] sm:rotate-2">
                <article className="relative overflow-hidden rounded-[1.5rem] border border-[#EAE6DF] bg-white p-6 sm:p-8">
                  <div className="flex items-center justify-between border-b border-dashed border-[#D4CFC7] pb-5">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#1E3A2F] text-[#F4A922]">
                        <Landmark className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#52525B]">Aureum registry</p>
                        <p className="mt-0.5 text-sm font-semibold">Provenance certificate</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-[#EEF4F0] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1E3A2F]">Preview</span>
                  </div>

                  <div className="archive-grid relative my-6 flex aspect-[1.55] items-center justify-center overflow-hidden rounded-2xl border border-[#EAE6DF]">
                    <div className="absolute h-44 w-44 rounded-full border border-[#1E3A2F]/15" />
                    <div className="absolute h-32 w-32 rotate-45 rounded-3xl border border-[#E06D1B]/30 bg-white/40" />
                    <div className="absolute h-20 w-20 -rotate-12 rounded-2xl border border-[#1E3A2F]/30 bg-[#FDF6EC]/80" />
                    <div className="relative grid h-12 w-12 place-items-center rounded-xl bg-[#1E3A2F] text-[#F4A922] shadow-lg">
                      <Fingerprint className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div className="absolute bottom-3 left-4 text-[10px] font-semibold uppercase tracking-[.16em] text-[#52525B]">Archival record / specimen preview</div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-2xl font-semibold leading-tight">Masterwork record</p>
                        <p className="mt-1 text-xs text-[#52525B]">Institutional custody certificate</p>
                      </div>
                      <Sparkles className="mt-1 h-5 w-5 text-[#E06D1B]" aria-hidden="true" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-[#FDF6EC] p-3">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-[#3F3F46]">Record hash · preview</p>
                        <p className="mt-1 font-mono text-[11px] font-semibold">0x7f3a…91c2</p>
                      </div>
                      <div className="rounded-xl bg-[#FDF6EC] p-3">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-[#3F3F46]">Verification timestamp</p>
                        <p className="mt-1 text-[11px] font-semibold">Recorded on verification</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 border-t border-dashed border-[#D4CFC7] pt-4 text-[11px] text-[#52525B]">
                      <span className="h-2 w-2 rounded-full bg-[#1E3A2F]" /> Institutional signature status
                      <span className="ml-auto font-mono">CERT. PREVIEW</span>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        <div className="bg-[#F4A922] py-4 text-[#09090B]" role="region" aria-label="Platform capabilities">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-3 gap-y-3 px-5 text-center text-[11px] font-extrabold uppercase tracking-[.12em] sm:grid-cols-4 sm:px-8 sm:text-xs">
            {['Provenance tracking', 'Institutional custody', 'Ownership transfers', 'Audit trails'].map((item) => (
              <span key={item} className="flex min-h-10 items-center justify-center gap-2"><Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />{item}</span>
            ))}
          </div>
        </div>

        <section id="features" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#E06D1B]">One record, every chapter</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">
                Verified <span className="font-serif italic font-medium text-[#E06D1B]">provenance</span>, made legible.
              </h2>
              <p className="mt-4 max-w-xl leading-7 text-[#52525B]">Purpose-built tools bring authentication, custody, and public verification into one clear archival workflow.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Fingerprint, title: 'Physical-to-digital binding', body: 'Connect an artwork’s physical identifiers to its durable digital provenance record.', href: '/artwork/register' },
                { icon: Boxes, title: 'Custody history', body: 'Keep ownership events and transfer approvals arranged as a readable, auditable timeline.', href: '/collector/dashboard' },
                { icon: SearchCheck, title: 'Public verification', body: 'Let a collector, institution, or prospective buyer inspect a record with confidence.', href: '/verify' },
              ].map(({ icon: Icon, title, body, href }) => (
                <article key={title} className="group rounded-2xl border border-[#EAE6DF] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#FDF6EC] text-[#E06D1B]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-6 text-lg font-bold tracking-tight">{title}</h3>
                  <p className="mt-2 min-h-14 text-sm leading-6 text-[#52525B]">{body}</p>
                  <Link to={href} className="mt-5 inline-flex min-h-11 items-center gap-1 text-xs font-bold text-[#9C3D00] dark:text-[#F27A24]">
                    Explore <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

      </main>

      <footer className="border-t border-[#EAE6DF]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-5 py-8 sm:flex-row sm:items-center sm:px-8">
          <Link to="/" className="text-lg font-bold tracking-tight text-[#18181B]">Aureum<span className="text-[#E06D1B]">.</span></Link>
          <p className="text-xs text-[#52525B]">A considered record for art provenance and custody.</p>
          <Link to="/verify" className="inline-flex items-center gap-1 text-xs font-semibold text-[#E06D1B]">Verify a record <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </div>
        <div className="border-t border-[#EAE6DF] px-5 py-4 text-center text-xs text-[#52525B] sm:px-8">
          &copy; {copyrightYear} Aureum. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
