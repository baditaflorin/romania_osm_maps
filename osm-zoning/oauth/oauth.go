package oauth

import (
	"encoding/gob"
	"fmt"
	"log"
	"net/http"
	"osm-zoning/config"
	"osm-zoning/osm"
	"osm-zoning/utils"

	"github.com/gorilla/sessions"
	"golang.org/x/oauth2"
)

var (
	Oauth2Config *oauth2.Config
	Store        = sessions.NewCookieStore([]byte("super-secret-key"))
)

func Init(cfg *config.Config) {
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

func createWayRequest(changesetID int, nodes []int64, tags map[string]string) (*http.Request, error) {
	var tagsXML string
	for key, value := range tags {
		tagsXML += fmt.Sprintf(`<tag k="%s" v="%s"/>`, key, value)
	}

	var nodesXML string
	for _, node := range nodes {
		nodesXML += fmt.Sprintf(`<nd ref="%d"/>`, node)
	}

	xmlData := fmt.Sprintf(`
        <osm>
            <way changeset="%d">
                %s
                %s
            </way>
        </osm>`, changesetID, nodesXML, tagsXML)

	return utils.CreateRequest("PUT", "https://api.openstreetmap.org/api/0.6/way/create", "text/xml", []byte(xmlData))
}

func updateWayRequest(changesetID int, wayID int64, tags map[string]string) (*http.Request, error) {
	var tagsXML string
	for key, value := range tags {
		tagsXML += fmt.Sprintf(`<tag k="%s" v="%s"/>`, key, value)
	}

	xmlData := fmt.Sprintf(`
        <osm>
            <way id="%d" changeset="%d">
                %s
            </way>
        </osm>`, wayID, changesetID, tagsXML)

	return utils.CreateRequest("PUT", fmt.Sprintf("https://api.openstreetmap.org/api/0.6/way/%d", wayID), "text/xml", []byte(xmlData))
}

func UpdateWayTags(cfg *config.Config, token *oauth2.Token, wayID int64, tags map[string]string) {
	changesetID, err := CreateChangeset(cfg, token)
	if err != nil {
		log.Fatalf("Failed to create changeset: %v", err)
	}

	client := Oauth2Config.Client(oauth2.NoContext, token)
	req, err := updateWayRequest(changesetID, wayID, tags)
	if err != nil {
		log.Fatalf("Failed to create request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	_, err = utils.DoRequest(client, req)
	if err != nil {
		log.Fatalf("Failed to update way: %v", err)
	}

	fmt.Printf("Way updated successfully\n")

	if err := CloseChangeset(token, changesetID); err != nil {
		log.Fatalf("Failed to close changeset: %v", err)
	}
}

func createWayUpdateRequest(changesetID int, wayID int64, tags map[string]string) (*http.Request, error) {
	var tagsXML string
	for key, value := range tags {
		tagsXML += fmt.Sprintf(`<tag k="%s" v="%s"/>`, key, value)
	}

	xmlData := fmt.Sprintf(`
        <osm>
            <way id="%d" changeset="%d">
                %s
            </way>
        </osm>`, wayID, changesetID, tagsXML)

	return utils.CreateRequest("PUT", fmt.Sprintf("https://api.openstreetmap.org/api/0.6/way/%d", wayID), "text/xml", []byte(xmlData))
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

func CreateChangeset(cfg *config.Config, token *oauth2.Token) (int, error) {
	client := Oauth2Config.Client(oauth2.NoContext, token)
	req, err := createChangesetRequest(cfg, token)
	if err != nil {
		return 0, err
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	body, err := utils.DoRequest(client, req)
	if err != nil {
		return 0, err
	}

	var changesetID int
	fmt.Sscanf(string(body), "%d", &changesetID)

	return changesetID, nil
}

func CloseChangeset(token *oauth2.Token, changesetID int) error {
	client := Oauth2Config.Client(oauth2.NoContext, token)
	endpointURL := fmt.Sprintf("https://api.openstreetmap.org/api/0.6/changeset/%d/close", changesetID)

	req, err := utils.CreateRequest("PUT", endpointURL, "text/xml", nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	_, err = utils.DoRequest(client, req)
	return err
}

func CreateMapWay(cfg *config.Config, token *oauth2.Token, nodes []int64, tags map[string]string) {
	changesetID, err := CreateChangeset(cfg, token)
	if err != nil {
		log.Fatalf("Failed to create changeset: %v", err)
	}

	client := Oauth2Config.Client(oauth2.NoContext, token)
	req, err := createWayRequest(changesetID, nodes, tags)
	if err != nil {
		log.Fatalf("Failed to create request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	_, err = utils.DoRequest(client, req)
	if err != nil {
		log.Fatalf("Failed to create way: %v", err)
	}

	fmt.Printf("Way created successfully\n")

	if err := CloseChangeset(token, changesetID); err != nil {
		log.Fatalf("Failed to close changeset: %v", err)
	}
}

func SaveChanges(cfg *config.Config, token *oauth2.Token) {
	changesetID, err := CreateChangeset(cfg, token)
	if err != nil {
		log.Fatalf("Failed to create changeset: %v", err)
	}

	client := Oauth2Config.Client(oauth2.NoContext, token)
	pendingChanges := osm.GetPendingChanges()

	for wayID, tags := range pendingChanges {
		req, err := createWayUpdateRequest(changesetID, wayID, tags)
		if err != nil {
			log.Fatalf("Failed to create request: %v", err)
		}
		req.Header.Set("Authorization", "Bearer "+token.AccessToken)

		_, err = utils.DoRequest(client, req)
		if err != nil {
			log.Fatalf("Failed to update way: %v", err)
		}

		fmt.Printf("Way %d updated successfully\n", wayID)
	}

	if err := CloseChangeset(token, changesetID); err != nil {
		log.Fatalf("Failed to close changeset: %v", err)
	}

	osm.ClearPendingChanges()
}
