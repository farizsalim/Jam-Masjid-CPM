import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [prayerTimes, setPrayerTimes] = useState([])
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [nextPrayer, setNextPrayer] = useState(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Fetch prayer times from API
  useEffect(() => {
    const fetchPrayerTimes = async () => {
      try {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        
        const response = await fetch(`https://api.myquran.com/v2/sholat/jadwal/2813/${year}/${month}/${day}`)
        const result = await response.json()
        
        if (result.status) {
          setLocation(`${result.data.lokasi}, ${result.data.daerah}`)
          
          const formattedPrayerTimes = [
            { name: 'Imsak', time: result.data.jadwal.imsak, icon: '🌙' },
            { name: 'Subuh', time: result.data.jadwal.subuh, icon: '⭐' },
            { name: 'Dzuhur', time: result.data.jadwal.dzuhur, icon: '☀️' },
            { name: 'Ashar', time: result.data.jadwal.ashar, icon: '🌅' },
            { name: 'Maghrib', time: result.data.jadwal.maghrib, icon: '🌆' },
            { name: 'Isya', time: result.data.jadwal.isya, icon: '🌙' }
          ]
          
          setPrayerTimes(formattedPrayerTimes)
          setError(null)
        } else {
          setError('Gagal mengambil jadwal sholat')
        }
      } catch (err) {
        setError('Terjadi kesalahan saat mengambil data')
        console.error('Error fetching prayer times:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPrayerTimes()
  }, [])

  // Determine next prayer
  useEffect(() => {
    if (prayerTimes.length > 0) {
      const now = currentTime
      const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      
      let next = null
      for (let i = 0; i < prayerTimes.length; i++) {
        if (prayerTimes[i].time > currentTimeStr) {
          next = prayerTimes[i]
          break
        }
      }
      
      if (!next && prayerTimes.length > 0) {
        next = { ...prayerTimes[0], tomorrow: true }
      }
      
      setNextPrayer(next)
    }
  }, [prayerTimes, currentTime])

  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return { hours, minutes, seconds }
  }

  const getRotationDegrees = () => {
    const seconds = currentTime.getSeconds()
    const minutes = currentTime.getMinutes()
    const hours = currentTime.getHours()
    
    return {
      second: seconds * 6,
      minute: minutes * 6 + seconds * 0.1,
      hour: (hours % 12) * 30 + minutes * 0.5
    }
  }

  const { hours, minutes, seconds } = formatTime(currentTime)
  const { second, minute, hour } = getRotationDegrees()

  const getTimeToNextPrayer = () => {
    if (!nextPrayer) return null
    
    const now = currentTime
    const [prayerHour, prayerMinute] = nextPrayer.time.split(':').map(Number)
    let prayerTime = new Date(now)
    prayerTime.setHours(prayerHour, prayerMinute, 0, 0)
    
    if (nextPrayer.tomorrow) {
      prayerTime.setDate(prayerTime.getDate() + 1)
    }
    
    const diffMs = prayerTime - now
    if (diffMs <= 0) return null
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000)
    
    return { hours: diffHours, minutes: diffMinutes, seconds: diffSeconds }
  }
  
  const timeToNext = getTimeToNextPrayer()

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-emerald-950 via-green-900 to-emerald-950 overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, gold 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10 h-full flex flex-col">
        {/* Header */}
        <div className="text-center mt-1 mb-3 flex-shrink-0">
          <h1 className="text-3xl md:text-4xl font-bold tracking-wider">
            <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent">
              🕌 MASJID AL IHSAN BAKRIE
            </span>
          </h1>
          <p className="text-lg md:text-xl font-semibold text-emerald-700 mt-2">
            PT. CPM
          </p>
        </div>
        
        {/* Main Content - Fixed Grid with no overflow */}
        <div className="flex-grid grid grid-cols-1 lg:grid-cols-2 gap-5 min-h-0" style={{ height: 'calc(100% - 60px)' }}>
          
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-4 min-h-0">
            {/* Analog Clock - Scaled down */}
            <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-950/40 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-amber-400/30 flex-shrink-0">
              <div className="relative w-full max-w-[380px] aspect-square mx-auto">
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-800 via-emerald-900 to-emerald-950 border-[10px] border-amber-400 shadow-2xl">
                  
                  {/* Clock Numbers - Scaled font */}
                  {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num) => {
                    const rotation = num * 30
                    return (
                      <div
                        key={num}
                        className="absolute"
                        style={{
                          transform: `rotate(${rotation}deg)`,
                          width: '100%',
                          height: '100%',
                          position: 'absolute',
                          top: 0,
                          left: 0
                        }}
                      >
                        <span
                          style={{
                            display: 'block',
                            transform: `rotate(-${rotation}deg)`,
                            position: 'absolute',
                            top: '12px',
                            left: '50%',
                            marginLeft: '-14px',
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: '#fbbf24'
                          }}
                        >
                          {num}
                        </span>
                      </div>
                    )
                  })}
                  
                  {/* Center Point */}
                  <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-20 shadow-xl">
                    <div className="absolute inset-1.5 bg-emerald-900 rounded-full"></div>
                  </div>
                  
                  {/* Hour Hand */}
                  <div
                    className="absolute top-1/2 left-1/2 w-3 h-24 bg-gradient-to-b from-amber-400 to-yellow-600 rounded-full origin-bottom z-10"
                    style={{
                      transform: `translateX(-50%) translateY(-100%) rotate(${hour}deg)`,
                      transition: 'transform 0.1s'
                    }}
                  ></div>
                  
                  {/* Minute Hand */}
                  <div
                    className="absolute top-1/2 left-1/2 w-2.5 h-32 bg-gradient-to-b from-amber-300 to-yellow-500 rounded-full origin-bottom z-10"
                    style={{
                      transform: `translateX(-50%) translateY(-100%) rotate(${minute}deg)`,
                      transition: 'transform 0.1s'
                    }}
                  ></div>
                  
                  {/* Second Hand */}
                  <div
                    className="absolute top-1/2 left-1/2 w-1.5 h-40 bg-gradient-to-b from-red-500 to-red-700 rounded-full origin-bottom z-10"
                    style={{
                      transform: `translateX(-50%) translateY(-100%) rotate(${second}deg)`,
                      transition: 'transform 0.05s linear'
                    }}
                  ></div>
                </div>
              </div>
            </div>
            
            {/* Digital Clock - Compact */}
            <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-950/40 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-amber-400/30 flex-shrink-0">
              <div className="flex items-center justify-center gap-2">
                <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 rounded-xl px-4 py-2 min-w-[85px] text-center border border-amber-400/50">
                  <span className="text-4xl md:text-5xl font-black text-transparent bg-gradient-to-b from-amber-300 to-yellow-400 bg-clip-text">
                    {hours}
                  </span>
                </div>
                <span className="text-4xl md:text-5xl font-black text-amber-400">:</span>
                <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 rounded-xl px-4 py-2 min-w-[85px] text-center border border-amber-400/50">
                  <span className="text-4xl md:text-5xl font-black text-transparent bg-gradient-to-b from-amber-300 to-yellow-400 bg-clip-text">
                    {minutes}
                  </span>
                </div>
                <span className="text-4xl md:text-5xl font-black text-amber-400">:</span>
                <div className="bg-gradient-to-br from-emerald-800 to-emerald-900 rounded-xl px-4 py-2 min-w-[85px] text-center border border-amber-400/50">
                  <span className="text-4xl md:text-5xl font-black text-transparent bg-gradient-to-b from-amber-300 to-yellow-400 bg-clip-text">
                    {seconds}
                  </span>
                </div>
              </div>
              <div className="text-center mt-2">
                <span className="text-amber-200 text-sm">
                  {currentTime.toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
          
          {/* RIGHT COLUMN - Prayer Times */}
          <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-950/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-400/30 flex flex-col min-h-0">
            {/* Header */}
            <div className="p-3 text-center border-b border-amber-400/30 flex-shrink-0">
              <h2 className="text-2xl md:text-3xl font-bold">
                <span className="bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent">
                  ⏰ WAKTU SHOLAT
                </span>
              </h2>
              {location && (
                <p className="text-amber-200 text-xs mt-1">
                  📍 {location}
                </p>
              )}
              {loading && (
                <p className="text-amber-400 text-xs animate-pulse mt-1">Memuat jadwal...</p>
              )}
            </div>
            
            {/* Next Prayer Counter - Compact */}
            {nextPrayer && timeToNext && (
              <div className="mx-3 mt-2 p-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-xl border border-amber-400/50 text-center flex-shrink-0">
                <p className="text-amber-300 text-xs">Menuju {nextPrayer.name} {nextPrayer.tomorrow && '(Besok)'}</p>
                <p className="text-xl font-mono font-bold text-amber-400">
                  {String(timeToNext.hours).padStart(2, '0')}:{String(timeToNext.minutes).padStart(2, '0')}:{String(timeToNext.seconds).padStart(2, '0')}
                </p>
              </div>
            )}
            
            {/* Prayer List - Scroll if needed but compact */}
            <div className="flex-grow overflow-y-auto p-3 space-y-2 min-h-0" style={{ scrollbarWidth: 'thin' }}>
              {prayerTimes.map((prayer, index) => {
                const isNext = nextPrayer && nextPrayer.name === prayer.name && !nextPrayer.tomorrow
                return (
                  <div
                    key={index}
                    className={`rounded-xl transition-all duration-200 ${
                      isNext 
                        ? 'bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border border-amber-400' 
                        : 'bg-emerald-800/30 border border-amber-400/20'
                    }`}
                  >
                    <div className="flex justify-between items-center p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{prayer.icon}</span>
                        <span className={`text-base md:text-lg font-bold ${isNext ? 'text-amber-400' : 'text-amber-300'}`}>
                          {prayer.name}
                        </span>
                        {isNext && (
                          <span className="px-1.5 py-0.5 bg-amber-500 text-emerald-900 text-[10px] font-bold rounded-full">
                            NEXT
                          </span>
                        )}
                      </div>
                      <span className={`text-xl md:text-2xl font-bold ${
                        isNext ? 'text-amber-400' : 'text-amber-300'
                      }`}>
                        {prayer.time}
                      </span>
                    </div>
                  </div>
                )
              })}
              
              {error && (
                <div className="text-center text-red-400 text-sm py-4">
                  ⚠️ {error}
                </div>
              )}
            </div>
            
            {/* Footer - Compact */}
            <div className="p-2 text-center border-t border-amber-400/30 flex-shrink-0">
              <p className="text-amber-400/60 text-[10px]">
                وَالَّذِينَ هُمْ عَلَىٰ صَلَاتِهِمْ يُحَافِظُونَ
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .overflow-y-auto::-webkit-scrollbar {
          width: 4px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: rgba(251, 191, 36, 0.1);
          border-radius: 10px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(251, 191, 36, 0.5);
          border-radius: 10px;
        }
      `}</style>
    </div>
  )
}

export default App