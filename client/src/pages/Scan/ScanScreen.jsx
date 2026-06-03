import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Image, Zap, ZapOff, AlertCircle, Upload } from 'lucide-react'
import { scanAPI } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import PaywallModal from '../../components/UI/PaywallModal'

export default function ScanScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)

  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [flashOn, setFlashOn] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [scanCount] = useState(user?.scanCount || 0)
  const [scanLimit] = useState(user?.scanLimit || 10)

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
          setCameraReady(true)
        }
      }
    } catch (err) {
      console.error('Camera error:', err)
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera access was denied. Please allow camera access and try again, or upload an image.'
          : 'Could not access camera. Please upload an image instead.'
      )
    }
  }, [])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

  // Toggle flash
  const toggleFlash = useCallback(async () => {
    if (!streamRef.current) return
    const track = streamRef.current.getVideoTracks()[0]
    if (!track) return
    try {
      const capabilities = track.getCapabilities()
      if (capabilities.torch) {
        await track.applyConstraints({ advanced: [{ torch: !flashOn }] })
        setFlashOn((v) => !v)
      }
    } catch (err) {
      console.warn('Flash not supported')
    }
  }, [flashOn])

  // Capture frame from video (capped at 800px)
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null
    const video = videoRef.current
    const canvas = canvasRef.current
    const MAX = 800
    let w = video.videoWidth || 1280
    let h = video.videoHeight || 720
    if (w > MAX || h > MAX) {
      if (w > h) { h = Math.round(h * MAX / w); w = MAX }
      else { w = Math.round(w * MAX / h); h = MAX }
    }
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(video, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', 0.8)
  }, [])

  // Send to API
  const sendToAPI = useCallback(async (base64DataUrl) => {
    setIsScanning(true)
    try {
      // Extract mimeType and raw base64 from data URL
      let imageData, mimeType
      if (base64DataUrl.startsWith('data:')) {
        const [header, data] = base64DataUrl.split(',')
        mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg'
        imageData = data
        // Convert non-jpeg to jpeg for Anthropic compatibility
        if (mimeType !== 'image/jpeg' && mimeType !== 'image/png' && mimeType !== 'image/gif' && mimeType !== 'image/webp') {
          const img = new window.Image()
          await new Promise(resolve => { img.onload = resolve; img.src = base64DataUrl })
          const c = document.createElement('canvas')
          c.width = img.width; c.height = img.height
          c.getContext('2d').drawImage(img, 0, 0)
          const jpeg = c.toDataURL('image/jpeg', 0.85)
          imageData = jpeg.split(',')[1]
          mimeType = 'image/jpeg'
        }
      } else {
        imageData = base64DataUrl
        mimeType = 'image/jpeg'
      }
      const res = await scanAPI.scanCoin(imageData, mimeType)
      const result = res.data
      navigate('/scan/result', { state: { result, imageBase64: base64DataUrl } })
    } catch (err) {
      if (err?.response?.status === 402) {
        setPaywallOpen(true)
      } else {
        const msg = err?.response?.data?.error || 'Scan failed. Please try again.'
        alert(msg)
      }
    } finally {
      setIsScanning(false)
    }
  }, [navigate])

  // Camera capture
  const handleCapture = useCallback(async () => {
    if (isScanning || !cameraReady) return
    const base64 = captureFrame()
    if (!base64) return
    await sendToAPI(base64)
  }, [isScanning, cameraReady, captureFrame, sendToAPI])

  // File upload
  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result
      await sendToAPI(base64)
    }
    reader.readAsDataURL(file)
    // Reset input
    e.target.value = ''
  }, [sendToAPI])

  const scansRemaining = Math.max(0, scanLimit - scanCount)

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture={false}
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Camera feed */}
      {!cameraError && (
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Camera error state */}
      {cameraError && (
        <div className="absolute inset-0 bg-[#0F0F0F] flex flex-col items-center justify-center px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-[#D4A017]/20 flex items-center justify-center mb-5">
            <Upload size={36} className="text-[#D4A017]" />
          </div>
          <h2 className="text-white font-display font-bold text-xl mb-2">Upload a Coin Photo</h2>
          <p className="text-gray-400 font-body text-sm mb-8 max-w-xs leading-relaxed">
            Take a clear photo of your coin on a dark background with good lighting, then upload it here.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-[#D4A017] text-black font-bold py-4 rounded-2xl font-body text-base flex items-center justify-center gap-2"
          >
            <Upload size={20} />
            Choose from Camera Roll
          </button>
          {cameraError && (
            <p className="text-gray-600 text-xs font-body mt-4">{cameraError}</p>
          )}
        </div>
      )}

      {/* Vignette */}
      {!cameraError && (
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.8) 100%)'
          }}
        />
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 pt-safe flex items-center justify-between px-5 pt-12 pb-4 z-20">
        <h1 className="text-white font-display font-bold text-xl tracking-wide">
          CoinVault
        </h1>
        <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5">
          <span className="text-white text-xs font-body font-medium">
            {scansRemaining}/{scanLimit} scans
          </span>
        </div>
      </div>

      {/* Center reticle */}
      {!cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
          {/* Animated gold circle */}
          <div className="relative flex items-center justify-center">
            <div className="w-56 h-56 rounded-full border-2 border-[#D4A017] animate-pulse-gold" />
            {/* Corner indicators */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#D4A017] rounded-tl-sm" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#D4A017] rounded-tr-sm" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#D4A017] rounded-bl-sm" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#D4A017] rounded-br-sm" />
          </div>
          <p className="text-white/80 text-sm font-body mt-5 drop-shadow-lg">
            Place coin inside circle
          </p>
        </div>
      )}

      {/* Bottom controls */}
      {!cameraError && (
        <div className="absolute bottom-0 left-0 right-0 pb-24 px-6 z-20 space-y-4">
          {/* Upload from camera roll — primary big button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-3 bg-white/15 backdrop-blur-md border border-white/30 text-white font-body font-semibold py-3.5 rounded-2xl active:scale-95 transition-transform"
          >
            <Upload size={18} />
            Upload from Camera Roll
          </button>

          {/* Camera controls row */}
          <div className="flex items-center justify-between">
            {/* Flash */}
            <button
              onClick={toggleFlash}
              className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center active:scale-95 transition-transform"
              aria-label={flashOn ? 'Turn off flash' : 'Turn on flash'}
            >
              {flashOn ? (
                <Zap size={20} className="text-[#D4A017]" />
              ) : (
                <ZapOff size={20} className="text-white" />
              )}
            </button>

            {/* Capture */}
            <button
              onClick={handleCapture}
              disabled={isScanning || !cameraReady}
              className="w-20 h-20 rounded-full bg-[#D4A017] flex items-center justify-center shadow-2xl shadow-[#D4A017]/40 active:scale-95 transition-transform disabled:opacity-60"
              aria-label="Capture coin"
            >
              <Camera size={28} className="text-black" strokeWidth={2.5} />
            </button>

            {/* Placeholder to keep layout balanced */}
            <div className="w-12 h-12" />
          </div>
        </div>
      )}

      {/* Scanning overlay */}
      {isScanning && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-30">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl px-8 py-6 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-[#D4A017] border-t-transparent animate-spin" />
            <p className="text-white font-body font-medium">Analyzing coin...</p>
            <p className="text-gray-500 text-sm font-body">AI is identifying your coin</p>
          </div>
        </div>
      )}

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        feature="More scans"
        scanCount={scanCount}
      />
    </div>
  )
}
