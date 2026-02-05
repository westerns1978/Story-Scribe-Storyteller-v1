// components/presentationThemes.ts

export interface Theme {
  name: string;
  bg: string;
  title: string;
  subtitle: string;
  text: string;
  accent: string;
  pdf: {
    bgColor: string;
    titleColor: string;
    textColor: string;
  }
}

export const warmTheme: Theme = {
  name: 'Warm Memoir',
  bg: 'bg-amber-50',
  title: 'text-slate-800 font-serif',
  subtitle: 'text-slate-600 font-sans',
  text: 'text-slate-700 font-serif',
  accent: 'text-amber-600',
  pdf: {
    bgColor: '#FFFBEB',
    titleColor: '#1E293B',
    textColor: '#475569',
  }
};

export const modernTheme: Theme = {
  name: 'Modern',
  bg: 'bg-slate-900',
  title: 'text-white font-sans font-bold',
  subtitle: 'text-slate-400 font-sans',
  text: 'text-slate-300 font-sans',
  accent: 'text-blue-400',
  pdf: {
    bgColor: '#0F172A',
    titleColor: '#FFFFFF',
    textColor: '#CBD5E1',
  }
};

export const classicTheme: Theme = {
  name: 'Classic',
  bg: 'bg-white',
  title: 'text-black font-serif',
  subtitle: 'text-gray-500 font-serif',
  text: 'text-gray-800 font-serif',
  accent: 'text-black',
  pdf: {
    bgColor: '#FFFFFF',
    titleColor: '#000000',
    textColor: '#1F2937',
  }
};