from requests.exceptions import RequestException


class RateLimitedError(RequestException):
    """GitHub 403 wrapped in an exception"""
