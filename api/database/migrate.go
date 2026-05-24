package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

func RunMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return fmt.Errorf("crear tabla schema_migrations: %w", err)
	}

	entries, err := os.ReadDir("database/migrations")
	if err != nil {
		return fmt.Errorf("leer directorio migrations: %w", err)
	}

	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)

	for _, f := range files {
		var applied bool
		err := pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE filename = $1)", f).Scan(&applied)
		if err != nil {
			return fmt.Errorf("verificar migracion %s: %w", f, err)
		}
		if applied {
			continue
		}

		content, err := os.ReadFile(filepath.Join("database/migrations", f))
		if err != nil {
			return fmt.Errorf("leer %s: %w", f, err)
		}

		_, err = pool.Exec(ctx, string(content))
		if err != nil {
			return fmt.Errorf("aplicar %s: %w", f, err)
		}

		_, err = pool.Exec(ctx, "INSERT INTO schema_migrations (filename) VALUES ($1)", f)
		if err != nil {
			return fmt.Errorf("registrar %s: %w", f, err)
		}

		log.Printf("Migracion aplicada: %s", f)
	}

	return nil
}
