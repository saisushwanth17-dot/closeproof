"""
CloseProof Sandbox Orchestrator (core/sandbox_run.py).
Provides isolated execution environments for untrusted code, financial rules,
and validation logic across Nebius Cloud Micro-VMs and local subprocess sandboxes.
"""

from abc import ABC, abstractmethod
import os
import sys
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional, Union, List
import httpx


class ExecResult:
    """Represents the execution result of a command run inside a sandbox."""

    def __init__(self, exit_code: int, stdout: str, stderr: str = ""):
        self.exit_code = exit_code
        self.stdout = stdout
        self.stderr = stderr

    def __getitem__(self, key: str) -> Any:
        if key == "exit_code":
            return self.exit_code
        elif key == "stdout":
            return self.stdout
        elif key == "stderr":
            return self.stderr
        raise KeyError(key)

    def get(self, key: str, default: Any = None) -> Any:
        try:
            return self[key]
        except KeyError:
            return default

    def to_dict(self) -> Dict[str, Any]:
        return {
            "exit_code": self.exit_code,
            "stdout": self.stdout,
            "stderr": self.stderr,
        }

    def __repr__(self) -> str:
        return f"ExecResult(exit_code={self.exit_code}, stdout={self.stdout!r}, stderr={self.stderr!r})"


class SandboxHandle(ABC):
    """Abstract interface defining required sandbox operations."""

    @abstractmethod
    def exec(self, cmd: Union[str, List[str]], timeout: Optional[int] = None) -> ExecResult:
        """Executes a command inside the sandbox environment."""
        pass

    @abstractmethod
    def write_file(self, path: str, content: str) -> None:
        """Writes text content to a file at the specified sandbox path."""
        pass

    @abstractmethod
    def read_file(self, path: str) -> str:
        """Reads and returns text content from a file in the sandbox."""
        pass

    @abstractmethod
    def kill(self) -> None:
        """Terminates and cleans up the sandbox environment."""
        pass

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.kill()


class LocalSandbox(SandboxHandle):
    """
    Local fallback sandbox leveraging Python's tempfile.TemporaryDirectory
    and isolated subprocess execution with strict timeout enforcement.
    """

    def __init__(self, timeout_default: int = 30):
        self._temp_dir_obj = tempfile.TemporaryDirectory(prefix="closeproof_sb_")
        self.temp_dir = Path(self._temp_dir_obj.name).resolve()
        self.timeout_default = timeout_default
        self.is_alive = True

    def write_file(self, path: str, content: str) -> None:
        if not self.is_alive:
            raise RuntimeError("Cannot write to terminated LocalSandbox.")
        target_path = (self.temp_dir / path).resolve()
        # Security: Prevent path traversal outside the temp root
        if not str(target_path).startswith(str(self.temp_dir)):
            raise ValueError(f"Path traversal detected: {path}")
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_text(content, encoding="utf-8")

    def read_file(self, path: str) -> str:
        if not self.is_alive:
            raise RuntimeError("Cannot read from terminated LocalSandbox.")
        target_path = (self.temp_dir / path).resolve()
        if not str(target_path).startswith(str(self.temp_dir)):
            raise ValueError(f"Path traversal detected: {path}")
        if not target_path.exists():
            raise FileNotFoundError(f"File not found in sandbox: {path}")
        return target_path.read_text(encoding="utf-8")

    def exec(self, cmd: Union[str, List[str]], timeout: Optional[int] = None) -> ExecResult:
        if not self.is_alive:
            raise RuntimeError("Cannot execute commands in terminated LocalSandbox.")
        timeout_sec = timeout if timeout is not None else self.timeout_default

        import shlex
        if isinstance(cmd, str):
            try:
                args = shlex.split(cmd, posix=True)
            except Exception:
                args = cmd.split()
            if args and args[0] in ("python", "python3"):
                args[0] = sys.executable
        elif isinstance(cmd, list):
            args = list(cmd)
            if args and args[0] in ("python", "python3"):
                args[0] = sys.executable
        else:
            args = [str(cmd)]

        try:
            proc = subprocess.run(
                args,
                cwd=str(self.temp_dir),
                shell=False,
                capture_output=True,
                text=True,
                timeout=timeout_sec,
            )
            return ExecResult(exit_code=proc.returncode, stdout=proc.stdout, stderr=proc.stderr)
        except subprocess.TimeoutExpired as te:
            stdout = te.stdout or ""
            stderr = te.stderr or f"Command timed out after {timeout_sec} seconds"
            return ExecResult(exit_code=-1, stdout=stdout, stderr=stderr)
        except Exception as e:
            return ExecResult(exit_code=1, stdout="", stderr=str(e))

    def kill(self) -> None:
        if self.is_alive:
            try:
                self._temp_dir_obj.cleanup()
            except Exception:
                pass
            self.is_alive = False


class NebiusSandbox(SandboxHandle):
    """
    Micro-VM sandbox orchestrator communicating with the Nebius Cloud Micro-VM API via httpx.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        sandbox_id: Optional[str] = None,
        timeout: float = 30.0,
        auto_spawn: bool = True,
    ):
        self.base_url = (
            base_url
            or os.environ.get("NEBIUS_SANDBOX_URL")
            or "https://api.tokenfactory.nebius.com/v1/sandbox"
        ).rstrip("/")
        self.api_key = api_key or os.environ.get("NEBIUS_API_KEY", "")
        self.sandbox_id = sandbox_id
        self.timeout = timeout
        self.is_alive = False

        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "CloseProof-Sandbox/1.0",
        }
        self._client: Optional[httpx.Client] = None

        if auto_spawn and not self.sandbox_id:
            self._spawn()

    @property
    def client(self) -> httpx.Client:
        if self._client is None or self._client.is_closed:
            self._client = httpx.Client(
                base_url=self.base_url,
                headers=self.headers,
                timeout=self.timeout,
                trust_env=False,
            )
        return self._client

    def _spawn(self) -> None:
        """
        Structures the HTTP call to spawn a micro-VM instance.
        Raises NotImplementedError pending mapped Nebius micro-VM documentation.
        """
        raise NotImplementedError(
            "Nebius Cloud Micro-VM API endpoint specification is pending formal release. "
            "Use LocalSandbox fallback (USE_NEBIUS_SANDBOX=0)."
        )

    def write_file(self, path: str, content: str) -> None:
        raise NotImplementedError(
            "Nebius Micro-VM write_file requires mapped Nebius cloud endpoint."
        )

    def read_file(self, path: str) -> str:
        raise NotImplementedError(
            "Nebius Micro-VM read_file requires mapped Nebius cloud endpoint."
        )

    def exec(self, cmd: Union[str, List[str]], timeout: Optional[int] = None) -> ExecResult:
        raise NotImplementedError(
            "Nebius Micro-VM exec requires mapped Nebius cloud endpoint."
        )

    def kill(self) -> None:
        if self.is_alive and self.sandbox_id:
            try:
                self.client.post(f"/sandboxes/{self.sandbox_id}/kill")
            except Exception:
                pass
            self.is_alive = False
        if self._client is not None and not self._client.is_closed:
            try:
                self._client.close()
            except Exception:
                pass


def spawn_sandbox() -> SandboxHandle:
    """
    Factory function to spawn an isolated sandbox.
    Returns LocalSandbox by default for reliable demo execution,
    or switches to NebiusSandbox if USE_NEBIUS_SANDBOX=1.
    """
    if os.environ.get("USE_NEBIUS_SANDBOX") == "1":
        return NebiusSandbox()
    return LocalSandbox()
