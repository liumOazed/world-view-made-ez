import { ArrowDownRight, ArrowRight, ArrowUpRight, Globe2, Info, Map as MapIcon, MoveRight } from 'lucide-react';
import { LINK_META, type CountryProfile, type LinkKind } from '../data/countries';
import {
  INFLUENCE_COLOR,
  INFLUENCE_LABEL,
  influencedBy,
  influenceSource,
  supplyLinks,
  tradeSource,
  type InfluenceLink,
  type TradeLink,
} from '../data/connections';
import { layerFor, type LayerId } from '../data/layers';
import { indexSource } from '../data/scorecard';
import {
  FMT,
  indicator,
  META,
  nextYearGrowth,
  outlookOf,
  resilience,
  SECTION_BY_ID,
  SECTIONS,
  SOURCES,
  tradeBalance,
  commodityExports,
  valueOf,
  type SectionId,
  type Subsection,
} from '../data/sections';
import { Flag } from './Flag';
import { ScorecardTab } from './Scorecard';
import { Sparkline, TREND_BAD, TREND_GOOD, TREND_NEUTRAL } from './Sparkline';

export type CountryTab = 'overview' | SectionId | 'scorecard' | 'news';

const TABS: { id: CountryTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  ...SECTIONS.map((s) => ({ id: s.id as CountryTab, label: s.short })),
  { id: 'scorecard', label: 'Scorecard' },
  { id: 'news', label: 'News' },
];

interface Props {
  country: CountryProfile;
  profiles: Map<string, CountryProfile>;
  tab: CountryTab;
  onTab: (t: CountryTab) => void;
  onSelect: (name: string) => void;
  onClose: () => void;
  trade: TradeLink[];
  influence: InfluenceLink[];
  layerId: LayerId;
  onLayer: (id: LayerId) => void;
}

export function CountryPanel(props: Props) {
  const { country, tab, onTab, onClose } = props;
  return (
    <div className="panel-body fade-in" key={country.name}>
      <div className="country-head">
        <Flag country={country} size="lg" />
        <div>
          <h2>{country.display}</h2>
          <div className="muted">{country.region} · Country intelligence</div>
        </div>
        <button type="button" className="back-world" onClick={onClose} title="Back to the global overview">
          <Globe2 size={13} /> World
        </button>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'is-active' : undefined}
            onClick={() => onTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="tab-body" key={tab}>
        {tab === 'overview' && <Overview {...props} />}
        {tab === 'scorecard' && <ScorecardTab c={country} />}
        {tab === 'news' && <News c={country} />}
        {tab in SECTION_BY_ID && <SectionView id={tab as SectionId} {...props} />}
      </div>
    </div>
  );
}

/* ---------- shared bits ---------- */

const nameOf = (profiles: Map<string, CountryProfile>) => (n: string) => profiles.get(n)?.display ?? n;

/** Ranks are computed once per indicator. */
const rankCache = new Map<string, Map<string, number>>();
function rankOf(id: string, country: string, higherIsBetter: boolean) {
  let ranks = rankCache.get(id);
  if (!ranks) {
    const values = Object.entries(indicator(id)?.values ?? {}).sort(([, a], [, b]) => (higherIsBetter ? b[0] - a[0] : a[0] - b[0]));
    ranks = new Map(values.map(([c], i) => [c, i + 1]));
    ranks.set('__total', values.length);
    rankCache.set(id, ranks);
  }
  const r = ranks.get(country);
  return r ? { rank: r, of: ranks.get('__total')! } : null;
}

function seriesOf(id: string, country: string) {
  const ind = indicator(id);
  const s = ind?.series?.[country];
  if (!s || ind?.seriesFrom === undefined) return null;
  // Years up to the latest actual; forecasts are shown separately.
  const latest = ind.values[country]?.[1];
  const pts = s.slice(0, latest ? latest - ind.seriesFrom + 1 : s.length).filter((v): v is number => v !== null);
  return pts.length >= 3 ? pts : null;
}

function trendColor(series: number[], higherIsBetter: boolean | null) {
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  if (higherIsBetter === null || Math.abs(last - prev) < 1e-9) return TREND_NEUTRAL;
  return last > prev === higherIsBetter ? TREND_GOOD : TREND_BAD;
}

