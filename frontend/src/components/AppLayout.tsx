import React from 'react';
import { Navbar } from './Navbar';

interface AppLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, breadcrumbs }) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#243447] flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar variant="app" />

      {/* Breadcrumbs & Regulatory Bar */}
      <div className="border-b border-[#D9E2EA] bg-[#EAF1F6]/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav className="flex items-center gap-2 text-[#64748B] font-medium">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.label}>
                  {idx > 0 && <span className="text-[#94A3B8]">/</span>}
                  {crumb.href ? (
                    <a href={crumb.href} className="text-[#315D7D] hover:text-[#163B5C] transition">
                      {crumb.label}
                    </a>
                  ) : (
                    <span className="text-[#163B5C] font-semibold">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          ) : (
            <div className="flex items-center gap-2 text-[#163B5C] font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#3D8C87]"></span>
              <span>DenseNet121-v1 Active • 0.40 Sensitivity Cutoff</span>
            </div>
          )}

          <div className="text-[11px] text-[#64748B] flex items-center gap-2">
            <span className="text-[#92400E] font-medium font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#FEF3C7] border border-[#FDE68A]">
              CLINICAL PROTOCOL
            </span>
            <span className="hidden sm:inline">Educational & decision-support aid. Radiologist confirmation required.</span>
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-[#D9E2EA] bg-white py-6 text-center text-xs text-[#64748B]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} MedVision. Clinical Decision Support Prototype.</p>
          <div className="flex items-center gap-4 text-[#64748B] font-mono text-[11px]">
            <span>Model: DenseNet-121</span>
            <span>•</span>
            <span>Decision Cutoff: 0.40</span>
            <span>•</span>
            <span>RSNA Pneumonia Dataset</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
