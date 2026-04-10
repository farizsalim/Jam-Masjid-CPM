import { useState, useEffect, useRef } from 'react'

function App() {
  const GMT8_MS = 8 * 3600000
  const [currentTime, setCurrentTime] = useState(null)
  const [timeSynced, setTimeSynced] = useState(false)
  const timeOffsetRef = useRef(null) // null = belum synced, tidak pakai hardware
  const [prayerTimes, setPrayerTimes] = useState([])
  const [currentDate, setCurrentDate] = useState(null)
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [nextPrayer, setNextPrayer] = useState(null)

  // Adhan/Iqamah overlay
  const [overlayMode, setOverlayMode] = useState(null) // null | 'adhan' | 'iqamah'
  const [overlayPrayerName, setOverlayPrayerName] = useState('')
  const overlayEndRef = useRef(null) // ms timestamp kapan fase overlay selesai
  const triggeredRef = useRef(new Set()) // key HH:MM yg sudah trigger hari ini

  // Real-time clock ticker — hanya jalan jika sudah synced dari internet
  useEffect(() => {
    if (!timeSynced) return
    let timeoutId
    const tick = () => {
      setCurrentTime(new Date(Date.now() + timeOffsetRef.current))
      timeoutId = setTimeout(tick, 1000 - (Date.now() % 1000))
    }
    tick()
    return () => clearTimeout(timeoutId)
  }, [timeSynced])

  const timeSyncedRef = useRef(false) // ref agar closure di catch selalu baca nilai terbaru

  // Fetch waktu dari internet (GMT+8), re-sync setiap 15 menit
  useEffect(() => {
    const syncTime = async () => {
      // Coba API 1: worldtimeapi.org
      try {
        const fetchStart = Date.now()
        const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Kuala_Lumpur', { signal: AbortSignal.timeout(8000) })
        const data = await res.json()
        const fetchEnd = Date.now()
        const latency = (fetchEnd - fetchStart) / 2
        // Gunakan data.datetime (ISO 8601 + timezone +08:00) bukan unixtime (hanya presisi 1 detik)
        const serverUtcMs = new Date(data.datetime).getTime() + latency
        const offset = serverUtcMs - Date.now() + GMT8_MS
        timeOffsetRef.current = offset
        timeSyncedRef.current = true
        setTimeSynced(true)
        return
      } catch { /* coba API berikutnya */ }

      // Coba API 2: timeapi.io
      try {
        const fetchStart = Date.now()
        const res = await fetch('https://timeapi.io/api/time/current/zone?timeZone=Asia%2FKuala_Lumpur', { signal: AbortSignal.timeout(8000) })
        const data = await res.json()
        const fetchEnd = Date.now()
        const latency = (fetchEnd - fetchStart) / 2
        // Tambah '+08:00' agar JS parse sebagai GMT+8, bukan local time device (bisa salah jika device UTC)
        const serverUtcMs = new Date(data.dateTime + '+08:00').getTime() + latency
        const offset = serverUtcMs - Date.now() + GMT8_MS
        timeOffsetRef.current = offset
        timeSyncedRef.current = true
        setTimeSynced(true)
        return
      } catch { /* coba fallback */ }

      // Fallback: pakai hardware time + GMT+8 (lebih baik ditampilkan daripada stuck)
      if (!timeSyncedRef.current) {
        timeOffsetRef.current = GMT8_MS
        timeSyncedRef.current = true
        setTimeSynced(true)
        // Tetap coba sync ulang dalam 30 detik
        setTimeout(async () => {
          timeSyncedRef.current = false
          setTimeSynced(false)
          await syncTime()
        }, 30000)
      }
    }

    syncTime()
    const intervalId = setInterval(syncTime, 15 * 60 * 1000)
    return () => clearInterval(intervalId)
  }, [])

  // Detect date change (GMT+8) and update currentDate to trigger prayer re-fetch
  useEffect(() => {
    if (!currentTime) return
    const dateStr = `${currentTime.getUTCFullYear()}-${currentTime.getUTCMonth()}-${currentTime.getUTCDate()}`
    setCurrentDate(prev => prev !== dateStr ? dateStr : prev)
  }, [currentTime])

  // Bersihkan triggered set saat tanggal berganti (tengah malam)
  useEffect(() => {
    triggeredRef.current.clear()
  }, [currentDate])

  // Fetch prayer times from API
  useEffect(() => {
    if (!currentDate) return
    const fetchPrayerSchedule = async () => {
      try {
        // Gunakan currentDate (sudah GMT+8 dari internet) bukan Date.now() hardware
        const [year, month0, day0] = currentDate.split('-')
        const month = String(Number(month0) + 1).padStart(2, '0')
        const day = day0.padStart(2, '0')
        
        const response = await fetch(`https://api.myquran.com/v2/sholat/jadwal/2813/${year}/${month}/${day}`)
        const data = await response.json()
        
        if (data.status) {
          const jadwal = data.data.jadwal
          setLocation(`${data.data.lokasi}, ${data.data.daerah}`)
          
          const prayerList = [
            { name: 'Subuh', time: jadwal.subuh, icon: '⭐' },
            { name: 'Dzuhur', time: jadwal.dzuhur, icon: '☀️' },
            { name: 'Ashar', time: jadwal.ashar, icon: '🌅' },
            { name: 'Maghrib', time: jadwal.maghrib, icon: '🌆' },
            { name: 'Isya', time: jadwal.isya, icon: '🌙' }
          ]
          setPrayerTimes(prayerList)
          setError(null)
        } else {
          setError('Gagal memuat jadwal sholat')
        }
      } catch (err) {
        console.error(err)
        setError('Koneksi gagal, menggunakan data offline')
        const fallbackPrayers = [
          { name: 'Subuh', time: '04:45', icon: '⭐', arabic: 'صَلَاةُ الْفَجْرِ' },
          { name: 'Dzuhur', time: '12:00', icon: '☀️', arabic: 'صَلَاةُ الظُّهْرِ' },
          { name: 'Ashar', time: '15:15', icon: '🌅', arabic: 'صَلَاةُ الْعَصْرِ' },
          { name: 'Maghrib', time: '18:00', icon: '🌆', arabic: 'صَلَاةُ الْمَغْرِبِ' },
          { name: 'Isya', time: '19:15', icon: '🌙', arabic: 'صَلَاةُ الْعِشَاءِ' }
        ]
        setPrayerTimes(fallbackPrayers)
        setLocation('Masjid Al Ihsan, Indonesia')
      } finally {
        setLoading(false)
      }
    }
    
    fetchPrayerSchedule()
  }, [currentDate])

  // Determine next prayer
  useEffect(() => {
    if (!currentTime || prayerTimes.length === 0) return
    {
      const now = currentTime
      const currentHour = now.getUTCHours()
      const currentMinute = now.getUTCMinutes()
      const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`
      
      let upcoming = null
      for (let i = 0; i < prayerTimes.length; i++) {
        if (prayerTimes[i].time > currentTimeStr) {
          upcoming = { ...prayerTimes[i], tomorrow: false }
          break
        }
      }
      if (!upcoming && prayerTimes.length > 0) {
        upcoming = { ...prayerTimes[0], tomorrow: true }
      }
      setNextPrayer(upcoming)
    }
  }, [prayerTimes, currentTime])

  // State machine overlay Adzan → Iqamah → Normal
  useEffect(() => {
    if (!currentTime || !timeSynced) return
    const nowMs = currentTime.getTime()

    // Fase Adzan selesai → pindah ke Iqamah (5 menit)
    if (overlayMode === 'adhan' && overlayEndRef.current && nowMs >= overlayEndRef.current) {
      overlayEndRef.current = nowMs + 5 * 60 * 1000
      setOverlayMode('iqamah')
      return
    }
    // Fase Iqamah selesai → kembali normal
    if (overlayMode === 'iqamah' && overlayEndRef.current && nowMs >= overlayEndRef.current) {
      setOverlayMode(null)
      overlayEndRef.current = null
      return
    }
    // Belum overlay → cek apakah tepat waktu sholat
    if (!overlayMode && prayerTimes.length > 0 && currentDate) {
      const hh = String(currentTime.getUTCHours()).padStart(2, '0')
      const mm = String(currentTime.getUTCMinutes()).padStart(2, '0')
      const timeKey = `${currentDate}_${hh}:${mm}`
      for (const prayer of prayerTimes) {
        if (prayer.time === `${hh}:${mm}` && !triggeredRef.current.has(timeKey)) {
          triggeredRef.current.add(timeKey)
          overlayEndRef.current = nowMs + 3 * 60 * 1000
          setOverlayMode('adhan')
          setOverlayPrayerName(prayer.name)
          break
        }
      }
    }
  }, [currentTime, overlayMode, prayerTimes, currentDate, timeSynced])

  const getFormattedClock = () => {
    if (!currentTime) return { hours: '--', minutes: '--', seconds: '--' }
    const hours = String(currentTime.getUTCHours()).padStart(2, '0')
    const minutes = String(currentTime.getUTCMinutes()).padStart(2, '0')
    const seconds = String(currentTime.getUTCSeconds()).padStart(2, '0')
    return { hours, minutes, seconds }
  }
  
  const getDateString = () => {
    if (!currentTime) return 'Menyinkronisasi waktu...'
    const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
    const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
    return `${days[currentTime.getUTCDay()]}, ${currentTime.getUTCDate()} ${months[currentTime.getUTCMonth()]} ${currentTime.getUTCFullYear()}`
  }
  
  const getClockAngles = () => {
    if (!currentTime) return { second: 0, minute: 0, hour: 0 }
    const sec = currentTime.getUTCSeconds()
    const min = currentTime.getUTCMinutes()
    const hrs = currentTime.getUTCHours() % 12
    return {
      second: sec * 6,
      minute: min * 6 + sec * 0.1,
      hour: hrs * 30 + min * 0.5
    }
  }
  
  const clockAngles = getClockAngles()
  const { hours, minutes, seconds } = getFormattedClock()
  
  const getTimeToNext = () => {
    if (!nextPrayer || !currentTime) return null
    const now = currentTime
    const [prayerHour, prayerMin] = nextPrayer.time.split(':').map(Number)
    const midnightMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    let targetMs = midnightMs + prayerHour * 3600000 + prayerMin * 60000
    if (nextPrayer.tomorrow) {
      targetMs += 24 * 3600000
    }
    const diffMs = targetMs - now.getTime()
    if (diffMs <= 0) return null
    const hrsLeft = Math.floor(diffMs / (1000 * 60 * 60))
    const minsLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    const secsLeft = Math.floor((diffMs % (1000 * 60)) / 1000)
    return { hours: hrsLeft, minutes: minsLeft, seconds: secsLeft }
  }
  
  const timeToNext = getTimeToNext()

  // Hitung sisa detik overlay
  const overlaySecondsLeft = overlayMode && overlayEndRef.current && currentTime
    ? Math.max(0, Math.ceil((overlayEndRef.current - currentTime.getTime()) / 1000))
    : 0
  const overlayMM = String(Math.floor(overlaySecondsLeft / 60)).padStart(2, '0')
  const overlaySS = String(overlaySecondsLeft % 60).padStart(2, '0')
  const prayerArabicNames = { 'Subuh': 'الفَجْر', 'Dzuhur': 'الظُّهْر', 'Ashar': 'العَصْر', 'Maghrib': 'المَغْرِب', 'Isya': 'العِشَاء' }

  return (
    /* Root: fixed inset-0 — lebih reliable dari h-screen di Android TV browser */
    <div className="font-sans" style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#060f08' }}>

      {/* ─── OVERLAY ADZAN / IQAMAH (full screen, z-index 100) ─── */}
      {overlayMode && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: overlayMode === 'adhan'
            ? 'radial-gradient(ellipse at center, #052e16 0%, #031408 55%, #000 100%)'
            : 'radial-gradient(ellipse at center, #0c1a3a 0%, #050d1f 55%, #000 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden'
        }}>
          {/* Lingkaran dekorasi luar */}
          <div style={{ position: 'absolute', width: '110vmin', height: '110vmin', borderRadius: '50%', border: '1px solid rgba(251,191,36,0.08)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}></div>
          <div style={{ position: 'absolute', width: '85vmin', height: '85vmin', borderRadius: '50%', border: '1px solid rgba(251,191,36,0.12)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}></div>
          <div style={{ position: 'absolute', width: '62vmin', height: '62vmin', borderRadius: '50%', border: '1px solid rgba(251,191,36,0.18)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}></div>
          {/* Glow tengah */}
          <div style={{ position: 'absolute', width: '50vmin', height: '50vmin', borderRadius: '50%', background: overlayMode === 'adhan' ? 'radial-gradient(circle, rgba(245,158,11,0.12), transparent 70%)' : 'radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}></div>

          {/* Konten utama */}
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 5vw' }}>

            {/* Badge mode */}
            <div style={{
              display: 'inline-block', padding: '0.6vh 2.5vw', marginBottom: '2vh',
              borderRadius: '99px', border: '1px solid rgba(251,191,36,0.5)',
              background: 'rgba(251,191,36,0.1)',
              fontSize: 'clamp(12px, 1.1vw, 18px)', fontWeight: 700, letterSpacing: '0.3em',
              color: '#fbbf24', textTransform: 'uppercase'
            }}>
              {overlayMode === 'adhan' ? '— WAKTU ADZAN —' : '— IQAMAH —'}
            </div>

            {/* Nama sholat Arab */}
            <div style={{
              fontFamily: "'Amiri', 'Arial', serif",
              fontSize: 'clamp(3rem, 10vw, 9rem)',
              color: '#fde68a',
              lineHeight: 1.1,
              marginBottom: '1.5vh',
              textShadow: '0 0 40px rgba(251,191,36,0.4)'
            }}>
              {prayerArabicNames[overlayPrayerName] || overlayPrayerName}
            </div>

            {/* Nama sholat Indonesia */}
            <div style={{
              fontSize: 'clamp(1.8rem, 5vw, 5.5rem)',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: '1vh'
            }}>
              {overlayMode === 'adhan' ? `ADZAN ${overlayPrayerName.toUpperCase()}` : `IQAMAH ${overlayPrayerName.toUpperCase()}`}
            </div>

            {/* Pesan */}
            <div style={{
              fontSize: 'clamp(12px, 1.4vw, 22px)',
              color: 'rgba(52,211,153,0.85)',
              letterSpacing: '0.1em',
              marginBottom: '4vh'
            }}>
              {overlayMode === 'adhan' ? 'Berhenti sejenak dari aktivitas • Bersiap menunaikan sholat' : 'Sholat akan segera dimulai • Rapikan barisan'}
            </div>

            {/* Countdown box */}
            <div style={{
              display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
              padding: '2vh 5vw', borderRadius: '16px',
              border: '1px solid rgba(251,191,36,0.4)',
              background: 'rgba(0,0,0,0.35)',
              boxShadow: '0 0 30px rgba(251,191,36,0.08)'
            }}>
              <div style={{
                fontFamily: 'monospace', fontWeight: 900,
                fontSize: 'clamp(3rem, 8vw, 8rem)',
                color: '#fcd34d',
                letterSpacing: '0.08em',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
                textShadow: '0 0 20px rgba(252,211,77,0.5)'
              }}>
                {overlayMM}:{overlaySS}
              </div>
              <div style={{
                fontSize: 'clamp(11px, 1vw, 16px)', letterSpacing: '0.3em',
                color: 'rgba(251,191,36,0.55)', marginTop: '0.8vh', textTransform: 'uppercase'
              }}>
                {overlayMode === 'adhan' ? 'Hingga Iqamah' : 'Hingga Sholat Dimulai'}
              </div>
            </div>

            {/* Jam sekarang */}
            <div style={{ marginTop: '3vh', fontSize: 'clamp(14px, 1.5vw, 22px)', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', letterSpacing: '0.2em' }}>
              {hours}:{minutes} WIB
            </div>
          </div>
        </div>
      )}

      {/* Islamic Geometric Background Pattern */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.055, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23FFD700' stroke-width='0.8'%3E%3Crect x='10' y='10' width='80' height='80' transform='rotate(45 50 50)'/%3E%3Crect x='22' y='22' width='56' height='56' transform='rotate(45 50 50)'/%3E%3Ccircle cx='50' cy='50' r='28'/%3E%3Ccircle cx='50' cy='50' r='8'/%3E%3Cline x1='50' y1='0' x2='50' y2='22'/%3E%3Cline x1='50' y1='78' x2='50' y2='100'/%3E%3Cline x1='0' y1='50' x2='22' y2='50'/%3E%3Cline x1='78' y1='50' x2='100' y2='50'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '100px 100px'
        }}></div>
      </div>

      {/* Ambient corner glows */}
      <div style={{ position: 'absolute', top: '-8vh', right: '-8vw', width: '45vw', height: '45vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.11), transparent 70%)', pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', bottom: '-8vh', left: '-8vw', width: '40vw', height: '40vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,78,59,0.22), transparent 70%)', pointerEvents: 'none' }}></div>

      {/* ── SAFE ZONE WRAPPER — mengimbangi overscan TV (2vh atas/bawah, 2.5vw kiri/kanan) ── */}
      <div style={{
        position: 'absolute',
        inset: '2vh 2.5vw',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>

        {/* ── HEADER ── */}
        <header style={{ flexShrink: 0, borderBottom: '1px solid rgba(251,191,36,0.25)', paddingBottom: '1.2vh', marginBottom: '1vh' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1vw' }}>
              <div style={{
                width: '5.5vh', height: '5.5vh', borderRadius: '50%', background: '#f59e0b',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: '0 0 20px rgba(251,191,36,0.45)', fontSize: '2.8vh'
              }}>🕌</div>
              <div>
                <h1 style={{ fontSize: 'clamp(14px, 1.8vw, 28px)', fontWeight: 900, color: '#fde68a', letterSpacing: '0.05em', lineHeight: 1.2 }}>
                  MASJID AL IHSAN BAKRIE PT.CPM
                </h1>
                <p style={{ fontSize: 'clamp(10px, 0.9vw, 14px)', color: '#34d399', letterSpacing: '0.3em', marginTop: '0.3vh' }}>
                  BERKAH • ISTIQOMAH • BERDAYA
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 'clamp(13px, 1.6vw, 24px)', fontWeight: 600, color: '#fde68a' }}>{getDateString()}</p>
              <p style={{ fontSize: 'clamp(11px, 1vw, 16px)', color: 'rgba(251,191,36,0.55)', marginTop: '0.3vh', fontFamily: "'Amiri', serif" }}>
                بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
              </p>
            </div>
          </div>
        </header>

        {/* ── MAIN — flex:1 + minHeight:0 agar tidak overflow ke luar ── */}
        <main style={{ flex: 1, minHeight: 0, display: 'flex', gap: '2vw' }}>

          {/* LEFT: Clock (38%) */}
          <div style={{ width: '38%', display: 'flex', flexDirection: 'column', gap: '1vh', minHeight: 0 }}>

            {/* Label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6vw', flexShrink: 0 }}>
              <div style={{ width: '0.3vw', height: '2.5vh', borderRadius: '99px', background: '#fbbf24' }}></div>
              <span style={{ fontSize: 'clamp(10px, 0.85vw, 13px)', fontWeight: 700, letterSpacing: '0.25em', color: '#fbbf24', textTransform: 'uppercase' }}>Waktu Sekarang</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(251,191,36,0.25)' }}></div>
            </div>

            {/* Analog Clock Card */}
            <div style={{ flex: 1, minHeight: 0, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2vh 1vw', background: 'rgba(3,16,8,0.85)', border: '1px solid rgba(52,211,153,0.2)' }}>
              {/* Clock: size = min available width, max 38vh to stay square & proportional */}
              <div style={{ width: 'min(100%, 38vh)', aspectRatio: '1 / 1', position: 'relative' }}>
                <div style={{
                  position: 'relative', width: '100%', height: '100%', borderRadius: '50%',
                  background: '#030d05',
                  border: '0.6vh solid #fbbf24',
                  boxShadow: '0 0 3vh rgba(251,191,36,0.35), 0 0 6vh rgba(251,191,36,0.1), inset 0 0 5vh rgba(0,0,0,0.6)'
                }}>
                  {/* Hour ticks */}
                  {[...Array(12)].map((_, i) => (
                    <div key={`h${i}`} style={{ position: 'absolute', width: '100%', height: '100%', transform: `rotate(${i * 30}deg)` }}>
                      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '4%', width: '3.5%', height: '6%', background: '#fbbf24', borderRadius: '2px' }}></div>
                    </div>
                  ))}
                  {/* Minute ticks */}
                  {[...Array(60)].map((_, i) => {
                    if (i % 5 === 0) return null
                    return (
                      <div key={`m${i}`} style={{ position: 'absolute', width: '100%', height: '100%', transform: `rotate(${i * 6}deg)` }}>
                        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '4%', width: '1.5%', height: '3%', background: 'rgba(52,211,153,0.4)', borderRadius: '1px' }}></div>
                      </div>
                    )
                  })}
                  {/* Cardinal numbers */}
                  {[12, 3, 6, 9].map(num => {
                    const angle = num * 30
                    return (
                      <div key={num} style={{ position: 'absolute', width: '100%', height: '100%', transform: `rotate(${angle}deg)` }}>
                        <span style={{
                          position: 'absolute', left: '50%', top: '11%',
                          transform: `translateX(-50%) rotate(-${angle}deg)`,
                          color: '#fcd34d', fontWeight: 900, fontSize: 'clamp(11px, 1.2vw, 18px)', lineHeight: 1,
                        }}>{num}</span>
                      </div>
                    )
                  })}
                  {/* Hour hand */}
                  <div style={{
                    position: 'absolute', bottom: '50%', left: '50%',
                    width: '3%', height: '28%',
                    background: '#fbbf24', borderRadius: '99px',
                    transformOrigin: 'bottom center',
                    transform: `translateX(-50%) rotate(${clockAngles.hour}deg)`,
                    boxShadow: '0 0 8px rgba(251,191,36,0.9)'
                  }}></div>
                  {/* Minute hand */}
                  <div style={{
                    position: 'absolute', bottom: '50%', left: '50%',
                    width: '2%', height: '38%',
                    background: '#fde68a', borderRadius: '99px',
                    transformOrigin: 'bottom center',
                    transform: `translateX(-50%) rotate(${clockAngles.minute}deg)`,
                    boxShadow: '0 0 6px rgba(251,191,36,0.5)'
                  }}></div>
                  {/* Second hand */}
                  <div style={{
                    position: 'absolute', bottom: '50%', left: '50%',
                    width: '1.2%', height: '44%',
                    background: '#f87171', borderRadius: '99px',
                    transformOrigin: 'bottom center',
                    transform: `translateX(-50%) rotate(${clockAngles.second}deg)`,
                    boxShadow: '0 0 6px rgba(248,113,113,0.8)'
                  }}></div>
                  {/* Center dot */}
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    width: '3.5%', height: '3.5%', borderRadius: '50%',
                    background: '#fbbf24',
                    transform: 'translate(-50%, -50%)',
                    boxShadow: '0 0 10px rgba(251,191,36,1)',
                    zIndex: 20
                  }}></div>
                </div>
              </div>
            </div>

            {/* Digital Time Card */}
            <div style={{ flexShrink: 0, borderRadius: '14px', padding: '1.2vh 1vw', textAlign: 'center', background: 'rgba(3,16,8,0.85)', border: '1px solid rgba(52,211,153,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.3vw' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#fde68a', fontSize: 'clamp(2rem, 4.5vw, 5rem)', letterSpacing: '0.06em', fontVariantNumeric: 'tabular-nums' }}>{hours}</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f59e0b', fontSize: 'clamp(1.4rem, 3vw, 3.5rem)' }}>:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#fde68a', fontSize: 'clamp(2rem, 4.5vw, 5rem)', letterSpacing: '0.06em', fontVariantNumeric: 'tabular-nums' }}>{minutes}</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f59e0b', fontSize: 'clamp(1.4rem, 3vw, 3.5rem)' }}>:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#fbbf24', fontSize: 'clamp(1.2rem, 2.2vw, 2.8rem)', fontVariantNumeric: 'tabular-nums' }}>{seconds}</span>
              </div>
              <p style={{ fontSize: 'clamp(10px, 0.75vw, 13px)', letterSpacing: '0.45em', color: '#10b981', marginTop: '0.4vh', textTransform: 'uppercase' }}>WIB • GMT+8</p>
            </div>
          </div>

          {/* RIGHT: Prayer Times (62%) */}
          <div style={{ width: '62%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

            {/* Label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8vw', flexShrink: 0, marginBottom: '1vh' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(251,191,36,0.25)' }}></div>
              <span style={{ fontSize: 'clamp(10px, 0.85vw, 13px)', fontWeight: 700, letterSpacing: '0.25em', color: '#fbbf24', textTransform: 'uppercase', padding: '0 0.5vw' }}>Jadwal Sholat Harian</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(251,191,36,0.25)' }}></div>
            </div>

            <div style={{ flex: 1, minHeight: 0, borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(3,16,8,0.85)', border: '1px solid rgba(52,211,153,0.2)' }}>

              {/* Countdown */}
              {nextPrayer && timeToNext && (
                <div style={{
                  flexShrink: 0, margin: '1.5vh 1.5vw 0.8vh',
                  borderRadius: '12px', padding: '1vh 1vw', textAlign: 'center',
                  background: 'rgba(251,191,36,0.07)',
                  border: '1px solid rgba(251,191,36,0.4)',
                  boxShadow: '0 0 20px rgba(251,191,36,0.07)'
                }}>
                  <p style={{ fontSize: 'clamp(10px, 0.8vw, 13px)', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(251,191,36,0.65)', marginBottom: '0.5vh' }}>
                    Menuju Waktu {nextPrayer.name}{nextPrayer.tomorrow ? ' • Besok' : ''}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3vw' }}>
                    {[
                      { val: String(timeToNext.hours).padStart(2, '0'), label: 'JAM' },
                      { val: String(timeToNext.minutes).padStart(2, '0'), label: 'MENIT' },
                      { val: String(timeToNext.seconds).padStart(2, '0'), label: 'DETIK' },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3vw' }}>
                        {i > 0 && <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f59e0b', fontSize: 'clamp(1.2rem, 2.5vw, 2.8rem)', marginBottom: '1.2vh' }}>:</span>}
                        <div style={{ textAlign: 'center', padding: '0 0.4vw' }}>
                          <div style={{ fontFamily: 'monospace', fontWeight: 900, color: '#fcd34d', fontSize: 'clamp(1.6rem, 3vw, 3.5rem)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{item.val}</div>
                          <div style={{ fontSize: 'clamp(9px, 0.65vw, 11px)', letterSpacing: '0.2em', color: 'rgba(251,191,36,0.5)', marginTop: '0.3vh' }}>{item.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prayer List */}
              <div style={{ flex: 1, minHeight: 0, padding: '0 1.2vw', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: '1vh' }}>
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <p style={{ color: '#fbbf24', fontSize: 'clamp(13px, 1.2vw, 18px)' }}>Memuat jadwal sholat...</p>
                  </div>
                ) : error ? (
                  <p style={{ textAlign: 'center', color: 'rgba(251,191,36,0.6)', fontSize: 'clamp(12px, 1vw, 16px)', marginTop: '2vh' }}>{error}</p>
                ) : (
                  prayerTimes.map((prayer, idx) => {
                    const isNext = nextPrayer && nextPrayer.name === prayer.name && !nextPrayer.tomorrow
                    return (
                      <div
                        key={idx}
                        style={{
                          borderRadius: '12px',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.9vh 1.2vw',
                          background: isNext ? 'rgba(251,191,36,0.10)' : 'rgba(3,22,10,0.6)',
                          border: isNext ? '1px solid rgba(251,191,36,0.55)' : '1px solid rgba(52,211,153,0.13)',
                          boxShadow: isNext ? '0 0 16px rgba(251,191,36,0.1)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1vw' }}>
                          <div style={{
                            width: '4.5vh', height: '4.5vh', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 'clamp(16px, 2vh, 26px)', flexShrink: 0,
                            background: isNext ? 'rgba(251,191,36,0.15)' : 'rgba(3,30,12,0.9)',
                            border: isNext ? '1px solid rgba(251,191,36,0.35)' : '1px solid rgba(52,211,153,0.18)'
                          }}>
                            {prayer.icon}
                          </div>
                          <p style={{ fontSize: 'clamp(14px, 1.7vw, 26px)', fontWeight: 700, color: isNext ? '#fde68a' : '#d1fae5' }}>
                            {prayer.name}
                          </p>
                          {isNext && (
                            <span style={{ padding: '0.3vh 0.7vw', fontSize: 'clamp(9px, 0.7vw, 12px)', fontWeight: 900, letterSpacing: '0.15em', borderRadius: '99px', background: '#fbbf24', color: '#052e16' }}>
                              SEKARANG
                            </span>
                          )}
                        </div>
                        <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 'clamp(1.2rem, 2.2vw, 2.8rem)', color: isNext ? '#fcd34d' : 'rgba(251,191,36,0.7)', fontVariantNumeric: 'tabular-nums' }}>
                          {prayer.time}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Ayat footer */}
              <div style={{ flexShrink: 0, padding: '0.8vh 1.5vw', textAlign: 'center', borderTop: '1px solid rgba(52,211,153,0.12)', background: 'rgba(0,0,0,0.22)' }}>
                <p style={{ fontSize: 'clamp(12px, 1.1vw, 17px)', color: 'rgba(251,191,36,0.45)', fontFamily: "'Amiri', serif" }}>
                  حَافِظُوا عَلَى الصَّلَوَاتِ وَالصَّلَاةِ الْوُسْطَىٰ
                </p>
                <p style={{ fontSize: 'clamp(10px, 0.7vw, 12px)', color: 'rgba(52,211,153,0.35)', marginTop: '0.2vh' }}>
                  Peliharalah segala sholat dan sholat wustha — Al-Baqarah: 238
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* ── FOOTER ── */}
        <footer style={{ flexShrink: 0, borderTop: '1px solid rgba(52,211,153,0.15)', paddingTop: '0.8vh', marginTop: '0.8vh', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 'clamp(10px, 0.75vw, 13px)', color: 'rgba(52,211,153,0.4)' }}>© 2026 Masjid Al Ihsan Bakrie PT.CPM</p>
          <p style={{ fontSize: 'clamp(10px, 0.75vw, 13px)', fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(251,191,36,0.45)' }}>JADWAL SHOLAT DIGITAL</p>
        </footer>

      </div>{/* end safe zone */}
    </div>
  )
}

export default App
