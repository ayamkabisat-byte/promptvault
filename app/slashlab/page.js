import Link from "next/link";
import { ArrowLeft, ArrowRight, Camera, Check, ImagePlus, Layers, Slash, Sparkles } from "lucide-react";

export const metadata = {
  title: "SlashLab | PromptVault",
  description: "A curated home for tested photography slash commands with real before-and-after images.",
};

export default function SlashLabPage() {
  return (
    <main className="sl-shell">
      <header className="sl-header">
        <div className="sl-header-inner">
          <Link href="/" className="sl-brand" aria-label="Back to PromptVault">
            <img src="/logo.png" alt="" />
            <span>Prompt<span>Vault</span></span>
          </Link>
          <nav className="sl-nav" aria-label="PromptVault rooms">
            <Link href="/"><ArrowLeft size={14} /> Gallery</Link>
            <Link href="/fashion">Fashion Prompt</Link>
            <span className="sl-nav-current" aria-current="page"><Slash size={14} /> SlashLab</span>
          </nav>
        </div>
      </header>

      <section className="sl-hero">
        <div className="sl-intro">
          <span className="sl-eyebrow"><Sparkles size={14} /> A new room inside PromptVault</span>
          <h1>One slash.<br /><em>New perspective.</em></h1>
          <p>A visual library for short AI photo-editing commands. Every published result will be paired with its actual source photo, so you can see what each slash really changes.</p>
          <div className="sl-tags">
            <span><Slash size={13} /> Single commands first</span>
            <span><Layers size={13} /> Mixed commands later</span>
            <span><Camera size={13} /> Real before &amp; after</span>
          </div>
        </div>
        <div className="sl-hero-art" aria-label="Before and after gallery preview coming soon">
          <div className="sl-art-header"><span><i /> CURATION IN PROGRESS</span><span>SLASHLAB / 001</span></div>
          <div className="sl-preview">
            <div className="sl-preview-half">
              <ImagePlus size={26} strokeWidth={1.25} />
              <strong>BEFORE</strong>
              <small>Source photo</small>
            </div>
            <div className="sl-preview-half sl-after">
              <Sparkles size={26} strokeWidth={1.25} />
              <strong>AFTER</strong>
              <small>Tested slash result</small>
            </div>
          </div>
          <div className="sl-art-bottom"><span>Same photo · Verified transformation</span><span>↔</span></div>
        </div>
      </section>

      <section className="sl-content" aria-label="SlashLab collection">
        <div className="sl-section-head">
          <div>
            <span className="sl-kicker">THE COLLECTION</span>
            <h2>Slash commands, with proof.</h2>
          </div>
          <div className="sl-count">0 <span>published tests</span></div>
        </div>
        <div className="sl-empty">
          <div className="sl-empty-icon"><Slash size={25} /></div>
          <h3>We’re curating the first batch.</h3>
          <p>Nothing is published yet. SlashLab will only show tested commands with genuine before-and-after images — no placeholder results or unverified examples.</p>
          <Link href="/" className="sl-back">Explore PromptVault <ArrowRight size={15} /></Link>
        </div>
        <div className="sl-principles">
          <article><Check size={15} /><div><strong>Short by design</strong><span>Copy the slash, not a lengthy generated prompt.</span></div></article>
          <article><Check size={15} /><div><strong>Tested, not imagined</strong><span>Before and after come from the same actual test.</span></div></article>
          <article><Check size={15} /><div><strong>Different originals welcome</strong><span>Future batches may use different source photos.</span></div></article>
        </div>
      </section>
      <footer className="sl-footer"><span>SLASHLAB · A PROMPTVAULT COLLECTION</span><span>Built for visual experiments</span></footer>
      <style>{`
        .sl-shell{min-height:100vh;background:radial-gradient(ellipse at 83% 15%,rgba(255,157,46,.075),transparent 36%),#070709;color:var(--text);}
        .sl-header{border-bottom:1px solid var(--border);background:rgba(7,7,9,.8)}
        .sl-header-inner{max-width:1500px;margin:auto;padding:14px clamp(18px,3.6vw,56px);display:flex;align-items:center;justify-content:space-between;gap:20px}
        .sl-brand{display:inline-flex;align-items:center;gap:9px;font-size:15px;font-weight:800;letter-spacing:-.025em;white-space:nowrap}
        .sl-brand img{height:30px;width:30px;border-radius:10px;object-fit:cover;border:1px solid var(--border)}
        .sl-brand span span{color:var(--accent)}
        .sl-nav{display:flex;align-items:center;gap:8px}
        .sl-nav a,.sl-nav-current{display:inline-flex;align-items:center;gap:7px;border:1px solid transparent;border-radius:10px;padding:9px 12px;font-size:11px;font-weight:700;color:var(--muted);white-space:nowrap}
        .sl-nav a:hover{color:var(--text);background:var(--surface2)}
        .sl-nav-current{color:var(--accent2);background:var(--accent-soft);border-color:rgba(255,157,46,.2)}
        .sl-hero{max-width:1500px;margin:auto;padding:clamp(52px,8vw,115px) clamp(18px,3.6vw,56px) clamp(65px,7vw,100px);display:grid;grid-template-columns:minmax(0,1.07fr) minmax(0,.93fr);gap:clamp(30px,5vw,90px);align-items:center}
        .sl-eyebrow,.sl-kicker{display:inline-flex;align-items:center;gap:8px;color:var(--accent2);text-transform:uppercase;font-size:10px;font-weight:800;letter-spacing:.17em}
        .sl-intro h1{font-family:var(--font-display),Georgia,serif;font-weight:400;font-size:clamp(52px,6vw,94px);line-height:.99;letter-spacing:-.047em;margin:21px 0 23px}
        .sl-intro h1 em{color:var(--accent);font-weight:400}
        .sl-intro>p{color:var(--muted);font-size:clamp(13px,1.3vw,16px);line-height:1.85;max-width:590px}
        .sl-tags{display:flex;flex-wrap:wrap;gap:9px;margin-top:30px}
        .sl-tags span{border:1px solid var(--border);border-radius:99px;background:rgba(255,255,255,.022);display:flex;gap:7px;align-items:center;padding:9px 12px;color:#b2b1b9;font-size:10px;font-weight:650}
        .sl-tags svg{color:var(--accent)}
        .sl-hero-art{min-width:0;background:linear-gradient(140deg,#17191f,#0b0c10);border:1px solid rgba(255,255,255,.11);border-radius:24px;overflow:hidden;box-shadow:0 32px 90px rgba(0,0,0,.3)}
        .sl-art-header,.sl-art-bottom{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:19px 21px;font-size:9px;letter-spacing:.12em;font-weight:800;color:#85858d}
        .sl-art-header span:first-child{color:var(--accent2);display:flex;align-items:center;gap:8px}
        .sl-art-header i{width:7px;height:7px;background:var(--accent);border-radius:50%;display:inline-block}
        .sl-preview{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#343238;margin:0 18px;border-radius:15px;overflow:hidden;border:1px solid rgba(255,255,255,.08);height:clamp(240px,30vw,390px)}
        .sl-preview-half{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:13px;background:linear-gradient(160deg,#14161b,#1d2026);color:#777981}
        .sl-preview-half svg{color:#7f828d}
        .sl-preview-half strong{font-size:11px;letter-spacing:.16em;color:#c1c0c6}
        .sl-preview-half small{font-size:10px;color:#797c86}
        .sl-preview-half.sl-after{background:radial-gradient(ellipse at 80% 20%,rgba(255,157,46,.13),transparent 55%),linear-gradient(145deg,#1d1916,#111215)}
        .sl-preview-half.sl-after svg{color:#b6905e}
        .sl-art-bottom{padding-top:15px;padding-bottom:17px}
        .sl-art-bottom span:last-child{font-size:19px;color:var(--accent)}
        .sl-content{max-width:1500px;margin:auto;padding:0 clamp(18px,3.6vw,56px) 90px}
        .sl-section-head{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:22px}
        .sl-section-head h2{font-family:var(--font-display),Georgia,serif;font-size:clamp(27px,3vw,42px);font-weight:400;letter-spacing:-.02em;margin:12px 0 0}
        .sl-count{font-weight:700;font-size:24px;white-space:nowrap}.sl-count span{font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:.08em}
        .sl-empty{padding:clamp(44px,6vw,80px) 20px;text-align:center;border:1px dashed rgba(255,255,255,.13);background:linear-gradient(150deg,rgba(255,255,255,.02),rgba(255,157,46,.018));border-radius:23px}
        .sl-empty-icon{width:55px;height:55px;display:grid;place-items:center;border-radius:17px;border:1px solid rgba(255,157,46,.18);background:var(--accent-soft);color:var(--accent);margin:0 auto 19px}
        .sl-empty h3{font-size:18px;letter-spacing:-.015em;margin:0 0 10px}
        .sl-empty p{max-width:530px;margin:0 auto;color:var(--muted);font-size:12px;line-height:1.8}
        .sl-back{display:inline-flex;gap:8px;align-items:center;justify-content:center;margin-top:22px;background:var(--accent);color:#1b1208;font-size:11px;font-weight:800;padding:12px 16px;border-radius:11px}
        .sl-back:hover{background:#ffb553}
        .sl-principles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px;margin-top:20px}
        .sl-principles article{border:1px solid var(--border);background:rgba(255,255,255,.015);border-radius:16px;padding:20px;display:flex;gap:12px}
        .sl-principles article svg{flex-shrink:0;color:var(--green);margin-top:2px}
        .sl-principles strong,.sl-principles span{display:block}
        .sl-principles strong{font-size:12px}.sl-principles span{font-size:11px;color:var(--muted);line-height:1.6;margin-top:6px}
        .sl-footer{max-width:1390px;margin:auto;padding:23px clamp(18px,3.6vw,56px) 36px;border-top:1px solid var(--border);display:flex;justify-content:space-between;gap:12px;color:var(--dim);font-size:9px;letter-spacing:.11em}
        @media(max-width:950px){.sl-hero{grid-template-columns:1fr;padding-top:65px}.sl-hero-art{max-width:660px;width:100%}.sl-preview{height:280px}}
        @media(max-width:600px){.sl-header-inner{align-items:flex-start;gap:8px}.sl-brand{font-size:12px}.sl-brand img{height:27px;width:27px}.sl-nav{gap:0}.sl-nav a,.sl-nav-current{font-size:10px;padding:8px}.sl-nav a:nth-child(2){display:none}.sl-hero{padding-top:48px;padding-bottom:65px}.sl-intro h1{font-size:clamp(47px,12vw,66px)}.sl-preview{height:220px}.sl-art-header,.sl-art-bottom{padding-left:14px;padding-right:14px}.sl-count{font-size:21px}.sl-count span{display:block;font-size:8px}.sl-principles{grid-template-columns:1fr;gap:10px}.sl-footer{flex-direction:column}}
      `}</style>
    </main>
  );
}
