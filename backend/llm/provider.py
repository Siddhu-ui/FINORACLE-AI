"""Configurable LLM Provider Abstraction supporting Gemini and OpenAI with native Tool Calling.

Uses native Gemini v1beta endpoints with `x-goog-api-key` headers (compatible with both
`AIza...` AI Studio keys and `AQ....` Auth keys — never passing raw keys in URLs).
Includes automatic fallback across active Gemini flash models when a model returns 404/429/503.
Never fabricates responses when API keys are missing; raises LLMNotConfiguredError instead.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple

import httpx

from backend.config import Settings, get_settings

logger = logging.getLogger("finoracle.llm")

GEMINI_FALLBACK_MODELS: Tuple[str, ...] = (
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3-flash-preview",
)


def _sanitize_error_text(text: str, secret: str = "") -> str:
    cleaned = str(text or "").strip()
    if secret and secret in cleaned:
        cleaned = cleaned.replace(secret, "[REDACTED]")
    return cleaned[:400]


def _classify_http_reason(status_code: int, body_text: str) -> str:
    lower = body_text.lower()
    if status_code == 429 or "quota" in lower or "rate limit" in lower or "resource_exhausted" in lower:
        return "LLM quota exceeded"
    if status_code in (401, 403):
        return "LLM API key unauthorized"
    if status_code == 404:
        return "Configured LLM model unavailable"
    if status_code >= 500:
        return "LLM service temporarily unavailable"
    return f"LLM API error (HTTP {status_code})"


def _extract_gemini_error_detail(resp: httpx.Response, secret: str = "") -> str:
    try:
        data = resp.json()
        err = data.get("error") or {}
        msg = err.get("message") or resp.text
        return _sanitize_error_text(str(msg), secret)
    except Exception:
        return _sanitize_error_text(resp.text, secret)


def _extract_gemini_text(parts: List[Dict[str, Any]]) -> str:
    chunks: List[str] = []
    for part in parts:
        # Gemini 2.5 thinking models may emit `thought: true` parts; skip internal thoughts.
        if part.get("thought"):
            continue
        txt = part.get("text")
        if txt:
            chunks.append(str(txt))
    return "".join(chunks).strip()


class LLMNotConfiguredError(RuntimeError):
    """Raised when LLM_PROVIDER / API key environment variables are not set."""

    def __init__(self, provider: str, message: Optional[str] = None):
        self.provider = provider
        self.short_reason = "LLM API key not configured"
        self.required_env_vars = (
            ["LLM_PROVIDER=gemini", "GEMINI_API_KEY (or LLM_API_KEY)", "LLM_MODEL (optional, default gemini-2.5-flash)"]
            if provider == "gemini"
            else ["LLM_PROVIDER=openai", "OPENAI_API_KEY (or LLM_API_KEY)", "LLM_MODEL (optional, default gpt-4o-mini)"]
        )
        super().__init__(
            message
            or f"LLM provider '{provider}' is not configured. Set {', '.join(self.required_env_vars)} in backend .env."
        )


class LLMProviderError(RuntimeError):
    """Raised when an upstream LLM HTTP request fails."""

    def __init__(self, message: str, short_reason: str = "LLM request failed", status_code: Optional[int] = None):
        self.short_reason = short_reason
        self.status_code = status_code
        super().__init__(message)


@dataclass
class ToolCallTrace:
    tool_name: str
    arguments: Dict[str, Any]
    result_summary: Dict[str, Any]


@dataclass
class LLMChatResult:
    answer: str
    provider: str
    model: str
    tools_used: List[ToolCallTrace] = field(default_factory=list)


class BaseLLMProvider:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.provider_name = settings.llm_provider
        self.model = settings.llm_model
        self.api_key = settings.llm_api_key

    def generate_text(self, system_prompt: str, user_prompt: str, temperature: float = 0.2) -> str:
        raise NotImplementedError

    def chat_with_tools(
        self,
        system_prompt: str,
        user_message: str,
        tool_schemas: List[Dict[str, Any]],
        tool_executor: Callable[[str, Dict[str, Any]], Dict[str, Any]],
        max_rounds: int = 4,
    ) -> LLMChatResult:
        raise NotImplementedError


class OpenAIProvider(BaseLLMProvider):
    ENDPOINT = "https://api.openai.com/v1/chat/completions"

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def generate_text(self, system_prompt: str, user_prompt: str, temperature: float = 0.2) -> str:
        payload = {
            "model": self.model,
            "temperature": temperature,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }
        try:
            with httpx.Client(timeout=35.0) as client:
                resp = client.post(self.ENDPOINT, headers=self._headers(), json=payload)
                if resp.status_code >= 400:
                    detail = _sanitize_error_text(resp.text, self.api_key)
                    raise LLMProviderError(
                        f"OpenAI HTTP {resp.status_code}: {detail}",
                        short_reason=_classify_http_reason(resp.status_code, detail),
                        status_code=resp.status_code,
                    )
                return str(resp.json()["choices"][0]["message"]["content"] or "").strip()
        except LLMProviderError:
            raise
        except Exception as exc:
            raise LLMProviderError(
                f"OpenAI request failed: {_sanitize_error_text(str(exc), self.api_key)}",
                short_reason="LLM network error",
            ) from exc

    def chat_with_tools(
        self,
        system_prompt: str,
        user_message: str,
        tool_schemas: List[Dict[str, Any]],
        tool_executor: Callable[[str, Dict[str, Any]], Dict[str, Any]],
        max_rounds: int = 4,
    ) -> LLMChatResult:
        openai_tools = [
            {
                "type": "function",
                "function": {
                    "name": t["name"],
                    "description": t["description"],
                    "parameters": t["parameters"],
                },
            }
            for t in tool_schemas
        ]

        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]
        traces: List[ToolCallTrace] = []

        try:
            with httpx.Client(timeout=40.0) as client:
                for _ in range(max_rounds):
                    payload: Dict[str, Any] = {
                        "model": self.model,
                        "temperature": 0.15,
                        "messages": messages,
                        "tools": openai_tools,
                        "tool_choice": "auto",
                    }
                    resp = client.post(self.ENDPOINT, headers=self._headers(), json=payload)
                    if resp.status_code >= 400:
                        detail = _sanitize_error_text(resp.text, self.api_key)
                        raise LLMProviderError(
                            f"OpenAI HTTP {resp.status_code}: {detail}",
                            short_reason=_classify_http_reason(resp.status_code, detail),
                            status_code=resp.status_code,
                        )
                    msg = resp.json()["choices"][0]["message"]
                    tool_calls = msg.get("tool_calls") or []

                    if not tool_calls:
                        return LLMChatResult(
                            answer=str(msg.get("content") or "").strip(),
                            provider="openai",
                            model=self.model,
                            tools_used=traces,
                        )

                    messages.append(msg)
                    for tc in tool_calls:
                        fn_name = tc["function"]["name"]
                        raw_args = tc["function"].get("arguments") or "{}"
                        try:
                            parsed_args = json.loads(raw_args) if isinstance(raw_args, str) else dict(raw_args)
                        except Exception:
                            parsed_args = {}
                        result = tool_executor(fn_name, parsed_args)
                        traces.append(
                            ToolCallTrace(
                                tool_name=fn_name,
                                arguments=parsed_args,
                                result_summary=result,
                            )
                        )
                        messages.append(
                            {
                                "role": "tool",
                                "tool_call_id": tc["id"],
                                "name": fn_name,
                                "content": json.dumps(result, default=str),
                            }
                        )

                resp = client.post(
                    self.ENDPOINT,
                    headers=self._headers(),
                    json={"model": self.model, "temperature": 0.15, "messages": messages},
                )
                if resp.status_code >= 400:
                    detail = _sanitize_error_text(resp.text, self.api_key)
                    raise LLMProviderError(
                        f"OpenAI HTTP {resp.status_code}: {detail}",
                        short_reason=_classify_http_reason(resp.status_code, detail),
                        status_code=resp.status_code,
                    )
                final_text = str(resp.json()["choices"][0]["message"].get("content") or "").strip()
                return LLMChatResult(
                    answer=final_text,
                    provider="openai",
                    model=self.model,
                    tools_used=traces,
                )
        except LLMProviderError:
            raise
        except Exception as exc:
            raise LLMProviderError(
                f"OpenAI tool-calling request failed: {_sanitize_error_text(str(exc), self.api_key)}",
                short_reason="LLM network error",
            ) from exc


class GeminiProvider(BaseLLMProvider):
    """Native Gemini REST v1beta client using `x-goog-api-key` headers and automatic model fallback."""

    def _candidate_models(self) -> List[str]:
        ordered: List[str] = []
        for candidate in (self.model, *GEMINI_FALLBACK_MODELS):
            name = (candidate or "").strip()
            if name and name not in ordered:
                ordered.append(name)
        return ordered

    def _endpoint(self, model_name: str) -> str:
        return f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"

    def _headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key,
        }

    def _post_with_fallback(
        self,
        client: httpx.Client,
        payload: Dict[str, Any],
        preferred_model: Optional[str] = None,
    ) -> Tuple[str, Dict[str, Any]]:
        candidates = self._candidate_models()
        if preferred_model and preferred_model in candidates:
            candidates = [preferred_model] + [m for m in candidates if m != preferred_model]

        last_error: Optional[LLMProviderError] = None
        for idx, model_name in enumerate(candidates):
            try:
                resp = client.post(
                    self._endpoint(model_name),
                    headers=self._headers(),
                    json=payload,
                )
            except httpx.TimeoutException as exc:
                last_error = LLMProviderError(
                    f"Gemini timeout on {model_name}: {exc}",
                    short_reason="LLM request timed out",
                )
                logger.warning("Gemini timeout on model=%s: %s", model_name, exc)
                continue
            except Exception as exc:
                last_error = LLMProviderError(
                    f"Gemini network error on {model_name}: {_sanitize_error_text(str(exc), self.api_key)}",
                    short_reason="LLM network error",
                )
                logger.warning("Gemini network error on model=%s: %s", model_name, last_error)
                continue

            if resp.status_code < 400:
                self.model = model_name
                return model_name, resp.json()

            detail = _extract_gemini_error_detail(resp, self.api_key)
            short_reason = _classify_http_reason(resp.status_code, detail)
            last_error = LLMProviderError(
                f"Gemini API HTTP {resp.status_code} ({model_name}): {detail}",
                short_reason=short_reason,
                status_code=resp.status_code,
            )
            logger.warning(
                "Gemini request failed on model=%s status=%s reason=%s detail=%s",
                model_name,
                resp.status_code,
                short_reason,
                detail[:200],
            )
            # Retry with the next active Gemini model on quota (429), model not found (404), or transient 5xx.
            if resp.status_code in (404, 429, 500, 502, 503, 504) and idx < len(candidates) - 1:
                continue
            raise last_error

        raise last_error or LLMProviderError("Gemini request failed across all fallback models.")

    def generate_text(self, system_prompt: str, user_prompt: str, temperature: float = 0.2) -> str:
        payload = {
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {"temperature": temperature},
        }
        try:
            with httpx.Client(timeout=35.0) as client:
                _, data = self._post_with_fallback(client, payload)
                candidates = data.get("candidates") or []
                if not candidates:
                    raise LLMProviderError(
                        "Gemini returned no candidates.",
                        short_reason="Empty LLM response",
                    )
                parts = candidates[0].get("content", {}).get("parts", [])
                return _extract_gemini_text(parts)
        except LLMProviderError:
            raise
        except Exception as exc:
            raise LLMProviderError(
                f"Gemini request failed: {_sanitize_error_text(str(exc), self.api_key)}",
                short_reason="LLM request failed",
            ) from exc

    def chat_with_tools(
        self,
        system_prompt: str,
        user_message: str,
        tool_schemas: List[Dict[str, Any]],
        tool_executor: Callable[[str, Dict[str, Any]], Dict[str, Any]],
        max_rounds: int = 4,
    ) -> LLMChatResult:
        gemini_declarations = [
            {
                "name": t["name"],
                "description": t["description"],
                "parameters": t["parameters"],
            }
            for t in tool_schemas
        ]
        contents: List[Dict[str, Any]] = [
            {"role": "user", "parts": [{"text": user_message}]}
        ]
        traces: List[ToolCallTrace] = []
        active_model: Optional[str] = None

        try:
            with httpx.Client(timeout=45.0) as client:
                for _ in range(max_rounds):
                    payload: Dict[str, Any] = {
                        "systemInstruction": {"parts": [{"text": system_prompt}]},
                        "contents": contents,
                        "tools": [{"functionDeclarations": gemini_declarations}],
                        "generationConfig": {"temperature": 0.15},
                    }
                    active_model, data = self._post_with_fallback(
                        client, payload, preferred_model=active_model
                    )
                    candidates = data.get("candidates") or []
                    if not candidates:
                        raise LLMProviderError(
                            "Gemini returned no candidates during tool calling.",
                            short_reason="Empty LLM response",
                        )
                    model_content = candidates[0].get("content") or {}
                    parts = model_content.get("parts") or []

                    fn_calls = [p["functionCall"] for p in parts if "functionCall" in p]
                    if not fn_calls:
                        text = _extract_gemini_text(parts)
                        if text:
                            return LLMChatResult(
                                answer=text,
                                provider="gemini",
                                model=active_model,
                                tools_used=traces,
                            )
                        break

                    contents.append(model_content)
                    response_parts = []
                    for fc in fn_calls:
                        fn_name = str(fc["name"])
                        args = dict(fc.get("args") or {})
                        result = tool_executor(fn_name, args)
                        traces.append(
                            ToolCallTrace(
                                tool_name=fn_name,
                                arguments=args,
                                result_summary=result,
                            )
                        )
                        response_parts.append(
                            {
                                "functionResponse": {
                                    "name": fn_name,
                                    "response": {"result": result},
                                }
                            }
                        )
                    contents.append({"role": "user", "parts": response_parts})

                # Final synthesis turn without tool declarations so Gemini writes the answer
                active_model, data = self._post_with_fallback(
                    client,
                    {
                        "systemInstruction": {"parts": [{"text": system_prompt}]},
                        "contents": contents,
                        "generationConfig": {"temperature": 0.15},
                    },
                    preferred_model=active_model,
                )
                candidates = data.get("candidates") or []
                parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
                text = _extract_gemini_text(parts)
                if not text:
                    raise LLMProviderError(
                        "Gemini returned an empty final synthesis.",
                        short_reason="Empty LLM response",
                    )
                return LLMChatResult(
                    answer=text,
                    provider="gemini",
                    model=active_model,
                    tools_used=traces,
                )
        except LLMProviderError:
            raise
        except Exception as exc:
            raise LLMProviderError(
                f"Gemini tool-calling request failed: {_sanitize_error_text(str(exc), self.api_key)}",
                short_reason="LLM request failed",
            ) from exc


def get_llm_provider() -> BaseLLMProvider:
    settings = get_settings()
    if not settings.is_llm_configured:
        raise LLMNotConfiguredError(settings.llm_provider)
    if settings.llm_provider == "openai":
        return OpenAIProvider(settings)
    return GeminiProvider(settings)
