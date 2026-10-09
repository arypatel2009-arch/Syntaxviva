import React, { useState } from 'react';
import { CheckCircle2, Sparkles, PhoneCall, ShieldCheck } from 'lucide-react';
import { Button } from '../common/UIComponents.tsx';
import { BookACallModal } from '../common/BookACallModal.tsx';

interface PricingPageProps {
  onNavigate: (path: string) => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
}

export const PricingPage: React.FC<PricingPageProps> = () => {
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('Pro Faculty & Department');

  const handleOpenBookModal = (planName?: string) => {
    if (planName) setSelectedPlan(planName);
    setIsBookModalOpen(true);
  };

  const plans = [
    {
      name: 'Starter & Educators',
      tagline: 'For individual instructors & classroom pilots',
      badge: 'Flexible Pilot',
      highlighted: false,
      features: [
        'Multi-language automated coding viva editor',
        'Automated line & AST bug mutation generator',
        'Standard test suite execution & instant feedback',
        'Student attempt lock & basic integrity logs',
        'Community & Email support',
      ],
    },
    {
      name: 'Pro Faculty & Department',
      tagline: 'For intensive coding labs & departmental courses',
      badge: 'Most Popular',
      highlighted: true,
      features: [
        'Unlimited coding assignments & student attempts',
        '100+ AST & Relational complex mutation variants',
        'AI proctoring & vision snapshot verification',
        'Full PDF accreditation evidence reports',
        'Priority 24/7 faculty support & lab onboarding',
      ],
    },
    {
      name: 'Campus & University',
      tagline: 'For entire colleges & university systems',
      badge: 'Enterprise SLA',
      highlighted: false,
      features: [
        'Unlimited campus students & faculty accounts',
        'LMS integration (Moodle, Blackboard, Canvas)',
        'Custom isolated sandbox cluster deployment',
        'Formal accreditation compliance package',
        'Dedicated account manager & SLA guarantee',
      ],
    },
  ];

  return (
    <div className="bg-white min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tailored Plans for Every Institution</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Get Pricing &amp; Book a Consultation
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            We provide custom tailored deployment packages based on your student volume and institution requirements. Click "Book a Call" to send your details directly to our team via WhatsApp.
          </p>

          {/* Main Book a Call Action */}
          <div className="pt-4 flex items-center justify-center">
            <Button
              variant="primary"
              size="lg"
              className="font-bold flex items-center gap-2 px-8 py-4 text-base shadow-xl shadow-emerald-600/25 cursor-pointer"
              onClick={() => handleOpenBookModal()}
            >
              <PhoneCall className="w-5 h-5" />
              <span>Book a Call</span>
            </Button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl p-8 flex flex-col justify-between transition-all duration-200 ${
                plan.highlighted
                  ? 'bg-gradient-to-b from-emerald-50/50 to-white border-2 border-emerald-500 shadow-xl shadow-emerald-500/10'
                  : 'bg-white border border-slate-200 shadow-2xs hover:shadow-md'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {plan.badge}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{plan.tagline}</p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-1 text-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Custom Institution Quote
                  </span>
                  <p className="text-xs text-slate-600">
                    Contact us for transparent pricing tailored to your course
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    What's included:
                  </span>
                  <ul className="space-y-2.5">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-8">
                <Button
                  variant={plan.highlighted ? 'primary' : 'outline'}
                  size="lg"
                  className="w-full font-bold flex items-center justify-center gap-2 cursor-pointer"
                  onClick={() => handleOpenBookModal(plan.name)}
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Book a Call</span>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Security / FAQ note */}
        <div className="mt-16 text-center text-xs text-slate-500 max-w-xl mx-auto flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>All plans include isolated sandbox execution and zero AI detection hallucination.</span>
        </div>
      </div>

      {/* Book A Call Modal */}
      <BookACallModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        selectedPlan={selectedPlan}
      />
    </div>
  );
};
