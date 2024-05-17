package main

import (
	"drinking_water/oauth" // Replace with the actual import path
	"encoding/json"
	"fmt"
	"github.com/gorilla/sessions"
	"golang.org/x/oauth2"
	"log"
	"net/http"
)

var (
	waterNodes OSMData
	store      *sessions.CookieStore
)

func init() {
	oauth.Init()
	store = oauth.Store
}

func main() {
	// Fetch water nodes on server start
	fetchWaterNodes()

	// Static file server
	fs := http.FileServer(http.Dir("static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	// Setting up HTTP server routes
	http.HandleFunc("/", handleMap)
	http.HandleFunc("/data", handleData)
	http.HandleFunc("/login", handleLogin)
	http.HandleFunc("/callback", handleCallback)
	http.HandleFunc("/addnode", handleAddNode)
	fmt.Println("Server starting on :8080...")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatalf("Error starting server: %s", err)
	}
}

// handleMap serves the HTML page with the Leaflet map
func handleMap(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "static/map.html")
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
	url := oauth.Oauth2Config.AuthCodeURL("state", oauth2.AccessTypeOffline)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func handleCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	token, err := oauth.Oauth2Config.Exchange(oauth2.NoContext, code)
	if err != nil {
		http.Error(w, "Failed to exchange token: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Store the token in the session
	session, _ := store.Get(r, "session-name")
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

func handleAddNode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	// Parse the incoming request to get node details
	var node struct {
		Lat     float64 `json:"lat"`
		Lon     float64 `json:"lon"`
		Amenity string  `json:"amenity"`
	}
	if err := json.NewDecoder(r.Body).Decode(&node); err != nil {
		http.Error(w, "Failed to parse request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Retrieve the OAuth token from the session
	session, _ := store.Get(r, "session-name")
	token, ok := session.Values["oauth-token"].(*oauth2.Token)
	if !ok {
		http.Error(w, "You are not authenticated. Please log in to add a new source.", http.StatusUnauthorized)
		log.Println("No OAuth token found in session")
		return
	}
	log.Printf("Retrieved OAuth token from session: %v", token)

	// Create the map node using the OAuth token
	oauth.CreateMapNode(token, node.Lat, node.Lon, node.Amenity)

	fmt.Fprintf(w, "Node created successfully")
}
