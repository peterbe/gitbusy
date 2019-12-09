import { h, Component } from "preact";
import { Link } from "preact-router/match";
import { throttle } from "throttle-debounce";
import style from "./style";

export default class Home extends Component {
  state = {
    q: "",
    results: null,
    picked: [],
    searchError: null,
    searching: false
  };

  componentDidMount() {
    if (!this.state.picked.length) {
      if (this.props.picked || localStorage.getItem("picked")) {
        const names = this.props.picked
          ? this.props.picked.split(",")
          : JSON.parse(localStorage.getItem("picked"));
        // E.g. the current url being `/?picked=foo,bar`
        this.setState({ searching: true }, async () => {
          const values = await Promise.all(
            names.map(async q => {
              const response = await fetch(
                `/api/search-repos?exact=true&q=${encodeURIComponent(q)}`
              );
              if (!response.ok) {
                throw new Error(`${response.status} on ${response.url}`);
              }
              return await response.json();
            })
          ).catch(err => {
            this.setState({ searchError: err, searching: false });
          });
          if (values) {
            const picked = values
              .map(thing => (thing.items.length ? thing.items[0] : null))
              .filter(x => !!x);
            this.setState({ searchError: null, searching: false, picked });
          }
        });
      }
    }
  }

  updateQ = e => {
    this.setState({ q: e.target.value }, () => {
      if (this.state.q.trim()) {
        this.throttledSearch();
      } else {
        this.setState({ results: null });
      }
    });
  };

  search = () => {
    this.setState({ searching: true }, this.startSearch);
  };

  startSearch = async () => {
    const { q } = this.state;
    let response;
    try {
      response = await fetch(`/api/search-repos?q=${encodeURIComponent(q)}`);
    } catch (ex) {
      return this.setState({ searchError: ex, searching: false });
    }

    if (response.ok) {
      let results = await response.json();
      this.setState({
        searchError: null,
        searching: false,
        results
      });
    } else {
      this.setState({ searchError: response, searching: false });
    }
  };

  throttledSearch = throttle(500, this.search);

  togglePicked = found => {
    let picked;
    if (this.state.picked.filter(p => p.id === found.id).length) {
      picked = this.state.picked.filter(p => p.id !== found.id);
    } else {
      picked = this.state.picked.slice(0);
      picked.unshift(found);
    }
    this.setState({ picked, results: null, q: "" }, () => {
      const names = this.state.picked.map(x => x.full_name);
      if (names.length) {
        window.localStorage.setItem("picked", JSON.stringify(names));
      } else if (window.localStorage.setItem("picked")) {
        console.log("DELETE?", window.localStorage.getItem("picked"));
      }
    });
  };

  render(_, { q, picked, results, searchError, searching }) {
    return (
      <div class={style.home}>
        <h2>Find your repos</h2>
        <form
          onsubmit={event => {
            event.preventSubmit();
          }}
        >
          <input
            type="search"
            value={q}
            onInput={this.updateQ}
            class={style.searchinput}
            placeholder="E.g. myorg/myrepo"
          />
        </form>
        {searchError && <ShowSearchError error={searchError} />}

        {results && (
          <ShowFound
            count={results.total_count}
            found={results.items}
            togglePicked={this.togglePicked}
          />
        )}
        {searching && <small>Searching...</small>}
        <p>{q}</p>

        {picked.length ? (
          <ShowPickedRepos repos={picked} removeRepo={this.togglePicked} />
        ) : null}
      </div>
    );
  }
}

function ShowSearchError({ error }) {
  return (
    <div class={style.searcherror}>
      <h4>Search Error</h4>
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

function ShowPickedRepos({ repos, removeRepo }) {
  const fullNames = repos.map(r => r.full_name).sort();
  const allURL = `/stats/pr-review-requests/${encodeURIComponent(
    fullNames.join(",")
  )}`;
  return (
    <div class={style.pickedrepos}>
      <h3>Picked repos</h3>
      <ul>
        {repos.map(repo => {
          return (
            <li>
              <a
                title="Remove"
                style={{ float: "right" }}
                onClick={event => {
                  event.preventDefault();
                  removeRepo(repo);
                }}
              >
                🗑
              </a>
              <Link
                href={`/stats/pr-review-requests/${encodeURIComponent(
                  repo.full_name
                )}`}
              >
                <b>{repo.full_name}</b>
              </Link>
              <br />
              <small>
                {repo.watchers} watchers, {repo.open_issues} open issues;{" "}
                <i>{repo.description}</i>
              </small>
              <br />
              <small>
                <a
                  title="Go to repo on GitHub.com"
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener"
                >
                  {repo.html_url}
                </a>
              </small>
            </li>
          );
        })}
      </ul>

      <h4 style={{ textAlign: "center" }}>
        <Link href={allURL}>Load stats for all</Link>
      </h4>
    </div>
  );
}

function ShowFound({ found, count, togglePicked }) {
  if (!found.length) {
    return (
      <div class={style.found}>
        <p>
          <i>Nothing found </i> 🧐
        </p>
      </div>
    );
  }
  return (
    <div class={style.found}>
      <ul>
        {found.map(found => {
          return (
            <li key={found.id} onClick={e => togglePicked(found)}>
              <b>{found.full_name}</b>
              <br />
              <small>
                {found.watchers} watchers, {found.open_issues} open issues;{" "}
                <i>{found.description}</i>
              </small>
            </li>
          );
        })}
      </ul>
      <p>
        <small>{count.toLocaleString()} found</small>
      </p>
    </div>
  );
}
