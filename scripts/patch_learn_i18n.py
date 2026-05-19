from pathlib import Path

path = Path(__file__).resolve().parents[1] / "frontend/src/plugins/LearnView.tsx"
c = path.read_text(encoding="utf-8")

old_default = """      default: return (
        <motion className="flex flex-col items-center justify-center h-full text-center p-8">
           <motion className="w-16 h-16 bg-[#2979ff]/10 rounded-full flex items-center justify-center mb-6">
              <Zap className="w-8 h-8 text-[#2979ff] animate-pulse" />
           </motion>
           <h2 className="text-2xl font-light text-white mb-2">Knowledge Module</h2>
           <p className="text-gray-500 max-w-md mb-8">This feature is currently being optimized for real-time knowledge generation.</p>
           <button 
             onClick={() => setMode('dashboard')}
             className="px-6 py-2 border border-white/10 rounded-[4px] text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
           >
             BACK TO DASHBOARD
           </button>
        </motion>
      );"""

old_default2 = old_default.replace("<motion", "<div").replace("</motion>", "</div>")

new_default = """      default:
        return <PluginPlaceholder onBack={() => setMode('dashboard')} />;"""

if "PluginPlaceholder" in c and "default:" in c:
    for block in [old_default, old_default2]:
        if block in c:
            c = c.replace(block, new_default)
            break

path.write_text(c, encoding="utf-8")
print("done learn")
