import re

with open(r"c:\Users\高晨阳\Desktop\NUS\FT5004\Aeterna\frontend\src\App.tsx", "r", encoding="utf-8") as f:
    text = f.read()

text = re.sub(r'className="max-w-6xl mx-auto', r'className="w-full max-w-[96%] mx-auto', text)
text = re.sub(r'className="max-w-3xl mx-auto', r'className="w-full max-w-[70%] mx-auto', text)

text = re.sub(r'Clock, CheckCircle2', r'Clock, Heart, CheckCircle2', text)

style_old = """                    <style>{`
                      @keyframes slide-ecg {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                      }
                      .animate-ecg {
                        animation: slide-ecg 1.5s linear infinite;
                      }
                      .animate-ecg-slow {
                        animation: slide-ecg 3.5s linear infinite;
                      }
                    `}</style>"""

style_new = """                    <style>{`
                      @keyframes slide-ecg {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                      }
                      @keyframes heart-beat {
                        0%, 100% { transform: scale(1); }
                        15%, 30% { transform: scale(1.15); }
                        20% { transform: scale(1); }
                      }
                      .animate-ecg {
                        animation: slide-ecg 1.5s linear infinite;
                      }
                      .animate-ecg-slow {
                        animation: slide-ecg 3.5s linear infinite;
                      }
                      .animate-heart-beat {
                        animation: heart-beat 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                      }
                      .animate-heart-beat-slow {
                        animation: heart-beat 3.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                      }
                    `}</style>"""
text = text.replace(style_old, style_new)

old_svg_block = """                        {/* SVG Wave */}
                        <svg className={`absolute left-0 h-full w-[200%] ${status.includes('Active') ? 'animate-ecg drop-shadow-[0_0_8px_currentColor]' : status.includes('Grace') ? 'animate-ecg-slow drop-shadow-[0_0_8px_currentColor]' : 'drop-shadow-[0_0_4px_currentColor]'}`} viewBox="0 0 200 50" preserveAspectRatio="none">
                          <path fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
                                d={status.includes('Active') 
                                  ? "M0,25 h20 l5,-5 l5,5 h10 l5,-20 l5,40 l5,-20 h10 l10,-8 l5,8 h20 h20 l5,-5 l5,5 h10 l5,-20 l5,40 l5,-20 h10 l10,-8 l5,8 h20" 
                                  : status.includes('Grace')
                                  ? "M0,25 h40 l10,-10 l5,30 l15,-20 h30 h40 l10,-10 l5,30 l15,-20 h30"
                                  : "M0,25 h200"} />
                        </svg>
                        
                        {/* Fade out edges */}
                        <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-r from-slate-950 via-transparent to-slate-950 pointer-events-none"></div>"""

new_svg_block = """                        {/* Centered Beating Heart */}
                        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                          {status.includes('Active') ? (
                             <Heart className="w-12 h-12 text-indigo-400 fill-indigo-400/20 animate-heart-beat drop-shadow-[0_0_15px_rgba(99,102,241,0.8)]" strokeWidth={1.5} />
                          ) : status.includes('Grace') ? (
                             <Heart className="w-12 h-12 text-amber-500 fill-amber-500/20 animate-heart-beat-slow drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]" strokeWidth={1.5} />
                          ) : (
                             <Heart className="w-12 h-12 text-red-600 fill-red-900/50 drop-shadow-[0_0_5px_currentColor]" strokeWidth={1.5} />
                          )}
                        </div>

                        {/* SVG Wave */}
                        <svg className={`absolute left-0 h-full w-[200%] opacity-70 ${status.includes('Active') ? 'animate-ecg drop-shadow-[0_0_8px_currentColor]' : status.includes('Grace') ? 'animate-ecg-slow drop-shadow-[0_0_8px_currentColor]' : 'drop-shadow-[0_0_4px_currentColor]'}`} viewBox="0 0 200 50" preserveAspectRatio="none">
                          <path fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
                                d={status.includes('Active') 
                                  ? "M0,25 h20 l5,-5 l5,5 h10 l5,-20 l5,40 l5,-20 h10 l10,-8 l5,8 h20 h20 l5,-5 l5,5 h10 l5,-20 l5,40 l5,-20 h10 l10,-8 l5,8 h20" 
                                  : status.includes('Grace')
                                  ? "M0,25 h40 l10,-10 l5,30 l15,-20 h30 h40 l10,-10 l5,30 l15,-20 h30"
                                  : "M0,25 h200"} />
                        </svg>
                        
                        {/* Fade out edges */}
                        <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-r from-slate-950 via-transparent to-slate-950 pointer-events-none z-30"></div>"""
text = text.replace(old_svg_block, new_svg_block)

with open(r"c:\Users\高晨阳\Desktop\NUS\FT5004\Aeterna\frontend\src\App.tsx", "w", encoding="utf-8") as f:
    f.write(text)
print("Updated successfully")
