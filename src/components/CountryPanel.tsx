import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronRight, Info, MoveRight, X } from 'lucide-react';
import { history, LINK_META, type CountryProfile, type LinkKind } from '../data/countries';
import { INFLUENCE_COLOR, INFLUENCE_LABEL, tradeSource, type InfluenceLink, type TradeLink } from '../data/connections';
import { pathway, riskProfile, SHOCKS, type ShockId, type StepLevel } from '../data/risk';
import { Flag } from './Flag';
import { ScorecardTab } from './Scorecard';
import { Sparkline, TREND_BAD, TREND_GOOD, TREND_NEUTRAL } from './Sparkline';

export type CountryTab = 'overview' | 'scorecard' | 'economy' | 'trade' | 'risk' | 'news';

const TABS: { id: CountryTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'scorecard', label: 'Scorecard' },
  { id: 'economy', label: 'Economy' },
  { id: 'trade', label: 'Connections' },
  { id: 'risk', label: 'Risk' },
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
}

export function CountryPanel({ country, profiles, tab, onTab, onSelect, onClose, trade, influence }: Props) {
  const nameOf = (n: string) => profiles.get(n)?.display ?? n;
  return (
    <div className="panel-body fade-in" key={country.name}>
      <div className="country-head">
        <Flag country={country} size="lg" />
        <div>
          <h2>{country.display}</h2>
          <div className="muted">
            {country.region} · Country intelligence
          </div>
        </div>
        <button type="button" className="icon-btn" aria-label="Close country view" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="illustrative-note">
        <Info size={12} />
        {country.curated
          ? 'Illustrative values · not live, not sourced'
          : 'Generated placeholder values · not live, not sourced'}
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
        {tab === 'overview' && <Overview c={country} nameOf={nameOf} onTab={onTab} onSelect={onSelect} />}
        {tab === 'scorecard' && <ScorecardTab c={country} />}
        {tab === 'economy' && <Economy c={country} />}
        {tab === 'trade' && (
          <Connections c={country} trade={trade} influence={influence} nameOf={nameOf} onSelect={onSelect} />
        )}
        {tab === 'risk' && <Risk c={country} nameOf={nameOf} />}
        {tab === 'news' && <News c={country} />}
      </div>
    </div>
  );
}

/* ---------- shared bits ---------- */

function trendOf(series: number[]) {
  const recent = series[series.length - 1];
  const earlier = series.slice(0, 4).reduce((s, v) => s + v, 0) / 4;
  const diff = recent - earlier;
  return Math.abs(diff) < 0.15 * Math.max(1, Math.abs(earlier) / 4) ? 'flat' : diff > 0 ? 'up' : 'down';
}

interface MetricProps {
  label: string;
  value: string;
  sub: string;
  series: number[];
  /** Is a rising value good news? null when neutral. */
  upIsGood: boolean | null;
  words: { up: string; down: string; flat: string };
}

function Trend({ series, upIsGood, words, width = 52 }: Pick<MetricProps, 'series' | 'upIsGood' | 'words'> & { width?: number }) {
  const t = trendOf(series);
  const good = t === 'flat' || upIsGood === null ? null : (t === 'up') === upIsGood;
  const color = good === null ? TREND_NEUTRAL : good ? TREND_GOOD : TREND_BAD;
  const Arrow = t === 'up' ? ArrowUpRight : t === 'down' ? ArrowDownRight : MoveRight;
  return (
    <div className="metric-foot">
      <span className="metric-trend" style={{ color }}>
        <Arrow size={12} />
        {words[t]}
      </span>
      <Sparkline values={series} color={color} width={width} height={18} />
    </div>
  );
}

function Metric({ label, value, sub, ...trend }: MetricProps) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <Trend {...trend} />
      <div className="metric-sub">{sub}</div>
    </div>
  );
}

/** GDP and GDP growth lead every country view; everything else is secondary. */
function PrimaryMetrics({ c }: { c: CountryProfile }) {
  return (
    <div className="metric-primary">
      <div>
        <div className="pm-label">GDP</div>
        <div className="pm-value">{fmtGdp(c.gdp)}</div>
        <div className="metric-sub">Nominal · ${c.gdpPc.toLocaleString('en-US')} per person</div>
      </div>
      <div>
        <div className="pm-label">GDP growth</div>
        <div className="pm-value">{signed(c.growth)}</div>
        <Trend
          series={history(c.name + 'g', c.growth, 2)}
          upIsGood
          words={{ up: 'Accelerating', down: 'Slowing', flat: 'Steady' }}
          width={60}
        />
      </div>
    </div>
  );
}

