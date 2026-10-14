export default function SupportBanner() {
  return (
    <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl text-center mt-8 max-w-2xl mx-auto">
      <h3 className="text-lg font-semibold text-slate-800 mb-2">
        Find this tool helpful? 🚀
      </h3>
      <p className="text-slate-600 mb-4 text-sm">
        Running Insurance Samjho's Gemma-2 backend on Modal costs real GPU money. If this saved you time parsing a tricky policy, consider helping keep the online architecture running!
      </p>
      <a 
        href="https://buymeacoffee.com/halfbloodcoder" 
        target="_blank" 
        rel="noreferrer"
        className="inline-flex items-center px-5 py-2.5 bg-[#FFDD00] text-black font-semibold rounded-lg shadow-sm hover:bg-[#FFD000] transition-colors"
      >
        ☕ Buy me a coffee
      </a>
    </div>
  );
}
