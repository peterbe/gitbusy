import dataclasses
import json
import time
from collections import defaultdict
from urllib.parse import urlencode

import requests
import requests_cache
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponseBadRequest, JsonResponse
from django.views.decorators.cache import cache_control
from requests.structures import CaseInsensitiveDict
from gitbusy.api.exceptions import RateLimitedError


if settings.CACHE_REQUESTS:
    requests_cache.install_cache(settings.CACHE_REQUESTS_FILE)


def hello(request):
    return JsonResponse({"ok": True})


class EnhancedJSONEncoder(DjangoJSONEncoder):
    def default(self, o):
        if dataclasses.is_dataclass(o):
            return dataclasses.asdict(o)
        return super().default(o)


@dataclasses.dataclass
class RateLimited:
    limit: int = 0
    remaining: int = 0
    reset: int = None
    updated: int = None

    def update_from_headers(self, headers: CaseInsensitiveDict):
        self.limit = int(headers.get("x-ratelimit-limit"))
        self.remaining = int(headers.get("x-ratelimit-remaining"))
        self.reset = int(headers.get("x-ratelimit-reset"))
        self.updated = int(time.time() * 1000)


@cache_control(max_age=settings.DEBUG and 0 or 5 * 60, public=True)
def search_repos(request):
    q = request.GET.get("q", "").strip()
    if not q:
        return JsonResponse({"error": "Empty search 'q'"}, status=400)

    exact = json.loads(request.GET.get("exact", "false"))
    if exact:
        q = f"repo:{q}"
    ratelimited = RateLimited()
    results = _search_repos(
        q, ratelimited, sort=request.GET.get("sort"), order=request.GET.get("order")
    )
    return JsonResponse(
        {"results": results, "_ratelimited": ratelimited}, encoder=EnhancedJSONEncoder
    )


def _search_repos(q, ratelimited, sort=None, order=None, verbose=False):
    # https://help.github.com/en/github/searching-for-information-on-github/searching-for-repositories
    url = "/search/repositories"
    params = {"q": q}
    if sort:
        params["sort"] = sort
    if order:
        params["order"] = order
    url += "?" + urlencode(params)

    def simplify(item):
        keep = {}
        keys = {"id", "full_name", "description", "watchers", "open_issues", "html_url"}
        for key in item:
            if key in keys:
                keep[key] = item.get(key)
        return keep

    for results, headers in _github_fetch(url):
        if not verbose:
            results["items"] = [simplify(item) for item in results["items"]]
        ratelimited.update_from_headers(headers)
        return results


@cache_control(max_age=settings.DEBUG and 0 or 5 * 60, public=True)
def pr_review_requests(request):
    repos = ["mdn/kuma"]
    repos = request.GET["repos"].split(",")
    if [x for x in repos if not x.count("/")]:
        return HttpResponseBadRequest("|".join([x for x in repos if not x.count("/")]))
    stats = get_open_prs(repos)
    users = stats["users"]
    prs = stats["prs"]
    review_requests = stats["review_requests"]
    ratelimited = stats["ratelimited"]

    flat = [(len(v), k, v) for k, v in review_requests.items()]
    flat.sort(reverse=True)

    prs_per_user = {}

    def fmt_pr(pr):
        return f'#{pr["number"]}'

    for count, user_login, review_prs in flat:
        prs_per_user[user_login] = {}
        for pr_id in review_prs:
            weight = 1
            prs_per_user[user_login][pr_id] = weight

    stacked_bar_data = []
    bar_data = {"labels": [], "values": []}
    for data in sorted(
        [dict(v, login=k) for k, v in prs_per_user.items()],
        key=lambda x: sum(v for k, v in x.items() if k != "login"),
        reverse=True,
    ):
        bar_data["labels"].append(data["login"])
        bar_data["values"].append(sum([v for k, v in data.items() if k != "login"]))

    busiest_users = list(bar_data["labels"])

    return JsonResponse(
        {
            "stacked_bar_data": stacked_bar_data,
            "bar_data": bar_data,
            "busiest_users": busiest_users,
            "prs_per_user": prs_per_user,
            "users": users,
            "prs": prs,
            "_ratelimited": ratelimited,
        },
        encoder=EnhancedJSONEncoder,
    )


def get_open_prs(repos):
    review_requests = defaultdict(list)
    all_users = {}
    all_prs = {}
    ratelimited = RateLimited()
    for repo in repos:
        prs = fetch_open_prs(repo, ratelimited)
        for pr in prs:
            all_prs[pr["id"]] = pr
            for user in pr["requested_reviewers"]:
                review_requests[user["login"]].append(pr["id"])
                all_users[user["login"]] = user

    return {
        "review_requests": review_requests,
        "users": all_users,
        "prs": all_prs,
        "ratelimited": ratelimited,
    }


def fetch_open_prs(repo, ratelimited):
    owner, repo = repo.split("/", 1)
    url = f"/repos/{owner}/{repo}/pulls"
    params = {"state": "open"}
    url += "?" + urlencode(params)
    all_prs = []
    for prs, headers in _github_fetch(url):
        ratelimited.update_from_headers(headers)
        all_prs.extend(prs)
    return all_prs


def _github_fetch(url, max_pages=5):
    def get(url):
        if url.startswith("/"):
            url = f"https://api.github.com{url}"
        r = requests.get(
            url,
            {
                "headers": f"Authorization: token {settings.GITHUB_API_TOKEN}",
                "Accept": "application/vnd.github.shadow-cat-preview+json",
            },
        )
        if r.status_code == 403:
            if "rate limit exceeded" in r.json().get("message", ""):
                ratelimited = RateLimited()
                ratelimited.update_from_headers(r.headers)
                raise RateLimitedError(ratelimited)

        r.raise_for_status()
        return r

    page = 1
    r = get(url)
    yield (r.json(), r.headers)
    while r.links and r.links["next"]:
        page += 1
        url = r.links["next"]["url"]
        r = get(url)
        yield (r.json(), r.headers)
        if page >= max_pages:
            break
