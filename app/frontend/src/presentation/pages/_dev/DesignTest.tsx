import React from 'react';
import HealthLogo from '@/presentation/components/ui/HealthLogo';

const DesignTest: React.FC = () => {

  return (
    <div className="min-h-screen bg-bg-main text-brand-dark font-sans selection:bg-secondary selection:text-bg-main">
      {/* DesignTest Components */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* LOGO SHOWCASE */}
        <section className="flex flex-col items-center justify-center py-24 mb-24 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(57,115,103,0.06),transparent_70%)]"></div>
          <div className="relative group">
            <div className="absolute -inset-12 bg-linear-to-tr from-primary/10 via-accent/5 to-secondary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
            <HealthLogo
              className="w-48 h-48 md:w-56 md:h-56 drop-shadow-lg transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <h2 className="mt-10 text-7xl md:text-8xl font-iceland text-primary select-none">
            Health<span className="text-accent">Monitor</span>
          </h2>
          <p className="mt-4 text-lg text-brand-dark/40 font-iceland tracking-[0.2em] uppercase">
            Precision Health Platform
          </p>
          <div className="mt-6 w-24 h-px bg-linear-to-r from-transparent via-accent to-transparent"></div>
        </section>

        {/* 2. HERO DASHBOARD TEASER */}
        <header className="grid grid-cols-1 xl:grid-cols-12 gap-12 mb-24">
          <div className="xl:col-span-7 space-y-10">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-accent/10 border-l-4 border-accent text-accent">
                <span className="w-2 h-2 rounded-full bg-accent animate-ping"></span>
                <span className="text-sm font-bold tracking-[0.3em] font-iceland uppercase">System Active | v2.4</span>
            </div>
            <h2 className="text-8xl lg:text-9xl font-iceland leading-[0.85] text-primary tracking-tighter">
              PRECISION <br />
              <span className="text-brand-dark italic mix-blend-multiply">MEETS</span> <br />
              <span className="text-accent-hover drop-shadow-lg">HARMONY</span>
            </h2>
            <p className="text-xl text-brand-dark/60 max-w-xl leading-relaxed font-medium">
              O paletă care definește viitorul platformei. Verdele <span className="text-primary font-bold">#2e3d24</span> oferă autoritate, 
              în timp ce nuanțele de <span className="text-secondary font-bold">#C17C74</span> aduc căldură și echilibru.
            </p>
            <div className="flex flex-wrap gap-6">
              <button className="bg-primary-hover text-brand-light px-10 py-5 rounded-sm font-iceland text-3xl hover:bg-primary transition-all shadow-2xl hover:-translate-y-1">
                EXECUTE COMMAND
              </button>
              <button className="bg-brand-light border-2 border-brand-dark text-brand-dark px-10 py-5 rounded-sm font-iceland text-3xl hover:bg-brand-dark hover:text-brand-light transition-all">
                SECURE VIEW
              </button>
            </div>
          </div>

          <div className="xl:col-span-5 relative group">
            <div className="absolute -inset-4 bg-linear-to-tr from-primary/20 via-accent/10 to-secondary/20 rounded-[3rem] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
            <div className="relative bg-brand-light/90 border border-brand-light p-8 rounded-4xl shadow-3xl backdrop-blur-sm space-y-8">
                <h3 className="text-4xl font-iceland text-brand-dark flex justify-between items-center">
                    BIOMETRICS
                    <span className="text-xs font-mono text-brand-dark/40 tracking-widest">REAL-TIME FEED</span>
                </h3>
                
                <div className="space-y-6">
                    <BiometricRow label="HEART RATE" value={78} unit="BPM" color="text-primary" progress={78} />
                    <BiometricRow label="OXYGEN LEVEL" value={98} unit="%" color="text-accent" progress={98} />
                    <BiometricRow label="STRESS INDEX" value={22} unit="pts" color="text-secondary" progress={22} />
                </div>

                <div className="pt-6 grid grid-cols-2 gap-4">
                    <div className="p-4 bg-brand-light/20 rounded-2xl border border-brand-light/40">
                         <p className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-[0.2em]">Daily Goal</p>
                         <p className="text-3xl font-iceland text-primary mt-1">12.4K</p>
                         <p className="text-[10px] font-mono text-accent mt-1">+12% from avg</p>
                    </div>
                    <div className="p-4 bg-brand-dark text-brand-light rounded-2xl shadow-xl shadow-brand-dark/20">
                         <p className="text-[10px] font-bold text-bg-main/40 uppercase tracking-[0.2em]">Efficiency</p>
                         <p className="text-3xl font-iceland text-secondary mt-1">94.2</p>
                         <p className="text-[10px] font-mono text-secondary-soft/50 mt-1">Optimized Loop</p>
                    </div>
                </div>
            </div>
          </div>
        </header>

        {/* 3. COMPONENT LAB & UI ELEMENTS */}
        <section className="bg-brand-dark text-brand-light rounded-[4rem] p-16 mb-24 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(57,115,103,0.15),transparent_50%)]"></div>
            <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,rgba(193,124,116,0.15),transparent_50%)]"></div>
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20">
                <div className="space-y-12">
                   <div>
                        <h4 className="text-5xl font-iceland tracking-[0.2em]">COMPONENT <span className="text-accent">LAB</span></h4>
                        <p className="mt-4 text-brand-light/60 max-w-sm">Testăm interacțiunile atomice: de la input-uri la toggle-uri, folosind întreaga plajă cromatică.</p>
                   </div>
                   
                   <div className="space-y-8 max-w-md">
                        <div className="space-y-3">
                            <label className="text-xs font-bold tracking-[0.3em] text-brand-light/60">SYSTEM INPUT</label>
                            <input 
                                type="text" 
                                placeholder="Enter encrypted key..."
                                className="w-full bg-brand-light/5 border border-brand-light/10 p-4 rounded-sm focus:outline-none focus:border-accent transition-all text-xl font-iceland tracking-widest placeholder:text-brand-light/20"
                            />
                        </div>

                        <div className="flex gap-12">
                            <div className="space-y-4">
                                <label className="text-xs font-bold tracking-[0.3em] text-brand-light/60">TOGGLES</label>
                                <div className="flex items-center gap-4">
                                    <Switch active />
                                    <span className="font-iceland text-lg uppercase">System Sync</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Switch />
                                    <span className="font-iceland text-lg uppercase text-brand-light/40">Legacy Mode</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-xs font-bold tracking-[0.3em] text-brand-light/60">MARKERS</label>
                                <div className="flex gap-3">
                                    <div className="w-6 h-6 rounded-full bg-primary border-2 border-brand-light/20"></div>
                                    <div className="w-6 h-6 rounded-full bg-secondary border-2 border-brand-light/20"></div>
                                    <div className="w-6 h-6 rounded-full bg-accent border-2 border-brand-light/20"></div>
                                    <div className="w-6 h-6 rounded-full bg-primary-hover border-2 border-brand-light/20"></div>
                                </div>
                            </div>
                        </div>
                   </div>
                </div>

                <div className="bg-brand-light rounded-3xl p-12 text-brand-dark space-y-8 shadow-inner">
                    <h5 className="text-2xl font-bold font-iceland tracking-widest border-b border-brand-light pb-4">VISUAL HIERARCHY TEST</h5>
                    <div className="grid grid-cols-1 gap-6">
                        <div className="p-6 bg-brand-light/10 border-l-4 border-secondary-soft rounded-r-xl">
                            <p className="text-sm font-bold opacity-60">SYSTEM ALERT</p>
                            <p className="text-xl font-iceland mt-1">Parametrii vitali sunt în limitele optime de operare.</p>
                            <button className="mt-4 text-xs font-black uppercase text-secondary tracking-[0.3em] hover:text-primary transition-colors">Confirm Status →</button>
                        </div>
                        <div className="p-6 bg-accent/5 border-l-4 border-accent rounded-r-xl">
                            <p className="text-sm font-bold text-accent">DATA FLOW ACTIVE</p>
                            <div className="grid grid-cols-4 gap-2 mt-4">
                                {[1,2,3,4].map(idx => <div key={idx} className={`h-8 rounded-sm ${idx % 2 === 0 ? 'bg-accent/40' : 'bg-primary/40'}`}></div>)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* 4. TYPOGRAPHY & PALETTE EXPLORER */}
        <section className="py-24 grid grid-cols-1 lg:grid-cols-2 gap-24">
            <div className="space-y-12">
                <h6 className="text-5xl font-iceland tracking-widest border-b-2 border-secondary inline-block pb-2">TYPOGRAPHY</h6>
                <div className="space-y-10">
                    <div className="group">
                        <p className="text-[10px] font-mono text-brand-dark/20 uppercase tracking-[0.4em] group-hover:text-primary transition-colors">Iceland Regular / 96pt</p>
                        <h2 className="text-7xl font-iceland text-primary group-hover:tracking-wider transition-all duration-700">Digital Origin</h2>
                    </div>
                    <div className="group">
                        <p className="text-[10px] font-mono text-brand-dark/20 uppercase tracking-[0.4em] group-hover:text-secondary transition-colors">Inter Bold / 42pt</p>
                        <h2 className="text-4xl font-bold text-brand-dark">The quick brown fox jumps over the lazy dog</h2>
                    </div>
                    <div>
                        <p className="text-[10px] font-mono text-brand-dark/20 uppercase tracking-[0.4em] mb-4">Inter Regular / 16pt / 160% Leading</p>
                        <p className="text-lg text-brand-dark/60 leading-relaxed max-w-lg italic">
                           "Acuratețea este fundamentul viitorului nostru digital. Prin culoarea <span className="text-primary font-bold">Primary</span> ne ancorăm brandul, iar prin <span className="text-accent underline decoration-accent/30 underline-offset-4">Highlights</span> ghidăm utilizatorul spre performanță."
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-12">
                <h6 className="text-5xl font-iceland tracking-widest border-b-2 border-primary inline-block pb-2">PALETTE MATRIX</h6>
                <div className="grid grid-cols-2 gap-6">
                    <ColorTile color="#2e3d24" name="Primary" sub="Forest Deep" code="--color-primary" />
                    <ColorTile color="#8c462b" name="Primary Hover" sub="Rust Ember" code="--color-primary-hover" />
                    <ColorTile color="#C17C74" name="Secondary" sub="Dusty Coral" code="--color-secondary" />
                    <ColorTile color="#397367" name="Accent" sub="Deep Seafoam" code="--color-accent" />
                    <ColorTile color="#FF7F50" name="Accent Hover" sub="Neon Salmon" code="--color-accent-hover" isDark />
                    <ColorTile color="#5e0a0a" name="Brand Dark" sub="Oxblood Red" code="--color-brand-dark" />
                    <ColorTile color="#F7E7CE" name="Brand Light" sub="Champagne Silk" code="--color-brand-light" isTextDark />
                    <ColorTile color="#fdfcfb" name="Main BG" sub="Anti-Flash White" code="--color-bg-main" isTextDark />
                </div>
            </div>
        </section>
      </main>


    </div>
  );
};

