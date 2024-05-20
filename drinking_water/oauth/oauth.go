package oauth

import (
	"bytes"
	"drinking_water/config"
	"drinking_water/constants"
	"encoding/gob"
	"fmt"
	"github.com/gorilla/sessions"
	"golang.org/x/oauth2"
	"io/ioutil"
	"log"
	"net/http"
)

var (
	Oauth2Config *oauth2.Config
	Store        = sessions.NewCookieStore([]byte("super-secret-key"))
)

func Init(cfg *config.Config) {
	// Register oauth2.Token with gob
	gob.Register(&oauth2.Token{})

	Oauth2Config = &oauth2.Config{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		RedirectURL:  cfg.RedirectURI,
		Scopes: []string{
			"read_prefs",
			"write_prefs",
			"write_api",
		},
		Endpoint: oauth2.Endpoint{
			AuthURL:  cfg.AuthURL,
			TokenURL: cfg.TokenURL,
		},
	}
}

func CreateChangeset(token *oauth2.Token) (int, error) {
	client := Oauth2Config.Client(oauth2.NoContext, token)
	endpointURL := "https://api.openstreetmap.org/api/0.6/changeset/create"

	xmlData := fmt.Sprintf(`
		<osm>
			<changeset>
				<tag k="created_by" v="%s"/>
				<tag k="comment" v="%s"/>
			</changeset>
		</osm>`, constants.CreatedBy, constants.ChangesetComment)

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

func CreateMapNode(token *oauth2.Token, lat, lon float64, tags map[string]string) {
	// Create a changeset
	changesetID, err := CreateChangeset(token)
	if err != nil {
		log.Fatalf("Failed to create changeset: %v", err)
	}

	client := Oauth2Config.Client(oauth2.NoContext, token)
	endpointURL := "https://api.openstreetmap.org/api/0.6/node/create"

	// Build the XML data with dynamic tags
	var tagsXML string
	for key, value := range tags {
		tagsXML += fmt.Sprintf(`<tag k="%s" v="%s"/>`, key, value)
	}

	xmlData := fmt.Sprintf(`
		<osm>
			<node changeset="%d" lat="%f" lon="%f">
				%s
			</node>
		</osm>`, changesetID, lat, lon, tagsXML)

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

	// Close the changeset
	if err := CloseChangeset(token, changesetID); err != nil {
		log.Fatalf("Failed to close changeset: %v", err)
	}
}
