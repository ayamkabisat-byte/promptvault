"use client";

import { useRef, useState } from "react";
import { ArrowLeftRight, RotateCcw } from "lucide-react";

const dimensions = (w, h) => w && h ? `${w} × ${h}` : "Unknown";

export default function SlashLabBeforeAfter({ item }) {
  const [position, setPosition] = useState(50);
  const dragging = useRef(false);
  const originalRatio = Number(item.before_width) > 0 && Number(item.before_height) > 0
    ? `${item.before_width} / ${item.before_height}`
    : "3 / 4";

  function setPositionFromPointer(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0) return;
    const percent = ((event.clientX - bounds.left) / bounds.width) * 100;
    setPosition(Math.max(0, Math.min(100, Math.round(percent))));
  }

  function handlePointerDown(event) {
    if (event.button !== 0 && event.pointerType !== "touch") return;
    dragging.current = true;
    setPositionFromPointer(event);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    if (dragging.current) setPositionFromPointer(event);
  }

  function handlePointerEnd(event) {
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div className="sl2-shell">
      <div className="sl2-stage"
        style={{ aspectRatio: originalRatio }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        role="group"
        aria-label={`Interactive before-and-after image for ${item.command}`}>
        <img className="sl2-photo sl2-original" src={item.before_image_url}
          alt={`Original photograph before ${item.command}`} draggable="false" />
        <div className="sl2-reveal" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }} aria-hidden="true">
          <img className="sl2-photo" src={item.after_image_url} alt="" draggable="false" />
        </div>
        <span className="sl2-label sl2-label-before">ORIGINAL</span>
        <span className="sl2-label sl2-label-after">RESULT</span>
        <div className="sl2-divider" style={{ left: `${position}%` }} aria-hidden="true">
          <div className="sl2-handle"><ArrowLeftRight size={20} strokeWidth={2} /></div>
        </div>
      </div>
      <div className="sl2-controls">
        <div className="sl2-range-labels"><span>BEFORE</span><span>DRAG TO COMPARE</span><span>AFTER</span></div>
        <div className="sl2-range-row">
          <input type="range" min="0" max="100" step="1" value={position}
            aria-label={`Reveal edited image for ${item.command}`}
            aria-valuetext={`${position} percent edited image visible`}
            onChange={(event) => setPosition(Number(event.target.value))} />
          <button type="button" title="Reset comparison to 50 percent" aria-label="Reset comparison slider"
            onClick={() => setPosition(50)}><RotateCcw size={15}/></button>
        </div>
        <div className="sl2-dimensions">
          <span>Before {dimensions(item.before_width, item.before_height)}</span>
          <span>After {dimensions(item.after_width, item.after_height)}</span>
        </div>
      </div>
      <style jsx>{`
        .sl2-shell{background:#07080b;padding:12px 20px 16px;display:flex;flex-direction:column;align-items:center;gap:11px;min-width:0}
        .sl2-stage{position:relative;height:min(53vh,540px);max-width:100%;width:auto;overflow:hidden;touch-action:none;user-select:none;cursor:ew-resize;border:1px solid rgba(255,255,255,.13);border-radius:13px;background:#090a0c;flex:none}
        .sl2-photo{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:contain;object-position:center;pointer-events:none;user-select:none}
        .sl2-reveal{position:absolute;inset:0;pointer-events:none}
        .sl2-label{position:absolute;top:11px;background:rgba(3,4,6,.74);border:1px solid rgba(255,255,255,.13);color:#f5f3ed;border-radius:7px;padding:6px 8px;font-size:9px;font-weight:800;letter-spacing:.12em;pointer-events:none}
        .sl2-label-before{right:11px}.sl2-label-after{left:11px}
        .sl2-divider{position:absolute;top:0;bottom:0;width:2px;background:#fff;transform:translateX(-50%);box-shadow:0 0 0 1px rgba(0,0,0,.15),0 0 12px rgba(0,0,0,.35);pointer-events:none}
        .sl2-handle{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:43px;height:43px;display:flex;align-items:center;justify-content:center;background:#fafafa;color:#171717;border:3px solid rgba(255,255,255,.5);border-radius:50%;box-shadow:0 5px 22px rgba(0,0,0,.4)}
        .sl2-controls{width:min(100%,580px);padding:0 3px;display:flex;flex-direction:column;gap:8px}
        .sl2-range-labels{display:flex;align-items:center;justify-content:space-between;font-size:9px;color:#aaa9b0;letter-spacing:.12em;font-weight:800}
        .sl2-range-labels span:nth-child(2){color:#686970}
        .sl2-range-row{display:flex;align-items:center;gap:10px}
        .sl2-range-row input{flex:1;min-width:0;accent-color:#ff9d2e;cursor:ew-resize;touch-action:pan-y}
        .sl2-range-row button{width:33px;height:33px;flex-shrink:0;display:grid;place-items:center;border:1px solid rgba(255,255,255,.13);border-radius:10px;background:#191a20;color:#f4f4f5;cursor:pointer}
        .sl2-range-row button:hover{color:#ff9d2e;border-color:rgba(255,157,46,.4)}
        .sl2-dimensions{display:flex;justify-content:space-between;gap:15px;color:#767780;font-size:10px}
        @media(max-width:760px){.sl2-shell{padding:8px 10px 12px;gap:9px}.sl2-stage{height:min(50vh,480px)}.sl2-handle{width:38px;height:38px}.sl2-label{font-size:8px;padding:5px 6px}.sl2-dimensions{font-size:9px}}
        @media(max-width:420px){.sl2-stage{height:min(49vh,405px)}.sl2-range-labels span:nth-child(2){font-size:8px}}
      `}</style>
    </div>
  );
}
