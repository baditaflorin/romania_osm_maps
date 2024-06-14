package oauth

import (
	"encoding/gob"
	"encoding/xml"
	"fmt"
	"io/ioutil"
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
	log.Printf("Creating way request for changeset %d with nodes %v and tags %v", changesetID, nodes, tags)
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

func updateWayRequest(changesetID int, wayID int64, version int, tags map[string]string) (*http.Request, error) {
	log.Printf("Creating update request for way %d in changeset %d with version %d and tags %v", wayID, changesetID, version, tags)
	var tagsXML string
	for key, value := range tags {
		tagsXML += fmt.Sprintf(`<tag k="%s" v="%s"/>`, key, value)
	}

	xmlData := fmt.Sprintf(`
        <osm>
            <way id="%d" changeset="%d" version="%d">
                %s
            </way>
        </osm>`, wayID, changesetID, version, tagsXML)

	log.Printf("XmlData:\n %v", xmlData)

	return utils.CreateRequest("PUT", fmt.Sprintf("https://api.openstreetmap.org/api/0.6/way/%d", wayID), "text/xml", []byte(xmlData))
}

func getWayVersion(wayID int64, token *oauth2.Token) (int, error) {
	client := Oauth2Config.Client(oauth2.NoContext, token)
	url := fmt.Sprintf("https://api.openstreetmap.org/api/0.6/way/%d", wayID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return 0, fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	resp, err := client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		return 0, fmt.Errorf("failed to get way version: status code %d and Body:%s", resp.StatusCode, string(body))
	}

	type OSM struct {
		Way struct {
			Version int `xml:"version,attr"`
		} `xml:"way"`
	}

	var osmData OSM
	if err := xml.NewDecoder(resp.Body).Decode(&osmData); err != nil {
		return 0, fmt.Errorf("failed to parse response: %v", err)
	}

	return osmData.Way.Version, nil
}

func UpdateWayTags(cfg *config.Config, token *oauth2.Token, wayID int64, tags map[string]string) {
	log.Printf("Updating way tags for way %d with tags %v", wayID, tags)

	version, err := getWayVersion(wayID, token)
	if err != nil {
		log.Fatalf("Failed to get way version: %v", err)
	}

	changesetID, err := CreateChangeset(cfg, token)
	if err != nil {
		log.Fatalf("Failed to create changeset: %v", err)
	}

	client := Oauth2Config.Client(oauth2.NoContext, token)
	req, err := updateWayRequest(changesetID, wayID, version, tags)
	if err != nil {
		log.Fatalf("Failed to create request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	log.Printf("Sending update request to URL %s with method %s", req.URL.String(), req.Method)
	_, err = utils.DoRequest(client, req)
	if err != nil {
		log.Fatalf("Failed to update way: %v", err)
	}

	log.Printf("Way %d updated successfully", wayID)

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
	log.Printf("Creating way tags for way %d with tags %v", wayID, tags)
	log.Printf("XmlData:\n %v", xmlData)

	return utils.CreateRequest("PUT", fmt.Sprintf("https://api.openstreetmap.org/api/0.6/way/%d", wayID), "text/xml", []byte(xmlData))
}

func createChangesetRequest(cfg *config.Config, token *oauth2.Token) (*http.Request, error) {
	log.Printf("Creating changeset request with comment: %s", cfg.ChangesetComment)
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
		return 0, fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	body, err := utils.DoRequest(client, req)
	if err != nil {
		return 0, fmt.Errorf("failed to execute request: %v", err)
	}

	var changesetID int
	fmt.Sscanf(string(body), "%d", &changesetID)

	log.Printf("Created changeset with ID %d", changesetID)
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
	if err != nil {
		return fmt.Errorf("failed to execute request: %v", err)
	}

	log.Printf("Closed changeset with ID %d", changesetID)
	return nil
}

func CreateMapWay(cfg *config.Config, token *oauth2.Token, nodes []int64, tags map[string]string) {
	log.Printf("Creating map way with nodes %v and tags %v", nodes, tags)
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

	log.Printf("Sending create request to URL %s with method %s", req.URL.String(), req.Method)
	_, err = utils.DoRequest(client, req)
	if err != nil {
		log.Fatalf("Failed to create way: %v", err)
	}

	log.Printf("Way created successfully")

	if err := CloseChangeset(token, changesetID); err != nil {
		log.Fatalf("Failed to close changeset: %v", err)
	}
}

func SaveChanges(cfg *config.Config, token *oauth2.Token) {
	log.Println("Saving all pending changes")
	changesetID, err := CreateChangeset(cfg, token)
	if err != nil {
		log.Fatalf("Failed to create changeset: %v", err)
	}

	client := Oauth2Config.Client(oauth2.NoContext, token)
	pendingChanges := osm.GetPendingChanges()

	for wayID, tags := range pendingChanges {
		log.Printf("Saving changes for way %d with tags %v", wayID, tags)
		req, err := createWayUpdateRequest(changesetID, wayID, tags)
		if err != nil {
			log.Fatalf("Failed to create request: %v", err)
		}
		req.Header.Set("Authorization", "Bearer "+token.AccessToken)

		log.Printf("Sending update request to URL %s with method %s", req.URL.String(), req.Method)
		_, err = utils.DoRequest(client, req)
		if err != nil {
			log.Fatalf("Failed to update way: %v", err)
		}

		log.Printf("Way %d updated successfully", wayID)
	}

	if err := CloseChangeset(token, changesetID); err != nil {
		log.Fatalf("Failed to close changeset: %v", err)
	}

	osm.ClearPendingChanges()
	log.Println("All changes saved successfully")
}
