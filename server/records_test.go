package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

func recordTestServer(t *testing.T) (*Store, *http.ServeMux) {
	t.Helper()
	s, err := OpenStore(filepath.Join(t.TempDir(), "workspace.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { s.Close() })
	mux := http.NewServeMux()
	(&API{store: s}).Register(mux)
	return s, mux
}

func recordRequest(mux *http.ServeMux, method, path, body string) *httptest.ResponseRecorder {
	r := httptest.NewRecorder()
	mux.ServeHTTP(r, httptest.NewRequest(method, path, strings.NewReader(body)))
	return r
}

func TestRecordsCRUDAndConflict(t *testing.T) {
	_, mux := recordTestServer(t)
	// Exercise each collection with the real HTTP boundary and SQLite storage.
	var seeds []Record
	if err := json.Unmarshal(seed, &seeds); err != nil {
		t.Fatal(err)
	}
	seen := map[string]bool{}
	seeds = append(seeds, Record{Collection: "runs", Data: json.RawMessage(`{"title":"预览","workflowId":"w1","input":"需求","output":"演示输出"}`)})
	for _, sample := range seeds {
		if seen[sample.Collection] {
			continue
		}
		seen[sample.Collection] = true
		t.Run(sample.Collection, func(t *testing.T) {
			base := "/api/records/" + sample.Collection
			body := `{"data":` + string(sample.Data) + `}`
			res := recordRequest(mux, "POST", base, body)
			if res.Code != 201 {
				t.Fatalf("create: %d %s", res.Code, res.Body)
			}
			var created Record
			if err := json.Unmarshal(res.Body.Bytes(), &created); err != nil {
				t.Fatal(err)
			}
			if created.ID == "" || created.Revision != 1 || created.UpdatedAt == "" {
				t.Fatalf("metadata: %+v", created)
			}
			path := base + "/" + created.ID
			res = recordRequest(mux, "GET", path, "")
			if res.Code != 200 || !strings.Contains(res.Body.String(), created.ID) {
				t.Fatalf("get: %d %s", res.Code, res.Body)
			}
			update := `{"revision":1,"data":` + string(sample.Data) + `}`
			res = recordRequest(mux, "PUT", path, update)
			if res.Code != 200 || !strings.Contains(res.Body.String(), `"revision":2`) {
				t.Fatalf("update: %d %s", res.Code, res.Body)
			}
			if res = recordRequest(mux, "PUT", path, update); res.Code != 409 {
				t.Fatalf("stale write: %d %s", res.Code, res.Body)
			}
			if res = recordRequest(mux, "DELETE", path+"?revision=1", ""); res.Code != 409 {
				t.Fatalf("stale delete: %d", res.Code)
			}
			if res = recordRequest(mux, "DELETE", path+"?revision=2", ""); res.Code != 204 {
				t.Fatalf("delete: %d", res.Code)
			}
			if res = recordRequest(mux, "GET", path, ""); res.Code != 404 {
				t.Fatalf("missing: %d", res.Code)
			}
			if res = recordRequest(mux, "PUT", path, update); res.Code != 404 {
				t.Fatalf("update missing: %d", res.Code)
			}
		})
	}
}

func TestRecordsPersistenceAndSeedOnlyOnce(t *testing.T) {
	path := filepath.Join(t.TempDir(), "persist.db")
	s, err := OpenStore(path)
	if err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	(&API{store: s}).Register(mux)
	if r := recordRequest(mux, "DELETE", "/api/records/tasks/t1?revision=1", ""); r.Code != 204 {
		t.Fatal(r.Code)
	}
	r := recordRequest(mux, "POST", "/api/records/projects", `{"data":{"name":"重启后保留","description":"持久化测试","env":"local"}}`)
	if r.Code != 201 {
		t.Fatalf("create: %d %s", r.Code, r.Body)
	}
	var created Record
	json.Unmarshal(r.Body.Bytes(), &created)
	if err = s.Close(); err != nil {
		t.Fatal(err)
	}
	s, err = OpenStore(path)
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	mux = http.NewServeMux()
	(&API{store: s}).Register(mux)
	if r = recordRequest(mux, "GET", "/api/records/projects/"+created.ID, ""); r.Code != 200 || !strings.Contains(r.Body.String(), "重启后保留") {
		t.Fatalf("lost record: %d %s", r.Code, r.Body)
	}
	if r = recordRequest(mux, "GET", "/api/records/tasks/t1", ""); r.Code != 404 {
		t.Fatalf("deleted seed restored on restart: %d", r.Code)
	}
}

func TestRecordsRejectMalformedInput(t *testing.T) {
	_, mux := recordTestServer(t)
	for _, body := range []string{`{`, `null`, `[]`, `{}`, `{"data":null}`, `{"data":[]}`, `{"data":{}}`, `{"data":{"name":"","description":"x","env":"local"}}`, `{"data":{"name":"x","description":"x","env":"wrong"}}`, `{"data":{"name":123,"description":"x","env":"local"}}`, `{"data":{"name":"x","description":"x","env":"local"},"unexpected":true}`, `{"data":{"name":"x","description":"x","env":"local"}} {}`, fmt.Sprintf(`{"data":{"name":"x","description":"%s","env":"local"}}`, strings.Repeat("x", 1<<20))} {
		r := recordRequest(mux, "POST", "/api/records/projects", body)
		if r.Code != 400 {
			t.Fatalf("accepted malformed input (length %d): %d %s", len(body), r.Code, r.Body)
		}
	}
	for _, tc := range []struct {
		method, path string
		want         int
	}{
		{"POST", "/api/records/unknown", 404}, {"GET", "/api/no-such-endpoint", 404}, {"PATCH", "/api/records/tasks/t1", 405}, {"DELETE", "/api/records/tasks/t1", 400},
	} {
		if r := recordRequest(mux, tc.method, tc.path, ""); r.Code != tc.want {
			t.Fatalf("%s %s: %d, want %d", tc.method, tc.path, r.Code, tc.want)
		}
	}
	for _, messages := range []string{`null`, `{}`, `[{"role":"system","text":"x"}]`, `[{"role":"user","text":123}]`, `[{"role":"user","text":"x","files":{}}]`} {
		body := `{"data":{"title":"任务","description":"","projectId":"","env":"local","status":"todo","agent":"Codex","messages":` + messages + `}}`
		if r := recordRequest(mux, "POST", "/api/records/tasks", body); r.Code != 400 {
			t.Fatalf("invalid messages accepted: %s", messages)
		}
	}
}

func TestConcurrentRecordUpdatesDoNotLoseWrites(t *testing.T) {
	_, mux := recordTestServer(t)
	var wg sync.WaitGroup
	start := make(chan struct{})
	codes := make(chan int, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			<-start
			r := recordRequest(mux, "PUT", "/api/records/projects/p1", fmt.Sprintf(`{"revision":1,"data":{"name":"编辑%d","description":"","env":"local"}}`, i))
			codes <- r.Code
		}(i)
	}
	close(start)
	wg.Wait()
	close(codes)
	counts := map[int]int{}
	for code := range codes {
		counts[code]++
	}
	if counts[200] != 1 || counts[409] != 1 {
		t.Fatalf("want one successful write and one conflict, got %v", counts)
	}
}
