import { useState, useEffect, useRef } from 'react'

const CROP_SIZE = 256

interface Props {
  src: string
  shape?: 'square' | 'circle'
  onConfirm: (dataUrl: string) => void
  onClose: () => void
}

export default function LogoCropModal({ src, shape = 'square', onConfirm, onClose }: Props) {
  const [scale,     setScale]     = useState(1)
  const [offset,    setOffset]    = useState({ x: 0, y: 0 })
  const [minScale,  setMinScale]  = useState(1)
  const [dragging,  setDragging]  = useState(false)
  const [animate,   setAnimate]   = useState(false)
  const dragOrigin = useRef({ mx: 0, my: 0, ox: 0, oy: 0 })
  const imgRef     = useRef<HTMLImageElement>(null)

  // Slide-up animation
  useEffect(() => { const id = requestAnimationFrame(() => setAnimate(true)); return () => cancelAnimationFrame(id) }, [])

  // Compute min scale so image always fills the crop square
  useEffect(() => {
    const img = new Image()
    img.src = src
    img.onload = () => {
      const fill = Math.max(1, img.width / img.height)
      setMinScale(fill)
      setScale(fill)
      setOffset({ x: 0, y: 0 })
    }
  }, [src])

  // Clamp offset so image never leaves the crop window
  function clamp(val: number, min: number, max: number) { return Math.max(min, Math.min(max, val)) }

  function clampOffset(ox: number, oy: number, sc: number) {
    const img = imgRef.current
    if (!img) return { x: ox, y: oy }
    const rendW = CROP_SIZE * sc
    const rendH = (img.naturalHeight / img.naturalWidth) * rendW
    const maxX = Math.max(0, (rendW  - CROP_SIZE) / 2)
    const maxY = Math.max(0, (rendH  - CROP_SIZE) / 2)
    return { x: clamp(ox, -maxX, maxX), y: clamp(oy, -maxY, maxY) }
  }

  // Mouse drag
  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    setDragging(true)
    dragOrigin.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y }
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return
    const dx = e.clientX - dragOrigin.current.mx
    const dy = e.clientY - dragOrigin.current.my
    setOffset(clampOffset(dragOrigin.current.ox + dx, dragOrigin.current.oy + dy, scale))
  }
  function onMouseUp() { setDragging(false) }

  // Touch drag
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    setDragging(true)
    dragOrigin.current = { mx: t.clientX, my: t.clientY, ox: offset.x, oy: offset.y }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!dragging) return
    const t = e.touches[0]
    const dx = t.clientX - dragOrigin.current.mx
    const dy = t.clientY - dragOrigin.current.my
    setOffset(clampOffset(dragOrigin.current.ox + dx, dragOrigin.current.oy + dy, scale))
  }

  function handleScale(v: number) {
    setScale(v)
    setOffset(o => clampOffset(o.x, o.y, v))
  }

  function handleConfirm() {
    const img = imgRef.current
    if (!img) return
    const canvas = document.createElement('canvas')
    canvas.width  = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    const rendW    = CROP_SIZE * scale
    const rendH    = (img.naturalHeight / img.naturalWidth) * rendW
    const scaleImg = img.naturalWidth / rendW
    const sx = (rendW  / 2 - CROP_SIZE / 2 - offset.x) * scaleImg
    const sy = (rendH  / 2 - CROP_SIZE / 2 - offset.y) * scaleImg
    const sw = CROP_SIZE * scaleImg
    const sh = CROP_SIZE * scaleImg
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 256, 256)
    onConfirm(canvas.toDataURL('image/png'))
  }

  function handleClose() {
    setAnimate(false)
    setTimeout(onClose, 260)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          opacity: animate ? 1 : 0,
          transition: 'opacity 0.22s ease',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 61,
          background: 'var(--surface)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
          maxWidth: 520,
          margin: '0 auto',
          transform: animate ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.28s cubic-bezier(0.32,0.72,0,1)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        <div className="px-6 pb-8 flex flex-col gap-5">
          <div>
            <p className="font-bold text-base" style={{ color: 'var(--text-1)' }}>{shape === 'circle' ? 'Adjust photo' : 'Adjust logo'}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Drag to reposition · Slide to zoom</p>
          </div>

          {/* Crop window */}
          <div
            style={{
              width: CROP_SIZE, height: CROP_SIZE,
              borderRadius: 16,
              overflow: 'hidden',
              position: 'relative',
              cursor: dragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              margin: '0 auto',
              background: 'var(--bg)',
              flexShrink: 0,
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onMouseUp}
          >
            <img
              ref={imgRef}
              src={src}
              draggable={false}
              alt="crop preview"
              style={{
                position: 'absolute',
                width: CROP_SIZE * scale,
                maxWidth: 'none',
                pointerEvents: 'none',
                top: '50%',
                left: '50%',
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
            />
            {/* Shape guide */}
            {shape === 'circle' ? (
              <>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: 'inset 0 0 0 2px rgba(79,70,229,0.5)' }} />
                {/* Darken corners outside circle */}
                <div style={{ position: 'absolute', inset: 0, borderRadius: 0, background: 'rgba(0,0,0,0.45)', WebkitMaskImage: 'radial-gradient(circle at 50% 50%, transparent 49.5%, black 50%)', maskImage: 'radial-gradient(circle at 50% 50%, transparent 49.5%, black 50%)' }} />
              </>
            ) : (
              <div style={{ position: 'absolute', inset: 0, borderRadius: 16, boxShadow: 'inset 0 0 0 2px rgba(79,70,229,0.5)' }} />
            )}
          </div>

          {/* Zoom slider */}
          <div className="flex items-center gap-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-4)', flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
            <input
              type="range"
              min={minScale}
              max={minScale * 3}
              step={0.01}
              value={scale}
              onChange={e => handleScale(Number(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--primary)' }}
            />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-4)', flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </div>

          <div className="flex gap-2">
            <button className="btn btn-ghost flex-1 py-3 text-sm font-semibold" onClick={handleClose}>Cancel</button>
            <button className="btn btn-primary flex-1 py-3 text-sm font-bold" onClick={handleConfirm}>Use Photo</button>
          </div>
        </div>
      </div>
    </>
  )
}
