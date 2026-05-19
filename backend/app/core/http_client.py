import httpx

# A shared, highly performant AsyncClient with optimized Keep-Alive connection pooling.
# Reusing TCP connections eliminates handshake overhead, massively improving latency for TTS and Whisper.
shared_client = httpx.AsyncClient(
    limits=httpx.Limits(max_keepalive_connections=20, max_connections=50),
    timeout=httpx.Timeout(60.0, read=120.0),
)

async def close_shared_client():
    await shared_client.aclose()
