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
    const { q } = this.state;
    this.setState({ searching: true }, async () => {
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
    });
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
    this.setState({ picked, results: null, q: "" });
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

        {picked.length ? <ShowPickedRepos repos={picked} /> : null}
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

function ShowPickedRepos({ repos }) {
  const fullNames = repos.map(r => r.full_name).sort();
  const allURL = `/stats/${encodeURIComponent(fullNames.join(","))}`;
  return (
    <div class={style.pickedrepos}>
      <h3>Picked repos</h3>
      <ul>
        {repos.map(repo => {
          return (
            <li>
              <Link href={`/stats/${encodeURIComponent(repo.full_name)}`}>
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
