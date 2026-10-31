# Plantillas de WhatsApp

Créalas en Meta Business Manager, en categoría **Utilidad** e idioma español. Hasta que Meta las apruebe, los envíos reales fallan y quedan como `failed` en la bandeja.

## `pedido_proveedor`

```
Nuevo pedido {{1}}

Productos: {{2}}
Total: {{3}}

Cliente: {{4}}
Teléfono: {{5}}
Dirección: {{6}}
```

## `pedido_cliente`

```
Tu pedido {{1}} por {{2}} ha sido recibido.

Medios de pago: {{3}}.

{{4}} se contactará contigo.
```

## Activación

1. En `packages/api/.env` define `WHATSAPP_PROVIDER=cloud`, `WA_TOKEN`, `WA_PHONE_ID`, `WHATSAPP_APP_SECRET` y `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
2. En la app de Meta registra el webhook `https://TU-DOMINIO/webhooks/whatsapp` con el mismo verify token y suscríbete a `messages`.
3. Haz un pedido de prueba hacia tu propio número.

Con Twilio, crea las mismas plantillas como Content Templates y define `TWILIO_CONTENT_SID_VENDOR` y `TWILIO_CONTENT_SID_CUSTOMER`.
