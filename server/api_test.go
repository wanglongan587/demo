package main

import (
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
)

func TestTodoLifecycle(t *testing.T) {
	store, err := OpenStore(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	mux := http.NewServeMux()
	(&API{store: store}).Register(mux)

	do := func(method, path, body string) *httptest.ResponseRecorder {
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, httptest.NewRequest(method, path, strings.NewReader(body)))
		return rec
	}

	if rec := do("POST", "/api/todos", `{"title":"写演示稿"}`); rec.Code != http.StatusCreated {
		t.Fatalf("create: %d %s", rec.Code, rec.Body)
	}
	if rec := do("POST", "/api/todos", `{"title":"  "}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("empty title: %d", rec.Code)
	}
	if rec := do("PATCH", "/api/todos/1", `{"done":true}`); rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"done":true`) {
		t.Fatalf("update: %d %s", rec.Code, rec.Body)
	}
	if rec := do("GET", "/api/todos", ""); !strings.Contains(rec.Body.String(), "写演示稿") {
		t.Fatalf("list: %s", rec.Body)
	}
	if rec := do("DELETE", "/api/todos/1", ""); rec.Code != http.StatusNoContent {
		t.Fatalf("delete: %d", rec.Code)
	}
	if rec := do("DELETE", "/api/todos/1", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("delete missing: %d", rec.Code)
	}
}