const BiometricRow = ({ label, value, unit, color, progress }: any) => (
    <div className="space-y-2 group">
        <div className="flex justify-between items-end">
            <span className="text-[10px] font-bold text-brand-dark/40 tracking-[0.2em]">{label}</span>
            <span className={`text-4xl font-iceland ${color}`}>{value}<span className="text-sm ml-1 text-brand-dark/20 uppercase font-mono">{unit}</span></span>
        </div>
        <div className="h-1.5 bg-brand-light/40 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-current transition-all duration-1000 group-hover:opacity-80 ${color.replace('text-', 'bg-')}`} 
              style={{ width: `${progress}%` }}
            ></div>
        </div>
    </div>
);

const Switch = ({ active }: { active?: boolean }) => (
    <div className={`w-12 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${active ? 'bg-accent' : 'bg-brand-light/10'}`}>
        <div className={`w-4 h-4 rounded-full bg-bg-main shadow-md transition-transform ${active ? 'translate-x-6' : 'translate-x-0'}`}></div>
    </div>
);

const ColorTile = ({ color, name, sub, code, isDark, isTextDark }: any) => (
    <div 
        className={`p-6 rounded-2xl border border-brand-light shadow-xl flex flex-col justify-between h-44 transform hover:-translate-y-2 transition-all cursor-crosshair group relative overflow-hidden`}
        style={{ backgroundColor: color, color: isTextDark ? '#5e0a0a' : isDark ? '#F7E7CE' : '#fdfcfb' }}
    >
        <div className="absolute top-2 right-2 w-12 h-12 bg-brand-light/5 rounded-full -translate-y-8 translate-x-8 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-500"></div>
        <div className="relative z-10">
            <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest">{code}</p>
            <p className="text-3xl font-iceland tracking-widest mt-1 group-hover:scale-110 transition-transform origin-left">{name}</p>
        </div>
        <div className="relative z-10 flex justify-between items-center">
            <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 italic">{sub}</p>
                <p className="text-xs font-mono font-bold tracking-tighter">{color}</p>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></div>
        </div>
    </div>
);

export default DesignTest;
