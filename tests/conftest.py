# conftest.py is a special pytest file. Fixtures defined in this file will be accessible to all tests in this directory
# without needing to explicitly import them. (https://docs.pytest.org/en/6.2.x/fixture.html)


# We import the model_installer and torch_device fixtures here so that they can be used by all tests. Flake8 does not
# play well with fixtures (F401 and F811), so this is cleaner than importing in all files that use these fixtures.
import logging
import shutil
from pathlib import Path
from types import SimpleNamespace

import picklescan.scanner
import pytest
import safetensors.torch
import torch

import invokeai.backend.quantization.gguf.loaders as gguf_loaders
from invokeai.app.services.board_image_records.board_image_records_sqlite import SqliteBoardImageRecordStorage
from invokeai.app.services.board_records.board_records_sqlite import SqliteBoardRecordStorage
from invokeai.app.services.bulk_download.bulk_download_default import BulkDownloadService
from invokeai.app.services.config.config_default import InvokeAIAppConfig
from invokeai.app.services.images.images_default import ImageService
from invokeai.app.services.invocation_cache.invocation_cache_memory import MemoryInvocationCache
from invokeai.app.services.invocation_services import InvocationServices
from invokeai.app.services.invocation_stats.invocation_stats_default import InvocationStatsService
from invokeai.app.services.invoker import Invoker
from invokeai.backend.util.logging import InvokeAILogger
from scripts.strip_models import load_stripped_model
from tests.backend.model_manager.model_manager_fixtures import *  # noqa: F403
from tests.fixtures.sqlite_database import create_mock_sqlite_database  # noqa: F401
from tests.test_nodes import TestEventService


@pytest.fixture
def mock_services() -> InvocationServices:
    configuration = InvokeAIAppConfig(use_memory_db=True, node_cache_size=0)
    logger = InvokeAILogger.get_logger()
    db = create_mock_sqlite_database(configuration, logger)

    # NOTE: none of these are actually called by the test invocations
    return InvocationServices(
        board_image_records=SqliteBoardImageRecordStorage(db=db),
        board_images=None,  # type: ignore
        board_records=SqliteBoardRecordStorage(db=db),
        boards=None,  # type: ignore
        bulk_download=BulkDownloadService(),
        configuration=configuration,
        events=TestEventService(),
        image_files=None,  # type: ignore
        image_records=None,  # type: ignore
        images=ImageService(),
        invocation_cache=MemoryInvocationCache(max_cache_size=0),
        logger=logging,  # type: ignore
        model_images=None,  # type: ignore
        model_manager=None,  # type: ignore
        download_queue=None,  # type: ignore
        names=None,  # type: ignore
        performance_statistics=InvocationStatsService(),
        session_processor=None,  # type: ignore
        session_queue=None,  # type: ignore
        urls=None,  # type: ignore
        workflow_records=None,  # type: ignore
        tensors=None,  # type: ignore
        conditioning=None,  # type: ignore
        style_preset_records=None,  # type: ignore
        style_preset_image_files=None,  # type: ignore
        workflow_thumbnails=None,  # type: ignore
        model_relationship_records=None,  # type: ignore
        model_relationships=None,  # type: ignore
        client_state_persistence=None,  # type: ignore
    )


@pytest.fixture()
def mock_invoker(mock_services: InvocationServices) -> Invoker:
    return Invoker(services=mock_services)


@pytest.fixture(scope="module")
def invokeai_root_dir(tmp_path_factory) -> Path:
    root_template = Path(__file__).parent.resolve() / "backend/model_manager/data/invokeai_root"
    temp_dir: Path = tmp_path_factory.mktemp("data") / "invokeai_root"
    shutil.copytree(root_template, temp_dir)
    return temp_dir


@pytest.fixture(scope="function")
def override_model_loading(monkeypatch):
    """The legacy model probe directly calls model loading functions (e.g. torch.load) and also performs file scanning
     via picklescan.scanner.scan_file_path. This fixture replaces these functions with test-friendly versions for
     model files that have been 'stripped' to reduce their size (see scripts/strip_models.py).

    Ideally, model loading would be injected as a dependency (i.e. ModelOnDisk) - but to avoid modifying the legacy probe,
    we monkeypatch as a temporary workaround until the legacy probe is fully deprecated.
    """
    monkeypatch.setattr(torch, "load", load_stripped_model)
    monkeypatch.setattr(safetensors.torch, "load", load_stripped_model)
    monkeypatch.setattr(safetensors.torch, "load_file", load_stripped_model)
    monkeypatch.setattr(gguf_loaders, "gguf_sd_loader", load_stripped_model)

    def fake_scan(*args, **kwargs):
        return SimpleNamespace(infected_files=0, scan_err=None)

    monkeypatch.setattr(picklescan.scanner, "scan_file_path", fake_scan)
