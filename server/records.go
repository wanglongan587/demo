package main

import (
	"context"
	"database/sql"
	_ "embed"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Record is a versioned demo document. Execution and presentation stay in the client.
type Record struct {
	ID         string          `json:"id"`
	Collection string          `json:"collection"`
	Revision   int64           `json:"revision"`
	Data       json.RawMessage `json:"data"`
	UpdatedAt  string          `json:"updatedAt"`
}

//go:embed seed.json
var seed []byte

var collections = map[string]bool{"tasks": true, "projects": true, "schedules": true, "workflows": true, "resources": true, "notifications": true, "settings": true, "runs": true}

const recordSchema = `CREATE TABLE IF NOT EXISTS records (
 collection TEXT NOT NULL, id TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1,
 data TEXT NOT NULL CHECK(json_valid(data)), updated_at TEXT NOT NULL,
 PRIMARY KEY(collection,id));
 CREATE TABLE IF NOT EXISTS demo_metadata (key TEXT PRIMARY KEY);`

func (s *Store) initRecords() error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(recordSchema); err != nil {
		return err
	}
	result, err := tx.Exec(`INSERT OR IGNORE INTO demo_metadata(key) VALUES ('workspace-seed-v1')`)
	if err != nil {
		return err
	}
	n, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if n == 1 {
		var records []Record
		if err = json.Unmarshal(seed, &records); err != nil {
			return err
		}
		now := time.Now().UTC().Format(time.RFC3339Nano)
		for _, r := range records {
			if _, err = tx.Exec(`INSERT INTO records(collection,id,data,updated_at) VALUES(?,?,?,?)`, r.Collection, r.ID, string(r.Data), now); err != nil {
				return err
			}
		}
	}
	return tx.Commit()
}

func (s *Store) records(ctx context.Context, collection string) ([]Record, error) {
	query := `SELECT id,collection,revision,data,updated_at FROM records`
	args := []any{}
	if collection != "" {
		query += ` WHERE collection=?`
		args = append(args, collection)
	}
	rows, err := s.db.QueryContext(ctx, query+` ORDER BY updated_at DESC,id`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Record{}
	for rows.Next() {
		r, err := scanRecord(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, r)
	}
	return items, rows.Err()
}

func scanRecord(row interface{ Scan(...any) error }) (Record, error) {
	var r Record
	var data string
	err := row.Scan(&r.ID, &r.Collection, &r.Revision, &data, &r.UpdatedAt)
	r.Data = json.RawMessage(data)
	return r, err
}

func (a *API) registerRecords(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/workspace", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		items, err := a.store.records(r.Context(), "")
		if err != nil {
			fail(w, err)
			return
		}
		writeJSON(w, 200, items)
	})
	mux.HandleFunc("/api/records/{collection}", a.recordEndpoint)
	mux.HandleFunc("/api/records/{collection}/{id}", a.recordEndpoint)
	// Never fall back to the SPA for misspelled API routes.
	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) { http.NotFound(w, r) })
}

type recordInput struct {
	Data     json.RawMessage `json:"data"`
	Revision int64           `json:"revision"`
}

func decodeRecord(w http.ResponseWriter, r *http.Request) (recordInput, bool) {
	var in recordInput
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	if err := d.Decode(&in); err != nil {
		http.Error(w, "请求必须是有效 JSON，且不能超过 1 MiB", 400)
		return in, false
	}
	var extra any
	if d.Decode(&extra) != io.EOF {
		http.Error(w, "请求只能包含一个 JSON 对象", 400)
		return in, false
	}
	var obj map[string]json.RawMessage
	if json.Unmarshal(in.Data, &obj) != nil || obj == nil {
		http.Error(w, "data 必须是对象", 400)
		return in, false
	}
	return in, true
}

