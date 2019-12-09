import { Component, h } from "preact";
import { useRef, useState } from "preact/hooks";
import { Link } from "preact-router/match";
// import { StackedBar } from "./roughviz-wrapper";
import { BarH } from "./roughviz-wrapper";
import style from "./style";

export default class Stats extends Component {
  state = {
    fetchError: null,
    loading: false,
    stats: null
  };

  componentDidMount() {
    const { repos } = this.props;
    this.fetch(repos);
  }

  fetch = repos => {
    this.setState({ loading: true }, async () => {
      let url = `/api/pr-review-requests?repos=${repos}`;
      let response;
      try {
        response = await fetch(url);
      } catch (ex) {
        return this.setState({ fetchError: ex, loading: false });
      }
      if (response.ok) {
        const stats = await response.json();
        this.setState({ fetchError: null, loading: false, stats });
      } else {
        this.setState({ fetchError: response, loading: false });
      }
    });
  };

  // Note: `repos` comes from the URL, courtesy of our router
  render({ repos }, { loading, fetchError, stats }) {
    const split = repos.split(",");
    return (
      <div class={style.stats}>
        <h1>
          Repos:
          {split.map(name => {
            return (
              <a
                class={style.repourl}
                href={`https://github.com/${name}`}
                key={name}
                rel="noopener"
                target="_blank"
              >
                {name}
              </a>
            );
          })}
          <Link
            href={`/?picked=${repos}`}
            title="Add more"
            class={style.addmore}
          >
            +
          </Link>
        </h1>
        {loading && (
          <p>
            <i>Loading...</i>
          </p>
        )}
        {fetchError && <FetchError error={fetchError} />}

        {stats && <ShowStats stats={stats} />}
      </div>
    );
  }
}

function FetchError({ error }) {
  return (
    <div class={style.fetcherror}>
      <h4>Fetch Error</h4>
      {error instanceof window.Response ? (
        <p>
          Status: <b>{error.status}</b> <i>{error.statusText}</i>
        </p>
      ) : (
        <p>
          <code>{error.toString()}</code>
        </p>
      )}
    </div>
  );
}

function sessionStore(key, value, json = false) {
  try {
    if (json) {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } else {
      window.sessionStorage.setItem(key, value);
    }
  } catch (ex) {
    console.warn(`sessionRetrieve error on '${key}' (${ex.toString()})`);
  }
}

function sessionRetrieve(key, default_, json = false) {
  try {
    if (json) {
      return JSON.parse(window.sessionStorage.getItem(key) || default_);
    } else {
      return window.sessionStorage.getItem(key) || default_;
    }
  } catch (ex) {
    console.warn(`sessionRetrieve error on '${key}' (${ex.toString()})`);
    return default_;
  }
}

