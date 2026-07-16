package dataloaders

import (
	"context"
	"fmt"
	"sync"

	"api/graph/model"

	"github.com/jackc/pgx/v5/pgxpool"
)

type UserLoader struct {
	db     *pgxpool.Pool
	cache  sync.Map
}

func NewUserLoader(db *pgxpool.Pool) *UserLoader {
	return &UserLoader{db: db}
}

func (l *UserLoader) LoadUserByID(ctx context.Context, id int) (*model.User, error) {
	if cached, ok := l.cache.Load(id); ok {
		return cached.(*model.User), nil
	}

	var u model.User
	var name, email, role *string
	err := l.db.QueryRow(ctx,
		`SELECT id, name, email, role, is_verified FROM users WHERE id = $1`, id,
	).Scan(&u.ID, &name, &email, &role, &u.IsVerified)
	if err != nil {
		return nil, fmt.Errorf("error loading user %d: %w", id, err)
	}
	u.Name = name
	u.Email = email
	u.Role = role

	l.cache.Store(id, &u)
	return &u, nil
}

func (l *UserLoader) LoadUsersBatch(ctx context.Context, ids []int) (map[int]*model.User, error) {
	if len(ids) == 0 {
		return map[int]*model.User{}, nil
	}

	result := make(map[int]*model.User, len(ids))
	var missingIDs []int
	for _, id := range ids {
		if cached, ok := l.cache.Load(id); ok {
			result[id] = cached.(*model.User)
		} else {
			missingIDs = append(missingIDs, id)
		}
	}

	if len(missingIDs) == 0 {
		return result, nil
	}

	rows, err := l.db.Query(ctx,
		`SELECT id, name, email, role, is_verified FROM users WHERE id = ANY($1)`, missingIDs,
	)
	if err != nil {
		return nil, fmt.Errorf("error batch loading users: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var u model.User
		var name, email, role *string
		if err := rows.Scan(&u.ID, &name, &email, &role, &u.IsVerified); err != nil {
			return nil, err
		}
		u.Name = name
		u.Email = email
		u.Role = role

		id := 0
		fmt.Sscanf(u.ID, "%d", &id)
		l.cache.Store(id, &u)
		result[id] = &u
	}

	return result, nil
}
