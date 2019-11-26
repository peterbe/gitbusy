from django.core.management.base import BaseCommand, CommandError
from gitbusy.api.views import get_stats


class Command(BaseCommand):
    help = "Debug the get_stats function on the command line"

    def add_arguments(self, parser):
        parser.add_argument("repos", nargs="+")

    def handle(self, **options):
        repos = options["repos"]
        if not repos:
            raise CommandError("Must be at least one")

        stats = get_stats(repos)

        # from pprint import pprint
        # pprint(stats)

        users = stats["users"]
        prs = stats["prs"]
        review_requests = stats["review_requests"]

        for user_login in review_requests:
            print(
                "USER",
                user_login,
                "HAS BEEN REQUESTED",
                len(review_requests[user_login]),
                "REVIEWS",
            )
            for pr_id in review_requests[user_login]:
                pr = prs[pr_id]
                # from pprint import pprint

                # pprint(pr)
                # raise Exception
                print("\t", pr["html_url"], pr["title"])
