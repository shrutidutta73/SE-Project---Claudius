import { useRef, useState, useCallback } from 'react'
import LogoCropModal from './LogoCropModal'
import { getInitials } from '../../lib/utils'

interface Props {
  name: string
  avatar?: string | null
  size?: number
  onSave: (dataUrl: string) => void
}

export default function AvatarUpload({ name, avatar, size = 40, onSave }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rawSrc, setRawSrc] = useState<string | null>(null)
  const [hovered, setHovered] = useState(false)
  const onEnter = useCallback(() => setHovered(true), [])
  const onLeave = useCallback(() => setHovered(false), [])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setRawSrc(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const fontSize = Math.round(size * 0.35)

  return (
    <>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        style={{ position: 'relative', width: size, height: size, borderRadius: '50%', flexShrink: 0, border: 'none', padding: 0, cursor: 'pointer' }}
        title="Upload photo"
      >
        {/* Avatar or initials */}
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: size, height: size, borderRadius: '50%',
            background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize, fontWeight: 700,
          }}>
            {getInitials(name)}
          </div>
        )}

        {/* Camera overlay */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'rgba(0,0,0,0.38)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.15s',
        }}>
          <svg width={Math.round(size * 0.35)} height={Math.round(size * 0.35)} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>

      </button>

      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

      {rawSrc && (
        <LogoCropModal
          src={rawSrc}
          shape="circle"
          onConfirm={dataUrl => { onSave(dataUrl); setRawSrc(null) }}
          onClose={() => setRawSrc(null)}
        />
      )}
    </>
  )
}
