import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  BadgeCheck,
  Ban,
  Blocks,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileJson,
  Filter,
  Gauge,
  KeyRound,
  Landmark,
  LockKeyhole,
  Network,
  Play,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  WalletCards,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  agents,
  attachTransaction,
  counterparties,
  createPolicyManifest,
  createSdkSnippet,
  evaluatePreflight,
  pharosChain,
  policies,
  scenarioActions,
  type ComplianceReceipt,
  type CredentialKind,
  type Decision,
  type PreflightAction,
} from './trustrail'
import './App.css'

const scenarioLabels: Record<string, string> = {
  'x402-data': 'x402 data access',
  'rwa-pool': 'RWA subscription',
  payroll: 'Stablecoin payroll',
  blocked: 'Blocked bridge',
}

const decisionIcon: Record<Decision, typeof CheckCircle2> = {
  ALLOW: CheckCircle2,
  WARN: AlertTriangle,
  BLOCK: XCircle,
}

const allCredentials: CredentialKind[] = [
  'zk_kyc',
  'aml_screen',
  'agent_mandate_signature',
  'travel_rule_attestation',
]

function App() {
  const [policyId, setPolicyId] = useState(policies[0].id)
  const [agentId, setAgentId] = useState(agents[0].id)
  const [scenarioId, setScenarioId] = useState('x402-data')
  const [action, setAction] = useState<PreflightAction>(scenarioActions['x402-data'])
  const [receipt, setReceipt] = useState<ComplianceReceipt | null>(null)
  const [history, setHistory] = useState<ComplianceReceipt[]>([])
  const [copied, setCopied] = useState('')
  const [toast, setToast] = useState('')

  const policy = policies.find((item) => item.id === policyId) ?? policies[0]
  const agent = agents.find((item) => item.id === agentId) ?? agents[0]
  const counterparty = counterparties.find((item) => item.id === action.recipientId) ?? counterparties[0]
  const manifest = useMemo(() => JSON.stringify(createPolicyManifest(policy), null, 2), [policy])
  const sdkSnippet = useMemo(() => createSdkSnippet(policy, agent, action), [action, agent, policy])
  const allowedCount = history.filter((item) => item.decision === 'ALLOW').length
  const reviewCount = history.filter((item) => item.decision === 'WARN').length
  const blockedCount = history.filter((item) => item.decision === 'BLOCK').length
  const activeReceipt = receipt ?? history[0]

  async function runPreflight(nextAction = action, announce = true) {
    const nextReceipt = await evaluatePreflight(policy, agent, nextAction)
    setReceipt(nextReceipt)
    setHistory((current) => [nextReceipt, ...current].slice(0, 12))
    if (announce) {
      setToast(`Preflight ${nextReceipt.decision.toLowerCase()}: ${nextReceipt.reasonCodes[0]}`)
    }
  }

  async function simulateSettlement() {
    if (!receipt || receipt.decision === 'BLOCK') {
      setToast('Blocked actions cannot be settled')
      return
    }

    const txHash = `0x${Math.random().toString(16).slice(2).padEnd(64, '0')}`
    const settled = await attachTransaction(receipt, txHash, 'confirmed')
    setReceipt(settled)
    setHistory((current) => [settled, ...current.filter((item) => item.id !== receipt.id)].slice(0, 12))
    setToast('Settlement receipt confirmed')
  }

  function selectScenario(id: string) {
    const nextAction = scenarioActions[id]
    setScenarioId(id)
    setAction(nextAction)
    setCopied('')
    void runPreflight(nextAction, false)
    setToast(`${scenarioLabels[id]} loaded`)
  }

  function updateAmount(value: string) {
    const amountUsd = Number(value)
    setAction((current) => ({ ...current, amountUsd: Number.isFinite(amountUsd) ? amountUsd : 0 }))
  }

  function updateRecipient(recipientId: string) {
    setAction((current) => ({ ...current, recipientId }))
  }

  function toggleCredential(credential: CredentialKind) {
    setAction((current) => ({
      ...current,
      credentials: current.credentials.includes(credential)
        ? current.credentials.filter((item) => item !== credential)
        : [...current.credentials, credential],
    }))
  }

  async function copyText(name: string, value: string) {
    await navigator.clipboard.writeText(value)
    setCopied(name)
    setToast(`${name} copied`)
  }

  function exportReceipt() {
    const payload = JSON.stringify(activeReceipt ?? {}, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${activeReceipt?.id ?? 'trustrail-receipt'}.json`
    link.click()
    URL.revokeObjectURL(url)
    setToast('Receipt exported')
  }

  const DecisionIcon = decisionIcon[activeReceipt?.decision ?? 'WARN']

  return (
    <main className="app-shell">
      <aside className="rail">
        <div className="brand-lockup">
          <div className="brand-mark">
            <ShieldCheck size={28} />
          </div>
          <div>
            <strong>Pharos TrustRail</strong>
            <span>Agent action gateway</span>
          </div>
        </div>

        <nav aria-label="Product sections">
          <button className="active" type="button">
            <Activity size={17} />
            Operations
          </button>
          <button type="button">
            <SlidersHorizontal size={17} />
            Policies
          </button>
          <button type="button">
            <ReceiptText size={17} />
            Receipts
          </button>
          <button type="button">
            <Blocks size={17} />
            Skill API
          </button>
        </nav>

        <section className="rail-status" aria-label="Pharos network status">
          <Network size={19} />
          <strong>{pharosChain.network}</strong>
          <span>Chain ID {pharosChain.chainId}</span>
          <small>Policy registry ready</small>
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">RealFi control plane</span>
            <h1>Compliance preflight before autonomous agents move value.</h1>
          </div>
          <div className="topbar-actions">
            <button type="button" onClick={() => void runPreflight()} data-testid="run-preflight">
              <Play size={17} />
              Run preflight
            </button>
            <button type="button" onClick={simulateSettlement} data-testid="settle-action">
              <Landmark size={17} />
              Settle
            </button>
            <button type="button" onClick={exportReceipt}>
              <ArrowDownToLine size={17} />
              Export
            </button>
          </div>
        </header>

        <section className="decision-strip">
          <article className={`decision-panel ${activeReceipt?.decision.toLowerCase() ?? 'warn'}`}>
            <div>
              <DecisionIcon size={32} />
              <span>Current decision</span>
            </div>
            <strong data-testid="current-decision">{activeReceipt?.decision ?? 'PENDING'}</strong>
            <p>{activeReceipt?.reasonCodes.slice(0, 3).join(' / ') ?? 'Run a preflight to create the first receipt.'}</p>
          </article>

          <Metric icon={CheckCircle2} label="Allowed" value={String(allowedCount)} tone="allow" />
          <Metric icon={AlertTriangle} label="Needs review" value={String(reviewCount)} tone="warn" />
          <Metric icon={Ban} label="Blocked" value={String(blockedCount)} tone="block" />
          <Metric icon={Gauge} label="Daily spend" value={`$${agent.dailySpentUsd.toLocaleString()}`} tone="neutral" />
        </section>

        <section className="layout-grid">
          <section className="panel span-4">
            <PanelHeader icon={Filter} label="RealFi templates" />
            <div className="scenario-list">
              {Object.entries(scenarioActions).map(([id, item]) => (
                <button
                  className={scenarioId === id ? 'active' : ''}
                  type="button"
                  key={id}
                  onClick={() => selectScenario(id)}
                  data-testid={`scenario-${id}`}
                >
                  <span>{scenarioLabels[id]}</span>
                  <strong>{item.action.replaceAll('_', ' ')}</strong>
                  <small>
                    {item.asset} ${item.amountUsd.toLocaleString()}
                  </small>
                </button>
              ))}
            </div>
          </section>

          <section className="panel span-4">
            <PanelHeader icon={ClipboardCheck} label="Policy-as-code" />
            <label className="field">
              <span>Policy</span>
              <select value={policyId} onChange={(event) => setPolicyId(event.target.value)}>
                {policies.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <dl className="policy-facts">
              <div>
                <dt>Single limit</dt>
                <dd>${policy.maxSingleUsd.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Daily limit</dt>
                <dd>${policy.dailyLimitUsd.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Assets</dt>
                <dd>{policy.allowedAssets.join(', ')}</dd>
              </div>
            </dl>
          </section>

          <section className="panel span-4">
            <PanelHeader icon={WalletCards} label="Agent identity" />
            <label className="field">
              <span>Agent</span>
              <select value={agentId} onChange={(event) => setAgentId(event.target.value)}>
                {agents.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="agent-card">
              <strong>{agent.operator}</strong>
              <span>{agent.wallet}</span>
              <em>Trust score {agent.trustScore}</em>
            </div>
          </section>

          <section className="panel span-5">
            <PanelHeader icon={KeyRound} label="Preflight request" />
            <div className="form-grid">
              <label className="field">
                <span>Amount USD</span>
                <input value={action.amountUsd} type="number" min="0" onChange={(event) => updateAmount(event.target.value)} />
              </label>
              <label className="field">
                <span>Asset</span>
                <select value={action.asset} onChange={(event) => setAction((current) => ({ ...current, asset: event.target.value }))}>
                  {['USDC', 'USDT', 'PHRS', 'PROS', 'ETH'].map((asset) => (
                    <option value={asset} key={asset}>
                      {asset}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field wide">
                <span>Counterparty</span>
                <select value={action.recipientId} onChange={(event) => updateRecipient(event.target.value)}>
                  {counterparties.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="counterparty">
              <BadgeCheck size={20} />
              <div>
                <strong>{counterparty.label}</strong>
                <span>
                  {counterparty.jurisdiction} / {counterparty.kycTier} / {counterparty.risk}
                </span>
              </div>
            </div>
            <div className="credential-grid">
              {allCredentials.map((credential) => (
                <button
                  className={action.credentials.includes(credential) ? 'active' : ''}
                  type="button"
                  key={credential}
                  onClick={() => toggleCredential(credential)}
                >
                  <LockKeyhole size={16} />
                  {credential.replaceAll('_', ' ')}
                </button>
              ))}
            </div>
          </section>

          <section className="panel span-7">
            <PanelHeader icon={ReceiptText} label="Signed compliance receipt" />
            <div className="receipt-shell">
              <div className="receipt-summary">
                <span>{activeReceipt?.id ?? 'No receipt yet'}</span>
                <strong>{activeReceipt?.receiptHash ?? 'Run a preflight'}</strong>
              </div>
              <div className="reason-grid">
                {(activeReceipt?.reasonCodes ?? ['ACTION_ALLOWED']).map((reason) => (
                  <span className={reason.includes('EXCEEDED') || reason.includes('BLOCKED') || reason.includes('NOT') ? 'bad' : reason.includes('MISSING') || reason.includes('REVIEW') ? 'watch' : 'good'} key={reason}>
                    {reason}
                  </span>
                ))}
              </div>
              <ol className="execution-plan">
                {(activeReceipt?.safeExecutionPlan ?? ['Preflight has not been run.']).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          </section>

          <section className="panel span-6">
            <PanelHeader icon={FileJson} label="Skill SDK" />
            <pre className="code-block">{sdkSnippet}</pre>
            <div className="button-row">
              <button type="button" onClick={() => copyText('SDK snippet', sdkSnippet)}>
                <Copy size={16} />
                {copied === 'SDK snippet' ? 'Copied' : 'Copy SDK'}
              </button>
            </div>
          </section>

          <section className="panel span-6">
            <PanelHeader icon={ShieldCheck} label="Policy manifest" />
            <pre className="code-block">{manifest}</pre>
            <div className="button-row">
              <button type="button" onClick={() => copyText('Policy manifest', manifest)}>
                <Copy size={16} />
                {copied === 'Policy manifest' ? 'Copied' : 'Copy manifest'}
              </button>
              <button type="button" onClick={() => void runPreflight()}>
                <RefreshCw size={16} />
                Recheck
              </button>
            </div>
          </section>

          <section className="panel span-12">
            <PanelHeader icon={Activity} label="Operator activity" />
            <div className="activity-table" role="table" aria-label="TrustRail receipts">
              <div role="row" className="table-head">
                <span>Receipt</span>
                <span>Template</span>
                <span>Decision</span>
                <span>Counterparty</span>
                <span>Status</span>
              </div>
              {history.map((item) => (
                <div role="row" key={`${item.id}-${item.receiptHash}`}>
                  <span>{item.id}</span>
                  <span>{item.action.action.replaceAll('_', ' ')}</span>
                  <span className={`pill ${item.decision.toLowerCase()}`}>{item.decision}</span>
                  <span>{item.counterparty.label}</span>
                  <span>{item.status}</span>
                </div>
              ))}
            </div>
          </section>
        </section>

        {toast ? <div className="toast" role="status">{toast}</div> : null}
      </section>
    </main>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Activity
  label: string
  value: string
  tone: 'allow' | 'warn' | 'block' | 'neutral'
}) {
  return (
    <article className={`metric ${tone}`}>
      <Icon size={19} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function PanelHeader({ icon: Icon, label }: { icon: typeof Activity; label: string }) {
  return (
    <header className="panel-header">
      <Icon size={18} />
      <h2>{label}</h2>
    </header>
  )
}

export default App
