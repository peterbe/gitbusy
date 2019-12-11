import { h, Component } from "preact";
import style from "./style";

export function DisplayRateLimited({ rateLimited }) {
  if (!rateLimited) {
    return null;
  }

  return (
    <div class={style.ratelimited}>
      <p>Rate limited: {JSON.stringify(rateLimited)}</p>
    </div>
  );
}
