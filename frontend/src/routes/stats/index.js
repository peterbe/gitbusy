import { h, Component } from "preact";
import { useState, useEffect } from "preact/hooks";
import { StackedBar } from "./roughviz-wrapper";
import style from "./style";

export default class Stats extends Component {
  state = {
    loading: false,
    fetchError: null,
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
        this.setState({ fetchError: null, stats, loading: false });
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
                target="_blank"
                rel="noopener"
              >
                {name}
              </a>
            );
          })}
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
  const [roughness, setRoughness] = useState(3);
  return (
    <div class={style.chart}>
      <StackedBar
        data={stats.stacked_bar_data}
        labels="login"
        title="PR Review Requests"
        colors={["red", "orange", "blue", "maroon"]}
        // colors={["blue", "#f996ae", "skyblue", "#9ff4df"]}
        roughness={roughness}
        height={window.innerHeight * 0.7}
        width={window.innerWidth * 0.8}
        fillWeight={0.35}
        strokeWidth={0.5}
        fillStyle="cross-hatch"
        stroke="black"
      />
      <p>
        <div>
          <input
            type="range"
            id="id_roughness"
            name="cowbell"
            min="0"
            max="10"
            value={roughness}
            step="1"
            onChange={event => {
              setRoughness(parseInt(event.target.value));
            }}
          />
          <label for="id_roughness">Roughness</label>
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
            <a href={user.html_url} target="_blank" rel="noopener">
              <img src={user.avatar_url} width="64" class={style.avatar} />
              {/* {login} */}
            </a>
          </dt>
        ];
        Object.entries(stats.prs_per_user[login]).forEach(([pr_id, weight]) => {
          const pr = stats.prs[pr_id];
          rows.push(
            <dd key={`${login}:pr:${pr_id}`}>
              <a
                href={pr.base.repo.html_url}
                target="_blank"
                rel="noopener"
                class={style.repo}
              >
                {pr.base.repo.full_name}
              </a>
              <a href={pr.html_url} target="_blank" rel="noopener">
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
