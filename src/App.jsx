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
            { name: 'Imsak', time: jadwal.imsak, icon: '🌙' },
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
          { name: 'Imsak', time: '04:30', icon: '🌙', arabic: 'إِمْسَاك' },
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
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 font-sans relative">
      {/* Islamic Pattern Background */}
      <div className="absolute inset-0 opacity-15">
        <div className="absolute top-0 left-0 w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 20L95 55L60 90L25 55L60 20Z' fill='none' stroke='%23FFD700' stroke-width='1.5'/%3E%3C/svg%3E")`,
          backgroundSize: '140px 140px'
        }}></div>
      </div>

      {/* Ambient Light Orbs */}
      <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-amber-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-600/20 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-amber-400/15 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>

      {/* Header */}
      <header className="relative h-[11vh] px-4 lg:px-8 pt-2 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-amber-500 rounded-xl shadow-2xl flex items-center justify-center border border-amber-300">
              <span className="text-xl lg:text-2xl text-white">🕌</span>
            </div>
            <div>
              <h1 className="text-xs sm:text-sm lg:text-base xl:text-lg font-bold text-amber-400">
                MASJID AL IHSAN BAKRIE PT.CPM
              </h1>
              <p className="text-[8px] sm:text-[10px] text-emerald-300 tracking-wider">BERKAH • ISTIQOMAH • BERDAYA</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-900/90 to-emerald-950/90 backdrop-blur-2xl rounded-xl px-3 py-1 shadow-2xl border border-amber-500/50">
            <div className="text-[8px] sm:text-[10px] text-emerald-200">
              {getDateString()}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="h-[82vh] px-3 lg:px-6 flex gap-4 z-10 relative">
        
        {/* Left Column - Clock */}
        <div className="w-[38%] flex flex-col h-full">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
            <h2 className="text-[9px] sm:text-[10px] font-medium tracking-[0.2em] text-amber-400 uppercase">WAKTU SEKARANG</h2>
            <div className="flex-1 h-px bg-amber-500/50"></div>
          </div>

          <div className="flex-1 bg-gradient-to-br from-emerald-900/80 to-emerald-950/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-500/50 p-3 flex flex-col items-center justify-center">
            {/* Analog Clock - Balanced size */}
            <div className="relative w-full max-w-[320px] mx-auto aspect-square mb-3">
              <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-800 to-emerald-950 border-[10px] border-amber-400 shadow-2xl">
                {/* Clock numbers */}
                {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(num => {
                  const angle = num * 30
                  return (
                    <div key={num} className="absolute w-full h-full" style={{ transform: `rotate(${angle}deg)` }}>
                      <span className="absolute top-2 left-1/2 -translate-x-1/2 text-amber-400 font-bold text-sm sm:text-base" style={{ transform: `rotate(-${angle}deg)` }}>
                        {num}
                      </span>
                    </div>
                  )
                })}
                {/* Center point */}
                <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-amber-400 rounded-full -translate-x-1/2 -translate-y-1/2 z-20 shadow-lg"></div>
                {/* Hour hand */}
                <div className="absolute bottom-1/2 left-1/2 w-2 h-[28%] bg-amber-400 rounded-full origin-bottom -translate-x-1/2 transition-transform duration-100" style={{ transform: `translateX(-50%) rotate(${clockAngles.hour}deg)` }}></div>
                {/* Minute hand */}
                <div className="absolute bottom-1/2 left-1/2 w-1.5 h-[38%] bg-amber-300 rounded-full origin-bottom -translate-x-1/2 transition-transform duration-100" style={{ transform: `translateX(-50%) rotate(${clockAngles.minute}deg)` }}></div>
                {/* Second hand */}
                <div className="absolute bottom-1/2 left-1/2 w-1 h-[44%] bg-red-400 rounded-full origin-bottom -translate-x-1/2 transition-transform duration-100" style={{ transform: `translateX(-50%) rotate(${clockAngles.second}deg)` }}></div>
              </div>
            </div>
            
            {/* Digital Time - Balanced */}
            <div className="flex justify-center items-center gap-2 bg-emerald-950/50 rounded-lg p-2 border border-amber-500/30 w-full">
              <div className="text-2xl sm:text-3xl font-mono font-bold text-amber-300">{hours}</div>
              <span className="text-xl sm:text-2xl text-amber-500">:</span>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-amber-300">{minutes}</div>
              <span className="text-xl sm:text-2xl text-amber-500">:</span>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-amber-300">{seconds}</div>
            </div>
          </div>
        </div>
        
        {/* Right Column - Prayer Times */}
        <div className="w-[62%] flex flex-col h-full">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
            <h2 className="text-[9px] sm:text-[10px] font-medium tracking-[0.2em] text-amber-400 uppercase">JADWAL SHOLAT HARIAN</h2>
            <div className="flex-1 h-px bg-amber-500/50"></div>
          </div>
          
          <div className="flex-1 bg-gradient-to-br from-emerald-900/80 to-emerald-950/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-500/50 flex flex-col overflow-hidden">
            
            {/* Next Prayer Counter */}
            {nextPrayer && timeToNext && (
              <div className="mx-3 mt-3 p-2 bg-amber-500/20 rounded-lg border border-amber-500/60 text-center flex-shrink-0">
                <p className="text-amber-300 text-[10px] uppercase tracking-wider font-medium">
                  ⟡ MENUJU {nextPrayer.name} {nextPrayer.tomorrow ? '(BESOK)' : ''} ⟡
                </p>
                <p className="text-base font-mono font-bold text-amber-400 tracking-widest">
                  {String(timeToNext.hours).padStart(2, '0')}:{String(timeToNext.minutes).padStart(2, '0')}:{String(timeToNext.seconds).padStart(2, '0')}
                </p>
              </div>
            )}
            
            {/* Prayer List - All visible with flex */}
            <div className="flex-1 px-3 py-3 flex flex-col justify-between">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="text-amber-400 animate-pulse text-sm">Memuat jadwal sholat...</div>
                </div>
              ) : error ? (
                <div className="text-center text-amber-500/70 text-xs">{error}</div>
              ) : (
                prayerTimes.map((prayer, idx) => {
                  const isNext = nextPrayer && nextPrayer.name === prayer.name && !nextPrayer.tomorrow
                  return (
                    <div 
                      key={idx} 
                      className={`rounded-lg transition-all duration-300 ${
                        isNext 
                          ? 'bg-amber-500/25 border-l-4 border-amber-500' 
                          : 'bg-emerald-800/30 border border-amber-500/30'
                      }`}
                    >
                      <div className="flex justify-between items-center py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{prayer.icon}</span>
                          <div>
                            <p className={`text-lg font-bold ${isNext ? 'text-amber-400' : 'text-amber-300'}`}>
                              {prayer.name}
                            </p>
                          </div>
                          {isNext && (
                            <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-emerald-900 text-[8px] font-bold rounded-full">
                              NEXT
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`text-lg font-mono font-bold ${isNext ? 'text-amber-400' : 'text-amber-300'}`}>
                            {prayer.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            
            {/* Footer */}
            <div className="p-2 border-t border-amber-500/30 text-center bg-emerald-950/40 flex-shrink-0">
              <p className="text-amber-400/70 text-[9px]" style={{ fontFamily: "'Amiri', serif" }}>
                حَافِظُوا عَلَى الصَّلَوَاتِ وَالصَّلَاةِ الْوُسْطَىٰ
              </p>
              <p className="text-emerald-300/60 text-[7px] mt-0.5">Peliharalah segala sholat dan sholat wustha (Ashar)</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative bg-gradient-to-r from-emerald-950 to-emerald-900 border-t border-amber-500/50 py-3 mt-1 z-10">
        <div className="px-4 flex items-center justify-between text-[8px]">
          <p className="text-amber-300">© 2026 Masjid Al Ihsan Bakrie PT.CPM</p>
          <p className="text-amber-400 font-bold">Jadwal Sholat Digital</p>
        </div>
      </footer>
    </div>
  )
}

export default App
