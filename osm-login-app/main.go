package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"

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

	// Example usage: create a node with amenity=drinking_water
	createMapNode(token, 44.442813587452, 26.153984068774, "drinking_water")
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
