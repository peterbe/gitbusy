from whitenoise.middleware import WhiteNoiseMiddleware


class CustomWhiteNoiseMiddleware(WhiteNoiseMiddleware):
    def process_request(self, request):
        if self.autorefresh:
            static_file = self.find_file(request.path_info)
        else:
            static_file = self.files.get(request.path_info)

            # These two lines is the magic.
            # Basically, the URL didn't lead to a file (e.g. `/manifest.json`)
            # it's either a API path or it's a custom browser path that only
            # makes sense within preact-router. If that's the case, we just don't
            # know but we'll give the client-side preact-router code the benefit
            # of the doubt and let it through.
            if not static_file and not request.path_info.startswith("/api"):
                static_file = self.files.get("/")

        if static_file is not None:
            return self.serve(static_file, request)
