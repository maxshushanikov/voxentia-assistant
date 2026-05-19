from unittest.mock import AsyncMock, patch

import pytest
from app.main import app
from app.services.rag_service import validate_url_for_ssrf
from fastapi.testclient import TestClient


def test_ssrf_validation_blocks_local_ips():
    # Loopback address
    with pytest.raises(ValueError, match="resolves to an unsafe local or private address"):
        validate_url_for_ssrf("http://127.0.0.1/admin")

    with pytest.raises(ValueError, match="resolves to an unsafe local or private address"):
        validate_url_for_ssrf("http://localhost:8000/status")

    # Private network addresses
    with pytest.raises(ValueError, match="resolves to an unsafe local or private address"):
        validate_url_for_ssrf("http://192.168.1.1/router")

    with pytest.raises(ValueError, match="resolves to an unsafe local or private address"):
        validate_url_for_ssrf("http://10.0.0.1/metadata")

    # Safe public address validation
    # Resolving google.com should succeed or at least bypass private IP filter (if DNS fails, raised resolves error is also handled)
    try:
        url = validate_url_for_ssrf("https://google.com")
        assert url == "https://google.com"
    except ValueError as e:
        if "resolves to" in str(e):
            pytest.fail(f"Safe public url google.com was falsely blocked: {e}")


def test_avatar_upload_fails_on_invalid_magic_bytes():
    client = TestClient(app)

    # 1. Invalid file extension
    files = {"file": ("avatar.jpg", b"fake jpeg content", "image/jpeg")}
    response = client.post("/api/v1/avatar/custom", files=files)
    assert response.status_code == 400
    assert "Only GLB files are supported" in response.json()["detail"]

    # 2. Valid extension but invalid magic bytes
    files = {"file": ("avatar.glb", b"invalid glb content header", "application/octet-stream")}
    response = client.post("/api/v1/avatar/custom", files=files)
    assert response.status_code == 400
    assert "failed magic bytes check" in response.json()["detail"]

    # 3. Valid extension and valid magic bytes
    files = {"file": ("avatar.glb", b"glTF_and_some_fake_body_data_here", "application/octet-stream")}
    with patch("pathlib.Path.write_bytes"):
        response = client.post("/api/v1/avatar/custom", files=files)
        assert response.status_code == 200
        assert response.json()["message"] == "Custom avatar uploaded successfully"


@patch("app.services.rag_service.process_document", new_callable=AsyncMock)
def test_upload_document_prevents_file_overwrite(mock_process):
    mock_process.return_value = {"message": "Processed successfully", "chunks": 2}

    client = TestClient(app)
    files1 = {"file": ("test_doc.txt", b"Hello original text file", "text/plain")}
    files2 = {"file": ("test_doc.txt", b"Hello overridden text file", "text/plain")}

    # We patch write_bytes to track files written
    written_files = []
    def fake_write_bytes(self, content):
        written_files.append((self.name, content))
        return len(content)

    with patch("pathlib.Path.write_bytes", fake_write_bytes):
        res1 = client.post("/api/v1/documents/upload", files=files1)
        res2 = client.post("/api/v1/documents/upload", files=files2)

        assert res1.status_code == 200
        assert res2.status_code == 200

        # Verify two distinct filenames with distinct content were written
        assert len(written_files) == 2
        file1_name, file1_content = written_files[0]
        file2_name, file2_content = written_files[1]

        # Verify UUID prefix was appended and they are distinct
        assert file1_name != file2_name
        assert file1_name.endswith("_test_doc.txt")
        assert file2_name.endswith("_test_doc.txt")
        assert file1_content != file2_content
