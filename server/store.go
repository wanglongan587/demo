package main

import (
	"database/sql"
	"errors"
	"time"

	_ "modernc.org/sqlite" // pure-Go driver, no cgo
)

type Todo struct {
	ID        int64     `json:"id"`
	Title     string    `json:"title"`
	Done      bool      `json:"done"`
	CreatedAt time.Time `json:"createdAt"`
}

var ErrNotFound = errors.New("not found")

type Store struct{ db *sql.DB }

const schema = `
CREATE TABLE IF NOT EXISTS todos (
	id         INTEGER PRIMARY KEY AUTOINCREMENT,
	title      TEXT    NOT NULL,
	done       INTEGER NOT NULL DEFAULT 0,
	created_at TEXT    NOT NULL
);`

func OpenStore(path string) (*Store, error) {
	db, err := sql.Open("sqlite", path+"?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)")
	if err != nil {
		return nil, err
	}
	// One writer at a time keeps SQLite free of "database is locked".
	db.SetMaxOpenConns(1)
	if _, err := db.Exec(schema); err != nil {
		db.Close()
		return nil, err
	}
	s := &Store{db: db}
	if err := s.initRecords(); err != nil {
		db.Close()
		return nil, err
	}
	return s, nil
}

func (s *Store) Close() error { return s.db.Close() }

func (s *Store) List() ([]Todo, error) {
	rows, err := s.db.Query(`SELECT id, title, done, created_at FROM todos ORDER BY id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	todos := []Todo{}
	for rows.Next() {
		t, err := scan(rows)
		if err != nil {
			return nil, err
		}
		todos = append(todos, t)
	}
	return todos, rows.Err()
}

func (s *Store) Create(title string) (Todo, error) {
	now := time.Now().UTC()
	res, err := s.db.Exec(`INSERT INTO todos (title, created_at) VALUES (?, ?)`, title, now.Format(time.RFC3339Nano))
	if err != nil {
		return Todo{}, err
	}
	id, err := res.LastInsertId()
	return Todo{ID: id, Title: title, CreatedAt: now}, err
}

func (s *Store) SetDone(id int64, done bool) (Todo, error) {
	res, err := s.db.Exec(`UPDATE todos SET done = ? WHERE id = ?`, done, id)
	if err != nil {
		return Todo{}, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return Todo{}, ErrNotFound
	}
	return scan(s.db.QueryRow(`SELECT id, title, done, created_at FROM todos WHERE id = ?`, id))
}

func (s *Store) Delete(id int64) error {
	res, err := s.db.Exec(`DELETE FROM todos WHERE id = ?`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

func scan(row interface{ Scan(...any) error }) (Todo, error) {
	var t Todo
	var created string
	if err := row.Scan(&t.ID, &t.Title, &t.Done, &created); err != nil {
		return Todo{}, err
	}
	t.CreatedAt, _ = time.Parse(time.RFC3339Nano, created)
	return t, nil
}
