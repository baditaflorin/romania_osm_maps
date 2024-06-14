package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"osm-zoning/config"
	"osm-zoning/oauth"
	"osm-zoning/osm"

	"golang.org/x/oauth2"
)

func HandleData(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		bbox := r.URL.Query().Get("bbox")
		if bbox == "" {
			http.Error(w, "Bounding box is required", http.StatusBadRequest)
			return
		}

		// Fetch ways within the given bounding box
		osm.FetchWays(cfg, bbox)

		w.Header().Set("Content-Type", "application/json")
		data, err := json.Marshal(osm.Ways.Elements)
		if err != nil {
			http.Error(w, "Failed to encode data: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Log the data that will be sent
		//log.Printf("Serving data: %s", data)

		w.Write(data)
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
		err = session.Save(r, w)
		if err != nil {
			http.Error(w, "Failed to save session: "+err.Error(), http.StatusInternalServerError)
			return
		}
		log.Printf("OAuth token saved in session: %v", token)

		http.Redirect(w, r, "/", http.StatusSeeOther)
	}
}

func HandleAddWay(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
			return
		}

		session, _ := oauth.Store.Get(r, "session-name")
		token, ok := session.Values["oauth-token"].(*oauth2.Token)
		if !ok {
			http.Error(w, "You are not authenticated. Please log in to add a new road.", http.StatusUnauthorized)
			log.Println("No OAuth token found in session")
			return
		}

		var way struct {
			Nodes []int64           `json:"nodes"`
			Tags  map[string]string `json:"tags"`
		}
		if err := json.NewDecoder(r.Body).Decode(&way); err != nil {
			http.Error(w, "Failed to parse request body: "+err.Error(), http.StatusBadRequest)
			return
		}

		log.Printf("Retrieved OAuth token from session: %v", token)

		oauth.CreateMapWay(cfg, token, way.Nodes, way.Tags)

		fmt.Fprintf(w, "Way created successfully")
	}
}

func HandleUpdateWay(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
			return
		}

		session, _ := oauth.Store.Get(r, "session-name")
		token, ok := session.Values["oauth-token"].(*oauth2.Token)
		if !ok {
			log.Println("No OAuth token found in session")
			http.Error(w, "You are not authenticated. Please log in to update this road.", http.StatusUnauthorized)
			return
		}

		var way struct {
			ID   int64             `json:"id"`
			Tags map[string]string `json:"tags"`
		}
		if err := json.NewDecoder(r.Body).Decode(&way); err != nil {
			http.Error(w, "Failed to parse request body: "+err.Error(), http.StatusBadRequest)
			return
		}

		log.Printf("Retrieved OAuth token from session: %v", token)

		oauth.UpdateWayTags(cfg, token, way.ID, way.Tags)

		fmt.Fprintf(w, "Way updated successfully")
	}
}

func HandleSaveChanges(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		session, _ := oauth.Store.Get(r, "session-name")
		token, ok := session.Values["oauth-token"].(*oauth2.Token)
		if !ok {
			http.Error(w, "You are not authenticated. Please log in to save changes.", http.StatusUnauthorized)
			log.Println("No OAuth token found in session")
			return
		}
		log.Printf("Retrieved OAuth token from session: %v", token)

		oauth.SaveChanges(cfg, token)

		fmt.Fprintf(w, "Changes saved successfully")
	}
}
