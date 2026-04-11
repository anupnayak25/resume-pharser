from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Set, Tuple

from fastapi import WebSocket


Key = Tuple[int, str]  # (user_id, scan_id)


@dataclass
class _Channel:
    owner_user_id: int
    scan_id: str
    sockets: Set[WebSocket] = field(default_factory=set)


class ProgressBroker:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._channels: Dict[Key, _Channel] = {}

    async def connect(self, user_id: int, scan_id: str, websocket: WebSocket) -> None:
        key: Key = (int(user_id), str(scan_id))
        async with self._lock:
            channel = self._channels.get(key)
            if channel is None:
                channel = _Channel(owner_user_id=int(user_id), scan_id=str(scan_id))
                self._channels[key] = channel
            channel.sockets.add(websocket)

    async def disconnect(self, user_id: int, scan_id: str, websocket: WebSocket) -> None:
        key: Key = (int(user_id), str(scan_id))
        async with self._lock:
            channel = self._channels.get(key)
            if channel is None:
                return
            channel.sockets.discard(websocket)
            if not channel.sockets:
                self._channels.pop(key, None)

    async def broadcast(self, user_id: int, scan_id: str, message: Dict[str, Any]) -> None:
        key: Key = (int(user_id), str(scan_id))
        async with self._lock:
            channel = self._channels.get(key)
            sockets = list(channel.sockets) if channel is not None else []

        if not sockets:
            return

        send_failures: list[WebSocket] = []
        for ws in sockets:
            try:
                await ws.send_json(message)
            except Exception:
                send_failures.append(ws)

        if send_failures:
            async with self._lock:
                channel = self._channels.get(key)
                if channel is None:
                    return
                for ws in send_failures:
                    channel.sockets.discard(ws)
                if not channel.sockets:
                    self._channels.pop(key, None)


broker = ProgressBroker()
