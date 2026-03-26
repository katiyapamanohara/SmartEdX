"""Custom tool helper for dynamically loading tools via HTTP manifests."""

import hashlib
import hmac
import inspect
import json
import logging
from typing import Any, Dict, List, Optional

import requests
from google.adk.tools import FunctionTool
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class CustomToolSchema(BaseModel):
    """Schema for a custom tool."""

    name: str
    description: str
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]


class CustomToolManifest(BaseModel):
    """Schema for a custom tool manifest."""

    name: str
    version: str
    author: str
    description: str
    tools: List[CustomToolSchema]


class CustomTool:
    """Represents a custom tool that can be called via HTTP."""

    def __init__(self, tool_config: CustomToolSchema, base_url: str, secret: Optional[str] = None):
        self.config = tool_config
        self.base_url = base_url.rstrip("/")
        self.secret = secret

    def create_function(self) -> FunctionTool:
        """Create and register a dynamic function with a forced explicit signature."""
        type_map = {
            "string": str,
            "integer": int,
            "number": float,
            "boolean": bool,
            "array": list,
            "object": dict,
        }

        def custom_tool_function(**kwargs) -> dict[str, Any]:
            return self._execute_tool(**kwargs)

        docstring_parts = [self.config.description]
        new_params = []
        if "properties" in self.config.input_schema:
            properties = self.config.input_schema["properties"]
            required = self.config.input_schema.get("required", [])

            docstring_parts.append("\nArgs:")
            for param_name, param_info in properties.items():
                json_type = param_info.get("type", "string")
                python_type = type_map.get(json_type, Any)

                default_value = inspect.Parameter.empty
                if param_name not in required:
                    default_value = None

                new_params.append(
                    inspect.Parameter(
                        name=param_name,
                        kind=inspect.Parameter.KEYWORD_ONLY,
                        default=default_value,
                        annotation=python_type,
                    )
                )

                param_desc = param_info.get("description", param_name)
                required_str = ", optional" if param_name not in required else ""
                docstring_parts.append(f"    {param_name} ({json_type}{required_str}): {param_desc}")

        custom_tool_function.__name__ = self.config.name
        custom_tool_function.__doc__ = "\n".join(docstring_parts)
        custom_tool_function.__signature__ = inspect.Signature(parameters=new_params, return_annotation=dict[str, Any])

        logger.info(f"Registered tool {self.config.name} with signature: {custom_tool_function.__signature__}")
        return FunctionTool(func=custom_tool_function)

    def _generate_signature(self, payload: Dict[str, Any]) -> str:
        """Generate HMAC-SHA256 signature for the payload."""
        if not self.secret:
            raise ValueError("Secret is required for signature generation")
        body_bytes = json.dumps(payload).encode("utf-8")
        secret_bytes = self.secret.encode("utf-8")
        return hmac.new(key=secret_bytes, msg=body_bytes, digestmod=hashlib.sha256).hexdigest()

    def _execute_tool(self, **kwargs) -> dict[str, Any]:
        """Execute the custom tool by making an HTTP request."""
        url = f"{self.base_url}/execute/{self.config.name}"
        headers = {"Content-Type": "application/json"}

        # Clean up kwargs
        payload = kwargs.get("kwargs", kwargs) if len(kwargs) == 1 and "kwargs" in kwargs else kwargs

        # Generate signature
        try:
            if self.secret:
                signature = self._generate_signature(payload)
                headers["x-articom-signature"] = signature
        except Exception as e:
            return {"status": "error", "error_message": str(e), "error_type": "signature_error"}

        logger.info(f"Executing custom tool '{self.config.name}' with URL: {url}")

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            response.raise_for_status()
            result = response.json()
            logger.info(f"Tool '{self.config.name}' executed successfully")

            if isinstance(result, dict):
                if "status" not in result:
                    result["status"] = "success"
                return result
            return {
                "status": "success",
                "result": result if isinstance(result, (list, str, int, float, bool)) else str(result),
            }

        except requests.exceptions.Timeout as e:
            return {"status": "error", "error_message": str(e), "error_type": "timeout"}
        except requests.exceptions.RequestException as e:
            logger.error(f"Error calling custom tool {self.config.name}: {e}")
            return {"status": "error", "error_message": str(e), "error_type": "request_error"}
        except Exception as e:
            logger.error(f"Unexpected error in custom tool {self.config.name}: {e}")
            return {"status": "error", "error_message": str(e), "error_type": "unexpected_error"}


class CustomToolHelper:
    """Helper class for managing custom tools."""

    def __init__(self):
        self.tool_cache = {}

    def fetch_manifest(self, url: str, secret: Optional[str] = None) -> CustomToolManifest:
        """Fetch a tool manifest from a URL."""
        manifest_url = f"{url.rstrip('/')}/manifest"
        headers = {"Content-Type": "application/json"}

        if secret:
            empty_body = b""
            secret_bytes = secret.encode("utf-8")
            signature = hmac.new(key=secret_bytes, msg=empty_body, digestmod=hashlib.sha256).hexdigest()
            headers["x-articom-signature"] = signature

        try:
            response = requests.get(manifest_url, headers=headers, timeout=30)
            response.raise_for_status()
            return CustomToolManifest(**response.json())
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to fetch tool manifest: {e}") from e
        except Exception as e:
            raise Exception(f"Failed to parse tool manifest: {e}") from e

    def create_custom_tools(
        self, url: str, manifest: CustomToolManifest, secret: Optional[str] = None
    ) -> List[FunctionTool]:
        """Create custom tools from a manifest."""
        cache_key = f"{url}:{secret or 'no_secret'}"
        if cache_key in self.tool_cache:
            return self.tool_cache[cache_key]

        tools = []
        for tool_config in manifest.tools:
            tool = CustomTool(tool_config, url, secret).create_function()
            tools.append(tool)
            logger.info(f"Created custom tool: {tool.name}")

        self.tool_cache[cache_key] = tools
        return tools

    def generate_tool_instructions(self, manifest: CustomToolManifest) -> str:
        """Generate instructions for using the custom tools."""
        instructions = f"\n\n## Custom Tools Available: {manifest.name}\n"
        instructions += f"**Description:** {manifest.description}\n"
        instructions += f"**Version:** {manifest.version}\n"
        instructions += f"**Author:** {manifest.author}\n\n"
        instructions += "### Available Tools:\n"

        for tool in manifest.tools:
            instructions += f"\n**{tool.name}:**\n"
            instructions += f"- Description: {tool.description}\n"

            required_params = tool.input_schema.get("required", [])
            properties = tool.input_schema.get("properties", {})

            if required_params:
                instructions += "- Required parameters:\n"
                for param in required_params:
                    param_info = properties.get(param, {})
                    instructions += (
                        f"  - {param} ({param_info.get('type', 'unknown')}): {param_info.get('title', param)}\n"
                    )

            optional_params = [p for p in properties if p not in required_params]
            if optional_params:
                instructions += "- Optional parameters:\n"
                for param in optional_params:
                    param_info = properties.get(param, {})
                    instructions += (
                        f"  - {param} ({param_info.get('type', 'unknown')}): {param_info.get('title', param)}\n"
                    )

            output_properties = tool.output_schema.get("properties", {})
            if output_properties:
                instructions += "- Returns:\n"
                for prop, prop_info in output_properties.items():
                    instructions += f"  - {prop} ({prop_info.get('type', 'unknown')}): {prop_info.get('title', prop)}\n"

        instructions += "\nUse these tools to assist the user with tasks related to the service functionality."
        return instructions
