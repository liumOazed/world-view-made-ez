import type { CountryProfile } from './countries';

/**
 * Explainable, illustrative risk logic. Deliberately qualitative: it shows
 * which factors drive an assessment rather than one opaque probability.
 */

export type Level = 'Low' | 'Moderate' | 'Elevated' | 'High';
export type StepLevel = Level | 'Offsetting';

const clamp = (v: number) => Math.max(0, Math.min(100, v));

export function levelOf(score: number): Level {
  if (score < 30) return 'Low';
  if (score < 50) return 'Moderate';
  if (score < 70) return 'Elevated';
  return 'High';
}

export interface Factor {
  label: string;
  detail: string;
  weight: number; // 0–100, higher = stronger contribution
}

export interface Dimension {
  key: 'exposure' | 'vulnerability' | 'resilience';
  title: string;
  question: string;
  score: number;
  level: Level;
  factors: Factor[];
}

export function riskProfile(c: CountryProfile): Dimension[] {
  const exposureFactors: Factor[] = [
    { label: 'Trade openness', detail: `${Math.round(c.tradeOpenness)}% of GDP`, weight: clamp(c.tradeOpenness / 1.6) },
    { label: 'Export concentration', detail: c.exportConcentration > 60 ? 'Few products or markets' : 'Fairly diversified', weight: c.exportConcentration },
    { label: 'Imported energy', detail: c.energyImporter ? 'Net importer' : 'Net exporter', weight: c.energyImporter ? 70 : 15 },
    { label: 'Foreign-currency funding', detail: c.finExposure > 60 ? 'Large external needs' : 'Manageable', weight: c.finExposure },
  ];
  const vulnerabilityFactors: Factor[] = [
    { label: 'Reserve cover', detail: `${c.reserveMonths.toFixed(1)} months of imports`, weight: clamp(100 - c.reserveMonths * 12) },
    { label: 'Public debt', detail: `${Math.round(c.debt)}% of GDP`, weight: clamp(c.debt / 1.5) },
    { label: 'Fiscal balance', detail: `${c.fiscal.toFixed(1)}% of GDP`, weight: clamp(-c.fiscal * 10) },
    { label: 'Inflation', detail: `${c.inflation.toFixed(1)}% y/y`, weight: clamp(c.inflation * 3) },
  ];
  const resilienceFactors: Factor[] = [
    { label: 'External buffers', detail: `${c.reserveMonths.toFixed(1)} months of imports`, weight: clamp(c.reserveMonths * 9) },
    { label: 'Current account', detail: `${c.currentAccount > 0 ? '+' : ''}${c.currentAccount.toFixed(1)}% of GDP`, weight: clamp(50 + c.currentAccount * 6) },
    { label: 'Diversified trade', detail: c.exportConcentration < 40 ? 'Many partners' : 'Concentrated', weight: clamp(100 - c.exportConcentration) },
    { label: 'Income level', detail: `$${c.gdpPc.toLocaleString('en-US')} per person`, weight: clamp(Math.log10(Math.max(c.gdpPc, 500)) * 30 - 70) },
  ];
  const avg = (fs: Factor[]) => Math.round(fs.reduce((s, f) => s + f.weight, 0) / fs.length);
  const dims: Omit<Dimension, 'level'>[] = [
    { key: 'exposure', title: 'Exposure', question: 'How connected is it to outside shocks?', score: avg(exposureFactors), factors: exposureFactors },
    { key: 'vulnerability', title: 'Vulnerability', question: 'How badly could a shock hurt?', score: avg(vulnerabilityFactors), factors: vulnerabilityFactors },
    { key: 'resilience', title: 'Resilience', question: 'How well can it absorb and recover?', score: avg(resilienceFactors), factors: resilienceFactors },
  ];
  return dims.map((d) => ({ ...d, level: levelOf(d.score) }));
}

export type ShockId = 'oil' | 'market' | 'currency' | 'rates';

export interface Shock {
  id: ShockId;
  label: string;
  short: string;
}

export const SHOCKS: Shock[] = [
  { id: 'oil', label: 'Oil prices rise 30%', short: 'Oil +30%' },
  { id: 'market', label: 'Largest export market enters recession', short: 'Export market recession' },
  { id: 'currency', label: 'Currency falls 15%', short: 'Currency −15%' },
  { id: 'rates', label: 'Global interest rates rise 2 points', short: 'Rates +2 pp' },
];

export interface Step {
  title: string;
  detail: string;
  level: StepLevel;
}

export function pathway(c: CountryProfile, id: ShockId, displayName: (n: string) => string): Step[] {
  const resilience = riskProfile(c).find((d) => d.key === 'resilience')!;
  const check: Step = {
    title: 'Resilience check',
    detail: `Reserves (${c.reserveMonths.toFixed(1)} months), alternative markets, debt structure and policy room.`,
    level: (resilience.score > 60 ? 'Offsetting' : levelOf(100 - resilience.score)) as StepLevel,
  };
  switch (id) {
    case 'oil':
      return c.energyImporter
        ? [
            { title: 'Energy import bill rises', detail: 'More foreign currency is needed to buy the same fuel.', level: levelOf(55 + c.tradeOpenness / 6) },
            { title: 'Prices and household costs', detail: 'Transport, power and food costs feed into inflation.', level: levelOf(40 + c.inflation * 2) },
            { title: 'Currency and current account', detail: 'A wider external gap can pressure the exchange rate.', level: levelOf(c.finExposure) },
            check,
          ]
        : [
            { title: 'Export earnings rise', detail: 'Higher prices lift energy revenues.', level: 'Offsetting' },
            { title: 'Government revenue', detail: 'Fiscal room improves while prices stay high.', level: 'Offsetting' },
            { title: 'Customer slowdown', detail: 'Importing partners may cut demand if prices stay high.', level: levelOf(c.exportConcentration * 0.7) },
            check,
          ];
    case 'market': {
      const top = c.partners.find((p) => p.kind === 'exports');
      const name = top ? displayName(top.name) : 'its largest market';
      return [
        { title: `${name} enters recession`, detail: top ? `Takes about ${top.share}% of exports (illustrative).` : 'Main destination for exports.', level: levelOf((top?.share ?? 20) * 1.6 + 20) },
        { title: 'Export demand falls', detail: 'Factories, jobs and export earnings may be affected.', level: levelOf(c.exportConcentration * 0.6 + c.tradeOpenness / 5) },
        { title: 'Foreign-currency pressure', detail: 'Lower earnings can pressure reserves and the exchange rate.', level: levelOf(100 - c.reserveMonths * 8) },
        check,
      ];
    }
    case 'currency':
      return [
        { title: 'Imports get more expensive', detail: 'A weaker currency raises the local cost of imports.', level: levelOf(c.tradeOpenness / 1.6) },
        { title: 'Foreign-currency debt grows', detail: 'Debts owed in dollars or euros become heavier.', level: levelOf(c.finExposure) },
        { title: 'Exporters gain some ground', detail: 'Cheaper exports can partly offset the hit.', level: 'Offsetting' },
        check,
      ];
    case 'rates':
      return [
        { title: 'Refinancing gets costlier', detail: 'Rolling over public and private debt costs more.', level: levelOf(c.debt / 1.6 + 10) },
        { title: 'Capital flows out', detail: 'Investors may favour higher-rated markets.', level: levelOf(c.finExposure) },
        { title: 'Growth slows', detail: 'Tighter credit can weigh on investment and jobs.', level: levelOf(40 + (c.fiscal < -5 ? 20 : 0)) },
        check,
      ];
  }
}
