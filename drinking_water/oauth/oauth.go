package oauth

import (
	"bytes"
	"encoding/gob"
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
	ClientID     string
	ClientSecret string
	RedirectURI  = "http://127.0.0.1:8080/callback"
	Oauth2Config *oauth2.Config
	Store        = sessions.NewCookieStore([]byte("super-secret-key"))
)

func Init() {
	// Register oauth2.Token with gob
	gob.Register(&oauth2.Token{})

	// Load environment variables from .env file
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	ClientID = os.Getenv("CLIENT_ID")
	ClientSecret = os.Getenv("CLIENT_SECRET")

	Oauth2Config = &oauth2.Config{
		ClientID:     ClientID,
		ClientSecret: ClientSecret,
		RedirectURL:  RedirectURI,
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

func CreateChangeset(token *oauth2.Token) (int, error) {
	client := Oauth2Config.Client(oauth2.NoContext, token)
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

func CloseChangeset(token *oauth2.Token, changesetID int) error {
	client := Oauth2Config.Client(oauth2.NoContext, token)
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

func CreateMapNode(token *oauth2.Token, lat, lon float64, amenity string) {
	changesetID, err := CreateChangeset(token)
	if err != nil {
		log.Fatalf("Failed to create changeset: %v", err)
	}

	client := Oauth2Config.Client(oauth2.NoContext, token)
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

	if err := CloseChangeset(token, changesetID); err != nil {
		log.Fatalf("Failed to close changeset: %v", err)
	}
}