function ShowStats({ stats }) {
  const [roughness, setRoughness] = useState(
    sessionRetrieve("default-roughness"),
    3,
    true
  );
  const [fillStyle, setFillStyle] = useState(
    sessionRetrieve("default-fillstyle", FILL_STYLE_OPTIONS[0])
  );
  const containerRef = useRef();
  return (
    <div class={style.chart} ref={containerRef}>
      {/* https://github.com/jwilber/roughViz#BarH */}
      <BarH
        color="tan"
        xLabel="# Pull request review requests"
        axisFontSize="1.1rem"
        axisRoughness="0.2"
        title="PR Review Requests"
        fillStyle={fillStyle}
        fillWeight="0.3"
        data={stats.bar_data}
        roughness={roughness}
        width={
          (containerRef.current
            ? containerRef.current.clientWidth
            : window.innerWidth) * 0.8
        }

        // fillWeight [number]: Weight of inner paths' color. Default: 0.5.
        // font: Font-family to use. You can use 0 or gaegu to use Gaegu, or 1 or indie flower to use Indie Flower. Or feed it something else. Default: Gaegu.
        // highlight [string]: Color for each bar on hover. Default: 'coral'.
        // innerStrokeWidth [number]: Stroke-width for paths inside bars. Default: 1.
        // interactive [boolean]: Whether or not chart is interactive. Default: true.
        // labelFontSize [string]: Font-size for axes' labels. Default: '1rem'.
        // margin [object]: Margin object. Default: {top: 50, right: 20, bottom: 70, left: 100}
        // padding [number]: Padding between bars. Default: 0.1.
        // roughness [number]: Roughness level of chart. Default: 1.
        // simplification [number]: Chart simplification. Default 0.2.
        // stroke [string]: Color of bars' stroke. Default: black.
        // strokeWidth [number]: Size of bars' stroke. Default: 1.
        // title [string]: Chart title. Optional.
        // titleFontSize [string]: Font-size for chart title. Default: '1rem'.
        // tooltipFontSize [string]: Font-size for tooltip. Default: '0.95rem'.
        // xLabel [string]: Label for x-axis.
        // yLabel [string]: Label for y-axis.
      />

      {/* <StackedBar
        colors={["red", "orange", "blue", "maroon"]}
        data={stats.stacked_bar_data}
        fillStyle="cross-hatch"
        fillWeight={0.35}
        height={window.innerHeight * 0.7}
        labels="login"
        // colors={["blue", "#f996ae", "skyblue", "#9ff4df"]}
        roughness={roughness}
        stroke="black"
        strokeWidth={0.5}
        title="PR Review Requests"
        width={
          (containerRef.current
            ? containerRef.current.clientWidth
            : window.innerWidth) * 0.9
        }
      /> */}

      <div>
        <h4>Absolutely Critical Chart Options</h4>
        <Roughness
          initialValue={roughness}
          update={value => {
            setRoughness(value);
            sessionStore("default-roughness", value, true);
          }}
        />
        <Fillstyle
          initialValue={fillStyle}
          update={value => {
            setFillStyle(value);
            sessionStore("default-fillstyle", value);
          }}
        />
      </div>

      <PRList stats={stats} />
    </div>
  );
}

function Roughness({ initialValue, update }) {
  const [active, setActive] = useState(false);
  const [value, setValue] = useState(initialValue);
  return (
    <div>
      <label for="id_roughness">
        Roughness {active && <small>{value}</small>}
      </label>
      <br />
      <input
        id="id_roughness"
        max="9"
        min="0"
        onMouseDown={event => {
          setActive(true);
        }}
        onMouseUp={event => {
          setActive(false);
        }}
        onInput={event => {
          const newRoughness = parseInt(event.target.value);
          setValue(newRoughness);
          update(newRoughness);
        }}
        step="1"
        type="range"
        value={value}
      />
    </div>
  );
}

const FILL_STYLE_OPTIONS = [
  "hachure",
  "cross-hatch",
  "zigzag",
  "dashed",
  "solid",
  "zigzag-line"
];

function Fillstyle({ initialValue, update }) {
  return (
    <div>
      <label for="id_fillstyle">Fill style</label>
      <select
        value={initialValue}
        onInput={event => {
          FILL_STYLE_OPTIONS.includes(event.target.value) &&
            update(event.target.value);
        }}
      >
        {" "}
        {FILL_STYLE_OPTIONS.map(name => (
          <option value={name} key={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}

function PRList({ stats }) {
  return (
    <dl class={style.prlist}>
      {stats.busiest_users.map(login => {
        const user = stats.users[login];
        const rows = [
          <dt key={`user:${login}`}>
            <a href={user.html_url} rel="noopener" target="_blank">
              <img class={style.avatar} src={user.avatar_url} width="64" />
              {/* {login} */}
            </a>
            <b>{Object.keys(stats.prs_per_user[login]).length}</b> PR review
            requests for{" "}
            <a href={user.html_url} rel="noopener" target="_blank">
              {login}
            </a>
          </dt>
        ];
        Object.entries(stats.prs_per_user[login]).forEach(([pr_id, weight]) => {
          const pr = stats.prs[pr_id];
          rows.push(
            <dd key={`${login}:pr:${pr_id}`}>
              <a
                class={style.repo}
                href={`${pr.base.repo.html_url}/pulls/review-requested/${login}`}
                title={`All PRs in ${pr.base.repo.name} with reviews requested of ${login}`}
                rel="noopener"
                target="_blank"
              >
                {pr.base.repo.full_name}
              </a>
              <a href={pr.html_url} rel="noopener" target="_blank">
                <b>#{pr.number}</b> {pr.title}
              </a>{" "}
              <small>(weight {weight})</small>
            </dd>
          );
        });
        return rows;
      })}
    </dl>
  );
}
