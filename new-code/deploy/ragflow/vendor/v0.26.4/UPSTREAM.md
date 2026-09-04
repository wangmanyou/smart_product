# Upstream provenance

- Project: RAGFlow
- Repository: https://github.com/infiniflow/ragflow
- Version: v0.26.4
- License: Apache License 2.0 (see `LICENSE`)
- Source area copied: upstream `docker/`

Local hardening changes:

1. Host ports are bound to `127.0.0.1` rather than all interfaces.
2. `.env.example` uses project-specific, non-conflicting host ports.
3. The active Elasticsearch container memory limit is set to 6 GiB for this Docker Desktop environment.
4. Real `.env` secrets are generated locally and excluded from Git.
