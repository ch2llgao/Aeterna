import re

file_path = "c:/Users/¸ß³¿Ñô/Desktop/NUS/FT5004/Aeterna/frontend/src/App.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# Add Heart to imports
if " Heart, " not in text:
    text = text.replace("Clock, CheckCircle2", "Clock, Heart, CheckCircle2")

# Make layout expansive
text = text.replace("max-w-6xl mx-auto", "w-full max-w-none px-4 md:px-8 xl:px-12 mx-auto")

# Find the ECG svg part and insert the heart inside the relative div container
ecg_div = r"\{/\* Symmetrical ECG Monitor spanning full width \*/\}\s*<div className=\{`relative w-full max-w-[^`]+`\}>([\s\S]*?)<svg([^>]+)>(.*?)</svg>"

def add_heart(m):
    replacement = """{/* Symmetrical ECG Monitor spanning full width */}
                      <div className={`relative w-full h-32 mb-8 overflow-hidden rounded-xl border flex-shrink-0 bg-slate-950/80 shadow-inner ${status.includes('Active') ? 'border-indigo-900/40 text-indigo-400' : status.includes('Grace') ? 'border-amber-900/40 text-amber-500' : 'border-red-900/40 text-red-600'}`}>
                        {/* Grid background */}
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(100,116,139,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,0.3) 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                        
                        {/* SVG Wave */}
                        <svg className={`absolute left-0 h-full w-[200%] ${status.includes('Active') ? 'animate-ecg drop-shadow-[0_0_8px_currentColor]' : status.includes('Grace') ? 'animate-ecg-slow drop-shadow-[0_0_8px_currentColor]' : 'drop-shadow-[0_0_4px_currentColor]'}`} viewBox="0 0 200 50" preserveAspectRatio="none">
                          <path fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
                                d={status.includes('Active') 
                                  ? "M0,25 h20 l5,-5 l5,5 h10 l5,-20 l5,40 l5,-20 h10 l10,-8 l5,8 h20 h20 l5,-5 l5,5 h10 l5,-20 l5,40 l5,-20 h10 l10,-8 l5,8 h20" 
                                  : status.includes('Grace')
                                  ? "M0,25 h40 l10,-10 l5,30 l15,-20 h30 h40 l10,-10 l5,30 l15,-20 h30"
                                  : "M0,25 h200"} />
                        </svg>

                        {/* Central Pulsating Heart */}
                        {status.includes('Active') && (
                          <>
                            <Heart className="absolute z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 text-indigo-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-pulse" fill="currentColor" />
                            <Heart className="absolute z-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 text-indigo-500 opacity-30 animate-ping" />
                          </>
                        )}
                        {status.includes('Grace') && (
                          <Heart className="absolute z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-pulse" fill="currentColor" />
                        )}
                        {status.includes('Deceased') && (
                          <Heart className="absolute z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-red-800 opacity-50 stroke-current drop-shadow-[0_0_2px_rgba(153,27,27,1)]" />
                        )}
                      </div>"""
    return replacement

text = re.sub(ecg_div, add_heart, text)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)

print("Done")
