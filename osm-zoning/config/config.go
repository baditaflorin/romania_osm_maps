package config

import (
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
}

func LoadConfig() *Config {
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	return &Config{
		ClientID:         os.Getenv("CLIENT_ID"),
		ClientSecret:     os.Getenv("CLIENT_SECRET"),
		RedirectURI:      os.Getenv("REDIRECT_URI"),
		AuthURL:          os.Getenv("AUTH_URL"),
		TokenURL:         os.Getenv("TOKEN_URL"),
		Query:            os.Getenv("QUERY"),
		ChangesetComment: os.Getenv("CHANGESET_COMMENT"),
		CreatedBy:        os.Getenv("CREATED_BY"),
	}
}
