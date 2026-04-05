import re

TOKEN_PATTERN = re.compile(r"[a-z0-9]+")
MAX_PREFIX_LENGTH = 32


def normalize_search_text(value: str | None) -> str | None:
    if value is None:
        return None

    normalized = " ".join(value.casefold().split())
    return normalized or None


def _add_prefixes(target: set[str], value: str) -> None:
    for end in range(1, min(len(value), MAX_PREFIX_LENGTH) + 1):
        target.add(value[:end])


def build_search_terms(*values: str | None) -> list[str]:
    terms: set[str] = set()

    for value in values:
        normalized = normalize_search_text(value)
        if not normalized:
            continue

        _add_prefixes(terms, normalized)
        for token in TOKEN_PATTERN.findall(normalized):
            _add_prefixes(terms, token)

    return sorted(terms)
