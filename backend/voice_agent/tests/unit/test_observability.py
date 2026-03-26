"""Unit tests for app.observability.langfuse_client module."""


class TestObservabilityDisabled:
    """Tests when LANGFUSE_ENABLED=false (default)."""

    def test_observe_decorator_is_noop(self):
        from app.observability.langfuse_client import observe_decorator

        # Should return the function unchanged
        @observe_decorator(name="test")
        def my_func():
            return 42

        assert my_func() == 42

    def test_get_langfuse_returns_none_when_disabled(self):
        from app.observability.langfuse_client import get_langfuse

        # Should not raise
        result = get_langfuse()
        # When disabled, returns None
        assert result is None

    def test_update_trace_noop_when_disabled(self):
        from app.observability.langfuse_client import update_trace

        # Should not raise
        update_trace(tags=["test"], metadata={"key": "value"})

    def test_update_generation_noop_when_disabled(self):
        from app.observability.langfuse_client import update_generation

        # Should not raise
        update_generation(input=["hi"], output=["hello"], model="test-model", usage_details={"tokens": 10})


class TestInitInstrumentor:
    def test_init_instrumentor_succeeds_when_disabled(self):
        from app.observability.langfuse_client import init_instrumentor

        # Should not raise even when Langfuse is disabled
        init_instrumentor()
