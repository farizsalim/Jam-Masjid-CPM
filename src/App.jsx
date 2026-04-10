import { useState, useEffect, useRef } from 'react'

function App() {
  const GMT8_MS = 8 * 3600000
  const [currentTime, setCurrentTime] = useState(new Date(Date.now() + GMT8_MS))
  const [timeOffset, setTimeOffset] = useState(GMT8_MS)
  const timeOffsetRef = useRef(GMT8_MS)
  const [prayerTimes, setPrayerTimes] = useState([])
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date(Date.now() + GMT8_MS)
    return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
  })
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [nextPrayer, setNextPrayer] = useState(null)

  // Sync ref whenever timeOffset state changes
  useEffect(() => {
    timeOffsetRef.current = timeOffset
  }, [timeOffset])

  // Real-time clock update - uses internet-synced GMT+8 offset
  useEffect(() => {
    let timeoutId
    const tick = () => {
      setCurrentTime(new Date(Date.now() + timeOffsetRef.current))
      timeoutId = setTimeout(tick, 1000 - (Date.now() % 1000))
    }
    tick()
    return () => clearTimeout(timeoutId)
  }, [])

  // Fetch accurate time from internet (GMT+8) and re-sync every 30 minutes
  useEffect(() => {
    const syncTime = async () => {
      try {
        const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Kuala_Lumpur')
        const data = await res.json()
        const serverUtcMs = data.unixtime * 1000
        const offset = serverUtcMs - Date.now() + GMT8_MS
        timeOffsetRef.current = offset
        setTimeOffset(offset)
      } catch {
        // Jika gagal, tetap pakai GMT+8 dari jam lokal (offset awal sudah GMT+8)
      }
    }
    syncTime()
    const intervalId = setInterval(syncTime, 30 * 60 * 1000)
    return () => clearInterval(intervalId)
  }, [])

  // Detect date change (GMT+8) and update currentDate to trigger prayer re-fetch
  useEffect(() => {
    const dateStr = `${currentTime.getUTCFullYear()}-${currentTime.getUTCMonth()}-${currentTime.getUTCDate()}`
    setCurrentDate(prev => prev !== dateStr ? dateStr : prev)
  }, [currentTime])

  // Fetch prayer times from API
  useEffect(() => {
    const fetchPrayerSchedule = async () => {
      try {
        const gmt8Date = new Date(Date.now() + 8 * 3600000)
        const year = gmt8Date.getUTCFullYear()
        const month = String(gmt8Date.getUTCMonth() + 1).padStart(2, '0')
        const day = String(gmt8Date.getUTCDate()).padStart(2, '0')
        
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
    if (prayerTimes.length > 0) {
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

  const getFormattedClock = () => {
    const hours = String(currentTime.getUTCHours()).padStart(2, '0')
    const minutes = String(currentTime.getUTCMinutes()).padStart(2, '0')
    const seconds = String(currentTime.getUTCSeconds()).padStart(2, '0')
    return { hours, minutes, seconds }
  }
  
  const getDateString = () => {
    const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
    const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
    return `${days[currentTime.getUTCDay()]}, ${currentTime.getUTCDate()} ${months[currentTime.getUTCMonth()]} ${currentTime.getUTCFullYear()}`
  }
  
  const getClockAngles = () => {
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
    if (!nextPrayer) return null
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

  return (
    <div className="h-screen w-screen overflow-hidden font-sans relative" style={{ background: '#060f08' }}>

      {/* Islamic Geometric Background Pattern */}
      <div className="absolute inset-0" style={{ opacity: 0.055 }}>
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23FFD700' stroke-width='0.8'%3E%3Crect x='10' y='10' width='80' height='80' transform='rotate(45 50 50)'/%3E%3Crect x='22' y='22' width='56' height='56' transform='rotate(45 50 50)'/%3E%3Ccircle cx='50' cy='50' r='28'/%3E%3Ccircle cx='50' cy='50' r='8'/%3E%3Cline x1='50' y1='0' x2='50' y2='22'/%3E%3Cline x1='50' y1='78' x2='50' y2='100'/%3E%3Cline x1='0' y1='50' x2='22' y2='50'/%3E%3Cline x1='78' y1='50' x2='100' y2='50'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '100px 100px'
        }}></div>
      </div>

      {/* Ambient corner glows */}
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.12), transparent 70%)' }}></div>
      <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(6,78,59,0.25), transparent 70%)' }}></div>

      {/* ── HEADER ── */}
      <header className="relative h-[12vh] flex items-center px-6 lg:px-10 z-10" style={{ borderBottom: '1px solid rgba(251,191,36,0.25)' }}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0" style={{ boxShadow: '0 0 22px rgba(251,191,36,0.45)' }}>
              <span className="text-2xl">🕌</span>
            </div>
            <div>
              <h1 className="text-sm lg:text-base xl:text-lg font-black text-amber-200 tracking-wide leading-tight">
                MASJID AL IHSAN BAKRIE PT.CPM
              </h1>
              <p className="text-[9px] lg:text-[10px] text-emerald-400 tracking-[0.35em] mt-0.5">BERKAH • ISTIQOMAH • BERDAYA</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm lg:text-base font-semibold text-amber-200">{getDateString()}</p>
            <p className="text-xs text-amber-400/60 mt-0.5" style={{ fontFamily: "'Amiri', serif" }}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="h-[80vh] px-4 lg:px-8 py-3 flex gap-5 z-10 relative">

        {/* LEFT: Clock */}
        <div className="w-[38%] flex flex-col gap-3 h-full">

          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-amber-400"></div>
            <span className="text-[9px] font-semibold tracking-[0.28em] text-amber-400 uppercase">Waktu Sekarang</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(251,191,36,0.25)' }}></div>
          </div>

          {/* Analog Clock Card */}
          <div className="flex-1 rounded-2xl flex items-center justify-center p-4" style={{ background: 'rgba(3,16,8,0.8)', border: '1px solid rgba(52,211,153,0.18)' }}>
            <div className="relative w-full max-w-[290px] aspect-square">
              <div className="relative w-full h-full rounded-full" style={{
                background: '#030d05',
                border: '8px solid #fbbf24',
                boxShadow: '0 0 30px rgba(251,191,36,0.3), 0 0 60px rgba(251,191,36,0.1), inset 0 0 50px rgba(0,0,0,0.6)'
              }}>

                {/* Hour tick marks */}
                {[...Array(12)].map((_, i) => (
                  <div key={`h${i}`} className="absolute w-full h-full" style={{ transform: `rotate(${i * 30}deg)` }}>
                    <div className="absolute left-1/2 -translate-x-1/2 rounded-full" style={{ top: '9px', width: '3px', height: '14px', background: '#fbbf24' }}></div>
                  </div>
                ))}

                {/* Minute tick marks */}
                {[...Array(60)].map((_, i) => {
                  if (i % 5 === 0) return null
                  return (
                    <div key={`m${i}`} className="absolute w-full h-full" style={{ transform: `rotate(${i * 6}deg)` }}>
                      <div className="absolute left-1/2 -translate-x-1/2 rounded-full" style={{ top: '10px', width: '1.5px', height: '7px', background: 'rgba(52,211,153,0.45)' }}></div>
                    </div>
                  )
                })}

                {/* Cardinal numbers 12, 3, 6, 9 */}
                {[12, 3, 6, 9].map(num => {
                  const angle = num * 30
                  return (
                    <div key={num} className="absolute w-full h-full" style={{ transform: `rotate(${angle}deg)` }}>
                      <span className="absolute left-1/2 font-black text-amber-300" style={{
                        top: '27px',
                        transform: `translateX(-50%) rotate(-${angle}deg)`,
                        fontSize: '13px', lineHeight: 1
                      }}>{num}</span>
                    </div>
                  )
                })}

                {/* Hour hand */}
                <div className="absolute bottom-1/2 left-1/2 origin-bottom rounded-full" style={{
                  width: '3px', height: '26%',
                  background: '#fbbf24',
                  transform: `translateX(-50%) rotate(${clockAngles.hour}deg)`,
                  boxShadow: '0 0 8px rgba(251,191,36,0.8)',
                  transition: 'transform 0.3s ease'
                }}></div>
                {/* Minute hand */}
                <div className="absolute bottom-1/2 left-1/2 origin-bottom rounded-full" style={{
                  width: '2px', height: '37%',
                  background: '#fde68a',
                  transform: `translateX(-50%) rotate(${clockAngles.minute}deg)`,
                  boxShadow: '0 0 6px rgba(251,191,36,0.5)',
                  transition: 'transform 0.3s ease'
                }}></div>
                {/* Second hand */}
                <div className="absolute bottom-1/2 left-1/2 origin-bottom rounded-full" style={{
                  width: '1.5px', height: '43%',
                  background: '#f87171',
                  transform: `translateX(-50%) rotate(${clockAngles.second}deg)`,
                  boxShadow: '0 0 6px rgba(248,113,113,0.7)'
                }}></div>
                {/* Center dot */}
                <div className="absolute top-1/2 left-1/2 rounded-full z-20" style={{
                  width: '11px', height: '11px',
                  background: '#fbbf24',
                  transform: 'translate(-50%, -50%)',
                  boxShadow: '0 0 12px rgba(251,191,36,1)'
                }}></div>
              </div>
            </div>
          </div>

          {/* Digital Time Card */}
          <div className="rounded-2xl py-3 px-4 text-center flex-shrink-0" style={{ background: 'rgba(3,16,8,0.8)', border: '1px solid rgba(52,211,153,0.18)' }}>
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-mono font-black text-amber-200 tabular-nums" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.75rem)', letterSpacing: '0.06em' }}>{hours}</span>
              <span className="font-mono font-bold text-amber-500" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: '2px' }}>:</span>
              <span className="font-mono font-black text-amber-200 tabular-nums" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.75rem)', letterSpacing: '0.06em' }}>{minutes}</span>
              <span className="font-mono font-bold text-amber-500" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: '2px' }}>:</span>
              <span className="font-mono font-bold text-amber-400 tabular-nums" style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.25rem)' }}>{seconds}</span>
            </div>
            <p className="text-[8px] tracking-[0.5em] text-emerald-500 mt-1 uppercase">WIB • GMT+8</p>
          </div>
        </div>

        {/* RIGHT: Prayer Times */}
        <div className="w-[62%] flex flex-col h-full">

          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1" style={{ background: 'rgba(251,191,36,0.25)' }}></div>
            <span className="text-[9px] font-semibold tracking-[0.28em] text-amber-400 uppercase px-2">Jadwal Sholat Harian</span>
            <div className="h-px flex-1" style={{ background: 'rgba(251,191,36,0.25)' }}></div>
          </div>

          <div className="flex-1 rounded-2xl flex flex-col overflow-hidden" style={{ background: 'rgba(3,16,8,0.8)', border: '1px solid rgba(52,211,153,0.18)' }}>

            {/* Countdown */}
            {nextPrayer && timeToNext && (
              <div className="mx-4 mt-4 mb-2 rounded-xl p-3 text-center flex-shrink-0" style={{
                background: 'rgba(251,191,36,0.07)',
                border: '1px solid rgba(251,191,36,0.4)',
                boxShadow: '0 0 20px rgba(251,191,36,0.08)'
              }}>
                <p className="text-[9px] tracking-[0.3em] uppercase mb-2" style={{ color: 'rgba(251,191,36,0.65)' }}>
                  Menuju Waktu {nextPrayer.name}{nextPrayer.tomorrow ? ' • Besok' : ''}
                </p>
                <div className="flex items-center justify-center gap-1">
                  {[
                    { val: String(timeToNext.hours).padStart(2, '0'), label: 'JAM' },
                    { val: String(timeToNext.minutes).padStart(2, '0'), label: 'MENIT' },
                    { val: String(timeToNext.seconds).padStart(2, '0'), label: 'DETIK' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-1">
                      {i > 0 && <span className="font-mono font-bold text-amber-500" style={{ fontSize: '1.6rem', marginBottom: '14px' }}>:</span>}
                      <div className="text-center px-2">
                        <div className="font-mono font-black text-amber-300 tabular-nums" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', lineHeight: 1 }}>{item.val}</div>
                        <div className="text-[7px] tracking-widest mt-1" style={{ color: 'rgba(251,191,36,0.5)' }}>{item.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prayer List */}
            <div className="flex-1 px-4 py-2 flex flex-col justify-between">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-amber-400 animate-pulse text-sm">Memuat jadwal sholat...</p>
                </div>
              ) : error ? (
                <p className="text-center text-amber-500/70 text-xs mt-4">{error}</p>
              ) : (
                prayerTimes.map((prayer, idx) => {
                  const isNext = nextPrayer && nextPrayer.name === prayer.name && !nextPrayer.tomorrow
                  return (
                    <div
                      key={idx}
                      className="rounded-xl flex items-center justify-between transition-all duration-300"
                      style={{
                        padding: '9px 14px',
                        background: isNext ? 'rgba(251,191,36,0.10)' : 'rgba(3,22,10,0.6)',
                        border: isNext ? '1px solid rgba(251,191,36,0.55)' : '1px solid rgba(52,211,153,0.12)',
                        boxShadow: isNext ? '0 0 18px rgba(251,191,36,0.1)' : 'none'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{
                          background: isNext ? 'rgba(251,191,36,0.15)' : 'rgba(3,30,12,0.9)',
                          border: isNext ? '1px solid rgba(251,191,36,0.35)' : '1px solid rgba(52,211,153,0.18)'
                        }}>
                          {prayer.icon}
                        </div>
                        <p className="text-base lg:text-lg font-bold" style={{ color: isNext ? '#fde68a' : '#d1fae5' }}>
                          {prayer.name}
                        </p>
                        {isNext && (
                          <span className="px-2 py-0.5 text-[8px] font-black tracking-wider rounded-full" style={{ background: '#fbbf24', color: '#052e16' }}>
                            SEKARANG
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-black tabular-nums" style={{
                        fontSize: 'clamp(1.1rem, 2vw, 1.5rem)',
                        color: isNext ? '#fcd34d' : 'rgba(251,191,36,0.65)'
                      }}>
                        {prayer.time}
                      </span>
                    </div>
                  )
                })
              )}
            </div>

            {/* Ayat footer */}
            <div className="px-4 py-2 text-center flex-shrink-0" style={{ borderTop: '1px solid rgba(52,211,153,0.12)', background: 'rgba(0,0,0,0.25)' }}>
              <p className="text-[11px]" style={{ color: 'rgba(251,191,36,0.45)', fontFamily: "'Amiri', serif" }}>
                حَافِظُوا عَلَى الصَّلَوَاتِ وَالصَّلَاةِ الْوُسْطَىٰ
              </p>
              <p className="text-[7px] mt-0.5" style={{ color: 'rgba(52,211,153,0.35)' }}>Peliharalah segala sholat dan sholat wustha — Al-Baqarah: 238</p>
            </div>
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="relative h-[8vh] flex items-center px-6 lg:px-10 z-10" style={{ borderTop: '1px solid rgba(52,211,153,0.15)' }}>
        <div className="flex items-center justify-between w-full">
          <p className="text-[9px]" style={{ color: 'rgba(52,211,153,0.4)' }}>© 2026 Masjid Al Ihsan Bakrie PT.CPM</p>
          <p className="text-[9px] font-semibold tracking-widest" style={{ color: 'rgba(251,191,36,0.45)' }}>JADWAL SHOLAT DIGITAL</p>
        </div>
      </footer>
    </div>
  )
}

export default App
