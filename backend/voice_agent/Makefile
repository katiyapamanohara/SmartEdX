.PHONY: dev run install

# Start with auto-reload (watches the app/ directory)
dev:
	uv run python -m app --reload --log-level debug

# Start in production mode
run:
	uv run python -m app

# Install dev dependencies (includes watchfiles for reload)
install:
	uv pip install -e ".[dev]"
