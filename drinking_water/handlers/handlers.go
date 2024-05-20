package handlers

import (
	"drinking_water/oauth"
	"drinking_water/osm"
	"encoding/json"
	"fmt"
	"golang.org/x/oauth2"
	"log"
	"net/http"
)

func HandleData(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(osm.WaterNodes.Elements)
}

func HandleMap(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "static/map.html")
}

func HandleLogin(w http.ResponseWriter, r *http.Request) {
	url := oauth.Oauth2Config.AuthCodeURL("state", oauth2.AccessTypeOffline)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func HandleCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	token, err := oauth.Oauth2Config.Exchange(oauth2.NoContext, code)
	if err != nil {
		http.Error(w, "Failed to exchange token: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Store the token in the session
	session, _ := oauth.Store.Get(r, "session-name")
	session.Values["oauth-token"] = token
	err = session.Save(r, w)
	if err != nil {
		http.Error(w, "Failed to save session: "+err.Error(), http.StatusInternalServerError)
		return
	}
	log.Printf("OAuth token saved in session: %v", token)

	// Redirect back to the main map page
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func HandleAddNode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	// Parse the incoming request to get node details
	var node struct {
		Lat  float64           `json:"lat"`
		Lon  float64           `json:"lon"`
		Tags map[string]string `json:"tags"`
	}
	if err := json.NewDecoder(r.Body).Decode(&node); err != nil {
		http.Error(w, "Failed to parse request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Retrieve the OAuth token from the session
	session, _ := oauth.Store.Get(r, "session-name")
	token, ok := session.Values["oauth-token"].(*oauth2.Token)
	if !ok {
		http.Error(w, "You are not authenticated. Please log in to add a new source.", http.StatusUnauthorized)
		log.Println("No OAuth token found in session")
		return
	}
	log.Printf("Retrieved OAuth token from session: %v", token)

	// Create the map node using the OAuth token
	oauth.CreateMapNode(token, node.Lat, node.Lon, node.Tags)

	fmt.Fprintf(w, "Node created successfully")
}
