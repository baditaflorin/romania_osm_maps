package main

import (
	"drinking_water/config"
	"drinking_water/handlers"
	"drinking_water/oauth"
	"drinking_water/osm"
	"fmt"
	"log"
	"net/http"
)

func main() {
	// Load configuration
	cfg := config.LoadConfig()

	// Initialize OAuth with configuration
	oauth.Init(cfg)

	// Fetch water nodes on server start
	osm.FetchWaterNodes(cfg.Query)

	// Static file server
	fs := http.FileServer(http.Dir("static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	// Setting up HTTP server routes
	http.HandleFunc("/", handlers.HandleMap)
	http.HandleFunc("/data", handlers.HandleData)
	http.HandleFunc("/login", handlers.HandleLogin)
	http.HandleFunc("/callback", handlers.HandleCallback)
	http.HandleFunc("/addnode", handlers.HandleAddNode)

	fmt.Println("Server starting on :8080...")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatalf("Error starting server: %s", err)
	}
}