func (a *API) recordEndpoint(w http.ResponseWriter, r *http.Request) {
	collection, id := r.PathValue("collection"), r.PathValue("id")
	if !collections[collection] {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	if r.Method == http.MethodGet {
		if id == "" {
			items, err := a.store.records(r.Context(), collection)
			if err != nil {
				fail(w, err)
				return
			}
			writeJSON(w, 200, items)
			return
		}
		item, err := scanRecord(a.store.db.QueryRowContext(r.Context(), `SELECT id,collection,revision,data,updated_at FROM records WHERE collection=? AND id=?`, collection, id))
		if errors.Is(err, sql.ErrNoRows) {
			http.NotFound(w, r)
			return
		}
		if err != nil {
			fail(w, err)
			return
		}
		writeJSON(w, 200, item)
		return
	}
	if r.Method == http.MethodPost && id == "" {
		in, ok := decodeRecord(w, r)
		if !ok {
			return
		}
		if !validateRecord(w, collection, in.Data) {
			return
		}
		item := Record{ID: uuid.NewString(), Collection: collection, Revision: 1, Data: in.Data, UpdatedAt: time.Now().UTC().Format(time.RFC3339Nano)}
		_, err := a.store.db.ExecContext(r.Context(), `INSERT INTO records(collection,id,data,updated_at) VALUES(?,?,?,?)`, collection, item.ID, string(item.Data), item.UpdatedAt)
		if err != nil {
			fail(w, err)
			return
		}
		writeJSON(w, 201, item)
		return
	}
	if id != "" && (r.Method == http.MethodPut || r.Method == http.MethodDelete) {
		var revision int64
		var in recordInput
		if r.Method == http.MethodPut {
			var ok bool
			in, ok = decodeRecord(w, r)
			if !ok {
				return
			}
			revision = in.Revision
			if !validateRecord(w, collection, in.Data) {
				return
			}
		} else {
			revision, _ = strconv.ParseInt(r.URL.Query().Get("revision"), 10, 64)
		}
		if revision < 1 {
			http.Error(w, "缺少有效的 revision", 400)
			return
		}
		now := time.Now().UTC().Format(time.RFC3339Nano)
		// Check the version and mutate in one statement, so two clients cannot silently overwrite each other.
		var result sql.Result
		var err error
		if r.Method == http.MethodDelete {
			result, err = a.store.db.ExecContext(r.Context(), `DELETE FROM records WHERE collection=? AND id=? AND revision=?`, collection, id, revision)
		} else {
			result, err = a.store.db.ExecContext(r.Context(), `UPDATE records SET data=?,revision=revision+1,updated_at=? WHERE collection=? AND id=? AND revision=?`, string(in.Data), now, collection, id, revision)
		}
		if err != nil {
			fail(w, err)
			return
		}
		n, err := result.RowsAffected()
		if err != nil {
			fail(w, err)
			return
		}
		if n == 0 {
			var exists int
			err = a.store.db.QueryRowContext(r.Context(), `SELECT 1 FROM records WHERE collection=? AND id=?`, collection, id).Scan(&exists)
			if errors.Is(err, sql.ErrNoRows) {
				http.NotFound(w, r)
			} else if err != nil {
				fail(w, err)
			} else {
				http.Error(w, "数据已在其他页面更新，请刷新后重试；当前输入已保留", 409)
			}
			return
		}
		if r.Method == http.MethodDelete {
			w.WriteHeader(204)
		} else {
			writeJSON(w, 200, Record{ID: id, Collection: collection, Revision: revision + 1, Data: in.Data, UpdatedAt: now})
		}
		return
	}
	w.Header().Set("Allow", "GET, POST, PUT, DELETE")
	http.Error(w, "不支持此操作", 405)
}

// This is structural input validation only; there is no scheduler, agent or workflow engine.
func validateRecord(w http.ResponseWriter, collection string, data json.RawMessage) bool {
	var obj map[string]json.RawMessage
	_ = json.Unmarshal(data, &obj)
	required := map[string][]string{
		"tasks":    {"title", "description", "projectId", "env", "status", "agent"},
		"projects": {"name", "description", "env"}, "schedules": {"title", "prompt", "frequency", "time", "env"},
		"workflows": {"name", "description", "role", "agent"}, "resources": {"name", "description", "kind", "meta"},
		"notifications": {"title", "text", "taskId"}, "settings": {"name", "theme", "agent", "env", "projectId"},
		"runs": {"title", "workflowId", "input", "output"},
	}
	for _, key := range required[collection] {
		var value string
		v, ok := obj[key]
		if !ok || json.Unmarshal(v, &value) != nil || string(v) == "null" || len(value) > 100000 || (key == "title" || key == "name") && strings.TrimSpace(value) == "" {
			http.Error(w, "缺少或无效的字段："+key, 400)
			return false
		}
	}
	for key, values := range map[string]string{"env": "local cloud", "status": "todo running review done", "theme": "light dark", "kind": "agents teams skills plugins runtimes"} {
		if v, ok := obj[key]; ok {
			var value string
			_ = json.Unmarshal(v, &value)
			found := false
			for _, allowed := range strings.Fields(values) {
				if value == allowed {
					found = true
				}
			}
			if !found {
				http.Error(w, "无效的字段："+key, 400)
				return false
			}
		}
	}
	for _, key := range map[string][]string{"tasks": {"messages"}, "schedules": {"enabled"}, "workflows": {"extra"}, "resources": {"installed"}, "notifications": {"read"}}[collection] {
		v, ok := obj[key]
		valid := false
		if key == "messages" {
			var messages []struct {
				Role  string   `json:"role"`
				Text  string   `json:"text"`
				Agent string   `json:"agent"`
				Files []string `json:"files"`
			}
			if json.Unmarshal(v, &messages) == nil && messages != nil {
				valid = true
				for _, m := range messages {
					if m.Role != "user" && m.Role != "assistant" {
						valid = false
					}
				}
			}
		} else {
			var b bool
			valid = json.Unmarshal(v, &b) == nil && string(v) != "null"
		}
		if !ok || !valid {
			http.Error(w, "无效的字段："+key, 400)
			return false
		}
	}
	return true
}
