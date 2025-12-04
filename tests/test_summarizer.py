# tests/test_summarizer.py
import sys
import types
import importlib
import pytest

def _inject_fake_langchain_modules():
    class Chain:
        def __init__(self, name):
            self.name = name

        def __or__(self, other):
            return Chain(f"({self.name}|{getattr(other, 'name', type(other).__name__)})")

        def __ror__(self, other):
            return Chain(f"({getattr(other, 'name', type(other).__name__)}|{self.name})")

        def batch(self, items, opts=None):
            return [str(i) for i in items]

    # dotenv
    m = types.ModuleType("dotenv")
    m.load_dotenv = lambda *a, **k: None
    sys.modules["dotenv"] = m

    # langchain_groq
    m = types.ModuleType("langchain_groq")
    m.ChatGroq = lambda *a, **k: Chain("ChatGroq")
    sys.modules["langchain_groq"] = m

    # langchain_core.prompts
    p = types.ModuleType("langchain_core.prompts")
    class ChatPromptTemplate:
        @classmethod
        def from_template(cls, tpl):
            return Chain("ChatPromptTemplate.from_template")
        @classmethod
        def from_messages(cls, msgs):
            return Chain("ChatPromptTemplate.from_messages")
    p.ChatPromptTemplate = ChatPromptTemplate
    sys.modules["langchain_core.prompts"] = p

    # langchain_core.output_parsers
    o = types.ModuleType("langchain_core.output_parsers")
    class StrOutputParser:
        def __init__(self):
            self.name = "StrOutputParser"
    o.StrOutputParser = StrOutputParser
    sys.modules["langchain_core.output_parsers"] = o

    # langchain.chat_models
    cm = types.ModuleType("langchain.chat_models")
    cm.init_chat_model = lambda *a, **k: Chain("init_chat_model")
    sys.modules["langchain.chat_models"] = cm


def _clear_rag():
    sys.modules.pop("rag.summarizer", None)
    sys.modules.pop("rag", None)


def test_missing_api_keys_raises(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("NVIDIA_API_KEY", raising=False)

    _inject_fake_langchain_modules()
    _clear_rag()

    with pytest.raises(ValueError):
        importlib.import_module("rag.summarizer").SummarizerAndImageDescriber()


def test_init_succeeds_with_env(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "fake-groq")
    monkeypatch.setenv("NVIDIA_API_KEY", "fake-nvidia")

    _inject_fake_langchain_modules()
    _clear_rag()

    Summarizer = importlib.import_module("rag.summarizer").SummarizerAndImageDescriber
    inst = Summarizer()

    assert hasattr(inst, "text_prompt")
    assert hasattr(inst, "text_model")
    assert hasattr(inst, "summarize_chain")
    assert hasattr(inst, "image_prompt")
    assert hasattr(inst, "image_model")
    assert hasattr(inst, "image_chain")

    assert inst.summarize_chain is not None
    assert inst.image_chain is not None
