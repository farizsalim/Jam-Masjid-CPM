import { useState, useEffect } from 'react'

function App() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [prayerTimes, setPrayerTimes] = useState([])
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [nextPrayer, setNextPrayer] = useState(null)

  // Real-time clock update
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(clockInterval)
  }, [])

  // Fetch prayer times from API
  useEffect(() => {
    const fetchPrayerSchedule = async () => {
      try {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        
        const response = await fetch(`https://api.myquran.com/v2/sholat/jadwal/2813/${year}/${month}/${day}`)
        const data = await response.json()
        
        if (data.status) {
          const jadwal = data.data.jadwal
          setLocation(`${data.data.lokasi}, ${data.data.daerah}`)
          
          const prayerList = [
            { name: 'Imsak', time: jadwal.imsak, icon: '🌙', arabic: 'إِمْسَاك' },
            { name: 'Subuh', time: jadwal.subuh, icon: '⭐', arabic: 'صَلَاةُ الْفَجْرِ' },
            { name: 'Dzuhur', time: jadwal.dzuhur, icon: '☀️', arabic: 'صَلَاةُ الظُّهْرِ' },
            { name: 'Ashar', time: jadwal.ashar, icon: '🌅', arabic: 'صَلَاةُ الْعَصْرِ' },
            { name: 'Maghrib', time: jadwal.maghrib, icon: '🌆', arabic: 'صَلَاةُ الْمَغْرِبِ' },
            { name: 'Isya', time: jadwal.isya, icon: '🌙', arabic: 'صَلَاةُ الْعِشَاءِ' }
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
  }, [])

  // Determine next prayer
  useEffect(() => {
    if (prayerTimes.length > 0) {
      const now = currentTime
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
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
    const hours = String(currentTime.getHours()).padStart(2, '0')
    const minutes = String(currentTime.getMinutes()).padStart(2, '0')
    const seconds = String(currentTime.getSeconds()).padStart(2, '0')
    return { hours, minutes, seconds }
  }
  
  const getDateString = () => {
    return currentTime.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  
  const getClockAngles = () => {
    const sec = currentTime.getSeconds()
    const min = currentTime.getMinutes()
    const hrs = currentTime.getHours() % 12
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
    let targetTime = new Date(now)
    targetTime.setHours(prayerHour, prayerMin, 0, 0)
    if (nextPrayer.tomorrow) {
      targetTime.setDate(targetTime.getDate() + 1)
    }
    const diffMs = targetTime - now
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
      <header className="relative h-[12vh] px-6 lg:px-10 pt-3 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl shadow-2xl flex items-center justify-center border-2 border-amber-300">
              <span className="text-3xl lg:text-4xl text-white">🕌</span>
            </div>
            <div>
              <h1 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-400">
                MASJID AL IHSAN BAKRIE PT.CPM
              </h1>
              <p className="text-xs sm:text-sm text-emerald-300 tracking-wider mt-0.5">BERKAH • ISTIQOMAH • BERDAYA</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-900/90 to-emerald-950/90 backdrop-blur-2xl rounded-2xl px-5 py-2 shadow-2xl border border-amber-500/50">
            <div className="text-xs sm:text-sm text-emerald-200">
              {getDateString()}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="h-[80vh] px-4 lg:px-8 flex gap-5 z-10 relative">
        
        {/* Left Column - Clock */}
        <div className="w-[38%] flex flex-col h-full">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-5 bg-amber-500 rounded-full"></div>
            <h2 className="text-xs sm:text-sm font-medium tracking-[0.2em] text-amber-400 uppercase">WAKTU SEKARANG</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-amber-500 to-transparent"></div>
          </div>

          <div className="flex-1 bg-gradient-to-br from-emerald-900/80 to-emerald-950/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-amber-500/50 p-4 flex flex-col items-center justify-center">
            {/* Analog Clock - Larger to fill card */}
            <div className="relative w-full max-w-[450px] mx-auto aspect-square mb-4">
              <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-800 to-emerald-950 border-[14px] border-amber-500/60 shadow-2xl">
                {/* Clock numbers - bigger */}
                {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(num => {
                  const angle = num * 30
                  return (
                    <div key={num} className="absolute w-full h-full" style={{ transform: `rotate(${angle}deg)` }}>
                      <span className="absolute top-4 left-1/2 -translate-x-1/2 text-amber-400 font-bold text-xl sm:text-2xl" style={{ transform: `rotate(-${angle}deg)` }}>
                        {num}
                      </span>
                    </div>
                  )
                })}
                {/* Center point - bigger */}
                <div className="absolute top-1/2 left-1/2 w-6 h-6 bg-amber-400 rounded-full -translate-x-1/2 -translate-y-1/2 z-20 shadow-lg"></div>
                {/* Hour hand - thicker */}
                <div className="absolute bottom-1/2 left-1/2 w-3 h-[28%] bg-gradient-to-t from-amber-400 to-amber-200 rounded-full origin-bottom -translate-x-1/2 transition-transform duration-100" style={{ transform: `translateX(-50%) rotate(${clockAngles.hour}deg)` }}></div>
                {/* Minute hand - thicker */}
                <div className="absolute bottom-1/2 left-1/2 w-2 h-[38%] bg-amber-300 rounded-full origin-bottom -translate-x-1/2 transition-transform duration-100" style={{ transform: `translateX(-50%) rotate(${clockAngles.minute}deg)` }}></div>
                {/* Second hand */}
                <div className="absolute bottom-1/2 left-1/2 w-1 h-[44%] bg-red-400 rounded-full origin-bottom -translate-x-1/2 transition-transform duration-100" style={{ transform: `translateX(-50%) rotate(${clockAngles.second}deg)` }}></div>
              </div>
            </div>
            
            {/* Digital Time - bigger */}
            <div className="flex justify-center items-center gap-4 bg-emerald-950/50 rounded-xl p-4 border border-amber-500/30 w-full">
              <div className="text-5xl sm:text-6xl font-mono font-bold text-amber-300">{hours}</div>
              <span className="text-4xl sm:text-5xl text-amber-500">:</span>
              <div className="text-5xl sm:text-6xl font-mono font-bold text-amber-300">{minutes}</div>
              <span className="text-4xl sm:text-5xl text-amber-500">:</span>
              <div className="text-5xl sm:text-6xl font-mono font-bold text-amber-300">{seconds}</div>
            </div>
          </div>
        </div>
        
        {/* Right Column - Prayer Times */}
        <div className="w-[62%] flex flex-col h-full">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-5 bg-amber-500 rounded-full"></div>
            <h2 className="text-xs sm:text-sm font-medium tracking-[0.2em] text-amber-400 uppercase">JADWAL SHOLAT HARIAN</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-amber-500 to-transparent"></div>
          </div>
          
          <div className="flex-1 bg-gradient-to-br from-emerald-900/80 to-emerald-950/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-amber-500/50 flex flex-col overflow-hidden">
            
            {/* Next Prayer Counter */}
            {nextPrayer && timeToNext && (
              <div className="mx-4 mt-4 p-3 bg-gradient-to-r from-amber-500/20 to-amber-600/20 rounded-xl border border-amber-500/60 text-center flex-shrink-0">
                <p className="text-amber-300 text-sm uppercase tracking-wider font-medium">
                  ⟡ MENUJU {nextPrayer.name} {nextPrayer.tomorrow ? '(BESOK)' : ''} ⟡
                </p>
                <p className="text-2xl font-mono font-bold text-amber-400 tracking-widest mt-1">
                  {String(timeToNext.hours).padStart(2, '0')}:{String(timeToNext.minutes).padStart(2, '0')}:{String(timeToNext.seconds).padStart(2, '0')}
                </p>
              </div>
            )}
            
            {/* Prayer List - All visible with flex */}
            <div className="flex-1 px-4 py-4 flex flex-col justify-between">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="text-amber-400 animate-pulse text-lg">Memuat jadwal sholat...</div>
                </div>
              ) : error ? (
                <div className="text-center text-amber-500/70 text-base">{error}</div>
              ) : (
                prayerTimes.map((prayer, idx) => {
                  const isNext = nextPrayer && nextPrayer.name === prayer.name && !nextPrayer.tomorrow
                  return (
                    <div 
                      key={idx} 
                      className={`rounded-xl transition-all duration-300 ${
                        isNext 
                          ? 'bg-gradient-to-r from-amber-600/30 to-amber-500/20 border-l-4 border-amber-500' 
                          : 'bg-emerald-800/30 border border-amber-500/30'
                      }`}
                    >
                      <div className="flex justify-between items-center py-3 px-4">
                        <div className="flex items-center gap-4">
                          <span className="text-3xl">{prayer.icon}</span>
                          <div>
                            <p className={`text-xl font-bold ${isNext ? 'text-amber-400' : 'text-amber-300'}`}>
                              {prayer.name}
                            </p>
                            <p className="text-sm text-emerald-300/70 mt-0.5" style={{ fontFamily: "'Amiri', serif" }}>
                              {prayer.arabic}
                            </p>
                          </div>
                          {isNext && (
                            <span className="ml-2 px-2 py-1 bg-amber-500 text-emerald-900 text-xs font-bold rounded-full shadow-md">
                              NEXT
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`text-2xl font-mono font-bold ${isNext ? 'text-amber-400' : 'text-amber-300'}`}>
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
            <div className="p-3 border-t border-amber-500/30 text-center bg-emerald-950/40 flex-shrink-0">
              <p className="text-amber-400/70 text-sm" style={{ fontFamily: "'Amiri', serif" }}>
                حَافِظُوا عَلَى الصَّلَوَاتِ وَالصَّلَاةِ الْوُسْطَىٰ
              </p>
              <p className="text-emerald-300/60 text-xs mt-1">Peliharalah segala sholat dan sholat wustha (Ashar)</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative bg-gradient-to-r from-emerald-950 to-emerald-900 border-t border-amber-500/50 py-3 mt-5 z-10">
        <div className="px-6 flex items-center justify-between text-xs">
          <p className="text-amber-300">© 2026 Masjid Al Ihsan Bakrie PT.CPM</p>
          <p className="text-amber-400 font-bold">Jadwal Sholat Digital</p>
        </div>
      </footer>
    </div>
  )
}

export default App