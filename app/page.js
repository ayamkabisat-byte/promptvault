import Link from "next/link";
import GalleryV2 from "@/components/GalleryV2";

export default function HomePage() {
  return (
    <>
      <Link href="/fashion" className="fashion-room-entry" aria-label="Open Fashion Prompt">
        <span>✦</span>
        <b>Fashion Prompt</b>
        <small>Infographic Room</small>
      </Link>
      <GalleryV2 />
      <style>{`
        .fashion-room-entry{
          position:fixed;
          right:18px;
          bottom:18px;
          z-index:55;
          min-width:168px;
          min-height:48px;
          padding:8px 13px;
          border-radius:16px;
          border:1px solid rgba(216,202,255,.22);
          background:linear-gradient(145deg,rgba(22,17,32,.96),rgba(10,8,15,.96));
          box-shadow:0 14px 46px rgba(0,0,0,.38),0 0 36px rgba(143,115,231,.08);
          color:#f4efff;
          text-decoration:none;
          display:grid;
          grid-template-columns:24px 1fr;
          grid-template-rows:auto auto;
          column-gap:7px;
          align-items:center;
          backdrop-filter:blur(14px);
          transition:.2s transform,.2s border-color;
        }
        .fashion-room-entry:hover{transform:translateY(-2px);border-color:rgba(216,202,255,.5)}
        .fashion-room-entry>span{grid-row:1/3;width:24px;height:24px;border-radius:8px;background:#b8a1ff;color:#130e1e;display:grid;place-items:center;font-size:12px}
        .fashion-room-entry b{font-size:11px;letter-spacing:-.01em;line-height:1.1}
        .fashion-room-entry small{font-size:7px;text-transform:uppercase;letter-spacing:.12em;color:#9f92ad;margin-top:2px}
        @media(max-width:640px){.fashion-room-entry{right:12px;bottom:12px;min-width:0}.fashion-room-entry b,.fashion-room-entry small{display:none}.fashion-room-entry{display:grid;grid-template-columns:28px;padding:8px}.fashion-room-entry>span{grid-row:auto;width:28px;height:28px}}
      `}</style>
    </>
  );
}
