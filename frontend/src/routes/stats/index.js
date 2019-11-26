import { h, Component } from "preact";
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
  return (
    <div class={style.chart}>
      <StackedBar
        data={stats.data}
        labels="login"
        title="PR Review Requests"
        colors={["red", "orange", "blue", "skyblue"]}
        // colors={["blue", "#f996ae", "skyblue", "#9ff4df"]}
        roughness={3}
        height={window.innerHeight * 0.7}
        width={window.innerWidth * 0.8}
        fillWeight={0.35}
        strokeWidth={0.5}
        fillStyle="cross-hatch"
        stroke="black"
      />
    </div>
  );
}
