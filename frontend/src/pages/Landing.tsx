import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import lungsHeroImg from '../assets/anatomical_lungs_clinical.jpg';

export const Landing: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#243447] flex flex-col font-sans">
      {/* Shared Navbar */}
      <Navbar variant="landing" />

      {/* Hero Section */}
      <section className="pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex flex-col items-center text-center">
        {/* Clinician Badge Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EAF1F6] border border-[#D0DFEB] text-xs font-mono font-medium text-[#163B5C] mb-8">
          <span className="w-2 h-2 rounded-full bg-[#3D8C87]"></span>
          <span>CLINICAL DECISION SUPPORT • DENSENET-121 BACKBONE</span>
        </div>

        {/* Prominent Navy Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#163B5C] max-w-5xl leading-[1.15] mb-6">
          Precision Pulmonary Screening for Chest Radiographs
        </h1>

        <p className="max-w-2xl text-base sm:text-lg text-[#475569] font-normal leading-relaxed mb-10">
          Engineered for radiologists and clinicians to detect subtle pneumonia opacities. 
          Combines high-sensitivity deep learning inference with real-time Grad-CAM spatial explainability.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <button
            onClick={() => navigate(currentUser ? '/dashboard' : '/login')}
            className="px-7 py-3 rounded-lg font-semibold text-white bg-[#315D7D] hover:bg-[#163B5C] shadow-sm transition-colors text-sm flex items-center gap-2 cursor-pointer"
          >
            <span>Launch Screening Workspace</span>
            <span className="font-mono text-base">→</span>
          </button>
          
          <button
            onClick={() => navigate(currentUser ? '/patients' : '/signup')}
            className="px-6 py-3 rounded-lg font-medium text-[#163B5C] bg-white hover:bg-[#EAF1F6] border border-[#D9E2EA] transition-colors text-sm shadow-xs cursor-pointer"
          >
            {currentUser ? 'View Patient Directory' : 'Register Clinical Account'}
          </button>
        </div>

        {/* Clinical Frame with Anatomical Lungs Presentation */}
        <div className="w-full max-w-4xl clinical-frame p-4 sm:p-6 bg-white border border-[#D9E2EA] shadow-md">
          <div className="rounded-xl p-6 sm:p-8 bg-[#0F1C2B] border border-[#243447] relative flex flex-col items-center">
            
            {/* Clinical Frame Labels */}
            <div className="w-full flex items-center justify-between pb-4 border-b border-[#243447] text-[11px] font-mono text-[#94A3B8]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#3D8C87]"></span>
                <span className="text-white font-medium">PULMONARY ANATOMY & SPATIAL ATTENTION</span>
              </div>
              <span className="text-[#94A3B8]">CLINICAL DECISION SUPPORT</span>
            </div>

            {/* Anatomical Lungs Visual Presentation */}
            <div className="relative my-6 w-64 sm:w-80 aspect-square flex items-center justify-center">
              <img
                src={lungsHeroImg}
                alt="Anatomical Human Lungs Model"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            {/* Understated Capabilities Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-4 border-t border-[#243447]">
              <div className="bg-[#16273A] border border-[#2A435D] rounded-lg p-3.5 text-left">
                <span className="block text-[10px] font-mono text-[#7EC3BC] uppercase font-semibold">DETECTION CAPABILITY</span>
                <span className="text-sm font-semibold text-white mt-1 block">AI-Assisted X-Ray Screening</span>
                <span className="block text-[11px] text-[#94A3B8] mt-0.5 leading-relaxed">High-sensitivity screening for subtle pneumonia opacities</span>
              </div>

              <div className="bg-[#16273A] border border-[#2A435D] rounded-lg p-3.5 text-left">
                <span className="block text-[10px] font-mono text-[#7EC3BC] uppercase font-semibold">SPATIAL EXPLAINABILITY</span>
                <span className="text-sm font-semibold text-white mt-1 block">Visual Explanation with Grad-CAM</span>
                <span className="block text-[11px] text-[#94A3B8] mt-0.5 leading-relaxed">Activation heatmaps highlighting anatomical areas of interest</span>
              </div>

              <div className="bg-[#16273A] border border-[#2A435D] rounded-lg p-3.5 text-left">
                <span className="block text-[10px] font-mono text-[#7EC3BC] uppercase font-semibold">WORKFLOW INTEGRATION</span>
                <span className="text-sm font-semibold text-white mt-1 block">Patient Records & PDF Reports</span>
                <span className="block text-[11px] text-[#94A3B8] mt-0.5 leading-relaxed">Structured clinical documentation with physician sign-off</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#163B5C] tracking-tight mb-3">
            Built for Radiological Decision-Support
          </h2>
          <p className="text-[#475569] text-sm max-w-2xl mx-auto">
            MedVision connects deep learning computer vision directly with institutional clinical workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="clinical-card p-6">
            <div className="w-9 h-9 rounded-lg bg-[#EAF1F6] text-[#163B5C] font-mono font-bold text-sm flex items-center justify-center mb-4">
              01
            </div>
            <h3 className="text-base font-semibold text-[#163B5C] mb-2">Hospital-Ready Image Ingestion</h3>
            <p className="text-[#475569] text-sm leading-relaxed">
              Directly parses native 16-bit DICOM (.dcm) files with automatic min-max windowing normalization, 
              with seamless fallback support for standard diagnostic PNG and JPEG formats.
            </p>
          </div>

          <div className="clinical-card p-6">
            <div className="w-9 h-9 rounded-lg bg-[#E6F3F2] text-[#2D6B67] font-mono font-bold text-sm flex items-center justify-center mb-4">
              02
            </div>
            <h3 className="text-base font-semibold text-[#163B5C] mb-2">Spatial Grad-CAM Heatmaps</h3>
            <p className="text-[#475569] text-sm leading-relaxed">
              Every prediction produces a gradient-weighted class activation map (Grad-CAM) overlaid on the radiograph, 
              visually highlighting anatomical areas influencing the network probability.
            </p>
          </div>

          <div className="clinical-card p-6">
            <div className="w-9 h-9 rounded-lg bg-[#EAF1F6] text-[#163B5C] font-mono font-bold text-sm flex items-center justify-center mb-4">
              03
            </div>
            <h3 className="text-base font-semibold text-[#163B5C] mb-2">Structured PDF Reports & Records</h3>
            <p className="text-[#475569] text-sm leading-relaxed">
              Generates formal, exportable PDF screening reports complete with patient demographics, AI findings, 
              Grad-CAM overlays, and attending physician signature blocks.
            </p>
          </div>
        </div>
      </section>

      {/* Clinical Workflow Roadmap */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-[#D9E2EA]">
        <div className="text-center mb-12">
          <span className="text-xs uppercase font-mono tracking-wider text-[#315D7D] font-semibold">Standard Protocol</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#163B5C] tracking-tight mt-1">End-to-End Screening Pipeline</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="clinical-card p-5">
            <span className="text-xs font-mono text-[#315D7D] font-bold block mb-2">STEP 1</span>
            <h4 className="font-semibold text-[#163B5C] text-sm mb-1">Patient Profile Selection</h4>
            <p className="text-[#475569] text-xs">Associate scans with unique clinical records (PAT-XXXXX) in Firestore.</p>
          </div>

          <div className="clinical-card p-5">
            <span className="text-xs font-mono text-[#315D7D] font-bold block mb-2">STEP 2</span>
            <h4 className="font-semibold text-[#163B5C] text-sm mb-1">Multipart X-Ray Upload</h4>
            <p className="text-[#475569] text-xs">FastAPI receives DICOM / PNG with clinician Bearer authorization token.</p>
          </div>

          <div className="clinical-card p-5">
            <span className="text-xs font-mono text-[#315D7D] font-bold block mb-2">STEP 3</span>
            <h4 className="font-semibold text-[#163B5C] text-sm mb-1">PyTorch DenseNet-121</h4>
            <p className="text-[#475569] text-xs">Fast inference with calibrated 0.40 high-sensitivity pneumonia cutoff.</p>
          </div>

          <div className="clinical-card p-5">
            <span className="text-xs font-mono text-[#3D8C87] font-bold block mb-2">STEP 4</span>
            <h4 className="font-semibold text-[#163B5C] text-sm mb-1">Grad-CAM & PDF Export</h4>
            <p className="text-[#475569] text-xs">Review OpenCV Jet Grad-CAM and compile formal clinical documentation.</p>
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="mt-14 p-8 rounded-xl bg-[#163B5C] text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
          <div>
            <h3 className="text-xl font-bold mb-1">Ready to screen chest radiographs?</h3>
            <p className="text-[#D0DFEB] text-sm">Access the clinical screening workspace and evaluate scans.</p>
          </div>
          <Link
            to={currentUser ? "/dashboard" : "/login"}
            className="px-6 py-2.5 rounded-lg font-semibold text-[#163B5C] bg-white hover:bg-[#EAF1F6] text-sm transition-colors whitespace-nowrap"
          >
            Enter Workspace
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#D9E2EA] bg-white py-10 text-center text-xs text-[#64748B]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#163B5C] text-white flex items-center justify-center text-[10px] font-mono font-bold">
              MV
            </div>
            <span className="text-[#163B5C] font-semibold tracking-wide">MedVision Platform</span>
          </div>
          <p className="max-w-xl text-[#64748B] leading-relaxed text-[11px]">
            <strong>Regulatory & Medical Disclaimer:</strong> MedVision is an educational tool and clinical decision support prototype. 
            It is not an FDA/CE cleared diagnostic device and does not replace professional radiologist assessment.
          </p>
          <div className="text-[#94A3B8] text-[11px] font-mono">
            Trained on RSNA Pneumonia Detection Dataset • PyTorch 2.1 • DenseNet121-v1
          </div>
        </div>
      </footer>
    </div>
  );
};
