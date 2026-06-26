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

func (s *Service) renderTemplate(title, bodyContent string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <meta name="color-scheme" content="light">
  <title>%s</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;color:#1c1917">
  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f4;padding:32px 16px">
    <tr>
      <td align="center">
        <!-- Logo -->
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:24px">
          <tr>
            <td align="center">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:8px">
                    <span style="font-size:28px;font-weight:800;color:#c2410c;letter-spacing:-0.5px">Suavus</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Main Card -->
        <table role="presentation" width="480" cellspacing="0" cellpadding="0" style="max-width:480px;width:100%%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06),0 1px 3px rgba(0,0,0,0.04)">
          <!-- Header Bar -->
          <tr>
            <td style="background:linear-gradient(135deg,#c2410c 0%%,#ea580c 100%%);padding:36px 32px 28px;text-align:center">
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;line-height:1.3">%s</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px">
              %s
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;padding:20px 32px;text-align:center;border-top:1px solid #e4e4e7">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:12px">
                <tr>
                  <td align="center" style="padding:0 6px">
                    <span style="font-size:10px;color:#a1a1aa;letter-spacing:1px;text-transform:uppercase;font-weight:600">Suavus</span>
                  </td>
                </tr>
              </table>
              <p style="color:#a1a1aa;font-size:12px;margin:0 0 4px;line-height:1.5">
                La mejor plataforma para descubrir restaurantes y disfrutar de experiencias gastronómicas únicas.
              </p>
              <p style="color:#a1a1aa;font-size:11px;margin:12px 0 0;line-height:1.5">
                &copy; 2026 Suavus. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, title, title, bodyContent)
}

func (s *Service) SendVerificationEmail(to, code string) error {
	subject := "Verifica tu correo — Suavus"
	bodyContent := fmt.Sprintf(`
<p style="color:#1c1917;font-size:16px;margin:0 0 20px;line-height:1.6">
  Gracias por registrarte en <strong style="color:#c2410c">Suavus</strong>. Para empezar a disfrutar de nuestra plataforma, verifica tu cuenta con el siguiente código:
</p>

<div style="background:#fef2e8;border:1px solid #fed7aa;border-radius:12px;padding:24px;text-align:center;margin:0 0 20px">
  <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#c2410c;font-family:'SF Mono',Consolas,'Liberation Mono',monospace">%s</span>
</div>

<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px">
  <tr>
    <td style="padding:0 0 8px;vertical-align:top">
      <table role="presentation" cellspacing="0" cellpadding="0">
        <tr>
          <td style="width:20px;padding:2px 8px 0 0;vertical-align:top;color:#d97706;font-size:14px;font-weight:700">&bull;</td>
          <td style="color:#52525b;font-size:13px;line-height:1.5">El código expira en <strong>1 hora</strong></td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:0;vertical-align:top">
      <table role="presentation" cellspacing="0" cellpadding="0">
        <tr>
          <td style="width:20px;padding:2px 8px 0 0;vertical-align:top;color:#d97706;font-size:14px;font-weight:700">&bull;</td>
          <td style="color:#52525b;font-size:13px;line-height:1.5">Si no creaste esta cuenta, ignora este mensaje</td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<div style="background:#f4f4f4;border-radius:8px;padding:16px;text-align:center">
  <p style="color:#71717a;font-size:12px;margin:0;line-height:1.4">
    &iquest;Tienes problemas? Escr&iacute;benos a
    <a href="mailto:soporte@suavus.app" style="color:#c2410c;text-decoration:underline">soporte@suavus.app</a>
  </p>
</div>
`, code)

	body := s.renderTemplate("Verificaci\u00f3n de correo electr\u00f3nico", bodyContent)
	return s.Send(to, subject, body)
}