/** One sourced number: label, value, year, rank, and a sparkline where there is history. */
function MetricRow({ id, country }: { id: string; country: string }) {
  const ind = indicator(id);
  const meta = META[id];
  const v = valueOf(id, country);
  const label = meta?.label ?? ind?.label ?? id;
  if (!ind) {
    return (
      <div className="mrow is-empty">
        <div className="mrow-label">{label}</div>
        <div className="mrow-value muted">Not loaded yet</div>
      </div>
    );
  }
  if (!v) {
    return (
      <div className="mrow is-empty">
        <div className="mrow-label">
          {label}
          <span className="mrow-unit">{ind.unit}</span>
        </div>
        <div className="mrow-value muted">No data</div>
      </div>
    );
  }
  const series = seriesOf(id, country);
  const fc = ind.forecast?.[country];
  const rank = meta?.higherIsBetter === null || !meta ? null : rankOf(id, country, meta.higherIsBetter);
  return (
    <div className="mrow">
      <div className="mrow-label">
        {label}
        <span className="mrow-unit">{ind.unit}</span>
      </div>
      <div className="mrow-figure">
        {series && <Sparkline values={series} color={trendColor(series, meta?.higherIsBetter ?? null)} width={52} height={18} />}
        <div className="mrow-value">{(meta?.fmt ?? FMT.index)(v[0])}</div>
      </div>
      <div className="mrow-meta">
        <span>{v[1]}</span>
        {fc && (
          <span>
            {fc[1]} forecast {(meta?.fmt ?? FMT.index)(fc[0])}
          </span>
        )}
        {rank && (
          <span>
            #{rank.rank} of {rank.of}
          </span>
        )}
      </div>
    </div>
  );
}

function Note({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'warn' }) {
  return (
    <p className={`sub-note sub-note-${tone}`}>
      <Info size={12} />
      <span>{children}</span>
    </p>
  );
}

/* ---------- overview ---------- */

function Headline({ id, country, label }: { id: string; country: string; label: string }) {
  const v = valueOf(id, country);
  const meta = META[id];
  const series = seriesOf(id, country);
  const fc = indicator(id)?.forecast?.[country];
  const up = series && series[series.length - 1] > series[series.length - 2];
  const Arrow = !series ? MoveRight : up ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{v ? meta.fmt(v[0]) : '—'}</div>
      {series && (
        <div className="metric-foot">
          <span className="metric-trend" style={{ color: trendColor(series, meta.higherIsBetter) }}>
            <Arrow size={12} />
            {v?.[1]}
          </span>
          <Sparkline values={series} color={trendColor(series, meta.higherIsBetter)} width={52} height={18} />
        </div>
      )}
      <div className="metric-sub">
        {fc ? `${fc[1]} forecast ${meta.fmt(fc[0])}` : v ? `${v[1]}` : 'No data'}
      </div>
    </div>
  );
}

