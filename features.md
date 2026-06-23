# Alarm App Feature Landscape

> Research report — fuentes verificadas adversarialmente (103 agentes, Jun 2026)

---

## Challenge/Mission mechanisms — diferenciador principal

Apps para heavy sleepers compiten aquí. El reto reemplaza el swipe con una tarea que no puede completarse semi-dormido.

### Mapa de challenges por app

| App | Challenges verificados |
|-----|----------------------|
| **Alarmy** | Photo, Math, Shake, Barcode/QR, Memory, Typing, Walking, Squat |
| **AMdroid** | Math, Captcha, Wi-Fi connection, NFC scan, Barcode/QR, Light |
| **Esta app** | BUTTON, MATH, PUZZLE, TYPE_TEXT, SHAKE, WALK, QR_CODE, NFC, PHOTO_MATCH |

### Challenges implementados

| Challenge | Niveles | Notas |
|-----------|---------|-------|
| **BUTTON** | — | Dismiss simple, sin reto. Position configurable |
| **MATH** | EASY / MEDIUM / MAXIMUM / EXTREME | Operaciones aritméticas, dificultad variable |
| **PUZZLE** | EASY / MEDIUM / MAXIMUM / CUSTOM | Puzzle de imagen; CUSTOM permite rows×cols propios |
| **TYPE_TEXT** | EASY / MEDIUM / MAXIMUM / CUSTOM | Escribir palabras; CUSTOM permite word count propio |
| **SHAKE** | EASY / MEDIUM / MAXIMUM / EXTREME / CUSTOM | Agitar teléfono N segundos; CUSTOM configurable |
| **WALK** | EASY / MEDIUM / MAXIMUM | Caminar N pasos medidos por podómetro |
| **QR_CODE** | — | Escanear código QR registrado previamente |
| **NFC** | — | Tocar tag NFC registrado (p.ej. pegado en cocina/baño) |
| **PHOTO_MATCH** | — | Tomar foto que coincida con imagen registrada |

### Gaps vs competidores (no implementados aún)

| Challenge | Prioridad | Notas |
|-----------|-----------|-------|
| **Memory/tiles** | Media | Recordar patrón de colores/posiciones |
| **Squat** | Media | Contado por acelerómetro |
| **Captcha** | Baja | Texto distorsionado — variante de TYPE_TEXT |

---

## Social / Accountability layer — diferenciador emergente

| Mecanismo | App | Confianza |
|-----------|-----|-----------|
| Group alarm simultáneo (misma alarma en múltiples teléfonos) | Galarm | Alta (3-0) |
| Voice message de amigo se convierte en tu alarma | Wake: The Social Alarm | Media (2-1, app muy nueva) |
| Buddy notification si no despiertas | — | **Refutado** — no existe en Galarm |

---

## Sleep tracking / Smart alarm

Sleep Cycle usa mic + acelerómetro (patente US8493220) para detectar fase de sueño y despertar en momento óptimo. Precisión real vs laboratorio clínico: **kappa 0.21–0.53** (moderada, no "lab-grade" como dicen en marketing).

**Veredicto:** Feature costosa de implementar con valor científico cuestionable. No priorizar.

---

## Claims refutados (no implementar basado en fuentes sin verificar)

- "Math es el challenge más popular de Alarmy" — sin evidencia
- "Usuarios memorizan barcodes para engañar la app" — sin evidencia verificada
- "Efectividad de challenges baja con el tiempo por habituación" — sin evidencia verificada
- "Galarm notifica a buddy si no despiertas" — feature no existe
- Bugs de confiabilidad en iOS/Android alarm — no sobrevivió verificación

---

## Preguntas abiertas (sin respuesta verificada)

- ¿Qué challenge es más difícil de completar semi-dormido? Hipótesis: NFC (físico + ubicación) > Math (cognitivo) > Shake (repetición física)
- ¿Social alarms mejoran compliance real o son gimmick?
- ¿Smartphone mic/acelerómetro es clínicamente preciso para sleep staging? (datos actuales son de wearables, no de smartphone)

---

## Roadmap sugerido

### Próximas features de alta prioridad
1. **Memory/tiles challenge** — patrón de colores a recordar y reproducir
2. **Group alarm** — misma alarma sincronizada en múltiples usuarios

### Baja prioridad
3. **Squat challenge** — contado por acelerómetro
4. **Captcha challenge** — variante cognitiva de TYPE_TEXT

### No priorizar ahora
- Smart alarm / sleep tracking (alto costo, valor científico moderado)

---

## Fuentes verificadas

- Alarmy official blog: https://alar.my/en/blog/alarmy-wake-up-mission
- AMdroid official: https://amdroidapp.com/
- Galarm Play Store: https://play.google.com/store/apps/details?id=com.galarmapp
- Wake: The Social Alarm App Store: https://apps.apple.com/us/app/wake-the-social-alarm/id6754577206
- Sleep Cycle smart alarm: https://sleepcycle.com/the-app/smart-alarm
- SLEEP Advances 2025 (Oxford, n=62): https://academic.oup.com/sleepadvances/article/6/2/zpaf021/8090472
- GoalsWon 2024 analysis: https://www.goalswon.com/blog/the-ultimate-list-of-the-best-accountability-alarm-apps-of-2024-dont-sleep-on-it/