func (s *Service) SendWelcomeEmail(to, name string) error {
	subject := "\u00a1Bienvenido a Suavus!"
	bodyContent := fmt.Sprintf(`
<p style="color:#1c1917;font-size:16px;margin:0 0 20px;line-height:1.6">
  Hola <strong style="color:#c2410c">%s</strong>,
</p>

<p style="color:#1c1917;font-size:16px;margin:0 0 20px;line-height:1.6">
  \u00a1Tu cuenta ha sido verificada exitosamente! Te damos la bienvenida a <strong style="color:#c2410c">Suavus</strong>, la plataforma que te conecta con los mejores restaurantes y experiencias gastron&oacute;micas.
</p>

<div style="background:#fef2e8;border:1px solid #fed7aa;border-radius:12px;padding:24px;margin:0 0 24px">
  <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto">
    <tr>
      <td align="center" style="padding-bottom:16px">
        <span style="font-size:24px">\u2705</span>
      </td>
    </tr>
    <tr>
      <td align="center">
        <p style="color:#1c1917;font-size:15px;margin:0 0 4px;line-height:1.5;font-weight:600">\u00a1Todo listo!</p>
        <p style="color:#52525b;font-size:14px;margin:0;line-height:1.5">Ya puedes explorar restaurantes, hacer pedidos y mucho m&aacute;s.</p>
      </td>
    </tr>
  </table>
</div>

<div style="text-align:center;margin:0 0 24px">
  <a href="https://suavus.app/restaurants" style="display:inline-block;background:linear-gradient(135deg,#c2410c,#ea580c);color:#ffffff;padding:14px 36px;border-radius:10px;text-decoration:none;font-size:16px;font-weight:600;box-shadow:0 2px 8px rgba(194,65,12,0.3)">Explorar restaurantes</a>
</div>

<div style="background:#f4f4f4;border-radius:8px;padding:16px;text-align:center">
  <p style="color:#71717a;font-size:12px;margin:0;line-height:1.4">
    &iquest;Necesitas ayuda? Escr&iacute;benos a
    <a href="mailto:soporte@suavus.app" style="color:#c2410c;text-decoration:underline">soporte@suavus.app</a>
  </p>
</div>
`, name)

	body := s.renderTemplate("\u00a1Bienvenido a Suavus!", bodyContent)
	return s.Send(to, subject, body)
}

func (s *Service) SendPasswordRecoveryEmail(to, resetLink string) error {
	subject := "Recuperaci\u00f3n de contrase\u00f1a — Suavus"
	bodyContent := fmt.Sprintf(`
<p style="color:#1c1917;font-size:16px;margin:0 0 20px;line-height:1.6">
  Recibimos una solicitud para restablecer la contrase\u00f1a de tu cuenta en <strong style="color:#c2410c">Suavus</strong>.
</p>

<div style="text-align:center;margin:0 0 24px">
  <a href="%s" style="display:inline-block;background:linear-gradient(135deg,#c2410c,#ea580c);color:#ffffff;padding:14px 36px;border-radius:10px;text-decoration:none;font-size:16px;font-weight:600;box-shadow:0 2px 8px rgba(194,65,12,0.3)">Restablecer contrase\u00f1a</a>
</div>

<div style="background:#fef2e8;border:1px solid #fed7aa;border-radius:12px;padding:20px;margin:0 0 24px">
  <p style="color:#52525b;font-size:13px;margin:0 0 8px;line-height:1.5;font-weight:600">O copia este enlace en tu navegador:</p>
  <p style="font-size:12px;word-break:break-all;color:#c2410c;margin:0;line-height:1.5">%s</p>
</div>

<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px">
  <tr>
    <td style="padding:0 0 8px;vertical-align:top">
      <table role="presentation" cellspacing="0" cellpadding="0">
        <tr>
          <td style="width:20px;padding:2px 8px 0 0;vertical-align:top;color:#d97706;font-size:14px;font-weight:700">&bull;</td>
          <td style="color:#52525b;font-size:13px;line-height:1.5">Este enlace expira en <strong>1 hora</strong></td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:0;vertical-align:top">
      <table role="presentation" cellspacing="0" cellpadding="0">
        <tr>
          <td style="width:20px;padding:2px 8px 0 0;vertical-align:top;color:#d97706;font-size:14px;font-weight:700">&bull;</td>
          <td style="color:#52525b;font-size:13px;line-height:1.5">Si no solicitaste este cambio, ignora este mensaje</td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<div style="background:#f4f4f4;border-radius:8px;padding:16px;text-align:center">
  <p style="color:#71717a;font-size:12px;margin:0;line-height:1.4">
    &iquest;Tienes problemas? Escr&iacute;benos a
    <a href="mailto:soporte@suavus.app" style="color:#c2410c;text-decoration:underline">soporte@suavus.app</a>
  </p>
</div>
`, resetLink, resetLink)

	body := s.renderTemplate("Recuperaci\u00f3n de contrase\u00f1a", bodyContent)
	return s.Send(to, subject, body)
}
