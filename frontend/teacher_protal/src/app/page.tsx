"use client";

import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { ProctoringSection } from '@/components/landing/ProctoringSection';
import { AnalyticsSection } from '@/components/landing/AnalyticsSection';
import { Testimonials } from '@/components/landing/Testimonials';
import { CTA } from '@/components/landing/CTA';
import { Pricing } from '@/components/landing/Pricing';
import { FAQ } from '@/components/landing/FAQ';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300 overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      <Navbar />
      <Hero />
      <Features />
      <ProctoringSection />
      <AnalyticsSection />
      <Testimonials />
      <CTA />
      <Pricing />
      <FAQ />
      <Footer />
    </div>
  );
}