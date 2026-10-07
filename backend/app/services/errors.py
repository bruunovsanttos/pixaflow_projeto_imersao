class IdentityError(Exception):
    def __init__(self, detail: str, status_code: int):
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


class NotFound(IdentityError):
    def __init__(self, detail: str):
        super().__init__(detail, 404)


class Conflict(IdentityError):
    def __init__(self, detail: str):
        super().__init__(detail, 409)
