package oauth

import (
	"encoding/gob"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"strings"
	"toilet_map/config"
	"toilet_map/utils"

	"github.com/gorilla/sessions"
	"golang.org/x/oauth2"
)

var (
	Oauth2Config *oauth2.Config
	Store        = sessions.NewCookieStore([]byte("super-secret-key"))
	ChangesetID  int // Global variable to store the current changeset ID
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

	ChangesetID = 0 // Initialize changeset ID
}

func CreateChangesetIfNeeded(cfg *config.Config, token *oauth2.Token) (int, error) {
	if ChangesetID != 0 {
		// Check if the changeset is still open
		log.Printf("Checking if existing changeset %d is still open", ChangesetID)
		isOpen, err := IsChangesetOpen(token, ChangesetID)
		if err != nil {
			log.Printf("Error checking if changeset %d is open: %v", ChangesetID, err)
			return 0, err
		}
		if isOpen {
			log.Printf("Reusing open changeset %d", ChangesetID)
			return ChangesetID, nil
		}
		// If not open, close it
		log.Printf("Closing changeset %d because it is no longer open", ChangesetID)
		err = CloseChangeset(token, ChangesetID)
		if err != nil {
			log.Printf("Error closing changeset %d: %v", ChangesetID, err)
			return 0, err
		}
	}

	// Create a new changeset
	client := Oauth2Config.Client(oauth2.NoContext, token)
	req, err := createChangesetRequest(cfg, token)
	if err != nil {
		log.Printf("Failed to create changeset request: %v", err)
		return 0, err
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	log.Println("Sending changeset creation request")
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error creating changeset: %v", err)
		return 0, err
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading changeset response body: %v", err)
		return 0, err
	}

	log.Printf("Changeset creation response body: %s", string(body))

	var changesetID int
	fmt.Sscanf(string(body), "%d", &changesetID)
	log.Printf("Created changeset with ID: %d", changesetID)

	ChangesetID = changesetID // Update the global changeset ID
	return changesetID, nil
}

func IsChangesetOpen(token *oauth2.Token, changesetID int) (bool, error) {
	client := Oauth2Config.Client(oauth2.NoContext, token)
	url := fmt.Sprintf("https://api.openstreetmap.org/api/0.6/changeset/%d", changesetID)
	req, err := utils.CreateRequest("GET", url, "application/json", nil)
	if err != nil {
		log.Printf("Failed to create request to check if changeset %d is open: %v", changesetID, err)
		return false, fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	log.Printf("Checking if changeset %d is open", changesetID)
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Failed to fetch changeset status for changeset %d: %v", changesetID, err)
		return false, fmt.Errorf("failed to fetch changeset status: %v", err)
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Failed to read response body for changeset %d: %v", changesetID, err)
		return false, fmt.Errorf("failed to read response body: %v", err)
	}

	log.Printf("Response body for changeset %d: %s", changesetID, string(body))

	// Check if the response body contains `open="true"`
	if strings.Contains(string(body), `open="true"`) {
		log.Printf("Changeset %d is open", changesetID)
		return true, nil
	}
	log.Printf("Changeset %d is closed", changesetID)
	return false, nil
}

func createChangesetRequest(cfg *config.Config, token *oauth2.Token) (*http.Request, error) {
	xmlData := fmt.Sprintf(`
        <osm>
            <changeset>
                <tag k="created_by" v="%s"/>
                <tag k="comment" v="%s"/>
            </changeset>
        </osm>`, cfg.CreatedBy, cfg.ChangesetComment)

	return utils.CreateRequest("PUT", "https://api.openstreetmap.org/api/0.6/changeset/create", "text/xml", []byte(xmlData))
}

func createNodeRequest(changesetID int, lat, lon float64, tags map[string]string) (*http.Request, error) {
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

	return utils.CreateRequest("PUT", "https://api.openstreetmap.org/api/0.6/node/create", "text/xml", []byte(xmlData))
}

func CreateChangeset(cfg *config.Config, token *oauth2.Token) (int, error) {
	client := Oauth2Config.Client(oauth2.NoContext, token)
	req, err := createChangesetRequest(cfg, token)
	if err != nil {
		log.Printf("Failed to create changeset request: %v", err)
		return 0, err
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	log.Println("Sending changeset creation request")
	resp, err := utils.DoRequest(client, req)
	if err != nil {
		log.Printf("Error creating changeset: %v", err)
		return 0, err
	}

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading changeset response body: %v", err)
		return 0, err
	}

	var changesetID int
	fmt.Sscanf(string(body), "%d", &changesetID)
	log.Printf("Created changeset with ID: %d", changesetID)

	return changesetID, nil
}

func CloseChangeset(token *oauth2.Token, changesetID int) error {
	client := Oauth2Config.Client(oauth2.NoContext, token)
	endpointURL := fmt.Sprintf("https://api.openstreetmap.org/api/0.6/changeset/%d/close", changesetID)

	req, err := utils.CreateRequest("PUT", endpointURL, "text/xml", nil)
	if err != nil {
		log.Printf("Failed to create close changeset request: %v", err)
		return fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	log.Printf("Sending close changeset request for changeset ID: %d", changesetID)
	_, err = client.Do(req)
	if err != nil {
		log.Printf("Error closing changeset: %v", err)
	} else {
		log.Printf("Successfully closed changeset ID: %d", changesetID)
	}
	return err
}

func CreateMapNode(cfg *config.Config, token *oauth2.Token, lat, lon float64, tags map[string]string) error {
	changesetID, err := CreateChangesetIfNeeded(cfg, token)
	if err != nil {
		return fmt.Errorf("failed to create changeset: %v", err)
	}

	client := Oauth2Config.Client(oauth2.NoContext, token)
	req, err := createNodeRequest(changesetID, lat, lon, tags)
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	_, err = utils.DoRequest(client, req)
	if err != nil {
		return fmt.Errorf("failed to create node: %v", err)
	}

	log.Printf("Node created successfully\n")
	return nil
}
