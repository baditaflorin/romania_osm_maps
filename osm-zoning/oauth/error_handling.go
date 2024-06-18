package oauth

import (
	"fmt"
	"golang.org/x/oauth2"
	"net/http"
	"osm-zoning/config"
	"osm-zoning/utils"
	"strings"
)

// HandleClosedChangesetError handles the 409 error, closes the current changeset and retries the request with a new changeset.
func HandleClosedChangesetError(cfg *config.Config, token *oauth2.Token, req *http.Request, retryFunc func(int) (*http.Request, error)) error {
	client := Oauth2Config.Client(oauth2.NoContext, token)

	_, err := utils.DoRequest(client, req)
	if err != nil {
		if isChangesetClosedError(err) {
			// Close current changeset
			if closeErr := CloseCurrentChangeset(token); closeErr != nil {
				return fmt.Errorf("failed to close changeset: %v", closeErr)
			}

			// Create new changeset
			newChangesetID, createErr := CreateChangeset(cfg, token)
			if createErr != nil {
				return fmt.Errorf("failed to create new changeset: %v", createErr)
			}

			// Retry the request with the new changeset
			newReq, retryErr := retryFunc(newChangesetID)
			if retryErr != nil {
				return fmt.Errorf("failed to create new request: %v", retryErr)
			}

			_, err = utils.DoRequest(client, newReq)
			if err != nil {
				return fmt.Errorf("failed to retry request: %v", err)
			}
		} else {
			return fmt.Errorf("request failed: %v", err)
		}
	}

	return nil
}

func isChangesetClosedError(err error) bool {
	return strings.Contains(err.Error(), "status code 409") && strings.Contains(err.Error(), "The changeset")
}
