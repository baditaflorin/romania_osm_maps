package handlers

import (
	"encoding/json"
	"net/http"
	"toilet_map/config"
	"toilet_map/oauth"
	"toilet_map/osm"

	"golang.org/x/oauth2"
)

func HandleData(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		bbox := r.URL.Query().Get("bbox")
		if bbox == "" {
			http.Error(w, "Bounding box is required", http.StatusBadRequest)
			return
		}
		osm.FetchNodes(cfg, bbox)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(osm.Nodes.Elements)
	}
}

func HandleMap(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "static/map.html")
	}
}

func HandleLogin(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		url := oauth.Oauth2Config.AuthCodeURL("state", oauth2.AccessTypeOffline)
		http.Redirect(w, r, url, http.StatusTemporaryRedirect)
	}
}

func HandleCallback(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		token, err := oauth.Oauth2Config.Exchange(oauth2.NoContext, code)
		if err != nil {
			http.Error(w, "Failed to exchange token: "+err.Error(), http.StatusInternalServerError)
			return
		}

		session, _ := oauth.Store.Get(r, "session-name")
		session.Values["oauth-token"] = token
		if err := session.Save(r, w); err != nil {
			http.Error(w, "Failed to save session: "+err.Error(), http.StatusInternalServerError)
			return
		}

		http.Redirect(w, r, "/", http.StatusSeeOther)
	}
}
