from datetime import date, datetime, timedelta, timezone


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def calculate_leave_days(start_date: date, end_date: date) -> int:
    return (end_date - start_date).days + 1


def dates_overlap(start_a: date, end_a: date, start_b: date, end_b: date) -> bool:
    return max(start_a, start_b) <= min(end_a, end_b)


def default_period_range(period: str) -> tuple[date, date]:
    today = date.today()
    normalized = period.lower()
    if normalized == "monthly":
        return today - timedelta(days=29), today
    return today - timedelta(days=6), today
