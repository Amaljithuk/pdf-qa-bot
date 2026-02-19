import os
import sys

# Add the backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from rag_engine import get_answer

def test_follow_up():
    # Mock chat history where the user asked about Mahatma Gandhi
    chat_history = [
        {"role": "user", "content": "who is mahatma gandhi"},
        {"role": "assistant", "content": "Mahatma Gandhi was a leader of India's independence movement against British rule."}
    ]

    # Follow-up question that relies on context
    question = "when was he born"

    print(f"Testing with question: '{question}'")
    print(f"Chat history: {chat_history}")

    try:
        response = get_answer(question, chat_history=chat_history)
        print("\nResponse:")
        print(f"Answer: {response.get('answer')}")
        print(f"Sources: {response.get('sources')}")
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    test_follow_up()
