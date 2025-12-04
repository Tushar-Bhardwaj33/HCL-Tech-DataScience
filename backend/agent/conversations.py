from datetime import datetime, timezone
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

class ConversationSession:
    def __init__(self, agent_executor, thread_id="default", system_prompt=None, max_history=10):
        self.agent_executor = agent_executor
        self.thread_id = thread_id
        self.max_history = max_history
        self.messages = []

        if system_prompt:
            self.set_system_prompt(system_prompt)

    def set_system_prompt(self, prompt):
        self.messages = [SystemMessage(content=prompt)]

    def append_user_message(self, content):
        self.messages.append(HumanMessage(content=content))

    def append_ai_message(self, content, sources=None):
        metadata = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "sources": sources or ["internal_knowledge"]
        }
        self.messages.append(AIMessage(content=content, metadata=metadata))

    def truncate_history(self):
        if len(self.messages) > self.max_history:
            self.messages = [self.messages[0]] + self.messages[-(self.max_history - 1):]

    def run(self, user_input):
        self.append_user_message(user_input)

        full_response = []
        config = {"configurable": {"thread_id": self.thread_id}}
        try:
            for step in self.agent_executor.stream(
                {"messages": self.messages},
                config,
                stream_mode="values"
            ):
                # step may be dict with 'messages', a list, or a message-like object
                if isinstance(step, dict) and "messages" in step:
                    msg = step["messages"][-1]
                else:
                    try:
                        msg = step[-1]
                    except Exception:
                        msg = step

                chunk = getattr(msg, "content", str(msg))
                print(str(chunk), end="", flush=True)
                full_response.append(str(chunk))

            self.append_ai_message("".join(full_response))
            self.truncate_history()

        except Exception as e:
            print(f"\n⚠️ Error: {str(e)}")
            self.append_ai_message("Let me try that again...")


# Example usage
def main():
    TwentyONE = None
    # try relative import first (when run as package), then absolute
    try:
        from .my_agent_initializer import TwentyONE as _T
        TwentyONE = _T
    except Exception:
        try:
            from backend.agent.my_agent_initializer import TwentyONE as _T2
            TwentyONE = _T2
        except Exception:
            TwentyONE = None

    if TwentyONE is None:
        print("TwentyONE agent initializer not found. Skipping interactive example.")
        return

    SYSTEM_PROMPT = """
You are a RAG (Retrieval-Augmented Generation) assistant.

Guidelines:
1. Answer ONLY from the retrieved context.
2. If the context does not contain the answer, say:
   "I could not find the answer in the provided documents."
3. Keep responses clear and concise (3–5 sentences).
4. Do NOT create or guess information.
5. If sources are present, mention them at the end (e.g., [Source: filename]).
"""

    # Instantiate agent executor if TwentyONE is a class/callable
    agent_exec = TwentyONE() if callable(TwentyONE) else TwentyONE

    session = ConversationSession(agent_exec, thread_id="aaff", system_prompt=SYSTEM_PROMPT)

    try:
        while True:
            user_input = input("\nAsk RAG: ")
            session.run(user_input)
    except KeyboardInterrupt:
        print("\nSession saved. Goodbye!")


if __name__ == "__main__":
    main()
