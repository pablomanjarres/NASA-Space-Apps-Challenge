import React, { useEffect, useState } from 'react';
import Modal from './Modal';

interface MLAnalysisAnimationProps {
  isAnalyzing: boolean;
  modelType: 'tess' | 'kepler';
}

const MLAnalysisAnimation: React.FC<MLAnalysisAnimationProps> = ({ isAnalyzing, modelType }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    { icon: 'fa-upload', label: 'Reading data...' },
    { icon: 'fa-search', label: 'Validating columns...' },
    { icon: 'fa-brain', label: 'Loading ML models...' },
    { icon: 'fa-cogs', label: 'Processing features...' },
    { icon: 'fa-chart-line', label: 'Running predictions...' },
    { icon: 'fa-layer-group', label: 'Ensemble voting...' },
    { icon: 'fa-check-circle', label: 'Finalizing results...' }
  ];

  useEffect(() => {
    if (!isAnalyzing) {
      setCurrentStep(0);
      setProgress(0);
      return;
    }

    // Progress through steps
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1200);

    // Smooth progress bar
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 3;
      });
    }, 150);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [isAnalyzing]);

  return (
    <Modal 
      isOpen={isAnalyzing} 
      onClose={() => {}} // Prevent closing during analysis
      maxWidth="2xl"
    >
      <div className="relative overflow-hidden rounded-panel bg-nebula-veil p-6 sm:p-8 md:p-12">

          {/* Faint blueprint grid ground */}
          <div className="pointer-events-none absolute inset-0 bg-hud-grid opacity-[0.35]" aria-hidden="true" />

          {/* Content */}
          <div className="relative z-10 space-y-8">
            
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="inline-block">
                <div className="relative">
                  {/* Rotating Ring */}
                  <div className="mx-auto h-24 w-24 rounded-full border-2 border-hairline border-t-stellar-400 animate-spin" style={{ animationDuration: '1.5s' }} />

                  {/* Center Icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-hairline-strong bg-surface-raised shadow-glow-stellar">
                      <i className="fas fa-brain text-2xl text-accent"></i>
                    </div>
                  </div>

                  {/* Orbiting Particles */}
                  <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                    <div className="absolute top-0 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-stellar-400"></div>
                  </div>
                  <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s', animationDirection: 'reverse' }}>
                    <div className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-nebula-400"></div>
                  </div>
                  <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2.5s' }}>
                    <div className="absolute top-1/2 right-0 h-2 w-2 -translate-y-1/2 rounded-full bg-stellar-300"></div>
                  </div>
                </div>
              </div>

              <h3 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                Analyzing with AI
              </h3>
              <p className="font-mono text-sm font-medium uppercase tracking-wider text-accent sm:text-base">
                {modelType.toUpperCase()} Ensemble Model Processing
              </p>
            </div>

            {/* Progress Steps */}
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-4 transition-all duration-500 ${
                    index <= currentStep
                      ? 'opacity-100 translate-x-0'
                      : 'opacity-30 translate-x-4'
                  }`}
                >
                  {/* Icon */}
                  <div className={`
                    flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-control border transition-all duration-500
                    ${index < currentStep
                      ? 'border-stellar-400/30 bg-stellar-400/10'
                      : index === currentStep
                      ? 'border-stellar-400/40 bg-stellar-400/15 shadow-glow-stellar'
                      : 'border-hairline bg-surface-sunken'
                    }
                  `}>
                    <i className={`fas ${
                      index < currentStep ? 'fa-check' : step.icon
                    } ${index <= currentStep ? 'text-accent' : 'text-ink-tertiary'} ${index === currentStep ? 'text-lg' : 'text-sm'}`}></i>
                  </div>

                  {/* Label */}
                  <div className="min-w-0 flex-1">
                    <p className={`truncate transition-colors duration-500 ${
                      index === currentStep
                        ? 'text-lg font-medium text-ink'
                        : index < currentStep
                        ? 'text-ink-secondary'
                        : 'text-ink-tertiary'
                    }`}>
                      {step.label}
                    </p>
                  </div>

                  {/* Status Icon */}
                  {index === currentStep && (
                    <div className="flex-shrink-0">
                      <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-full bg-stellar-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="h-2 w-2 rounded-full bg-stellar-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="h-2 w-2 rounded-full bg-stellar-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between font-mono text-sm font-medium text-ink-secondary">
                <span className="uppercase tracking-wider text-ink-tertiary">Processing</span>
                <span className="font-semibold text-accent">{Math.round(progress)}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-pill bg-surface-sunken">
                <div
                  className="relative h-full overflow-hidden rounded-pill bg-stellar-400 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer"
                       style={{
                         backgroundSize: '200% 100%',
                         animation: 'shimmer 2s infinite'
                       }} />
                </div>
              </div>
            </div>

            {/* Model Info */}
            <div className="flex flex-wrap justify-center gap-3 border-t border-hairline pt-4">
              <div className="flex items-center gap-2 rounded-control border border-hairline bg-surface-raised px-4 py-2">
                <i className="fas fa-fire text-accent"></i>
                <span className="font-mono text-xs font-medium text-ink-secondary">XGBoost</span>
              </div>
              <div className="flex items-center gap-2 rounded-control border border-hairline bg-surface-raised px-4 py-2">
                <i className="fas fa-bolt text-accent"></i>
                <span className="font-mono text-xs font-medium text-ink-secondary">LightGBM</span>
              </div>
              <div className="flex items-center gap-2 rounded-control border border-hairline bg-surface-raised px-4 py-2">
                <i className="fas fa-cat text-accent"></i>
                <span className="font-mono text-xs font-medium text-ink-secondary">CatBoost</span>
              </div>
            </div>

            {/* Fun Fact */}
            <div className="text-center">
              <p className="text-xs font-medium italic text-ink-tertiary">
                Processing multiple algorithms simultaneously for best accuracy
              </p>
            </div>
          </div>

          {/* Floating particles */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute h-1 w-1 rounded-full bg-stellar-400/50 animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 4}s`
                }}
              />
            ))}
          </div>

          <style>{`
            @keyframes shimmer {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }

            @keyframes float {
              0%, 100% {
                transform: translateY(0) translateX(0);
                opacity: 0;
              }
              10% {
                opacity: 1;
              }
              90% {
                opacity: 1;
              }
              100% {
                transform: translateY(-100vh) translateX(20px);
                opacity: 0;
              }
            }

            .animate-float {
              animation: float linear infinite;
            }

            .animate-shimmer {
              animation: shimmer 2s infinite;
            }
          `}</style>
        </div>
    </Modal>
  );
};

export default MLAnalysisAnimation;
