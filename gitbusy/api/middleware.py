import dataclasses

from django.http import JsonResponse

from gitbusy.api.exceptions import RateLimitedError


class RateLimitedMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        if exception.__class__ == RateLimitedError:
            ratelimited = exception.args[0]
            return JsonResponse(dataclasses.asdict(ratelimited), status=429)
