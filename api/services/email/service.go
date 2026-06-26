package email

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

type Service struct {
	apiKey string
	from   string
}

type resendPayload struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
}

func NewService() *Service {
	return &Service{
		apiKey: os.Getenv("RESEND_API_KEY"),
		from:   os.Getenv("EMAIL_FROM"),
	}
}

func (s *Service) Send(to, subject, body string) error {
	if s.apiKey == "" {
		return fmt.Errorf("Resend API key not configured")
	}

	payload := resendPayload{
		From:    s.from,
		To:      []string{to},
		Subject: subject,
		HTML:    body,
	}

	data, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewBuffer(data))
	if err != nil {
		return fmt.Errorf("error creating Resend request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("Resend API error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("Resend API returned status %d", resp.StatusCode)
	}

	return nil
}

func (s *Service) SendVerificationEmail(to, code string) error {
	subject := "Verifica tu correo — Suavus"
	body := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:40px 20px">
<tr><td align="center">
<table role="presentation" width="480" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
<tr><td style="background:linear-gradient(135deg,#8b5cf6,#6366f1);padding:32px 24px;text-align:center">
<h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700">Suavus</h1>
<p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px">Verificación de correo electrónico</p>
</td></tr>
<tr><td style="padding:32px 24px">
<p style="color:#1a1a2e;font-size:16px;margin:0 0 16px;line-height:1.5">Gracias por registrarte en <strong>Suavus</strong>. Usa el siguiente código para verificar tu cuenta:</p>
<div style="background:#f4f4f5;border-radius:8px;padding:20px;text-align:center;margin:0 0 20px">
<span style="font-size:32px;font-weight:700;letter-spacing:6px;color:#6366f1;font-family:monospace">%s</span>
</div>
<p style="color:#52525b;font-size:13px;margin:0 0 4px;line-height:1.4">Este código expira en <strong>1 hora</strong>.</p>
<p style="color:#52525b;font-size:13px;margin:0;line-height:1.4">Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
</td></tr>
<tr><td style="background:#fafafa;padding:16px 24px;text-align:center;border-top:1px solid #e4e4e7">
<p style="color:#a1a1aa;font-size:12px;margin:0">© 2026 Suavus. Todos los derechos reservados.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`, code)

	return s.Send(to, subject, body)
}

func (s *Service) SendPasswordRecoveryEmail(to, resetLink string) error {
	subject := "Recuperación de contraseña — Suavus"
	body := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:40px 20px">
<tr><td align="center">
<table role="presentation" width="480" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
<tr><td style="background:linear-gradient(135deg,#8b5cf6,#6366f1);padding:32px 24px;text-align:center">
<h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700">Suavus</h1>
<p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px">Recuperación de contraseña</p>
</td></tr>
<tr><td style="padding:32px 24px">
<p style="color:#1a1a2e;font-size:16px;margin:0 0 20px;line-height:1.5">Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Suavus</strong>.</p>
<div style="text-align:center;margin:0 0 20px">
<a href="%s" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#6366f1);color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600">Restablecer contraseña</a>
</div>
<p style="color:#52525b;font-size:13px;margin:0 0 4px;line-height:1.4">O copia este enlace en tu navegador:</p>
<p style="font-size:12px;word-break:break-all;color:#6366f1;margin:0 0 16px;line-height:1.4">%s</p>
<p style="color:#52525b;font-size:13px;margin:0 0 4px;line-height:1.4">Este enlace expira en <strong>1 hora</strong>.</p>
<p style="color:#52525b;font-size:13px;margin:0;line-height:1.4">Si no solicitaste este cambio, ignora este mensaje.</p>
</td></tr>
<tr><td style="background:#fafafa;padding:16px 24px;text-align:center;border-top:1px solid #e4e4e7">
<p style="color:#a1a1aa;font-size:12px;margin:0">© 2026 Suavus. Todos los derechos reservados.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`, resetLink, resetLink)

	return s.Send(to, subject, body)
}