const fmtGdp = (bn: number) => (bn >= 1000 ? `$${(bn / 1000).toFixed(1)}T` : `$${Math.round(bn)}B`);
const signed = (v: number, unit = '%') => `${v > 0 ? '+' : ''}${v.toFixed(1)}${unit}`;

/* ---------- tabs ---------- */

function Overview({
  c,
  nameOf,
  onTab,
  onSelect,
}: {
  c: CountryProfile;
  nameOf: (n: string) => string;
  onTab: (t: CountryTab) => void;
  onSelect: (n: string) => void;
}) {
  const risk = riskProfile(c);
  const exposure = risk[0];
  return (
    <>
      <PrimaryMetrics c={c} />
      <div className="group-label">Other indicators</div>
      <div className="metric-grid">
        <Metric
          label="Inflation"
          value={`${c.inflation.toFixed(1)}%`}
          sub="Consumer prices, y/y"
          series={history(c.name + 'i', c.inflation, Math.max(1, c.inflation / 3))}
          upIsGood={false}
          words={{ up: 'Accelerating', down: 'Easing', flat: 'Stable' }}
        />
        <Metric
          label="Public debt"
          value={`${Math.round(c.debt)}%`}
          sub="General government, % GDP"
          series={history(c.name + 'd', c.debt, 6)}
          upIsGood={false}
          words={{ up: 'Rising', down: 'Falling', flat: 'Stabilizing' }}
        />
        <Metric
          label="Current account"
          value={signed(c.currentAccount)}
          sub="% of GDP · not the fiscal balance"
          series={history(c.name + 'ca', c.currentAccount, 1.5)}
          upIsGood
          words={{ up: 'Improving', down: 'Widening gap', flat: 'Stable' }}
        />
        <div className="metric">
          <div className="metric-label">External exposure</div>
          <div className={`metric-value level level-${exposure.level.toLowerCase()}`}>{exposure.level}</div>
          <button type="button" className="metric-link" onClick={() => onTab('risk')}>
            See what drives it <ChevronRight size={13} />
          </button>
          <div className="metric-sub">Dependencies to investigate</div>
        </div>
      </div>


      <section className="panel-section">
        <div className="section-title">
          <h3>What matters now</h3>
          <button type="button" className="link" onClick={() => onTab('news')}>
            All issues <ArrowRight size={13} />
          </button>
        </div>
        <ul className="issue-list">
          {c.issues.map((i) => (
            <li key={i.title}>
              <span className={`sev sev-${i.severity.toLowerCase()}`} />
              <div>
                <div className="issue-title">{i.title}</div>
                <div className="issue-meta">
                  Channel: {i.channel} · <span className={`status-text status-${i.status.split(' ')[0].toLowerCase()}`}>{i.status}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel-section">
        <div className="section-title">
          <h3>Who influences {c.display}?</h3>
          <button type="button" className="link" onClick={() => onTab('trade')}>
            All connections <ArrowRight size={13} />
          </button>
        </div>
        <div className="partner-chips">
          {c.partners.slice(0, 5).map((p, i) => (
            <button
              key={`${p.name}-${p.kind}-${i}`}
              type="button"
              className="partner-chip"
              style={{ ['--c' as string]: LINK_META[p.kind].color }}
              onClick={() => onSelect(p.name)}
            >
              <span className="partner-dot" />
              <span>{nameOf(p.name)}</span>
              <small>{LINK_META[p.kind].label}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel-section">
        <div className="section-title">
          <h3>How resilient is it?</h3>
          <button type="button" className="link" onClick={() => onTab('risk')}>
            Run a shock <ArrowRight size={13} />
          </button>
        </div>
        <div className="dim-mini">
          {risk.map((d) => (
            <div key={d.key} className="dim-mini-item">
              <span className="muted">{d.title}</span>
              <span className={`level level-${(d.key === 'resilience' ? invert(d.level) : d.level).toLowerCase()}`}>{d.level}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/** For resilience, "High" is good news, so color it like a low risk. */
function invert(level: string) {
  return ({ Low: 'High', Moderate: 'Elevated', Elevated: 'Moderate', High: 'Low' } as Record<string, string>)[level] ?? level;
}

function Economy({ c }: { c: CountryProfile }) {
  return (
    <>
      <PrimaryMetrics c={c} />
      <div className="group-label">Other indicators</div>
      <div className="metric-grid">
        <Metric label="Inflation" value={`${c.inflation.toFixed(1)}%`} sub="Consumer prices, y/y" series={history(c.name + 'i', c.inflation, Math.max(1, c.inflation / 3))} upIsGood={false} words={{ up: 'Accelerating', down: 'Easing', flat: 'Stable' }} />
        <Metric label="Unemployment" value={`${c.unemployment.toFixed(1)}%`} sub="Of labor force" series={history(c.name + 'u', c.unemployment, 1)} upIsGood={false} words={{ up: 'Rising', down: 'Falling', flat: 'Stable' }} />
        <Metric label="Public debt" value={`${Math.round(c.debt)}%`} sub="General government, % GDP" series={history(c.name + 'd', c.debt, 6)} upIsGood={false} words={{ up: 'Rising', down: 'Falling', flat: 'Stabilizing' }} />
        <Metric label="Fiscal balance" value={signed(c.fiscal)} sub="Government budget, % GDP" series={history(c.name + 'f', c.fiscal, 1.5)} upIsGood words={{ up: 'Narrowing', down: 'Widening', flat: 'Stable' }} />
        <Metric label="Current account" value={signed(c.currentAccount)} sub="External balance, % GDP" series={history(c.name + 'ca', c.currentAccount, 1.5)} upIsGood words={{ up: 'Improving', down: 'Widening gap', flat: 'Stable' }} />
      </div>
      <p className="footnote">
        <Info size={12} /> The fiscal balance is the government’s budget. The current account covers trade, income and transfers
        with the rest of the world. They are different deficits and are labeled separately.
      </p>
    </>
  );
}

const KIND_ORDER: LinkKind[] = ['exports', 'imports', 'energy', 'food', 'tech', 'capital', 'people'];

function Connections({
  c,
  trade,
  influence,
  nameOf,
  onSelect,
}: {
  c: CountryProfile;
  trade: TradeLink[];
  influence: InfluenceLink[];
  nameOf: (n: string) => string;
  onSelect: (n: string) => void;
}) {
  const source = tradeSource(c.name);
  const groups = useMemo(
    () => KIND_ORDER.map((k) => ({ kind: k, items: trade.filter((p) => p.kind === k) })).filter((g) => g.items.length),
    [trade],
  );
  return (
    <>
      {c.leverageNote && (
        <div className="leverage-card">
          <span className="eyebrow">Leverage</span>
          <p>{c.leverageNote}</p>
        </div>
      )}
      <div className="section-title">
        <h3>Top {trade.length} trade connections</h3>
        <span className="pill">{source ? `UN Comtrade ${source.year}` : 'Placeholder'}</span>
      </div>
      <div className="conn-groups">
        {groups.map((g) => (
          <div key={g.kind} className="conn-group">
            <div className="conn-kind" style={{ color: LINK_META[g.kind].color }}>
              {LINK_META[g.kind].label}
            </div>
            {g.items.map((p, i) => (
              <button key={`${p.name}-${i}`} type="button" className="conn-row" onClick={() => onSelect(p.name)}>
                <span className="conn-name">{nameOf(p.name)}</span>
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
      <p className="footnote">
        <Info size={12} />{' '}
        {source ? (
          <>
            Share of {c.display}’s goods trade (exports + imports) in {source.year}, from{' '}
            <a href={source.url} target="_blank" rel="noreferrer">
              UN Comtrade
            </a>
            , retrieved {source.retrieved}. Energy, food and chips are tagged when they dominate what it buys from a partner.
          </>
        ) : (
          'Placeholder partners: real trade data is not loaded for this country yet.'
        )}
      </p>
      <section className="panel-section">
        <div className="section-title">
          <h3>Who {c.display} influences most</h3>
          <span className="pill">Top {influence.length}</span>
        </div>
        {influence.map((l, i) => (
          <button key={l.name} type="button" className="conn-row" onClick={() => onSelect(l.name)}>
            <span className="conn-name">
              <span className="rank">{i + 1}</span>
              {nameOf(l.name)}
            </span>
            <span className="conn-verb">{INFLUENCE_LABEL[l.kind]}</span>
            <span className="bar">
              <span style={{ width: `${l.score}%`, background: INFLUENCE_COLOR }} />
            </span>
            <span className="conn-share">{l.score}</span>
          </button>
        ))}
        <p className="footnote">
          <Info size={12} /> Relative influence score (strongest = 100), based on how much each country’s trade depends on{' '}
          {c.display}. {source ? `From UN Comtrade, ${source.year}.` : 'Illustrative.'}
        </p>
      </section>
      <section className="panel-section">
        <div className="section-title">
          <h3>Notable companies & sectors</h3>
        </div>
        {c.companies.length ? (
          <ul className="company-list">
            {c.companies.map((co) => (
              <li key={co.name}>
                <span className="company-mark">{co.name.slice(0, 1)}</span>
                <div>
                  <div className="company-name">{co.name}</div>
                  <div className="muted small">
                    {co.sector} · {co.note}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">Company coverage for this country is not in the prototype yet.</p>
        )}
      </section>
    </>
  );
}

const STEP_CLASS: Record<StepLevel, string> = {
  Low: 'low',
  Moderate: 'moderate',
  Elevated: 'elevated',
  High: 'high',
  Offsetting: 'offset',
};

function Risk({ c, nameOf }: { c: CountryProfile; nameOf: (n: string) => string }) {
  const [shock, setShock] = useState<ShockId>('market');
  const dims = riskProfile(c);
  const steps = pathway(c, shock, nameOf);
  return (
    <>
      <div className="dims">
        {dims.map((d) => (
          <div key={d.key} className="dim">
            <div className="dim-head">
              <div>
                <div className="dim-title">{d.title}</div>
                <div className="muted small">{d.question}</div>
              </div>
              <span className={`level level-${(d.key === 'resilience' ? invert(d.level) : d.level).toLowerCase()}`}>{d.level}</span>
            </div>
            <ul className="factors">
              {d.factors.map((f) => (
                <li key={f.label}>
                  <span>{f.label}</span>
                  <span className="muted">{f.detail}</span>
                  <span className="bar thin">
                    <span style={{ width: `${f.weight}%` }} className={`fill-${d.key}`} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <section className="panel-section">
        <div className="section-title">
          <h3>What-if shock explorer</h3>
        </div>
        <div className="shock-picker" role="radiogroup" aria-label="Shock scenario">
          {SHOCKS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={shock === s.id}
              className={shock === s.id ? 'is-active' : undefined}
              onClick={() => setShock(s.id)}
            >
              {s.short}
            </button>
          ))}
        </div>
        <ol className="pathway" key={shock}>
          {steps.map((s, i) => (
            <li key={s.title} style={{ animationDelay: `${i * 0.08}s` }}>
              <span className={`step-dot step-${STEP_CLASS[s.level]}`} />
              <div>
                <div className="step-title">
                  {s.title}
                  <span className={`step-tag step-${STEP_CLASS[s.level]}`}>{s.level === 'Offsetting' ? 'Offsetting' : `${s.level} exposure`}</span>
                </div>
                <div className="muted small">{s.detail}</div>
              </div>
            </li>
          ))}
        </ol>
        <p className="footnote">
          <Info size={12} /> Illustrative pathway showing channels, not a prediction. Actual effects depend on the country and the
          shock.
        </p>
      </section>
    </>
  );
}

function News({ c }: { c: CountryProfile }) {
  return (
    <>
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
            <div className="source-row">
              <span className="source-chip">Original reporting · link pending</span>
              <span className="muted small">Updated —</span>
            </div>
          </li>
        ))}
      </ul>
      <p className="footnote">
        <Info size={12} /> Verified events, developing stories and online sentiment are kept separate. Social media users are not
        representative of a whole population.
      </p>
    </>
  );
}
