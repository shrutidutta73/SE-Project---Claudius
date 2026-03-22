import { useState } from 'react'
import Input from '../ui/Input'
import Button from '../ui/Button'

interface Props {
  onWipe: (password: string) => void
}

export default function DangerZone({ onWipe }: Props) {
  const [password, setPassword] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password) return
    onWipe(password)
    setPassword('')
  }

  return (
    <div
      className="card border-l-4 px-5 py-5"
      style={{ borderLeftColor: 'var(--danger)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <h3 className="font-bold text-sm text-[var(--danger)]">Danger Zone</h3>
      </div>

      <p className="text-xs text-[var(--text-2)] leading-relaxed mb-4">
        <strong className="text-[var(--danger)]">This action is irreversible.</strong>{' '}
        Initiating a data wipe will permanently delete all non-GST-protected records from the system.
        There is no undo. Enter your owner password to confirm.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Owner Password"
          type="password"
          placeholder="Enter password to confirm"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <Button
          variant="secondary"
          type="submit"
          disabled={password.length === 0}
          className="self-start"
        >
          Initiate Data Wipe
        </Button>
      </form>
    </div>
  )
}
