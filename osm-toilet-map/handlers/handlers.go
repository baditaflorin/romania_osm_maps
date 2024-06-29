package handlers

import (
	"encoding/json"
	"fmt"
	"github.com/gorilla/mux"
	"io/ioutil"
	"log"
	"net/http"
	"strconv"
	"strings"
	"toilet_map/config"
	"toilet_map/oauth"
	"toilet_map/osm"

	"golang.org/x/oauth2"
)

func HandleFetchNode(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		nodeIDStr, ok := vars["id"]
		if !ok {
			http.Error(w, "Node ID is required", http.StatusBadRequest)
			return
		}
		nodeID, err := strconv.ParseInt(nodeIDStr, 10, 64)
		if err != nil {
			http.Error(w, "Invalid Node ID", http.StatusBadRequest)
			return
		}

		node, err := osm.FetchNodeDetails(cfg, nodeID)
		if err != nil {
			http.Error(w, "Failed to fetch node details: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(node)
	}
}

func HandleUpdateNode(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		nodeIDStr := r.URL.Path[len("/updateNode/"):]
		log.Printf("Received request to update node with ID: %s", nodeIDStr)
		nodeID, err := strconv.ParseInt(nodeIDStr, 10, 64)
		if err != nil {
			log.Printf("Error parsing node ID: %v", err)
			http.Error(w, "Invalid Node ID", http.StatusBadRequest)
			return
		}

		var updatedTags map[string]string
		if err := json.NewDecoder(r.Body).Decode(&updatedTags); err != nil {
			log.Printf("Error parsing request body: %v", err)
			http.Error(w, "Failed to parse request body: "+err.Error(), http.StatusBadRequest)
			return
		}

		log.Printf("Updating node %d with tags: %v", nodeID, updatedTags)

		session, _ := oauth.Store.Get(r, "session-name")
		token, ok := session.Values["oauth-token"].(*oauth2.Token)
		if !ok {
			log.Println("OAuth token not found in session")
			http.Error(w, "You are not authenticated. Please log in to update a node.", http.StatusUnauthorized)
			return
		}

		// Use the CreateChangesetIfNeeded function
		changesetID, err := oauth.CreateChangesetIfNeeded(cfg, token)
		if err != nil {
			log.Printf("Error creating changeset: %v", err)
			http.Error(w, "Failed to create changeset: "+err.Error(), http.StatusInternalServerError)
			return
		}

		err = osm.UpdateNodeDetails(cfg, token, nodeID, updatedTags, changesetID)
		if err != nil {
			log.Printf("Error updating node details: %v", err)
			http.Error(w, "Failed to update node details: "+err.Error(), http.StatusInternalServerError)
			return
		}

		fmt.Fprintf(w, "Node updated successfully")
		log.Printf("Node %d updated successfully", nodeID)
	}
}

func fetchNodesByQuery(cfg *config.Config, query string, bbox string) (*osm.Data, error) {
	url := "https://overpass-api.de/api/interpreter"
	query = strings.Replace(query, "{{bbox}}", bbox, 1)

	resp, err := http.Post(url, "text/plain", strings.NewReader(query))
	if err != nil {
		return nil, fmt.Errorf("error fetching data from Overpass API: %s", err)
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response from Overpass API: %s", err)
	}

	var data osm.Data
	err = json.Unmarshal(body, &data)
	if err != nil {
		return nil, fmt.Errorf("error parsing JSON: %s", err)
	}

	return &data, nil
}

func HandleData(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		bbox := r.URL.Query().Get("bbox")
		if bbox == "" {
			http.Error(w, "Bounding box is required", http.StatusBadRequest)
			return
		}

		toilets, err := fetchNodesByQuery(cfg, cfg.QueryToilets, bbox)
		if err != nil {
			http.Error(w, "Failed to fetch toilets: "+err.Error(), http.StatusInternalServerError)
			return
		}
		toiletsPois, err := fetchNodesByQuery(cfg, cfg.QueryToiletsPois, bbox)
		if err != nil {
			http.Error(w, "Failed to fetch toilets: "+err.Error(), http.StatusInternalServerError)
			return
		}
		gasStations, err := fetchNodesByQuery(cfg, cfg.QueryGasStations, bbox)
		if err != nil {
			http.Error(w, "Failed to fetch gas stations: "+err.Error(), http.StatusInternalServerError)
			return
		}
		restaurants, err := fetchNodesByQuery(cfg, cfg.QueryRestaurants, bbox)
		if err != nil {
			http.Error(w, "Failed to fetch restaurants: "+err.Error(), http.StatusInternalServerError)
			return
		}
		tourismPois, err := fetchNodesByQuery(cfg, cfg.QueryTourismPois, bbox)
		if err != nil {
			http.Error(w, "Failed to fetch restaurants: "+err.Error(), http.StatusInternalServerError)
			return
		}
		shopPois, err := fetchNodesByQuery(cfg, cfg.QueryShopPois, bbox)
		if err != nil {
			http.Error(w, "Failed to fetch restaurants: "+err.Error(), http.StatusInternalServerError)
			return
		}

		responseData := map[string]interface{}{
			"toiletsPois": toiletsPois.Elements,
			"toilets":     toilets.Elements,
			"gasStations": gasStations.Elements,
			"restaurants": restaurants.Elements,
			"tourismPois": tourismPois.Elements,
			"shopPois":    shopPois.Elements,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(responseData)
	}
}

func HandleMap(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "static/map.html")
	}
}

func HandleLogin(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		url := oauth.Oauth2Config.AuthCodeURL("state", oauth2.AccessTypeOffline)
		http.Redirect(w, r, url, http.StatusTemporaryRedirect)
	}
}

func HandleCallback(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		token, err := oauth.Oauth2Config.Exchange(oauth2.NoContext, code)
		if err != nil {
			http.Error(w, "Failed to exchange token: "+err.Error(), http.StatusInternalServerError)
			return
		}

		session, _ := oauth.Store.Get(r, "session-name")
		session.Values["oauth-token"] = token
		if err := session.Save(r, w); err != nil {
			http.Error(w, "Failed to save session: "+err.Error(), http.StatusInternalServerError)
			return
		}

		http.Redirect(w, r, "/", http.StatusSeeOther)
	}
}

func HandleAddNode(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
			return
		}

		// Parse the incoming request to get node details
		var node struct {
			Lat  float64           `json:"lat"`
			Lon  float64           `json:"lon"`
			Tags map[string]string `json:"tags"`
		}
		if err := json.NewDecoder(r.Body).Decode(&node); err != nil {
			http.Error(w, "Failed to parse request body: "+err.Error(), http.StatusBadRequest)
			return
		}

		// Retrieve the OAuth token from the session
		session, _ := oauth.Store.Get(r, "session-name")
		token, ok := session.Values["oauth-token"].(*oauth2.Token)
		if !ok {
			http.Error(w, "You are not authenticated. Please log in to add a new source.", http.StatusUnauthorized)
			log.Println("No OAuth token found in session")
			return
		}
		log.Printf("Retrieved OAuth token from session: %v", token)

		// Create the map node using the OAuth token
		err := oauth.CreateMapNode(cfg, token, node.Lat, node.Lon, node.Tags)
		if err != nil {
			http.Error(w, "Failed to create node: "+err.Error(), http.StatusInternalServerError)
			return
		}

		fmt.Fprintf(w, "Node created successfully")
	}
}
