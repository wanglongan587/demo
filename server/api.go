package main

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
)

type API struct{ store *Store }

func (a *API) Register(mux *http.ServeMux) {
	a.registerRecords(mux)
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("GET /api/todos", a.list)
	mux.HandleFunc("POST /api/todos", a.create)
	mux.HandleFunc("PATCH /api/todos/{id}", a.update)
	mux.HandleFunc("DELETE /api/todos/{id}", a.delete)
}

func (a *API) list(w http.ResponseWriter, _ *http.Request) {
	todos, err := a.store.List()
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, todos)
}

func (a *API) create(w http.ResponseWriter, r *http.Request) {
	var in struct{ Title string }
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || strings.TrimSpace(in.Title) == "" {
		http.Error(w, "标题不能为空", http.StatusBadRequest)
		return
	}
	todo, err := a.store.Create(strings.TrimSpace(in.Title))
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, todo)
}

func (a *API) update(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var in struct{ Done *bool }
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Done == nil {
		http.Error(w, "缺少 done 字段", http.StatusBadRequest)
		return
	}
	todo, err := a.store.SetDone(id, *in.Done)
	if err != nil {
		fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, todo)
}

func (a *API) delete(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	if err := a.store.Delete(id); err != nil {
		fail(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func pathID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "无效的 id", http.StatusBadRequest)
		return 0, false
	}
	return id, true
}

func fail(w http.ResponseWriter, err error) {
	if errors.Is(err, ErrNotFound) {
		http.Error(w, "事项不存在", http.StatusNotFound)
		return
	}
	log.Print(err)
	http.Error(w, "服务器错误", http.StatusInternalServerError)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
