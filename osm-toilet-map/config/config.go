// config/config.go
package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	ClientID         string
	ClientSecret     string
	RedirectURI      string
	AuthURL          string
	TokenURL         string
	Query            string
	ChangesetComment string
	CreatedBy        string
	Port             string
}

func LoadConfig() *Config {
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	redirectURIBase := os.Getenv("REDIRECT_URI_BASE")
	redirectURICallback := os.Getenv("REDIRECT_URI_CALLBACK")
	redirectURI := fmt.Sprintf("%s:%s%s", redirectURIBase, port, redirectURICallback)

	return &Config{
		ClientID:         os.Getenv("CLIENT_ID"),
		ClientSecret:     os.Getenv("CLIENT_SECRET"),
		RedirectURI:      redirectURI,
		AuthURL:          os.Getenv("AUTH_URL"),
		TokenURL:         os.Getenv("TOKEN_URL"),
		Query:            os.Getenv("QUERY"),
		ChangesetComment: os.Getenv("CHANGESET_COMMENT"),
		CreatedBy:        os.Getenv("CREATED_BY"),
		Port:             port,
	}
}
