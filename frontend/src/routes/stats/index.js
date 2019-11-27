import { Component, h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { Link } from "preact-router/match";
import { StackedBar } from "./roughviz-wrapper";
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
      let url = `/api/open-prs?repos=${repos}`;
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

function ShowStats({ stats }) {
  const [roughness, setRoughness] = useState(
    JSON.parse(window.sessionStorage.getItem("default-roughness") || "3")
  );
  const containerRef = useRef();
  return (
    <div class={style.chart} ref={containerRef}>
      <StackedBar
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
      />
      <p>
        <div>
          <label for="id_roughness">Roughness</label>
          <br />
          <input
            id="id_roughness"
            max="9"
            min="0"
            // name="roughness"
            onInput={event => {
              const newRoughness = parseInt(event.target.value);
              setRoughness(newRoughness);
              window.sessionStorage.setItem(
                "default-roughness",
                JSON.stringify(newRoughness)
              );
            }}
            step="1"
            type="range"
            value={roughness}
          />
        </div>
      </p>
      <PRList stats={stats} />
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
          </dt>
        ];
        Object.entries(stats.prs_per_user[login]).forEach(([pr_id, weight]) => {
          const pr = stats.prs[pr_id];
          rows.push(
            <dd key={`${login}:pr:${pr_id}`}>
              <a
                class={style.repo}
                href={pr.base.repo.html_url}
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
