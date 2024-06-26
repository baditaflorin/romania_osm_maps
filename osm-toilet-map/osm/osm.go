package osm

import (
	"encoding/json"
	"fmt"
	"golang.org/x/oauth2"
	"io/ioutil"
	"log"
	"net/http"
	"toilet_map/config"
	"toilet_map/utils"
)

type Data struct {
	Elements []Node `json:"elements"`
}

type Node struct {
	Type    string            `json:"type"`
	ID      int64             `json:"id"`
	Lat     float64           `json:"lat"`
	Lon     float64           `json:"lon"`
	Tags    map[string]string `json:"tags"`
	Version int               `json:"version"`
}

var Nodes Data

func FetchNodeDetails(cfg *config.Config, nodeID int64) (*Node, error) {
	url := fmt.Sprintf("https://api.openstreetmap.org/api/0.6/node/%d.json", nodeID)
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("error fetching node details: %v", err)
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %v", err)
	}

	var data struct {
		Elements []Node `json:"elements"`
	}
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, fmt.Errorf("error unmarshalling response: %v", err)
	}
	if len(data.Elements) == 0 {
		return nil, fmt.Errorf("no node found with ID %d", nodeID)
	}

	return &data.Elements[0], nil
}

func UpdateNodeDetails(cfg *config.Config, token *oauth2.Token, nodeID int64, updatedTags map[string]string, changesetID int) error {
	client := oauth2.NewClient(oauth2.NoContext, oauth2.StaticTokenSource(token))

	node, err := FetchNodeDetails(cfg, nodeID)
	if err != nil {
		return fmt.Errorf("failed to fetch node details: %v", err)
	}

	var tagsXML string
	for key, value := range updatedTags {
		tagsXML += fmt.Sprintf(`<tag k="%s" v="%s"/>`, key, value)
	}

	xmlData := fmt.Sprintf(`
        <osm>
            <node id="%d" changeset="%d" lat="%f" lon="%f" version="%d">
                %s
            </node>
        </osm>`, nodeID, changesetID, node.Lat, node.Lon, node.Version, tagsXML)

	log.Printf("Updating node %d with XML data: %s", nodeID, xmlData)

	req, err := utils.CreateRequest("PUT", fmt.Sprintf("https://api.openstreetmap.org/api/0.6/node/%d", nodeID), "text/xml", []byte(xmlData))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to update node: %v", err)
	}
	defer resp.Body.Close()

	log.Printf("Node %d updated successfully\n", nodeID)
	return nil
}
