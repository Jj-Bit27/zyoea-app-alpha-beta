package cloudinary

import (
	"context"
	"fmt"
	"net/url"
	"strconv"
	"time"

	"api/graph/model"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api"
)

type Service struct {
	CloudName string
	APIKey    string
	APISecret string
}

func NewService(cloudinaryURL string) (*Service, error) {
	if cloudinaryURL == "" {
		return nil, fmt.Errorf("CLOUDINARY_URL is empty")
	}
	cld, err := cloudinary.NewFromURL(cloudinaryURL)
	if err != nil {
		return nil, err
	}

	return &Service{
		CloudName: cld.Config.Cloud.CloudName,
		APIKey:    cld.Config.Cloud.APIKey,
		APISecret: cld.Config.Cloud.APISecret,
	}, nil
}

func NewServiceFromParts(cloudName, apiKey, apiSecret string) *Service {
	return &Service{
		CloudName: cloudName,
		APIKey:    apiKey,
		APISecret: apiSecret,
	}
}

func (s *Service) GenerateSignature(ctx context.Context, publicID string, timestamp int) (*model.CloudinarySignature, error) {
	if timestamp == 0 {
		timestamp = int(time.Now().Unix())
	}

	// 1. Inicializamos url.Values en lugar de un mapa genérico
	params := url.Values{}
	params.Add("public_id", publicID)

	// 2. Convertimos el timestamp (int) a string con strconv
	params.Add("timestamp", strconv.Itoa(timestamp))

	// 3. Ahora sí, el compilador aceptará params sin problemas
	signature, err := api.SignParameters(params, s.APISecret)
	if err != nil {
		return nil, err
	}

	return &model.CloudinarySignature{
		Signature: signature,
		Timestamp: timestamp,
		APIKey:    s.APIKey,
		CloudName: s.CloudName,
		PublicID:  publicID,
	}, nil
}
