from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import os, json, asyncio

router = APIRouter()

class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    stream: bool = False
    context: Optional[dict] = None   # optional shipment/order context

SYSTEM_PROMPT = """You are TransportOS AI — an expert logistics operations assistant.
You have access to real-time shipment data, route intelligence, carrier performance metrics,
and supply chain analytics for an enterprise logistics platform operating across India.

You help logistics managers with:
- Route optimisation and carrier selection
- Delay prediction and risk assessment
- Cost reduction strategies
- Regulatory and customs queries
- Fleet and capacity planning
- Demand forecasting interpretation

Always be concise, data-driven, and action-oriented. When recommending routes or actions,
provide specific numbers (cost, time, CO2, on-time probability). Use ₹ for currency."""

async def call_anthropic(messages: list, stream: bool = False):
    """Call Anthropic Claude API."""
    import httpx
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return "AI service not configured (missing ANTHROPIC_API_KEY). Please set it in .env"

    payload = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 1024,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": m["role"], "content": m["content"]} for m in messages],
        "stream": stream,
    }
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    if stream:
        async def generate():
            async with httpx.AsyncClient(timeout=60) as client:
                async with client.stream("POST", "https://api.anthropic.com/v1/messages",
                                          json=payload, headers=headers) as resp:
                    async for line in resp.aiter_lines():
                        if line.startswith("data:"):
                            data = line[5:].strip()
                            if data and data != "[DONE]":
                                try:
                                    chunk = json.loads(data)
                                    if chunk.get("type") == "content_block_delta":
                                        yield chunk["delta"].get("text", "")
                                except Exception:
                                    pass
        return generate()
    else:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post("https://api.anthropic.com/v1/messages",
                                     json=payload, headers=headers)
            data = resp.json()
            return data["content"][0]["text"] if data.get("content") else "No response"

@router.post("/message")
async def chat_message(req: ChatRequest):
    messages = [m.dict() for m in req.messages]
    if req.stream:
        gen = await call_anthropic(messages, stream=True)
        return StreamingResponse(gen, media_type="text/plain")
    else:
        reply = await call_anthropic(messages, stream=False)
        return {"role": "assistant", "content": reply}
