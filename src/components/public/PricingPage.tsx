import React, { useState } from 'react';
import { CheckCircle2, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '../common/UIComponents.tsx';

interface PricingPageProps {
  onNavigate: (path: string) => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onNavigate, onOpenAuth }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const plans = [
    {
      name: 'Free',
      tagline: 'For individual instructors & small classes',
      price: '$0',
      period: 'forever free',
      highlighted: false,
      features: [
        'Up to 50 active students',
        '5 active assignments per semester',
        'Multi-language code editor',
        'Automated viva debug challenges',
        'Standard test suite execution',
        'Community support',
      ],
      buttonText: 'Get Started Free',
      buttonVariant: 'outline' as const,
      roleTarget: 'student' as const,
    },
    {
      name: 'Pro Faculty',
      tagline: 'For department courses & intensive labs',
      price: billingCycle === 'monthly' ? '$19' : '$15',
      period: 'per month / instructor',
      highlighted: true,
      badge: 'Most Popular',
      features: [
        'Up to 500 active students',
        'Unlimited coding assignments',
        'Advanced mutation types (AST, Relational, Loop)',
        'Camera & phone vision proctoring',
        'Full PDF accreditation evidence reports',
        'Priority email & chat support',
        'Student attempt lock & review logs',
      ],
      buttonText: 'Start 14-Day Free Trial',
      buttonVariant: 'primary' as const,
      roleTarget: 'faculty' as const,
    },
    {
      name: 'Institution & University',
      tagline: 'For entire colleges & technical universities',
      price: 'Custom',
      period: 'tailored campus deployment',
      highlighted: false,
      features: [
        'Unlimited campus students & faculty',
        'SSO / LMS integration (Moodle, Blackboard, Canvas)',
        'Dedicated on-premise execution sandbox cluster',
        'Custom proctoring policy enforcement',
        'Formal accreditation compliance package',
        'Dedicated account manager & Enterprise SLA',
      ],
      buttonText: 'Contact Campus Sales',
      buttonVariant: 'dark' as const,
      roleTarget: 'faculty' as const,
    },
  ];

  return (
    <div className="bg-white min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
            <span>Simple, Transparent Pricing</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Fair Plans for Every Educator
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Choose the plan that fits your classroom or campus. Upgrade or change anytime.
          </p>

          {/* Billing Toggle */}
          <div className="pt-4 flex items-center justify-center gap-3">
            <span
              className={`text-sm font-medium ${
                billingCycle === 'monthly' ? 'text-slate-900 font-bold' : 'text-slate-500'
              }`}
            >
              Monthly Billing
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className="relative w-12 h-6 bg-emerald-600 rounded-full transition-colors cursor-pointer p-0.5"
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium flex items-center gap-1.5 ${
                billingCycle === 'annual' ? 'text-slate-900 font-bold' : 'text-slate-500'
              }`}
            >
              Annual Billing
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                Save 20%
              </span>
            </span>
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
              {plan.highlighted && (
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

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900 font-mono">
                    {plan.price}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ {plan.period}</span>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
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
                  variant={plan.buttonVariant}
                  size="lg"
                  className="w-full font-bold"
                  onClick={() => {
                    if (plan.name === 'Institution & University') {
                      onNavigate('/contact');
                    } else {
                      onOpenAuth('signup');
                    }
                  }}
                >
                  {plan.buttonText}
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
    </div>
  );
};
