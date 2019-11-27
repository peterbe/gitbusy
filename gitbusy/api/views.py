import json
from collections import defaultdict
from urllib.parse import urlencode

import requests
import requests_cache
from django.conf import settings
from django.http import JsonResponse, HttpResponseBadRequest

if settings.DEBUG:
    requests_cache.install_cache("requests_cache")


def hello(request):
    return JsonResponse({"ok": True})


def search_repos(request):
    q = request.GET.get("q", "").strip()
    if not q:
        return JsonResponse({"error": "Empty search 'q'"}, status=400)

    exact = json.loads(request.GET.get("exact", "false"))
    if exact:
        q = f"repo:{q}"
    results = _search_repos(
        q, sort=request.GET.get("sort"), order=request.GET.get("order")
    )
    return JsonResponse(results)


def _search_repos(q, sort=None, order=None, verbose=False):
    # https://help.github.com/en/github/searching-for-information-on-github/searching-for-repositories
    url = "/search/repositories"
    params = {"q": q}
    if sort:
        params["sort"] = sort
    if order:
        params["order"] = order
    url += "?" + urlencode(params)
    results = _github_fetch(url)

    def simplify(item):
        keep = {}
        keys = {"id", "full_name", "description", "watchers", "open_issues", "html_url"}
        for key in item:
            if key in keys:
                keep[key] = item.get(key)
        return keep

    if not verbose:
        results["items"] = [simplify(item) for item in results["items"]]

    return results


def open_prs(request):
    print(repr(request.GET.get("repos")))
    repos = ["mdn/kuma"]
    repos = request.GET["repos"].split(",")
    if [x for x in repos if not x.count("/")]:
        return HttpResponseBadRequest("|".join([x for x in repos if not x.count("/")]))
    stats = get_open_prs(repos)
    users = stats["users"]
    prs = stats["prs"]
    review_requests = stats["review_requests"]

    flat = [(len(v), k, v) for k, v in review_requests.items()]
    flat.sort(reverse=True)

    prs_per_user = {}

    def fmt_pr(pr):
        return f'#{pr["number"]}'

    for count, user_login, review_prs in flat:
        # print(
        #     "USER",
        #     user_login,
        #     "HAS BEEN REQUESTED",
        #     len(review_requests[user_login]),
        #     "REVIEWS",
        # )
        prs_per_user[user_login] = {}
        for pr_id in review_prs:
            weight = 10
            pr = prs[pr_id]
            prs_per_user[user_login][pr_id] = weight

    stacked_bar_data = []
    for data in sorted(
        [dict(v, login=k) for k, v in prs_per_user.items()],
        key=lambda x: sum(v for k, v in x.items() if k != "login"),
        reverse=True,
    ):
        block = {"login": data["login"]}
        for pr_id, weight in data.items():
            if pr_id != "login":
                block[fmt_pr(prs[pr_id])] = weight
        stacked_bar_data.append(block)
    busiest_users = [x["login"] for x in stacked_bar_data]

    return JsonResponse(
        {
            "stacked_bar_data": stacked_bar_data,
            "busiest_users": busiest_users,
            "prs_per_user": prs_per_user,
            "users": users,
            "prs": prs,
        }
    )


def get_open_prs(repos):
    stats = defaultdict(list)
    review_requests = defaultdict(list)
    all_users = {}
    all_prs = {}
    for repo in repos:
        prs = fetch_open_prs(repo)
        stats[repo].append(prs)
        for pr in prs:

            # pprint(pr)
            # pprint(pr["requested_reviewers"])
            all_prs[pr["id"]] = pr
            for user in pr["requested_reviewers"]:
                review_requests[user["login"]].append(pr["id"])
                all_users[user["login"]] = user

            # print("============================================")
            # review_comments = _github_fetch(pr["review_comments_url"])

            # pprint(review_comments)
            # pull_number = pr["number"]
            # requested_reviewers = fetch_requested_reviewers(repo, pull_number)
            # pprint(requested_reviewers)
            # break

    return {"review_requests": review_requests, "users": all_users, "prs": all_prs}


def fetch_open_prs(repo):
    owner, repo = repo.split("/", 1)
    url = f"/repos/{owner}/{repo}/pulls"
    params = {"state": "open"}
    url += "?" + urlencode(params)
    response = _github_fetch(url)
    return response
    # from pprint import pprint

    # pprint(response)


def fetch_requested_reviewers(repo, pull_number):
    owner, repo = repo.split("/", 1)
    url = f"/repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers"
    return _github_fetch(url)


def _github_fetch(url):
    if url.startswith("/"):
        url = f"https://api.github.com{url}"
    r = requests.get(
        url, {"headers": f"Authorization: token {settings.GITHUB_API_TOKEN}"}
    )
    r.raise_for_status()
    return r.json()
