package main

import (
	"bytes"
	"encoding/gob"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/sessions"
	"github.com/joho/godotenv"
	"golang.org/x/oauth2"
)

var (
	clientID     string
	clientSecret string
	redirectURI  = "http://127.0.0.1:8080/callback"
	oauth2Config *oauth2.Config
	waterNodes   OSMData
	store        = sessions.NewCookieStore([]byte("super-secret-key"))
)

func init() {
	// Register oauth2.Token with gob
	gob.Register(&oauth2.Token{})

	// Load environment variables from .env file
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	clientID = os.Getenv("CLIENT_ID")
	clientSecret = os.Getenv("CLIENT_SECRET")

	oauth2Config = &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURI,
		Scopes: []string{
			"read_prefs",
			"write_prefs",
			"write_api",
		},
		Endpoint: oauth2.Endpoint{
			AuthURL:  "https://www.openstreetmap.org/oauth2/authorize",
			TokenURL: "https://www.openstreetmap.org/oauth2/token",
		},
	}
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
	url := oauth2Config.AuthCodeURL("state", oauth2.AccessTypeOffline)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func handleCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	token, err := oauth2Config.Exchange(oauth2.NoContext, code)
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
		http.Error(w, "No OAuth token found", http.StatusUnauthorized)
		log.Println("No OAuth token found in session")
		return
	}
	log.Printf("Retrieved OAuth token from session: %v", token)

	// Create the map node using the OAuth token
	createMapNode(token, node.Lat, node.Lon, node.Amenity)

	fmt.Fprintf(w, "Node created successfully")
}

func createChangeset(token *oauth2.Token) (int, error) {
	client := oauth2Config.Client(oauth2.NoContext, token)
	endpointURL := "https://api.openstreetmap.org/api/0.6/changeset/create"

	xmlData := `
		<osm>
			<changeset>
				<tag k="created_by" v="go-example"/>
				<tag k="comment" v="Adding a drinking water node"/>
			</changeset>
		</osm>`

	req, err := http.NewRequest("PUT", endpointURL, bytes.NewBufferString(xmlData))
	if err != nil {
		return 0, fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)
	req.Header.Set("Content-Type", "text/xml")

	resp, err := client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("failed to create changeset: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("failed to create changeset: status code %d", resp.StatusCode)
	}

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("failed to read response body: %v", err)
	}

	var changesetID int
	fmt.Sscanf(string(body), "%d", &changesetID)

	return changesetID, nil
}

func closeChangeset(token *oauth2.Token, changesetID int) error {
	client := oauth2Config.Client(oauth2.NoContext, token)
	endpointURL := fmt.Sprintf("https://api.openstreetmap.org/api/0.6/changeset/%d/close", changesetID)

	req, err := http.NewRequest("PUT", endpointURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to close changeset: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to close changeset: status code %d", resp.StatusCode)
	}

	return nil
}

func createMapNode(token *oauth2.Token, lat, lon float64, amenity string) {
	changesetID, err := createChangeset(token)
	if err != nil {
		log.Fatalf("Failed to create changeset: %v", err)
	}

	client := oauth2Config.Client(oauth2.NoContext, token)
	endpointURL := "https://api.openstreetmap.org/api/0.6/node/create"

	xmlData := fmt.Sprintf(`
		<osm>
			<node changeset="%d" lat="%f" lon="%f">
				<tag k="amenity" v="%s"/>
			</node>
		</osm>`, changesetID, lat, lon, amenity)

	req, err := http.NewRequest("PUT", endpointURL, bytes.NewBufferString(xmlData))
	if err != nil {
		log.Fatalf("Failed to create request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)
	req.Header.Set("Content-Type", "text/xml")

	resp, err := client.Do(req)
	if err != nil {
		log.Fatalf("Failed to create node: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Fatalf("Failed to create node: status code %d", resp.StatusCode)
	}

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Failed to read response body: %v", err)
	}

	fmt.Printf("Node created: %s\n", string(body))

	if err := closeChangeset(token, changesetID); err != nil {
		log.Fatalf("Failed to close changeset: %v", err)
	}
}
