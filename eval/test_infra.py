"""
Unit and Integration Tests for CloseProof Infrastructure (eval/test_infra.py).
Tests LocalSandbox execution isolation, Nebius Micro-VM sandbox interfaces,
and batch OCR extraction with Nemotron-3-Nano.
"""

import os
import pytest
from pathlib import Path
from core.sandbox_run import (
    LocalSandbox,
    NebiusSandbox,
    spawn_sandbox,
    ExecResult,
)
from core.jobs import run_ocr_batch


def test_local_sandbox_write_and_exec():
    """
    Spawns a LocalSandbox, writes a simple python script to it, executes it,
    and asserts stdout matches expected output.
    """
    sb = LocalSandbox(timeout_default=15)
    try:
        script_content = (
            "import sys\n"
            "print('CLOSEPROOF_SANDBOX_OK')\n"
            "sys.stdout.flush()\n"
        )
        sb.write_file("verify.py", script_content)

        # Confirm read_file works
        read_back = sb.read_file("verify.py")
        assert read_back == script_content

        # Execute the script inside the sandbox
        result = sb.exec("python verify.py")

        assert isinstance(result, ExecResult)
        assert result.exit_code == 0
        assert "CLOSEPROOF_SANDBOX_OK" in result.stdout
        assert result["exit_code"] == 0
        assert "CLOSEPROOF_SANDBOX_OK" in result["stdout"]
    finally:
        sb.kill()
        assert not sb.is_alive


def test_local_sandbox_context_manager_and_isolation():
    """Tests LocalSandbox context manager cleanup and isolated environment."""
    temp_dir_path = None
    with LocalSandbox() as sb:
        temp_dir_path = sb.temp_dir
        assert temp_dir_path.exists()
        sb.write_file("sample.txt", "data_123")
        assert sb.read_file("sample.txt") == "data_123"

    # Context manager exit should have killed/cleaned up the sandbox
    assert not sb.is_alive


def test_local_sandbox_timeout_enforcement():
    """Tests that long-running commands inside LocalSandbox trigger timeout."""
    with LocalSandbox(timeout_default=1) as sb:
        # Run a sleep command that exceeds the 1s timeout
        res = sb.exec("python -c \"import time; time.sleep(5)\"", timeout=1)
        assert res.exit_code != 0
        assert "timed out" in res.stderr.lower() or res.exit_code == -1


def test_spawn_sandbox_factory_default():
    """Tests that spawn_sandbox() defaults to LocalSandbox."""
    os.environ.pop("USE_NEBIUS_SANDBOX", None)
    sb = spawn_sandbox()
    try:
        assert isinstance(sb, LocalSandbox)
    finally:
        sb.kill()


def test_spawn_sandbox_factory_nebius():
    """Tests that USE_NEBIUS_SANDBOX=1 attempts to spawn NebiusSandbox."""
    os.environ["USE_NEBIUS_SANDBOX"] = "1"
    try:
        # Expect NotImplementedError pending live Nebius Micro-VM endpoints
        with pytest.raises(NotImplementedError) as exc_info:
            spawn_sandbox()
        assert "Nebius Cloud Micro-VM" in str(exc_info.value)
    finally:
        os.environ.pop("USE_NEBIUS_SANDBOX", None)


def test_nebius_sandbox_client_structure():
    """Tests that NebiusSandbox initializes with correct base_url and auth headers."""
    os.environ["NEBIUS_API_KEY"] = "test-nebius-key-123"
    sb = NebiusSandbox(auto_spawn=False)
    assert sb.headers["Authorization"] == "Bearer test-nebius-key-123"
    assert "application/json" in sb.headers["Content-Type"]
    assert "tokenfactory.nebius.com" in sb.base_url or "nebius" in sb.base_url


def test_run_ocr_batch_mock_schema():
    """
    Runs run_ocr_batch in NEBIUS_MOCK=1 mode and asserts the returned JSON
    matches the expected schema: {merchant, date, total, currency}.
    """
    os.environ["NEBIUS_MOCK"] = "1"

    image_paths = [
        "receipt_home_depot_320.png",
        "receipt_blue_bottle_coffee.png",
        "invoice_acme_corp_1042.png",
        "bank_fee_147.png",
    ]

    results = run_ocr_batch(image_paths)

    assert isinstance(results, list)
    assert len(results) == len(image_paths)

    expected_schema_keys = {"merchant", "date", "total", "currency"}

    for item in results:
        assert isinstance(item, dict)
        # Check all required keys exist
        assert expected_schema_keys.issubset(item.keys()), (
            f"Missing required keys in OCR result: {item}"
        )
        assert isinstance(item["merchant"], str) and len(item["merchant"]) > 0
        assert isinstance(item["date"], str) and len(item["date"]) > 0
        assert isinstance(item["total"], (int, float))
        assert isinstance(item["currency"], str) and len(item["currency"]) == 3

    # Assert specific deterministic mock mapping
    assert results[0]["merchant"] == "Home Depot"
    assert results[0]["total"] == 320.00
    assert results[0]["currency"] == "USD"

    assert results[1]["merchant"] == "Blue Bottle Coffee"
    assert results[1]["total"] == 18.50

    assert results[2]["merchant"] == "Acme Corp"
    assert results[2]["total"] == 1250.00
