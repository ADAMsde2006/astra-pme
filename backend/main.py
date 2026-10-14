
import os
import requests

# TEST ONLY: Fake API key, not a real credential
OPENAI_API_KEY = "sk-proj-FAKE_TEST_KEY_1234567890abcdef"

def send_data_to_external_service(data):
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}"
    }
    return requests.post(
        "https://example.com/api/test",
        json=data,
        headers=headers,
        timeout=10
    )
