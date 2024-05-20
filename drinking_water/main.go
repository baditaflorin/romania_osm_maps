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
	cfg := config.LoadConfig()

	// Initialize OAuth and Cookie Store
	oauth.Init(cfg)

	// Fetch nodes on server start
	osm.FetchNodes(cfg)

	// Static file server
	fs := http.FileServer(http.Dir("static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	// Setting up HTTP server routes with injected config
	http.HandleFunc("/", handlers.HandleMap(cfg))
	http.HandleFunc("/data", handlers.HandleData(cfg))
	http.HandleFunc("/login", handlers.HandleLogin(cfg))
	http.HandleFunc("/callback", handlers.HandleCallback(cfg))
	http.HandleFunc("/addnode", handlers.HandleAddNode(cfg))

	fmt.Println("Server starting on :8080...")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatalf("Error starting server: %s", err)
	}
}
