# Database Backup & Restore

## Backup Schedule

Automated backups run **daily** (`@daily`) via the `srms-pg-backup` container using the `prodrigestivus/pg-backup` image.

## Backup File Location

Backups are written to `./backups/` on the host (mapped to `/backups` inside the container).

## File Naming Convention

The `prodrigestivus/pg-backup` image names files using the pattern:

```
srms_YYYY-MM-DD.sql
```

Files are plain SQL dumps (suitable for `psql` restore). The image does not produce custom-format dumps by default.

## Restore Procedure

### Plain SQL format (default)

```bash
psql -U postgres -d srms < ./backups/srms_YYYY-MM-DD.sql
```

Run this against the running `srms-postgres` container:

```bash
docker exec -i srms-postgres psql -U postgres -d srms < ./backups/srms_YYYY-MM-DD.sql
```

### Custom format (if applicable)

If a backup was taken in pg_dump custom format (`-Fc`), restore with:

```bash
pg_restore -U postgres -d srms ./backups/srms_YYYY-MM-DD.dump
```

## Manual Backup

To trigger a backup outside the schedule, exec into the container and run the backup script directly:

```bash
docker exec -it srms-pg-backup /backup.sh
```

The resulting file will appear in `./backups/` on the host.
