package main

import (
	"fmt"
	"log"
	"net/http"
	"osm-zoning/config"
	"osm-zoning/handlers"
	"osm-zoning/oauth"
)

func main() {
	cfg := config.LoadConfig()

	oauth.Init(cfg)

	fs := http.FileServer(http.Dir("static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	http.HandleFunc("/", handlers.HandleMap(cfg))
	http.HandleFunc("/data", handlers.HandleData(cfg))
	http.HandleFunc("/login", handlers.HandleLogin(cfg))
	http.HandleFunc("/callback", handlers.HandleCallback(cfg))
	http.HandleFunc("/addway", handlers.HandleAddWay(cfg))
	http.HandleFunc("/updateway", handlers.HandleUpdateWay(cfg))
	http.HandleFunc("/savechanges", handlers.HandleSaveChanges(cfg))

	fmt.Println("Server starting on :7777...")
	err := http.ListenAndServe(":7777", nil)
	if err != nil {
		log.Fatalf("Error starting server: %s", err)
	}
}
