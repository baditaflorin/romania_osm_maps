package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"golang.org/x/oauth2"
)

var (
	clientID     string
	clientSecret string
	redirectURI  = "http://127.0.0.1:8080/callback"
	oauth2Config *oauth2.Config
)

func init() {
	// Load environment variables from .env file
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file")
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
	http.HandleFunc("/", handleMain)
	http.HandleFunc("/login", handleLogin)
	http.HandleFunc("/callback", handleCallback)
	fmt.Println("Started running on http://127.0.0.1:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleMain(w http.ResponseWriter, r *http.Request) {
	var htmlIndex = `<html>
	<body>
	<a href="/login">Log in with OpenStreetMap</a>
	</body>
	</html>`

	fmt.Fprintf(w, htmlIndex)
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

	makeAuthenticatedRequest(token)

	fmt.Fprintf(w, "Access Token: %v\n", token.AccessToken)
}

func makeAuthenticatedRequest(token *oauth2.Token) {
	client := oauth2Config.Client(oauth2.NoContext, token)

	// Example: Making a request to get user details
	resp, err := client.Get("https://api.openstreetmap.org/api/0.6/user/details.json")
	if err != nil {
		log.Fatalf("Failed to get user details: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Fatalf("Failed to get user details: status code %d", resp.StatusCode)
	}

	var userInfo map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		log.Fatalf("Failed to decode user details: %v", err)
	}

	fmt.Printf("User Info: %v\n", userInfo)

	// Example usage: create a note
	createMapNote(token, 44.442813587452, 26.153984068774, "This is a test note")
}

func createMapNote(token *oauth2.Token, lat, lon float64, text string) {
	client := oauth2Config.Client(oauth2.NoContext, token)
	endpointURL := "https://api.openstreetmap.org/api/0.6/notes.json"

	data := url.Values{}
	data.Set("lat", fmt.Sprintf("%f", lat))
	data.Set("lon", fmt.Sprintf("%f", lon))
	data.Set("text", text)

	req, err := http.NewRequest("POST", endpointURL, strings.NewReader(data.Encode()))
	if err != nil {
		log.Fatalf("Failed to create request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := client.Do(req)
	if err != nil {
		log.Fatalf("Failed to create note: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Fatalf("Failed to create note: status code %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		log.Fatalf("Failed to decode response: %v", err)
	}

	fmt.Printf("Note created: %v\n", result)
}
