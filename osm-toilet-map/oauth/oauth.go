// oauth/oauth.go
package oauth

import (
	"encoding/gob"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"toilet_map/config"
	"toilet_map/utils"

	"github.com/gorilla/sessions"
	"golang.org/x/oauth2"
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
	_, err = utils.DoRequest(client, req)
	if err != nil {
		log.Printf("Error closing changeset: %v", err)
	} else {
		log.Printf("Successfully closed changeset ID: %d", changesetID)
	}
	return err
}

func CreateMapNode(cfg *config.Config, token *oauth2.Token, lat, lon float64, tags map[string]string) {
	changesetID, err := CreateChangeset(cfg, token)
	if err != nil {
		log.Fatalf("Failed to create changeset: %v", err)
	}

	client := Oauth2Config.Client(oauth2.NoContext, token)
	req, err := createNodeRequest(changesetID, lat, lon, tags)
	if err != nil {
		log.Fatalf("Failed to create request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	_, err = utils.DoRequest(client, req)
	if err != nil {
		log.Fatalf("Failed to create node: %v", err)
	}

	fmt.Printf("Node created successfully\n")

	if err := CloseChangeset(token, changesetID); err != nil {
		log.Fatalf("Failed to close changeset: %v", err)
	}
}
