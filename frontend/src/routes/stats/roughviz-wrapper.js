import { useRef, useState, useEffect } from "preact/hooks";
import * as rv from "rough-viz/dist/roughviz.min";

const generateId = prefix => `${prefix}${("" + Math.random()).split(".")[1]}`;

const wrap = rvComp => ({ prefix, ...props }) => {
  const ref = useRef();
  const [id] = useState(generateId(prefix || "roughviz-"));
  useEffect(() => {
    if (ref.current) {
      // console.log("this.chart?", this.chart);
      if (this.chart) {
        // [...ref.current.querySelector('svg,div')].forEach()
        ref.current.querySelectorAll("*").forEach(n => n.remove());
        // console.log(ref.current);
        // this.chart.svg.selectAll("*").remove();
      }
      this.chart = new rvComp({
        element: "#" + id,
        ...props
      });
    }
  }, [ref, id, props]);

  return <div id={id} ref={ref} />;
};

export const Bar = wrap(rv.Bar);
export const BarH = wrap(rv.BarH);
export const StackedBar = wrap(rv.StackedBar);
export const Donut = wrap(rv.Donut);
export const Pie = wrap(rv.Pie);
export const Scatter = wrap(rv.Scatter);
export const Line = wrap(rv.Line);
