"use client";

import { useEffect, useState } from "react";

/**
 * 色面の中に置くステータス行。動くのは時計だけ。
 * サーバーでは時刻を出さず、マウント後に JST を刻み始める
 * （SSR とのずれによるちらつきを避けるため）。
 */
export function StatusLine() {
  const [time, setTime] = useState("--:--:--");

  useEffect(() => {
    const format = new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Tokyo",
    });
    const tick = () => setTime(format.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="label space-y-1 text-cyan/90">
      <p aria-hidden="true">●</p>
      <p>
        <time>{time}</time> JST
      </p>
      <p>TOKYO, JP</p>
      <p>STATUS : WORKING</p>
    </div>
  );
}