function Overview({ country: c, profiles, onTab, onSelect }: Props) {
  const gdp = valueOf('gdpUsd', c.name);
  const growth = valueOf('gdpGrowth', c.name);
  const growthSeries = seriesOf('gdpGrowth', c.name);
  const outlook = outlookOf(c.name);
  const res = resilience(c.name, [...profiles.keys()]);
  const by = influencedBy(c, profiles);
  const fbic = influenceSource(c.name);
  const display = nameOf(profiles);
  return (
    <>
      <div className="metric-primary">
        <div>
          <div className="pm-label">GDP</div>
          <div className="pm-value">{gdp ? FMT.usdBn(gdp[0]) : '—'}</div>
          <div className="metric-sub">
            {gdp ? `${gdp[1]} · current US$` : 'No IMF estimate'}
            {valueOf('gdpPcPpp', c.name) && ` · ${FMT.dollars(valueOf('gdpPcPpp', c.name)![0])} per person (PPP)`}
          </div>
        </div>
        <div>
          <div className="pm-label">GDP growth</div>
          <div className="pm-value">{growth ? FMT.pctSigned(growth[0]) : '—'}</div>
          {growthSeries && (
            <div className="metric-foot">
              <span className="metric-trend" style={{ color: trendColor(growthSeries, true) }}>
                {growth?.[1]}
              </span>
              <Sparkline values={growthSeries} color={trendColor(growthSeries, true)} width={60} height={18} />
            </div>
          )}
        </div>
      </div>
      {outlook && (
        <button type="button" className={`outlook-strip outlook-${outlook.toLowerCase()}`} onClick={() => onTab('growth')}>
          <span>Outlook</span>
          <strong>{outlook}</strong>
          <span className="muted">IMF forecast {FMT.pctSigned(nextYearGrowth(c.name))} next year</span>
          <ArrowRight size={13} />
        </button>
      )}

      <div className="metric-grid">
        <Headline id="inflation" country={c.name} label="Inflation" />
        <Headline id="debt" country={c.name} label="Public debt, % GDP" />
        <Headline id="currentAccount" country={c.name} label="Current account, % GDP" />
        <div className="metric">
          <div className="metric-label">Resilience score</div>
          <div className="metric-value">{res ? Math.round(res.score) : '—'}</div>
          <button type="button" className="metric-link" onClick={() => onTab('risk')}>
            What drives it <ArrowRight size={13} />
          </button>
          <div className="metric-sub">{res ? `Our composite of ${res.parts.length} inputs` : 'Not enough inputs'}</div>
        </div>
      </div>

      <section className="panel-section">
        <div className="section-title">
          <h3>Who influences {c.display}?</h3>
          <button type="button" className="link" onClick={() => onTab('influence')}>
            Influence <ArrowRight size={13} />
          </button>
        </div>
        {by ? (
          <div className="partner-chips">
            {by.map((l) => (
              <button
                key={l.name}
                type="button"
                className="partner-chip"
                style={{ ['--c' as string]: INFLUENCE_COLOR }}
                onClick={() => onSelect(l.name)}
              >
                <span className="partner-dot" />
                <span>{display(l.name)}</span>
                <small>{l.score}</small>
              </button>
            ))}
          </div>
        ) : (
          <p className="muted small">The FBIC Index does not cover {c.display}.</p>
        )}
        {by && fbic && (
          <Note>
            Influence capacity over {c.display} (strongest = 100) from the{' '}
            <a href={fbic.sourceUrl} target="_blank" rel="noreferrer">
              FBIC Index
            </a>
            , {fbic.year}.
          </Note>
        )}
      </section>

      <section className="panel-section">
        <div className="section-title">
          <h3>Go deeper</h3>
        </div>
        <div className="section-links">
          {SECTIONS.map((s) => (
            <button key={s.id} type="button" onClick={() => onTab(s.id)}>
              <strong>{s.label}</strong>
              <span>{s.blurb}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

/* ---------- one section ---------- */

function SectionView({ id, country: c, layerId, onLayer, onTab, ...rest }: Props & { id: SectionId }) {
  const section = SECTION_BY_ID[id];
  const used = new Set<string>();
  for (const sub of section.subs) for (const m of sub.metrics) if (indicator(m)) used.add(indicator(m)!.source);
  return (
    <>
      <p className="muted small section-blurb">{section.blurb}</p>
      {section.subs.map((sub) => {
        const lid = layerFor(id, sub.id);
        return (
          <section key={sub.id} className={`sub-card${layerId === lid ? ' is-on-map' : ''}`}>
            <div className="sub-head">
              <h3>{sub.label}</h3>
              <button
                type="button"
                className="sub-map"
                aria-pressed={layerId === lid}
                onClick={() => onLayer(lid)}
                title={`Color the map by ${sub.map.metric.toLowerCase()}`}
              >
                <MapIcon size={12} />
                {layerId === lid ? 'On map' : 'Map'}
              </button>
            </div>
            <SubExtra sub={sub} sectionId={id} c={c} {...rest} />
            {sub.metrics.map((m) => (
              <MetricRow key={m} id={m} country={c.name} />
            ))}
            {sub.ours && <Note>{sub.ours}</Note>}
            {sub.pending && <Note tone="warn">{sub.pending}</Note>}
            {sub.seeAlso && (
              <div className="see-also">
                Related:
                {sub.seeAlso.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => {
                      onTab(s.section);
                      onLayer(layerFor(s.section, s.sub));
                    }}
                  >
                    {s.label} <ArrowRight size={11} />
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })}
      <p className="footnote sources">
        <Info size={12} />
        <span>
          Sources:{' '}
          {[...used].map((s, i) => (
            <span key={s}>
              {i > 0 && ' · '}
              <a href={SOURCES[s]?.url} target="_blank" rel="noreferrer">
                {SOURCES[s]?.name}
              </a>{' '}
              ({SOURCES[s]?.licence})
            </span>
          ))}
          {id === 'trade' && ' · UN Comtrade'}
          {id === 'influence' && ' · FBIC Index (CC0)'}
          {id === 'risk' && indexSource('fsi') && ' · Fragile States Index'}
          . Retrieved {indicator(section.subs.flatMap((s) => s.metrics).find((m) => indicator(m)) ?? '')?.retrieved ?? '—'}.
        </span>
      </p>
    </>
  );
}

/** Extra content some subsections need beyond plain numbers. */
function SubExtra({
  sub,
  sectionId,
  c,
  profiles,
  trade,
  influence,
  onSelect,
}: {
  sub: Subsection;
  sectionId: SectionId;
  c: CountryProfile;
  profiles: Map<string, CountryProfile>;
  trade: TradeLink[];
  influence: InfluenceLink[];
  onSelect: (n: string) => void;
}) {
  const key = `${sectionId}.${sub.id}`;
  const display = nameOf(profiles);
  if (key === 'growth.outlook') {
    const o = outlookOf(c.name);
    return o ? (
      <div className={`outlook-strip outlook-${o.toLowerCase()} is-static`}>
        <span>Outlook</span>
        <strong>{o}</strong>
        <span className="muted">IMF forecast {FMT.pctSigned(nextYearGrowth(c.name))} next year</span>
      </div>
    ) : null;
  }
  if (key === 'growth.sectors') return <SectorBar c={c.name} />;
  if (key === 'trade.balance') {
    const b = tradeBalance(c.name);
    return Number.isFinite(b) ? (
      <div className="mrow">
        <div className="mrow-label">
          Trade balance<span className="mrow-unit">goods and services, % of GDP (computed)</span>
        </div>
        <div className="mrow-figure">
          <div className="mrow-value">{FMT.pctSigned(b)}</div>
        </div>
        <div className="mrow-meta">
          <span>{valueOf('exports', c.name)?.[1]}</span>
        </div>
      </div>
    ) : null;
  }
  if (key === 'trade.dependency') return <TradeList c={c} trade={trade} display={display} onSelect={onSelect} />;
  if (key === 'influence.network') return <InfluenceList c={c} influence={influence} display={display} onSelect={onSelect} />;
  if (key === 'influence.energy') {
    const links = supplyLinks(c, profiles);
    return links?.length ? (
      <LinkList
        title="Main suppliers"
        links={links}
        display={display}
        onSelect={onSelect}
        note={`Share of ${c.display}’s imports of each product group, UN Comtrade ${tradeSource(c.name)?.year ?? ''}.`}
      />
    ) : (
      <p className="muted small">Supplier links need UN Comtrade data, which is loaded for 58 countries so far.</p>
    );
  }
  if (key === 'risk.resilience') return <ResilienceBreakdown c={c} profiles={profiles} />;
  if (key === 'risk.shock') {
    const v = commodityExports(c.name);
    return Number.isFinite(v) ? (
      <div className="mrow">
        <div className="mrow-label">
          Commodity exports<span className="mrow-unit">fuel, ores and metals, % of goods exports (computed)</span>
        </div>
        <div className="mrow-figure">
          <div className="mrow-value">{FMT.pct(v)}</div>
        </div>
        <div className="mrow-meta" />
      </div>
    ) : null;
  }
  if (key === 'risk.social') {
    const fsi = indexSource('fsi')?.values[c.name];
    return fsi ? (
      <div className="mrow">
        <div className="mrow-label">
          Fragile States Index<span className="mrow-unit">total, 0–120, lower is more stable</span>
        </div>
        <div className="mrow-figure">
          <div className="mrow-value">{fsi[0].toFixed(1)}</div>
        </div>
        <div className="mrow-meta">
          <span>{fsi[1]}</span>
        </div>
      </div>
    ) : null;
  }
  return null;
}

const SECTOR_COLORS: Record<string, string> = {
  services: '#38bdf8',
  industry: '#a78bfa',
  agriculture: '#5fd39a',
};
function SectorBar({ c }: { c: string }) {
  const parts = (['services', 'industry', 'agriculture'] as const).map((id) => ({ id, v: valueOf(id, c)?.[0] ?? 0 }));
  const total = parts.reduce((s, p) => s + p.v, 0);
  if (total <= 0) return null;
  return (
    <div className="sector-bar" aria-label="Value added by sector">
      <div className="sector-track">
        {parts.map((p) => (
          <span key={p.id} style={{ width: `${(p.v / total) * 100}%`, background: SECTOR_COLORS[p.id] }} />
        ))}
      </div>
      <div className="sector-keys">
        {parts.map((p) => (
          <span key={p.id}>
            <i style={{ background: SECTOR_COLORS[p.id] }} />
            {indicator(p.id)?.label.split(',')[0]} {Math.round(p.v)}%
          </span>
        ))}
      </div>
    </div>
  );
}

const KIND_ORDER: LinkKind[] = ['exports', 'imports', 'energy', 'food', 'tech', 'capital', 'people'];

function LinkList({
  title,
  links,
  display,
  onSelect,
  note,
}: {
  title: string;
  links: TradeLink[];
  display: (n: string) => string;
  onSelect: (n: string) => void;
  note: React.ReactNode;
}) {
  const groups = KIND_ORDER.map((k) => ({ kind: k, items: links.filter((p) => p.kind === k) })).filter((g) => g.items.length);
  return (
    <div className="sub-links">
      <div className="sub-links-title">{title}</div>
      <div className="conn-groups">
        {groups.map((g) => (
          <div key={g.kind} className="conn-group">
            <div className="conn-kind" style={{ color: LINK_META[g.kind].color }}>
              {LINK_META[g.kind].label}
            </div>
            {g.items.map((p, i) => (
              <button key={`${p.name}-${i}`} type="button" className="conn-row" onClick={() => onSelect(p.name)}>
                <span className="conn-name">{display(p.name)}</span>
                <span className="conn-verb">{LINK_META[p.kind].verb}</span>
                <span className="bar">
                  <span style={{ width: `${Math.min(100, p.share)}%`, background: LINK_META[p.kind].color }} />
                </span>
                <span className="conn-share">{p.share}%</span>
              </button>
            ))}
          </div>
        ))}
      </div>
      <Note>{note}</Note>
    </div>
  );
}

function TradeList({
  c,
  trade,
  display,
  onSelect,
}: {
  c: CountryProfile;
  trade: TradeLink[];
  display: (n: string) => string;
  onSelect: (n: string) => void;
}) {
  const source = tradeSource(c.name);
  return source ? (
    <LinkList
      title={`Top ${trade.length} trade partners`}
      links={trade}
      display={display}
      onSelect={onSelect}
      note={
        <>
          Share of {c.display}’s goods trade (exports + imports) in {source.year}, from{' '}
          <a href={source.url} target="_blank" rel="noreferrer">
            UN Comtrade
          </a>
          , retrieved {source.retrieved}.
        </>
      }
    />
  ) : (
    <Note tone="warn">Partner-level trade is not loaded for {c.display} yet (UN Comtrade covers 58 countries so far).</Note>
  );
}

function InfluenceList({
  c,
  influence,
  display,
  onSelect,
}: {
  c: CountryProfile;
  influence: InfluenceLink[];
  display: (n: string) => string;
  onSelect: (n: string) => void;
}) {
  const fbic = influenceSource(c.name);
  return (
    <div className="sub-links">
      <div className="sub-links-title">Who {c.display} influences most</div>
      {influence.map((l, i) => (
        <button key={l.name} type="button" className="conn-row" onClick={() => onSelect(l.name)}>
          <span className="conn-name">
            <span className="rank">{i + 1}</span>
            {display(l.name)}
          </span>
          <span className="conn-verb">{INFLUENCE_LABEL[l.kind]}</span>
          <span className="bar">
            <span style={{ width: `${l.score}%`, background: INFLUENCE_COLOR }} />
          </span>
          <span className="conn-share">{l.score}</span>
        </button>
      ))}
      <Note>
        {fbic ? (
          <>
            Influence capacity (strongest = 100) from the{' '}
            <a href={fbic.sourceUrl} target="_blank" rel="noreferrer">
              FBIC Index
            </a>{' '}
            ({fbic.year}, Pardee Institute, {fbic.licence}).
          </>
        ) : (
          <>The FBIC Index does not cover {c.display}; this list is estimated from trade dependence.</>
        )}
      </Note>
    </div>
  );
}

function ResilienceBreakdown({ c, profiles }: { c: CountryProfile; profiles: Map<string, CountryProfile> }) {
  const res = resilience(c.name, [...profiles.keys()]);
  if (!res) return <Note tone="warn">Not enough inputs to score {c.display} (needs five of eight).</Note>;
  return (
    <div className="res">
      <div className="res-score">
        <strong>{Math.round(res.score)}</strong>
        <span>/ 100</span>
      </div>
      <ul className="res-parts">
        {res.parts.map(({ input, pct }) => (
          <li key={input.id}>
            <span>{input.label}</span>
            <span className="muted">{input.fmt(input.read(c.name))}</span>
            <span className="bar thin">
              <span style={{ width: `${pct}%`, background: pct >= 50 ? 'var(--good)' : pct >= 25 ? 'var(--warn)' : 'var(--bad)' }} />
            </span>
            <span className="res-pct">{Math.round(pct)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- news (illustrative) ---------- */

function News({ c }: { c: CountryProfile }) {
  return (
    <>
      <div className="illustrative-note">
        <Info size={12} /> Illustrative placeholder · no news feed is connected yet
      </div>
      <ul className="news-list">
        {c.issues.map((i) => (
          <li key={i.title}>
            <div className="news-top">
              <span className={`status status-${i.status.split(' ')[0].toLowerCase()}`}>{i.status}</span>
              <span className={`sev-label sev-text-${i.severity.toLowerCase()}`}>{i.severity} impact</span>
            </div>
            <div className="issue-title">{i.title}</div>
            <div className="issue-meta">
              Economic channel: <strong>{i.channel}</strong>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

