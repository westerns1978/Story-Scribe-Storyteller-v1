
import React from 'react';
import { UserTier } from '../types';
import XMarkIcon from './icons/XMarkIcon';
import CheckIcon from './icons/CheckIcon';
import { BRAND } from '../utils/brandUtils';
import SparklesIcon from './icons/SparklesIcon';
import BoltIcon from './icons/BoltIcon';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTier: (tier: UserTier) => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, onSelectTier }) => {
  if (!isOpen) return null;

  const plans = [
    {
      id: 'photo_pack' as UserTier,
      name: 'Photo Pack',
      price: '$19',
      description: 'The foundation for restoring your most cherished family artifacts.',
      features: ['5 Artifact Restorations', '6 Distinct Artistic Styles', '8K Upscaled Resolution', `No ${BRAND.name} Watermarks`],
      buttonText: 'Initialize Pack',
      color: 'terracotta'
    },
    {
      id: 'memory_collection' as UserTier,
      name: 'Memory Collection',
      price: '$49',
      description: 'A comprehensive approach to preserving a life chapter.',
      features: ['20 Artifact Restorations', '1 Master Narrative Session', 'Structured Digital Archive', 'Shareable Storybook Link'],
      buttonText: 'Begin Collection',
      color: 'terracotta',
      popular: true
    },
    {
      id: 'full_story_scribe' as UserTier,
      name: 'The Full Legacy',
      price: '$297',
      description: 'Our most immersive preservation experience for future generations.',
      features: ['Unlimited Restoration', 'Connie AI Guided Interview', `Cinematic Director's Cut`, 'Premium Hardcover Print Ready', `${BRAND.name} Voice Integration`],
      buttonText: 'Preserve Forever',
      color: 'sienna'
    }
  ];

  return (
    <div className="fixed inset-0 bg-gemynd-deep-brown/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-gemynd-cream w-full max-w-6xl rounded-[3rem] border border-white/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <header className="p-10 border-b border-gemynd-soft-peach flex justify-between items-center bg-white/40">
          <div>
            <span className="text-gemynd-terracotta font-bold tracking-[0.3em] uppercase text-xs mb-2 block">Premium Preservation</span>
            <h2 className="text-4xl font-display font-bold text-gemynd-deep-brown">Secure Your Legacy</h2>
            <p className="text-gemynd-deep-brown/60 font-serif italic mt-1">Preserve the past, enlighten the future.</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white hover:bg-gemynd-soft-peach/30 rounded-full text-gemynd-terracotta transition-all shadow-sm border border-gemynd-soft-peach">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-10 lg:p-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={`relative bg-white rounded-[2.5rem] p-10 border transition-all hover:scale-[1.02] flex flex-col ${plan.popular ? 'border-gemynd-terracotta shadow-warm-lg ring-4 ring-gemynd-terracotta/5' : 'border-gemynd-soft-peach shadow-sm'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gemynd-terracotta text-white text-[10px] font-bold px-5 py-2 rounded-full shadow-lg uppercase tracking-[0.2em]">
                    Most Selected
                  </div>
                )}
                
                <div className="mb-10">
                  <h3 className="text-2xl font-display font-bold text-gemynd-deep-brown mb-4">{plan.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-display font-bold text-gemynd-deep-brown">{plan.price}</span>
                    <span className="text-gemynd-terracotta/60 text-sm font-bold uppercase tracking-widest">Once</span>
                  </div>
                  <p className="text-gemynd-deep-brown/70 text-sm mt-6 leading-relaxed font-medium">{plan.description}</p>
                </div>

                <ul className="space-y-5 mb-12 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-4 text-sm text-gemynd-deep-brown/80 font-medium">
                      <div className="p-0.5 bg-gemynd-soft-peach/50 rounded-full mt-0.5">
                        <CheckIcon className="w-4 h-4 text-gemynd-terracotta" />
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => onSelectTier(plan.id)}
                  className={`w-full py-5 rounded-2xl font-bold transition-all shadow-warm flex items-center justify-center gap-3 text-lg ${
                    plan.id === 'full_story_scribe' 
                      ? 'bg-gemynd-sienna text-white hover:bg-gemynd-deep-brown transform hover:scale-[1.03]' 
                      : 'bg-gemynd-terracotta text-white hover:bg-gemynd-sienna'
                  }`}
                >
                  {plan.id === 'full_story_scribe' && <BoltIcon className="w-5 h-5" />}
                  {plan.buttonText}
                </button>
              </div>
            ))}
          </div>
        </div>

        <footer className="p-8 bg-gemynd-cream/80 text-center border-t border-gemynd-soft-peach">
          <p className="text-xs text-gemynd-terracotta uppercase tracking-[0.3em] font-bold flex items-center justify-center gap-3">
            <SparklesIcon className="w-5 h-5" /> Secured via {BRAND.name} Node Encryption
          </p>
        </footer>
      </div>
    </div>
  );
};